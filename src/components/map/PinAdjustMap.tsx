'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';

interface PinAdjustMapProps {
  lat: number;
  lng: number;
  onChangeCoords: (lat: number, lng: number) => void;
  theme?: 'light' | 'dark';
}

const LIGHT_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_LIGHT ||
  'https://tiles.openfreemap.org/styles/positron';
const DARK_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_DARK ||
  'https://tiles.openfreemap.org/styles/dark';

export function PinAdjustMap({
  lat,
  lng,
  onChangeCoords,
  theme = 'light',
}: PinAdjustMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const markerRef = useRef<import('maplibre-gl').Marker | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return;

    import('maplibre-gl')
      .then((maplibregl) => {
        if (cancelled || !containerRef.current) return;
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: theme === 'dark' ? DARK_STYLE : LIGHT_STYLE,
          center: [lng, lat],
          zoom: 13,
          attributionControl: false,
        });

        const marker = new maplibregl.Marker({
          color: '#8F6A2E',
          draggable: true,
        })
          .setLngLat([lng, lat])
          .addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLngLat();
          onChangeCoords(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
        });

        map.on('click', (e) => {
          marker.setLngLat([e.lngLat.lng, e.lngLat.lat]);
          onChangeCoords(
            Number(e.lngLat.lat.toFixed(6)),
            Number(e.lngLat.lng.toFixed(6))
          );
        });

        mapRef.current = map;
        markerRef.current = marker;
      })
      .catch(() => {
        if (!cancelled) setFallbackMode(true);
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLngLat([lng, lat]);
      mapRef.current.easeTo({ center: [lng, lat], duration: 400 });
    }
  }, [lat, lng]);

  return (
    <div className="relative h-56 w-full rounded-[8px] border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-elevated)]">
      {!fallbackMode ? (
        <div ref={containerRef} className="w-full h-full" aria-label="Draggable location pin map" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
          <MapPin className="w-6 h-6 text-[var(--accent-primary)]" />
          <span className="font-mono-code bidi-ltr">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>
      )}
      <div className="absolute top-2 start-2 px-2.5 py-1 rounded-[4px] bg-[var(--bg-surface)]/95 border border-[var(--border-subtle)] text-[11px] font-mono-code bidi-ltr text-[var(--text-primary)]">
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </div>
    </div>
  );
}
