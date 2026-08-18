use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    sync::{Arc, Mutex},
};

#[derive(Default, Clone)]
pub(crate) struct ActiveJobs {
    pub(crate) registry: Arc<Mutex<JobRegistry>>,
}

#[derive(Default)]
pub(crate) struct JobRegistry {
    pub(crate) pids: HashMap<String, u32>,
    pub(crate) cancelled: HashSet<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct EnvironmentStatus {
    pub(crate) ffmpeg_available: bool,
    pub(crate) ffprobe_available: bool,
    pub(crate) ffmpeg_version: Option<String>,
    pub(crate) hardware_encoder: Option<String>,
    pub(crate) binary_source: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MediaInfo {
    pub(crate) path: String,
    pub(crate) name: String,
    pub(crate) size_bytes: u64,
    pub(crate) duration_seconds: f64,
    pub(crate) width: Option<u64>,
    pub(crate) height: Option<u64>,
    pub(crate) frame_rate: Option<f64>,
    pub(crate) video_codec: Option<String>,
    pub(crate) audio_codec: Option<String>,
    pub(crate) audio_channels: Option<u64>,
    pub(crate) bit_rate: Option<u64>,
    pub(crate) format_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JobRequest {
    pub(crate) id: String,
    pub(crate) tool: String,
    pub(crate) input_paths: Vec<String>,
    pub(crate) output_dir: Option<String>,
    pub(crate) duration_seconds: Option<f64>,
    pub(crate) input_has_audio: Option<bool>,
    #[serde(default)]
    pub(crate) merge_inputs: Vec<MergeInputInfo>,
    #[serde(default)]
    pub(crate) options: JobOptions,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MergeInputInfo {
    pub(crate) width: Option<u64>,
    pub(crate) height: Option<u64>,
    pub(crate) frame_rate: Option<f64>,
    pub(crate) duration_seconds: f64,
    pub(crate) has_audio: bool,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JobOptions {
    pub(crate) quality: Option<String>,
    pub(crate) format: Option<String>,
    pub(crate) resolution: Option<String>,
    pub(crate) resize_mode: Option<String>,
    pub(crate) rotate: Option<String>,
    pub(crate) rotation_degrees: Option<String>,
    pub(crate) flip_horizontal: Option<bool>,
    pub(crate) flip_vertical: Option<bool>,
    pub(crate) crop_x: Option<String>,
    pub(crate) crop_y: Option<String>,
    pub(crate) crop_width: Option<String>,
    pub(crate) crop_height: Option<String>,
    pub(crate) start_time: Option<String>,
    pub(crate) end_time: Option<String>,
    pub(crate) trim_mode: Option<String>,
    pub(crate) audio_action: Option<String>,
    pub(crate) audio_format: Option<String>,
    pub(crate) audio_level: Option<String>,
    pub(crate) audio_mono: Option<bool>,
    pub(crate) thumbnail_action: Option<String>,
    pub(crate) thumbnail_time: Option<String>,
    pub(crate) subtitle_mode: Option<String>,
    pub(crate) auxiliary_path: Option<String>,
    pub(crate) watermark_position: Option<String>,
    pub(crate) video_encoder: Option<String>,
    pub(crate) keep_metadata: Option<bool>,
    pub(crate) studio_container: Option<String>,
    pub(crate) studio_video_codec: Option<String>,
    pub(crate) studio_preset: Option<String>,
    pub(crate) studio_crf: Option<String>,
    pub(crate) studio_resolution: Option<String>,
    pub(crate) studio_frame_rate: Option<String>,
    pub(crate) studio_speed: Option<String>,
    pub(crate) studio_deinterlace: Option<bool>,
    pub(crate) studio_denoise: Option<String>,
    pub(crate) studio_sharpen: Option<bool>,
    pub(crate) studio_brightness: Option<String>,
    pub(crate) studio_contrast: Option<String>,
    pub(crate) studio_saturation: Option<String>,
    pub(crate) studio_audio_codec: Option<String>,
    pub(crate) studio_normalize: Option<bool>,
    pub(crate) studio_audio_gain: Option<String>,
    pub(crate) studio_sample_rate: Option<String>,
    pub(crate) studio_channels: Option<String>,
    pub(crate) studio_fast_start: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JobStarted {
    pub(crate) id: String,
    pub(crate) output_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JobProgress {
    pub(crate) id: String,
    pub(crate) progress: f64,
    pub(crate) elapsed_seconds: f64,
    pub(crate) speed: Option<String>,
    pub(crate) message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JobFinished {
    pub(crate) id: String,
    pub(crate) output_path: String,
    pub(crate) message: String,
}

#[derive(Debug)]
pub(crate) struct RunOutcome {
    pub(crate) success: bool,
    pub(crate) cancelled: bool,
    pub(crate) error: String,
}
