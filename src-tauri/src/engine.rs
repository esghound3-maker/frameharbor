use crate::models::{EnvironmentStatus, MediaInfo};
use serde_json::Value;
use std::{
    collections::hash_map::DefaultHasher,
    fs,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
    process::{Command as StdCommand, Stdio},
    time::UNIX_EPOCH,
};
use tauri::{AppHandle, Manager};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub(crate) fn silent_std_command(program: &Path) -> StdCommand {
    let mut command = StdCommand::new(program);
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    command
}

fn tool_filename(name: &str) -> String {
    if cfg!(windows) {
        format!("{name}.exe")
    } else {
        name.to_string()
    }
}

fn tool_candidates(app: &AppHandle, name: &str) -> Vec<PathBuf> {
    let filename = tool_filename(name);
    let mut candidates = Vec::new();

    if let Ok(explicit) = std::env::var(format!("VPT_{}_PATH", name.to_uppercase())) {
        candidates.push(PathBuf::from(explicit));
    }

    candidates.push(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join(&filename),
    );

    if let Ok(resources) = app.path().resource_dir() {
        candidates.push(resources.join("binaries").join(&filename));
        candidates.push(resources.join(&filename));
    }

    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            candidates.push(parent.join(&filename));
            candidates.push(parent.join("binaries").join(&filename));
        }
    }

    candidates.push(PathBuf::from(filename));
    candidates
}

pub(crate) fn resolve_tool(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    for candidate in tool_candidates(app, name) {
        let is_path_lookup = candidate.components().count() == 1;
        if !is_path_lookup && !candidate.is_file() {
            continue;
        }

        if silent_std_command(&candidate)
            .arg("-version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|status| status.success())
            .unwrap_or(false)
        {
            return Ok(candidate);
        }
    }

    Err(format!(
        "{} was not found. Add it to src-tauri/binaries or set VPT_{}_PATH.",
        name,
        name.to_uppercase()
    ))
}

fn version_line(path: &Path) -> Option<String> {
    let output = silent_std_command(path).arg("-version").output().ok()?;
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .next()
        .map(str::to_owned)
}

fn test_encoder(ffmpeg: &Path, encoder: &str) -> bool {
    silent_std_command(ffmpeg)
        .args([
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=size=64x64:rate=1",
            "-frames:v",
            "1",
            "-c:v",
            encoder,
            "-f",
            "null",
            "-",
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn detect_hardware_encoder(ffmpeg: &Path) -> Option<String> {
    ["h264_nvenc", "h264_qsv", "h264_amf"]
        .into_iter()
        .find(|encoder| test_encoder(ffmpeg, encoder))
        .map(str::to_owned)
}

#[tauri::command]
pub(crate) async fn environment_status(app: AppHandle) -> EnvironmentStatus {
    let ffmpeg = resolve_tool(&app, "ffmpeg").ok();
    let ffprobe = resolve_tool(&app, "ffprobe").ok();
    let hardware_encoder = ffmpeg.as_deref().and_then(detect_hardware_encoder);
    let binary_source = ffmpeg.as_ref().map(|path| {
        if path.is_absolute() {
            path.display().to_string()
        } else {
            "System PATH".to_string()
        }
    });

    EnvironmentStatus {
        ffmpeg_available: ffmpeg.is_some(),
        ffprobe_available: ffprobe.is_some(),
        ffmpeg_version: ffmpeg.as_deref().and_then(version_line),
        hardware_encoder,
        binary_source,
    }
}

fn parse_rate(value: Option<&str>) -> Option<f64> {
    let value = value?;
    if let Some((numerator, denominator)) = value.split_once('/') {
        let numerator = numerator.parse::<f64>().ok()?;
        let denominator = denominator.parse::<f64>().ok()?;
        (denominator != 0.0).then_some(numerator / denominator)
    } else {
        value.parse::<f64>().ok()
    }
}

fn parse_number(value: Option<&Value>) -> Option<f64> {
    value.and_then(|item| {
        item.as_f64()
            .or_else(|| item.as_str().and_then(|text| text.parse::<f64>().ok()))
    })
}

#[tauri::command]
pub(crate) async fn inspect_media(app: AppHandle, path: String) -> Result<MediaInfo, String> {
    let input = PathBuf::from(&path);
    if !input.is_file() {
        return Err("The selected media file no longer exists.".to_string());
    }

    let ffprobe = resolve_tool(&app, "ffprobe")?;
    let output = silent_std_command(&ffprobe)
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration,size,bit_rate,format_name:stream=codec_type,codec_name,width,height,avg_frame_rate,channels",
            "-of",
            "json",
        ])
        .arg(&input)
        .output()
        .map_err(|error| format!("Unable to run ffprobe: {error}"))?;

    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "FFmpeg could not inspect this file. {}",
            detail.trim()
        ));
    }

    let document: Value = serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("Could not read ffprobe output: {error}"))?;
    let format = document.get("format").unwrap_or(&Value::Null);
    let streams = document
        .get("streams")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let video = streams
        .iter()
        .find(|stream| stream.get("codec_type").and_then(Value::as_str) == Some("video"));
    let audio = streams
        .iter()
        .find(|stream| stream.get("codec_type").and_then(Value::as_str) == Some("audio"));
    let metadata_size = fs::metadata(&input)
        .map(|item| item.len())
        .unwrap_or_default();

    Ok(MediaInfo {
        path,
        name: input
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("Untitled media")
            .to_string(),
        size_bytes: parse_number(format.get("size"))
            .map(|value| value as u64)
            .unwrap_or(metadata_size),
        duration_seconds: parse_number(format.get("duration")).unwrap_or_default(),
        width: video
            .and_then(|stream| stream.get("width"))
            .and_then(Value::as_u64),
        height: video
            .and_then(|stream| stream.get("height"))
            .and_then(Value::as_u64),
        frame_rate: video
            .and_then(|stream| parse_rate(stream.get("avg_frame_rate").and_then(Value::as_str))),
        video_codec: video
            .and_then(|stream| stream.get("codec_name"))
            .and_then(Value::as_str)
            .map(str::to_owned),
        audio_codec: audio
            .and_then(|stream| stream.get("codec_name"))
            .and_then(Value::as_str)
            .map(str::to_owned),
        audio_channels: audio
            .and_then(|stream| stream.get("channels"))
            .and_then(Value::as_u64),
        bit_rate: parse_number(format.get("bit_rate")).map(|value| value as u64),
        format_name: format
            .get("format_name")
            .and_then(Value::as_str)
            .map(str::to_owned),
    })
}

