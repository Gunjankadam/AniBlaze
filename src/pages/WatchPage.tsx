import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Hls from "hls.js";
import shaka from "shaka-player";
shaka.polyfill.installAll(); // Install once globally
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAnimeById } from "@/services/anilist";
import type { RelatedEntry, AnimeMedia } from "@/services/anilist";
import {
  getStreamingServers,
  getEpisodeList,
  checkServerHealth,
  getSubtitleUrl,
  type StreamingServer,
  type EpisodeInfo,
} from "@/services/streaming";
import { fetchComments, postComment, type EpisodeComment } from "@/services/comments";
import { useAuth } from "@/hooks/useAuth";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Server,
  Loader2,
  AlertCircle,
  Terminal,
  Wifi,
  WifiOff,
  List,
  X,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Rewind,
  FastForward,
  Clock,
  Tv2,
  Film,
  Captions,
} from "lucide-react";

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function fmtTime(s: number) {
  if (!isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// ─────────────────────────────────────────
// Custom Premium Loader
// ─────────────────────────────────────────
function CustomLoader({ text, size = "md" }: { text?: string, size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-8 h-8 border-2",
    md: "w-12 h-12 border-2",
    lg: "w-16 h-16 border-2"
  };
  const s = sizes[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
      <div className={`relative ${s.split(" ")[0]} ${s.split(" ")[1]}`}>
        {/* Outer ring */}
        <div className={`absolute inset-0 rounded-full border-primary/20 ${s.split(" ")[2]}`} />
        {/* Spinning ring */}
        <div className={`absolute inset-0 rounded-full border-transparent border-t-primary animate-spin ${s.split(" ")[2]}`} />
        {/* Pulsing core */}
        <div className="absolute inset-2 rounded-full bg-primary/10 animate-pulse shadow-[0_0_15px_rgba(var(--primary),0.2)]" />
      </div>
      {text && (
        <p className="text-sm font-medium text-muted-foreground tracking-wide animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Custom Video Player
// ─────────────────────────────────────────
interface VideoPlayerProps {
  server: StreamingServer | null;
  title: string;
  externalSubtitleUrl?: string; // Fallback from our backend
}

function VideoPlayer({ server, title, externalSubtitleUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [skipAnim, setSkipAnim] = useState<null | "back" | "forward">(null);
  const [subtitlesOn, setSubtitlesOn] = useState(true); // ON by default
  const [captionSize, setCaptionSize] = useState<"sm" | "md" | "lg">("md");

  // ── English Track Manager (High Precision)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const manageTracks = () => {
      const tracks = Array.from(video.textTracks);
      if (tracks.length === 0) return;

      // 1. Filter English candidates (Clean & Precise)
      const englishTracks = tracks.filter(t => {
        const lbl = (t.label || "").toLowerCase().trim();
        const lng = (t.language || "").toLowerCase();
        return lbl.includes("en") || lbl.includes("eng") || lbl.includes("fansub") || lng.startsWith("en");
      });

      // 2. Identify the winner based on CUE availability
      let winner = englishTracks.find(t => {
        const lbl = (t.label || "").toLowerCase();
        // Strongly prefer Fansubs if they have data
        const isFansub = lbl.includes("fansub");
        return isFansub && (t.cues && t.cues.length > 0);
      });

      if (!winner) {
        winner = englishTracks.find(t => {
          const lbl = (t.label || "").toLowerCase();
          return (lbl.includes("english") || lbl.includes("en")) && !lbl.includes("forced") && (t.cues && t.cues.length > 0);
        });
      }

      // Fallback 1: Any English track with cues
      if (!winner) {
        winner = englishTracks.find(t => t.cues && t.cues.length > 0);
      }

      // Fallback 2: The very first English track (if everything is still loading/0 cues)
      if (!winner) {
        winner = englishTracks.find(t => !(t.label || "").toLowerCase().includes("forced")) || englishTracks[0];
      }

      // 3. Force state: Only winner gets 'showing', everything else 'disabled'
      tracks.forEach(t => {
        if (subtitlesOn && t === winner) {
          if (t.mode !== "showing") t.mode = "showing";
        } else {
          if (t.mode !== "disabled") t.mode = "disabled";
        }
      });

      // 4. Trace & FAILOVER Logic
      if (winner && subtitlesOn) {
        const cueCount = winner.cues?.length || 0;
        console.log(`[Subtitles] Active: "${winner.label}" (${cueCount} cues)`);

        // If we picked a winner with 0 cues but another English track has cues, RE-RUN
        if (cueCount === 0) {
          const alternative = englishTracks.find(t => t.cues && t.cues.length > 0);
          if (alternative) {
            console.warn(`[Subtitles] "${winner.label}" is empty. Failing over to "${alternative.label}"...`);
            manageTracks(); // Recursive call once to pick the alternative
          }
        }
      }
    };

    // Events to trigger management
    video.textTracks.onaddtrack = manageTracks;
    video.addEventListener("loadedmetadata", manageTracks);
    video.addEventListener("play", manageTracks);
    video.addEventListener("playing", manageTracks);

    // Initial check + Heartbeat for late-loading VTT cues
    manageTracks();
    const heartbeat = setInterval(manageTracks, 1500);

    return () => {
      if (video.textTracks) video.textTracks.onaddtrack = null;
      video.removeEventListener("loadedmetadata", manageTracks);
      video.removeEventListener("play", manageTracks);
      video.removeEventListener("playing", manageTracks);
      clearInterval(heartbeat);
    };
  }, [subtitlesOn, server, externalSubtitleUrl]);

  // ── Load source
  useEffect(() => {
    if (!server || server.type === "iframe" || !videoRef.current) return;
    const video = videoRef.current;

    // Cleanup previous state
    video.pause();
    video.removeAttribute("src");
    video.load();
    setIsLoading(true);

    let hls: Hls | null = null;

    // One-shot autoplay guard: fires play() only once after data is ready
    let played = false;
    const safePlay = () => {
      if (played) return;
      played = true;
      video.play().catch((err) => {
        if (err?.name === "NotAllowedError") {
          console.warn("[Player] Unmuted autoplay blocked. Attempting muted...");
          video.muted = true;
          video.play().catch((e) => {
            if (e?.name !== "AbortError") console.warn("[Player] Muted autoplay failed", e);
          });
        } else if (err?.name !== "AbortError") {
          console.error("[Player] play() failed:", err);
        }
      });
    };
    video.addEventListener("canplay", safePlay, { once: true });

    const isHls = server.type === "hls";

    if (isHls && server.provider === "animepahe") {
      // Use Shaka Player exclusively for AnimePahe HLS to avoid Hls.js 'reload issue'
      console.log("[Shaka] Attempting to initialize for AnimePahe...");
      if (shaka.Player.isBrowserSupported()) {
        try {
          console.log("[Shaka] Browser supported. Creating player instance...");
          const player = new shaka.Player(video);
          
          // Optimize for HLS & Kwik (AnimePahe) streams to prevent stalling/reloads
          player.configure({
            streaming: {
              rebufferingGoal: 10,
              bufferingGoal: 60,
              retryParameters: {
                maxAttempts: 4,
                baseDelay: 1000,
                backoffFactor: 2,
              },
            },
            manifest: {
              retryParameters: {
                maxAttempts: 4,
                baseDelay: 1000,
                backoffFactor: 2,
              }
            }
          });

          setIsLoading(true);
          console.log("[Shaka] Loading manifest:", server.url);
          player.load(server.url)
            .then(() => {
              console.log("[Shaka] Manifest loaded successfully");
              video.playbackRate = speed;
              setIsLoading(false); // Force clear spinner on load
              safePlay();
            })
            .catch((err: any) => {
              console.error("[Shaka] load error", err);
              setIsLoading(false);
            });

          return () => {
            player.destroy();
            video.removeEventListener("canplay", safePlay);
            played = true;
            video.pause();
          };
        } catch (err) {
          console.error("[Shaka] init error", err);
          setIsLoading(false);
        }
      } else {
        console.error("[Shaka] Browser not supported or Shaka not found");
        setIsLoading(false);
      }
      return;
    }

    if (isHls) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 120,       // buffer 2 mins ahead
          maxMaxBufferLength: 600,    // allow up to 10 mins buffer  
          renderTextTracksNatively: true,
          highBufferWatchdogPeriod: 2,
          fragLoadingMaxRetry: 6,
          manifestLoadingMaxRetry: 4
        });
        hls.loadSource(server.url);
        hls.attachMedia(video);

        // Core Hls.js logic for subtitle selection
        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
          if (!subtitlesOn) {
            hls.subtitleTrack = -1;
            return;
          }
          const tracks = data.subtitleTracks;
          // Find internal English track
          const englishIndex = tracks.findIndex(t =>
            (t.name || t.lang || "").toLowerCase().includes("en")
          );
          if (englishIndex !== -1 && hls.subtitleTrack !== englishIndex) {
            hls.subtitleTrack = englishIndex;
            console.log("[HLS] Locked Backup Internal Track:", tracks[englishIndex].name);
          }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.playbackRate = speed;
          safePlay(); // Start playing as soon as manifest is ready
        });
        const recovery = { count: 0, last: 0 };
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            const now = Date.now();
            console.warn(`[HLS] Fatal ${data.type} (${data.details}). MIME: ${data.mimeType || "unknown"}`);

            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              if (now - recovery.last < 3000) {
                if (recovery.count > 2) {
                  console.error("[HLS] Recovery loop detected. Falling back to native player.");
                  hls?.destroy();
                  return;
                }
              } else {
                recovery.count = 0; // Reset if it's been long enough
              }

              if (data.details === "bufferAddCodecError") {
                console.log("[HLS] Swapping Audio Codec to fix fMP4...");
                hls?.swapAudioCodec();
              }

              console.log("[HLS] Attempting Recovery...");
              recovery.last = now;
              recovery.count++;
              hls?.recoverMediaError();
            } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls?.startLoad();
            } else {
              hls?.destroy();
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = server.url;
        video.playbackRate = speed;
      }
    } else {
      // Standard MP4
      video.src = server.url;
      video.playbackRate = speed;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      video.removeEventListener("canplay", safePlay);
      played = true; // Prevent any pending safePlay from firing after cleanup
      video.pause();
    };
  }, [server, speed]);

  // ── Sync video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0)
        setBuffered(video.buffered.end(video.buffered.length - 1));
    };
    const onDuration = () => setDuration(video.duration);
    const onFullChange = () => setFullscreen(!!document.fullscreenElement);
    const onWaiting = () => setIsLoading(true);
    const onStalled = () => setIsLoading(true);
    const onLoaded = () => setIsLoading(false);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause); // NOTE: pause does NOT clear spinner — video may still be buffering
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onStalled);
    video.addEventListener("canplay", onLoaded);
    video.addEventListener("playing", onLoaded);
    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("seeked", onLoaded);
    document.addEventListener("fullscreenchange", onFullChange);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("stalled", onStalled);
      video.removeEventListener("canplay", onLoaded);
      video.removeEventListener("playing", onLoaded);
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("seeked", onLoaded);
      document.removeEventListener("fullscreenchange", onFullChange);
    };
  }, []);

  // ── Auto-hide controls
  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, 3000);
  }, []);

  // ── Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const video = videoRef.current;
      if (!video) return;
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          video.currentTime = Math.min(video.currentTime + 10, video.duration);
          setSkipAnim("forward"); setTimeout(() => setSkipAnim(null), 600);
          showControls();
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime = Math.max(video.currentTime - 10, 0);
          setSkipAnim("back"); setTimeout(() => setSkipAnim(null), 600);
          showControls();
          break;
        case "ArrowUp":
          e.preventDefault();
          video.volume = Math.min(video.volume + 0.1, 1);
          setVolume(video.volume);
          showControls();
          break;
        case "ArrowDown":
          e.preventDefault();
          video.volume = Math.max(video.volume - 0.1, 0);
          setVolume(video.volume);
          showControls();
          break;
        case " ":
        case "k":
          e.preventDefault();
          togglePlay(); // Safe: handles AbortError internally
          break;
        case "m":
          e.preventDefault();
          video.muted = !video.muted;
          setMuted(video.muted);
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showControls]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    showControls();

    if (!video.paused) {
      // Straightforward: just pause
      video.pause();
      return;
    }

    // If the video doesn't have enough data yet, wait for it
    if (video.readyState < 3) { // HAVE_FUTURE_DATA
      setIsLoading(true);
      video.addEventListener("canplay", async () => {
        try { await video.play(); } catch { /* AbortError: ignore */ }
      }, { once: true });
      return;
    }

    // Video is ready — play now
    try {
      await video.play();
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("[Player] Playback Error:", err);
      }
    }
  };

  const skip = (sec: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + sec, video.duration));
    setSkipAnim(sec > 0 ? "forward" : "back");
    setTimeout(() => setSkipAnim(null), 600);
    showControls();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    video.currentTime = ratio * video.duration;
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; }
    setVolume(v);
    setMuted(v === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen();
    else document.exitFullscreen();
  };

  const applySpeed = (s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
    setShowSettings(false);
  };

  // ── No server selected
  if (!server) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground bg-black/40">
        <Play className="h-16 w-16 opacity-30" />
        <p className="text-sm">Select a server to start watching</p>
      </div>
    );
  }

  // ── Iframe fallback
  if (server.type === "iframe") {
    return (
      <iframe
        key={server.url}
        src={server.url}
        className="w-full h-full border-0"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        title={title}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    );
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden select-none caption-size-${captionSize}`}
      onMouseMove={showControls}
      onMouseLeave={() => { if (playing) setControlsVisible(false); }}
      onClick={togglePlay}
    >
      {/* Video */}
      <video ref={videoRef} className="w-full h-full object-contain" playsInline preload="auto" crossOrigin="anonymous">
        {/* 1. Provider Internal Tracks */}
        {server?.subtitles?.map((sub, i) => (
          <track
            key={`provider-sub-${i}-${sub.url}`}
            kind="subtitles"
            src={sub.url}
            srcLang={sub.lang.slice(0, 2).toLowerCase() || "en"}
            label={sub.lang || `Track ${i + 1}`}
          />
        ))}

        {/* 2. Scraper External Fansubs */}
        {externalSubtitleUrl && (
          <track
            key={`fansub-external-${externalSubtitleUrl}`}
            kind="subtitles"
            src={externalSubtitleUrl}
            srcLang="en"
            label="English (Fansubs)"
          />
        )}
      </video>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 pointer-events-none">
          <CustomLoader size="lg" text="Loading..." />
        </div>
      )}

      {/* Skip flash — left */}
      {skipAnim === "back" && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-center animate-ping-once">
          <div className="flex flex-col items-center gap-1 bg-black/30 rounded-2xl px-5 py-3 backdrop-blur-sm">
            <Rewind className="h-8 w-8 text-white" />
            <span className="text-white text-xs font-semibold tracking-wider">- 10 sec</span>
          </div>
        </div>
      )}

      {/* Skip flash — right */}
      {skipAnim === "forward" && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-center animate-ping-once">
          <div className="flex flex-col items-center gap-1 bg-black/30 rounded-2xl px-5 py-3 backdrop-blur-sm">
            <FastForward className="h-8 w-8 text-white" />
            <span className="text-white text-xs font-semibold tracking-wider">+ 10 sec</span>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-500 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative px-5 pb-4 flex flex-col gap-3">

          {/* Top row: title + time */}
          <div className="flex items-end justify-between">
            <span className="text-white/90 text-sm font-medium truncate max-w-[70%] drop-shadow">{title}</span>
            <span className="text-white/50 text-xs tabular-nums font-mono shrink-0">
              {fmtTime(currentTime)} / {fmtTime(duration)}
            </span>
          </div>

          {/* Progress bar */}
          <div
            ref={progressRef}
            className="group/bar relative h-1 hover:h-2.5 transition-all duration-150 rounded-full bg-white/15 cursor-pointer"
            onClick={seek}
          >
            {/* Buffer */}
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/20" style={{ width: `${bufferedPct}%` }} />
            {/* Progress */}
            <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${progress}%` }} />
            {/* Thumb — appears on hover */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white shadow opacity-0 group-hover/bar:opacity-100 transition-opacity"
              style={{ left: `${progress}%` }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between gap-3">

            {/* Left cluster: play + skip */}
            <div className="flex items-center gap-1">
              {/* Skip back */}
              <button
                onClick={() => skip(-10)}
                title="Rewind 10s (←)"
                className="group/btn flex items-center justify-center w-9 h-9 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <Rewind className="h-4 w-4" />
              </button>

              {/* Play / Pause — bigger, prominent */}
              <button
                onClick={togglePlay}
                title={playing ? "Pause (Space)" : "Play (Space)"}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-black hover:scale-110 transition-transform shadow-lg"
              >
                {playing
                  ? <Pause className="h-5 w-5 fill-black" />
                  : <Play className="h-5 w-5 fill-black ml-0.5" />
                }
              </button>

              {/* Skip forward */}
              <button
                onClick={() => skip(10)}
                title="Skip 10s (→)"
                className="flex items-center justify-center w-9 h-9 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <FastForward className="h-4 w-4" />
              </button>
            </div>

            {/* Right cluster: volume + speed pill + settings + fullscreen */}
            <div className="flex items-center gap-1">

              {/* Volume */}
              <div className="flex items-center gap-1 group/vol">
                <button
                  onClick={toggleMute}
                  title="Mute (M)"
                  className="flex items-center justify-center w-9 h-9 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                  {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={muted ? 0 : volume}
                  onChange={changeVolume}
                  title="Volume (↑↓)"
                  className="w-20 h-1 accent-primary cursor-pointer rounded-full opacity-70 hover:opacity-100 transition-opacity"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--primary)) ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(muted ? 0 : volume) * 100}%)`
                  }}
                />
              </div>

              {/* Speed pill — shown when not 1x */}
              {speed !== 1 && (
                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/30">
                  {speed}x
                </span>
              )}

              {/* CC / Subtitle toggle — only shown when subtitles available */}
              {(externalSubtitleUrl || (server?.subtitles && server.subtitles.length > 0)) && (
                <button
                  onClick={() => setSubtitlesOn(v => !v)}
                  title={subtitlesOn ? "Subtitles ON (click to hide)" : "Subtitles OFF (click to show)"}
                  className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${subtitlesOn
                    ? "text-primary bg-primary/20 border border-primary/40"
                    : "text-white/50 hover:text-white hover:bg-white/10"
                    }`}
                >
                  <Captions className="h-4 w-4" />
                </button>
              )}

              {/* Settings */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(s => !s)}
                  title="Settings"
                  className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${showSettings ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                >
                  <Settings className={`h-4 w-4 transition-transform duration-300 ${showSettings ? "rotate-45" : ""}`} />
                </button>

                {showSettings && (
                  <div className="absolute bottom-11 right-0 w-56 bg-gray-950/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden z-50">
                    {/* Speed section */}
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Playback Speed</p>
                      <div className="grid grid-cols-4 gap-1">
                        {SPEEDS.map(s => (
                          <button
                            key={s}
                            onClick={() => applySpeed(s)}
                            className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${speed === s ? "bg-primary text-black shadow-lg shadow-primary/30" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
                          >
                            {s === 1 ? "1×" : `${s}×`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-4 my-2 border-t border-white/10" />

                    {/* Captions section */}
                    <div className="px-4 pb-3">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5">Captions</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-white/50">Caption size</span>
                        <div className="inline-flex items-center gap-1 bg-white/5 rounded-full px-1 py-0.5">
                          {(["sm", "md", "lg"] as const).map(size => (
                            <button
                              key={size}
                              onClick={() => setCaptionSize(size)}
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                                captionSize === size
                                  ? "bg-primary text-black shadow shadow-primary/40"
                                  : "text-white/60 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              {size === "sm" ? "0.9×" : size === "md" ? "1.0×" : "1.4×"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                title="Fullscreen (F)"
                className="flex items-center justify-center w-9 h-9 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



// ─────────────────────────────────────────
// No Servers Found State
// ─────────────────────────────────────────
function NoServersState() {
  return (
    <div className="w-full h-full flex items-center justify-center p-6 bg-black/40">
      <p className="font-semibold text-foreground">No servers available</p>
    </div>
  );
}

// ─────────────────────────────────────────
// Provider Badge
// ─────────────────────────────────────────
function ProviderBadge({ provider }: { provider?: string }) {
  const colors: Record<string, string> = {
    hianime: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    gogoanime: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    animepahe: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    animekai: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    fallback: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  const labels: Record<string, string> = {
    hianime: "HiAnime",
    gogoanime: "GogoAnime",
    animepahe: "A-SERVER",
    animekai: "B-SERVER",
    fallback: "Fallback",
  };
  const key = provider?.toLowerCase() || "fallback";
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${colors[key] || colors.fallback}`}
    >
      {labels[key] || provider}
    </span>
  );
}

// ─────────────────────────────────────────
// Related Series Dropdown
// ─────────────────────────────────────────

const RELATION_ORDER: Record<string, number> = {
  PREQUEL: 0, PARENT: 1, SEQUEL: 2, SIDE_STORY: 3, SPIN_OFF: 4, ALTERNATIVE: 5, OTHER: 6,
};
const RELATION_LABELS: Record<string, string> = {
  PREQUEL: "Prequel", PARENT: "Parent", SEQUEL: "Sequel",
  SIDE_STORY: "Side Story", SPIN_OFF: "Spin-off", ALTERNATIVE: "Alternative", OTHER: "Related",
};
const FORMAT_ICON: Record<string, React.ReactNode> = {
  MOVIE: <Film className="h-3 w-3" />,
  OVA: <Tv2 className="h-3 w-3" />,
  ONA: <Tv2 className="h-3 w-3" />,
  SPECIAL: <Tv2 className="h-3 w-3" />,
};

function RelatedSeriesDropdown({
  relations, currentId, currentAnime
}: {
  relations: AnimeMedia["relations"];
  currentId: number;
  currentAnime?: AnimeMedia | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Flatten deep relations (AniList query returns up to 2 levels deep)
  const flattenedMap = new Map<number, { relationType: string, node: RelatedEntry }>();

  const processEdges = (edges: Array<{ relationType: string, node: RelatedEntry }>, inheritType?: string) => {
    edges.forEach(e => {
      // Keep relevant types or inherit from parent if going deeper
      const type = ["PREQUEL", "SEQUEL", "SIDE_STORY", "SPIN_OFF", "ALTERNATIVE", "PARENT"].includes(e.relationType)
        ? e.relationType
        : (inheritType || "OTHER");

      if (e.node.id === currentId) return;

      // Only add meaningful video formats (exclude manga/music)
      const validFormats = ["TV", "MOVIE", "OVA", "ONA", "SPECIAL"];
      if (!flattenedMap.has(e.node.id) && validFormats.includes(e.node.format || "TV")) {
        // 🛡️ RELEVANCY FILTER: Skip loose 'OTHER' relations that don't share title keywords.
        // This removes unrelated crossovers like 'Dragon Ball' listed in 'One Piece' or 'Heroes of the Game'.
        if (type === "OTHER") {
          const root = ((currentAnime?.title.english || "") + " " + (currentAnime?.title.romaji || "")).toLowerCase();
          const target = ((e.node.title.english || "") + " " + (e.node.title.romaji || "")).toLowerCase();
          const getWords = (s: string) => s.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3 && !["season", "movie", "special", "series", "part"].includes(w));
          const rWords = getWords(root);
          const fWords = rWords.length > 0 ? rWords : root.split(/\s+/).filter(w => w.length > 2);
          const isRelated = fWords.some(w => target.includes(w));
          if (fWords.length > 0 && !isRelated) return;
        }

        flattenedMap.set(e.node.id, { relationType: type, node: e.node });
      }

      // Recursively process nested relations
      if (e.node.relations?.edges) {
        processEdges(e.node.relations.edges as any, type);
      }
    });
  };

  if (relations?.edges) {
    processEdges(relations.edges as any);
  }

  const relevant = Array.from(flattenedMap.values())
    .sort((a, b) => {
      // Primary sort: release year (natural watch order)
      if (a.node.seasonYear !== b.node.seasonYear) {
        return (a.node.seasonYear ?? Infinity) - (b.node.seasonYear ?? Infinity);
      }
      // Secondary sort: relation importance
      const ao = RELATION_ORDER[a.relationType] ?? 99;
      const bo = RELATION_ORDER[b.relationType] ?? 99;
      return ao - bo;
    });

  if (!relevant.length && !currentAnime) return null;

  const formatLabel = (format: string | null) => {
    if (format === "MOVIE") return "Movie";
    if (format === "OVA") return "OVA";
    if (format === "ONA") return "ONA";
    if (format === "SPECIAL") return "Special";
    return "TV";
  };

  const totalCount = 1 + relevant.length; // current + related

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-card text-sm transition-all
          ${open
            ? "text-primary border-primary/40 bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:border-primary/30"
          }`}
        title="Related seasons & movies"
      >
        <Tv2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Seasons</span>
        <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
          {totalCount}
        </span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[260px] rounded-xl glass-card border border-white/10 shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 border-b border-white/5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Related Seasons & Movies</p>
          </div>
          <div className="py-1 max-h-72 overflow-y-auto">
            {/* Current anime — always at top with 'Now Watching' badge */}
            {currentAnime && (
              <Link
                key={currentId}
                to={`/watch/${currentId}/1`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 bg-primary/15 border-b border-white/5"
              >
                <div className="w-8 h-10 rounded overflow-hidden flex-shrink-0 bg-white/5">
                  <img src={currentAnime.coverImage.large} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-primary">
                    {currentAnime.title.english || currentAnime.title.romaji}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      {FORMAT_ICON[currentAnime.format ?? ""] ?? <Tv2 className="h-3 w-3" />}
                      {formatLabel(currentAnime.format)}
                    </span>
                    {currentAnime.seasonYear && <span className="text-[10px] text-muted-foreground">· {currentAnime.seasonYear}</span>}
                    {currentAnime.episodes && <span className="text-[10px] text-muted-foreground">· {currentAnime.episodes} ep</span>}
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded text-primary bg-primary/20 border border-primary/30">
                      Now Watching
                    </span>
                  </div>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              </Link>
            )}
            {/* Related entries */}
            {relevant.map(({ relationType, node }) => {
              const displayTitle = node.title.english || node.title.romaji;
              return (
                <Link
                  key={node.id}
                  to={`/watch/${node.id}/1`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 transition-all group hover:bg-primary/5"
                >
                  <div className="w-8 h-10 rounded overflow-hidden flex-shrink-0 bg-white/5">
                    {node.coverImage?.large ? (
                      <img src={node.coverImage.large} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Tv2 className="h-3 w-3 text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground/90 group-hover:text-foreground transition-colors">
                      {displayTitle}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        {FORMAT_ICON[node.format ?? ""] ?? <Tv2 className="h-3 w-3" />}
                        {formatLabel(node.format)}
                      </span>
                      {node.seasonYear && <span className="text-[10px] text-muted-foreground">· {node.seasonYear}</span>}
                      {node.episodes && <span className="text-[10px] text-muted-foreground">· {node.episodes} ep</span>}
                      <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded
                        ${relationType === "SEQUEL" ? "text-blue-400 bg-blue-500/10" :
                          relationType === "PREQUEL" || relationType === "PARENT" ? "text-amber-400 bg-amber-500/10" :
                            "text-muted-foreground bg-white/5"}`}>
                        {RELATION_LABELS[relationType] ?? relationType}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Airing Countdown Banner
// ─────────────────────────────────────────
interface AiringCountdownProps {
  nextAiring: { airingAt: number; episode: number };
  episodeCount: number;
  lastEp?: number;
  lastAbs?: number | null;
}

function AiringCountdown({ nextAiring, episodeCount, lastEp = 0, lastAbs }: AiringCountdownProps) {
  const [countdown, setCountdown] = useState(() => Math.max(0, nextAiring.airingAt * 1000 - Date.now()));

  useEffect(() => {
    const t = setInterval(() => setCountdown(Math.max(0, nextAiring.airingAt * 1000 - Date.now())), 1000);
    return () => clearInterval(t);
  }, [nextAiring.airingAt]);

  const totalSecs = Math.floor(countdown / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  const airingDate = new Date(nextAiring.airingAt * 1000);
  const weekMs = 7 * 24 * 3600 * 1000;
  const progress = Math.min(100, Math.max(0, 100 - (countdown / weekMs) * 100));

  // Determine if there are missing episodes
  // If next airing absolute is 10 but we only have 7, gap is 2
  const gap = lastAbs ? (nextAiring.episode - lastAbs - 1) : (lastEp ? nextAiring.episode - lastEp - 1 : 0);

  return (
    <div className="mb-6 overflow-hidden rounded-xl glass-card border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-4 p-4 flex-wrap sm:flex-nowrap">
        <div className="h-12 w-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
          <Clock className="h-6 w-6 text-primary animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">
              Episode <span className="text-primary font-bold text-base">{nextAiring.episode}</span>
            </p>
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/30">
              Upcoming Airing
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">
            Airs {airingDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} at {airingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>

          {gap > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-400 font-medium">
              <AlertCircle className="h-3 w-3" />
              <span>Episodes {lastEp + 1} to {nextAiring.episode - 1} are currently missing or yet to be uploaded.</span>
            </div>
          )}
        </div>

        {/* Countdown blocks */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {([{ v: d, l: 'd' }, { v: h, l: 'h' }, { v: m, l: 'm' }, { v: s, l: 's' }] as const).map(({ v, l }) => (
            <div key={l} className="flex flex-col items-center">
              <div className="bg-background/60 border border-white/10 rounded-md px-2 py-1 min-w-[36px] text-center">
                <span className="text-sm font-bold font-mono text-primary tabular-nums">{pad(v)}</span>
              </div>
              <span className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wide">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar (fills as air date approaches) */}
      <div className="h-0.5 bg-white/5 w-full">
        <div className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-1000" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Episode Grid
// ─────────────────────────────────────────
interface EpisodeGridProps {
  episodes: EpisodeInfo[];
  currentEp: number;
  animeId: number;
  onClose?: () => void;
}

function EpisodeGrid({ episodes, currentEp, animeId, onClose }: EpisodeGridProps) {
  const currentRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentEp]);

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5 max-h-64 overflow-y-auto rounded-lg p-1 scrollbar-thin">
      {episodes.map((ep, idx) => {
        const isActive = ep.number === currentEp;
        return (
          <Link
            key={`ep-grid-${ep.number}-${idx}`}
            ref={isActive ? (currentRef as React.Ref<HTMLAnchorElement>) : null}
            to={`/watch/${animeId}/${ep.number}`}
            onClick={onClose}
            title={ep.title}
            className={`p-2 rounded-md text-center text-xs font-medium transition-all
              ${isActive
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105"
                : "glass-card text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/10"
              }`}
          >
            {ep.number}
          </Link>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────
// Main WatchPage
// ─────────────────────────────────────────
const WatchPage = () => {
  const { id, episode } = useParams<{ id: string; episode: string }>();
  const animeId = Number(id);
  const ep = Number(episode);

  const [activeServer, setActiveServer] = useState(0);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const { addToHistory } = useWatchHistory();
  const { user } = useAuth();

  // Save to history
  useEffect(() => {
    if (animeId && ep) addToHistory(animeId, ep);
  }, [animeId, ep, addToHistory]);

  // Reset active server on episode change
  useEffect(() => {
    setActiveServer(0);
  }, [animeId, ep]);

  // Check scraper server health
  useEffect(() => {
    checkServerHealth().then(setServerOnline);
    const interval = setInterval(() => {
      checkServerHealth().then(setServerOnline);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch anime metadata from AniList
  const { data: anime } = useQuery({
    queryKey: ["anime", animeId],
    queryFn: () => getAnimeById(animeId),
    enabled: !!animeId,
  });

  // Fetch episode list from scraper
  const { data: episodesData, isLoading: episodesLoading } = useQuery({
    queryKey: ["episodes", animeId],
    queryFn: () => getEpisodeList(animeId, anime?.episodes || undefined),
    enabled: !!animeId,
  });

  const episodes = episodesData?.episodes || [];
  const nextAiring = episodesData?.nextAiring;

  // Fetch streaming servers from scraper
  const { data: servers = [], isLoading: serversLoading } = useQuery({
    queryKey: ["servers", animeId, ep],
    queryFn: () => getStreamingServers(animeId, ep),
    enabled: !!animeId && !!ep,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const title = anime ? (anime.title.english || anime.title.romaji) : "Loading...";
  const episodeCount = anime?.episodes || episodes.length || 24;
  const currentServer = servers[activeServer] || null;

  const prevEp = ep > 1 ? ep - 1 : null;
  // Cap nextEp to the last episode we actually have, not AniList's total count
  const lastAvailableEp = episodes.length > 0 ? Math.max(...episodes.map(e => e.number)) : episodeCount;
  const nextEp = ep < lastAvailableEp ? ep + 1 : null;

  // Comments
  const queryClient = useQueryClient();
  const { data: comments = [] } = useQuery<EpisodeComment[]>({
    queryKey: ["comments", animeId, ep],
    queryFn: () => fetchComments(animeId, ep),
    enabled: !!animeId && !!ep,
    staleTime: 30 * 1000,
  });

  const [commentText, setCommentText] = useState("");

  const commentMutation = useMutation({
    mutationFn: (text: string) => {
      if (!user) throw new Error("Not signed in");
      return postComment(animeId, ep, {
        userId: user.id,
        email: user.email,
        text,
      });
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["comments", animeId, ep] });
    },
  });

  return (
    <div className="min-h-screen pt-16 bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">

        {/* Top nav */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to={`/anime/${animeId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group"
          >
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to {title}
          </Link>

          {/* Server status indicator */}
          <div className="flex items-center gap-2">
            {serverOnline === null ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking server…
              </span>
            ) : serverOnline ? (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <Wifi className="h-3.5 w-3.5" />
                Server online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-amber-400">
                <WifiOff className="h-3.5 w-3.5" />
                Server offline
              </span>
            )}
          </div>
        </div>

        {/* Next Episode Airing Banner */}
        {nextAiring ? (
          <AiringCountdown
            nextAiring={nextAiring}
            episodeCount={episodeCount}
            lastEp={episodes.length > 0 ? Math.max(...episodes.map(e => e.number)) : 0}
            lastAbs={episodesData?.lastAbsolute}
          />
        ) : episodes.length > 0 && (
          <div className="mb-6 p-3 rounded-xl glass-card border border-green-500/20 bg-green-500/5 flex items-center gap-3 animate-in fade-in duration-500">
            <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <List className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                All <span className="text-green-400 font-bold">{episodes.length}</span> episodes available
              </p>
              <p className="text-xs text-muted-foreground">This series has finished airing — enjoy the full run!</p>
            </div>
          </div>
        )}

        {/* Title + Episode nav */}
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">
            {title}
            <span className="ml-2 text-primary">· Ep {ep}</span>
          </h1>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Related seasons/movies dropdown */}
            <RelatedSeriesDropdown relations={anime?.relations} currentId={animeId} currentAnime={anime} />


            {prevEp && (
              <Link
                to={`/watch/${animeId}/${prevEp}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg glass-card text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                <SkipBack className="h-3.5 w-3.5" />
                Prev
              </Link>
            )}
            {nextEp && (
              <Link
                to={`/watch/${animeId}/${nextEp}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg glass-card text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                Next
                <SkipForward className="h-3.5 w-3.5" />
              </Link>
            )}
            <button
              onClick={() => setShowEpisodes(!showEpisodes)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg glass-card text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            >
              <List className="h-3.5 w-3.5" />
              Episodes
            </button>
          </div>
        </div>


        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* Video player + server selector + comments */}
          <div className="space-y-4">

            {/* Video player */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden glass-card border border-white/10 shadow-2xl shadow-black/50">
              {serversLoading ? (
                <div className="w-full h-full flex items-center justify-center bg-black/60">
                  <CustomLoader text="Loading..." size="lg" />
                </div>
              ) : servers.length === 0 ? (
                <NoServersState />
              ) : (
                <VideoPlayer
                  server={currentServer}
                  title={`${title} - Episode ${ep}`}
                  externalSubtitleUrl={getSubtitleUrl(animeId, ep)}
                />
              )}

              {/* Episode indicator overlay */}
              <div className="absolute top-3 left-3 z-10 pointer-events-none">
                <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-xs font-semibold text-white/80 border border-white/10">
                  Episode {ep}
                </span>
              </div>
            </div>

            {/* Server selector */}
            {servers.length > 0 && (
              <div className="glass-card rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Server className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Streaming Servers</h3>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {servers.length} server{servers.length !== 1 ? "s" : ""} found
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {servers.map((server, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveServer(i)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${activeServer === i
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                        : "glass-card text-muted-foreground hover:text-foreground hover:border-primary/30 border-transparent"
                        }`}
                    >
                      <span>{server.name}</span>
                      {server.provider && <ProviderBadge provider={server.provider} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Episode grid (collapsible on mobile, inline on desktop) */}
            {showEpisodes && (
              <div className="glass-card rounded-xl p-4 border border-white/10 lg:hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Episodes</h3>
                  <button onClick={() => setShowEpisodes(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {episodesLoading ? (
                  <div className="flex justify-center py-6">
                    <CustomLoader size="sm" />
                  </div>
                ) : (
                  <EpisodeGrid
                    episodes={episodes}
                    currentEp={ep}
                    animeId={animeId}
                    onClose={() => setShowEpisodes(false)}
                  />
                )}
              </div>
            )}

            {/* Comments */}
            <div className="glass-card rounded-xl p-4 border border-white/10 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Comments</h3>

              {user ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const text = commentText.trim();
                    if (!text) return;
                    commentMutation.mutate(text);
                  }}
                  className="space-y-2"
                >
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your thoughts about this episode..."
                    className="w-full min-h-[70px] rounded-lg bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      Commenting as <span className="font-medium">{user.email}</span>
                    </span>
                    <button
                      type="submit"
                      disabled={commentMutation.isPending}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {commentMutation.isPending ? "Posting..." : "Post"}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-xs text-muted-foreground">
                  <Link to="/auth" className="text-primary hover:underline font-medium">Sign in</Link> to comment on this episode.
                </p>
              )}

              <div className="mt-2 space-y-3 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                {comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No comments yet. Be the first to start the discussion.</p>
                ) : (
                  comments.map((c) => {
                    const initial = c.email?.[0]?.toUpperCase() ?? "";
                    return (
                      <div key={c.id} className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-full bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">
                              {c.email}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap break-words">
                            {c.text}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Episode list (desktop) */}
          <div className="hidden lg:block">
            <div className="glass-card rounded-xl p-4 border border-white/10 sticky top-20">
              <div className="flex items-center gap-2 mb-4">
                <List className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Episodes</h3>
                <span className="ml-auto text-xs text-muted-foreground">
                  {episodes.length || episodeCount} total
                </span>
              </div>

              {episodesLoading ? (
                <div className="flex justify-center py-8">
                  <CustomLoader text="Loading episodes..." />
                </div>
              ) : (
                <div className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1 scrollbar-thin">
                  {episodes.map((epInfo, idx) => {
                    const isActive = epInfo.number === ep;
                    return (
                      <Link
                        key={`ep-side-${epInfo.number}-${idx}`}
                        to={`/watch/${animeId}/${epInfo.number}`}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                          }`}
                      >
                        <span
                          className={`text-xs font-mono w-7 text-center rounded ${isActive ? "text-primary-foreground/80" : "text-primary"
                            }`}
                        >
                          {epInfo.number}
                        </span>
                        <span className="truncate flex-1" title={epInfo.title}>
                          {epInfo.title}
                        </span>
                        {isActive && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
