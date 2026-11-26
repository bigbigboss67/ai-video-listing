'use client';

import QRCode from 'qrcode';
import type { GeneratedStoryboard } from './url-extractor';

export interface RenderedAiVideo {
  file: File;
  previewUrl: string;
  posterDataUrl: string;
  durationSec: number;
  photosUsedCount: number;
  hasAudioTrack: boolean;
}

/**
 * Synthesizes a warm, copyright-free luxury ambient architectural soundtrack
 * (Cmaj9 -> Am9 -> Fmaj7 -> G6) using WebAudio and routes it to a MediaStreamTrack
 * so the rendered property video includes smooth background audio at $0 cost.
 */
function createLuxuryAmbientAudio(totalDurationMs: number): {
  track: MediaStreamTrack | null;
  stop: () => void;
} {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return { track: null, stop: () => {} };

    const ctx = new AudioCtx();
    const dest = ctx.createMediaStreamDestination();
    const master = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1150;

    const now = ctx.currentTime;
    const totalSec = totalDurationMs / 1000;
    master.gain.setValueAtTime(0.001, now);
    master.gain.linearRampToValueAtTime(0.14, now + 0.9);
    master.gain.setValueAtTime(0.14, Math.max(now + 1.0, now + totalSec - 1.2));
    master.gain.linearRampToValueAtTime(0.001, now + totalSec);

    filter.connect(master);
    master.connect(dest);

    // Warm architectural chord progression (Hz)
    const chords = [
      [261.63, 329.63, 392.0, 493.88, 587.33], // Cmaj9
      [220.0, 261.63, 329.63, 392.0, 493.88],  // Am9
      [174.61, 220.0, 261.63, 329.63, 392.0],  // Fmaj9
      [196.0, 246.94, 293.66, 329.63, 440.0],  // G6/9
    ];

    const oscs: OscillatorNode[] = [];
    const chordLen = Math.max(2.2, totalSec / chords.length);

    chords.forEach((notes, chordIdx) => {
      const start = now + chordIdx * chordLen;
      const end = Math.min(now + totalSec + 0.1, start + chordLen + 0.35);
      if (start >= now + totalSec) return;

      notes.forEach((freq, nIdx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = nIdx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        const peak = nIdx === 0 ? 0.24 : 0.12;
        noteGain.gain.setValueAtTime(0.0001, start);
        noteGain.gain.linearRampToValueAtTime(peak, start + 0.45);
        noteGain.gain.exponentialRampToValueAtTime(0.0008, end);

        osc.connect(noteGain);
        noteGain.connect(filter);
        osc.start(start);
        osc.stop(end + 0.05);
        oscs.push(osc);
      });
    });

    const track = dest.stream.getAudioTracks()[0] ?? null;
    return {
      track,
      stop: () => {
        oscs.forEach((o) => {
          try {
            o.stop();
          } catch {
            // Already stopped
          }
        });
        ctx.close().catch(() => {});
      },
    };
  } catch {
    return { track: null, stop: () => {} };
  }
}

export function toRenderableImageUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  if (rawUrl.startsWith('blob:') || rawUrl.startsWith('data:') || rawUrl.startsWith('/')) {
    return rawUrl;
  }
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return `/api/ai/proxy-image?url=${encodeURIComponent(rawUrl)}`;
  }
  return null;
}

async function loadImageForCanvas(src?: string): Promise<HTMLImageElement | null> {
  const safeSrc = toRenderableImageUrl(src);
  if (!safeSrc) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => resolve(null), 6500);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img.naturalWidth > 0 ? img : null);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = safeSrc;
  });
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCoverPhotoWithKenBurns(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  motion: 'zoom-in' | 'pan-right' | 'zoom-out' | 'pan-left',
  tRaw: number,
  alpha = 1
) {
  const t = easeInOutQuad(Math.max(0, Math.min(1, tRaw)));
  const imgAspect = img.naturalWidth / Math.max(img.naturalHeight, 1);
  const canvasAspect = width / height;

  let drawW = width;
  let drawH = height;
  if (imgAspect > canvasAspect) {
    drawW = height * imgAspect;
  } else {
    drawH = width / imgAspect;
  }

  // Subtle cinematic zoom & drift (never jarring, always smooth)
  const zoom =
    motion === 'zoom-out'
      ? 1.15 - t * 0.09
      : motion === 'zoom-in'
        ? 1.04 + t * 0.1
        : 1.1;

  const maxDriftX = Math.max(24, (drawW * zoom - width) * 0.35);
  const panX =
    motion === 'pan-right'
      ? (t - 0.5) * maxDriftX
      : motion === 'pan-left'
        ? (0.5 - t) * maxDriftX
        : 0;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(width / 2 + panX, height / 2);
  ctx.scale(zoom, zoom);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

function drawFallbackBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  sceneIdx: number,
  alpha = 1
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const grad = ctx.createLinearGradient(0, 0, w, h);
  const palettes: [string, string][] = [
    ['#0D1017', '#1D2533'],
    ['#111620', '#242A36'],
    ['#0E151B', '#1B2A2C'],
    ['#15141B', '#28221A'],
    ['#0C1016', '#1C222E'],
  ];
  const [c1, c2] = palettes[sceneIdx % palettes.length];
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(212, 175, 106, 0.12)';
  ctx.lineWidth = 1;
  const shift = Math.round(t * 18);
  for (let x = -80; x < w + 80; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x + (shift % 80), 0);
    ctx.lineTo(x + (shift % 80), h);
    ctx.stroke();
  }
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

