'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type {
  ArchitecturalFloorPlan,
  FloorPlanRoom,
  RoomFurniture,
} from '@/lib/floorplan-data';

interface FloorPlan3DWebGLProps {
  plan: ArchitecturalFloorPlan;
  activeRoomId: string;
  focusTrigger: number;
  resetSignal: number;
  onSelectRoom: (id: string) => void;
  onWebglFallback: () => void;
}

function makeWoodTexture(baseHex: string, plankHex: string, isDeck = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  const plankH = isDeck ? 32 : 42;
  for (let y = 0; y < 512; y += plankH) {
    ctx.fillStyle = (y / plankH) % 2 === 0 ? baseHex : plankHex;
    ctx.fillRect(0, y, 512, plankH - 2);
    // Subtle wood grain lines
    ctx.strokeStyle = 'rgba(60, 40, 20, 0.08)';
    ctx.lineWidth = 1;
    for (let g = 4; g < plankH - 3; g += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y + g);
      ctx.lineTo(512, y + g);
      ctx.stroke();
    }
    // Plank seam
    ctx.fillStyle = isDeck ? 'rgba(20, 15, 10, 0.45)' : 'rgba(85, 62, 38, 0.25)';
    ctx.fillRect(0, y + plankH - 2, 512, 2);
    if (!isDeck) {
      const jointX = ((y * 7) % 380) + 60;
      ctx.fillRect(jointX, y, 2, plankH);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(2.5, 2.5);
  return tex;
}

function makeMarbleTexture(tint = '#EDEAE4'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, 512, 512);

  // Soft marble veining
  ctx.strokeStyle = 'rgba(130, 138, 150, 0.16)';
  for (let i = 0; i < 18; i++) {
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    let x = (i * 53) % 512;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < 512) {
      y += 42;
      x += Math.sin(i + y * 0.02) * 26;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Tile grout grid
  ctx.strokeStyle = 'rgba(120, 126, 135, 0.22)';
  ctx.lineWidth = 1.5;
  for (let p = 0; p <= 512; p += 128) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(2, 2);
  return tex;
}

function addBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  castShadow = true,
  receiveShadow = true
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  parent.add(mesh);
  return mesh;
}

function addPlant(
  parent: THREE.Object3D,
  x: number,
  z: number,
  mats: Record<string, THREE.Material>,
  scale = 1
) {
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18 * scale, 0.13 * scale, 0.36 * scale, 14),
    mats.plantPot
  );
  pot.position.set(x, 0.18 * scale, z);
  pot.castShadow = true;
  parent.add(pot);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025 * scale, 0.03 * scale, 0.55 * scale, 8),
    mats.plantStem
  );
  stem.position.set(x, 0.52 * scale, z);
  parent.add(stem);

  const canopyPositions = [
    [0, 0.85, 0, 0.24],
    [0.12, 0.76, 0.08, 0.16],
    [-0.12, 0.78, -0.07, 0.17],
    [0.04, 0.96, -0.06, 0.15],
  ];
  for (const [dx, dy, dz, r] of canopyPositions) {
    const foliage = new THREE.Mesh(
      new THREE.DodecahedronGeometry(r * scale, 1),
      mats.plantLeaf
    );
    foliage.position.set(x + dx * scale, dy * scale, z + dz * scale);
    foliage.castShadow = true;
    parent.add(foliage);
  }
}

