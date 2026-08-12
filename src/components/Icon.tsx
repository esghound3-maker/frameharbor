import type { IconName } from "../types";

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, strokeWidth = 1.8 }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return <svg {...common}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>;
    case "grid":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>;
    case "layers":
      return <svg {...common}><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
    case "nodes":
      return <svg {...common}><circle cx="5" cy="6" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="5" cy="18" r="2"/><path d="M7 6h4a4 4 0 0 1 4 4v0a4 4 0 0 0 4 4"/><path d="M7 18h4a4 4 0 0 0 4-4"/></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>;
    case "shield":
      return <svg {...common}><path d="M12 3 4.5 6v5.7c0 4.6 3 7.5 7.5 9.3 4.5-1.8 7.5-4.7 7.5-9.3V6L12 3Z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "upload":
      return <svg {...common}><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M20 15v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4"/></svg>;
    case "compress":
      return <svg {...common}><path d="M8 3v5H3"/><path d="m3 8 6-6"/><path d="M16 21v-5h5"/><path d="m21 16-6 6"/><rect x="7.5" y="7.5" width="9" height="9" rx="2"/></svg>;
    case "convert":
      return <svg {...common}><path d="M7 7h11l-3-3"/><path d="m18 7-3 3"/><path d="M17 17H6l3 3"/><path d="m6 17 3-3"/><rect x="4" y="3" width="4" height="8" rx="1"/><rect x="16" y="13" width="4" height="8" rx="1"/></svg>;
    case "cut":
      return <svg {...common}><circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="m8.6 8.5 11.4 7"/><path d="m8.6 15.5 11.4-7"/></svg>;
    case "captions":
      return <svg {...common}><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M9.5 10a3 3 0 1 0 0 4"/><path d="M17 10a3 3 0 1 0 0 4"/></svg>;
    case "merge":
      return <svg {...common}><path d="M4 5h4a4 4 0 0 1 4 4v6a4 4 0 0 0 4 4h4"/><path d="M4 19h4a4 4 0 0 0 4-4V9a4 4 0 0 1 4-4h4"/><path d="m17 2 3 3-3 3"/><path d="m17 16 3 3-3 3"/></svg>;
    case "resize":
      return <svg {...common}><path d="M8 3H3v5"/><path d="m3 3 6 6"/><path d="M16 21h5v-5"/><path d="m21 21-6-6"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>;
    case "audio":
      return <svg {...common}><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>;
    case "watermark":
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="2"/><path d="m4 17 5-5 4 4 2-2 5 4"/><path d="M17 6v5"/><path d="M14.5 8.5h5"/></svg>;
    case "image":
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="2"/><path d="m4 17 5-5 4 4 2-2 5 4"/></svg>;
    case "video":
      return <svg {...common}><rect x="4" y="3" width="16" height="18"/><path d="M4 8h16M4 16h16M8 3v5M16 3v5M8 16v5M16 16v5"/></svg>;
    case "broadcast":
      return <svg {...common}><circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13"/></svg>;
    case "palette":
      return <svg {...common}><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a1.5 1.5 0 0 1 0-3h3a6 6 0 0 0 6-6c0-3-4-5-9-5Z"/><circle cx="7.5" cy="10" r=".8" fill="currentColor"/><circle cx="10" cy="6.5" r=".8" fill="currentColor"/><circle cx="15" cy="7" r=".8" fill="currentColor"/></svg>;
    case "tag":
      return <svg {...common}><path d="M3 12V4h8l10 10-7 7L3 12Z"/><circle cx="8" cy="8" r="1.5"/></svg>;
    case "code":
      return <svg {...common}><path d="m8 5-6 7 6 7M16 5l6 7-6 7M14 3l-4 18"/></svg>;
    case "file":
      return <svg {...common}><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>;
    case "close":
      return <svg {...common}><path d="m6 6 12 12"/><path d="M18 6 6 18"/></svg>;
    case "chevron":
      return <svg {...common}><path d="m9 18 6-6-6-6"/></svg>;
    case "play":
      return <svg {...common} fill="currentColor" stroke="none"><path d="M8 5v14l11-7L8 5Z"/></svg>;
    case "folder":
      return <svg {...common}><path d="M3 6h6l2 2h10v11H3z"/></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
    case "warning":
      return <svg {...common}><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5"/><path d="M12 17h.01"/></svg>;
    case "sparkles":
      return <svg {...common}><path d="m12 2 1.2 3.8L17 7l-3.8 1.2L12 12l-1.2-3.8L7 7l3.8-1.2L12 2Z"/><path d="m19 13 .7 2.3L22 16l-2.3.7L19 19l-.7-2.3L16 16l2.3-.7L19 13Z"/><path d="m5 12 .8 2.2L8 15l-2.2.8L5 18l-.8-2.2L2 15l2.2-.8L5 12Z"/></svg>;
    case "trash":
      return <svg {...common}><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m6 7 1 14h10l1-14"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;
    case "external":
      return <svg {...common}><path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M18 13v6H5V6h6"/></svg>;
    default:
      return null;
  }
}

export function FrameHarborMark({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="mark-gradient" x1="9" y1="8" x2="41" y2="38">
          <stop stopColor="#043dd2" />
          <stop offset=".58" stopColor="#005ee0" />
          <stop offset="1" stopColor="#00a4c7" />
        </linearGradient>
      </defs>
      <path d="M13 9.7c0-4.2 4.6-6.7 8.2-4.5l21 13c3.4 2.1 3.4 7 0 9.1l-21 13c-3.6 2.2-8.2-.3-8.2-4.5V9.7Z" fill="url(#mark-gradient)" />
      <path d="M22 17v14l11-7-11-7Z" fill="#0d100f" />
    </svg>
  );
}
