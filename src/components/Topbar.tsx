import { getCurrentWindow } from "@tauri-apps/api/window";
import { Icon } from "./Icon";
import type { ViewId } from "../types";

const titles: Record<ViewId, string> = {
  home: "Create with video",
  tools: "All tools",
  batch: "Batch queue",
  inspector: "Media inspector",
  studio: "Advanced Studio",
  settings: "Settings",
};

interface TopbarProps {
  view: ViewId;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (view: ViewId) => void;
}

async function runWindowAction(action: "minimize" | "maximize" | "close") {
  const appWindow = getCurrentWindow();
  if (action === "minimize") await appWindow.minimize();
  if (action === "maximize") await appWindow.toggleMaximize();
  if (action === "close") await appWindow.close();
}

export function Topbar({ view, search, onSearch, onSelect }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="window-drag-strip" data-tauri-drag-region aria-hidden="true" />
      <div className="window-controls">
        <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => void runWindowAction("minimize")} aria-label="Minimize">
          <span className="window-minimize" />
        </button>
        <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => void runWindowAction("maximize")} aria-label="Maximize or restore">
          <span className="window-maximize" />
        </button>
        <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => void runWindowAction("close")} aria-label="Close">
          <span className="window-close" />
        </button>
      </div>

      <div className="page-title">
        <h1>{titles[view]}</h1>
      </div>

      <label className="global-search">
        <Icon name="search" size={18} strokeWidth={1.55} />
        <input
          value={search}
          onChange={(event) => onSearch(event.currentTarget.value)}
          placeholder="Search any video or audio tool"
          aria-label="Search tools"
        />
        <kbd>Ctrl K</kbd>
      </label>

      <div className="mode-switch" aria-label="Workspace mode">
        <button
          className={view !== "studio" ? "selected" : ""}
          onClick={() => onSelect("home")}
        >
          <Icon name="sparkles" size={16} strokeWidth={1.55} />
          Simple
        </button>
        <button
          className={view === "studio" ? "selected" : ""}
          onClick={() => onSelect("studio")}
        >
          <Icon name="nodes" size={17} strokeWidth={1.55} />
          Studio
        </button>
      </div>
    </header>
  );
}