function buildFurnitureMesh(
  f: RoomFurniture,
  room: FloorPlanRoom,
  offsetX: number,
  offsetZ: number,
  mats: Record<string, THREE.Material>
): THREE.Group {
  const g = new THREE.Group();
  const fw = f.rw * room.w;
  const fd = f.rh * room.h;
  const cx = room.x + f.rx * room.w + fw / 2 - offsetX;
  const cz = room.y + f.ry * room.h + fd / 2 - offsetZ;
  g.position.set(cx, 0, cz);

  switch (f.kind) {
    case 'bed_king': {
      // Soft woven area rug beneath bed
      addBox(g, fw * 1.24, 0.02, fd * 1.15, 0, 0.01, fd * 0.06, mats.rug, false, true);
      // Oak platform bed frame
      addBox(g, fw, 0.24, fd, 0, 0.12, 0, mats.oak);
      // Tall upholstered headboard
      addBox(g, fw * 1.06, 1.05, 0.14, 0, 0.525, -fd / 2 + 0.07, mats.fabricDark);
      // Crisp white mattress
      addBox(g, fw * 0.94, 0.24, fd * 0.9, 0, 0.34, 0.05, mats.linen);
      // Navy luxury duvet cover (lower 65%)
      addBox(g, fw * 0.96, 0.26, fd * 0.62, 0, 0.35, fd * 0.16, mats.duvetNavy);
      // Champagne throw runner
      addBox(g, fw * 0.97, 0.27, fd * 0.18, 0, 0.355, fd * 0.34, mats.goldAccent);
      // Two plump pillows
      addBox(g, fw * 0.38, 0.14, fd * 0.2, -fw * 0.23, 0.51, -fd * 0.28, mats.pillow);
      addBox(g, fw * 0.38, 0.14, fd * 0.2, fw * 0.23, 0.51, -fd * 0.28, mats.pillow);
      // Twin nightstands + glowing warm brass lamps
      const nsOffset = fw / 2 + 0.24;
      for (const side of [-1, 1]) {
        addBox(g, 0.38, 0.44, 0.38, side * nsOffset, 0.22, -fd / 2 + 0.22, mats.oak);
        const shade = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.12, 0.18, 12),
          mats.lampGlow
        );
        shade.position.set(side * nsOffset, 0.56, -fd / 2 + 0.22);
        g.add(shade);
      }
      break;
    }

    case 'sofa_l': {
      // Woven rug
      addBox(g, fw * 1.15, 0.02, fd * 1.35, 0, 0.01, fd * 0.15, mats.rug, false, true);
      // Main sofa body + cushions
      const mainD = Math.min(fd * 0.46, 0.92);
      addBox(g, fw, 0.34, mainD, 0, 0.17, -fd / 2 + mainD / 2, mats.sofaFabric);
      addBox(g, fw, 0.42, 0.2, 0, 0.52, -fd / 2 + 0.1, mats.sofaFabric);
      // Chaise return arm
      const chaiseW = Math.min(fw * 0.36, 0.9);
      addBox(g, chaiseW, 0.34, fd, -fw / 2 + chaiseW / 2, 0.17, 0, mats.sofaFabric);
      // Accent bronze throw pillows
      addBox(g, 0.28, 0.24, 0.12, -fw * 0.28, 0.46, -fd / 2 + 0.24, mats.goldAccent);
      addBox(g, 0.28, 0.24, 0.12, fw * 0.28, 0.46, -fd / 2 + 0.24, mats.duvetNavy);
      // Potted indoor plant beside sofa
      addPlant(g, fw / 2 + 0.26, -fd / 2 + 0.25, mats, 0.9);
      break;
    }

    case 'coffee_table': {
      addBox(g, fw, 0.06, fd, 0, 0.38, 0, mats.marbleTop);
      addBox(g, fw * 0.72, 0.35, fd * 0.6, 0, 0.175, 0, mats.oakDark);
      break;
    }

    case 'kitchen_counter': {
      // Matte oak base cabinetry
      addBox(g, fw, 0.86, fd, 0, 0.43, 0, mats.oak);
      // Calacatta marble countertop
      addBox(g, fw + 0.04, 0.06, fd + 0.04, 0, 0.89, 0, mats.marbleTop);
      // Black glass induction cooktop
      addBox(g, Math.min(fw * 0.3, 0.72), 0.02, fd * 0.65, fw * 0.2, 0.93, 0, mats.darkGlass);
      // Stainless sink basin
      addBox(g, Math.min(fw * 0.24, 0.6), 0.02, fd * 0.55, -fw * 0.22, 0.93, 0, mats.chrome);
      // Tall refrigerator column at right end
      addBox(g, Math.min(fw * 0.24, 0.7), 1.75, fd * 0.98, fw / 2 - Math.min(fw * 0.12, 0.35), 0.875, 0, mats.stainless);
      break;
    }

    case 'kitchen_island': {
      addBox(g, fw, 0.86, fd, 0, 0.43, 0, mats.oakDark);
      addBox(g, fw + 0.06, 0.07, fd + 0.08, 0, 0.895, 0, mats.marbleTop);
      // Two bar stools on front side
      for (const tx of [-0.25, 0.25]) {
        const sx = tx * fw;
        const sz = fd / 2 + 0.28;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.62, 10), mats.charcoal);
        leg.position.set(sx, 0.31, sz);
        g.add(leg);
        const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.08, 16), mats.goldAccent);
        seat.position.set(sx, 0.64, sz);
        seat.castShadow = true;
        g.add(seat);
      }
      break;
    }

    case 'dining_table':
    case 'conference_table': {
      addBox(g, fw, 0.07, fd, 0, 0.74, 0, mats.oakDark);
      addBox(g, fw * 0.16, 0.72, fd * 0.5, -fw * 0.28, 0.36, 0, mats.charcoal);
      addBox(g, fw * 0.16, 0.72, fd * 0.5, fw * 0.28, 0.36, 0, mats.charcoal);
      // Dining chairs along both sides
      for (const tz of [-0.32, 0, 0.32]) {
        for (const side of [-1, 1]) {
          const cxPos = side * (fw / 2 + 0.28);
          addBox(g, 0.38, 0.44, 0.38, cxPos, 0.22, tz * fd, mats.sofaFabric);
          addBox(g, 0.08, 0.42, 0.38, cxPos + side * 0.16, 0.6, tz * fd, mats.sofaFabric);
        }
      }
      break;
    }

    case 'shower_glass': {
      // Recessed stone shower tray
      addBox(g, fw, 0.06, fd, 0, 0.03, 0, mats.marbleTop);
      // Frameless clear glass partition panel
      addBox(g, 0.04, 1.85, fd, -fw / 2 + 0.02, 0.95, 0, mats.glassClear, false, false);
      // Chrome rain shower column
      addBox(g, 0.05, 1.7, 0.05, fw / 2 - 0.08, 0.88, 0, mats.chrome);
      addBox(g, 0.28, 0.03, 0.28, fw / 2 - 0.22, 1.72, 0, mats.chrome);
      break;
    }

    case 'vanity': {
      addBox(g, fw, 0.55, fd, 0, 0.52, 0, mats.oak);
      addBox(g, fw + 0.02, 0.05, fd + 0.02, 0, 0.82, 0, mats.marbleTop);
      const basin = new THREE.Mesh(
        new THREE.CylinderGeometry(Math.min(fw, fd) * 0.28, Math.min(fw, fd) * 0.22, 0.12, 16),
        mats.linen
      );
      basin.position.set(0, 0.9, 0);
      g.add(basin);
      break;
    }

    case 'wc': {
      addBox(g, fw * 0.85, 0.72, fd * 0.34, 0, 0.36, -fd * 0.3, mats.linen);
      const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(fw * 0.38, fw * 0.32, 0.4, 16),
        mats.linen
      );
      bowl.position.set(0, 0.2, fd * 0.14);
      g.add(bowl);
      break;
    }

    case 'pool': {
      // Recessed turquoise infinity pool
      addBox(g, fw, 0.18, fd, 0, 0.09, 0, mats.poolWater, false, true);
      addBox(g, fw + 0.2, 0.14, 0.12, 0, 0.07, -fd / 2 - 0.06, mats.marbleTop);
      addBox(g, fw + 0.2, 0.14, 0.12, 0, 0.07, fd / 2 + 0.06, mats.marbleTop);
      break;
    }

    case 'loungers': {
      for (const tx of [-0.26, 0.26]) {
        const lx = tx * fw;
        addBox(g, fw * 0.38, 0.24, fd * 0.88, lx, 0.12, 0, mats.oakDark);
        addBox(g, fw * 0.36, 0.09, fd * 0.82, lx, 0.28, 0, mats.linen);
        // Angled backrest
        const back = addBox(g, fw * 0.36, 0.09, fd * 0.34, lx, 0.42, -fd * 0.3, mats.linen);
        back.rotation.x = 0.55;
      }
      addPlant(g, -fw / 2 - 0.22, 0, mats, 0.8);
      break;
    }

    case 'wardrobe': {
      addBox(g, fw, 1.85, fd, 0, 0.925, 0, mats.oak);
      addBox(g, fw * 0.96, 1.72, 0.02, 0, 0.92, fd / 2 + 0.01, mats.oakDark);
      break;
    }

    default: {
      addBox(g, fw, f.heightM, fd, 0, f.heightM / 2, 0, mats.oak);
      break;
    }
  }

  return g;
}

