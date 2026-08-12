export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unknown size";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remaining = rounded % 60;
  return hours > 0
    ? [hours, minutes, remaining].map((part) => String(part).padStart(2, "0")).join(":")
    : [minutes, remaining].map((part) => String(part).padStart(2, "0")).join(":");
}

export function parseTimecode(value?: string) {
  if (!value) return 0;
  const parts = value.trim().split(":").map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part) || part < 0)) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function formatTimecode(seconds: number) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remaining = (safe % 60).toFixed(3).padStart(6, "0");
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${remaining}`;
}

export function shortPath(path: string, max = 48) {
  if (path.length <= max) return path;
  return `...${path.slice(-(max - 3))}`;
}

export function friendlyCodec(codec?: string | null) {
  if (!codec) return "Unknown";
  const names: Record<string, string> = {
    h264: "H.264",
    hevc: "H.265 / HEVC",
    av1: "AV1",
    vp9: "VP9",
    aac: "AAC",
    opus: "Opus",
    mp3: "MP3",
  };
  return names[codec.toLowerCase()] ?? codec.toUpperCase();
}
