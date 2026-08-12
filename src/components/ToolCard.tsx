import { Icon } from "./Icon";
import type { ToolDefinition, ToolId } from "../types";

interface ToolCardProps {
  tool: ToolDefinition;
  compact?: boolean;
  onClick: () => void;
}

const cardNumbers: Partial<Record<ToolId, string>> = {
  compress: "01",
  convert: "02",
  trim: "03",
  subtitles: "04",
};

function ToolArtwork({ id }: { id: ToolId }) {
  switch (id) {
    case "compress":
      return (
        <svg viewBox="0 0 120 92" role="presentation">
          <path d="M21 14h78v17H21zM21 61h78v17H21z" fill="#0346c4" />
          <path d="M60 28v36" stroke="#111312" strokeWidth="3" />
          <g fill="#ece9df" stroke="#111312" strokeWidth="1.5">
            <circle cx="60" cy="32" r="4" /><circle cx="60" cy="41" r="4" />
            <circle cx="60" cy="50" r="4" /><circle cx="60" cy="59" r="4" />
          </g>
          <path d="M8 46h25m-7-7 7 7-7 7M112 46H87m7-7-7 7 7 7" fill="none" stroke="#111312" strokeWidth="3" />
        </svg>
      );
    case "convert":
      return (
        <svg viewBox="0 0 120 92" role="presentation">
          <path d="M34 9h49l20 20v55H34z" fill="#f4f0e8" stroke="#111312" strokeWidth="2" />
          <path d="M83 9v20h20" fill="#064bd0" stroke="#111312" strokeWidth="2" />
          <path d="m58 37 26 15-26 16z" fill="#111312" />
          <g fill="#111312">
            <circle cx="21" cy="42" r="1.7" /><circle cx="21" cy="52" r="1.7" /><circle cx="21" cy="62" r="1.7" />
            <circle cx="11" cy="47" r="1.7" /><circle cx="11" cy="57" r="1.7" /><circle cx="11" cy="67" r="1.7" />
          </g>
        </svg>
      );
    case "trim":
      return (
        <svg viewBox="0 0 120 92" role="presentation">
          <path d="M5 26h45v31H5zM70 26h45v31H70z" fill="#064bc8" stroke="#111312" strokeWidth="2" />
          <g fill="#eeeae1">
            <path d="M9 30h7v5H9zm12 0h7v5h-7zm12 0h7v5h-7zm12 0h3v5h-3zM9 48h7v5H9zm12 0h7v5h-7zm12 0h7v5h-7zm12 0h3v5h-3z" />
            <path d="M74 30h7v5h-7zm12 0h7v5h-7zm12 0h7v5h-7zm12 0h3v5h-3zM74 48h7v5h-7zm12 0h7v5h-7zm12 0h7v5h-7zm12 0h3v5h-3z" />
          </g>
          <path d="M60 11v70M54 56l6 8 6-8M54 72l6-8 6 8" fill="none" stroke="#ef4023" strokeWidth="3" />
        </svg>
      );
    case "subtitles":
      return (
        <svg viewBox="0 0 120 92" role="presentation">
          <path d="M25 11h69v49H67L54 72V60H25z" fill="#111312" />
          <text x="36" y="45" fill="#f4f0e8" fontFamily="Arial, sans-serif" fontSize="27" fontWeight="700">CC</text>
          <path d="M66 66h40M66 75h40M66 84h30" stroke="#064bc8" strokeWidth="5" />
        </svg>
      );
    default:
      return null;
  }
}

export function ToolCard({ tool, compact = false, onClick }: ToolCardProps) {
  if (compact) {
    return (
      <button className="tool-card compact" onClick={onClick}>
        <span className={`tool-icon ${tool.tone}`}>
          <Icon name={tool.icon} size={19} />
        </span>
        <span className="tool-copy">
          <strong>{tool.title}</strong>
          <small>{tool.shortDescription}</small>
        </span>
        <span className="tool-arrow"><Icon name="chevron" size={15} /></span>
      </button>
    );
  }

  return (
    <button className={`tool-card reference-card ${tool.id}`} onClick={onClick}>
      <span className="tool-number">{cardNumbers[tool.id]}</span>
      <span className="tool-art"><ToolArtwork id={tool.id} /></span>
      <span className="tool-copy">
        <strong>{tool.title}</strong>
        <small>{tool.shortDescription}</small>
      </span>
      <span className="tool-arrow"><Icon name="chevron" size={16} strokeWidth={1.65} /></span>
    </button>
  );
}
