'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { CurrencyCode, PropertyWithVideos } from '@/types/domain';
import { formatCurrency } from '@/lib/format';
import 'maplibre-gl/dist/maplibre-gl.css';

interface ClusteredPropertyMapProps {
  properties: PropertyWithVideos[];
  selectedId?: string | null;
  highlightedId?: string | null;
  currency: CurrencyCode;
  locale: string;
  theme: 'light' | 'dark';
  onSelectProperty: (property: PropertyWithVideos) => void;
  className?: string;
}

const LIGHT_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_LIGHT ||
  'https://tiles.openfreemap.org/styles/positron';
const DARK_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_DARK ||
  'https://tiles.openfreemap.org/styles/dark';

let rtlPluginLoaded = false;

export function ClusteredPropertyMap({
  properties,
  selectedId,
  highlightedId,
  currency,
  locale,
  theme,
  onSelectProperty,
  className = 'h-[520px]',
}: ClusteredPropertyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [webglFallback, setWebglFallback] = useState(false);

  const buildGeoJson = (items: PropertyWithVideos[]) => ({
    type: 'FeatureCollection' as const,
    features: items.map((p) => ({
      type: 'Feature' as const,
      properties: {
        id: p.id,
        title: locale === 'ar' ? p.titleAr : p.titleEn,
        priceLabel: formatCurrency(p.priceAed, currency, locale, true),
        community: p.community,
        isSelected: p.id === selectedId ? 1 : 0,
        isHighlighted: p.id === highlightedId ? 1 : 0,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [p.lng, p.lat],
      },
    })),
  });

  // Initialize MapLibre GL JS with Arabic RTL text plugin and GeoJSON clustering
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    import('maplibre-gl')
      .then((maplibregl) => {
        if (cancelled || !containerRef.current) return;

        if (!rtlPluginLoaded && typeof maplibregl.setRTLTextPlugin === 'function') {
          rtlPluginLoaded = true;
          maplibregl
            .setRTLTextPlugin(
              'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js',
              true
            )
            .catch(() => {});
        }

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: theme === 'dark' ? DARK_STYLE : LIGHT_STYLE,
          center: [55.235, 25.165], // Dubai core
          zoom: 10.6,
          attributionControl: false,
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

        map.on('load', () => {
          if (cancelled) return;

          map.addSource('properties', {
            type: 'geojson',
            data: buildGeoJson(properties),
            cluster: true,
            clusterMaxZoom: 13,
            clusterRadius: 48,
          });

          map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'properties',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': '#8F6A2E',
              'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 15, 30],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#FFFFFF',
            },
          });

          map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'properties',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': '{point_count_abbreviated}',
              'text-size': 12,
            },
            paint: {
              'text-color': '#FFFFFF',
            },
          });

          map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'properties',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': [
                'case',
                ['==', ['get', 'isHighlighted'], 1],
                '#0F6E4A',
                ['==', ['get', 'isSelected'], 1],
                '#D4AF6A',
                '#12151A',
              ],
              'circle-radius': [
                'case',
                ['==', ['get', 'isHighlighted'], 1],
                12,
                ['==', ['get', 'isSelected'], 1],
                10,
                7,
              ],
              'circle-stroke-width': 2.5,
              'circle-stroke-color': '#FFFFFF',
            },
          });

          map.on('click', 'clusters', async (e) => {
            const features = map.queryRenderedFeatures(e.point, {
              layers: ['clusters'],
            });
            const clusterId = features[0]?.properties?.cluster_id;
            const source = map.getSource('properties') as import('maplibre-gl').GeoJSONSource;
            if (clusterId !== undefined && source) {
              const zoom = await source.getClusterExpansionZoom(clusterId);
              const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
              map.easeTo({ center: coords, zoom });
            }
          });

          map.on('click', 'unclustered-point', (e) => {
            const id = e.features?.[0]?.properties?.id as string | undefined;
            const match = properties.find((p) => p.id === id);
            if (match) onSelectProperty(match);
          });

          map.on('mouseenter', 'clusters', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'clusters', () => {
            map.getCanvas().style.cursor = '';
          });
          map.on('mouseenter', 'unclustered-point', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'unclustered-point', () => {
            map.getCanvas().style.cursor = '';
          });

          mapRef.current = map;
          setMapReady(true);
        });

        map.on('error', () => {
          // Keep interactive pin overlay available if tiles fail offline
        });
      })
      .catch(() => {
        if (!cancelled) setWebglFallback(true);
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Update GeoJSON source live when listings, filters, or newly synced pins change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource('properties') as import('maplibre-gl').GeoJSONSource | undefined;
    if (source) {
      source.setData(buildGeoJson(properties));
    }
    if (highlightedId) {
      const target = properties.find((p) => p.id === highlightedId);
      if (target) {
        map.easeTo({ center: [target.lng, target.lat], zoom: 12.2, duration: 700 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, selectedId, highlightedId, currency, locale, mapReady]);

  return (
    <div
      className={`relative w-full rounded-[8px] border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-elevated)] ${className}`}
    >
      {!webglFallback ? (
        <div ref={containerRef} className="w-full h-full" aria-label="Interactive clustered property map" />
      ) : null}

      {/* Accessible Interactive Pin Strip (also acts as clean fallback if WebGL is disabled) */}
      <div className="absolute bottom-3 inset-x-3 z-10 flex items-center gap-2 overflow-x-auto pb-1">
        {properties.slice(0, 8).map((p) => {
          const isNew = p.id === highlightedId;
          const isSelected = p.id === selectedId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectProperty(p)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-xs font-semibold border transition-colors cursor-pointer ${
                isNew
                  ? 'bg-[var(--status-live)] text-white border-[var(--status-live)] animate-pin-drop'
                  : isSelected
                    ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                    : 'bg-[var(--bg-surface)]/95 text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--accent-primary)]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[120px]">{p.community}</span>
              <span className="tabular-nums bidi-ltr opacity-90">
                {formatCurrency(p.priceAed, currency, locale, true)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
