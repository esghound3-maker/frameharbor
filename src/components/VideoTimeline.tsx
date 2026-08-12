import { useEffect, useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type { MediaInfo } from "../types";
import { formatDuration } from "../utils";

const desktopRuntime =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

interface VideoTimelineProps {
  media: MediaInfo;
  currentTime: number;
  onSeek: (seconds: number) => void;
  rangeStart?: number;
  rangeEnd?: number;
  onRangeStartChange?: (seconds: number) => void;
  onRangeEndChange?: (seconds: number) => void;
}

export function VideoTimeline({
  media,
  currentTime,
  onSeek,
  rangeStart,
  rangeEnd,
  onRangeStartChange,
  onRangeEndChange,
}: VideoTimelineProps) {
  const [frames, setFrames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const activeHandle = useRef<"start" | "end" | null>(null);
  const duration = Math.max(0.001, media.durationSeconds || 0.001);
  const hasRange = rangeStart !== undefined && rangeEnd !== undefined;

  useEffect(() => {
    let cancelled = false;
    setFrames([]);
    if (!desktopRuntime || media.previewOnly || media.durationSeconds <= 0) return;
    setLoading(true);
    invoke<string[]>("timeline_thumbnails", {
      path: media.path,
      durationSeconds: media.durationSeconds,
      count: 8,
    })
      .then((paths) => {
        if (!cancelled) setFrames(paths.map((path) => convertFileSrc(path)));
      })
      .catch(() => {
        if (!cancelled) setFrames([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [media.durationSeconds, media.path, media.previewOnly]);

  const secondsAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const moveHandle = (clientX: number) => {
    const seconds = secondsAt(clientX);
    if (activeHandle.current === "start") onRangeStartChange?.(seconds);
    if (activeHandle.current === "end") onRangeEndChange?.(seconds);
  };

  const percent = (seconds: number) =>
    `${Math.max(0, Math.min(100, (seconds / duration) * 100))}%`;

  return (
    <div className="video-timeline">
      <div
        ref={trackRef}
        className={`timeline-track${loading ? " is-loading" : ""}`}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest(".timeline-handle")) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          onSeek(secondsAt(event.clientX));
        }}
        onPointerMove={(event) => {
          if (activeHandle.current) moveHandle(event.clientX);
          else if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            onSeek(secondsAt(event.clientX));
          }
        }}
        onPointerUp={() => {
          activeHandle.current = null;
        }}
      >
        <div className="timeline-frames" aria-hidden="true">
          {frames.length
            ? frames.map((frame, index) => <img src={frame} alt="" key={index} draggable={false} />)
            : Array.from({ length: 8 }, (_, index) => <i key={index} />)}
        </div>
        {hasRange && (
          <>
            <span className="timeline-mask timeline-mask-left" style={{ width: percent(rangeStart) }} />
            <span className="timeline-mask timeline-mask-right" style={{ left: percent(rangeEnd) }} />
            <button
              type="button"
              className="timeline-handle timeline-handle-start"
              style={{ left: percent(rangeStart) }}
              aria-label="Trim start"
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                activeHandle.current = "start";
              }}
            />
            <button
              type="button"
              className="timeline-handle timeline-handle-end"
              style={{ left: percent(rangeEnd) }}
              aria-label="Trim end"
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                activeHandle.current = "end";
              }}
            />
          </>
        )}
        <span className="timeline-playhead" style={{ left: percent(currentTime) }} aria-hidden="true" />
      </div>
      <div className="timeline-timecodes">
        <span>{formatDuration(currentTime)}</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  );
}
