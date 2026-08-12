import { FrameHarborMark, Icon } from "./Icon";
import type { IconName, ViewId } from "../types";

interface SidebarProps {
  active: ViewId;
  onSelect: (view: ViewId) => void;
}

const primary: Array<{ id: ViewId; label: string; icon: IconName; number: string }> = [
  { id: "home", label: "Home", icon: "home", number: "01" },
  { id: "tools", label: "All tools", icon: "grid", number: "02" },
  { id: "batch", label: "Batch", icon: "layers", number: "03" },
  { id: "inspector", label: "Inspector", icon: "search", number: "04" },
  { id: "studio", label: "Studio", icon: "nodes", number: "05" },
];

export function Sidebar({ active, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onSelect("home")} aria-label="FrameHarbor home">
        <FrameHarborMark size={72} />
        <span className="brand-name">FrameHarbor</span>
      </button>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {primary.map((item) => (
          <button
            key={item.id}
            data-number={item.number}
            className={active === item.id ? "nav-item active" : "nav-item"}
            onClick={() => onSelect(item.id)}
            aria-current={active === item.id ? "page" : undefined}
          >
            <Icon name={item.icon} size={20} strokeWidth={1.55} />
            <span>{item.label}</span>
          </button>
        ))}

        <span className="nav-divider" />
        <button
          data-number="06"
          className={active === "settings" ? "nav-item settings-item active" : "nav-item settings-item"}
          onClick={() => onSelect("settings")}
        >
          <Icon name="settings" size={21} strokeWidth={1.5} />
          <span>Settings</span>
        </button>
      </nav>

      <div className="privacy-card">
        <Icon name="shield" size={25} strokeWidth={1.5} />
        <span className="privacy-dot" />
        <span>
          <strong>100% local</strong>
          <small>Private &amp; secure</small>
        </span>
      </div>
    </aside>
  );
}
