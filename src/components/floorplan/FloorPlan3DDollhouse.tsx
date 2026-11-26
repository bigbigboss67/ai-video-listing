'use client';

import React, { useMemo, useRef } from 'react';
import type {
  ArchitecturalFloorPlan,
  FloorPlanRoom,
} from '@/lib/floorplan-data';

interface FloorPlan3DDollhouseProps {
  plan: ArchitecturalFloorPlan;
  activeRoomId: string;
  orbitDeg: number;
  tiltDeg: number;
  locale: string;
  onOrbitChange: (deg: number) => void;
  onSelectRoom: (id: string) => void;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface ProjectedPoly {
  id: string;
  roomId?: string;
  points: string;
  fill: string;
  stroke: string;
  strokeWidth?: number;
  opacity?: number;
  depth: number;
}

const FLOOR_COLORS: Record<FloorPlanRoom['zone'], { base: string; selected: string }> = {
  living: { base: '#C8B08E', selected: '#E3C796' }, // Warm oak parquet
  bedroom: { base: '#BFA789', selected: '#DEC293' },
  kitchen: { base: '#D8D6CF', selected: '#ECE7DC' }, // Limestone / marble
  bath: { base: '#9EB7C7', selected: '#BBD6E6' }, // Spa stone
  outdoor: { base: '#7B947E', selected: '#94B398' }, // Decking / terrace
  utility: { base: '#A6ABB5', selected: '#C7CCD6' },
  commercial: { base: '#C5C8CE', selected: '#E0D2B8' },
};

const FURNITURE_COLORS: Record<string, { top: string; left: string; right: string }> = {
  bed_king: { top: '#F1F5F9', left: '#CBD5E1', right: '#94A3B8' },
  sofa_l: { top: '#5B6778', left: '#434D5B', right: '#323A46' },
  coffee_table: { top: '#8B6B47', left: '#6E5234', right: '#533C25' },
  kitchen_counter: { top: '#E2E8F0', left: '#94A3B8', right: '#64748B' },
  kitchen_island: { top: '#F8FAFC', left: '#B89B6C', right: '#8E7349' },
  dining_table: { top: '#8B6B47', left: '#694F32', right: '#4D3922' },
  conference_table: { top: '#785A3A', left: '#5C442B', right: '#42301E' },
  shower_glass: { top: '#7DD3FC', left: '#38BDF8', right: '#0284C7' },
  vanity: { top: '#E2E8F0', left: '#94A3B8', right: '#64748B' },
  wc: { top: '#FFFFFF', left: '#CBD5E1', right: '#94A3B8' },
  pool: { top: '#38BDF8', left: '#0284C7', right: '#0369A1' },
  loungers: { top: '#D4AF6A', left: '#A98749', right: '#806331' },
  wardrobe: { top: '#8A6F52', left: '#6B533B', right: '#4E3B29' },
  desk: { top: '#94A3B8', left: '#64748B', right: '#475569' },
};

/**
 * Real-time mathematical 3D isometric architectural dollhouse engine.
 * Projects true 3D room slabs, directionally-lit extruded vertical walls,
 * glass balustrades, and 3D furniture prisms with painter's depth sorting
 * and smooth pointer-drag 360° orbiting.
 */
export function FloorPlan3DDollhouse({
  plan,
  activeRoomId,
  orbitDeg,
  tiltDeg,
  locale,
  onOrbitChange,
  onSelectRoom,
}: FloorPlan3DDollhouseProps) {
  const dragRef = useRef<{ active: boolean; startX: number; startOrbit: number }>({
    active: false,
    startX: 0,
    startOrbit: orbitDeg,
  });

  const vbW = 760;
  const vbH = 470;
  const cx = plan.widthM / 2;
  const cy = plan.depthM / 2;

  const { polygons, labels } = useMemo(() => {
    const yaw = (orbitDeg * Math.PI) / 180;
    const pitch = (tiltDeg * Math.PI) / 180;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    const maxSpan = Math.hypot(plan.widthM, plan.depthM);
    const scale = Math.min(vbW * 0.78, vbH * 0.84) / Math.max(maxSpan, 6);

    const project = (p: Vec3) => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const rx = dx * cosY - dy * sinY;
      const ry = dx * sinY + dy * cosY;
      const sx = vbW / 2 + rx * scale;
      const sy = vbH / 2 + 26 + (ry * cosP - p.z * sinP) * scale;
      const depth = ry * sinP + p.z * cosP;
      return { sx, sy, depth };
    };

    const polys: ProjectedPoly[] = [];

    const pushBox = (opts: {
      id: string;
      roomId?: string;
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      z0: number;
      z1: number;
      topFill: string;
      leftFill: string;
      rightFill: string;
      stroke: string;
      opacity?: number;
      depthBias?: number;
    }) => {
      const { x0, y0, x1, y1, z0, z1, opacity = 1, depthBias = 0 } = opts;
      const b00 = project({ x: x0, y: y0, z: z0 });
      const b10 = project({ x: x1, y: y0, z: z0 });
      const b11 = project({ x: x1, y: y1, z: z0 });
      const b01 = project({ x: x0, y: y1, z: z0 });
      const t00 = project({ x: x0, y: y0, z: z1 });
      const t10 = project({ x: x1, y: y0, z: z1 });
      const t11 = project({ x: x1, y: y1, z: z1 });
      const t01 = project({ x: x0, y: y1, z: z1 });

      const faceList = [
        { pts: [t00, t10, t11, t01], fill: opts.topFill, bias: 0.02 },
        { pts: [b00, b10, t10, t00], fill: opts.leftFill, bias: 0 },
        { pts: [b10, b11, t11, t10], fill: opts.rightFill, bias: 0 },
        { pts: [b11, b01, t01, t11], fill: opts.leftFill, bias: 0 },
        { pts: [b01, b00, t00, t01], fill: opts.rightFill, bias: 0 },
      ];

      faceList.forEach((f, idx) => {
        const avgDepth =
          f.pts.reduce((sum, pt) => sum + pt.depth, 0) / 4 + depthBias + f.bias;
        polys.push({
          id: `${opts.id}-f${idx}`,
          roomId: opts.roomId,
          points: f.pts.map((pt) => `${pt.sx.toFixed(1)},${pt.sy.toFixed(1)}`).join(' '),
          fill: f.fill,
          stroke: opts.stroke,
          strokeWidth: 0.75,
          opacity,
          depth: avgDepth,
        });
      });
    };

    // 1. Concrete Foundation Base Slab
    pushBox({
      id: 'foundation',
      x0: -0.25,
      y0: -0.25,
      x1: plan.widthM + 0.25,
      y1: plan.depthM + 0.25,
      z0: -0.42,
      z1: -0.02,
      topFill: '#242A36',
      leftFill: '#1B202A',
      rightFill: '#131720',
      stroke: '#334155',
      depthBias: -20,
    });

    const wallThick = 0.16;

    // 2. Each Room: Floor Tile Slab + Extruded 3D Walls (cutaway height for clear dollhouse visibility) + 3D Furniture
    for (const room of plan.rooms) {
      const isSelected = room.id === activeRoomId;
      const fc = FLOOR_COLORS[room.zone];

      // Room floor surface
      const f00 = project({ x: room.x, y: room.y, z: 0 });
      const f10 = project({ x: room.x + room.w, y: room.y, z: 0 });
      const f11 = project({ x: room.x + room.w, y: room.y + room.h, z: 0 });
      const f01 = project({ x: room.x, y: room.y + room.h, z: 0 });
      polys.push({
        id: `floor-${room.id}`,
        roomId: room.id,
        points: [f00, f10, f11, f01]
          .map((p) => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`)
          .join(' '),
        fill: isSelected ? fc.selected : fc.base,
        stroke: isSelected ? '#F4D58D' : '#475569',
        strokeWidth: isSelected ? 2 : 1,
        depth: (f00.depth + f10.depth + f11.depth + f01.depth) / 4 - 8,
      });

      // Extruded Cutaway Walls (tall on back edges, low glass rail on outdoor decks)
      const hWall = room.isOutdoor ? 0.65 : 1.75;
      const isGlass = Boolean(room.isOutdoor);
      const wallTop = isGlass ? '#7DD3FC' : isSelected ? '#F5E6C8' : '#E8E4DC';
      const wallLeft = isGlass ? '#38BDF8' : '#CBD5E1';
      const wallRight = isGlass ? '#0284C7' : '#94A3B8';
      const wallOpacity = isGlass ? 0.42 : 0.96;

      // North wall segment
      pushBox({
        id: `w-n-${room.id}`,
        roomId: room.id,
        x0: room.x,
        y0: room.y,
        x1: room.x + room.w,
        y1: room.y + wallThick,
        z0: 0,
        z1: hWall,
        topFill: wallTop,
        leftFill: wallLeft,
        rightFill: wallRight,
        stroke: isGlass ? '#7DD3FC' : '#64748B',
        opacity: wallOpacity,
      });

      // West wall segment
      pushBox({
        id: `w-w-${room.id}`,
        roomId: room.id,
        x0: room.x,
        y0: room.y,
        x1: room.x + wallThick,
        y1: room.y + room.h,
        z0: 0,
        z1: hWall,
        topFill: wallTop,
        leftFill: wallLeft,
        rightFill: wallRight,
        stroke: isGlass ? '#7DD3FC' : '#64748B',
        opacity: wallOpacity,
      });

      // Outer East & South low cutaway lip / balcony glass rail
      const frontLipH = room.isOutdoor ? 0.65 : 0.48;
      if (room.x + room.w >= plan.widthM - 0.05) {
        pushBox({
          id: `w-e-${room.id}`,
          roomId: room.id,
          x0: room.x + room.w - wallThick,
          y0: room.y,
          x1: room.x + room.w,
          y1: room.y + room.h,
          z0: 0,
          z1: room.isOutdoor ? 0.65 : 1.35,
          topFill: wallTop,
          leftFill: wallLeft,
          rightFill: wallRight,
          stroke: isGlass ? '#7DD3FC' : '#64748B',
          opacity: wallOpacity,
        });
      }
      if (room.y + room.h >= plan.depthM - 0.05) {
        pushBox({
          id: `w-s-${room.id}`,
          roomId: room.id,
          x0: room.x,
          y0: room.y + room.h - wallThick * 0.7,
          x1: room.x + room.w,
          y1: room.y + room.h,
          z0: 0,
          z1: frontLipH,
          topFill: isGlass ? '#7DD3FC' : wallTop,
          leftFill: isGlass ? '#38BDF8' : wallLeft,
          rightFill: isGlass ? '#0284C7' : wallRight,
          stroke: isGlass ? '#7DD3FC' : '#64748B',
          opacity: isGlass ? 0.45 : 0.9,
        });
      }

      // 3. 3D Extruded Furniture Prisms inside each room
      for (const f of room.furniture) {
        const fx0 = room.x + f.rx * room.w;
        const fy0 = room.y + f.ry * room.h;
        const fx1 = fx0 + f.rw * room.w;
        const fy1 = fy0 + f.rh * room.h;
        const palette = FURNITURE_COLORS[f.kind] ?? FURNITURE_COLORS.coffee_table;
        const isGlassPart = f.kind === 'shower_glass' || f.kind === 'pool';

        pushBox({
          id: `furn-${room.id}-${f.kind}-${f.rx}`,
          roomId: room.id,
          x0: fx0,
          y0: fy0,
          x1: fx1,
          y1: fy1,
          z0: 0.02,
          z1: Math.min(f.heightM, 1.45),
          topFill: palette.top,
          leftFill: palette.left,
          rightFill: palette.right,
          stroke: isGlassPart ? '#7DD3FC' : 'rgba(15,23,42,0.45)',
          opacity: f.kind === 'shower_glass' ? 0.52 : 0.98,
        });
      }
    }

    // Painter's algorithm sort: farthest to nearest
    polys.sort((a, b) => a.depth - b.depth);

    // Floating room callout pins positioned cleanly above room center
    const roomLabels = plan.rooms.map((room) => {
      const p = project({
        x: room.x + room.w / 2,
        y: room.y + room.h / 2,
        z: room.isOutdoor ? 0.7 : 1.55,
      });
      return {
        id: room.id,
        label: locale === 'ar' ? room.nameAr : room.nameEn,
        areaSqft: room.areaSqft,
        sx: p.sx,
        sy: p.sy,
        isSelected: room.id === activeRoomId,
      };
    });

    return { polygons: polys, labels: roomLabels };
  }, [plan, activeRoomId, orbitDeg, tiltDeg, locale, cx, cy]);

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="w-full h-full select-none cursor-grab active:cursor-grabbing touch-none"
      role="img"
      aria-label="Interactive 3D Extruded Architectural Dollhouse Floor Plan"
      onPointerDown={(e) => {
        dragRef.current = {
          active: true,
          startX: e.clientX,
          startOrbit: orbitDeg,
        };
      }}
      onPointerMove={(e) => {
        if (!dragRef.current.active) return;
        const delta = e.clientX - dragRef.current.startX;
        const next = Math.round(dragRef.current.startOrbit + delta * 0.45);
        onOrbitChange(((next % 360) + 360) % 360);
      }}
      onPointerUp={() => {
        dragRef.current.active = false;
      }}
      onPointerLeave={() => {
        dragRef.current.active = false;
      }}
    >
      <defs>
        <radialGradient id="studio-glow" cx="50%" cy="46%" r="58%">
          <stop offset="0%" stopColor="#1D2636" />
          <stop offset="100%" stopColor="#0A0E15" />
        </radialGradient>
      </defs>

      <rect width={vbW} height={vbH} fill="url(#studio-glow)" />

      {/* Depth-Sorted 3D Extruded Architecture & Furniture */}
      {polygons.map((poly) => (
        <polygon
          key={poly.id}
          points={poly.points}
          fill={poly.fill}
          stroke={poly.stroke}
          strokeWidth={poly.strokeWidth ?? 0.75}
          fillOpacity={poly.opacity ?? 1}
          strokeLinejoin="round"
          className={poly.roomId ? 'cursor-pointer' : undefined}
          onClick={poly.roomId ? () => onSelectRoom(poly.roomId!) : undefined}
        />
      ))}

      {/* Clean Floating Room Callout Pills */}
      {labels.map((lb) => (
        <g
          key={lb.id}
          data-testid={`floorplan-room-${lb.id}`}
          transform={`translate(${lb.sx.toFixed(1)}, ${lb.sy.toFixed(1)})`}
          className="cursor-pointer"
          onClick={() => onSelectRoom(lb.id)}
        >
          <rect
            x="-66"
            y="-16"
            width="132"
            height="30"
            rx="5"
            fill={lb.isSelected ? 'rgba(143, 106, 46, 0.95)' : 'rgba(11, 16, 24, 0.84)'}
            stroke={lb.isSelected ? '#FDE68A' : 'rgba(212, 175, 106, 0.5)'}
            strokeWidth="1"
          />
          <text
            y="-2"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="9.5"
            fontWeight="600"
          >
            {lb.label.length > 20 ? `${lb.label.slice(0, 18)}…` : lb.label}
          </text>
          <text
            y="9"
            textAnchor="middle"
            fill={lb.isSelected ? '#FFFBEB' : '#D4AF6A'}
            fontFamily="monospace"
            fontSize="8.5"
          >
            {lb.areaSqft.toLocaleString()} ft²
          </text>
        </g>
      ))}
    </svg>
  );
}
