'use client';

import React from 'react';
import type {
  ArchitecturalFloorPlan,
  FloorPlanRoom,
  RoomFurniture,
} from '@/lib/floorplan-data';

interface FloorPlan2DBlueprintProps {
  plan: ArchitecturalFloorPlan;
  activeRoomId: string;
  locale: string;
  onSelectRoom: (id: string) => void;
}

const ZONE_FILL: Record<FloorPlanRoom['zone'], string> = {
  living: '#1A202C',
  bedroom: '#181F2D',
  kitchen: '#162425',
  bath: '#15222E',
  outdoor: '#122421',
  utility: '#1B1F27',
  commercial: '#1A202C',
};

function renderFurniture2D(f: RoomFurniture, room: FloorPlanRoom, scale: number, ox: number, oy: number) {
  const x = ox + (room.x + f.rx * room.w) * scale;
  const y = oy + (room.y + f.ry * room.h) * scale;
  const w = f.rw * room.w * scale;
  const h = f.rh * room.h * scale;
  const stroke = 'rgba(212, 175, 106, 0.72)';
  const fill = 'rgba(212, 175, 106, 0.11)';

  switch (f.kind) {
    case 'bed_king':
      return (
        <g key={`${room.id}-${f.kind}-${f.rx}`} stroke={stroke} fill={fill} strokeWidth="1.2">
          <rect x={x} y={y} width={w} height={h} rx="3" />
          {/* Headboard */}
          <rect x={x} y={y} width={w} height={Math.max(6, h * 0.12)} fill="rgba(212,175,106,0.35)" />
          {/* Two Pillows */}
          <rect x={x + w * 0.08} y={y + h * 0.16} width={w * 0.38} height={h * 0.18} rx="2" fill="rgba(244,245,247,0.18)" />
          <rect x={x + w * 0.54} y={y + h * 0.16} width={w * 0.38} height={h * 0.18} rx="2" fill="rgba(244,245,247,0.18)" />
          {/* Duvet fold line */}
          <line x1={x} y1={y + h * 0.45} x2={x + w} y2={y + h * 0.45} strokeDasharray="3 2" />
        </g>
      );
    case 'sofa_l':
      return (
        <g key={`${room.id}-${f.kind}-${f.rx}`} stroke={stroke} fill={fill} strokeWidth="1.2">
          <rect x={x} y={y} width={w} height={h * 0.42} rx="3" />
          <rect x={x} y={y} width={w * 0.34} height={h} rx="3" />
          <line x1={x + w * 0.34} y1={y + 4} x2={x + w * 0.34} y2={y + h * 0.42} />
          <line x1={x + w * 0.66} y1={y + 4} x2={x + w * 0.66} y2={y + h * 0.42} />
        </g>
      );
    case 'coffee_table':
      return (
        <rect
          key={`${room.id}-${f.kind}-${f.rx}`}
          x={x}
          y={y}
          width={w}
          height={h}
          rx="3"
          stroke={stroke}
          fill="rgba(244,245,247,0.08)"
          strokeWidth="1.1"
        />
      );
    case 'kitchen_counter':
      return (
        <g key={`${room.id}-${f.kind}-${f.rx}`} stroke={stroke} fill={fill} strokeWidth="1.2">
          <rect x={x} y={y} width={w} height={h} />
          {/* Double sink basin */}
          <rect x={x + w * 0.12} y={y + h * 0.2} width={w * 0.2} height={h * 0.6} rx="2" />
          {/* 4-burner hob */}
          <circle cx={x + w * 0.64} cy={y + h * 0.34} r={Math.min(w, h) * 0.12} />
          <circle cx={x + w * 0.78} cy={y + h * 0.34} r={Math.min(w, h) * 0.12} />
          <circle cx={x + w * 0.64} cy={y + h * 0.66} r={Math.min(w, h) * 0.12} />
          <circle cx={x + w * 0.78} cy={y + h * 0.66} r={Math.min(w, h) * 0.12} />
        </g>
      );
    case 'kitchen_island':
      return (
        <g key={`${room.id}-${f.kind}-${f.rx}`} stroke={stroke} fill={fill} strokeWidth="1.2">
          <rect x={x} y={y} width={w} height={h} rx="2" />
          {[0.22, 0.5, 0.78].map((t) => (
            <circle key={t} cx={x + w * t} cy={y + h + 7} r="4.5" fill="none" />
          ))}
        </g>
      );
    case 'dining_table':
    case 'conference_table':
      return (
        <g key={`${room.id}-${f.kind}-${f.rx}`} stroke={stroke} fill={fill} strokeWidth="1.2">
          <rect x={x} y={y} width={w} height={h} rx="4" />
          {[0.2, 0.5, 0.8].map((t) => (
            <React.Fragment key={t}>
              <rect x={x - 7} y={y + h * t - 5} width="5" height="10" rx="1" />
              <rect x={x + w + 2} y={y + h * t - 5} width="5" height="10" rx="1" />
            </React.Fragment>
          ))}
        </g>
      );
    case 'shower_glass':
      return (
        <g key={`${room.id}-${f.kind}-${f.rx}`} stroke="#38BDF8" fill="rgba(56,189,248,0.1)" strokeWidth="1.1">
          <rect x={x} y={y} width={w} height={h} />
          <line x1={x} y1={y} x2={x + w} y2={y + h} strokeOpacity="0.45" />
          <line x1={x + w} y1={y} x2={x} y2={y + h} strokeOpacity="0.45" />
          <circle cx={x + w / 2} cy={y + h / 2} r="3.5" fill="#38BDF8" />
        </g>
      );
    case 'vanity':
      return (
        <g key={`${room.id}-${f.kind}-${f.rx}`} stroke="#38BDF8" fill="rgba(56,189,248,0.12)" strokeWidth="1.1">
          <rect x={x} y={y} width={w} height={h} rx="2" />
          <ellipse cx={x + w / 2} cy={y + h / 2} rx={w * 0.28} ry={h * 0.28} />
        </g>
      );
    case 'wc':
      return (
        <g key={`${room.id}-${f.kind}-${f.rx}`} stroke="#38BDF8" fill="rgba(56,189,248,0.12)" strokeWidth="1.1">
          <rect x={x} y={y} width={w} height={h * 0.35} rx="1" />
          <ellipse cx={x + w / 2} cy={y + h * 0.68} rx={w * 0.42} ry={h * 0.32} />
        </g>
      );
    case 'pool':
      return (
        <g key={`${room.id}-${f.kind}-${f.rx}`} stroke="#38BDF8" fill="rgba(14,165,233,0.22)" strokeWidth="1.4">
          <rect x={x} y={y} width={w} height={h} rx="3" />
          <line x1={x + 10} y1={y + h * 0.35} x2={x + w - 10} y2={y + h * 0.35} strokeOpacity="0.45" strokeDasharray="8 6" />
          <line x1={x + 18} y1={y + h * 0.65} x2={x + w - 18} y2={y + h * 0.65} strokeOpacity="0.45" strokeDasharray="8 6" />
        </g>
      );
    case 'loungers':
      return (
        <g key={`${room.id}-${f.kind}-${f.rx}`} stroke="#34D399" fill="rgba(52,211,153,0.12)" strokeWidth="1.1">
          <rect x={x} y={y} width={w * 0.44} height={h} rx="2" />
          <rect x={x + w * 0.56} y={y} width={w * 0.44} height={h} rx="2" />
        </g>
      );
    case 'wardrobe':
      return (
        <g key={`${room.id}-${f.kind}-${f.rx}`} stroke={stroke} fill="rgba(212,175,106,0.16)" strokeWidth="1">
          <rect x={x} y={y} width={w} height={h} />
          <line x1={x} y1={y} x2={x + w} y2={y + h} strokeOpacity="0.5" />
        </g>
      );
    default:
      return (
        <rect
          key={`${room.id}-${f.kind}-${f.rx}`}
          x={x}
          y={y}
          width={w}
          height={h}
          rx="2"
          stroke={stroke}
          fill={fill}
          strokeWidth="1.1"
        />
      );
  }
}

