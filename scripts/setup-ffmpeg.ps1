[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$releaseUrl = 'https://github.com/GyanD/codexffmpeg/releases/download/9.0/ffmpeg-9.0-essentials_build.zip'
$archiveSha256 = 'E6B54767A6065919048F1A098EB27211CA4E12B4348A05D88777A5855D0B6E71'
$projectRoot = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $projectRoot 'src-tauri\binaries'
$ffmpegDestination = Join-Path $destination 'ffmpeg.exe'
$ffprobeDestination = Join-Path $destination 'ffprobe.exe'

if (-not $Force -and (Test-Path -LiteralPath $ffmpegDestination) -and (Test-Path -LiteralPath $ffprobeDestination)) {
    Write-Host 'FFmpeg and ffprobe are already available.'
    exit 0
}

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('frameharbor-ffmpeg-' + [guid]::NewGuid().ToString('N'))
$archive = Join-Path $temporaryRoot 'ffmpeg.zip'
$expanded = Join-Path $temporaryRoot 'expanded'

try {
    New-Item -ItemType Directory -Path $temporaryRoot, $expanded -Force | Out-Null
    Write-Host 'Downloading the pinned FFmpeg 9.0 Essentials build...'
    Invoke-WebRequest -Uri $releaseUrl -OutFile $archive

    $archiveStream = [System.IO.File]::OpenRead($archive)
    try {
        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        try {
            $actualHash = ([System.BitConverter]::ToString($sha256.ComputeHash($archiveStream))).Replace('-', '')
        }
        finally {
            $sha256.Dispose()
        }
    }
    finally {
        $archiveStream.Dispose()
    }
    if ($actualHash -ne $archiveSha256) {
        throw "FFmpeg archive checksum mismatch. Expected $archiveSha256 but received $actualHash."
    }

    Expand-Archive -LiteralPath $archive -DestinationPath $expanded -Force
    $ffmpeg = Get-ChildItem -LiteralPath $expanded -Recurse -File -Filter 'ffmpeg.exe' | Select-Object -First 1
    $ffprobe = Get-ChildItem -LiteralPath $expanded -Recurse -File -Filter 'ffprobe.exe' | Select-Object -First 1
    if (-not $ffmpeg -or -not $ffprobe) {
        throw 'The verified archive did not contain ffmpeg.exe and ffprobe.exe.'
    }

    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    Copy-Item -LiteralPath $ffmpeg.FullName -Destination $ffmpegDestination -Force
    Copy-Item -LiteralPath $ffprobe.FullName -Destination $ffprobeDestination -Force
    Write-Host 'FFmpeg 9.0 is ready in src-tauri\binaries.'
}
finally {
    $resolvedTemp = [System.IO.Path]::GetFullPath($temporaryRoot)
    $systemTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolvedTemp.StartsWith($systemTemp, [System.StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path -Leaf $resolvedTemp).StartsWith('frameharbor-ffmpeg-')) {
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