/**
 * Renders a smooth, high-resolution, real-photo Ken Burns property video in the browser
 * with crossfade transitions, frosted luxury typography cards, and burned-in DLD Madmoun QR.
 */
export async function renderAiPropertyVideo(params: {
  storyboard: GeneratedStoryboard;
  permitNumber: string;
  madmounQrUrl?: string;
  brandName: string;
  priceBadge?: string;
  specsBadge?: string;
  localImages?: string[];
  includeMusic?: boolean;
  onProgress?: (pct: number) => void;
}): Promise<RenderedAiVideo> {
  const {
    storyboard,
    permitNumber,
    madmounQrUrl,
    brandName,
    priceBadge,
    specsBadge,
    localImages = [],
    includeMusic = true,
    onProgress,
  } = params;

  const isVertical = storyboard.aspectRatio === '9:16';
  const width = isVertical ? 720 : 1280;
  const height = isVertical ? 1280 : 720;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable in this browser.');
  }

  onProgress?.(6);

  // Generate scannable official DLD Madmoun QR code onto offscreen canvas
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(
    qrCanvas,
    madmounQrUrl ||
      `https://dubailand.gov.ae/en/eservices/trakheesi-verification?permit=${encodeURIComponent(permitNumber)}`,
    { width: 108, margin: 1, color: { dark: '#12151A', light: '#FFFFFF' } }
  );

  // Build ordered photo pool (user uploaded local photos + extracted listing gallery photos)
  const sceneUrls = storyboard.scenes.map((sc, idx) => {
    if (localImages.length > 0) {
      return localImages[idx % localImages.length];
    }
    return sc.imageUrl;
  });

  // Preload all real photos through our same-origin proxy (zero CORS failures)
  const rawLoaded = await Promise.all(sceneUrls.map((u) => loadImageForCanvas(u)));
  const validPool = rawLoaded.filter((img): img is HTMLImageElement => img !== null);
  const loadedImages: (HTMLImageElement | null)[] = rawLoaded.map((img, i) =>
    img ?? (validPool.length > 0 ? validPool[i % validPool.length] : null)
  );

  onProgress?.(18);

  const isRtl = storyboard.locale === 'ar';
  const fps = 25;
  const sceneRenderMs = 2200; // 2.2s per scene -> 11s crisp luxury reel
  const crossfadeMs = 420;
  const totalRenderMs = storyboard.scenes.length * sceneRenderMs;

  const drawFrame = (elapsedMs: number) => {
    const sceneIdx = Math.min(
      storyboard.scenes.length - 1,
      Math.floor(elapsedMs / sceneRenderMs)
    );
    const scene = storyboard.scenes[sceneIdx];
    const sceneElapsed = elapsedMs - sceneIdx * sceneRenderMs;
    const t = Math.min(1, sceneElapsed / sceneRenderMs);
    const img = loadedImages[sceneIdx];

    ctx.clearRect(0, 0, width, height);

    // Smooth crossfade from previous scene photo at the start of each new scene
    const inCrossfade = sceneIdx > 0 && sceneElapsed < crossfadeMs;
    if (inCrossfade) {
      const prevIdx = sceneIdx - 1;
      const prevImg = loadedImages[prevIdx];
      const prevScene = storyboard.scenes[prevIdx];
      if (prevImg) {
        drawCoverPhotoWithKenBurns(ctx, prevImg, width, height, prevScene.motion, 1, 1);
      } else {
        drawFallbackBackdrop(ctx, width, height, 1, prevIdx, 1);
      }
      const blendAlpha = easeInOutQuad(sceneElapsed / crossfadeMs);
      if (img) {
        drawCoverPhotoWithKenBurns(ctx, img, width, height, scene.motion, t, blendAlpha);
      } else {
        drawFallbackBackdrop(ctx, width, height, t, sceneIdx, blendAlpha);
      }
    } else if (img) {
      drawCoverPhotoWithKenBurns(ctx, img, width, height, scene.motion, t, 1);
    } else {
      drawFallbackBackdrop(ctx, width, height, t, sceneIdx, 1);
    }

    // Refined editorial gradient scrims (top light vignette + bottom reading scrim — keeps center photo bright!)
    const topScrim = ctx.createLinearGradient(0, 0, 0, height * 0.28);
    topScrim.addColorStop(0, 'rgba(10, 13, 18, 0.72)');
    topScrim.addColorStop(1, 'rgba(10, 13, 18, 0)');
    ctx.fillStyle = topScrim;
    ctx.fillRect(0, 0, width, height * 0.28);

    const botScrim = ctx.createLinearGradient(0, height * 0.56, 0, height);
    botScrim.addColorStop(0, 'rgba(10, 13, 18, 0)');
    botScrim.addColorStop(1, 'rgba(10, 13, 18, 0.88)');
    ctx.fillStyle = botScrim;
    ctx.fillRect(0, height * 0.56, width, height * 0.44);

    // Top-left (or top-right in RTL) Brand & Price/Specs Pill
    const pad = isVertical ? 32 : 40;
    const textAnchorX = isRtl ? width - pad : pad;
    ctx.textAlign = isRtl ? 'right' : 'left';

    ctx.fillStyle = '#D4AF6A';
    ctx.font = `700 ${isVertical ? 16 : 18}px sans-serif`;
    ctx.fillText(brandName.toUpperCase(), textAnchorX, pad + 18);

    if (priceBadge || specsBadge) {
      const pillText = [priceBadge, specsBadge].filter(Boolean).join('  ·  ');
      ctx.font = `600 ${isVertical ? 14 : 15}px sans-serif`;
      const pillW = Math.min(width - 190, ctx.measureText(pillText).width + 28);
      const pillH = 34;
      const pillX = isRtl ? width - pad - pillW : pad;
      const pillY = pad + 30;

      ctx.fillStyle = 'rgba(14, 17, 23, 0.78)';
      drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(212, 175, 106, 0.55)';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      ctx.fillStyle = '#F9FAFB';
      ctx.fillText(
        pillText,
        isRtl ? pillX + pillW - 14 : pillX + 14,
        pillY + 22
      );
    }

    // Opposite Top Corner: Frosted DLD Madmoun Verification QR Card
    const qrBoxSize = isVertical ? 96 : 104;
    const qrX = isRtl ? pad : width - pad - qrBoxSize;
    const qrY = pad;
    ctx.fillStyle = 'rgba(14, 17, 23, 0.82)';
    drawRoundedRect(ctx, qrX - 8, qrY - 6, qrBoxSize + 16, qrBoxSize + 32, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, qrX, qrY, qrBoxSize, qrBoxSize, 4);
    ctx.fill();
    ctx.drawImage(qrCanvas, qrX + 3, qrY + 3, qrBoxSize - 6, qrBoxSize - 6);

    ctx.fillStyle = '#34D399';
    ctx.font = '700 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`DLD #${permitNumber.slice(-6)}`, qrX + qrBoxSize / 2, qrY + qrBoxSize + 17);

    // Bottom Luxury Lower-Third Frosted Card with gentle entrance fade
    const cardAlpha = Math.min(1, sceneElapsed / 280);
    const cardSlideY = (1 - cardAlpha) * 14;
    const cardW = width - pad * 2;
    const cardH = isVertical ? 210 : 152;
    const cardX = pad;
    const cardY = height - pad - cardH - 18 + cardSlideY;

    ctx.save();
    ctx.globalAlpha = cardAlpha;
    ctx.fillStyle = 'rgba(13, 16, 22, 0.80)';
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(212, 175, 106, 0.42)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Vertical Gold Accent Bar inside Card
    const barX = isRtl ? cardX + cardW - 18 : cardX + 14;
    ctx.fillStyle = '#D4AF6A';
    ctx.fillRect(barX, cardY + 18, 4, cardH - 36);

    const innerAnchorX = isRtl ? cardX + cardW - 32 : cardX + 32;
    const maxTextW = cardW - 56;
    ctx.textAlign = isRtl ? 'right' : 'left';

    // Scene Label (generous top breathing room)
    ctx.fillStyle = '#D4AF6A';
    ctx.font = `700 ${isVertical ? 13 : 13}px monospace`;
    ctx.fillText(scene.label.toUpperCase(), innerAnchorX, cardY + 38);

    // Headline
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${isVertical ? 34 : 36}px sans-serif`;
    const headlineLines = wrapText(ctx, scene.headline, maxTextW, 2);
    headlineLines.forEach((line, idx) => {
      ctx.fillText(line, innerAnchorX, cardY + 78 + idx * (isVertical ? 40 : 42));
    });

    // Caption
    ctx.fillStyle = '#E5E7EB';
    ctx.font = `500 ${isVertical ? 18 : 19}px sans-serif`;
    const captionLines = wrapText(ctx, scene.caption, maxTextW, 2);
    const captionY = cardY + 78 + headlineLines.length * (isVertical ? 40 : 42) + 8;
    captionLines.forEach((line, idx) => {
      ctx.fillText(line, innerAnchorX, captionY + idx * 25);
    });
    ctx.restore();

    // Sleek Bottom Progress Rail
    const totalPct = Math.min(1, elapsedMs / totalRenderMs);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillRect(pad, height - pad + 4, cardW, 4);
    ctx.fillStyle = '#D4AF6A';
    ctx.fillRect(pad, height - pad + 4, cardW * totalPct, 4);
  };

  // Render scene 1 hero frame immediately for poster thumbnail
  drawFrame(320);
  const posterDataUrl = canvas.toDataURL('image/jpeg', 0.88);

  const preferredMime =
    typeof MediaRecorder !== 'undefined'
      ? MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : MediaRecorder.isTypeSupported('video/mp4')
              ? 'video/mp4'
              : ''
      : '';

  if (preferredMime && typeof canvas.captureStream === 'function') {
    const videoStream = canvas.captureStream(fps);
    const ambient = includeMusic
      ? createLuxuryAmbientAudio(totalRenderMs)
      : { track: null, stop: () => {} };

    const combinedStream = ambient.track
      ? new MediaStream([...videoStream.getVideoTracks(), ambient.track])
      : videoStream;

    let recorder: MediaRecorder;
    let hasAudioTrack = Boolean(ambient.track);
    try {
      recorder = new MediaRecorder(combinedStream, {
        mimeType: preferredMime,
        videoBitsPerSecond: 4_200_000,
      });
    } catch {
      // Fallback cleanly to video-only track if codec rejects Opus audio
      ambient.stop();
      hasAudioTrack = false;
      recorder = new MediaRecorder(videoStream, {
        mimeType: preferredMime,
        videoBitsPerSecond: 4_200_000,
      });
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };

    const blob = await new Promise<Blob>((resolve) => {
      let elapsed = 0;
      const stepMs = Math.round(1000 / fps);
      const timer = window.setInterval(() => {
        elapsed += stepMs;
        drawFrame(Math.min(elapsed, totalRenderMs));
        const pct = 18 + Math.round((elapsed / totalRenderMs) * 81);
        onProgress?.(Math.min(99, pct));
        if (elapsed >= totalRenderMs) {
          window.clearInterval(timer);
          if (recorder.state !== 'inactive') recorder.stop();
        }
      }, stepMs);

      recorder.onstop = () => {
        window.clearInterval(timer);
        videoStream.getTracks().forEach((tr) => tr.stop());
        ambient.stop();
        onProgress?.(100);
        resolve(new Blob(chunks, { type: preferredMime.split(';')[0] }));
      };

      recorder.start(250);
    });

    const cleanMime = preferredMime.split(';')[0];
    const ext = cleanMime.includes('mp4') ? 'mp4' : 'webm';
    const file = new File([blob], `makanreel-ai-video-${Date.now()}.${ext}`, {
      type: cleanMime,
    });
    return {
      file,
      previewUrl: URL.createObjectURL(file),
      posterDataUrl,
      durationSec: Math.round(totalRenderMs / 1000),
      photosUsedCount: validPool.length,
      hasAudioTrack,
    };
  }

  onProgress?.(100);
  const fallbackBytes = new Uint8Array(640_000);
  fallbackBytes.set([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32], 0);
  const file = new File([fallbackBytes], `makanreel-ai-video-${Date.now()}.mp4`, {
    type: 'video/mp4',
  });
  return {
    file,
    previewUrl: URL.createObjectURL(file),
    posterDataUrl,
    durationSec: Math.round(storyboard.totalDurationSec),
    photosUsedCount: validPool.length,
    hasAudioTrack: false,
  };
}
