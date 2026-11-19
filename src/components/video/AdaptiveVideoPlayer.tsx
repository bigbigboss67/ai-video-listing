'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Captions,
  Maximize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatDuration } from '@/lib/format';

interface AdaptiveVideoPlayerProps {
  videoId?: string;
  src: string;
  poster: string;
  title: string;
  durationSec?: number;
  captionsEnUrl?: string;
  captionsArUrl?: string;
  locale: string;
  autoPlay?: boolean;
  mutedDefault?: boolean;
  className?: string;
  onWatchTimeUpdate?: (seconds: number) => void;
}

export function AdaptiveVideoPlayer({
  videoId,
  src,
  poster,
  title,
  durationSec = 60,
  captionsEnUrl,
  captionsArUrl,
  locale,
  autoPlay = false,
  mutedDefault = true,
  className = '',
  onWatchTimeUpdate,
}: AdaptiveVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isSampleFallback, setIsSampleFallback] = useState(
    src.endsWith('/api/media/sample')
  );
  const [playing, setPlaying] = useState(autoPlay);
  const [muted, setMuted] = useState(mutedDefault);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [currentSec, setCurrentSec] = useState(0);
  const [totalSec, setTotalSec] = useState(durationSec);
  const viewLoggedRef = useRef(false);
  const lastPingSecRef = useRef(0);

  useEffect(() => {
    setIsSampleFallback(src.endsWith('/api/media/sample'));
    setCurrentSec(0);
    setTotalSec(durationSec);
    viewLoggedRef.current = false;
  }, [src, durationSec]);

  // Attach HLS.js for .m3u8 adaptive streams (Safari uses native HLS)
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || isSampleFallback) return;

    let hlsInstance: { destroy: () => void } | null = null;
    const isHls = src.includes('.m3u8');

    if (isHls && !videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      import('hls.js')
        .then(({ default: Hls }) => {
          if (Hls.isSupported() && videoRef.current) {
            const hls = new Hls({ startLevel: -1, capLevelToPlayerSize: true });
            hls.loadSource(src);
            hls.attachMedia(videoRef.current);
            hlsInstance = hls;
          }
        })
        .catch(() => {});
    } else {
      videoEl.src = src;
    }

    return () => {
      hlsInstance?.destroy();
    };
  }, [src, isSampleFallback]);

  // Sample showcase ticker for seeded listings without an external video file
  useEffect(() => {
    if (!isSampleFallback || !playing) return;
    const timer = window.setInterval(() => {
      setCurrentSec((prev) => {
        const next = prev + 1 >= totalSec ? 0 : prev + 1;
        onWatchTimeUpdate?.(next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isSampleFallback, playing, totalSec, onWatchTimeUpdate]);

  // Batched telemetry ping
  useEffect(() => {
    if (!videoId || !playing) return;
    if (!viewLoggedRef.current) {
      viewLoggedRef.current = true;
      fetch(`/api/videos/${videoId}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incrementView: true, deltaWatchSec: 1 }),
      }).catch(() => {});
    }
    if (currentSec - lastPingSecRef.current >= 10) {
      const delta = currentSec - lastPingSecRef.current;
      lastPingSecRef.current = currentSec;
      fetch(`/api/videos/${videoId}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incrementView: false, deltaWatchSec: delta }),
      }).catch(() => {});
    }
  }, [videoId, playing, currentSec]);

  const togglePlay = () => {
    if (isSampleFallback) {
      setPlaying((p) => !p);
      return;
    }
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
  };

  const handleFullscreen = () => {
    const el = videoRef.current?.parentElement;
    if (el && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  };

  const progressPct = totalSec > 0 ? Math.min(100, (currentSec / totalSec) * 100) : 0;

  return (
    <div
      className={`relative overflow-hidden rounded-[8px] bg-[#0D0F12] border border-[var(--border-subtle)] group ${className}`}
    >
      {isSampleFallback ? (
        <div className="relative aspect-video w-full overflow-hidden">
          <img
            src={poster}
            alt={title}
            className={`w-full h-full object-cover transition-transform duration-700 ${
              playing ? 'scale-105' : 'scale-100'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          {captionsOn && playing ? (
            <div
              role="status"
              className="absolute bottom-14 inset-x-6 text-center pointer-events-none"
            >
              <span className="inline-block px-3 py-1 rounded-[4px] bg-black/80 text-white text-xs sm:text-sm">
                {locale === 'ar'
                  ? `جولة مرئية موثقة: ${title}`
                  : `Verified Walkthrough: ${title}`}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <video
          ref={videoRef}
          poster={poster}
          playsInline
          muted={muted}
          autoPlay={autoPlay}
          controls={false}
          className="aspect-video w-full object-cover bg-black"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => {
            const secs = Math.floor(e.currentTarget.currentTime);
            setCurrentSec(secs);
            onWatchTimeUpdate?.(secs);
          }}
          onLoadedMetadata={(e) => {
            if (Number.isFinite(e.currentTarget.duration)) {
              setTotalSec(Math.round(e.currentTarget.duration));
            }
          }}
          onError={() => setIsSampleFallback(true)}
        >
          {captionsEnUrl ? (
            <track
              kind="captions"
              src={captionsEnUrl}
              srcLang="en"
              label="English"
              default={captionsOn && locale === 'en'}
            />
          ) : null}
          {captionsArUrl ? (
            <track
              kind="captions"
              src={captionsArUrl}
              srcLang="ar"
              label="العربية"
              default={captionsOn && locale === 'ar'}
            />
          ) : null}
        </video>
      )}

      {/* Center Play Trigger when paused */}
      {!playing ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={`Play ${title}`}
          className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-[#12151A]/85 border border-[#D4AF6A] text-white flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
        >
          <Play className="w-6 h-6 fill-current ms-0.5" />
        </button>
      ) : null}

      {/* Bottom Accessible Player Control Bar */}
      <div className="absolute bottom-0 inset-x-0 px-3 py-2.5 bg-gradient-to-t from-black/85 to-transparent flex flex-col gap-2">
        <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#D4AF6A] transition-all duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pause video' : 'Play video'}
              className="w-8 h-8 rounded-[4px] hover:bg-white/15 flex items-center justify-center cursor-pointer"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="w-8 h-8 rounded-[4px] hover:bg-white/15 flex items-center justify-center cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <span className="tabular-nums font-mono-code text-[11px] text-white/85 bidi-ltr">
              {formatDuration(currentSec)} / {formatDuration(totalSec)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCaptionsOn((c) => !c)}
              aria-label="Toggle captions"
              aria-pressed={captionsOn}
              className={`w-8 h-8 rounded-[4px] flex items-center justify-center cursor-pointer ${
                captionsOn ? 'bg-[#D4AF6A]/30 text-[#D4AF6A]' : 'hover:bg-white/15 text-white/75'
              }`}
            >
              <Captions className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleFullscreen}
              aria-label="Fullscreen video"
              className="w-8 h-8 rounded-[4px] hover:bg-white/15 flex items-center justify-center cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
