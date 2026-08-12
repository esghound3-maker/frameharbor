export type ViewId = "home" | "tools" | "batch" | "inspector" | "studio" | "settings";

export type ToolId =
  | "compress"
  | "convert"
  | "trim"
  | "merge"
  | "resize"
  | "audio"
  | "subtitles"
  | "watermark"
  | "gif"
  | "thumbnail";

export type IconName =
  | "home"
  | "grid"
  | "layers"
  | "search"
  | "nodes"
  | "settings"
  | "shield"
  | "upload"
  | "compress"
  | "convert"
  | "cut"
  | "captions"
  | "merge"
  | "resize"
  | "audio"
  | "watermark"
  | "image"
  | "file"
  | "close"
  | "chevron"
  | "play"
  | "folder"
  | "check"
  | "warning"
  | "sparkles"
  | "trash"
  | "video"
  | "broadcast"
  | "palette"
  | "tag"
  | "code"
  | "external";

export interface ToolDefinition {
  id: ToolId;
  title: string;
  shortDescription: string;
  description: string;
  icon: IconName;
  tone: "violet" | "blue" | "mint" | "coral" | "amber";
  category: "Video" | "Audio" | "Captions" | "Images";
}

export interface EnvironmentStatus {
  ffmpegAvailable: boolean;
  ffprobeAvailable: boolean;
  ffmpegVersion?: string | null;
  hardwareEncoder?: string | null;
  binarySource?: string | null;
}

export interface MediaInfo {
  path: string;
  name: string;
  sizeBytes: number;
  durationSeconds: number;
  width?: number | null;
  height?: number | null;
  frameRate?: number | null;
  videoCodec?: string | null;
  audioCodec?: string | null;
  audioChannels?: number | null;
  bitRate?: number | null;
  formatName?: string | null;
  previewOnly?: boolean;
}

export interface ToolOptions {
  quality?: string;
  format?: string;
  resolution?: string;
  resizeMode?: string;
  rotate?: string;
  rotationDegrees?: string;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  cropX?: string;
  cropY?: string;
  cropWidth?: string;
  cropHeight?: string;
  startTime?: string;
  endTime?: string;
  trimMode?: string;
  audioAction?: string;
  audioFormat?: string;
  audioLevel?: string;
  audioMono?: boolean;
  thumbnailAction?: string;
  thumbnailTime?: string;
  subtitleMode?: string;
  auxiliaryPath?: string;
  watermarkPosition?: string;
  videoEncoder?: string;
  keepMetadata?: boolean;
}

export interface JobRequest {
  id: string;
  tool: ToolId;
  inputPaths: string[];
  outputDir?: string | null;
  durationSeconds?: number;
  options: ToolOptions;
}

export interface JobStarted {
  id: string;
  outputPath: string;
}

export interface JobProgress {
  id: string;
  progress: number;
  elapsedSeconds: number;
  speed?: string | null;
  message: string;
}

export interface JobFinished {
  id: string;
  outputPath: string;
  message: string;
}

export type JobStatus = "queued" | "processing" | "complete" | "error" | "cancelled";

export interface ProcessingJob {
  id: string;
  title: string;
  sourceName: string;
  tool: ToolId;
  status: JobStatus;
  progress: number;
  message: string;
  elapsedSeconds: number;
  speed?: string | null;
  outputPath?: string;
  error?: string;
  request: JobRequest;
}

export interface AppSettings {
  outputDir: string;
  encoding: "auto" | "cpu";
  keepMetadata: boolean;
}