fn create_timeline_thumbnails(
    ffmpeg: PathBuf,
    input: PathBuf,
    duration_seconds: f64,
    count: usize,
) -> Result<Vec<String>, String> {
    let metadata = fs::metadata(&input)
        .map_err(|error| format!("Unable to read the selected video: {error}"))?;
    let modified = metadata
        .modified()
        .ok()
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|value| value.as_nanos())
        .unwrap_or_default();
    let mut hasher = DefaultHasher::new();
    input.hash(&mut hasher);
    metadata.len().hash(&mut hasher);
    modified.hash(&mut hasher);
    count.hash(&mut hasher);

    let output_dir = std::env::temp_dir()
        .join("vpt-beta")
        .join(format!("timeline-{:016x}", hasher.finish()));
    fs::create_dir_all(&output_dir)
        .map_err(|error| format!("Unable to prepare timeline previews: {error}"))?;

    let mut frames = Vec::with_capacity(count);
    for index in 0..count {
        let output = output_dir.join(format!("frame-{index:02}.jpg"));
        if !output.is_file() {
            // Sample the middle of each timeline segment. Seeking before the input
            // keeps this fast even for long source videos.
            let seconds = duration_seconds * (index as f64 + 0.5) / count as f64;
            let result = silent_std_command(&ffmpeg)
                .args(["-hide_banner", "-loglevel", "error", "-y", "-ss"])
                .arg(format!("{seconds:.6}"))
                .arg("-i")
                .arg(&input)
                .args([
                    "-map",
                    "0:v:0",
                    "-frames:v",
                    "1",
                    "-vf",
                    "scale=160:90:force_original_aspect_ratio=increase,crop=160:90",
                    "-q:v",
                    "4",
                ])
                .arg(&output)
                .stdout(Stdio::null())
                .stderr(Stdio::piped())
                .output()
                .map_err(|error| format!("Unable to create timeline previews: {error}"))?;
            if !result.status.success() {
                let detail = String::from_utf8_lossy(&result.stderr);
                return Err(format!(
                    "FFmpeg could not create timeline previews. {}",
                    detail.trim()
                ));
            }
        }
        frames.push(output.display().to_string());
    }

    Ok(frames)
}

#[tauri::command]
pub(crate) async fn timeline_thumbnails(
    app: AppHandle,
    path: String,
    duration_seconds: f64,
    count: usize,
) -> Result<Vec<String>, String> {
    let input = PathBuf::from(path);
    if !input.is_file() {
        return Err("The selected video no longer exists.".to_string());
    }
    if !duration_seconds.is_finite() || duration_seconds <= 0.0 {
        return Err("The video duration is not available.".to_string());
    }
    let count = count.clamp(4, 12);
    let ffmpeg = resolve_tool(&app, "ffmpeg")?;

    tauri::async_runtime::spawn_blocking(move || {
        create_timeline_thumbnails(ffmpeg, input, duration_seconds, count)
    })
    .await
    .map_err(|error| format!("Timeline preview worker stopped unexpectedly: {error}"))?
}
