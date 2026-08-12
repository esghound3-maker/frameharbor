use crate::models::{JobOptions, JobRequest};
use std::{
    fs,
    path::{Path, PathBuf},
};

fn option<'a>(value: &'a Option<String>, fallback: &'a str) -> &'a str {
    value.as_deref().unwrap_or(fallback)
}

fn output_extension(request: &JobRequest) -> &'static str {
    match request.tool.as_str() {
        "convert" => match option(&request.options.format, "mp4") {
            "webm" => "webm",
            "mkv" => "mkv",
            "mov" => "mov",
            "mp3" => "mp3",
            "wav" => "wav",
            "flac" => "flac",
            _ => "mp4",
        },
        "audio" if option(&request.options.audio_action, "extract") == "extract" => {
            match option(&request.options.audio_format, "mp3") {
                "wav" => "wav",
                "flac" => "flac",
                "aac" => "m4a",
                _ => "mp3",
            }
        }
        "thumbnail" if option(&request.options.thumbnail_action, "save-frame") == "save-frame" => {
            "jpg"
        }
        "gif" => "gif",
        _ => "mp4",
    }
}

fn safe_tool_slug(tool: &str) -> &str {
    match tool {
        "compress" => "compressed",
        "convert" => "converted",
        "trim" => "trimmed",
        "merge" => "merged",
        "resize" => "resized",
        "audio" => "audio",
        "subtitles" => "subtitled",
        "watermark" => "watermarked",
        "gif" => "clip",
        "thumbnail" => "thumbnail",
        _ => "processed",
    }
}

pub(crate) fn choose_output_path(request: &JobRequest) -> Result<PathBuf, String> {
    let first_input = request
        .input_paths
        .first()
        .map(PathBuf::from)
        .ok_or_else(|| "Choose at least one input file.".to_string())?;
    let parent = request
        .output_dir
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            first_input
                .parent()
                .map(Path::to_path_buf)
                .unwrap_or_else(|| PathBuf::from("."))
        });
    if !parent.is_dir() {
        return Err("The selected output folder does not exist.".to_string());
    }

    let stem = first_input
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("video");
    let extension = output_extension(request);
    let slug = safe_tool_slug(&request.tool);
    let mut candidate = parent.join(format!("{stem}-{slug}.{extension}"));
    let mut suffix = 2;
    while candidate.exists() {
        candidate = parent.join(format!("{stem}-{slug}-{suffix}.{extension}"));
        suffix += 1;
    }
    Ok(candidate)
}

pub(crate) fn encoder_name(options: &JobOptions) -> &str {
    match option(&options.video_encoder, "libx264") {
        "h264_nvenc" => "h264_nvenc",
        "h264_qsv" => "h264_qsv",
        "h264_amf" => "h264_amf",
        _ => "libx264",
    }
}

fn quality_value(options: &JobOptions) -> &str {
    match option(&options.quality, "balanced") {
        "small" => "28",
        "high" => "19",
        _ => "23",
    }
}

fn add_h264_encoding(args: &mut Vec<String>, options: &JobOptions) {
    let encoder = encoder_name(options);
    let quality = quality_value(options);
    args.extend(["-c:v".into(), encoder.into()]);
    match encoder {
        "h264_nvenc" => args.extend([
            "-preset".into(),
            "p5".into(),
            "-cq".into(),
            quality.into(),
            "-b:v".into(),
            "0".into(),
        ]),
        "h264_qsv" => args.extend([
            "-preset".into(),
            "medium".into(),
            "-global_quality".into(),
            quality.into(),
        ]),
        "h264_amf" => args.extend([
            "-quality".into(),
            "balanced".into(),
            "-rc".into(),
            "cqp".into(),
            "-qp_i".into(),
            quality.into(),
            "-qp_p".into(),
            quality.into(),
        ]),
        _ => args.extend([
            "-preset".into(),
            "medium".into(),
            "-crf".into(),
            quality.into(),
        ]),
    }
}

fn escaped_filter_path(path: &str) -> String {
    path.replace('\x5c', "/")
        .replace(':', "\x5c\x5c:")
        .replace('\'', "\x5c\x5c'")
        .replace('[', "\x5c\x5c[")
        .replace(']', "\x5c\x5c]")
}

fn parse_resolution(value: &str) -> (u32, u32) {
    match value {
        "3840x2160" => (3840, 2160),
        "1920x1080" => (1920, 1080),
        "1280x720" => (1280, 720),
        "854x480" => (854, 480),
        "1080x1920" => (1080, 1920),
        "1080x1080" => (1080, 1080),
        _ => (1920, 1080),
    }
}

