# Contributing to FrameHarbor

Thanks for helping improve FrameHarbor. Bug reports, usability feedback, documentation fixes, and focused pull requests are welcome.

## Before opening an issue

1. Check existing issues for the same problem or idea.
2. Test the latest beta release.
3. Remove private information from logs, paths, screenshots, and sample media.

For bugs, include your Windows version, FrameHarbor/VPT build version, input format, expected result, actual result, and exact reproduction steps.

## Local development

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

Before submitting a pull request:

```powershell
npm run check
npm run build
cargo test --manifest-path src-tauri\Cargo.toml
```

Keep pull requests focused. Explain what changed, why it changed, how it was tested, and include before/after screenshots for interface changes.

By contributing, you agree that your contribution is licensed under GPL-3.0.
