import { tools } from "../data";
import type {
  AppSettings,
  EnvironmentStatus,
  MediaInfo,
  ProcessingJob,
  ToolId,
} from "../types";
import {
  formatBytes,
  formatDuration,
  friendlyCodec,
  shortPath,
} from "../utils";
import { Icon } from "./Icon";
import { ToolCard } from "./ToolCard";

export function AllToolsPage({
  query,
  onOpenTool,
}: {
  query: string;
  onOpenTool: (tool: ToolId) => void;
}) {
  const normalized = query.trim().toLowerCase();
  const visible = tools.filter((tool) =>
    [tool.title, tool.description, tool.category]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );

  return (
    <div className="content-page">
      <section className="page-intro">
        <div>
          <span className="eyebrow">Goal-based, not codec-based</span>
          <h2>What would you like to do?</h2>
          <p>Choose a task. VPT picks safe FFmpeg settings and keeps the advanced details out of the way.</p>
        </div>
        <span className="result-count">{visible.length} tools</span>
      </section>
      {visible.length ? (
        <div className="all-tools-grid">
          {visible.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onClick={() => onOpenTool(tool.id)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="search"
          title="No matching tool"
          message="Try a format such as MP4 or a goal such as audio."
        />
      )}
    </div>
  );
}

export function BatchPage({
  jobs,
  onCancel,
  onReveal,
  onClearFinished,
  onGoHome,
}: {
  jobs: ProcessingJob[];
  onCancel: (id: string) => void;
  onReveal: (path: string) => void;
  onClearFinished: () => void;
  onGoHome: () => void;
}) {
  const activeCount = jobs.filter((job) =>
    ["queued", "processing"].includes(job.status),
  ).length;
  const hasFinished = jobs.some((job) =>
    ["complete", "error", "cancelled"].includes(job.status),
  );

  if (!jobs.length) {
    return (
      <div className="content-page">
        <EmptyState
          icon="layers"
          title="Your queue is clear"
          message="Choose files and a tool to start processing locally."
          action="Choose a video"
          onAction={onGoHome}
        />
      </div>
    );
  }

  return (
    <div className="content-page">
      <section className="queue-summary">
        <div>
          <span className="eyebrow">One job at a time</span>
          <h2>{activeCount ? `${activeCount} remaining` : "All jobs finished"}</h2>
          <p>Closing VPT will stop active processing.</p>
        </div>
        {hasFinished && (
          <button className="ghost-button" onClick={onClearFinished}>
            <Icon name="trash" size={16} />
            Clear finished
          </button>
        )}
      </section>

      <div className="job-list">
        {jobs.map((job, index) => (
          <article className={`job-card ${job.status}`} key={job.id}>
            <span className="job-order">{String(index + 1).padStart(2, "0")}</span>
            <span className="job-icon"><Icon name={job.status === "complete" ? "check" : job.status === "error" ? "warning" : "file"} size={20} /></span>
            <div className="job-main">
              <div className="job-heading">
                <div>
                  <strong>{job.title}</strong>
                  <small>{job.sourceName}</small>
                </div>
                <span className={`status-pill ${job.status}`}>{job.status}</span>
              </div>
              <div className="progress-track">
                <i style={{ width: `${job.status === "complete" ? 100 : job.progress}%` }} />
              </div>
              <div className="job-meta">
                <span>{job.message}</span>
                {job.status === "processing" && (
                  <span>{Math.round(job.progress)}% {job.speed ? `at ${job.speed}` : ""}</span>
                )}
                {job.outputPath && job.status === "complete" && (
                  <button onClick={() => onReveal(job.outputPath!)}>
                    Show output <Icon name="external" size={13} />
                  </button>
                )}
              </div>
              {job.error && <pre className="job-error">{job.error}</pre>}
            </div>
            {["queued", "processing"].includes(job.status) && (
              <button className="job-cancel" onClick={() => onCancel(job.id)}>
                <Icon name="close" size={16} />
                Cancel
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

export function InspectorPage({
  media,
  onChooseFiles,
  onRemoveFile,
}: {
  media: MediaInfo[];
  onChooseFiles: () => void;
  onRemoveFile: (path: string) => void;
}) {
  if (!media.length) {
    return (
      <div className="content-page">
        <EmptyState
          icon="search"
          title="Choose media to inspect"
          message="VPT will reveal formats, codecs, resolution, frame rate, audio, bitrate, and duration."
          action="Choose media"
          onAction={onChooseFiles}
        />
      </div>
    );
  }

  return (
    <div className="content-page inspector-page">
      <section className="page-intro">
        <div>
          <span className="eyebrow">Powered by ffprobe</span>
          <h2>{media.length} inspected {media.length === 1 ? "file" : "files"}</h2>
          <p>Technical details translated into a compact, readable summary.</p>
        </div>
        <button className="secondary-light-button" onClick={onChooseFiles}>
          <Icon name="folder" size={16} />
          Add media
        </button>
      </section>

      <div className="inspector-list">
        {media.map((file) => {
          const facts = [
            { label: "Dimensions", value: file.width && file.height ? `${file.width} x ${file.height}` : "Not detected" },
            { label: "Duration", value: formatDuration(file.durationSeconds) },
            { label: "Video", value: friendlyCodec(file.videoCodec) },
            { label: "Audio", value: friendlyCodec(file.audioCodec) },
            { label: "Frame rate", value: file.frameRate ? `${file.frameRate.toFixed(2)} fps` : "Not detected" },
            { label: "Bitrate", value: file.bitRate ? `${(file.bitRate / 1_000_000).toFixed(2)} Mbps` : "Not detected" },
            { label: "Size", value: formatBytes(file.sizeBytes) },
            { label: "Container", value: file.formatName?.split(",")[0]?.toUpperCase() ?? "Unknown" },
          ];
          return (
            <article className="inspector-card" key={file.path}>
              <div className="inspector-file">
                <span><Icon name="file" size={25} /></span>
                <div>
                  <strong>{file.name}</strong>
                  <small title={file.path}>{shortPath(file.path, 68)}</small>
                </div>
                <button onClick={() => onRemoveFile(file.path)} aria-label={`Remove ${file.name}`}>
                  <Icon name="close" size={16} />
                </button>
              </div>
              <div className="facts-grid">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <span>{fact.label}</span>
                    <strong>{fact.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function StudioPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="content-page studio-page">
      <section className="studio-stage">
        <div className="studio-grid" />
        <span className="coming-badge"><Icon name="sparkles" size={14} /> Post-beta</span>
        <div className="studio-message">
          <span className="large-node-icon"><Icon name="nodes" size={30} /></span>
          <h2>Visual workflows are taking shape</h2>
          <p>Studio will connect sources, filters, and exports as reusable FFmpeg pipelines. The beta stays focused on dependable everyday tools.</p>
          <button className="primary-button" onClick={onBack}>Back to Simple mode</button>
        </div>
        <div className="node-preview node-source"><i /><span>Source</span><strong>Video input</strong></div>
        <div className="node-preview node-filter"><i /><span>Filter</span><strong>Resize 1080p</strong></div>
        <div className="node-preview node-export"><i /><span>Export</span><strong>Universal MP4</strong></div>
        <svg className="node-lines" viewBox="0 0 900 460" preserveAspectRatio="none" aria-hidden="true">
          <path d="M105 302 C230 302 190 378 350 378" />
          <path d="M510 378 C680 378 630 292 795 292" />
        </svg>
      </section>
    </div>
  );
}

export function SettingsPage({
  settings,
  environment,
  previewMode,
  onChooseOutput,
  onUpdate,
}: {
  settings: AppSettings;
  environment: EnvironmentStatus;
  previewMode: boolean;
  onChooseOutput: () => void;
  onUpdate: (settings: AppSettings) => void;
}) {
  const engineReady = environment.ffmpegAvailable && environment.ffprobeAvailable;
  return (
    <div className="content-page settings-page">
      <section className="settings-card engine-card">
        <div className="settings-heading">
          <span className={engineReady || previewMode ? "settings-icon success" : "settings-icon warning"}>
            <Icon name={engineReady || previewMode ? "check" : "warning"} size={20} />
          </span>
          <div>
            <h2>{previewMode ? "Browser interface preview" : engineReady ? "FFmpeg is ready" : "FFmpeg needs attention"}</h2>
            <p>{previewMode ? "Open the Tauri desktop app to process real files." : environment.ffmpegVersion ?? "VPT could not find its local media engine."}</p>
          </div>
        </div>
        <dl className="engine-details">
          <div><dt>Processing</dt><dd>{engineReady ? "Local" : previewMode ? "Simulated" : "Unavailable"}</dd></div>
          <div><dt>Acceleration</dt><dd>{environment.hardwareEncoder ?? "CPU fallback"}</dd></div>
          <div><dt>Source</dt><dd title={environment.binarySource ?? ""}>{environment.binarySource ? shortPath(environment.binarySource, 42) : "Bundled with release"}</dd></div>
        </dl>
      </section>

      <section className="settings-card">
        <div className="settings-heading">
          <span className="settings-icon"><Icon name="folder" size={20} /></span>
          <div>
            <h2>Output location</h2>
            <p>Leave blank to save beside the original file.</p>
          </div>
        </div>
        <div className="path-picker">
          <span>{settings.outputDir || "Same folder as source"}</span>
          <button onClick={onChooseOutput}>Choose folder</button>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-heading">
          <span className="settings-icon"><Icon name="settings" size={20} /></span>
          <div>
            <h2>Encoding</h2>
            <p>Automatic mode uses a working GPU encoder and falls back to the CPU safely.</p>
          </div>
        </div>
        <div className="choice-row">
          <button
            className={settings.encoding === "auto" ? "choice selected" : "choice"}
            onClick={() => onUpdate({ ...settings, encoding: "auto" })}
          >
            <strong>Automatic</strong>
            <small>Fastest available option</small>
          </button>
          <button
            className={settings.encoding === "cpu" ? "choice selected" : "choice"}
            onClick={() => onUpdate({ ...settings, encoding: "cpu" })}
          >
            <strong>CPU only</strong>
            <small>Most predictable output</small>
          </button>
        </div>
      </section>

      <section className="settings-card compact-setting">
        <div className="settings-heading">
          <span className="settings-icon"><Icon name="file" size={20} /></span>
          <div>
            <h2>Preserve metadata</h2>
            <p>Keep compatible title, author, and creation tags.</p>
          </div>
        </div>
        <button
          className={settings.keepMetadata ? "toggle enabled" : "toggle"}
          onClick={() => onUpdate({ ...settings, keepMetadata: !settings.keepMetadata })}
          aria-pressed={settings.keepMetadata}
        >
          <i />
        </button>
      </section>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  message,
  action,
  onAction,
}: {
  icon: "search" | "layers";
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <section className="empty-state">
      <span><Icon name={icon} size={29} /></span>
      <h2>{title}</h2>
      <p>{message}</p>
      {action && onAction && <button className="primary-button" onClick={onAction}>{action}</button>}
    </section>
  );
}
