import { useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { toolById } from "../data";
import type { MediaInfo, ToolId, ToolOptions } from "../types";
import { formatBytes, formatDuration, formatTimecode, parseTimecode, shortPath } from "../utils";
import { Icon } from "./Icon";
import { VideoTimeline } from "./VideoTimeline";

interface ToolPanelProps {
  toolId: ToolId;
  media: MediaInfo[];
  onClose: () => void;
  onChooseFiles: () => void;
  onPickAuxiliary: (kind: "subtitle" | "image") => Promise<string | null>;
  onSubmit: (options: ToolOptions) => void;
}

const defaults: Record<ToolId, ToolOptions> = {
  compress: { quality: "balanced", resolution: "original" },
  convert: { format: "mp4", quality: "balanced" },
  trim: { startTime: "00:00:00", endTime: "", trimMode: "accurate", quality: "balanced" },
  merge: { quality: "balanced" },
  resize: { resolution: "1920x1080", resizeMode: "fit", rotate: "none", rotationDegrees: "0", flipHorizontal: false, flipVertical: false, quality: "balanced" },
  audio: { audioAction: "adjust", audioFormat: "mp3", audioLevel: "0", audioMono: false },
  subtitles: { subtitleMode: "burn", quality: "balanced", auxiliaryPath: "" },
  watermark: { watermarkPosition: "bottom-right", quality: "balanced", auxiliaryPath: "" },
  gif: {},
  thumbnail: { thumbnailAction: "save-frame", thumbnailTime: "0.000", auxiliaryPath: "" },
  studio: {},
};

export function ToolPanel({
  toolId,
  media,
  onClose,
  onChooseFiles,
  onPickAuxiliary,
  onSubmit,
}: ToolPanelProps) {
  const tool = toolById(toolId);
  const [options, setOptions] = useState<ToolOptions>({ ...defaults[toolId] });

  useEffect(() => setOptions({ ...defaults[toolId] }), [toolId]);

  const validation = useMemo(() => {
    if (!media.length) return "Choose at least one media file.";
    if (toolId === "merge" && media.length < 2) return "Choose at least two clips to merge.";
    if (["subtitles", "watermark"].includes(toolId) && !options.auxiliaryPath) {
      return toolId === "subtitles" ? "Choose an SRT subtitle file." : "Choose a PNG or JPG watermark.";
    }
    if (toolId === "thumbnail" && options.thumbnailAction === "add-cover" && !options.auxiliaryPath) {
      return "Choose a JPG, PNG, or WebP cover image.";
    }
    if (toolId === "resize" && options.resizeMode === "custom-crop" && !options.cropWidth) {
      return "Pause the preview and drag over the area you want to keep.";
    }
    return "";
  }, [media.length, options.auxiliaryPath, toolId]);

  const update = (key: keyof ToolOptions, value: string | boolean) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  const chooseAuxiliary = async (kind: "subtitle" | "image") => {
    const path = await onPickAuxiliary(kind);
    if (path) update("auxiliaryPath", path);
  };

  return (
    <div className="panel-backdrop" onMouseDown={onClose}>
      <aside className="tool-panel" onMouseDown={(event) => event.stopPropagation()}>
        <header className="panel-header">
          <span className={`tool-icon ${tool.tone}`}><Icon name={tool.icon} size={24} /></span>
          <div>
            <span>Configure tool</span>
            <h2>{tool.title}</h2>
            <p>{tool.description}</p>
          </div>
          <button className="panel-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={19} />
          </button>
        </header>

        <div className="panel-scroll">
          <section className="panel-section">
            <div className="panel-section-title">
              <span>Input</span>
              <button onClick={onChooseFiles}>Add files</button>
            </div>
            {media.length ? (
              <div className="panel-files">
                {media.map((file, index) => (
                  <div className="panel-file" key={file.path}>
                    <span>{toolId === "merge" ? index + 1 : <Icon name="file" size={17} />}</span>
                    <div>
                      <strong>{file.name}</strong>
                      <small>{formatDuration(file.durationSeconds)} - {formatBytes(file.sizeBytes)}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <button className="panel-empty-input" onClick={onChooseFiles}>
                <Icon name="upload" size={20} />
                Choose media
              </button>
            )}
          </section>

          <section className="panel-section">
            <div className="panel-section-title"><span>Settings</span></div>
            {toolId === "compress" && (
              <>
                <Control label="Output quality" hint="Balanced is a strong default.">
                  <Segmented
                    value={options.quality!}
                    options={[["small", "Smaller"], ["balanced", "Balanced"], ["high", "Higher quality"]]}
                    onChange={(value) => update("quality", value)}
                  />
                </Control>
                <Control label="Maximum resolution">
                  <Select
                    value={options.resolution!}
                    options={[["original", "Keep original"], ["1920x1080", "1080p"], ["1280x720", "720p"], ["854x480", "480p"]]}
                    onChange={(value) => update("resolution", value)}
                  />
                </Control>
              </>
            )}

            {toolId === "convert" && (
              <>
                <Control label="Output format" hint="MP4 works on the widest range of devices.">
                  <Select
                    value={options.format!}
                    options={[["mp4", "Universal MP4"], ["mov", "MOV"], ["mkv", "Matroska MKV"], ["webm", "WebM"], ["mp3", "MP3 audio"], ["wav", "WAV audio"], ["flac", "FLAC audio"]]}
                    onChange={(value) => update("format", value)}
                  />
                </Control>
                {!["mp3", "wav", "flac"].includes(options.format ?? "") && (
                  <Control label="Output quality">
                    <Segmented
                      value={options.quality!}
                      options={[["small", "Smaller"], ["balanced", "Balanced"], ["high", "Higher"]]}
                      onChange={(value) => update("quality", value)}
                    />
                  </Control>
                )}
              </>
            )}

            {toolId === "trim" && (
              <>
                {media[0] && (
                  <TrimEditor media={media[0]} options={options} update={update} />
                )}
                <div className="field-pair">
                  <Control label="Start time">
                    <input className="field-input" value={options.startTime} onChange={(event) => update("startTime", event.currentTarget.value)} placeholder="00:00:00" />
                  </Control>
                  <Control label="End time" hint="Leave blank for the end.">
                    <input className="field-input" value={options.endTime} onChange={(event) => update("endTime", event.currentTarget.value)} placeholder="00:01:30" />
                  </Control>
                </div>
                <Control label="Cut mode">
                  <Segmented
                    value={options.trimMode!}
                    options={[["accurate", "Frame accurate"], ["fast", "Fast copy"]]}
                    onChange={(value) => update("trimMode", value)}
                  />
                </Control>
              </>
            )}

            {toolId === "merge" && (
              <div className="info-note">
                <Icon name="merge" size={18} />
                Clips are joined in the order shown. Matching dimensions and frame rates give the most reliable results.
              </div>
            )}

            {toolId === "resize" && (
              <>
                <Control label="Framing">
                  <Segmented
                    value={options.resizeMode!}
                    options={[["fit", "Fit with bars"], ["fill", "Fill"], ["custom-crop", "Free crop"]]}
                    onChange={(value) => update("resizeMode", value)}
                  />
                </Control>
                {options.resizeMode !== "custom-crop" && <Control label="Canvas size">
                  <Select
                    value={options.resolution!}
                    options={[["1920x1080", "Landscape 1080p (16:9)"], ["1280x720", "Landscape 720p (16:9)"], ["1080x1920", "Vertical (9:16)"], ["1080x1080", "Square (1:1)"], ["3840x2160", "Ultra HD 4K"]]}
                    onChange={(value) => update("resolution", value)}
                  />
                </Control>}
                {options.resizeMode === "custom-crop" && media[0] && (
                  <FrameEditor media={media[0]} mode="crop" options={options} update={update} />
                )}
                <Control label="Rotate">
                  <Select
                    value={options.rotate!}
                    options={[["none", "Do not rotate"], ["90", "90 degrees right"], ["180", "180 degrees"], ["270", "90 degrees left"], ["custom", "Custom angle"]]}
                    onChange={(value) => update("rotate", value)}
                  />
                </Control>
                {options.rotate === "custom" && (
                  <Control label="Custom angle" hint="Use negative degrees for left rotation.">
                    <input className="field-input" type="number" min="-359" max="359" step="0.1" value={options.rotationDegrees}
                           onChange={(event) => update("rotationDegrees", event.currentTarget.value)} />
                  </Control>
                )}
                <Control label="Custom flip">
                  <span className="check-row">
                    <label><input type="checkbox" checked={Boolean(options.flipHorizontal)} onChange={(event) => update("flipHorizontal", event.currentTarget.checked)} /> Flip left / right</label>
                    <label><input type="checkbox" checked={Boolean(options.flipVertical)} onChange={(event) => update("flipVertical", event.currentTarget.checked)} /> Flip up / down</label>
                  </span>
                </Control>
              </>
            )}

            {toolId === "audio" && (
              <>
                <Control label="Audio action">
                  <Select
                    value={options.audioAction!}
                    options={[["adjust", "Adjust level / mono"], ["extract", "Extract audio"], ["normalize", "Normalize loudness"], ["mute", "Remove audio"]]}
                    onChange={(value) => update("audioAction", value)}
                  />
                </Control>
                {options.audioAction === "adjust" && (
                  <>
                    <Control label="Audio level" hint="Decibels (dB)">
                      <Segmented value={options.audioLevel!}
                                 options={[["6", "+6"], ["3", "+3"], ["0", "0"], ["-3", "-3"], ["-6", "-6"]]}
                                 onChange={(value) => update("audioLevel", value)} />
                    </Control>
                    <Control label="Channels">
                      <span className="check-row single">
                        <label><input type="checkbox" checked={Boolean(options.audioMono)} onChange={(event) => update("audioMono", event.currentTarget.checked)} /> Convert stereo to mono</label>
                      </span>
                    </Control>
                  </>
                )}
                {options.audioAction === "extract" && (
                  <Control label="Audio format">
                    <Segmented
                      value={options.audioFormat!}
                      options={[["mp3", "MP3"], ["aac", "AAC"], ["wav", "WAV"], ["flac", "FLAC"]]}
                      onChange={(value) => update("audioFormat", value)}
                    />
                  </Control>
                )}
              </>
            )}

            {toolId === "thumbnail" && (
              <>
                <Control label="Thumbnail action">
                  <Select value={options.thumbnailAction!}
                          options={[["save-frame", "Save paused frame as JPG"], ["add-cover", "Add or replace cover image"], ["remove-cover", "Remove cover image"]]}
                          onChange={(value) => update("thumbnailAction", value)} />
                </Control>
                {options.thumbnailAction === "save-frame" && media[0] && (
                  <FrameEditor media={media[0]} mode="thumbnail" options={options} update={update} />
                )}
                {options.thumbnailAction === "add-cover" && (
                  <Control label="Cover image">
                    <button className="file-picker-button" onClick={() => chooseAuxiliary("image")}>
                      <Icon name="image" size={17} />
                      <span>{options.auxiliaryPath ? shortPath(options.auxiliaryPath, 34) : "Choose JPG, PNG, or WebP"}</span>
                      <Icon name="chevron" size={14} />
                    </button>
                  </Control>
                )}
                {options.thumbnailAction === "remove-cover" && (
                  <div className="info-note"><Icon name="image" size={18} />The main video and audio stay unchanged. Only the embedded cover is removed.</div>
                )}
              </>
            )}

            {toolId === "subtitles" && (
              <>
                <Control label="Subtitle file">
                  <button className="file-picker-button" onClick={() => chooseAuxiliary("subtitle")}>
                    <Icon name="captions" size={17} />
                    <span>{options.auxiliaryPath ? shortPath(options.auxiliaryPath, 34) : "Choose an SRT file"}</span>
                    <Icon name="chevron" size={14} />
                  </button>
                </Control>
                <Control label="Subtitle mode">
                  <Segmented
                    value={options.subtitleMode!}
                    options={[["burn", "Burn into video"], ["soft", "Selectable track"]]}
                    onChange={(value) => update("subtitleMode", value)}
                  />
                </Control>
              </>
            )}

            {toolId === "watermark" && (
              <>
                <Control label="Watermark image">
                  <button className="file-picker-button" onClick={() => chooseAuxiliary("image")}>
                    <Icon name="image" size={17} />
                    <span>{options.auxiliaryPath ? shortPath(options.auxiliaryPath, 34) : "Choose PNG or JPG"}</span>
                    <Icon name="chevron" size={14} />
                  </button>
                </Control>
                <Control label="Position">
                  <Select
                    value={options.watermarkPosition!}
                    options={[["bottom-right", "Bottom right"], ["bottom-left", "Bottom left"], ["top-right", "Top right"], ["top-left", "Top left"], ["center", "Center"]]}
                    onChange={(value) => update("watermarkPosition", value)}
                  />
                </Control>
              </>
            )}

            {toolId === "gif" && (
              <div className="info-note">
                <Icon name="image" size={18} />
                FrameHarbor creates a 720-pixel-wide, 12 fps looping GIF with an optimized color palette.
              </div>
            )}
          </section>

          <section className="safety-note">
            <Icon name="shield" size={18} />
            <div>
              <strong>Your original stays untouched</strong>
              <span>FrameHarbor creates a uniquely named output beside the source or in your chosen folder.</span>
            </div>
          </section>
        </div>

        <footer className="panel-footer">
          <div>
            <span>{toolId === "merge" ? "1 output" : `${media.length || 0} ${media.length === 1 ? "job" : "jobs"}`}</span>
            <small>{validation || "Ready to add to the local queue"}</small>
          </div>
          <button
            className="primary-button panel-submit"
            disabled={Boolean(validation)}
            onClick={() => onSubmit(options)}
          >
            <Icon name="play" size={15} />
            Add to queue
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Control({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="control">
      <span className="control-label">{label}{hint && <small>{hint}</small>}</span>
      {children}
    </label>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <span className="segmented">
      {options.map(([id, label]) => (
        <button
          type="button"
          key={id}
          className={value === id ? "selected" : ""}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </span>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <select className="field-select" value={value} onChange={(event) => onChange(event.currentTarget.value)}>
      {options.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
    </select>
  );
}

function TrimEditor({
  media,
  options,
  update,
}: {
  media: MediaInfo;
  options: ToolOptions;
  update: (key: keyof ToolOptions, value: string | boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const source = media.previewOnly ? "" : convertFileSrc(media.path);
  const duration = Math.max(0.001, media.durationSeconds || 0.001);
  const start = Math.max(0, Math.min(duration, parseTimecode(options.startTime)));
  const requestedEnd = options.endTime ? parseTimecode(options.endTime) : duration;
  const end = Math.max(start, Math.min(duration, requestedEnd || duration));

  const seek = (seconds: number) => {
    const next = Math.max(0, Math.min(duration, seconds));
    setCurrentTime(next);
    if (videoRef.current) videoRef.current.currentTime = next;
  };

  const changeStart = (seconds: number) => {
    const next = Math.max(0, Math.min(end - 0.05, seconds));
    update("startTime", formatTimecode(next));
    seek(next);
  };

  const changeEnd = (seconds: number) => {
    const next = Math.min(duration, Math.max(start + 0.05, seconds));
    update("endTime", formatTimecode(next));
    seek(next);
  };

  if (!source) {
    return <div className="info-note"><Icon name="play" size={18} />Video timeline is available in the installed desktop app.</div>;
  }

  return (
    <div className="frame-editor trim-editor">
      <div className="frame-stage">
        <video
          ref={videoRef}
          src={source}
          controls
          preload="metadata"
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        />
      </div>
      <VideoTimeline
        media={media}
        currentTime={currentTime}
        onSeek={seek}
        rangeStart={start}
        rangeEnd={end}
        onRangeStartChange={changeStart}
        onRangeEndChange={changeEnd}
      />
      <div className="frame-actions trim-actions">
        <button type="button" onClick={() => changeStart(currentTime)}>Set start</button>
        <button type="button" onClick={() => changeEnd(currentTime)}>Set end</button>
        <span>Drag the white handles to choose the part to keep</span>
      </div>
    </div>
  );
}

function FrameEditor({
  media,
  mode,
  options,
  update,
}: {
  media: MediaInfo;
  mode: "crop" | "thumbnail";
  options: ToolOptions;
  update: (key: keyof ToolOptions, value: string | boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(Number(options.thumbnailTime || 0));
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState({ x: 8, y: 8, width: 84, height: 84 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const source = media.previewOnly ? "" : convertFileSrc(media.path);

  const seek = (seconds: number) => {
    const next = Math.max(0, Math.min(media.durationSeconds, seconds));
    setCurrentTime(next);
    if (videoRef.current) videoRef.current.currentTime = next;
  };

  const point = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const beginCrop = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = point(event);
    dragStart.current = start;
    setSelection({ x: start.x, y: start.y, width: 0, height: 0 });
  };

  const moveCrop = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const current = point(event);
    setSelection({
      x: Math.min(current.x, dragStart.current.x),
      y: Math.min(current.y, dragStart.current.y),
      width: Math.abs(current.x - dragStart.current.x),
      height: Math.abs(current.y - dragStart.current.y),
    });
  };

  const finishCrop = () => {
    dragStart.current = null;
    const naturalWidth = media.width || videoRef.current?.videoWidth || 0;
    const naturalHeight = media.height || videoRef.current?.videoHeight || 0;
    if (!naturalWidth || !naturalHeight || selection.width < 2 || selection.height < 2) return;
    const even = (value: number) => Math.max(2, Math.floor(value / 2) * 2);
    const x = Math.floor((selection.x / 100) * naturalWidth / 2) * 2;
    const y = Math.floor((selection.y / 100) * naturalHeight / 2) * 2;
    update("cropX", String(x));
    update("cropY", String(y));
    update("cropWidth", String(Math.min(even((selection.width / 100) * naturalWidth), naturalWidth - x)));
    update("cropHeight", String(Math.min(even((selection.height / 100) * naturalHeight), naturalHeight - y)));
  };

  if (!source) {
    return <div className="info-note"><Icon name="play" size={18} />Frame preview is available in the installed desktop app.</div>;
  }

  return (
    <div className="frame-editor">
      <div className="frame-stage">
        <video
          ref={videoRef}
          src={source}
          controls
          preload="metadata"
          onLoadedMetadata={(event) => {
            const initial = Math.max(0, Math.min(event.currentTarget.duration, currentTime));
            event.currentTarget.currentTime = initial;
          }}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        />
        {mode === "crop" && editing && (
          <div className="crop-layer" onPointerDown={beginCrop} onPointerMove={moveCrop}
               onPointerUp={() => { finishCrop(); setEditing(false); }}>
            <span className="crop-selection" style={{ left: `${selection.x}%`, top: `${selection.y}%`, width: `${selection.width}%`, height: `${selection.height}%` }}>
              <i /><i /><i /><i />
            </span>
          </div>
        )}
      </div>
      <VideoTimeline media={media} currentTime={currentTime} onSeek={seek} />
      {mode === "crop" ? (
        <div className="frame-actions">
          <button type="button" onClick={() => {
            videoRef.current?.pause();
            setEditing(true);
          }}>Crop this frame</button>
          <span>{options.cropWidth ? `${options.cropWidth} x ${options.cropHeight} at ${options.cropX}, ${options.cropY}` : "Pause, then drag over the area to keep"}</span>
        </div>
      ) : (
        <div className="frame-actions">
          <button type="button" onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            video.pause();
            update("thumbnailTime", currentTime.toFixed(3));
          }}>Use paused frame</button>
          <span>Selected at {Number(options.thumbnailTime || 0).toFixed(1)} seconds</span>
        </div>
      )}
    </div>
  );
}