fn base_args() -> Vec<String> {
    [
        "-hide_banner",
        "-nostdin",
        "-n",
        "-progress",
        "pipe:1",
        "-nostats",
    ]
    .into_iter()
    .map(str::to_owned)
    .collect()
}

fn create_concat_file(request: &JobRequest) -> Result<PathBuf, String> {
    let path = std::env::temp_dir().join(format!("frameharbor-{}.ffconcat", request.id));
    let mut content = String::from("ffconcat version 1.0\n");
    for input in &request.input_paths {
        let normalized = input.replace('\x5c', "/").replace('\'', "'\x5c\x5c''");
        content.push_str(&format!("file '{normalized}'\n"));
    }
    fs::write(&path, content).map_err(|error| format!("Could not prepare merge: {error}"))?;
    Ok(path)
}

pub(crate) fn build_job_args(
    request: &JobRequest,
    output: &Path,
) -> Result<(Vec<String>, Vec<PathBuf>), String> {
    if request.input_paths.is_empty() {
        return Err("Choose at least one media file.".to_string());
    }
    for input in &request.input_paths {
        if !Path::new(input).is_file() {
            return Err(format!("Input file not found: {input}"));
        }
    }

    let input = &request.input_paths[0];
    let mut args = base_args();
    let mut temporary_files = Vec::new();

    match request.tool.as_str() {
        "compress" => {
            args.extend(["-i".into(), input.clone(), "-map".into(), "0:v:0".into()]);
            args.extend(["-map".into(), "0:a?".into()]);
            if option(&request.options.resolution, "original") != "original" {
                let (_, height) =
                    parse_resolution(option(&request.options.resolution, "1920x1080"));
                args.extend([
                    "-vf".into(),
                    format!("scale=-2:{height}:force_original_aspect_ratio=decrease"),
                ]);
            }
            add_h264_encoding(&mut args, &request.options);
            args.extend([
                "-c:a".into(),
                "aac".into(),
                "-b:a".into(),
                "160k".into(),
                "-movflags".into(),
                "+faststart".into(),
            ]);
        }
        "convert" => {
            args.extend(["-i".into(), input.clone()]);
            let format = option(&request.options.format, "mp4");
            match format {
                "mp3" => args.extend([
                    "-vn".into(),
                    "-c:a".into(),
                    "libmp3lame".into(),
                    "-q:a".into(),
                    "2".into(),
                ]),
                "wav" => args.extend(["-vn".into(), "-c:a".into(), "pcm_s16le".into()]),
                "flac" => args.extend(["-vn".into(), "-c:a".into(), "flac".into()]),
                "webm" => args.extend([
                    "-c:v".into(),
                    "libvpx-vp9".into(),
                    "-crf".into(),
                    quality_value(&request.options).into(),
                    "-b:v".into(),
                    "0".into(),
                    "-c:a".into(),
                    "libopus".into(),
                ]),
                _ => {
                    add_h264_encoding(&mut args, &request.options);
                    args.extend(["-c:a".into(), "aac".into()]);
                    if matches!(format, "mp4" | "mov") {
                        args.extend(["-movflags".into(), "+faststart".into()]);
                    }
                }
            }
        }
        "trim" => {
            let start = option(&request.options.start_time, "00:00:00");
            let end = option(&request.options.end_time, "");
            if option(&request.options.trim_mode, "accurate") == "fast" {
                args.extend(["-ss".into(), start.into(), "-i".into(), input.clone()]);
                if !end.is_empty() {
                    args.extend(["-to".into(), end.into()]);
                }
                args.extend([
                    "-c".into(),
                    "copy".into(),
                    "-avoid_negative_ts".into(),
                    "make_zero".into(),
                ]);
            } else {
                args.extend(["-i".into(), input.clone(), "-ss".into(), start.into()]);
                if !end.is_empty() {
                    args.extend(["-to".into(), end.into()]);
                }
                add_h264_encoding(&mut args, &request.options);
                args.extend(["-c:a".into(), "aac".into()]);
            }
        }
        "merge" => {
            if request.input_paths.len() < 2 {
                return Err("Choose at least two files to merge.".to_string());
            }
            let concat_file = create_concat_file(request)?;
            temporary_files.push(concat_file.clone());
            args.extend([
                "-f".into(),
                "concat".into(),
                "-safe".into(),
                "0".into(),
                "-i".into(),
                concat_file.display().to_string(),
            ]);
            add_h264_encoding(&mut args, &request.options);
            args.extend([
                "-c:a".into(),
                "aac".into(),
                "-movflags".into(),
                "+faststart".into(),
            ]);
        }
        "resize" => {
            let mut filters = Vec::new();
            if option(&request.options.resize_mode, "fit") == "custom-crop" {
                let parse_crop = |value: &Option<String>, name: &str| -> Result<u64, String> {
                    option(value, "")
                        .parse::<u64>()
                        .map_err(|_| format!("Choose a valid crop {name}."))
                };
                let x = parse_crop(&request.options.crop_x, "position")?;
                let y = parse_crop(&request.options.crop_y, "position")?;
                let width = parse_crop(&request.options.crop_width, "width")?;
                let height = parse_crop(&request.options.crop_height, "height")?;
                if width < 2 || height < 2 {
                    return Err("Drag a larger crop area over the preview.".to_string());
                }
                filters.push(format!("crop={width}:{height}:{x}:{y}"));
            } else {
                let (width, height) =
                    parse_resolution(option(&request.options.resolution, "1920x1080"));
                filters.push(if option(&request.options.resize_mode, "fit") == "fill" {
                    format!("scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}")
                } else {
                    format!("scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2")
                });
            }
            match option(&request.options.rotate, "none") {
                "90" => filters.push("transpose=1".to_string()),
                "180" => filters.extend(["hflip".to_string(), "vflip".to_string()]),
                "270" => filters.push("transpose=2".to_string()),
                "custom" => {
                    let degrees = option(&request.options.rotation_degrees, "0")
                        .parse::<f64>()
                        .map_err(|_| "Enter a valid custom rotation angle.".to_string())?;
                    if !degrees.is_finite() || !(-359.0..=359.0).contains(&degrees) {
                        return Err(
                            "Custom rotation must be between -359 and 359 degrees.".to_string()
                        );
                    }
                    if degrees.abs() > 0.001 {
                        filters.push(format!(
                            "rotate={degrees:.6}*PI/180:ow=rotw(iw):oh=roth(ih):c=black"
                        ));
                        filters.push("pad=ceil(iw/2)*2:ceil(ih/2)*2".to_string());
                    }
                }
                _ => {}
            }
            if request.options.flip_horizontal == Some(true) {
                filters.push("hflip".to_string());
            }
            if request.options.flip_vertical == Some(true) {
                filters.push("vflip".to_string());
            }
            args.extend(["-i".into(), input.clone(), "-vf".into(), filters.join(",")]);
            add_h264_encoding(&mut args, &request.options);
            args.extend([
                "-c:a".into(),
                "aac".into(),
                "-movflags".into(),
                "+faststart".into(),
            ]);
        }
        "audio" => {
            args.extend(["-i".into(), input.clone()]);
            match option(&request.options.audio_action, "extract") {
                "mute" => {
                    args.extend([
                        "-map".into(),
                        "0:v:0".into(),
                        "-map".into(),
                        "0:s?".into(),
                        "-c".into(),
                        "copy".into(),
                        "-an".into(),
                        "-movflags".into(),
                        "+faststart".into(),
                    ]);
                }
                "normalize" => {
                    args.extend([
                        "-map".into(),
                        "0:v:0".into(),
                        "-map".into(),
                        "0:a:0".into(),
                        "-c:v".into(),
                        "copy".into(),
                        "-af".into(),
                        "loudnorm=I=-16:TP=-1.5:LRA=11".into(),
                        "-c:a".into(),
                        "aac".into(),
                        "-b:a".into(),
                        "192k".into(),
                        "-movflags".into(),
                        "+faststart".into(),
                    ]);
                }
                "adjust" => {
                    let level = option(&request.options.audio_level, "0");
                    if !matches!(level, "6" | "3" | "0" | "-3" | "-6") {
                        return Err("Choose an audio level of +6, +3, 0, -3, or -6 dB.".to_string());
                    }
                    args.extend([
                        "-map".into(),
                        "0:v:0".into(),
                        "-map".into(),
                        "0:a:0".into(),
                        "-c:v".into(),
                        "copy".into(),
                        "-af".into(),
                        format!("volume={level}dB"),
                        "-c:a".into(),
                        "aac".into(),
                        "-b:a".into(),
                        "192k".into(),
                    ]);
                    if request.options.audio_mono == Some(true) {
                        args.extend(["-ac".into(), "1".into()]);
                    }
                    args.extend(["-movflags".into(), "+faststart".into()]);
                }
                _ => match option(&request.options.audio_format, "mp3") {
                    "wav" => args.extend(["-vn".into(), "-c:a".into(), "pcm_s16le".into()]),
                    "flac" => args.extend(["-vn".into(), "-c:a".into(), "flac".into()]),
                    "aac" => args.extend([
                        "-vn".into(),
                        "-c:a".into(),
                        "aac".into(),
                        "-b:a".into(),
                        "192k".into(),
                    ]),
                    _ => args.extend([
                        "-vn".into(),
                        "-c:a".into(),
                        "libmp3lame".into(),
                        "-q:a".into(),
                        "2".into(),
                    ]),
                },
            }
        }
        "thumbnail" => match option(&request.options.thumbnail_action, "save-frame") {
            "save-frame" => {
                let seconds = option(&request.options.thumbnail_time, "0")
                    .parse::<f64>()
                    .map_err(|_| "Choose a valid thumbnail time.".to_string())?;
                if !seconds.is_finite() || seconds < 0.0 {
                    return Err("Thumbnail time cannot be negative.".to_string());
                }
                args.extend([
                    "-ss".into(),
                    format!("{seconds:.3}"),
                    "-i".into(),
                    input.clone(),
                    "-map".into(),
                    "0:v:0".into(),
                    "-frames:v".into(),
                    "1".into(),
                    "-q:v".into(),
                    "2".into(),
                ]);
            }
            "add-cover" => {
                let cover = request
                    .options
                    .auxiliary_path
                    .as_deref()
                    .filter(|path| Path::new(path).is_file())
                    .ok_or_else(|| "Choose a valid cover image.".to_string())?;
                args.extend([
                    "-i".into(),
                    input.clone(),
                    "-i".into(),
                    cover.into(),
                    "-map".into(),
                    "0:v:0".into(),
                    "-map".into(),
                    "0:a?".into(),
                    "-map".into(),
                    "0:s?".into(),
                    "-map".into(),
                    "1:v:0".into(),
                    "-c".into(),
                    "copy".into(),
                    "-c:v:1".into(),
                    "mjpeg".into(),
                    "-disposition:v:1".into(),
                    "attached_pic".into(),
                    "-movflags".into(),
                    "+faststart".into(),
                ]);
            }
            "remove-cover" => {
                args.extend([
                    "-i".into(),
                    input.clone(),
                    "-map".into(),
                    "0:v:0".into(),
                    "-map".into(),
                    "0:a?".into(),
                    "-map".into(),
                    "0:s?".into(),
                    "-c".into(),
                    "copy".into(),
                    "-movflags".into(),
                    "+faststart".into(),
                ]);
            }
            _ => return Err("Choose a valid thumbnail action.".to_string()),
        },
        "subtitles" => {
            let subtitle = request
                .options
                .auxiliary_path
                .as_deref()
                .filter(|path| Path::new(path).is_file())
                .ok_or_else(|| "Choose a valid subtitle file.".to_string())?;
            if option(&request.options.subtitle_mode, "burn") == "soft" {
                args.extend([
                    "-i".into(),
                    input.clone(),
                    "-i".into(),
                    subtitle.into(),
                    "-map".into(),
                    "0".into(),
                    "-map".into(),
                    "1:0".into(),
                    "-c:v".into(),
                    "copy".into(),
                    "-c:a".into(),
                    "copy".into(),
                    "-c:s".into(),
                    "mov_text".into(),
                ]);
            } else {
                args.extend([
                    "-i".into(),
                    input.clone(),
                    "-vf".into(),
                    format!("subtitles=filename='{}'", escaped_filter_path(subtitle)),
                ]);
                add_h264_encoding(&mut args, &request.options);
                args.extend(["-c:a".into(), "aac".into()]);
            }
        }
        "watermark" => {
            let watermark = request
                .options
                .auxiliary_path
                .as_deref()
                .filter(|path| Path::new(path).is_file())
                .ok_or_else(|| "Choose a valid watermark image.".to_string())?;
            let overlay = match option(&request.options.watermark_position, "bottom-right") {
                "top-left" => "24:24",
                "top-right" => "W-w-24:24",
                "bottom-left" => "24:H-h-24",
                "center" => "(W-w)/2:(H-h)/2",
                _ => "W-w-24:H-h-24",
            };
            args.extend([
                "-i".into(),
                input.clone(),
                "-i".into(),
                watermark.into(),
                "-filter_complex".into(),
                format!(
                    "[1:v]format=rgba,colorchannelmixer=aa=0.78[wm];[0:v][wm]overlay={overlay}"
                ),
            ]);
            add_h264_encoding(&mut args, &request.options);
            args.extend(["-c:a".into(), "aac".into()]);
        }
        "gif" => {
            args.extend([
                "-i".into(),
                input.clone(),
                "-vf".into(),
                "fps=12,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse".into(),
                "-loop".into(),
                "0".into(),
            ]);
        }
        _ => return Err("This tool is not available in the beta yet.".to_string()),
    }

    if request.options.keep_metadata == Some(false) {
        args.extend(["-map_metadata".into(), "-1".into()]);
    }
    args.push(output.display().to_string());
    Ok((args, temporary_files))
}