export function FloorPlan3DWebGL({
  plan,
  activeRoomId,
  focusTrigger,
  resetSignal,
  onSelectRoom,
  onWebglFallback,
}: FloorPlan3DWebGLProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const defaultCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(8, 8, 8));
  const highlightGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
  const roomFocusTargetsRef = useRef<
    Map<string, { target: THREE.Vector3; camPos: THREE.Vector3; lightPos: THREE.Vector3 }>
  >(new Map());
  const roomLightRef = useRef<THREE.PointLight | null>(null);
  const flightGoalRef = useRef<{
    target: THREE.Vector3;
    camPos: THREE.Vector3;
    active: boolean;
  }>({
    target: new THREE.Vector3(0, 0.4, 0),
    camPos: new THREE.Vector3(8, 8, 8),
    active: false,
  });
  const activeRoomIdRef = useRef<string>(activeRoomId);
  activeRoomIdRef.current = activeRoomId;
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      onWebglFallback();
      return;
    }

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#131822');

    // Auto-frame camera so the architectural dollhouse fills ~86% of the viewport without clipping
    const maxDim = Math.max(plan.widthM, plan.depthM);
    const dist = maxDim * 1.06;
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 120);
    camera.position.set(dist * 0.66, dist * 0.86, dist * 0.84);
    defaultCamPosRef.current.copy(camera.position);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = Math.min(maxDim * 0.3, 2.4);
    controls.maxDistance = maxDim * 2.4;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.target.set(0, 0.4, 0);
    controls.update();
    controlsRef.current = controls;

    // Cancel camera glide immediately whenever the user manually orbits or zooms
    const handleControlsStart = () => {
      flightGoalRef.current.active = false;
    };
    controls.addEventListener('start', handleControlsStart);

    // Architectural Studio Lighting Rig
    const hemi = new THREE.HemisphereLight('#E6F0FF', '#6E5A44', 1.15);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight('#FFF6E8', 2.05);
    sun.position.set(maxDim * 0.9, maxDim * 1.5, maxDim * 0.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = maxDim * 5;
    const frustum = maxDim * 0.95;
    sun.shadow.camera.left = -frustum;
    sun.shadow.camera.right = frustum;
    sun.shadow.camera.top = frustum;
    sun.shadow.camera.bottom = -frustum;
    sun.shadow.bias = -0.0004;
    scene.add(sun);

    const fillLight = new THREE.DirectionalLight('#BDD7FF', 0.55);
    fillLight.position.set(-maxDim, maxDim * 0.8, -maxDim * 0.6);
    scene.add(fillLight);

    const warmInterior = new THREE.PointLight('#FFCF86', 1.2, maxDim * 1.2);
    warmInterior.position.set(0, 2.2, 0);
    scene.add(warmInterior);

    // Dedicated active-room accent spotlight that glides above whichever room is selected
    const roomSpot = new THREE.PointLight('#FFE7B8', 2.2, Math.max(maxDim * 0.85, 7));
    roomSpot.position.set(0, 2.5, 0);
    scene.add(roomSpot);
    roomLightRef.current = roomSpot;

    // Procedural PBR Textures & Materials
    const oakTex = makeWoodTexture('#C7A77F', '#BC9B72', false);
    const deckTex = makeWoodTexture('#9A7853', '#8D6C49', true);
    const marbleTex = makeMarbleTexture('#ECE9E2');
    const spaTex = makeMarbleTexture('#D6E0E6');

    const mats: Record<string, THREE.Material> = {
      wallPlaster: new THREE.MeshStandardMaterial({ color: '#F3EFE7', roughness: 0.86, metalness: 0.02 }),
      wallCap: new THREE.MeshStandardMaterial({ color: '#1F2633', roughness: 0.55, metalness: 0.15 }),
      basePlinth: new THREE.MeshStandardMaterial({ color: '#1E2430', roughness: 0.75 }),
      oakFloor: new THREE.MeshStandardMaterial({ map: oakTex, roughness: 0.52, metalness: 0.04 }),
      marbleFloor: new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.28, metalness: 0.08 }),
      spaFloor: new THREE.MeshStandardMaterial({ map: spaTex, roughness: 0.35, metalness: 0.06 }),
      deckFloor: new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.72, metalness: 0.02 }),
      oak: new THREE.MeshStandardMaterial({ color: '#A98359', roughness: 0.62 }),
      oakDark: new THREE.MeshStandardMaterial({ color: '#6E5035', roughness: 0.68 }),
      fabricDark: new THREE.MeshStandardMaterial({ color: '#39414E', roughness: 0.9 }),
      sofaFabric: new THREE.MeshStandardMaterial({ color: '#D8D3C8', roughness: 0.92 }),
      linen: new THREE.MeshStandardMaterial({ color: '#F8F7F4', roughness: 0.85 }),
      pillow: new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.8 }),
      duvetNavy: new THREE.MeshStandardMaterial({ color: '#2B4C6B', roughness: 0.88 }),
      goldAccent: new THREE.MeshStandardMaterial({ color: '#C8A45D', roughness: 0.42, metalness: 0.35 }),
      rug: new THREE.MeshStandardMaterial({ color: '#DED7CA', roughness: 0.96 }),
      marbleTop: new THREE.MeshStandardMaterial({ color: '#F4F2ED', roughness: 0.22, metalness: 0.08 }),
      darkGlass: new THREE.MeshStandardMaterial({ color: '#11161F', roughness: 0.12, metalness: 0.4 }),
      chrome: new THREE.MeshStandardMaterial({ color: '#CBD5E1', roughness: 0.18, metalness: 0.85 }),
      stainless: new THREE.MeshStandardMaterial({ color: '#B8C1CC', roughness: 0.3, metalness: 0.7 }),
      charcoal: new THREE.MeshStandardMaterial({ color: '#252B36', roughness: 0.5, metalness: 0.3 }),
      lampGlow: new THREE.MeshStandardMaterial({
        color: '#FFF3D6',
        emissive: '#F5B95B',
        emissiveIntensity: 0.85,
        roughness: 0.4,
      }),
      glassClear: new THREE.MeshPhysicalMaterial({
        color: '#B8E4F9',
        transparent: true,
        opacity: 0.26,
        roughness: 0.08,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
      poolWater: new THREE.MeshPhysicalMaterial({
        color: '#1AA7D8',
        transparent: true,
        opacity: 0.82,
        roughness: 0.08,
        metalness: 0.12,
      }),
      selectedGlow: new THREE.MeshStandardMaterial({
        color: '#E7C271',
        emissive: '#C99842',
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.24,
      }),
      selectedBorder: new THREE.MeshStandardMaterial({
        color: '#FFE099',
        emissive: '#D9A74A',
        emissiveIntensity: 1.15,
        roughness: 0.25,
        metalness: 0.4,
      }),
      plantPot: new THREE.MeshStandardMaterial({ color: '#D8D2C8', roughness: 0.75 }),
      plantStem: new THREE.MeshStandardMaterial({ color: '#5C4632', roughness: 0.9 }),
      plantLeaf: new THREE.MeshStandardMaterial({ color: '#3E6B48', roughness: 0.7 }),
    };

    const offsetX = plan.widthM / 2;
    const offsetZ = plan.depthM / 2;

    // Architectural Presentation Base Plinth
    const plinth = addBox(
      scene,
      plan.widthM + 0.55,
      0.32,
      plan.depthM + 0.55,
      0,
      -0.17,
      0,
      mats.basePlinth,
      true,
      true
    );
    plinth.receiveShadow = true;

    // Subtle ground shadow catcher plane
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(maxDim * 6, maxDim * 6),
      new THREE.ShadowMaterial({ opacity: 0.35 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.34;
    ground.receiveShadow = true;
    scene.add(ground);

    const clickableFloors: THREE.Object3D[] = [];
    const highlightMap = new Map<string, THREE.Group>();
    highlightGroupsRef.current = highlightMap;
    const focusMap = new Map<
      string,
      { target: THREE.Vector3; camPos: THREE.Vector3; lightPos: THREE.Vector3 }
    >();
    roomFocusTargetsRef.current = focusMap;
    const wallT = 0.16;

    const addWallSegment = (
      x0: number,
      z0: number,
      x1: number,
      z1: number,
      h: number,
      isGlass = false
    ) => {
      const lenX = Math.abs(x1 - x0);
      const lenZ = Math.abs(z1 - z0);
      const cx = (x0 + x1) / 2 - offsetX;
      const cz = (z0 + z1) / 2 - offsetZ;
      if (isGlass) {
        addBox(scene, Math.max(lenX, 0.04), h, Math.max(lenZ, 0.04), cx, h / 2, cz, mats.glassClear, false, false);
        // Slim architectural bronze handrail on top of glass balustrade
        addBox(scene, Math.max(lenX, 0.06), 0.05, Math.max(lenZ, 0.06), cx, h + 0.02, cz, mats.goldAccent, true, false);
      } else {
        addBox(scene, Math.max(lenX, wallT), h, Math.max(lenZ, wallT), cx, h / 2, cz, mats.wallPlaster);
        // Dark charcoal architectural cutaway cap on wall top
        addBox(scene, Math.max(lenX, wallT) + 0.01, 0.04, Math.max(lenZ, wallT) + 0.01, cx, h + 0.02, cz, mats.wallCap, false, false);
      }
    };

    // Build Rooms: Textured Floor + Cutaway Architectural Walls + Sculpted 3D Furniture
    for (const room of plan.rooms) {
      const floorMat =
        room.isOutdoor
          ? mats.deckFloor
          : room.zone === 'kitchen'
            ? mats.marbleFloor
            : room.zone === 'bath'
              ? mats.spaFloor
              : mats.oakFloor;

      const floorMesh = addBox(
        scene,
        room.w - 0.02,
        0.05,
        room.h - 0.02,
        room.x + room.w / 2 - offsetX,
        -0.01,
        room.y + room.h / 2 - offsetZ,
        floorMat,
        false,
        true
      );
      floorMesh.userData = { roomId: room.id };
      clickableFloors.push(floorMesh);

      // Vivid active-room highlight group (soft gold wash + glowing perimeter frame)
      const roomCenterX = room.x + room.w / 2 - offsetX;
      const roomCenterZ = room.y + room.h / 2 - offsetZ;
      const highlightGroup = new THREE.Group();
      addBox(
        highlightGroup,
        room.w - 0.18,
        0.02,
        room.h - 0.18,
        roomCenterX,
        0.025,
        roomCenterZ,
        mats.selectedGlow,
        false,
        false
      );
      const borderT = 0.07;
      const borderH = 0.065;
      const bw = Math.max(room.w - 0.22, 0.4);
      const bh = Math.max(room.h - 0.22, 0.4);
      addBox(highlightGroup, bw, borderH, borderT, roomCenterX, 0.05, roomCenterZ - bh / 2, mats.selectedBorder, false, false);
      addBox(highlightGroup, bw, borderH, borderT, roomCenterX, 0.05, roomCenterZ + bh / 2, mats.selectedBorder, false, false);
      addBox(highlightGroup, borderT, borderH, bh, roomCenterX - bw / 2, 0.05, roomCenterZ, mats.selectedBorder, false, false);
      addBox(highlightGroup, borderT, borderH, bh, roomCenterX + bw / 2, 0.05, roomCenterZ, mats.selectedBorder, false, false);
      highlightGroup.visible = room.id === activeRoomIdRef.current;
      scene.add(highlightGroup);
      highlightMap.set(room.id, highlightGroup);

      // Compute unobstructed close-up camera pose for this exact room
      const isRightSide = room.x + room.w >= plan.widthM - 0.1 && room.x > 0.2;
      const aspectRatio = Math.max(room.w, room.h) / Math.max(Math.min(room.w, room.h), 1);
      const span =
        aspectRatio > 2.6
          ? Math.max(Math.min(room.w, room.h) * 2.15, Math.max(room.w, room.h) * 0.68)
          : Math.max(room.w, room.h);
      const focusDist = Math.max(span * 1.12, 3.6);
      const dirX = isRightSide ? -0.46 : 0.42;
      focusMap.set(room.id, {
        target: new THREE.Vector3(roomCenterX, 0.42, roomCenterZ),
        camPos: new THREE.Vector3(
          roomCenterX + focusDist * dirX,
          Math.max(focusDist * 0.88, 3.3),
          roomCenterZ + focusDist * 0.86
        ),
        lightPos: new THREE.Vector3(roomCenterX, 2.4, roomCenterZ),
      });

      const hBack = room.isOutdoor ? 0.95 : 1.85;
      const hSide = room.isOutdoor ? 0.95 : 1.55;

      // North & West walls (back cutaway height)
      if (!room.isOutdoor) {
        addWallSegment(room.x, room.y, room.x + room.w, room.y, hBack, false);
        addWallSegment(room.x, room.y, room.x, room.y + room.h, hSide, false);
      } else {
        // Outdoor terrace perimeter glass railing
        addWallSegment(room.x, room.y + room.h, room.x + room.w, room.y + room.h, 0.95, true);
        addWallSegment(room.x, room.y, room.x, room.y + room.h, 0.95, true);
        addWallSegment(room.x + room.w, room.y, room.x + room.w, room.y + room.h, 0.95, true);
      }

      // East outer wall
      if (!room.isOutdoor && room.x + room.w >= plan.widthM - 0.05) {
        addWallSegment(room.x + room.w, room.y, room.x + room.w, room.y + room.h, hSide, false);
      }

      // Sliding glass divider between living/suite and outdoor balcony
      if (!room.isOutdoor && room.windowSide === 'bottom') {
        addWallSegment(room.x + 0.3, room.y + room.h, room.x + room.w - 0.3, room.y + room.h, 1.85, true);
      }

      // Multi-part sculpted 3D furniture inside room
      for (const f of room.furniture) {
        const furnGroup = buildFurnitureMesh(f, room, offsetX, offsetZ, mats);
        scene.add(furnGroup);
      }
    }

    // Raycaster for direct clicking on rooms in 3D
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 6) {
        return; // Ignore drags
      }
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableFloors, false);
      const roomId = hits[0]?.object?.userData?.roomId as string | undefined;
      if (roomId) onSelectRoom(roomId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableFloors, false);
      const roomId = hits[0]?.object?.userData?.roomId as string | undefined;
      setHoveredRoom(roomId ?? null);
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);

    // ResizeObserver for crisp full-container & fullscreen responsiveness
    const ro = new ResizeObserver(() => {
      if (!mountRef.current) return;
      const nw = Math.max(mountRef.current.clientWidth, 240);
      const nh = Math.max(mountRef.current.clientHeight, 240);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(container);

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (flightGoalRef.current.active) {
        camera.position.lerp(flightGoalRef.current.camPos, 0.09);
        controls.target.lerp(flightGoalRef.current.target, 0.09);
        if (
          camera.position.distanceTo(flightGoalRef.current.camPos) < 0.04 &&
          controls.target.distanceTo(flightGoalRef.current.target) < 0.03
        ) {
          camera.position.copy(flightGoalRef.current.camPos);
          controls.target.copy(flightGoalRef.current.target);
          flightGoalRef.current.active = false;
        }
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.removeEventListener('start', handleControlsStart);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      controls.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
        }
      });
      Object.values(mats).forEach((m) => m.dispose());
      oakTex.dispose();
      deckTex.dispose();
      marbleTex.dispose();
      spaTex.dispose();
      highlightMap.clear();
      focusMap.clear();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // Toggle active room border + spotlight cleanly AND fly camera directly to that room on selection
  useEffect(() => {
    for (const [id, group] of highlightGroupsRef.current.entries()) {
      group.visible = id === activeRoomId;
    }
    const focusPose = roomFocusTargetsRef.current.get(activeRoomId);
    if (focusPose) {
      if (roomLightRef.current) {
        roomLightRef.current.position.copy(focusPose.lightPos);
      }
      if (focusTrigger > 0) {
        flightGoalRef.current = {
          target: focusPose.target.clone(),
          camPos: focusPose.camPos.clone(),
          active: true,
        };
      }
    }
  }, [activeRoomId, focusTrigger]);

  // Smoothly fly back out to full-floorplate overview when user clicks Reset / Full View
  useEffect(() => {
    if (resetSignal > 0 && cameraRef.current && controlsRef.current) {
      flightGoalRef.current = {
        target: new THREE.Vector3(0, 0.4, 0),
        camPos: defaultCamPosRef.current.clone(),
        active: true,
      };
    }
  }, [resetSignal]);

  return (
    <div
      ref={mountRef}
      className={`absolute inset-0 w-full h-full ${hoveredRoom ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
      aria-label="Interactive Three.js 3D Architectural Dollhouse"
    />
  );
}
