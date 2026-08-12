import type { DragEvent } from "react";
import { quickToolIds, toolById } from "../data";
import type { IconName, ToolId } from "../types";
import { Icon } from "./Icon";
import { ToolCard } from "./ToolCard";

interface HomeProps {
  onChooseFiles: () => void;
  onBrowserFiles: (files: File[]) => void;
  fileDragActive: boolean;
  onOpenTool: (tool: ToolId) => void;
  onOpenAllTools: () => void;
  onOpenStudio: () => void;
}

const browseItems: Array<{ label: string; icon: IconName }> = [
  { label: "Video", icon: "video" },
  { label: "Images & GIF", icon: "image" },
  { label: "Audio", icon: "audio" },
  { label: "Stream & Record", icon: "broadcast" },
  { label: "Color", icon: "palette" },
  { label: "Metadata", icon: "tag" },
  { label: "Formats", icon: "code" },
];

function HeroArtwork() {
  return (
    <svg viewBox="0 0 520 245" role="presentation">
      <defs>
        <linearGradient id="hero-card" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fffdf6" />
          <stop offset="1" stopColor="#e8e2d8" />
        </linearGradient>
        <filter id="hero-shadow" x="-30%" y="-30%" width="170%" height="190%">
          <feDropShadow dx="11" dy="15" stdDeviation="4" floodColor="#001a54" floodOpacity=".64" />
        </filter>
      </defs>

      <g className="hero-speed-lines">
        <path d="M58 45h55" />
        <path d="M45 66h88" />
        <path d="M70 87h58" />
      </g>

      <g className="hero-grid-lines">
        <path d="M20 184h465" />
        <path d="M28 203h444" />
        <path d="M44 220h405" />
        <path d="M87 236h325" />
        <path d="m55 166-28 70" />
        <path d="m112 166-17 70" />
        <path d="m168 166-7 70" />
        <path d="m223 166 4 70" />
        <path d="m279 166 15 70" />
        <path d="m335 166 25 70" />
        <path d="m391 166 36 70" />
      </g>

      <g className="hero-target">
        <path d="M405 96v126" />
        <path d="M398 98h14" />
        <path d="M400 222h11" />
        <circle cx="405" cy="92" r="4" />
        <path d="M318 157h70v61h-70z" strokeDasharray="8 6" />
      </g>

      <g transform="translate(120 28) rotate(9 112 67)" filter="url(#hero-shadow)">
        <path d="M7 2h211v134H7z" fill="url(#hero-card)" stroke="#101111" strokeWidth="2" />
        <path d="M184 2h34v134h-34z" fill="#f5f0e8" />
        <g fill="#121313">
          <rect x="194" y="10" width="11" height="15" />
          <rect x="194" y="34" width="11" height="15" />
          <rect x="194" y="58" width="11" height="15" />
          <rect x="194" y="82" width="11" height="15" />
          <rect x="194" y="106" width="11" height="15" />
        </g>
        <path d="m76 38 61 31-61 35z" fill="#0349c7" stroke="#0d1216" strokeWidth="2" />
      </g>
    </svg>
  );
}

