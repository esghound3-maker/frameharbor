param(
    [string]$Ffmpeg = (Join-Path $PSScriptRoot '..\src-tauri\binaries\ffmpeg.exe'),
    [string]$Ffprobe = (Join-Path $PSScriptRoot '..\src-tauri\binaries\ffprobe.exe')
)

$ErrorActionPreference = 'Stop'
$smokeRoot = if (Test-Path -LiteralPath 'D:\') {
    'D:\FrameHarbor-Smoke'
} else {
    Join-Path ([System.IO.Path]::GetTempPath()) 'FrameHarbor-Smoke'
}
$runRoot = Join-Path $smokeRoot "run-$PID"

function Invoke-FfmpegStep {
    param(
        [string]$Name,
        [string[]]$Arguments
    )
    Write-Host "Testing $Name..."
    & $Ffmpeg -hide_banner -loglevel error -y @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "FFmpeg smoke test failed at: $Name"
    }
}

if (-not (Test-Path -LiteralPath $Ffmpeg)) {
    throw "Bundled FFmpeg was not found at $Ffmpeg"
}
if (-not (Test-Path -LiteralPath $Ffprobe)) {
    throw "Bundled ffprobe was not found at $Ffprobe"
}

New-Item -ItemType Directory -Path $runRoot -Force | Out-Null

try {
    $inputOne = Join-Path $runRoot 'input-one.mp4'
    $inputTwo = Join-Path $runRoot 'input-two.mp4'
    $watermark = Join-Path $runRoot 'watermark.png'
    $subtitle = Join-Path $runRoot 'captions.srt'

    Invoke-FfmpegStep 'fixture one' @(
        '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=30',
        '-f', 'lavfi', '-i', 'sine=frequency=880:sample_rate=48000',
        '-t', '4', '-shortest',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', $inputOne
    )
    Invoke-FfmpegStep 'fixture two' @(
        '-f', 'lavfi', '-i', 'color=c=0x5342c8:size=640x360:rate=30',
        '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000',
        '-t', '2', '-shortest',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', $inputTwo
    )
    Invoke-FfmpegStep 'watermark fixture' @(
        '-f', 'lavfi', '-i', 'color=c=0x7650ee@0.8:size=120x50',
        '-frames:v', '1', '-update', '1', $watermark
    )

    $subtitleText = @(
        '1',
        '00:00:00,400 --> 00:00:02,800',
        'FrameHarbor local processing',
        ''
    )
    Set-Content -LiteralPath $subtitle -Value $subtitleText -Encoding UTF8
    $subtitleFilter = $subtitle.Replace('\', '/').Replace(':', '\:')

    $outputs = [ordered]@{
        compress = Join-Path $runRoot 'compressed.mp4'
        convert = Join-Path $runRoot 'converted.webm'
        trim = Join-Path $runRoot 'trimmed.mp4'
        merge = Join-Path $runRoot 'merged.mp4'
        resize = Join-Path $runRoot 'resized.mp4'
        audio = Join-Path $runRoot 'audio.mp3'
        subtitles = Join-Path $runRoot 'subtitled.mp4'
        watermark = Join-Path $runRoot 'watermarked.mp4'
        gif = Join-Path $runRoot 'clip.gif'
        studio = Join-Path $runRoot 'studio.mp4'
    }

    Invoke-FfmpegStep 'compress' @(
        '-i', $inputOne, '-c:v', 'libx264', '-preset', 'ultrafast',
        '-crf', '28', '-c:a', 'aac', '-movflags', '+faststart', $outputs.compress
    )
    Invoke-FfmpegStep 'convert' @(
        '-i', $inputOne, '-c:v', 'libvpx-vp9', '-deadline', 'realtime',
        '-cpu-used', '8', '-crf', '32', '-b:v', '0',
        '-c:a', 'libopus', $outputs.convert
    )
    Invoke-FfmpegStep 'trim' @(
        '-i', $inputOne, '-ss', '00:00:01', '-to', '00:00:02.5',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', $outputs.trim
    )
    Invoke-FfmpegStep 'merge' @(
        '-i', $inputOne, '-i', $inputTwo,
        '-filter_complex', '[0:v:0][0:a:0][1:v:0][1:a:0]concat=n=2:v=1:a=1[v][a]',
        '-map', '[v]', '-map', '[a]', '-c:v', 'libx264',
        '-preset', 'ultrafast', '-c:a', 'aac', $outputs.merge
    )
    Invoke-FfmpegStep 'resize' @(
        '-i', $inputOne,
        '-vf', 'scale=360:640:force_original_aspect_ratio=decrease,pad=360:640:(ow-iw)/2:(oh-ih)/2',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', $outputs.resize
    )
    Invoke-FfmpegStep 'audio extract' @(
        '-i', $inputOne, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', $outputs.audio
    )
    Invoke-FfmpegStep 'burn subtitles' @(
        '-i', $inputOne, '-vf', "subtitles=filename='$subtitleFilter'",
        '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', $outputs.subtitles
    )
    Invoke-FfmpegStep 'watermark' @(
        '-i', $inputOne, '-i', $watermark,
        '-filter_complex', '[1:v]format=rgba,colorchannelmixer=aa=0.78[wm];[0:v][wm]overlay=W-w-24:H-h-24',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', $outputs.watermark
    )
    Invoke-FfmpegStep 'GIF' @(
        '-i', $inputOne,
        '-vf', 'fps=12,scale=360:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
        '-loop', '0', $outputs.gif
    )
    Invoke-FfmpegStep 'advanced Studio' @(
        '-i', $inputOne, '-map', '0:v:0', '-map', '0:a:0',
        '-vf', 'hqdn3d=1.5:1.5:6:6,eq=brightness=0.05:contrast=1.05:saturation=1.1,unsharp=5:5:0.8:3:3:0.4,scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,setpts=PTS/1.25,format=yuv420p',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
        '-af', 'atempo=1.25,loudnorm=I=-16:TP=-1.5:LRA=11,volume=1dB',
        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
        '-movflags', '+faststart', $outputs.studio
    )

    $results = foreach ($entry in $outputs.GetEnumerator()) {
        $probe = & $Ffprobe -v error -show_entries format=duration,size -of 'csv=p=0' $entry.Value
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $entry.Value)) {
            throw "ffprobe validation failed for $($entry.Key)"
        }
        [PSCustomObject]@{
            Tool = $entry.Key
            Probe = $probe
            Bytes = (Get-Item -LiteralPath $entry.Value).Length
        }
    }

    $results | Format-Table -AutoSize
    Write-Host "FrameHarbor smoke test passed: $($results.Count) outputs validated."
} finally {
    $resolvedRun = [System.IO.Path]::GetFullPath($runRoot)
    $resolvedRoot = [System.IO.Path]::GetFullPath($smokeRoot)
    if (
        (Test-Path -LiteralPath $runRoot) -and
        $resolvedRun.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
        $resolvedRun -ne $resolvedRoot
    ) {
        Remove-Item -LiteralPath $runRoot -Recurse -Force
    }
}
