import { useState } from "react";
import type { MediaInfo, ToolOptions } from "../types";
import { Icon } from "./Icon";

const defaults: ToolOptions = {
  studioContainer: "mp4",
  studioVideoCodec: "h264",
  studioPreset: "balanced",
  studioCrf: "23",
  studioResolution: "original",
  studioFrameRate: "source",
  studioSpeed: "1",
  studioDeinterlace: false,
  studioDenoise: "off",
  studioSharpen: false,
  studioBrightness: "0",
  studioContrast: "1",
  studioSaturation: "1",
  studioAudioCodec: "aac",
  studioNormalize: false,
  studioAudioGain: "0",
  studioSampleRate: "source",
  studioChannels: "source",
  studioFastStart: true,
};

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  display,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  min: string;
  max: string;
  step: string;
  display: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={disabled ? "studio-range disabled" : "studio-range"}>
      <span><strong>{label}</strong><output>{display}</output></span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

export function StudioPage({
  media,
  onChooseFiles,
  onSubmit,
}: {
  media: MediaInfo[];
  onChooseFiles: () => void;
  onSubmit: (options: ToolOptions) => void;
}) {
  const [options, setOptions] = useState<ToolOptions>(defaults);
  const update = (key: keyof ToolOptions, value: string | boolean) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };
  const speed = Number(options.studioSpeed ?? "1");
  const audioFiltersDisabled = ["copy", "mute"].includes(options.studioAudioCodec ?? "");
  const pictureFilterCount = [
    options.studioDeinterlace,
    options.studioDenoise !== "off",
    options.studioSharpen,
    options.studioBrightness !== "0",
    options.studioContrast !== "1",
    options.studioSaturation !== "1",
  ].filter(Boolean).length;
  const pictureSummary = [
    options.studioResolution === "original" ? "Source size" : options.studioResolution,
    options.studioFrameRate === "source" ? "Source fps" : `${options.studioFrameRate} fps`,
    speed === 1 ? null : `${speed.toFixed(2)}x`,
  ].filter(Boolean).join(" / ");

  const changeAudioMode = (value: string) => {
    setOptions((current) => ({
      ...current,
      studioAudioCodec: value,
      ...(value === "copy" || value === "mute"
        ? {
            studioNormalize: false,
            studioAudioGain: "0",
            studioSampleRate: "source",
            studioChannels: "source",
          }
        : {}),
    }));
  };

  const changeContainer = (container: string) => {
    setOptions((current) => ({
      ...current,
      studioContainer: container,
      ...(container === "webm"
        ? {
            studioVideoCodec: ["vp9", "av1"].includes(current.studioVideoCodec ?? "")
              ? current.studioVideoCodec
              : "vp9",
            studioAudioCodec: ["copy", "mute", "opus"].includes(current.studioAudioCodec ?? "")
              ? current.studioAudioCodec
              : "opus",
          }
        : {}),
    }));
  };

  return (
    <div className="content-page studio-page">
      <section className="studio-header">
        <div>
          <span className="eyebrow">Advanced FFmpeg pipeline</span>
          <h2>Studio</h2>
          <p>Fine control over picture, sound, timing, and encoding in one export.</p>
        </div>
        <div className="studio-header-actions">
          <span>{media.length} video {media.length === 1 ? "source" : "sources"}</span>
          <button className="secondary-light-button" onClick={onChooseFiles}>
            <Icon name="folder" size={16} />
            Add media
          </button>
        </div>
      </section>

      <section className="pipeline-strip" aria-label="Active processing pipeline">
        <div className="pipeline-node">
          <span><Icon name="video" size={17} /></span>
          <div><small>Source</small><strong>{media.length ? `${media.length} selected` : "No media"}</strong></div>
        </div>
        <i className="pipeline-link" />
        <div className="pipeline-node">
          <span><Icon name="palette" size={17} /></span>
          <div><small>Video</small><strong>{pictureSummary}</strong></div>
        </div>
        <i className="pipeline-link" />
        <div className="pipeline-node">
          <span><Icon name="audio" size={17} /></span>
          <div><small>Audio</small><strong>{options.studioAudioCodec === "mute" ? "Removed" : options.studioAudioCodec?.toUpperCase()}</strong></div>
        </div>
        <i className="pipeline-link" />
        <div className="pipeline-node output">
          <span><Icon name="broadcast" size={17} /></span>
          <div><small>Output</small><strong>{options.studioVideoCodec?.toUpperCase()} / {options.studioContainer?.toUpperCase()}</strong></div>
        </div>
      </section>

      <div className="studio-controls">
        <fieldset className="studio-control-group">
          <legend><span>01</span> Picture & timing</legend>
          <div className="studio-field-grid">
            <label>
              <span>Resolution</span>
              <select value={options.studioResolution} onChange={(event) => update("studioResolution", event.currentTarget.value)}>
                <option value="original">Keep source</option>
                <option value="3840x2160">3840 x 2160</option>
                <option value="1920x1080">1920 x 1080</option>
                <option value="1280x720">1280 x 720</option>
                <option value="854x480">854 x 480</option>
                <option value="1080x1920">1080 x 1920</option>
                <option value="1080x1080">1080 x 1080</option>
              </select>
            </label>
            <label>
              <span>Frame rate</span>
              <select value={options.studioFrameRate} onChange={(event) => update("studioFrameRate", event.currentTarget.value)}>
                <option value="source">Keep source</option>
                <option value="24">24 fps</option>
                <option value="25">25 fps</option>
                <option value="30">30 fps</option>
                <option value="50">50 fps</option>
                <option value="60">60 fps</option>
              </select>
            </label>
          </div>
          <RangeControl
            label="Playback speed"
            value={options.studioSpeed ?? "1"}
            min="0.5"
            max="2"
            step="0.05"
            display={`${speed.toFixed(2)}x`}
            onChange={(value) =>
              setOptions((current) => ({
                ...current,
                studioSpeed: value,
                ...(current.studioAudioCodec === "copy" && value !== "1"
                  ? { studioAudioCodec: current.studioContainer === "webm" ? "opus" : "aac" }
                  : {}),
              }))
            }
          />
          <div className="studio-toggle-grid">
            <label className="studio-check">
              <input type="checkbox" checked={options.studioDeinterlace} onChange={(event) => update("studioDeinterlace", event.currentTarget.checked)} />
              <span><strong>Deinterlace</strong><small>YADIF motion filtering</small></span>
            </label>
            <label className="studio-check">
              <input type="checkbox" checked={options.studioSharpen} onChange={(event) => update("studioSharpen", event.currentTarget.checked)} />
              <span><strong>Sharpen</strong><small>Unsharp detail pass</small></span>
            </label>
          </div>
          <label>
            <span>Noise reduction</span>
            <select value={options.studioDenoise} onChange={(event) => update("studioDenoise", event.currentTarget.value)}>
              <option value="off">Off</option>
              <option value="light">Light</option>
              <option value="strong">Strong</option>
            </select>
          </label>
          <div className="studio-color-ranges">
            <RangeControl label="Brightness" value={options.studioBrightness ?? "0"} min="-0.5" max="0.5" step="0.05" display={Number(options.studioBrightness).toFixed(2)} onChange={(value) => update("studioBrightness", value)} />
            <RangeControl label="Contrast" value={options.studioContrast ?? "1"} min="0.5" max="2" step="0.05" display={Number(options.studioContrast).toFixed(2)} onChange={(value) => update("studioContrast", value)} />
            <RangeControl label="Saturation" value={options.studioSaturation ?? "1"} min="0" max="3" step="0.05" display={Number(options.studioSaturation).toFixed(2)} onChange={(value) => update("studioSaturation", value)} />
          </div>
          <span className="filter-count">{pictureFilterCount ? `${pictureFilterCount} picture ${pictureFilterCount === 1 ? "filter" : "filters"} active` : "Picture filters bypassed"}</span>
        </fieldset>

        <fieldset className="studio-control-group">
          <legend><span>02</span> Audio</legend>
          <label>
            <span>Audio mode</span>
            <select value={options.studioAudioCodec} onChange={(event) => changeAudioMode(event.currentTarget.value)}>
              {options.studioContainer !== "webm" && <option value="aac">Encode AAC</option>}
              <option value="opus">Encode Opus</option>
              <option value="copy">Copy stream</option>
              <option value="mute">Remove audio</option>
            </select>
          </label>
          <label className={audioFiltersDisabled ? "studio-check disabled" : "studio-check"}>
            <input type="checkbox" disabled={audioFiltersDisabled} checked={options.studioNormalize} onChange={(event) => update("studioNormalize", event.currentTarget.checked)} />
            <span><strong>EBU R128 loudness</strong><small>-16 LUFS, -1.5 dB peak</small></span>
          </label>
          <RangeControl label="Gain" value={options.studioAudioGain ?? "0"} min="-12" max="12" step="1" display={`${Number(options.studioAudioGain) > 0 ? "+" : ""}${options.studioAudioGain} dB`} disabled={audioFiltersDisabled} onChange={(value) => update("studioAudioGain", value)} />
          <div className="studio-field-grid">
            <label>
              <span>Sample rate</span>
              <select disabled={audioFiltersDisabled} value={options.studioSampleRate} onChange={(event) => update("studioSampleRate", event.currentTarget.value)}>
                <option value="source">Keep source</option>
                <option value="44100">44.1 kHz</option>
                <option value="48000">48 kHz</option>
                <option value="96000">96 kHz</option>
              </select>
            </label>
            <label>
              <span>Channels</span>
              <select disabled={audioFiltersDisabled} value={options.studioChannels} onChange={(event) => update("studioChannels", event.currentTarget.value)}>
                <option value="source">Keep source</option>
                <option value="1">Mono</option>
                <option value="2">Stereo</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="studio-control-group">
          <legend><span>03</span> Encoder & output</legend>
          <div className="studio-field-grid">
            <label>
              <span>Container</span>
              <select value={options.studioContainer} onChange={(event) => changeContainer(event.currentTarget.value)}>
                <option value="mp4">MP4</option>
                <option value="mkv">Matroska</option>
                <option value="webm">WebM</option>
              </select>
            </label>
            <label>
              <span>Video codec</span>
              <select value={options.studioVideoCodec} onChange={(event) => update("studioVideoCodec", event.currentTarget.value)}>
                {options.studioContainer !== "webm" && <option value="h264">H.264 / AVC</option>}
                {options.studioContainer !== "webm" && <option value="hevc">H.265 / HEVC</option>}
                <option value="vp9">VP9</option>
                <option value="av1">AV1</option>
              </select>
            </label>
          </div>
          <label>
            <span>Encoder effort</span>
            <select value={options.studioPreset} onChange={(event) => update("studioPreset", event.currentTarget.value)}>
              <option value="fast">Fast</option>
              <option value="balanced">Balanced</option>
              <option value="quality">Quality</option>
            </select>
          </label>
          <RangeControl label="Constant quality" value={options.studioCrf ?? "23"} min="14" max="40" step="1" display={`CRF ${options.studioCrf}`} onChange={(value) => update("studioCrf", value)} />
          <label className={options.studioContainer === "mp4" ? "studio-check" : "studio-check disabled"}>
            <input type="checkbox" disabled={options.studioContainer !== "mp4"} checked={options.studioFastStart} onChange={(event) => update("studioFastStart", event.currentTarget.checked)} />
            <span><strong>Fast start</strong><small>Move MP4 index to the front</small></span>
          </label>
          <button className="primary-button studio-export" disabled={!media.length} onClick={() => onSubmit(options)}>
            <Icon name="play" size={15} />
            Export {media.length > 1 ? `${media.length} files` : "with Studio"}
          </button>
        </fieldset>
      </div>

      {!media.length && (
        <button className="studio-empty-source" onClick={onChooseFiles}>
          <Icon name="upload" size={19} />
          Choose a video
        </button>
      )}
    </div>
  );
}