pub(crate) fn remove_temporary_files(paths: &[PathBuf]) {
    for path in paths {
        let _ = fs::remove_file(path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request(tool: &str) -> JobRequest {
        JobRequest {
            id: "test-job".to_string(),
            tool: tool.to_string(),
            input_paths: vec!["input.mp4".to_string()],
            output_dir: None,
            duration_seconds: Some(10.0),
            options: JobOptions::default(),
        }
    }

    #[test]
    fn output_extensions_are_goal_driven() {
        let mut convert = request("convert");
        convert.options.format = Some("webm".to_string());
        assert_eq!(output_extension(&convert), "webm");

        let mut audio = request("audio");
        audio.options.audio_action = Some("extract".to_string());
        audio.options.audio_format = Some("flac".to_string());
        assert_eq!(output_extension(&audio), "flac");

        let thumbnail = request("thumbnail");
        assert_eq!(output_extension(&thumbnail), "jpg");

        let mut cover = request("thumbnail");
        cover.options.thumbnail_action = Some("add-cover".to_string());
        assert_eq!(output_extension(&cover), "mp4");
    }

    #[test]
    fn only_supported_encoders_are_accepted() {
        let mut options = JobOptions {
            video_encoder: Some("unknown_encoder".to_string()),
            ..JobOptions::default()
        };
        assert_eq!(encoder_name(&options), "libx264");
        options.video_encoder = Some("h264_nvenc".to_string());
        assert_eq!(encoder_name(&options), "h264_nvenc");
    }

    #[test]
    fn resolution_values_are_constrained() {
        assert_eq!(parse_resolution("1280x720"), (1280, 720));
        assert_eq!(parse_resolution("anything"), (1920, 1080));
    }

    #[test]
    fn audio_gain_and_mono_are_passed_to_ffmpeg() {
        let input = std::env::temp_dir().join("frameharbor-job-args-audio.mp4");
        fs::write(&input, b"test").unwrap();
        let mut job = request("audio");
        job.input_paths = vec![input.display().to_string()];
        job.options.audio_action = Some("adjust".to_string());
        job.options.audio_level = Some("6".to_string());
        job.options.audio_mono = Some(true);
        let (args, _) = build_job_args(&job, &input.with_file_name("audio-out.mp4")).unwrap();
        assert!(args.windows(2).any(|pair| pair == ["-af", "volume=6dB"]));
        assert!(args.windows(2).any(|pair| pair == ["-ac", "1"]));
        let _ = fs::remove_file(input);
    }

    #[test]
    fn custom_crop_rotation_and_flip_form_one_filter_chain() {
        let input = std::env::temp_dir().join("frameharbor-job-args-crop.mp4");
        fs::write(&input, b"test").unwrap();
        let mut job = request("resize");
        job.input_paths = vec![input.display().to_string()];
        job.options.resize_mode = Some("custom-crop".to_string());
        job.options.crop_x = Some("20".to_string());
        job.options.crop_y = Some("10".to_string());
        job.options.crop_width = Some("640".to_string());
        job.options.crop_height = Some("360".to_string());
        job.options.rotate = Some("custom".to_string());
        job.options.rotation_degrees = Some("15".to_string());
        job.options.flip_horizontal = Some(true);
        let (args, _) = build_job_args(&job, &input.with_file_name("crop-out.mp4")).unwrap();
        let filter = &args[args.iter().position(|value| value == "-vf").unwrap() + 1];
        assert!(filter.starts_with("crop=640:360:20:10,rotate=15.000000*PI/180"));
        assert!(filter.contains(",pad=ceil(iw/2)*2:ceil(ih/2)*2,hflip"));
        let _ = fs::remove_file(input);
    }
}