export function FloorPlan2DBlueprint({
  plan,
  activeRoomId,
  locale,
  onSelectRoom,
}: FloorPlan2DBlueprintProps) {
  const vbW = 760;
  const vbH = 480;
  const padX = 76;
  const padY = 64;
  const scale = Math.min(
    (vbW - padX * 2) / plan.widthM,
    (vbH - padY * 2) / plan.depthM
  );
  const drawW = plan.widthM * scale;
  const drawH = plan.depthM * scale;
  const ox = (vbW - drawW) / 2;
  const oy = (vbH - drawH) / 2;

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="w-full h-full select-none"
      role="img"
      aria-label="2D Architectural CAD Floor Plan Blueprint"
    >
      <defs>
        <pattern id="cad-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path
            d="M 24 0 L 0 0 0 24"
            fill="none"
            stroke="rgba(148, 163, 184, 0.08)"
            strokeWidth="1"
          />
        </pattern>
        <pattern id="deck-planks" width="12" height="12" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="12" stroke="rgba(52, 211, 153, 0.14)" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width={vbW} height={vbH} fill="#0B1018" />
      <rect width={vbW} height={vbH} fill="url(#cad-grid)" />

      {/* Exterior Architectural Dimension Lines (Top & Left) */}
      <g stroke="#94A3B8" strokeWidth="1" fill="#CBD5E1" fontFamily="monospace" fontSize="11">
        {/* Top width dimension */}
        <line x1={ox} y1={oy - 26} x2={ox + drawW} y2={oy - 26} />
        <line x1={ox} y1={oy - 34} x2={ox} y2={oy - 14} />
        <line x1={ox + drawW} y1={oy - 34} x2={ox + drawW} y2={oy - 14} />
        <rect x={ox + drawW / 2 - 34} y={oy - 35} width="68" height="17" fill="#0B1018" stroke="none" />
        <text x={ox + drawW / 2} y={oy - 22} textAnchor="middle" stroke="none">
          {plan.widthM.toFixed(1)} m
        </text>

        {/* Left depth dimension */}
        <line x1={ox - 28} y1={oy} x2={ox - 28} y2={oy + drawH} />
        <line x1={ox - 36} y1={oy} x2={ox - 16} y2={oy} />
        <line x1={ox - 36} y1={oy + drawH} x2={ox - 16} y2={oy + drawH} />
        <text
          x={ox - 36}
          y={oy + drawH / 2}
          textAnchor="middle"
          stroke="none"
          transform={`rotate(-90 ${ox - 36} ${oy + drawH / 2})`}
        >
          {plan.depthM.toFixed(1)} m
        </text>
      </g>

      {/* Interactive Rooms */}
      {plan.rooms.map((room) => {
        const rx = ox + room.x * scale;
        const ry = oy + room.y * scale;
        const rw = room.w * scale;
        const rh = room.h * scale;
        const isSelected = room.id === activeRoomId;
        const label = locale === 'ar' ? room.nameAr : room.nameEn;

        return (
          <g
            key={room.id}
            onClick={() => onSelectRoom(room.id)}
            data-testid={`floorplan-room-${room.id}`}
            className="cursor-pointer"
          >
            {/* Floor Fill */}
            <rect
              x={rx}
              y={ry}
              width={rw}
              height={rh}
              fill={isSelected ? 'rgba(212, 175, 106, 0.22)' : ZONE_FILL[room.zone]}
              stroke={isSelected ? '#F4D58D' : '#CBD5E1'}
              strokeWidth={room.isOutdoor ? 1.8 : 3.2}
              strokeDasharray={room.isOutdoor ? '6 3' : undefined}
            />
            {room.isOutdoor ? (
              <rect x={rx} y={ry} width={rw} height={rh} fill="url(#deck-planks)" pointerEvents="none" />
            ) : null}

            {/* Architectural Furniture Blocks */}
            {room.furniture.map((f) => renderFurniture2D(f, room, scale, ox, oy))}

            {/* Window Glazing Mullions */}
            {room.windowSide === 'bottom' ? (
              <line
                x1={rx + rw * 0.14}
                y1={ry + rh}
                x2={rx + rw * 0.86}
                y2={ry + rh}
                stroke="#38BDF8"
                strokeWidth="4"
              />
            ) : room.windowSide === 'right' ? (
              <line
                x1={rx + rw}
                y1={ry + rh * 0.18}
                x2={rx + rw}
                y2={ry + rh * 0.82}
                stroke="#38BDF8"
                strokeWidth="4"
              />
            ) : null}

            {/* 90-Degree Architectural Door Swing Arc */}
            {room.doorSide === 'left' ? (
              <g stroke="#F4D58D" strokeWidth="1.2" fill="none">
                <line x1={rx} y1={ry + rh * 0.42} x2={rx} y2={ry + rh * 0.42 + 24} stroke="#0B1018" strokeWidth="5" />
                <line x1={rx} y1={ry + rh * 0.42} x2={rx + 22} y2={ry + rh * 0.42} />
                <path d={`M ${rx + 22} ${ry + rh * 0.42} A 22 22 0 0 1 ${rx} ${ry + rh * 0.42 + 22}`} strokeDasharray="3 2" />
              </g>
            ) : room.doorSide === 'top' ? (
              <g stroke="#F4D58D" strokeWidth="1.2" fill="none">
                <line x1={rx + 24} y1={ry} x2={rx + 48} y2={ry} stroke="#0B1018" strokeWidth="5" />
                <line x1={rx + 24} y1={ry} x2={rx + 24} y2={ry + 22} />
                <path d={`M ${rx + 24} ${ry + 22} A 22 22 0 0 0 ${rx + 46} ${ry}`} strokeDasharray="3 2" />
              </g>
            ) : null}

            {/* Crisp Room Label & Area Tag */}
            <g pointerEvents="none">
              <rect
                x={rx + rw / 2 - Math.min(rw * 0.46, 78)}
                y={ry + rh / 2 - 17}
                width={Math.min(rw * 0.92, 156)}
                height="34"
                rx="4"
                fill="rgba(11, 16, 24, 0.84)"
                stroke={isSelected ? '#D4AF6A' : 'rgba(255,255,255,0.14)'}
                strokeWidth="1"
              />
              <text
                x={rx + rw / 2}
                y={ry + rh / 2 - 2}
                textAnchor="middle"
                fill="#F8FAFC"
                fontSize="10.5"
                fontWeight="600"
              >
                {label.length > 24 ? `${label.slice(0, 22)}…` : label}
              </text>
              <text
                x={rx + rw / 2}
                y={ry + rh / 2 + 11}
                textAnchor="middle"
                fill="#D4AF6A"
                fontFamily="monospace"
                fontSize="9.5"
              >
                {room.dimensionsLabel} · {room.areaSqft.toLocaleString()} ft²
              </text>
            </g>
          </g>
        );
      })}

      {/* Outer Heavy Structural Boundary */}
      <rect
        x={ox}
        y={oy}
        width={drawW}
        height={drawH}
        fill="none"
        stroke="#F8FAFC"
        strokeWidth="3.5"
        pointerEvents="none"
      />

      {/* Architectural North Compass Rose */}
      <g transform={`translate(${vbW - 44}, 44)`} stroke="#D4AF6A" fill="#D4AF6A">
        <circle r="16" fill="rgba(11,16,24,0.8)" strokeWidth="1" />
        <polygon points="0,-11 4,4 0,1 -4,4" />
        <text y="-19" textAnchor="middle" fontSize="10" fontFamily="monospace" stroke="none">
          N
        </text>
      </g>
    </svg>
  );
}
