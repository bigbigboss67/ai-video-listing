'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Compass,
  FileVideo,
  MapPin,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  StopCircle,
  Upload,
  WifiOff,
} from 'lucide-react';
import type {
  CurrencyCode,
  PropertyStatus,
  PropertyType,
  PropertyWithVideos,
} from '@/types/domain';
import { useAppContext } from '@/components/providers/AppProvider';
import { getMissingBrokerFields } from '@/lib/broker';
import { broadcastLocalSyncEvent } from '@/hooks/useRealtimeSync';
import {
  ResumableTusRunner,
  extractVideoPosterAndDuration,
  generateDemoWalkthroughFile,
  loadResumeState,
  makeFileFingerprint,
  saveResumeState,
} from '@/lib/resumable-upload';
import { PinAdjustMap } from '@/components/map/PinAdjustMap';
import { ShotTeleprompter } from '@/components/capture/ShotTeleprompter';
import { Button, StatusPill, UploadProgressRing } from '@/components/ui/Primitives';
import { formatDuration } from '@/lib/format';

interface GeocodeSuggestion {
  nameEn: string;
  nameAr: string;
  addressEn: string;
  addressAr: string;
  lat: number;
  lng: number;
}

export function CaptureStudio({
  initialProperties,
}: {
  initialProperties: PropertyWithVideos[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { theme, user } = useAppContext();
  const missingBrokerFields = user ? getMissingBrokerFields(user) : [];
  const brokerDetailsMissing = missingBrokerFields.length > 0;

  // Capture vs Gallery tab
  const [mode, setMode] = useState<'record' | 'gallery'>('record');
  const [cameraState, setCameraState] = useState<
    'idle' | 'ready' | 'recording' | 'denied'
  >('idle');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Selected/captured media + auto-generated thumbnail
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [posterDataUrl, setPosterDataUrl] = useState<string | undefined>(undefined);
  const [durationSec, setDurationSec] = useState<number>(30);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Location & GPS state
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'locked' | 'denied'>('idle');
  const [lat, setLat] = useState<number>(25.1972);
  const [lng, setLng] = useState<number>(55.2744);
  const [community, setCommunity] = useState<string>('Downtown Dubai');
  const [addressEn, setAddressEn] = useState<string>(
    'Mohammed Bin Rashid Blvd, Downtown Dubai, UAE'
  );
  const [addressAr, setAddressAr] = useState<string>(
    'بوليفارد محمد بن راشد، وسط مدينة دبي، الإمارات'
  );
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);

  // Property attachment / quick-create state
  const [properties, setProperties] =
    useState<PropertyWithVideos[]>(initialProperties);
  const [propertySearch, setPropertySearch] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    initialProperties[0]?.id ?? ''
  );
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  // Quick-create fields
  const [qcTitleEn, setQcTitleEn] = useState('');
  const [qcTitleAr, setQcTitleAr] = useState('');
  const [qcType, setQcType] = useState<PropertyType>('apartment');
  // No sample values: every field starts blank so nothing fake can be published by accident.
  const [qcPrice, setQcPrice] = useState('');
  const [qcCurrency, setQcCurrency] = useState<CurrencyCode>('AED');
  const [qcBeds, setQcBeds] = useState('');
  const [qcBaths, setQcBaths] = useState('');
  const [qcArea, setQcArea] = useState('');
  const [qcStatus, setQcStatus] = useState<PropertyStatus>('ready');
  const [qcOwnership, setQcOwnership] = useState<'freehold' | 'leasehold' | 'gcc_national'>('freehold');
  const [qcAvailability, setQcAvailability] = useState<'available' | 'under_offer' | 'coming_soon' | 'sold'>('available');
  const [qcPermit, setQcPermit] = useState('');
  const [qcDeveloper, setQcDeveloper] = useState('');
  const [qcProjectNumber, setQcProjectNumber] = useState('');
  const [qcEscrow, setQcEscrow] = useState('');
  const [qcDescription, setQcDescription] = useState('');
  const [qcNetYield, setQcNetYield] = useState('');
  const [qcServiceCharge, setQcServiceCharge] = useState('');
  const [qcPaymentPlan, setQcPaymentPlan] = useState('');
  const [creatingProperty, setCreatingProperty] = useState(false);

  // Compliance & Upload runner state
  const [consentChecked, setConsentChecked] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'paused' | 'processing' | 'ready' | 'in_review' | 'failed'
  >('idle');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [completedSlug, setCompletedSlug] = useState<string | null>(null);
  const runnerRef = useRef<ResumableTusRunner | null>(null);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  // Recording duration timer (caps at 180s)
  useEffect(() => {
    if (cameraState !== 'recording') return;
    const timer = window.setInterval(() => {
      setRecordSeconds((prev) => {
        if (prev + 1 >= 180) {
          mediaRecorderRef.current?.stop();
          return 180;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cameraState]);

  const reverseGeocode = async (nextLat: number, nextLng: number) => {
    try {
      const res = await fetch(
        `/api/geocode?lat=${encodeURIComponent(nextLat)}&lng=${encodeURIComponent(nextLng)}`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          community: string;
          addressEn: string;
          addressAr: string;
        };
        setCommunity(data.community);
        setAddressEn(data.addressEn);
        setAddressAr(data.addressAr);
      }
    } catch {
      // Keep coordinates even if offline
    }
  };

  const requestGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('denied');
      return;
    }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = Number(pos.coords.latitude.toFixed(6));
        const nextLng = Number(pos.coords.longitude.toFixed(6));
        setLat(nextLat);
        setLng(nextLng);
        setGpsStatus('locked');
        reverseGeocode(nextLat, nextLng);
      },
      () => {
        setGpsStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleAddressSearch = async (value: string) => {
    setAddressQuery(value);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
      if (res.ok) {
        const data = (await res.json()) as { results: GeocodeSuggestion[] };
        setSuggestions(data.results.slice(0, 5));
      }
    } catch {
      setSuggestions([]);
    }
  };

  const enableCamera = async (facing: 'environment' | 'user' = facingMode) => {
    setMediaError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('denied');
      return;
    }
    try {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      setCameraState('ready');
      requestGps();
    } catch {
      setCameraState('denied');
    }
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === 'undefined') return;
    recordedChunksRef.current = [];
    setRecordSeconds(0);

    // Safari MP4 vs Chrome WebM codec negotiation + bitrate cap (4.5 Mbps)
    const preferredMime = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
      ? 'video/mp4;codecs=avc1'
      : MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';

    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported(preferredMime)
        ? preferredMime
        : undefined,
      videoBitsPerSecond: 4_500_000,
    });

    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
    };
    recorder.onstop = async () => {
      const cleanMime = preferredMime.split(';')[0] || 'video/webm';
      const ext = cleanMime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(recordedChunksRef.current, { type: cleanMime });
      const file = new File([blob], `walkthrough-${Date.now()}.${ext}`, {
        type: cleanMime,
      });
      setCameraState('ready');
      await processSelectedFile(file);
    };

    mediaRecorderRef.current = recorder;
    recorder.start(500);
    setCameraState('recording');
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const processSelectedFile = async (file: File) => {
    setMediaError(null);
    if (file.size > 250 * 1024 * 1024) {
      setMediaError('File exceeds 250 MB maximum limit.');
      return;
    }
    const { posterDataUrl: extractedPoster, durationSec: extractedDuration } =
      await extractVideoPosterAndDuration(file);
    if (extractedDuration > 180) {
      setMediaError('Video exceeds 180 second maximum duration.');
      return;
    }
    setSelectedFile(file);
    setPosterDataUrl(extractedPoster);
    setDurationSec(extractedDuration);
    setUploadStatus('idle');
    setUploadPercent(0);
    setUploadMessage(null);
  };

  const handleGenerateSampleClip = async () => {
    setMediaError(null);
    const activeProp = properties.find((p) => p.id === selectedPropertyId);
    const file = await generateDemoWalkthroughFile(
      activeProp?.community || community
    );
    await processSelectedFile(file);
  };

  const handleQuickCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingProperty(true);
    setUploadMessage(null);
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleEn: qcTitleEn,
          titleAr: qcTitleAr,
          propertyType: qcType,
          price: Number(qcPrice),
          currency: qcCurrency,
          bedrooms: Number(qcBeds),
          bathrooms: Number(qcBaths),
          areaSqft: Number(qcArea),
          status: qcStatus,
          ownership: qcOwnership,
          availability: qcAvailability,
          permitNumber: qcPermit,
          developerName: qcDeveloper || undefined,
          projectNumber: qcProjectNumber || undefined,
          escrowAccount: qcEscrow || undefined,
          estNetYieldPct: qcNetYield.trim() ? Number(qcNetYield) : undefined,
          serviceChargeAedSqft: qcServiceCharge.trim() ? Number(qcServiceCharge) : undefined,
          paymentPlan: qcPaymentPlan.trim() || undefined,
          descriptionEn: qcDescription,
          descriptionAr: qcDescription,
          addressEn,
          addressAr,
          community,
          lat,
          lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const firstFieldErr = data.error?.fieldErrors
          ? Object.values(data.error.fieldErrors).flat()[0]
          : null;
        setUploadMessage(firstFieldErr || data.error?.message || 'Validation failed');
        return;
      }
      const created = data.property as PropertyWithVideos;
      setProperties((prev) => [created, ...prev]);
      setSelectedPropertyId(created.id);
      setQuickCreateOpen(false);
      setQcTitleEn('');
      setQcTitleAr('');
      setQcNetYield('');
      setQcServiceCharge('');
      setQcPaymentPlan('');
    } finally {
      setCreatingProperty(false);
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile || !selectedPropertyId) {
      setUploadMessage('Select or record a video and choose a property first.');
      return;
    }
    if (!consentChecked) {
      setUploadMessage('UAE PDPL & filming consent attestation is required before upload.');
      return;
    }

    setUploadMessage(null);
    const fingerprint = makeFileFingerprint(selectedFile, selectedPropertyId);
    let resumeState = loadResumeState(fingerprint);

    if (!resumeState) {
      const initRes = await fetch('/api/uploads/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          filename: selectedFile.name,
          mimeType: selectedFile.type || 'video/mp4',
          sizeBytes: selectedFile.size,
          durationSec,
          posterDataUrl,
          captureLat: lat,
          captureLng: lng,
          consentAttested: consentChecked,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        setUploadStatus('failed');
        setUploadMessage(initData.error?.message || 'Failed to initiate upload.');
        return;
      }

      resumeState = {
        tusUploadUrl: initData.tusUploadUrl,
        tusSessionId: initData.tusSessionId,
        videoId: initData.video.id,
        offsetBytes: 0,
        sizeBytes: selectedFile.size,
        chunkSizeBytes: initData.chunkSizeBytes || 512 * 1024,
      };
      saveResumeState(fingerprint, resumeState);
    }

    const runner = new ResumableTusRunner(selectedFile, resumeState, fingerprint, {
      onProgress: (pct) => {
        setUploadPercent(pct);
      },
      onStatusChange: (nextStatus, msg) => {
        setUploadStatus(nextStatus);
        if (msg) setUploadMessage(msg);
      },
      onComplete: async (video) => {
        const targetProp = properties.find((p) => p.id === video.propertyId);
        if (targetProp) {
          setCompletedSlug(targetProp.slug);
          // Fetch updated property to broadcast across tabs cleanly
          const freshRes = await fetch(`/api/properties/${targetProp.slug}`, {
            cache: 'no-store',
          });
          if (freshRes.ok) {
            const freshData = (await freshRes.json()) as {
              property: PropertyWithVideos;
            };
            broadcastLocalSyncEvent({
              id: `bc-${video.id}-${Date.now()}`,
              type: video.uploadStatus === 'ready' ? 'video.ready' : 'video.in_review',
              timestamp: new Date().toISOString(),
              propertyId: video.propertyId,
              videoId: video.id,
              progressPct: 100,
              property: freshData.property,
              video,
            });
          }
        }
      },
    });

    runnerRef.current = runner;
    await runner.start();
  };

  const filteredProperties = useMemo(() => {
    const q = propertySearch.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(
      (p) =>
        p.titleEn.toLowerCase().includes(q) ||
        p.titleAr.includes(propertySearch) ||
        p.community.toLowerCase().includes(q) ||
        p.permitNumber.toLowerCase().includes(q)
    );
  }, [properties, propertySearch]);

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-5 py-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t('capture.title')}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t('capture.subtitle')}
          </p>
        </div>
        {/* Location Chip */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-medium self-start">
          <MapPin className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span className="truncate max-w-[200px]">{community}</span>
          <span className="font-mono-code text-[11px] text-[var(--text-muted)] bidi-ltr">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
        </div>
      </div>

      {/* UAE PDPL Privacy Rationale Banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)]">
        <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
        <p>{t('capture.permissionRationale')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Step 1: Video Capture / Gallery Picker */}
        <section className="lg:col-span-6 space-y-4">
          <div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
            {/* Mode Tabs */}
            <div className="grid grid-cols-2 border-b border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setMode('record')}
                className={`h-11 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer border-b-2 transition-colors ${
                  mode === 'record'
                    ? 'border-[var(--accent-primary)] text-[var(--text-primary)] bg-[var(--bg-elevated)]/50'
                    : 'border-transparent text-[var(--text-secondary)]'
                }`}
              >
                <Camera className="w-4 h-4" />
                {t('capture.tabRecord')}
              </button>
              <button
                type="button"
                onClick={() => setMode('gallery')}
                className={`h-11 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer border-b-2 transition-colors ${
                  mode === 'gallery'
                    ? 'border-[var(--accent-primary)] text-[var(--text-primary)] bg-[var(--bg-elevated)]/50'
                    : 'border-transparent text-[var(--text-secondary)]'
                }`}
              >
                <Upload className="w-4 h-4" />
                {t('capture.tabGallery')}
              </button>
            </div>

            {mode === 'record' ? (
              <div className="p-4 space-y-3">
                <div className="relative aspect-[4/3] rounded-[6px] bg-[#0D0F12] overflow-hidden border border-[var(--border-subtle)] flex items-center justify-center">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${
                      cameraState === 'ready' || cameraState === 'recording'
                        ? 'block'
                        : 'hidden'
                    }`}
                  />

                  {/* Top Live Location & Timer Chips */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-black/70 text-white text-[11px] font-medium">
                      <MapPin className="w-3 h-3 text-[#D4AF6A]" />
                      {gpsStatus === 'locked' ? t('capture.gpsLocked') : community}
                    </span>
                    {cameraState === 'recording' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#B42318] text-white text-xs font-mono-code bidi-ltr">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        {formatDuration(recordSeconds)} / 3:00
                      </span>
                    ) : null}
                  </div>

                  {cameraState === 'idle' ? (
                    <div className="text-center p-6 space-y-3">
                      <Camera className="w-9 h-9 text-[#D4AF6A] mx-auto" />
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Button
                          type="button"
                          variant="accent"
                          onClick={() => enableCamera(facingMode)}
                        >
                          <Camera className="w-4 h-4" />
                          {t('capture.startCamera')}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleGenerateSampleClip}
                          data-testid="generate-demo-clip"
                        >
                          <Sparkles className="w-4 h-4" />
                          {t('capture.recordSampleFallback')}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {cameraState === 'denied' ? (
                    <div className="text-center p-6 space-y-2.5 text-white max-w-sm">
                      <AlertTriangle className="w-8 h-8 text-[#FBBF24] mx-auto" />
                      <h3 className="text-sm font-semibold">
                        {t('capture.cameraDeniedTitle')}
                      </h3>
                      <p className="text-xs text-white/75">
                        {t('capture.cameraDeniedBody')}
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="accent"
                          onClick={() => setMode('gallery')}
                        >
                          {t('capture.tabGallery')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={handleGenerateSampleClip}
                        >
                          {t('capture.recordSampleFallback')}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Camera Controls Dock */}
                {cameraState === 'ready' || cameraState === 'recording' ? (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const next = facingMode === 'environment' ? 'user' : 'environment';
                        setFacingMode(next);
                        enableCamera(next);
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {t('capture.flipCamera')}
                    </Button>

                    {cameraState === 'recording' ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        aria-label={t('capture.stopRecord')}
                        className="w-14 h-14 rounded-full bg-[var(--status-danger)] text-white flex items-center justify-center ring-4 ring-[var(--status-danger-bg)] cursor-pointer"
                      >
                        <StopCircle className="w-7 h-7" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        aria-label={t('capture.startRecord')}
                        className="w-14 h-14 rounded-full bg-[var(--status-danger)] text-white flex items-center justify-center ring-4 ring-[var(--border-strong)] hover:scale-105 transition-transform cursor-pointer"
                      >
                        <span className="w-5 h-5 rounded-full bg-white" />
                      </button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateSampleClip}
                    >
                      Demo Clip
                    </Button>
                  </div>
                ) : null}

                <ShotTeleprompter
                  recordSeconds={recordSeconds}
                  isRecording={cameraState === 'recording'}
                />
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <label
                  htmlFor="gallery-video-input"
                  className="flex flex-col items-center justify-center text-center p-8 rounded-[8px] border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-canvas)] hover:border-[var(--accent-primary)] transition-colors cursor-pointer"
                >
                  <FileVideo className="w-9 h-9 text-[var(--accent-primary)] mb-2" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {t('capture.pickVideo')}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] mt-1">
                    {t('capture.pickHint')}
                  </span>
                  <input
                    id="gallery-video-input"
                    data-testid="gallery-video-input"
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) processSelectedFile(f);
                    }}
                  />
                </label>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerateSampleClip}
                  className="w-full"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('capture.recordSampleFallback')}
                </Button>
              </div>
            )}

            {/* Selected Video Summary + Auto Poster Preview */}
            {selectedFile ? (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-3 p-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  {posterDataUrl ? (
                    <img
                      src={posterDataUrl}
                      alt={t('capture.thumbnailReady')}
                      className="w-20 h-14 rounded-[4px] object-cover border border-[var(--border-subtle)] shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-14 rounded-[4px] bg-[#12151A] flex items-center justify-center shrink-0">
                      <FileVideo className="w-5 h-5 text-[#D4AF6A]" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">
                      {selectedFile.name}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] tabular-nums mt-0.5 bidi-ltr">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB ·{' '}
                      {formatDuration(durationSec)} · {t('capture.thumbnailReady')}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {mediaError ? (
              <div
                role="alert"
                className="mx-4 mb-4 p-2.5 rounded-[6px] bg-[var(--status-danger-bg)] text-[var(--status-danger)] text-xs font-medium"
              >
                {mediaError}
              </div>
            ) : null}
          </div>

          {/* Step 2: Location (Auto-GPS + Draggable Map Pin + Manual Address Search) */}
          <div className="p-4 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[var(--accent-primary)]" />
                {t('capture.locationSection')}
              </h2>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={requestGps}
                className="whitespace-nowrap shrink-0"
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                {t('capture.captureGps')}
              </Button>
            </div>

            {gpsStatus === 'denied' ? (
              <div className="text-xs text-[var(--status-warn)] bg-[var(--status-warn-bg)] px-3 py-2 rounded-[6px]">
                {t('capture.gpsDenied')}
              </div>
            ) : null}

            {/* Manual Address / Community Fallback Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                type="search"
                value={addressQuery}
                onChange={(e) => handleAddressSearch(e.target.value)}
                placeholder={t('capture.addressSearch')}
                aria-label={t('capture.addressSearch')}
                className="w-full h-10 ps-9 pe-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-sm"
              />
              {suggestions.length > 0 ? (
                <ul
                  role="listbox"
                  className="absolute z-20 mt-1 inset-x-0 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)] divide-y divide-[var(--border-subtle)]"
                >
                  {suggestions.map((s) => (
                    <li key={s.nameEn}>
                      <button
                        type="button"
                        onClick={() => {
                          setLat(s.lat);
                          setLng(s.lng);
                          setCommunity(s.nameEn);
                          setAddressEn(s.addressEn);
                          setAddressAr(s.addressAr);
                          setAddressQuery('');
                          setSuggestions([]);
                        }}
                        className="w-full text-start px-3 py-2 text-xs hover:bg-[var(--bg-elevated)] cursor-pointer"
                      >
                        <div className="font-semibold">
                          {locale === 'ar' ? s.nameAr : s.nameEn}
                        </div>
                        <div className="text-[var(--text-muted)]">
                          {locale === 'ar' ? s.addressAr : s.addressEn}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <PinAdjustMap
              lat={lat}
              lng={lng}
              theme={theme}
              onChangeCoords={(nextLat, nextLng) => {
                setLat(nextLat);
                setLng(nextLng);
                reverseGeocode(nextLat, nextLng);
              }}
            />

            <p className="text-[11px] text-[var(--text-muted)]">
              {t('capture.dragPinHint')} ·{' '}
              <span className="text-[var(--text-secondary)] font-medium">
                {locale === 'ar' ? addressAr : addressEn}
              </span>
            </p>
          </div>
        </section>

        {/* Step 3: Property Combobox / Quick-Create + UAE Compliance + Resumable Upload Progress */}
        <section className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{t('capture.attachProperty')}</h2>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setQuickCreateOpen((o) => !o)}
                data-testid="toggle-quick-create"
              >
                <Plus className="w-3.5 h-3.5" />
                {quickCreateOpen
                  ? t('capture.useExistingToggle')
                  : t('capture.quickCreateToggle')}
              </Button>
            </div>

            {!quickCreateOpen ? (
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute top-1/2 -translate-y-1/2 start-3" />
                  <input
                    type="search"
                    value={propertySearch}
                    onChange={(e) => setPropertySearch(e.target.value)}
                    placeholder={t('capture.searchProperty')}
                    aria-label={t('capture.searchProperty')}
                    className="w-full h-10 ps-9 pe-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-sm"
                  />
                </div>
                <div
                  role="radiogroup"
                  aria-label={t('capture.attachProperty')}
                  className="max-h-56 overflow-y-auto divide-y divide-[var(--border-subtle)] rounded-[6px] border border-[var(--border-subtle)]"
                >
                  {filteredProperties.map((prop) => {
                    const active = prop.id === selectedPropertyId;
                    return (
                      <button
                        key={prop.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setSelectedPropertyId(prop.id)}
                        className={`w-full text-start px-3 py-2.5 transition-colors cursor-pointer ${
                          active
                            ? 'bg-[var(--accent-subtle)]'
                            : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[var(--text-primary)] line-clamp-1">
                            {locale === 'ar' ? prop.titleAr : prop.titleEn}
                          </span>
                          <span className="font-mono-code text-[11px] text-[var(--text-muted)] bidi-ltr shrink-0">
                            #{prop.permitNumber}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          {prop.community} · {t(`propertyTypes.${prop.propertyType}`)} ·{' '}
                          {t(`statuses.${prop.status}`)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleQuickCreateProperty}
                className="space-y-3 pt-1"
                data-testid="quick-create-form"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      {t('quickCreate.titleEn')} *
                    </label>
                    <input
                      required
                      value={qcTitleEn}
                      onChange={(e) => setQcTitleEn(e.target.value)}
                      placeholder="Skyline 3BR Duplex — DIFC"
                      className="w-full h-9 px-2.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      {t('quickCreate.titleAr')}
                    </label>
                    <input
                      value={qcTitleAr}
                      onChange={(e) => setQcTitleAr(e.target.value)}
                      placeholder="دوبلكس 3 غرف — مركز دبي المالي"
                      className="w-full h-9 px-2.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      {t('quickCreate.type')}
                    </label>
                    <select
                      value={qcType}
                      onChange={(e) => setQcType(e.target.value as PropertyType)}
                      className="w-full h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs"
                    >
                      <option value="apartment">{t('propertyTypes.apartment')}</option>
                      <option value="villa">{t('propertyTypes.villa')}</option>
                      <option value="townhouse">{t('propertyTypes.townhouse')}</option>
                      <option value="penthouse">{t('propertyTypes.penthouse')}</option>
                      <option value="plot">{t('propertyTypes.plot')}</option>
                      <option value="commercial">{t('propertyTypes.commercial')}</option>
                      <option value="off_plan_project">{t('propertyTypes.off_plan_project')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      {t('quickCreate.price')} *
                    </label>
                    <input
                      required
                      type="number"
                      value={qcPrice}
                      onChange={(e) => setQcPrice(e.target.value)}
                      className="w-full h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      {t('quickCreate.currency')}
                    </label>
                    <select
                      value={qcCurrency}
                      onChange={(e) => setQcCurrency(e.target.value as CurrencyCode)}
                      className="w-full h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs"
                    >
                      <option value="AED">AED</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      {t('quickCreate.beds')}
                    </label>
                    <input
                      required
                      type="number"
                      min={0}
                      value={qcBeds}
                      onChange={(e) => setQcBeds(e.target.value)}
                      className="w-full h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      {t('quickCreate.baths')}
                    </label>
                    <input
                      required
                      type="number"
                      min={0}
                      value={qcBaths}
                      onChange={(e) => setQcBaths(e.target.value)}
                      className="w-full h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      {t('quickCreate.areaSqft')}
                    </label>
                    <input
                      required
                      type="number"
                      value={qcArea}
                      onChange={(e) => setQcArea(e.target.value)}
                      className="w-full h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      {t('quickCreate.status')}
                    </label>
                    <select
                      value={qcStatus}
                      onChange={(e) => setQcStatus(e.target.value as PropertyStatus)}
                      className="w-full h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs"
                    >
                      <option value="ready">{t('statuses.ready')}</option>
                      <option value="off_plan">{t('statuses.off_plan')}</option>
                      <option value="rent">{t('statuses.rent')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      {t('quickCreate.ownership')}
                    </label>
                    <select
                      value={qcOwnership}
                      onChange={(e) =>
                        setQcOwnership(
                          e.target.value as 'freehold' | 'leasehold' | 'gcc_national'
                        )
                      }
                      className="w-full h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs"
                    >
                      <option value="freehold">{t('ownerships.freehold')}</option>
                      <option value="leasehold">{t('ownerships.leasehold')}</option>
                      <option value="gcc_national">{t('ownerships.gcc_national')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      {t('quickCreate.availability')}
                    </label>
                    <select
                      value={qcAvailability}
                      onChange={(e) =>
                        setQcAvailability(
                          e.target.value as
                            | 'available'
                            | 'under_offer'
                            | 'coming_soon'
                            | 'sold'
                        )
                      }
                      className="w-full h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs"
                    >
                      <option value="available">{t('availabilities.available')}</option>
                      <option value="under_offer">{t('availabilities.under_offer')}</option>
                      <option value="coming_soon">{t('availabilities.coming_soon')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    {t('quickCreate.permitNumber')} (DLD Trakheesi) *
                  </label>
                  <input
                    required
                    value={qcPermit}
                    onChange={(e) => setQcPermit(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs font-mono-code bidi-ltr"
                  />
                </div>

                {qcStatus === 'off_plan' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-[6px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                    <input
                      required
                      value={qcDeveloper}
                      onChange={(e) => setQcDeveloper(e.target.value)}
                      placeholder={t('quickCreate.developerName')}
                      className="h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs"
                    />
                    <input
                      value={qcProjectNumber}
                      onChange={(e) => setQcProjectNumber(e.target.value)}
                      placeholder={t('quickCreate.projectNumber')}
                      className="h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-mono-code"
                    />
                    <input
                      required
                      value={qcEscrow}
                      onChange={(e) => setQcEscrow(e.target.value)}
                      placeholder={t('quickCreate.escrowAccount')}
                      className="h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-mono-code"
                    />
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="block">
                      <span className="block text-[11px] font-semibold mb-1">
                        {t('quickCreate.estNetYield')}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={40}
                        step={0.1}
                        value={qcNetYield}
                        onChange={(e) => setQcNetYield(e.target.value)}
                        className="w-full h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs tabular-nums"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] font-semibold mb-1">
                        {t('quickCreate.serviceCharge')}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={500}
                        step={0.5}
                        value={qcServiceCharge}
                        onChange={(e) => setQcServiceCharge(e.target.value)}
                        className="w-full h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs tabular-nums"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] font-semibold mb-1">
                        {t('quickCreate.paymentPlan')}
                      </span>
                      <input
                        maxLength={120}
                        value={qcPaymentPlan}
                        onChange={(e) => setQcPaymentPlan(e.target.value)}
                        className="w-full h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs"
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {t('quickCreate.optionalHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    {t('quickCreate.description')} *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={qcDescription}
                    onChange={(e) => setQcDescription(e.target.value)}
                    className="w-full p-2.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs"
                  />
                </div>

                {brokerDetailsMissing ? (
                  <div
                    role="alert"
                    data-testid="broker-details-missing"
                    className="p-3 rounded-[6px] bg-[var(--status-warn-bg)] text-[var(--status-warn)] text-xs space-y-1"
                  >
                    <div className="font-semibold">{t('quickCreate.brokerMissingTitle')}</div>
                    <div>
                      {t('quickCreate.brokerMissingBody', {
                        fields: missingBrokerFields
                          .map((f) => t(`quickCreate.brokerFields.${f}`))
                          .join(', '),
                      })}
                    </div>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={creatingProperty || brokerDetailsMissing}
                  className="w-full"
                >
                  {creatingProperty ? 'Creating…' : 'Save & Attach Property'}
                </Button>
              </form>
            )}
          </div>

          {/* Compliance Gate + Resumable Upload Progress Card */}
          <div className="p-4 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
                {t('capture.complianceTitle')}
              </h2>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="consent-checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[var(--accent-primary)] shrink-0"
                />
                <span className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  {t('capture.consentCheckbox')}
                </span>
              </label>
            </div>

            {uploadStatus !== 'idle' ? (
              <div
                data-testid="upload-progress-card"
                className="p-4 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center gap-4"
              >
                <UploadProgressRing
                  percent={uploadPercent}
                  status={uploadStatus}
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <StatusPill
                      status={
                        uploadStatus === 'paused' ? 'uploading' : uploadStatus
                      }
                      label={
                        uploadStatus === 'paused'
                          ? 'Paused'
                          : t(`videoStatus.${uploadStatus}`)
                      }
                    />
                    {selectedProperty ? (
                      <span className="text-xs font-medium truncate">
                        {selectedProperty.community}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {uploadStatus === 'uploading' &&
                      t('capture.uploadingStatus', { percent: uploadPercent })}
                    {uploadStatus === 'paused' &&
                      t('capture.pausedStatus', { percent: uploadPercent })}
                    {uploadStatus === 'processing' && t('capture.processingStatus')}
                    {uploadStatus === 'ready' && t('capture.readyStatus')}
                    {uploadStatus === 'in_review' && t('capture.inReviewStatus')}
                    {uploadStatus === 'failed' &&
                      (uploadMessage || t('capture.failedStatus'))}
                  </p>

                  {/* Calm Resumable Controls */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {uploadStatus === 'uploading' ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => runnerRef.current?.pause()}
                        >
                          <Pause className="w-3 h-3" />
                          {t('capture.pauseUpload')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => runnerRef.current?.abortForSimulatedDrop()}
                        >
                          <WifiOff className="w-3 h-3" />
                          {t('capture.simulateDrop')}
                        </Button>
                      </>
                    ) : null}

                    {uploadStatus === 'paused' || uploadStatus === 'failed' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="accent"
                        onClick={() => runnerRef.current?.start()}
                      >
                        <Play className="w-3 h-3" />
                        {uploadStatus === 'paused'
                          ? t('capture.resumeUpload')
                          : t('capture.retryUpload')}
                      </Button>
                    ) : null}

                    {uploadStatus === 'ready' && completedSlug ? (
                      <Link
                        href={`/properties/${completedSlug}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--status-live)] hover:underline"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {t('listing.openDetail')}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {uploadMessage && uploadStatus === 'idle' ? (
              <div
                role="alert"
                className="p-2.5 rounded-[6px] bg-[var(--status-danger-bg)] text-[var(--status-danger)] text-xs font-medium"
              >
                {uploadMessage}
              </div>
            ) : null}

            <Button
              type="button"
              variant="accent"
              size="lg"
              data-testid="publish-upload-btn"
              disabled={
                !selectedFile ||
                !selectedPropertyId ||
                uploadStatus === 'uploading' ||
                uploadStatus === 'processing'
              }
              onClick={handleStartUpload}
              className="w-full"
            >
              <Upload className="w-4 h-4" />
              {t('capture.publishButton')}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
