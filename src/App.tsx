import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import "./App.css";
import { toolById } from "./data";
import type {
  AppSettings,
  EnvironmentStatus,
  JobFinished,
  JobProgress,
  JobRequest,
  JobStarted,
  MediaInfo,
  ProcessingJob,
  ToolId,
  ToolOptions,
  ViewId,
} from "./types";
import { Home } from "./components/Home";
import {
  AllToolsPage,
  BatchPage,
  InspectorPage,
  SettingsPage,
  StudioPage,
} from "./components/Pages";
import { Sidebar } from "./components/Sidebar";
import { ToolPanel } from "./components/ToolPanel";
import { Topbar } from "./components/Topbar";
import { Icon } from "./components/Icon";

const desktopRuntime =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const defaultEnvironment: EnvironmentStatus = {
  ffmpegAvailable: false,
  ffprobeAvailable: false,
  ffmpegVersion: null,
  hardwareEncoder: null,
  binarySource: null,
};

const defaultSettings: AppSettings = {
  outputDir: "",
  encoding: "auto",
  keepMetadata: true,
};

function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem("frameharbor-settings") ?? localStorage.getItem("vpt-settings");
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ??
    `frameharbor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function errorMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "Something went wrong while preparing this job.";
}

function App() {
  const [view, setView] = useState<ViewId>("home");
  const [search, setSearch] = useState("");
  const [media, setMedia] = useState<MediaInfo[]>([]);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [environment, setEnvironment] =
    useState<EnvironmentStatus>(defaultEnvironment);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [toast, setToast] = useState("");
  const [fileDragActive, setFileDragActive] = useState(false);
  const browserInput = useRef<HTMLInputElement>(null);
  const simulationTimers = useRef(new Map<string, number>());
  const startingJobs = useRef(new Set<string>());

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((current) => (current === message ? "" : current));
    }, 3200);
  }, []);

  useEffect(() => {
    localStorage.setItem("frameharbor-settings", JSON.stringify(settings));
    localStorage.removeItem("vpt-settings");
  }, [settings]);

  useEffect(() => {
    if (!desktopRuntime) return;
    invoke<EnvironmentStatus>("environment_status")
      .then(setEnvironment)
      .catch((error) => showToast(errorMessage(error)));
  }, [showToast]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>(".global-search input")?.focus();
      }
      if (event.key === "Escape") setActiveTool(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!desktopRuntime) return;
    const unlisten: Array<() => void> = [];
    let disposed = false;

    const connect = async () => {
      unlisten.push(
        await listen<JobProgress>("job-progress", ({ payload }) => {
          setJobs((current) =>
            current.map((job) =>
              job.id === payload.id
                ? {
                    ...job,
                    progress: payload.progress,
                    elapsedSeconds: payload.elapsedSeconds,
                    speed: payload.speed,
                    message: payload.message,
                  }
                : job,
            ),
          );
        }),
        await listen<JobFinished>("job-complete", ({ payload }) => {
          setJobs((current) =>
            current.map((job) =>
              job.id === payload.id
                ? {
                    ...job,
                    status: "complete",
                    progress: 100,
                    outputPath: payload.outputPath,
                    message: payload.message,
                  }
                : job,
            ),
          );
        }),
        await listen<JobFinished>("job-error", ({ payload }) => {
          setJobs((current) =>
            current.map((job) =>
              job.id === payload.id
                ? {
                    ...job,
                    status: "error",
                    message: "Processing failed",
                    error: payload.message,
                  }
                : job,
            ),
          );
        }),
        await listen<JobFinished>("job-cancelled", ({ payload }) => {
          setJobs((current) =>
            current.map((job) =>
              job.id === payload.id
                ? { ...job, status: "cancelled", message: payload.message }
                : job,
            ),
          );
        }),
      );
      if (disposed) unlisten.splice(0).forEach((stop) => stop());
    };

    connect();
    return () => {
      disposed = true;
      unlisten.splice(0).forEach((stop) => stop());
    };
  }, []);

  useEffect(() => {
    return () => {
      simulationTimers.current.forEach((timer) => window.clearInterval(timer));
    };
  }, []);

  const addPaths = useCallback(
    async (paths: string[]) => {
      const fresh = paths.filter((path) => !media.some((file) => file.path === path));
      if (!fresh.length) {
        showToast("Those files are already selected.");
        return;
      }
      const inspected = await Promise.all(
        fresh.map(async (path) => {
          try {
            return await invoke<MediaInfo>("inspect_media", { path });
          } catch (error) {
            showToast(errorMessage(error));
            return null;
          }
        }),
      );
      const valid = inspected.filter((file): file is MediaInfo => Boolean(file));
      setMedia((current) => [...current, ...valid]);
      if (valid.length) showToast(`${valid.length} ${valid.length === 1 ? "file" : "files"} ready.`);
    },
    [media, showToast],
  );

  useEffect(() => {
    if (!desktopRuntime) return;
    let disposed = false;
    let stop: (() => void) | undefined;

    getCurrentWindow()
      .onDragDropEvent(({ payload }) => {
        if (payload.type === "over") {
          setFileDragActive(true);
        } else if (payload.type === "drop") {
          setFileDragActive(false);
          void addPaths(payload.paths);
        } else {
          setFileDragActive(false);
        }
      })
      .then((unlisten) => {
        if (disposed) unlisten();
        else stop = unlisten;
      })
      .catch((error) => showToast(errorMessage(error)));

    return () => {
      disposed = true;
      stop?.();
    };
  }, [addPaths, showToast]);

  const addBrowserFiles = useCallback(
    (files: File[]) => {
      const additions: MediaInfo[] = files
        .filter((file) => !media.some((item) => item.name === file.name && item.sizeBytes === file.size))
        .map((file, index) => ({
          path: `preview://${Date.now()}-${index}/${file.name}`,
          name: file.name,
          sizeBytes: file.size,
          durationSeconds: 0,
          width: null,
          height: null,
          frameRate: null,
          videoCodec: null,
          audioCodec: null,
          audioChannels: null,
          bitRate: null,
          formatName: file.name.split(".").pop() ?? null,
          previewOnly: true,
        }));
      setMedia((current) => [...current, ...additions]);
      if (additions.length) showToast("Added to the interface preview.");
    },
    [media, showToast],
  );

  const chooseFiles = useCallback(async () => {
    if (!desktopRuntime) {
      browserInput.current?.click();
      return;
    }
    const selected = await open({
      multiple: true,
      directory: false,
      filters: [
        {
          name: "Video and audio",
          extensions: [
            "mp4", "mov", "mkv", "webm", "avi", "m4v", "mpeg", "mpg",
            "ts", "mts", "m2ts", "wmv", "flv", "mp3", "wav", "aac",
            "m4a", "flac", "ogg", "opus",
          ],
        },
      ],
    });
    const paths = typeof selected === "string" ? [selected] : selected ?? [];
    if (paths.length) await addPaths(paths);
  }, [addPaths]);

  const pickAuxiliary = useCallback(async (kind: "subtitle" | "image") => {
    if (!desktopRuntime) {
      return kind === "subtitle"
        ? "C:\\Preview\\captions.srt"
        : "C:\\Preview\\watermark.png";
    }
    const selected = await open({
      multiple: false,
      directory: false,
      filters: kind === "subtitle"
        ? [{ name: "Subtitles", extensions: ["srt", "ass", "ssa", "vtt"] }]
        : [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    return typeof selected === "string" ? selected : null;
  }, []);

  const chooseOutput = useCallback(async () => {
    if (!desktopRuntime) {
      setSettings((current) => ({ ...current, outputDir: "C:\\Videos\\FrameHarbor Exports" }));
      showToast("Preview output folder selected.");
      return;
    }
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      setSettings((current) => ({ ...current, outputDir: selected }));
    }
  }, [showToast]);

  const openTool = useCallback((tool: ToolId) => {
    setActiveTool(tool);
  }, []);

  const enqueue = useCallback(
    (tool: ToolId, options: ToolOptions) => {
      const definition = toolById(tool);
      const encoder =
        settings.encoding === "auto" && environment.hardwareEncoder
          ? environment.hardwareEncoder
          : "libx264";
      const targets = tool === "merge" ? [media[0]] : media;
      const newJobs: ProcessingJob[] = targets.map((file) => {
        const id = makeId();
        const request: JobRequest = {
          id,
          tool,
          inputPaths: tool === "merge" ? media.map((item) => item.path) : [file.path],
          outputDir: settings.outputDir || null,
          durationSeconds:
            tool === "merge"
              ? media.reduce((sum, item) => sum + item.durationSeconds, 0)
              : file.durationSeconds,
          mergeInputs:
            tool === "merge"
              ? media.map((item) => ({
                  width: item.width,
                  height: item.height,
                  frameRate: item.frameRate,
                  durationSeconds: item.durationSeconds,
                  hasAudio: Boolean(item.audioCodec),
                }))
              : undefined,
          options: {
            ...options,
            videoEncoder: encoder,
            keepMetadata: settings.keepMetadata,
          },
        };
        return {
          id,
          title: definition.title,
          sourceName: tool === "merge" ? `${media.length} clips` : file.name,
          tool,
          status: "queued",
          progress: 0,
          message: "Waiting in queue",
          elapsedSeconds: 0,
          request,
        };
      });
      setJobs((current) => [...current, ...newJobs]);
      setActiveTool(null);
      setView("batch");
      showToast(`${newJobs.length} ${newJobs.length === 1 ? "job" : "jobs"} added to the queue.`);
    },
    [
      environment.hardwareEncoder,
      media,
      settings.encoding,
      settings.keepMetadata,
      settings.outputDir,
      showToast,
    ],
  );

  const simulateJob = useCallback((job: ProcessingJob) => {
    let progress = 0;
    const timer = window.setInterval(() => {
      progress = Math.min(100, progress + 4 + Math.random() * 8);
      setJobs((current) =>
        current.map((item) =>
          item.id === job.id
            ? progress >= 100
              ? {
                  ...item,
                  status: "complete",
                  progress: 100,
                  message: "Preview export complete",
                  outputPath: `C:\\Preview\\${item.sourceName.replace(/\.[^.]+$/, "")}-processed.mp4`,
                }
              : {
                  ...item,
                  progress,
                  elapsedSeconds: item.elapsedSeconds + 0.35,
                  speed: "2.1x",
                  message: "Simulating local processing",
                }
            : item,
        ),
      );
      if (progress >= 100) {
        window.clearInterval(timer);
        simulationTimers.current.delete(job.id);
      }
    }, 260);
    simulationTimers.current.set(job.id, timer);
  }, []);

  useEffect(() => {
    if (jobs.some((job) => job.status === "processing")) return;
    const next = jobs.find((job) => job.status === "queued");
    if (!next || startingJobs.current.has(next.id)) return;

    startingJobs.current.add(next.id);
    setJobs((current) =>
      current.map((job) =>
        job.id === next.id
          ? { ...job, status: "processing", message: "Preparing FFmpeg" }
          : job,
      ),
    );

    if (!desktopRuntime) {
      startingJobs.current.delete(next.id);
      simulateJob(next);
      return;
    }

    invoke<JobStarted>("start_job", { request: next.request })
      .then((started) => {
        setJobs((current) =>
          current.map((job) =>
            job.id === next.id
              ? { ...job, outputPath: started.outputPath, message: "Processing locally" }
              : job,
          ),
        );
      })
      .catch((error) => {
        setJobs((current) =>
          current.map((job) =>
            job.id === next.id
              ? {
                  ...job,
                  status: "error",
                  message: "Could not start processing",
                  error: errorMessage(error),
                }
              : job,
          ),
        );
      })
      .finally(() => startingJobs.current.delete(next.id));
  }, [jobs, simulateJob]);

  const cancelJob = useCallback((id: string) => {
    const job = jobs.find((item) => item.id === id);
    if (!job) return;
    if (job.status === "queued") {
      setJobs((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: "cancelled", message: "Cancelled" } : item,
        ),
      );
      return;
    }
    if (!desktopRuntime) {
      const timer = simulationTimers.current.get(id);
      if (timer) window.clearInterval(timer);
      simulationTimers.current.delete(id);
      setJobs((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: "cancelled", message: "Cancelled" } : item,
        ),
      );
      return;
    }
    invoke("cancel_job", { id }).catch((error) => showToast(errorMessage(error)));
  }, [jobs, showToast]);

  const revealOutput = useCallback(
    async (path: string) => {
      if (!desktopRuntime) {
        showToast(`Preview output: ${path}`);
        return;
      }
      try {
        await revealItemInDir(path);
      } catch (error) {
        showToast(errorMessage(error));
      }
    },
    [showToast],
  );

  const renderPage = () => {
    switch (view) {
      case "tools":
        return <AllToolsPage query={search} onOpenTool={openTool} />;
      case "batch":
        return (
          <BatchPage
            jobs={jobs}
            onCancel={cancelJob}
            onReveal={revealOutput}
            onClearFinished={() =>
              setJobs((current) =>
                current.filter((job) => ["queued", "processing"].includes(job.status)),
              )
            }
            onGoHome={() => setView("home")}
          />
        );
      case "inspector":
        return (
          <InspectorPage
            media={media}
            onChooseFiles={chooseFiles}
            onRemoveFile={(path) =>
              setMedia((current) => current.filter((file) => file.path !== path))
            }
          />
        );
      case "studio":
        return <StudioPage onBack={() => setView("home")} />;
      case "settings":
        return (
          <SettingsPage
            settings={settings}
            environment={environment}
            previewMode={!desktopRuntime}
            onChooseOutput={chooseOutput}
            onUpdate={setSettings}
          />
        );
      default:
        return (
          <Home
            onChooseFiles={chooseFiles}
            onBrowserFiles={addBrowserFiles}
            fileDragActive={fileDragActive}
            onOpenTool={openTool}
            onOpenAllTools={() => setView("tools")}
            onOpenStudio={() => setView("studio")}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        active={view}
        onSelect={setView}
      />
      <main className="workspace">
        <Topbar
          view={view}
          search={search}
          onSearch={(value) => {
            setSearch(value);
            if (value && view !== "tools") setView("tools");
          }}
          onSelect={setView}
        />
        <div className="page-scroll">{renderPage()}</div>
      </main>

      <input
        ref={browserInput}
        className="visually-hidden"
        type="file"
        multiple
        accept="video/*,audio/*"
        onChange={(event) => {
          addBrowserFiles(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = "";
        }}
      />

      {activeTool && (
        <ToolPanel
          toolId={activeTool}
          media={media}
          onClose={() => setActiveTool(null)}
          onChooseFiles={chooseFiles}
          onPickAuxiliary={pickAuxiliary}
          onSubmit={(options) => enqueue(activeTool, options)}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