function StudioFlow() {
  return (
    <svg viewBox="0 0 500 105" role="presentation">
      <g fill="none" strokeWidth="2">
        <path d="M68 48h82" stroke="#0b51c7" />
        <path d="M202 48c38 0 35-27 69-27" stroke="#d84128" />
        <path d="M202 48c38 0 35 35 69 35" stroke="#e44d32" />
        <path d="M307 21c38 0 27 27 60 27" stroke="#35b89b" />
        <path d="M307 83c38 0 27-35 60-35" stroke="#35b89b" />
        <path d="M405 48h43" stroke="#0b51c7" />
      </g>
      <g fill="#f4f0e8" stroke="#f4f0e8">
        <path d="m143 44 8 4-8 4z" />
        <path d="m263 18 8 3-8 4z" />
        <path d="m263 79 8 4-8 4z" />
        <path d="m359 44 8 4-8 4z" />
        <path d="m440 44 8 4-8 4z" />
      </g>
      <g className="flow-node">
        <rect x="12" y="17" width="56" height="62" />
        <path d="M24 30h32v36H24z" />
        <path d="M24 36h32M24 60h32" />
        <path d="M29 30v6m8-6v6m8-6v6m7-6v6M29 60v6m8-6v6m8-6v6m7-6v6" />
      </g>
      <g>
        <rect x="150" y="24" width="52" height="48" fill="#0649c6" stroke="#4b75df" />
        <circle cx="176" cy="48" r="10" fill="#3978eb" stroke="#e6f0ff" />
        <rect x="271" y="0" width="36" height="39" fill="#f0492c" stroke="#f57a62" />
        <circle cx="289" cy="19.5" r="6" fill="#ff6b4c" />
        <rect x="271" y="64" width="36" height="39" fill="#e3482d" stroke="#f57a62" />
        <path d="M281 83h16" stroke="#ffd6cc" strokeWidth="2" />
        <rect x="367" y="24" width="38" height="48" fill="#25b896" stroke="#75dac5" />
        <circle cx="386" cy="48" r="9" fill="#e8fff9" />
        <path d="M386 42v12m-4-6h8" stroke="#25b896" strokeWidth="2" />
        <rect x="448" y="17" width="44" height="62" fill="#07131f" stroke="#0b54d4" />
        <path d="m463 31 18 17-18 17z" fill="#0b52d1" />
      </g>
    </svg>
  );
}

export function Home({
  onChooseFiles,
  onBrowserFiles,
  fileDragActive,
  onOpenTool,
  onOpenAllTools,
  onOpenStudio,
}: HomeProps) {
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length) onBrowserFiles(files);
  };

  return (
    <div className="home-page">
      <span className="technical-label technical-label-one" aria-hidden="true">01A</span>
      <span className="technical-label technical-label-two" aria-hidden="true">24 FPS</span>

      <section
        className={`drop-hero${fileDragActive ? " is-dragging" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <span className="film-label film-label-left">FRAME 0001</span>
        <span className="film-label film-label-right">25 FPS</span>
        <span className="film-code">V10</span>

        <div className="drop-copy">
          <span className="drop-icon"><Icon name="upload" size={34} strokeWidth={1.65} /></span>
          <div>
            <h2>Drop a video. Choose a goal.</h2>
            <p>Everything is processed privately on your computer</p>
          </div>
          <button className="primary-button hero-choose" onClick={onChooseFiles}>
            <Icon name="folder" size={18} strokeWidth={1.6} />
            Choose a file
          </button>
        </div>

        <div className="media-art" aria-hidden="true">
          <HeroArtwork />
        </div>
      </section>

      <section className="quick-section">
        <div className="quick-area">
          <div className="home-section-heading">
            <h3>Quick actions</h3>
            <span />
          </div>
          <div className="quick-grid">
            {quickToolIds.map((id) => (
              <ToolCard key={id} tool={toolById(id)} onClick={() => onOpenTool(id)} />
            ))}
          </div>
        </div>

        <aside className="browse-card">
          <h3>Browse all tools</h3>
          <div className="browse-tools">
            {browseItems.map((item) => (
              <button key={item.label} onClick={onOpenAllTools}>
                <Icon name={item.icon} size={17} strokeWidth={1.55} />
                {item.label}
              </button>
            ))}
          </div>
          <button className="browse-all" onClick={onOpenAllTools}>
            View everything
            <span><Icon name="chevron" size={17} /></span>
          </button>
        </aside>
      </section>

      <section className="studio-banner">
        <div className="mini-flow" aria-hidden="true">
          <StudioFlow />
          <span className="flow-caption flow-caption-left">NODE GRID</span>
          <span className="flow-caption flow-caption-center">120 BPM</span>
          <span className="flow-caption flow-caption-right">1:1</span>
        </div>
        <div className="studio-copy">
          <h3>Advanced Studio</h3>
          <p>Build any FFmpeg workflow visually</p>
        </div>
        <button className="secondary-button studio-button" onClick={onOpenStudio}>
          <Icon name="nodes" size={20} strokeWidth={1.55} />
          Open Studio
          <Icon name="chevron" size={17} />
        </button>
      </section>
    </div>
  );
}
