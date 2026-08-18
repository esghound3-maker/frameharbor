# FrameHarbor

FrameHarbor is a Windows-first, local video processing tool that puts a friendly interface in front of FFmpeg. Files stay on the computer, original media is never overwritten, and technical codec choices are hidden behind goal-based tools.

## Download for Windows

Open the [latest GitHub Release](../../releases/latest) and download the file ending in `Setup.exe`.

Windows SmartScreen may show an "Unknown publisher" warning because this community release is not code-signed yet. The app works entirely on your computer and does not upload media.

## Features

- Import video and audio by browsing or native Windows drag and drop
- Preview the original video on a thumbnail timeline with scrubbing and trim handles
- Inspect media with ffprobe
- Compress with quality and resolution presets
- Convert to MP4, MOV, MKV, WebM, MP3, WAV, or FLAC
- Trim with frame-accurate or fast-copy modes
- Merge clips in their selected order
- Resize, crop-to-fill, pad-to-fit, and rotate
- Extract, mute, or normalize audio
- Burn or embed subtitle files
- Add image watermarks
- Create optimized looping GIFs
- Build advanced Studio exports with chained picture, timing, audio, and codec controls
- Queue multiple local jobs with progress, cancellation, and retry-safe output naming
- Detect NVIDIA, Intel, or AMD H.264 hardware encoders and fall back to CPU encoding

Advanced Studio supports validated FFmpeg pipelines for H.264, HEVC, VP9, and AV1 output. It includes scaling, frame-rate conversion, speed changes, deinterlacing, denoise, sharpening, color adjustment, loudness normalization, gain, resampling, channel conversion, and stream copy or mute controls.

## Run the desktop app from source

Requirements:

- Windows 10 or newer
- Node.js 20.19 or newer
- Rust 1.84 or newer
- Microsoft Edge WebView2

```powershell
npm install
npm run setup:ffmpeg
npm run tauri dev
```

The setup command downloads the pinned FFmpeg 9.0 Essentials archive from its official GitHub release, verifies its SHA-256 checksum, and places `ffmpeg.exe` and `ffprobe.exe` in `src-tauri/binaries`. The executables are intentionally excluded from Git because each exceeds GitHub's normal per-file limit.

Build the Windows installer:

```powershell
npm run tauri build
```

If the C: drive is tight on space, point Rust's disposable build output at another drive before building:

```powershell
$env:CARGO_TARGET_DIR = 'D:\FrameHarbor-Build-Cache'
npm run tauri build
```

## Quality checks

```powershell
npm run check
npm run build
cargo test --manifest-path src-tauri\Cargo.toml
cargo clippy --manifest-path src-tauri\Cargo.toml --all-targets -- -D warnings
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1
```

The smoke test creates synthetic media, exercises the core export workflows including Advanced Studio, validates every output with ffprobe, and removes its temporary files.

## Project structure

- `src/` - React interface and queue orchestration
- `src/styles/` - the FrameHarbor visual system
- `src-tauri/src/` - Rust FFmpeg discovery, inspection, command generation, progress, and cancellation
- `src-tauri/binaries/` - bundled FFmpeg 9.0 tools and license
- `scripts/smoke-test.ps1` - repeatable end-to-end FFmpeg verification
- `release/` - packaged Windows installer and checksum, when built

## Current boundaries

- Windows is the tested platform for 0.2.
- Merge works best when clips have matching dimensions and frame rates.
- Closing FrameHarbor stops an active job.
- Studio processes each selected file with the same configured pipeline.
- FrameHarbor contains no accounts, uploads, cloud processing, or telemetry.

## Feedback and contributions

- Found a bug? Open a [bug report](../../issues/new?template=bug-report.yml).
- Have an idea? Open a [feature request](../../issues/new?template=feature-request.yml).
- Want to contribute code? Read [CONTRIBUTING.md](CONTRIBUTING.md).

Please include the FrameHarbor version, Windows version, input format, and the exact steps needed to reproduce a problem. Do not attach private or copyrighted videos; use a small synthetic sample when possible.

## FFmpeg

FrameHarbor includes FFmpeg 9.0 Essentials Build for Windows from the provider linked on the official FFmpeg download page. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `src-tauri/binaries/LICENSE-FFMPEG.txt`.

## License

FrameHarbor is licensed under the [GNU General Public License v3.0](LICENSE). Third-party components retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
