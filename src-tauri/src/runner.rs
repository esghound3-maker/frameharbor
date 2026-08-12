use crate::{
    engine::{resolve_tool, silent_std_command},
    job_args::{build_job_args, choose_output_path, encoder_name, remove_temporary_files},
    models::{ActiveJobs, JobFinished, JobProgress, JobRequest, JobStarted, RunOutcome},
};
use std::{collections::VecDeque, fs, path::Path, process::Stdio};
use tauri::{AppHandle, Emitter, State};
use tokio::{
    io::{AsyncBufReadExt, BufReader},
    process::Command,
};

async fn run_ffmpeg(
    app: &AppHandle,
    jobs: &ActiveJobs,
    ffmpeg: &Path,
    request: &JobRequest,
    args: Vec<String>,
) -> RunOutcome {
    let mut std_command = silent_std_command(ffmpeg);
    std_command
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let mut command = Command::from(std_command);
    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(error) => {
            return RunOutcome {
                success: false,
                cancelled: false,
                error: format!("Unable to start FFmpeg: {error}"),
            }
        }
    };

    if let Some(pid) = child.id() {
        jobs.registry
            .lock()
            .expect("job registry poisoned")
            .pids
            .insert(request.id.clone(), pid);
    }

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let app_for_progress = app.clone();
    let job_id = request.id.clone();
    let duration = request.duration_seconds.unwrap_or_default();

    let progress_task = tokio::spawn(async move {
        let mut elapsed_seconds = 0.0;
        let mut speed = None;
        if let Some(stdout) = stdout {
            let mut lines = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if let Some(value) = line
                    .strip_prefix("out_time_us=")
                    .or_else(|| line.strip_prefix("out_time_ms="))
                {
                    elapsed_seconds = value.parse::<f64>().unwrap_or_default() / 1_000_000.0;
                } else if let Some(value) = line.strip_prefix("speed=") {
                    speed = Some(value.to_string());
                } else if line.starts_with("progress=") {
                    let progress = if duration > 0.0 {
                        (elapsed_seconds / duration * 100.0).clamp(0.0, 99.5)
                    } else {
                        0.0
                    };
                    let _ = app_for_progress.emit(
                        "job-progress",
                        JobProgress {
                            id: job_id.clone(),
                            progress,
                            elapsed_seconds,
                            speed: speed.clone(),
                            message: "Processing locally".to_string(),
                        },
                    );
                }
            }
        }
    });

    let error_task = tokio::spawn(async move {
        let mut messages = VecDeque::with_capacity(12);
        if let Some(stderr) = stderr {
            let mut lines = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if !line.trim().is_empty() {
                    if messages.len() == 12 {
                        messages.pop_front();
                    }
                    messages.push_back(line);
                }
            }
        }
        messages.into_iter().collect::<Vec<_>>().join("\n")
    });

    let status = child.wait().await;
    let _ = progress_task.await;
    let error = error_task.await.unwrap_or_default();
    let mut registry = jobs.registry.lock().expect("job registry poisoned");
    registry.pids.remove(&request.id);
    let cancelled = registry.cancelled.remove(&request.id);
    drop(registry);

    match status {
        Ok(status) => RunOutcome {
            success: status.success(),
            cancelled,
            error,
        },
        Err(wait_error) => RunOutcome {
            success: false,
            cancelled,
            error: format!("FFmpeg stopped unexpectedly: {wait_error}"),
        },
    }
}

#[tauri::command]
pub(crate) async fn start_job(
    app: AppHandle,
    jobs: State<'_, ActiveJobs>,
    request: JobRequest,
) -> Result<JobStarted, String> {
    let ffmpeg = resolve_tool(&app, "ffmpeg")?;
    let output = choose_output_path(&request)?;
    let (initial_args, initial_temporary_files) = build_job_args(&request, &output)?;
    let output_for_task = output.clone();
    let app_for_task = app.clone();
    let jobs_for_task = jobs.inner().clone();
    let request_for_task = request.clone();

    tauri::async_runtime::spawn(async move {
        let mut outcome = run_ffmpeg(
            &app_for_task,
            &jobs_for_task,
            &ffmpeg,
            &request_for_task,
            initial_args,
        )
        .await;
        remove_temporary_files(&initial_temporary_files);

        if !outcome.success
            && !outcome.cancelled
            && encoder_name(&request_for_task.options) != "libx264"
        {
            let _ = fs::remove_file(&output_for_task);
            let _ = app_for_task.emit(
                "job-progress",
                JobProgress {
                    id: request_for_task.id.clone(),
                    progress: 0.0,
                    elapsed_seconds: 0.0,
                    speed: None,
                    message: "Hardware encoding was unavailable; retrying on CPU".to_string(),
                },
            );
            let mut fallback_request = request_for_task.clone();
            fallback_request.options.video_encoder = Some("libx264".to_string());
            match build_job_args(&fallback_request, &output_for_task) {
                Ok((fallback_args, fallback_temporary_files)) => {
                    outcome = run_ffmpeg(
                        &app_for_task,
                        &jobs_for_task,
                        &ffmpeg,
                        &fallback_request,
                        fallback_args,
                    )
                    .await;
                    remove_temporary_files(&fallback_temporary_files);
                }
                Err(error) => outcome.error = error,
            }
        }

        if outcome.cancelled {
            let _ = fs::remove_file(&output_for_task);
            let _ = app_for_task.emit(
                "job-cancelled",
                JobFinished {
                    id: request_for_task.id,
                    output_path: output_for_task.display().to_string(),
                    message: "Processing cancelled".to_string(),
                },
            );
        } else if outcome.success {
            let _ = app_for_task.emit(
                "job-complete",
                JobFinished {
                    id: request_for_task.id,
                    output_path: output_for_task.display().to_string(),
                    message: "Export complete".to_string(),
                },
            );
        } else {
            let _ = fs::remove_file(&output_for_task);
            let message = if outcome.error.trim().is_empty() {
                "FFmpeg could not process this file.".to_string()
            } else {
                outcome.error
            };
            let _ = app_for_task.emit(
                "job-error",
                JobFinished {
                    id: request_for_task.id,
                    output_path: output_for_task.display().to_string(),
                    message,
                },
            );
        }
    });

    Ok(JobStarted {
        id: request.id,
        output_path: output.display().to_string(),
    })
}

#[tauri::command]
pub(crate) async fn cancel_job(jobs: State<'_, ActiveJobs>, id: String) -> Result<(), String> {
    let pid = {
        let mut registry = jobs.registry.lock().expect("job registry poisoned");
        registry.cancelled.insert(id.clone());
        registry.pids.get(&id).copied()
    };

    let Some(pid) = pid else {
        return Ok(());
    };

    #[cfg(windows)]
    {
        let status = silent_std_command(Path::new("taskkill.exe"))
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|error| format!("Could not cancel the job: {error}"))?;
        if !status.success() {
            return Err("The FFmpeg process had already stopped.".to_string());
        }
    }

    #[cfg(not(windows))]
    {
        let status = std::process::Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .status()
            .map_err(|error| format!("Could not cancel the job: {error}"))?;
        if !status.success() {
            return Err("The FFmpeg process had already stopped.".to_string());
        }
    }

    Ok(())
}
