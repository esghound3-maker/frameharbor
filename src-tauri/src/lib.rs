mod engine;
mod job_args;
mod models;
mod runner;

use models::ActiveJobs;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ActiveJobs::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            engine::environment_status,
            engine::inspect_media,
            engine::timeline_thumbnails,
            runner::start_job,
            runner::cancel_job
        ])
        .run(tauri::generate_context!())
        .expect("error while running FrameHarbor");
}
