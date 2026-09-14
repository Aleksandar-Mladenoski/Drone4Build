import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Compass, 
  Battery, 
  Radio, 
  Activity, 
  Maximize2, 
  ShieldAlert, 
  RotateCcw, 
  CheckCircle, 
  Play, 
  Navigation,
  HelpCircle,
  Eye,
  Settings,
  Check,
  FileText,
  Lock,
  Unlock,
  Info,
  Map
} from 'lucide-react';
import { initSCORM, setSCORMComplete, setSCORMScore, finishSCORM } from './lib/scorm';

// ==========================================
// Types & Constants
// ==========================================
interface Waypoint {
  id: number;
  name: string;
  position: THREE.Vector3;
  description: string;
  targetRadius: number;
}

interface LogEntry {
  timestamp: string;
  text: string;
  type: 'info' | 'warn' | 'success' | 'alert';
}

const CITY_SIZE = 180;
const BLOCK_SIZE = 24;
const STREET_WIDTH = 12;

// ==========================================
// Procedural Asset Generators (In-memory)
// ==========================================
function createWindowTexture(litProbability: number = 0.5): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111827'; // Dark building color
  ctx.fillRect(0, 0, 128, 128);

  // Draw 2x2 window grid
  const margin = 12;
  const w = 44;
  const h = 44;
  const positions = [
    { x: margin, y: margin },
    { x: margin + w + 16, y: margin },
    { x: margin, y: margin + h + 16 },
    { x: margin + w + 16, y: margin + h + 16 }
  ];

  positions.forEach(pos => {
    const isLit = Math.random() < litProbability;
    ctx.fillStyle = isLit ? '#fbbf24' : '#1f2937'; // Golden yellow or deep grey/blue
    ctx.fillRect(pos.x, pos.y, w, h);
    if (isLit) {
      // Inner glass shadow / glow
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(pos.x + 4, pos.y + 4, w - 8, h - 8);
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createHelipadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Background concrete
  ctx.fillStyle = '#374151';
  ctx.fillRect(0, 0, 256, 256);

  // Outer yellow border
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(128, 128, 100, 0, Math.PI * 2);
  ctx.stroke();

  // Circle fill indicator
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(128, 128, 80, 0, Math.PI * 2);
  ctx.stroke();

  // Letter "H"
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 96px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// ==========================================
// DRONE4BUILD LOGO SVG BRANDING COMPONENT
// ==========================================
const Drone4BuildLogo = ({ className = "h-8" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 540 120" className="h-full w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Blue swooping arc */}
        <path d="M 15,80 C 80,15 170,10 200,45" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" fill="none" />
        
        {/* Quadcopter Center Hub */}
        <circle cx="110" cy="75" r="11" fill="#f97316" />
        
        {/* Quadcopter Arm Top-Right */}
        <line x1="110" y1="75" x2="150" y2="45" stroke="#f97316" strokeWidth="8" strokeLinecap="round" />
        <circle cx="150" cy="45" r="11" fill="#f97316" />
        <path d="M 135,45 A 15,15 0 1,0 165,45" stroke="#ef4444" strokeWidth="4" fill="none" />

        {/* Quadcopter Arm Bottom-Left */}
        <line x1="110" y1="75" x2="70" y2="105" stroke="#f97316" strokeWidth="8" strokeLinecap="round" />
        <circle cx="70" cy="105" r="11" fill="#f97316" />
        <path d="M 55,105 A 15,15 0 1,0 85,105" stroke="#ef4444" strokeWidth="4" fill="none" />

        {/* Quadcopter Arm Top-Left */}
        <line x1="110" y1="75" x2="70" y2="55" stroke="#f97316" strokeWidth="8" strokeLinecap="round" />
        <circle cx="70" cy="55" r="11" fill="#f97316" />
        <path d="M 55,55 A 15,15 0 1,0 85,55" stroke="#ef4444" strokeWidth="4" fill="none" />

        {/* Quadcopter Arm Bottom-Right */}
        <line x1="110" y1="75" x2="155" y2="85" stroke="#f97316" strokeWidth="8" strokeLinecap="round" />
        <circle cx="155" cy="85" r="11" fill="#f97316" />
        <path d="M 140,85 A 15,15 0 1,0 170,85" stroke="#ef4444" strokeWidth="4" fill="none" />

        {/* Bold Blue DRONE4BUILD Text */}
        <text x="185" y="92" fontFamily="'Inter', 'Space Grotesk', sans-serif" fontWeight="900" fontSize="48" fill="#3b82f6" letterSpacing="-2" style={{ width: 'auto' }}>
          DRONE4BUILD
        </text>
      </svg>
    </div>
  );
};

// ==========================================
// TACTICAL FLIGHT MAP COMPONENT
// ==========================================
const TacticalMap = () => {
  return (
    <div className="flex-1 bg-slate-50 border border-slate-200 rounded p-3 flex flex-col justify-between" id="tactical_map_panel">
      <div>
        <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest flex items-center gap-1 mb-1">
          <Map className="w-3.5 h-3.5 text-emerald-600" /> Tactical Flight Chart
        </div>
        <p className="text-[9px] text-slate-600 leading-normal">
          Top-down LIDAR survey area map (90m radius). Detour around orange safety buffers.
        </p>
      </div>

      <div className="my-3 aspect-square w-full max-w-[200px] mx-auto bg-white border border-slate-200 rounded relative overflow-hidden flex items-center justify-center">
        {/* Tactical SVG Map */}
        <svg viewBox="0 0 200 200" className="w-full h-full p-2">
          {/* Grid Lines */}
          <line x1="100" y1="0" x2="100" y2="200" stroke="#cbd5e1" strokeWidth="1" />
          <line x1="0" y1="100" x2="200" y2="100" stroke="#cbd5e1" strokeWidth="1" />
          <circle cx="100" cy="100" r="40" stroke="#cbd5e1" strokeWidth="1" fill="none" />
          <circle cx="100" cy="100" r="80" stroke="#cbd5e1" strokeWidth="1" fill="none" />

          {/* Chinatown Street Market Restricted Zone (x: -18, z: -18) -> local scale: maps to svg coords */}
          {/* scale: x mapped to (100 + x * 1.5), z mapped to (100 - z * 1.5) */}
          <circle cx="73" cy="127" r="15" fill="rgba(249,115,22,0.15)" stroke="rgba(249,115,22,0.6)" strokeWidth="1" strokeDasharray="2,2" />
          <text x="73" y="130" fill="#f97316" fontSize="5" fontWeight="bold" textAnchor="middle">ZONE 1</text>

          {/* Public Square Assembly (x: -18, z: 0) -> (73, 100) */}
          <circle cx="73" cy="100" r="15" fill="rgba(249,115,22,0.15)" stroke="rgba(249,115,22,0.6)" strokeWidth="1" strokeDasharray="2,2" />
          <text x="73" y="103" fill="#f97316" fontSize="5" fontWeight="bold" textAnchor="middle">ZONE 2</text>

          {/* Cafe dining (x: 0, z: -18) -> (100, 127) */}
          <circle cx="100" cy="127" r="13.5" fill="rgba(249,115,22,0.15)" stroke="rgba(249,115,22,0.6)" strokeWidth="1" strokeDasharray="2,2" />
          <text x="100" y="130" fill="#f97316" fontSize="5" fontWeight="bold" textAnchor="middle">ZONE 3</text>

          {/* HQ launch pad (0, 0) -> (100, 100) */}
          <circle cx="100" cy="100" r="4" fill="#06b6d4" />
          <text x="100" y="93" fill="#06b6d4" fontSize="6" fontWeight="bold" textAnchor="middle">HQ BASE</text>

          {/* Waypoint 1: Alley Corner (18, 18) -> (127, 73) */}
          <circle cx="127" cy="73" r="5" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="1" />
          <text x="127" y="65" fill="#10b981" fontSize="5" fontWeight="bold" textAnchor="middle">WP 1</text>

          {/* Waypoint 2: Helipad B (-45, -45) -> (32.5, 167.5) */}
          <rect x="26.5" y="161.5" width="12" height="12" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="1" />
          <text x="32.5" y="169" fill="#10b981" fontSize="6" fontWeight="extrabold" textAnchor="middle">H</text>
          <text x="32.5" y="156" fill="#10b981" fontSize="5" fontWeight="bold" textAnchor="middle">DEST B</text>

          {/* Flight Path indicators */}
          <path d="M 100,100 L 127,73 L 100,60 L 50,110 L 32.5,167.5" fill="none" stroke="rgba(16,185,129,0.4)" strokeWidth="1.5" strokeDasharray="3,3" />
        </svg>

        {/* Outer label indicators */}
        <div className="absolute top-1 left-2 text-[8px] text-slate-400 font-bold uppercase font-mono">NORTH [NE]</div>
        <div className="absolute bottom-1 right-2 text-[8px] text-slate-400 font-bold uppercase font-mono">90m RAD</div>
      </div>

      <div className="p-2 bg-slate-100/80 border border-slate-200 text-[9px] text-slate-600 space-y-1">
        <div className="flex justify-between">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block"></span> HQ Start:</span>
          <span className="font-bold text-slate-800">(0.0, 0.0)</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> WP1 Corner:</span>
          <span className="font-bold text-slate-800">(18.0, 18.0)</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 inline-block"></span> Dest B Rooftop:</span>
          <span className="font-bold text-slate-800">(-45.0, -45.0)</span>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // HUD & Telemetry State
  const [altitude, setAltitude] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);
  const [vSpeed, setVSpeed] = useState<number>(0);
  const [battery, setBattery] = useState<number>(100);
  const [health, setHealth] = useState<number>(100);
  const [pitch, setPitch] = useState<number>(0);
  const [roll, setRoll] = useState<number>(0);
  const [coordinates, setCoordinates] = useState<string>('40.7128° N, 74.0060° W');
  const [activeCamName, setActiveCamName] = useState<string>('Orbit Operator');
  const [hoverOn, setHoverOn] = useState<boolean>(true);
  const [isLanded, setIsLanded] = useState<boolean>(true);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [autopilotOn, setAutopilotOn] = useState<boolean>(false);
  const [windSpeed, setWindSpeed] = useState<number>(12);
  const [satLock, setSatLock] = useState<number>(98.4);
  const [latency, setLatency] = useState<number>(12);
  const [engineTemp, setEngineTemp] = useState<number>(38);
  const [frameTime, setFrameTime] = useState<number>(16.6);

  // Patrol System (Replaced with Single Mission structure)
  const [currentWaypointIdx, setCurrentWaypointIdx] = useState<number>(0);
  const [waypointProgressMsg, setWaypointProgressMsg] = useState<string>('');
  const [completedPatrol, setCompletedPatrol] = useState<boolean>(false);

  // Mission States for Regulation Game
  const [missionFailed, setMissionFailed] = useState<boolean>(false);
  const [failureReason, setFailureReason] = useState<'people' | 'collision' | 'battery' | null>(null);
  const [failedZoneName, setFailedZoneName] = useState<string>('');

  // Pre-flight & Onboarding States
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(true);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean>(false);
  const [demoMode, setDemoMode] = useState<boolean>(false);

  // Checklist state variables
  const [checkWind, setCheckWind] = useState<boolean>(false);
  const [checkBattery, setCheckBattery] = useState<boolean>(false);
  const [checkFAA, setCheckFAA] = useState<boolean>(false);
  const [checkCeiling, setCheckCeiling] = useState<boolean>(false);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: '15:16:40', text: 'Drone-OS Core v2.04 Initializing...', type: 'info' },
    { timestamp: '15:16:41', text: 'Regulatory Autonom-Link Online.', type: 'info' },
    { timestamp: '15:16:42', text: 'GPS established. No-Fly Columns loaded in Lidar.', type: 'success' },
    { timestamp: '15:16:43', text: 'READY. Space/E to ascend. Avoid crowds on ground!', type: 'warn' }
  ]);

  const addLog = (text: string, type: 'info' | 'warn' | 'success' | 'alert' = 'info') => {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0];
    setLogs(prev => [...prev.slice(-30), { timestamp, text, type }]);
  };

  // SCORM 1.2 / SCORM 2004 LMS Sync
  useEffect(() => {
    initSCORM();
    return () => {
      finishSCORM();
    };
  }, []);

  useEffect(() => {
    if (completedPatrol) {
      setSCORMComplete(100);
      addLog('LMS GRADEBOOK SYNC: SCORM completion score (100%) recorded!', 'success');
    }
  }, [completedPatrol]);

  useEffect(() => {
    if (missionFailed) {
      setSCORMScore(0);
      addLog('LMS GRADEBOOK SYNC: Flight violation recorded in LMS session.', 'warn');
    }
  }, [missionFailed]);

  // Waypoints configuration for our 1 Mission: Go from HQ to Skyscraper Rooftop B safely bypassing crowds
  const waypoints = useRef<Waypoint[]>([
    { id: 1, name: 'Checkpoint 1: Alley Corner', position: new THREE.Vector3(18, 8.0, 18), description: 'Bypass market crowds by navigating southeast.', targetRadius: 3.5 },
    { id: 2, name: 'Checkpoint 2: Skyscraper Helipad B', position: new THREE.Vector3(-45, 41.2, -45), description: 'Land on the high rooftop skyscraper pad.', targetRadius: 3.0 }
  ]);

  // Uninvolved assemblies of people we must not fly over (FAA / EASA Rules)
  const assemblies = useRef<{ id: number; name: string; position: THREE.Vector3; radius: number; description: string }[]>([
    { id: 1, name: 'Chinatown Street Market', position: new THREE.Vector3(-18, 0, -18), radius: 10, description: 'Dense market crowd along the main northwest street intersection.' },
    { id: 2, name: 'Public Square Assembly', position: new THREE.Vector3(-18, 0, 0), radius: 10, description: 'Tourists gathered in the western plaza intersection.' },
    { id: 3, name: 'Street Sidewalk Cafe', position: new THREE.Vector3(0, 0, -18), radius: 9, description: 'Outdoor dining tables completely blocking the northern alley.' }
  ]);

  // Keys state
  const keysPressed = useRef<{ [key: string]: boolean }>({
    w: false, s: false, a: false, d: false, q: false, e: false,
    arrowup: false, arrowdown: false, arrowleft: false, arrowright: false
  });

  // Reference hooks to pass data into Three.js loop safely
  const droneStateRef = useRef({
    pos: new THREE.Vector3(0, 0.15, 0),
    vel: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    health: 100,
    battery: 100,
    hover: true,
    autopilot: false,
    currentWaypointIdx: 0,
    cameraIndex: 0, // 0: Orbit, 1: FPV, 2: Chase
    shouldReset: false,
    isOnboarding: true,
    isRegistration: false,
    demoMode: false
  });

  useEffect(() => {
    droneStateRef.current.isOnboarding = isOnboardingOpen;
  }, [isOnboardingOpen]);

  useEffect(() => {
    droneStateRef.current.isRegistration = isRegistrationOpen;
  }, [isRegistrationOpen]);

  useEffect(() => {
    droneStateRef.current.demoMode = demoMode;
  }, [demoMode]);

  // Camera index toggle
  const cycleCamera = () => {
    const nextIdx = (droneStateRef.current.cameraIndex + 1) % 3;
    droneStateRef.current.cameraIndex = nextIdx;
    const names = ['Orbit Operator', 'FPV Pilot', 'Tactical Chase'];
    setActiveCamName(names[nextIdx]);
    addLog(`Camera source toggled to: ${names[nextIdx]}`, 'info');
  };

  // Toggle Hover
  const toggleHover = () => {
    const nextState = !hoverOn;
    setHoverOn(nextState);
    droneStateRef.current.hover = nextState;
    addLog(nextState ? 'Altimeter lock engaged. Hovering.' : 'Manual vertical thrust mode.', nextState ? 'info' : 'warn');
  };

  // Trigger Autopilot / Emergency Return Home
  const triggerAutopilot = () => {
    if (completedPatrol || missionFailed) {
      resetGame();
      return;
    }
    const nextState = !autopilotOn;
    setAutopilotOn(nextState);
    droneStateRef.current.autopilot = nextState;
    addLog(nextState ? 'AUTOPILOT ENGAGED. Homing to coordinates...' : 'Manual control reclaimed.', nextState ? 'success' : 'warn');
  };

  // Reset/Repair Game
  const resetGame = () => {
    droneStateRef.current.pos.set(0, 0.15, 0);
    droneStateRef.current.vel.set(0, 0, 0);
    droneStateRef.current.yaw = 0;
    droneStateRef.current.health = 100;
    droneStateRef.current.battery = 100;
    droneStateRef.current.hover = true;
    droneStateRef.current.autopilot = false;
    droneStateRef.current.currentWaypointIdx = 0;
    droneStateRef.current.shouldReset = true; // Signal physical loop reset
    setCompletedPatrol(false);
    setMissionFailed(false);
    setFailureReason(null);
    setFailedZoneName('');
    setCurrentWaypointIdx(0);
    setHoverOn(true);
    setAutopilotOn(false);
    setHealth(100);
    setBattery(100);

    // Reset pre-flight checklist states
    setCheckWind(false);
    setCheckBattery(false);
    setCheckFAA(false);
    setCheckCeiling(false);
    setIsRegistrationOpen(true); // Open pre-flight registration again for course planning!

    addLog('Drone core recovered and repaired. Systems rebooted.', 'success');
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // ──────────────────────────────────────────────
    // 1. THREE.JS INITIALIZATION
    // ──────────────────────────────────────────────
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d); // Immersive deep twilight blue/black
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.008);

    // Setup 3 Cameras for the viewport
    const cameraOrbit = new THREE.PerspectiveCamera(50, width / height, 0.1, 800);
    cameraOrbit.position.set(15, 12, 18);

    const cameraFPV = new THREE.PerspectiveCamera(65, width / height, 0.1, 800);
    const cameraChase = new THREE.PerspectiveCamera(55, width / height, 0.1, 800);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: false });
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x1e293b, 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfef08a, 1.2); // Golden hour sun
    sunLight.position.set(60, 100, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 300;
    const d = 100;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // Dynamic headlights on buildings / skyglow
    const blueSkyLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.6);
    scene.add(blueSkyLight);

    // Orbit Controls (attached only to cameraOrbit)
    const controls = new OrbitControls(cameraOrbit, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Keep camera above ground
    controls.minDistance = 3;
    controls.maxDistance = 60;
    controls.target.set(0, 1.5, 0);

    // Bounding boxes for buildings to calculate physical colliders
    const buildingColliders: THREE.Box3[] = [];

    // Helper to log collisions safely
    let lastCollisionTime = 0;

    // ──────────────────────────────────────────────
    // 2. PROCEDURAL ENVIRONMENT BUILDER
    // ──────────────────────────────────────────────
    // Base Ground Asphalt
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x111827, // Slate asphalt
      roughness: 0.9,
      metalness: 0.1
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Custom Concrete curb materials
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.8 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 }); // Yellow lane divider
    const zebraMat = new THREE.MeshBasicMaterial({ color: 0xe5e7eb }); // Zebra lines

    // Build streets & sidewalks in a grid pattern
    const gridCount = 5; // -2 to 2 blocks
    const spacing = BLOCK_SIZE + STREET_WIDTH; // 36 meters

    for (let bx = -2; bx <= 2; bx++) {
      for (let bz = -2; bz <= 2; bz++) {
        const cx = bx * spacing;
        const cz = bz * spacing;

        // Skip center block (base helipad) to create a beautiful open HQ plaza
        const isCenter = (bx === 0 && bz === 0);

        // Draw physical 3D elevated sidewalks
        const sidewalkGeo = new THREE.BoxGeometry(BLOCK_SIZE, 0.15, BLOCK_SIZE);
        const sidewalk = new THREE.Mesh(sidewalkGeo, curbMat);
        sidewalk.position.set(cx, 0.075, cz);
        sidewalk.receiveShadow = true;
        sidewalk.castShadow = true;
        scene.add(sidewalk);

        // Draw 2D lane markings on the streets around the blocks
        // Horizontal lanes
        if (bx < 2) {
          const lane = new THREE.Mesh(new THREE.PlaneGeometry(STREET_WIDTH, 0.08), lineMat);
          lane.rotation.x = -Math.PI / 2;
          lane.position.set(cx + spacing / 2, 0.01, cz);
          scene.add(lane);
        }
        // Vertical lanes
        if (bz < 2) {
          const lane = new THREE.Mesh(new THREE.PlaneGeometry(0.08, STREET_WIDTH), lineMat);
          lane.rotation.x = -Math.PI / 2;
          lane.position.set(cx, 0.01, cz + spacing / 2);
          scene.add(lane);
        }

        // Zebra crosswalks near intersections
        if (Math.abs(bx) <= 1 && Math.abs(bz) <= 1 && !isCenter) {
          // Draw a small zebra strip
          const zebraGroup = new THREE.Group();
          for (let i = -3; i <= 3; i++) {
            const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 2.5), zebraMat);
            bar.rotation.x = -Math.PI / 2;
            bar.position.set(i * 0.8, 0.012, 0);
            zebraGroup.add(bar);
          }
          zebraGroup.position.set(cx, 0, cz + BLOCK_SIZE / 2 + 2);
          scene.add(zebraGroup);
        }

        // Populate buildings on top of sidewalks
        if (isCenter) {
          // Add the Base Helipad
          const padGeo = new THREE.CylinderGeometry(4, 4, 0.15, 32);
          const padTexture = createHelipadTexture();
          const padMat = new THREE.MeshStandardMaterial({
            map: padTexture,
            roughness: 0.6
          });
          const basePad = new THREE.Mesh(padGeo, padMat);
          basePad.position.set(0, 0.15, 0);
          basePad.receiveShadow = true;
          scene.add(basePad);

          // Add a holographic coordinate beacon
          const beaconGeo = new THREE.CylinderGeometry(4.2, 4.2, 0.02, 16);
          const beaconMat = new THREE.MeshBasicMaterial({
            color: 0x06b6d4,
            transparent: true,
            opacity: 0.15,
            wireframe: true
          });
          const beacon = new THREE.Mesh(beaconGeo, beaconMat);
          beacon.position.set(0, 0.25, 0);
          scene.add(beacon);
          continue;
        }

        // Special Block: Under Construction at x=45, z=-45 (bx=1, bz=-1)
        const isConstructionSite = (bx === 1 && bz === -1);
        // Special Block: Central Park at x=-45, z=45 (bx=-1, bz=1)
        const isPark = (bx === -1 && bz === 1);

        if (isConstructionSite) {
          // ─── CONSTRUCTION BUILDING ───
          // Lower 2 floors (completed solid concrete block)
          const lowerH = 10;
          const lowerGeo = new THREE.BoxGeometry(16, lowerH, 16);
          const lowerMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9 });
          const lowerMesh = new THREE.Mesh(lowerGeo, lowerMat);
          lowerMesh.position.set(cx, lowerH / 2 + 0.15, cz);
          lowerMesh.castShadow = true;
          lowerMesh.receiveShadow = true;
          scene.add(lowerMesh);

          // Register collision
          lowerMesh.updateMatrixWorld();
          buildingColliders.push(new THREE.Box3().setFromObject(lowerMesh));

          // Upper 3 floors (steel skeleton)
          const skeletonH = 15;
          const skeletonGroup = new THREE.Group();
          skeletonGroup.position.set(cx, lowerH + 0.15, cz);

          const beamMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 }); // High-visibility safety orange

          // Vertical columns
          const colSpacing = 7.5;
          const cols = [
            { x: -colSpacing, z: -colSpacing },
            { x: -colSpacing, z: colSpacing },
            { x: colSpacing, z: -colSpacing },
            { x: colSpacing, z: colSpacing },
            { x: 0, z: -colSpacing },
            { x: 0, z: colSpacing },
            { x: -colSpacing, z: 0 },
            { x: colSpacing, z: 0 }
          ];

          cols.forEach(pos => {
            const colMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, skeletonH, 0.4), beamMat);
            colMesh.position.set(pos.x, skeletonH / 2, pos.z);
            skeletonGroup.add(colMesh);
          });

          // Horizontal grid beams (at levels Y=5, 10, 15)
          for (let ly = 0; ly <= 3; ly++) {
            const hLevel = ly * 5;
            // X-direction beams
            [-colSpacing, 0, colSpacing].forEach(zPos => {
              const b = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 0.3), beamMat);
              b.position.set(0, hLevel, zPos);
              skeletonGroup.add(b);
            });
            // Z-direction beams
            [-colSpacing, 0, colSpacing].forEach(xPos => {
              const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 16), beamMat);
              b.position.set(xPos, hLevel, 0);
              skeletonGroup.add(b);
            });
          }

          scene.add(skeletonGroup);

          // Register skeleton collider
          const skeletonColliderBox = new THREE.Box3(
            new THREE.Vector3(cx - 8, lowerH + 0.15, cz - 8),
            new THREE.Vector3(cx + 8, lowerH + skeletonH + 0.15, cz + 8)
          );
          buildingColliders.push(skeletonColliderBox);

          // Scaffolding on side
          const scaffoldGeo = new THREE.BoxGeometry(2, lowerH + 8, 12);
          const scaffoldMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, wireframe: true });
          const scaffold = new THREE.Mesh(scaffoldGeo, scaffoldMat);
          scaffold.position.set(cx + 9, (lowerH + 8) / 2, cz);
          scene.add(scaffold);

          // ─── TOWER CRANE ───
          const craneGroup = new THREE.Group();
          craneGroup.position.set(cx - 10, 0.15, cz - 10);

          // Crane mast (vertical structure)
          const mastH = 34;
          const mastGeo = new THREE.BoxGeometry(1.2, mastH, 1.2);
          const mastMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.6, roughness: 0.3 }); // Yellow
          const mast = new THREE.Mesh(mastGeo, mastMat);
          mast.position.y = mastH / 2;
          mast.castShadow = true;
          craneGroup.add(mast);

          // Register mast collider
          mast.updateMatrixWorld();
          buildingColliders.push(new THREE.Box3().setFromObject(mast));

          // Rotating Jib Unit (Boom + Cab)
          const craneJibGroup = new THREE.Group();
          craneJibGroup.position.y = mastH;

          // Cab
          const cabGeo = new THREE.BoxGeometry(2, 2, 2.5);
          const cabMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8 });
          const cab = new THREE.Mesh(cabGeo, cabMat);
          cab.position.set(-1, 1, 1);
          craneJibGroup.add(cab);

          // Main Boom
          const boomGeo = new THREE.BoxGeometry(1, 0.8, 26);
          const boom = new THREE.Mesh(boomGeo, mastMat);
          boom.position.set(0, 1.2, 8); // Extends forward
          craneJibGroup.add(boom);

          // Counterweight Jib
          const counterGeo = new THREE.BoxGeometry(1.2, 1, 8);
          const counter = new THREE.Mesh(counterGeo, mastMat);
          counter.position.set(0, 1.2, -5); // Extends backward
          craneJibGroup.add(counter);

          // Heavy Counterweight Block
          const blockGeo = new THREE.BoxGeometry(2, 1.5, 3);
          const blockMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.8 });
          const block = new THREE.Mesh(blockGeo, blockMat);
          block.position.set(0, 1.2, -7);
          craneJibGroup.add(block);

          // Cable & Hanging load (girder)
          const cableGeo = new THREE.CylinderGeometry(0.04, 0.04, 12, 4);
          const cableMat = new THREE.MeshBasicMaterial({ color: 0x374151 });
          const cable = new THREE.Mesh(cableGeo, cableMat);
          cable.position.set(0, -5, 15); // Hanging from boom at Z=15
          craneJibGroup.add(cable);

          const loadGeo = new THREE.BoxGeometry(8, 0.4, 0.4);
          const loadMat = new THREE.MeshStandardMaterial({ color: 0xf97316 }); // Orange girder
          const load = new THREE.Mesh(loadGeo, loadMat);
          load.position.set(0, -11, 15);
          load.rotation.y = Math.PI / 4;
          load.castShadow = true;
          craneJibGroup.add(load);

          craneGroup.add(craneJibGroup);
          scene.add(craneGroup);

          // Register hanging load collider
          const loadColliderBox = new THREE.Box3();
          // Updated dynamically in render loop

          // ─── WORKERS ON BOTTOM ───
          const workerGroup = new THREE.Group();
          workerGroup.position.set(cx, 0.15, cz + 10); // Placed at base on sidewalk

          // Function to create a little worker model
          const createWorker = (color: number) => {
            const man = new THREE.Group();
            
            // Pants/Legs
            const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), new THREE.MeshStandardMaterial({ color: 0x1e3a8a }));
            legs.position.y = 0.3;
            man.add(legs);

            // Torso (Orange high-vis vest)
            const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.4), new THREE.MeshStandardMaterial({ color: 0xf97316 }));
            torso.position.y = 0.95;
            man.add(torso);

            // Head
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
            head.position.y = 1.4;
            man.add(head);

            // Hardhat (Yellow)
            const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.15, 8), new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.3 }));
            hat.position.y = 1.55;
            man.add(hat);

            man.castShadow = true;
            return man;
          };

          // Welder Worker (stationary)
          const welder = createWorker(0xf97316);
          welder.position.set(-3, 0, -2);
          welder.rotation.y = Math.PI;
          workerGroup.add(welder);

          // Welding sparks light source
          const sparkLight = new THREE.PointLight(0x00ffff, 0, 4);
          sparkLight.position.set(-3, 0.9, -2.5);
          workerGroup.add(sparkLight);

          // Spark geometric helper
          const sparkSphereGeo = new THREE.SphereGeometry(0.1, 4, 4);
          const sparkSphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const sparkSphere = new THREE.Mesh(sparkSphereGeo, sparkSphereMat);
          sparkSphere.position.copy(sparkLight.position);
          sparkSphere.visible = false;
          workerGroup.add(sparkSphere);

          // Supervisor Worker (waving/wobbling)
          const supervisor = createWorker(0xf97316);
          supervisor.position.set(3, 0, 0);
          workerGroup.add(supervisor);

          // Walking Worker
          const walker = createWorker(0xf97316);
          walker.position.set(0, 0, 2);
          workerGroup.add(walker);

          scene.add(workerGroup);

          // Construction items (cones, barrels)
          for (let i = 0; i < 4; i++) {
            const coneGeo = new THREE.ConeGeometry(0.25, 0.7, 8);
            const coneMat = new THREE.MeshStandardMaterial({ color: 0xeab308 });
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.position.set(cx + 8 - i * 4, 0.5, cz + 12);
            scene.add(cone);
          }

          // Reference for animation in loop
          (craneGroup as any).jib = craneJibGroup;
          (craneGroup as any).load = load;
          (craneGroup as any).loadCollider = loadColliderBox;
          (workerGroup as any).welderLight = sparkLight;
          (workerGroup as any).welderSpark = sparkSphere;
          (workerGroup as any).supervisor = supervisor;
          (workerGroup as any).walker = walker;
          (scene as any).constructionSite = craneGroup;
          (scene as any).workers = workerGroup;

        } else if (isPark) {
          // ─── CENTRAL PARK BLOCK ───
          // Fill grass cover
          const grassGeo = new THREE.BoxGeometry(BLOCK_SIZE - 0.5, 0.2, BLOCK_SIZE - 0.5);
          const grassMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 1.0 });
          const grass = new THREE.Mesh(grassGeo, grassMat);
          grass.position.set(cx, 0.1, cz);
          scene.add(grass);

          // Draw a small pond / lake inside
          const pondGeo = new THREE.BoxGeometry(14, 0.05, 12);
          const pondMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.1, metalness: 0.9 });
          const pond = new THREE.Mesh(pondGeo, pondMat);
          pond.position.set(cx - 2, 0.21, cz + 2);
          scene.add(pond);

          // Add Low-Poly Trees
          for (let i = 0; i < 14; i++) {
            const tx = cx + (Math.random() * 20 - 10);
            const tz = cz + (Math.random() * 20 - 10);
            // Don't place tree in the water
            if (tx > cx - 10 && tx < cx + 5 && tz > cz - 4 && tz < cz + 8) continue;

            const tree = new THREE.Group();
            tree.position.set(tx, 0.15, tz);

            // Trunk
            const trunkGeo = new THREE.CylinderGeometry(0.18, 0.24, 2, 8);
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 1.0;
            trunk.castShadow = true;
            tree.add(trunk);

            // Leaves (Foliage)
            const leavesGeo = new THREE.ConeGeometry(1.4, 3.2, 5);
            const leavesMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 });
            const leaves = new THREE.Mesh(leavesGeo, leavesMat);
            leaves.position.y = 3.2;
            leaves.castShadow = true;
            tree.add(leaves);

            scene.add(tree);

            // Simple capsule-like colliders for trees
            const treeCollider = new THREE.Box3(
              new THREE.Vector3(tx - 0.8, 0, tz - 0.8),
              new THREE.Vector3(tx + 0.8, 4.5, tz + 0.8)
            );
            buildingColliders.push(treeCollider);
          }

        } else {
          // ─── STANDARD DETAILED BUILDINGS ───
          // Pick a style: Modern Glass Skyrise or Brick/Concrete Office
          const isModern = Math.random() > 0.45;
          const height = 15 + Math.random() * 28; // height from 15 to 43 meters
          const bW = BLOCK_SIZE - 4;
          const bD = BLOCK_SIZE - 4;

          const buildingGroup = new THREE.Group();
          buildingGroup.position.set(cx, 0.15, cz);

          if (isModern) {
            // Glass Skyscraper with internal concrete core and lit floors
            const coreGeo = new THREE.BoxGeometry(bW - 6, height, bD - 6);
            const coreMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.8 });
            const core = new THREE.Mesh(coreGeo, coreMat);
            core.position.y = height / 2;
            buildingGroup.add(core);

            // Glowing external windows using procedural texture mapping
            const winTex = createWindowTexture(0.5);
            winTex.repeat.set(bW / 4, height / 3);
            const glassMat = new THREE.MeshStandardMaterial({
              map: winTex,
              color: 0x60a5fa,
              emissive: 0x3b82f6,
              emissiveIntensity: 0.25,
              roughness: 0.1,
              metalness: 0.8
            });

            const facadeGeo = new THREE.BoxGeometry(bW, height, bD);
            const facade = new THREE.Mesh(facadeGeo, glassMat);
            facade.position.y = height / 2;
            facade.castShadow = true;
            facade.receiveShadow = true;
            buildingGroup.add(facade);

            // Rooftop Helipad or Antenna Spire
            if (Math.random() > 0.5) {
              // Add a helipad on this roof!
              const helipadGeo = new THREE.CylinderGeometry(5, 5, 0.3, 16);
              const heliTex = createHelipadTexture();
              const helipadMat = new THREE.MeshStandardMaterial({ map: heliTex, roughness: 0.6 });
              const rooftopHelipad = new THREE.Mesh(helipadGeo, helipadMat);
              rooftopHelipad.position.set(0, height + 0.15, 0);
              rooftopHelipad.receiveShadow = true;
              buildingGroup.add(rooftopHelipad);

              // Track rooftop helipad position for landing check
              (rooftopHelipad as any).isRooftopLanding = true;
              (rooftopHelipad as any).worldPos = new THREE.Vector3(cx, height + 0.3 + 0.15, cz);
              scene.add(rooftopHelipad); // Add to scene to allow Raycast or manual check
            } else {
              // Spire Antenna
              const antennaGeo = new THREE.CylinderGeometry(0.1, 0.15, 6, 8);
              const antennaMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.9 });
              const antenna = new THREE.Mesh(antennaGeo, antennaMat);
              antenna.position.set(0, height + 3, 0);
              buildingGroup.add(antenna);

              // Red beacon light on spire
              const beaconGeo = new THREE.SphereGeometry(0.2, 8, 8);
              const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
              const beacon = new THREE.Mesh(beaconGeo, beaconMat);
              beacon.position.set(0, height + 6, 0);
              buildingGroup.add(beacon);
              (beacon as any).isBeacon = true;
            }

          } else {
            // Brick/Concrete classic residential building
            const winTex = createWindowTexture(0.35); // Less lights on
            winTex.repeat.set(bW / 4, height / 3);
            const brickMat = new THREE.MeshStandardMaterial({
              map: winTex,
              color: 0xb45309, // Brick terracotta color tint
              roughness: 0.9,
              metalness: 0.0
            });

            const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(bW, height, bD), brickMat);
            blockMesh.position.y = height / 2;
            blockMesh.castShadow = true;
            blockMesh.receiveShadow = true;
            buildingGroup.add(blockMesh);

            // Water Tank on roof
            const tankGroup = new THREE.Group();
            tankGroup.position.set(4, height + 1.5, 4);

            const cylGeo = new THREE.CylinderGeometry(1.6, 1.6, 3, 12);
            const tankCyl = new THREE.Mesh(cylGeo, new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }));
            tankCyl.castShadow = true;
            tankGroup.add(tankCyl);

            const coneGeo = new THREE.ConeGeometry(1.8, 1, 12);
            const tankRoof = new THREE.Mesh(coneGeo, new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 }));
            tankRoof.position.y = 2;
            tankGroup.add(tankRoof);

            buildingGroup.add(tankGroup);
          }

          scene.add(buildingGroup);

          // Register Collider
          buildingGroup.updateMatrixWorld();
          const bBox = new THREE.Box3(
            new THREE.Vector3(cx - bW / 2, 0.15, cz - bD / 2),
            new THREE.Vector3(cx + bW / 2, height + 0.15, cz + bD / 2)
          );
          buildingColliders.push(bBox);
        }
      }
    }

    // Place a couple of streetlights on corners
    const lightPositions = [
      new THREE.Vector3(14, 0.15, 14),
      new THREE.Vector3(-14, 0.15, 14),
      new THREE.Vector3(14, 0.15, -14),
      new THREE.Vector3(-14, 0.15, -14)
    ];

    lightPositions.forEach(pos => {
      const pole = new THREE.Group();
      pole.position.copy(pos);

      const verticalGeo = new THREE.CylinderGeometry(0.08, 0.12, 5, 8);
      const metalMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.8 });
      const verticalMesh = new THREE.Mesh(verticalGeo, metalMat);
      verticalMesh.position.y = 2.5;
      pole.add(verticalMesh);

      const curveGeo = new THREE.BoxGeometry(0.8, 0.15, 0.15);
      const curveMesh = new THREE.Mesh(curveGeo, metalMat);
      curveMesh.position.set(0.3, 5, 0);
      pole.add(curveMesh);

      const lanternGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(0.7, 4.8, 0);
      pole.add(lantern);

      scene.add(pole);
    });

    // ──────────────────────────────────────────────
    // NO-FLY ASSEMBLY ZONES (CROWDS & PILLARS)
    // ──────────────────────────────────────────────
    const noFlyZonesGroup = new THREE.Group();
    scene.add(noFlyZonesGroup);

    // Human model generator
    const createCitizen = (shirtColor: number) => {
      const person = new THREE.Group();
      
      // Pants
      const pants = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.5, 0.2), 
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
      );
      pants.position.y = 0.25;
      pants.castShadow = true;
      pants.receiveShadow = true;
      person.add(pants);

      // Torso/Shirt
      const shirt = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.6, 0.25), 
        new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.8 })
      );
      shirt.position.y = 0.8;
      shirt.castShadow = true;
      shirt.receiveShadow = true;
      person.add(shirt);

      // Head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 8, 8), 
        new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6 })
      );
      head.position.y = 1.18;
      head.castShadow = true;
      person.add(head);

      return person;
    };

    assemblies.current.forEach(zone => {
      // 1. Transparent red warning columns extending up to flight ceiling
      const cylGeo = new THREE.CylinderGeometry(zone.radius, zone.radius, 100, 32, 1, true);
      const cylMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const cyl = new THREE.Mesh(cylGeo, cylMat);
      cyl.position.set(zone.position.x, 50, zone.position.z);
      noFlyZonesGroup.add(cyl);

      // 2. Translucent outer warning borders on streets
      const ringGeo = new THREE.RingGeometry(zone.radius - 0.2, zone.radius, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(zone.position.x, 0.16, zone.position.z);
      noFlyZonesGroup.add(ring);

      // 3. Populate animated citizens inside the zone
      const numPeople = 7;
      for (let i = 0; i < numPeople; i++) {
        const angle = (i / numPeople) * Math.PI * 2 + Math.random() * 0.4;
        const dist = Math.random() * (zone.radius * 0.55);
        const px = zone.position.x + Math.cos(angle) * dist;
        const pz = zone.position.z + Math.sin(angle) * dist;

        const colors = [0xd97706, 0x2563eb, 0xdb2777, 0x7c3aed, 0xe11d48, 0x059669];
        const citizen = createCitizen(colors[Math.floor(Math.random() * colors.length)]);
        citizen.position.set(px, 0.15, pz);
        citizen.rotation.y = Math.random() * Math.PI * 2;
        
        // Random slight scale for height variation
        const scale = 0.85 + Math.random() * 0.3;
        citizen.scale.set(scale, scale, scale);

        noFlyZonesGroup.add(citizen);
      }
    });

    // ──────────────────────────────────────────────
    // 3. QUADCOPTER DRONE DESIGN
    // ──────────────────────────────────────────────
    const droneGroup = new THREE.Group();
    const droneMeshGroup = new THREE.Group(); // Inner group for banking tilt
    droneGroup.add(droneMeshGroup);

    // Center Core Hull
    const hullGeo = new THREE.BoxGeometry(0.8, 0.24, 0.8);
    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.2
    });
    const coreHull = new THREE.Mesh(hullGeo, carbonMat);
    coreHull.castShadow = true;
    droneMeshGroup.add(coreHull);

    // Dynamic camera spherical gimbal
    const camGimbalGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const cameraGimbal = new THREE.Mesh(camGimbalGeo, new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 }));
    cameraGimbal.position.set(0, -0.15, 0.25);
    droneMeshGroup.add(cameraGimbal);

    // Gimbal glowing lens
    const lensGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(0, 0, 0.13);
    cameraGimbal.add(lens);

    // Carbon structural bars (arms extending to the 4 rotors)
    const armGeo = new THREE.BoxGeometry(0.08, 0.05, 1.2);
    const greyMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });

    const arm1 = new THREE.Mesh(armGeo, greyMat);
    arm1.rotation.y = Math.PI / 4;
    droneMeshGroup.add(arm1);

    const arm2 = new THREE.Mesh(armGeo, greyMat);
    arm2.rotation.y = -Math.PI / 4;
    droneMeshGroup.add(arm2);

    // Rotor motor hubs + double blades
    const motorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 0.5 }); // Glowing blue blades

    const rotors: THREE.Group[] = [];
    const rotorOffsets = [
      new THREE.Vector3(0.42, 0.1, 0.42),
      new THREE.Vector3(-0.42, 0.1, 0.42),
      new THREE.Vector3(0.42, 0.1, -0.42),
      new THREE.Vector3(-0.42, 0.1, -0.42)
    ];

    rotorOffsets.forEach(offset => {
      const motorHub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8), motorMat);
      motorHub.position.copy(offset);
      droneMeshGroup.add(motorHub);

      const blades = new THREE.Group();
      blades.position.copy(offset).add(new THREE.Vector3(0, 0.08, 0));

      const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.015, 0.03), bladeMat);
      blade1.position.x = 0.175;
      blades.add(blade1);

      const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.015, 0.03), bladeMat);
      blade2.position.x = -0.175;
      blades.add(blade2);

      droneMeshGroup.add(blades);
      rotors.push(blades);
    });

    // 2 skids for landing landing gears
    const skidGeo = new THREE.BoxGeometry(0.04, 0.04, 0.9);
    const legGeo = new THREE.BoxGeometry(0.04, 0.3, 0.04);

    [-0.3, 0.3].forEach(x => {
      const leg1 = new THREE.Mesh(legGeo, greyMat);
      leg1.position.set(x, -0.15, 0.2);
      leg1.rotation.z = x > 0 ? -0.15 : 0.15;
      droneMeshGroup.add(leg1);

      const leg2 = new THREE.Mesh(legGeo, greyMat);
      leg2.position.set(x, -0.15, -0.2);
      leg2.rotation.z = x > 0 ? -0.15 : 0.15;
      droneMeshGroup.add(leg2);

      const skid = new THREE.Mesh(skidGeo, carbonMat);
      skid.position.set(x, -0.3, 0);
      droneMeshGroup.add(skid);
    });

    // Glowing status indicators
    const ledFront = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0x10b981 })); // Green Front
    ledFront.position.set(0, 0.05, 0.42);
    droneMeshGroup.add(ledFront);

    const ledBack = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 })); // Red Back (blinking)
    ledBack.position.set(0, 0.05, -0.42);
    droneMeshGroup.add(ledBack);

    // Powerful Spotlight pointing straight down
    const downLight = new THREE.SpotLight(0xffffff, 4, 30, Math.PI / 4, 0.5, 1);
    downLight.position.set(0, -0.3, 0);
    downLight.castShadow = true;
    droneMeshGroup.add(downLight);

    const targetDummy = new THREE.Object3D();
    targetDummy.position.set(0, -10, 0);
    droneMeshGroup.add(targetDummy);
    downLight.target = targetDummy;

    // Visual helper cone for spotlight
    const lightConeGeo = new THREE.ConeGeometry(3, 10, 16, 1, true);
    const lightConeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const lightCone = new THREE.Mesh(lightConeGeo, lightConeMat);
    lightCone.position.set(0, -5, 0);
    lightCone.rotation.x = Math.PI;
    droneMeshGroup.add(lightCone);

    droneGroup.position.set(0, 2, 0); // Spawn at y=2
    scene.add(droneGroup);

    // ──────────────────────────────────────────────
    // 4. WAYPOINT CHECKPOINTS COURSE OVERLAYS
    // ──────────────────────────────────────────────
    // Glowing green towering cylinders for all checkpoints to make them highly visible in the sky
    const checkpointBeaconsGroup = new THREE.Group();
    scene.add(checkpointBeaconsGroup);

    waypoints.current.forEach((wp) => {
      // Towering green translucent beacon
      const beaconGeo = new THREE.CylinderGeometry(wp.targetRadius, wp.targetRadius, 140, 16, 1, true);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.set(wp.position.x, 70, wp.position.z);
      checkpointBeaconsGroup.add(beaconMesh);

      // Glowing green ground ring
      const ringGeo2 = new THREE.RingGeometry(wp.targetRadius - 0.2, wp.targetRadius + 0.2, 32);
      const ringMat2 = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35
      });
      const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
      ring2.rotation.x = -Math.PI / 2;
      ring2.position.set(wp.position.x, 0.18, wp.position.z);
      checkpointBeaconsGroup.add(ring2);
    });

    // 3D Neon target ring at the active waypoint
    const ringGeo = new THREE.RingGeometry(2.0, 2.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const waypointRing = new THREE.Mesh(ringGeo, ringMat);
    waypointRing.rotation.x = Math.PI / 2;
    scene.add(waypointRing);

    // Core pulsing sphere at target center
    const sphereGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.4
    });
    const waypointSphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(waypointSphere);

    // Floating Arrow Pointer guidance hovering above drone
    const arrowConeGeo = new THREE.ConeGeometry(0.24, 0.8, 8);
    const arrowConeMat = new THREE.MeshBasicMaterial({ color: 0xeab308 }); // Yellow arrow
    const guideArrow = new THREE.Mesh(arrowConeGeo, arrowConeMat);
    scene.add(guideArrow);

    // ──────────────────────────────────────────────
    // 5. FLIGHT PHYSICS ENGINE & LOOP
    // ──────────────────────────────────────────────
    const physics = {
      pos: droneGroup.position,
      vel: new THREE.Vector3(0, 0, 0),
      rotY: 0,
      currentPitch: 0,
      currentRoll: 0,
      gravity: -9.8,
      lift: 6.5,
      terminalVel: -25,
      speedScale: 14,
      inertia: 0.94 // Air resistance drag coefficient
    };

    let clock = new THREE.Clock();

    const animate = () => {
      const requestID = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.1); // Clamp delta to avoid physics explosion
      const time = clock.getElapsedTime();

      // 1. Check if physical reset is requested
      if (droneStateRef.current.shouldReset) {
        physics.pos.set(0, 0.15, 0);
        physics.vel.setScalar(0);
        physics.rotY = 0;
        physics.currentPitch = 0;
        physics.currentRoll = 0;
        droneGroup.rotation.y = 0;
        droneMeshGroup.rotation.set(0, 0, 0);
        droneStateRef.current.shouldReset = false;
      }

      // 2. Pause physics updates if onboarding or registration is open
      const isPaused = droneStateRef.current.isOnboarding || droneStateRef.current.isRegistration;
      if (isPaused) {
        // Keep drone static
        physics.pos.set(0, 0.15, 0);
        physics.vel.setScalar(0);
        physics.rotY = 0;
        physics.currentPitch = 0;
        physics.currentRoll = 0;
        droneGroup.rotation.y = 0;
        droneMeshGroup.rotation.set(0, 0, 0);

        // Spin rotors slowly for visual feedback that the drone is ready
        rotors.forEach((rotor, idx) => {
          rotor.rotation.y += 2 * delta * (idx % 2 === 0 ? 1 : -1);
        });

        // Still render orbit camera so the 3D environment is visible as a background
        renderer.render(scene, cameraOrbit);
        return;
      }

      // Trigger frame time updates
      if (Math.random() < 0.05) {
        setFrameTime(Math.round(delta * 10000) / 10);
      }

      // Handle building animations (Crane rotating slowly, workers)
      const crane = (scene as any).constructionSite;
      if (crane && crane.jib) {
        // Jib sweeps back and forth
        crane.jib.rotation.y = Math.sin(time * 0.15) * 0.45;
        // Hanging load swings slightly
        crane.load.rotation.z = Math.sin(time * 0.8) * 0.04;
        crane.load.rotation.x = Math.cos(time * 0.5) * 0.03;

        // Update the dynamic collider for hanging girder
        const loadWorldPos = new THREE.Vector3();
        crane.load.getWorldPosition(loadWorldPos);
        crane.loadCollider.setFromCenterAndSize(loadWorldPos, new THREE.Vector3(8, 0.4, 0.4));
      }

      // Worker animation triggers
      const workers = (scene as any).workers;
      if (workers) {
        // Supervisor waves arms
        workers.supervisor.rotation.y = Math.sin(time * 0.8) * 0.5;
        // Welder sparks effect (intermittent flashing)
        if (Math.random() < 0.12) {
          const sparkOn = Math.random() > 0.4;
          workers.welderLight.intensity = sparkOn ? 6 : 0;
          workers.welderSpark.visible = sparkOn;
          workers.welderSpark.scale.setScalar(Math.random() * 1.5 + 0.5);
        }
        // Walker paces
        const walkZ = Math.sin(time * 0.4) * 4;
        workers.walker.position.z = walkZ;
        workers.walker.rotation.y = Math.cos(time * 0.4) > 0 ? 0 : Math.PI;
      }

      // Flashing beacons on spires
      scene.traverse(child => {
        if ((child as any).isBeacon) {
          child.scale.setScalar(0.8 + Math.sin(time * 6) * 0.4);
        }
      });

      // ──────────────────────────────────────────────
      // DRONE CONTROL ENGINE
      // ──────────────────────────────────────────────
      const activeIdx = droneStateRef.current.currentWaypointIdx;
      const targetWp = waypoints.current[activeIdx];

      // Read current keys
      const keys = keysPressed.current;
      let moveForward = keys.w || keys.arrowup ? 1 : 0;
      let moveBackward = keys.s || keys.arrowdown ? -1 : 0;
      let strafeLeft = keys.arrowleft ? -1 : 0;
      let strafeRight = keys.arrowright ? 1 : 0;
      let yawLeft = keys.a ? 1 : 0;
      let yawRight = keys.d ? -1 : 0;
      let liftUp = keys.e ? 1 : 0;
      let liftDown = keys.q ? -1 : 0;

      // Autopilot Homing AI controller
      if (droneStateRef.current.autopilot && targetWp) {
        const toWp = targetWp.position.clone().sub(physics.pos);
        const dist2D = new THREE.Vector2(toWp.x, toWp.z).length();

        // 1. Maintain safe cruise altitude matching waypoint Y
        const targetY = targetWp.name === 'Base Return' ? Math.max(targetWp.position.y + 0.15, 0.2) : targetWp.position.y;
        const diffY = targetY - physics.pos.y;
        if (Math.abs(diffY) > 0.3) {
          liftUp = diffY > 0 ? 0.8 : 0;
          liftDown = diffY < 0 ? -0.8 : 0;
        }

        // 2. Rotate to face waypoint
        if (dist2D > 1.0) {
          const targetYaw = Math.atan2(toWp.x, toWp.z);
          // Simple interpolation of yaw angle
          let diffYaw = targetYaw - physics.rotY;
          // Normalise to -PI to PI
          diffYaw = Math.atan2(Math.sin(diffYaw), Math.cos(diffYaw));
          if (Math.abs(diffYaw) > 0.05) {
            yawRight = diffYaw > 0 ? 0.7 : 0;
            yawLeft = diffYaw < 0 ? -0.7 : 0;
          }
          // Move forward if relatively facing
          if (Math.abs(diffYaw) < 0.6) {
            moveForward = 0.9;
          }
        } else {
          // Hover directly above
          if (physics.pos.y > targetWp.position.y + 0.1) {
            liftDown = -0.5;
          }
        }
      }

      // Check landing state
      const thresholdLanded = 0.35;
      const isCurrentlyLanded = physics.pos.y <= thresholdLanded + 0.01;
      setIsLanded(isCurrentlyLanded);

      // Handle battery drain or charging
      if (isCurrentlyLanded) {
        // Charging at Central Pad (0,0) or Skyscraper rooftop Helipad (-45, -45)
        const isNearBase = physics.pos.distanceTo(new THREE.Vector3(0, 0.2, 0)) < 4;
        const isNearSkyPad = physics.pos.distanceTo(new THREE.Vector3(-45, 41.3, -45)) < 4.5;

        if (isNearBase || isNearSkyPad) {
          if (droneStateRef.current.battery < 100) {
            droneStateRef.current.battery = Math.min(100, droneStateRef.current.battery + delta * 20); // 20% charge speed
            setBattery(Math.round(droneStateRef.current.battery));
            setIsCharging(true);
            if (Math.random() < 0.02) {
              addLog(`Systems connected. Charging battery cells: ${Math.round(droneStateRef.current.battery)}%`, 'success');
            }
          }
          if (droneStateRef.current.health < 100) {
            droneStateRef.current.health = Math.min(100, droneStateRef.current.health + delta * 15);
            setHealth(Math.round(droneStateRef.current.health));
          }
        } else {
          setIsCharging(false);
        }
      } else {
        setIsCharging(false);
        // Standard flight battery drain
        if (droneStateRef.current.battery > 0) {
          if (droneStateRef.current.demoMode) {
            droneStateRef.current.battery = 100;
            setBattery(100);
          } else {
            const moveSpeed = physics.vel.length();
            const speedFactor = 1 + (moveSpeed / 10);
            droneStateRef.current.battery = Math.max(0, droneStateRef.current.battery - delta * 1.5 * speedFactor);
            setBattery(Math.round(droneStateRef.current.battery));

            if (Math.round(droneStateRef.current.battery) === 20 && Math.random() < 0.01) {
              addLog('LOW BATTERY. 20% remaining. Return to base.', 'warn');
            }
          }
        }
      }

      // Apply controls to forces
      const inputSpeed = physics.speedScale;
      const pitchInput = moveForward + moveBackward;
      const rollInput = strafeRight + strafeLeft;
      const yawInput = yawRight + yawLeft;

      // Rotate Drone Yaw heading
      if (yawInput !== 0) {
        physics.rotY += yawInput * 2.2 * delta;
        droneGroup.rotation.y = physics.rotY;
      }

      // Calculate translation direction based on local heading
      const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), physics.rotY);
      const rightDir = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), physics.rotY);

      if (droneStateRef.current.battery > 0 && droneStateRef.current.health > 0) {
        // Accelerate horizontally
        physics.vel.addScaledVector(forwardDir, pitchInput * inputSpeed * delta);
        physics.vel.addScaledVector(rightDir, rollInput * inputSpeed * delta);

        // Accelerate vertically
        if (droneStateRef.current.hover) {
          // Hover lock dampening vertical motion
          physics.vel.y += (liftUp + liftDown) * 12 * delta;
          physics.vel.y *= 0.82; // Strong hover braking
        } else {
          // Manual lift with standard gravity
          if (liftUp !== 0 || liftDown !== 0) {
            physics.vel.y += (liftUp + liftDown) * physics.lift * 1.5 * delta;
          } else {
            physics.vel.y += physics.gravity * delta;
          }
        }
      } else {
        // Dead engines fall
        physics.vel.y += physics.gravity * delta;
        physics.vel.x *= 0.95;
        physics.vel.z *= 0.95;
        physics.vel.y = Math.max(physics.vel.y, physics.terminalVel);
      }

      // Apply air resistance / drag friction
      physics.vel.x *= physics.inertia;
      physics.vel.z *= physics.inertia;
      if (!droneStateRef.current.hover) {
        physics.vel.y *= 0.98;
      }

      // Update position
      physics.pos.addScaledVector(physics.vel, delta);

      // Check No-Fly Zone (assemblies of uninvolved people) violations
      const enginesActive = droneStateRef.current.battery > 0 && droneStateRef.current.health > 0;
      if (enginesActive && !missionFailed && !completedPatrol) {
        for (const zone of assemblies.current) {
          const dist2D = new THREE.Vector2(physics.pos.x - zone.position.x, physics.pos.z - zone.position.z).length();
          if (dist2D < zone.radius) {
            if (droneStateRef.current.demoMode) {
              if (Math.random() < 0.015) {
                addLog(`DEMO MODE EXEMPTION: Flying over ${zone.name}. Regulation violation bypassed.`, 'warn');
              }
            } else {
              // Player flew over people! Trigger immediate mission failure
              setMissionFailed(true);
              setFailureReason('people');
              setFailedZoneName(zone.name);
              addLog(`CRITICAL REGULATION VIOLATION: Flew over ${zone.name}!`, 'alert');
              physics.vel.setScalar(0); // Cut power
              droneStateRef.current.health = 0; // Disable drone
              setHealth(0);
              break;
            }
          }
        }
      }

      // Check battery power core depletion failure
      if (droneStateRef.current.battery <= 0 && !missionFailed && !completedPatrol) {
        if (physics.pos.y <= 0.22) {
          setMissionFailed(true);
          setFailureReason('battery');
          physics.vel.setScalar(0);
          addLog('CRITICAL POWER LOSS: Battery completely exhausted!', 'alert');
        }
      }

      // ──────────────────────────────────────────────
      // COLLISION DETECTION & RESOLUTION
      // ──────────────────────────────────────────────
      // Create a small spherical bounding box representing drone radius
      const droneRadius = 0.55;
      const droneBox = new THREE.Box3(
        new THREE.Vector3(physics.pos.x - droneRadius, physics.pos.y - 0.2, physics.pos.z - droneRadius),
        new THREE.Vector3(physics.pos.x + droneRadius, physics.pos.y + 0.25, physics.pos.z + droneRadius)
      );

      // Check building collisions
      for (const bBox of buildingColliders) {
        if (droneBox.intersectsBox(bBox)) {
          // Compute penetration depth vectors
          const overlapX = Math.min(droneBox.max.x - bBox.min.x, bBox.max.x - droneBox.min.x);
          const overlapY = Math.min(droneBox.max.y - bBox.min.y, bBox.max.y - droneBox.min.y);
          const overlapZ = Math.min(droneBox.max.z - bBox.min.z, bBox.max.z - droneBox.min.z);

          const collisionSpeed = physics.vel.length();

          // Push back along smallest overlap axis
          if (overlapX < overlapY && overlapX < overlapZ) {
            physics.pos.x += physics.pos.x > (bBox.min.x + bBox.max.x) / 2 ? overlapX : -overlapX;
            physics.vel.x = -physics.vel.x * 0.4; // Bounce back slightly
          } else if (overlapZ < overlapX && overlapZ < overlapY) {
            physics.pos.z += physics.pos.z > (bBox.min.z + bBox.max.z) / 2 ? overlapZ : -overlapZ;
            physics.vel.z = -physics.vel.z * 0.4;
          } else {
            physics.pos.y += physics.pos.y > (bBox.min.y + bBox.max.y) / 2 ? overlapY : -overlapY;
            physics.vel.y = -physics.vel.y * 0.2;
          }

          // Trigger collision damage
          if (collisionSpeed > 2.5 && time - lastCollisionTime > 0.8) {
            const damage = Math.round(collisionSpeed * 4.5);
            if (droneStateRef.current.demoMode) {
              addLog(`DEMO MODE EXEMPTION: Hit structure. ${damage} HP damage bypassed.`, 'warn');
              lastCollisionTime = time;
            } else {
              droneStateRef.current.health = Math.max(0, droneStateRef.current.health - damage);
              setHealth(droneStateRef.current.health);
              lastCollisionTime = time;
              addLog(`COLLISION ALERT! Striking hull speed ${Math.round(collisionSpeed * 3.6)} km/h. -${damage} HP`, 'alert');
              if (droneStateRef.current.health <= 0) {
                setMissionFailed(true);
                setFailureReason('collision');
              }
            }
          }
        }
      }

      // Check Crane hanging load collision
      const craneGroup = (scene as any).constructionSite;
      if (craneGroup && craneGroup.loadCollider) {
        if (droneBox.intersectsBox(craneGroup.loadCollider)) {
          physics.pos.y += 0.5; // push up
          physics.vel.setScalar(0);
          if (time - lastCollisionTime > 0.8) {
            if (droneStateRef.current.demoMode) {
              addLog('DEMO MODE EXEMPTION: Hit crane hanging load. 15 HP damage bypassed.', 'warn');
              lastCollisionTime = time;
            } else {
              droneStateRef.current.health = Math.max(0, droneStateRef.current.health - 15);
              setHealth(droneStateRef.current.health);
              lastCollisionTime = time;
              addLog('COLLISION! Hit crane suspended iron truss. -15 HP', 'alert');
              if (droneStateRef.current.health <= 0) {
                setMissionFailed(true);
                setFailureReason('collision');
              }
            }
          }
        }
      }

      // Altitude clamps (Ground limits and air ceilings)
      const flightCeiling = 120;
      if (physics.pos.y < 0.15) {
        physics.pos.y = 0.15;
        physics.vel.y = 0;
      }
      if (physics.pos.y > flightCeiling) {
        physics.pos.y = flightCeiling;
        physics.vel.y = 0;
      }

      // Bank tilt angles based on acceleration vectors
      // Transform local coordinates of velocity to find pitch and roll banking
      const invYawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -physics.rotY);
      const localVel = physics.vel.clone().applyQuaternion(invYawQuat);

      const targetPitch = localVel.z * 0.045; // pitch forwards/backwards
      const targetRoll = -localVel.x * 0.045; // roll sides

      physics.currentPitch += (targetPitch - physics.currentPitch) * 8 * delta;
      physics.currentRoll += (targetRoll - physics.currentRoll) * 8 * delta;

      // Apply banking tilt to the inner mesh group
      droneMeshGroup.rotation.set(physics.currentPitch, 0, physics.currentRoll);

      // Spin blades proportional to thrust & velocity
      const isEnginesActive = droneStateRef.current.battery > 0 && droneStateRef.current.health > 0;
      rotors.forEach((rotor, idx) => {
        if (isEnginesActive) {
          const spinSpeed = 16 + (Math.abs(physics.vel.y) * 4);
          rotor.rotation.y += spinSpeed * delta * (idx % 2 === 0 ? 1 : -1);
        } else {
          // Slowly decay rotor spinning
          rotor.rotation.y += Math.max(0, 10 - time) * delta;
        }
      });

      // ──────────────────────────────────────────────
      // FLIGHT PATROL COURSE SECURING
      // ──────────────────────────────────────────────
      if (targetWp) {
        // Place active waypoint visuals in world space
        waypointRing.position.copy(targetWp.position);
        waypointSphere.position.copy(targetWp.position);

        // Spin and pulse active waypoint visuals
        waypointRing.rotation.z += 1.5 * delta;
        const scaleVal = 1.0 + Math.sin(time * 5.0) * 0.15;
        waypointSphere.scale.setScalar(scaleVal);

        // Compute distance
        const dist = physics.pos.distanceTo(targetWp.position);
        setWaypointProgressMsg(`${targetWp.name}: ${Math.round(dist)} meters away.`);

        // Securing Waypoint check
        if (dist <= targetWp.targetRadius && isEnginesActive) {
          const isReturningBaseFinal = targetWp.name === 'Base Return';
          const isLandedHelipad = isCurrentlyLanded;

          // Special condition: To clear "Base Return" or "Skyscraper Helipad", player must land!
          const needsLand = targetWp.name === 'Skyscraper Helipad' || isReturningBaseFinal;
          const isSecured = needsLand ? isLandedHelipad : true;

          if (isSecured) {
            const nextIdx = activeIdx + 1;
            if (nextIdx < waypoints.current.length) {
              droneStateRef.current.currentWaypointIdx = nextIdx;
              setCurrentWaypointIdx(nextIdx);
              addLog(`CHECKPOINT CLEAR! Reached: ${targetWp.name}`, 'success');
              addLog(`New Course Synced: ${waypoints.current[nextIdx].name}`, 'info');
            } else {
              setCompletedPatrol(true);
              addLog('PATROL SECURED! Drone safely completed routine patrol sweeps.', 'success');
            }
          } else if (needsLand && Math.random() < 0.01) {
            addLog(`APPROACH SUCCESSFUL. Decrease altitude to land on ${targetWp.name} to secure checkpoint.`, 'warn');
          }
        }
      }

      // ──────────────────────────────────────────────
      // CAMERA SYSTEM UPDATES
      // ──────────────────────────────────────────────
      const activeCamIndex = droneStateRef.current.cameraIndex;
      let renderCamera = cameraOrbit;

      if (activeCamIndex === 0) {
        // Orbit cam revolves around targets, update damping orbit controls
        controls.target.copy(physics.pos);
        controls.update();
        renderCamera = cameraOrbit;
      } else if (activeCamIndex === 1) {
        // FPV View looking front
        cameraFPV.position.copy(physics.pos).add(new THREE.Vector3(0, 0.15, 0.12).applyQuaternion(droneGroup.quaternion));
        const lookTarget = physics.pos.clone().add(forwardDir.clone().multiplyScalar(15));
        lookTarget.y += physics.currentPitch * 5; // look tilt lag
        cameraFPV.lookAt(lookTarget);
        renderCamera = cameraFPV;
      } else if (activeCamIndex === 2) {
        // Chase Cam smoothly interpolating behind
        const targetCamOffset = new THREE.Vector3(0, 3.2, -6.8).applyQuaternion(droneGroup.quaternion);
        const targetCamPos = physics.pos.clone().add(targetCamOffset);
        cameraChase.position.lerp(targetCamPos, 0.08); // Smooth chase lag
        cameraChase.lookAt(physics.pos.clone().add(new THREE.Vector3(0, 0.5, 0)));
        renderCamera = cameraChase;
      }

      // Dynamic guide arrow hovering above drone pointing to current waypoint
      if (targetWp) {
        guideArrow.position.copy(physics.pos).add(new THREE.Vector3(0, 1.1, 0));
        const toWpVec = targetWp.position.clone().sub(physics.pos);
        
        // Orient arrow along vector
        const arrowDirection = toWpVec.clone().normalize();
        const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), arrowDirection);
        guideArrow.quaternion.copy(alignQuat);
        
        // Pulse guide arrow size
        guideArrow.scale.set(0.8 + Math.sin(time*4.5)*0.1, 1.2 + Math.sin(time*4.5)*0.15, 0.8 + Math.sin(time*4.5)*0.1);
      }

      // Update telemetry variables
      setAltitude(Math.round(physics.pos.y * 10) / 10);
      setSpeed(Math.round(physics.vel.length() * 3.6 * 10) / 10);
      setVSpeed(Math.round(physics.vel.y * 10) / 10);
      setPitch(Math.round(physics.currentPitch * (180 / Math.PI)));
      setRoll(Math.round(physics.currentRoll * (180 / Math.PI)));

      // Dynamic Grid Coordinates
      const baseLat = 40.7128;
      const baseLng = -74.0060;
      const calculatedLat = (baseLat + (physics.pos.z / 15000)).toFixed(5);
      const calculatedLng = (baseLng + (physics.pos.x / 15000)).toFixed(5);
      setCoordinates(`${calculatedLat}° N, ${Math.abs(parseFloat(calculatedLng)).toFixed(5)}° W`);

      // Fluctuating signal indicators
      if (Math.random() < 0.08) {
        setSatLock(Math.round((98 + Math.random() * 1.8) * 10) / 10);
        setLatency(Math.round(11 + Math.random() * 4));
        const tempBase = 38 + (physics.vel.length() * 1.5);
        setEngineTemp(Math.round(tempBase + Math.sin(time) * 0.5));
      }

      renderer.render(scene, renderCamera);
    };

    // Begin loop
    const animationFrameId = requestAnimationFrame(animate);

    // ──────────────────────────────────────────────
    // 6. 2D TOPOGRAPHICAL RADAR UPDATES
    // ──────────────────────────────────────────────
    const updateRadar = () => {
      const rCanvas = radarCanvasRef.current;
      if (!rCanvas) return;
      const rCtx = rCanvas.getContext('2d');
      if (!rCtx) return;

      const w = rCanvas.width;
      const h = rCanvas.height;
      rCtx.clearRect(0, 0, w, h);

      // Radar screen circle frame
      rCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      rCtx.fillRect(0, 0, w, h);

      // Green grid circles
      rCtx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
      rCtx.lineWidth = 1;
      rCtx.beginPath(); rCtx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); rCtx.stroke();
      rCtx.beginPath(); rCtx.arc(w / 2, h / 2, w / 3, 0, Math.PI * 2); rCtx.stroke();
      rCtx.beginPath(); rCtx.arc(w / 2, h / 2, w / 6, 0, Math.PI * 2); rCtx.stroke();

      // Crosshairs
      rCtx.beginPath(); rCtx.moveTo(w / 2, 0); rCtx.lineTo(w / 2, h); rCtx.stroke();
      rCtx.beginPath(); rCtx.moveTo(0, h / 2); rCtx.lineTo(w, h / 2); rCtx.stroke();

      // Draw city street outlines (top-down view)
      // Map 3D coordinate space [-100, 100] -> [0, w]
      const toRadarX = (wx: number) => (wx / CITY_SIZE) * (w / 2) + (w / 2);
      const toRadarZ = (wz: number) => (wz / CITY_SIZE) * (h / 2) + (h / 2);

      // Draw sidewalk blocks
      rCtx.fillStyle = 'rgba(51, 65, 85, 0.4)';
      for (let bx = -2; bx <= 2; bx++) {
        for (let bz = -2; bz <= 2; bz++) {
          const cx = bx * spacing;
          const cz = bz * spacing;
          const bW = toRadarX(cx + BLOCK_SIZE / 2) - toRadarX(cx - BLOCK_SIZE / 2);
          const bH = toRadarZ(cz + BLOCK_SIZE / 2) - toRadarZ(cz - BLOCK_SIZE / 2);
          rCtx.fillRect(toRadarX(cx - BLOCK_SIZE / 2), toRadarZ(cz - BLOCK_SIZE / 2), bW, bH);
        }
      }

      // Draw No-Fly Zones (assemblies of people) on the radar map
      rCtx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      rCtx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
      rCtx.lineWidth = 1;
      assemblies.current.forEach(zone => {
        const zx = toRadarX(zone.position.x);
        const zy = toRadarZ(zone.position.z);
        const zr = (zone.radius / CITY_SIZE) * (w / 2);

        rCtx.beginPath();
        rCtx.arc(zx, zy, zr, 0, Math.PI * 2);
        rCtx.fill();
        rCtx.stroke();

        // Draw center warning label
        rCtx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        rCtx.font = 'bold 7px monospace';
        rCtx.textAlign = 'center';
        rCtx.fillText('CROWD', zx, zy + 2.5);
      });

      // Draw active Waypoint
      const activeIdx = droneStateRef.current.currentWaypointIdx;
      const targetWp = waypoints.current[activeIdx];
      if (targetWp) {
        const tx = toRadarX(targetWp.position.x);
        const ty = toRadarZ(targetWp.position.z);
        
        // Pulsing yellow target dot
        rCtx.fillStyle = 'rgba(234, 179, 8, 0.8)';
        rCtx.beginPath();
        rCtx.arc(tx, ty, 5 + Math.sin(Date.now() * 0.006) * 2, 0, Math.PI * 2);
        rCtx.fill();

        // Line guiding to checkpoint
        rCtx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
        rCtx.lineWidth = 1.5;
        rCtx.setLineDash([3, 3]);
        rCtx.beginPath();
        rCtx.moveTo(toRadarX(droneStateRef.current.pos.x), toRadarZ(droneStateRef.current.pos.z));
        rCtx.lineTo(tx, ty);
        rCtx.stroke();
        rCtx.setLineDash([]);
      }

      // Draw base home pad
      rCtx.fillStyle = '#06b6d4';
      rCtx.beginPath();
      rCtx.arc(toRadarX(0), toRadarZ(0), 4, 0, Math.PI * 2);
      rCtx.fill();

      // Draw Drone (blinking green triangle pointing along yaw)
      const dx = toRadarX(droneStateRef.current.pos.x);
      const dy = toRadarZ(droneStateRef.current.pos.z);
      const yaw = droneStateRef.current.yaw;

      rCtx.save();
      rCtx.translate(dx, dy);
      rCtx.rotate(yaw); // Heading direction

      // Green chevron
      rCtx.fillStyle = '#10b981';
      rCtx.beginPath();
      rCtx.moveTo(0, 6);   // Tip
      rCtx.lineTo(-4, -4); // Bottom Left
      rCtx.lineTo(0, -1);  // Tail indent
      rCtx.lineTo(4, -4);  // Bottom Right
      rCtx.closePath();
      rCtx.fill();
      rCtx.restore();
    };

    const radarTimer = setInterval(updateRadar, 100);

    // ──────────────────────────────────────────────
    // 7. INPUT LISTENERS
    // ──────────────────────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keysPressed.current) {
        keysPressed.current[key] = true;
        // Turn off Autopilot on any manual steering key press
        if (['w', 's', 'a', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key) && droneStateRef.current.autopilot) {
          droneStateRef.current.autopilot = false;
          setAutopilotOn(false);
          addLog('Manual override: Autopilot disengaged.', 'warn');
        }
      }

      // Takeoff shortcut on Space
      if (e.code === 'Space') {
        e.preventDefault();
        const isCurrentlyLanded = droneStateRef.current.pos.y <= 0.35 + 0.01;
        if (isCurrentlyLanded) {
          droneStateRef.current.vel.y = 5.5; // Upward force
          addLog('Takeoff thrust active. Rotors spinning up.', 'info');
        }
      }

      // Key toggle shortcuts
      if (key === 'h') {
        toggleHover();
      }
      if (key === 'v' || key === 'c') {
        cycleCamera();
      }
      if (key === 'r') {
        triggerAutopilot();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keysPressed.current) {
        keysPressed.current[key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Handle viewport resize
    const handleResize = () => {
      if (!canvasRef.current) return;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      cameraOrbit.aspect = w / h;
      cameraOrbit.updateProjectionMatrix();
      cameraFPV.aspect = w / h;
      cameraFPV.updateProjectionMatrix();
      cameraChase.aspect = w / h;
      cameraChase.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    window.addEventListener('resize', handleResize);

    // Cleanups
    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(radarTimer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Update dynamic coords of waypoints dynamically
  const activeWp = waypoints.current[currentWaypointIdx];

  return (
    <div className="w-full h-screen bg-slate-50 text-slate-800 flex flex-col font-mono overflow-hidden select-none border-4 border-slate-200 relative" id="main_container">
      
      {/* ONBOARDING INITIAL OVERLAY */}
      {isOnboardingOpen && (
        <div className="absolute inset-0 bg-slate-100/95 z-50 flex items-center justify-center p-4 md:p-8 backdrop-blur-md overflow-y-auto" id="onboarding_screen">
          <div className="max-w-4xl w-full bg-white border-2 border-blue-500/20 rounded-lg shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
            {/* Left Brand Visual Panel */}
            <div className="w-full md:w-5/12 bg-slate-50 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200">
              <div className="space-y-4">
                <Drone4BuildLogo className="h-14" />
                <div className="space-y-1">
                  <div className="text-xs text-blue-600 font-bold tracking-widest uppercase">Course 1 // Module 2</div>
                  <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase leading-snug">Airspace Safety &amp; Regulations</h1>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Practical Flight Laboratory</p>
                </div>
              </div>

              <div className="hidden md:block p-3 bg-amber-50 border border-amber-200 rounded space-y-2 mt-4">
                <div className="text-[10px] text-amber-600 font-bold uppercase tracking-widest flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Certification Objective
                </div>
                <p className="text-[10px] text-slate-700 leading-relaxed font-sans">
                  Obtain your commercial UAS survey clearance by safely piloting the drone from central HQ Base to Helipad B on the north tower without crossing restricted assemblies.
                </p>
              </div>
            </div>

            {/* Right Instructions / Action Panel */}
            <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <h2 className="text-base font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2">
                  Welcome to Flight Lab: Safe Flight Over Assemblies
                </h2>

                <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                  <p>
                    Greetings, Pilot. This interactive flight simulator is a mandatory unit of your **Drone Commercial License course**. You will operate the <strong className="text-blue-600 font-bold">D4B-Surveyor X8</strong> quadcopter on an urban construction survey site.
                  </p>

                  <div className="space-y-2 bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Key Safety Directives:
                    </div>
                    <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11px]">
                      <li>
                        <span className="text-red-500 font-bold">STRICT PROHIBITION:</span> EASA Open Category regulations (specifically UAS.OPEN.060) strictly forbid piloting drones directly over assemblies of uninvolved people on the ground due to injury hazards.
                      </li>
                      <li>
                        <span className="text-amber-600 font-bold">DETOUR CHANNELS:</span> Ground LIDAR scans have flagged three active crowds (marked by red glowing columns). You must pilot laterally around them.
                      </li>
                      <li>
                        <span className="text-emerald-600 font-bold">ALTITUDE RECOVERY:</span> Helipad B is located on a skyscraper rooftop 41 meters high. Take care of vertical climb rate and hover drift.
                      </li>
                    </ul>
                  </div>

                  <p className="text-slate-500 text-[11px]">
                    Before launching, you must register your flight plan and confirm compliance checks to comply with commercial airspace authorization requirements.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setIsOnboardingOpen(false);
                    setIsRegistrationOpen(true);
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 font-bold uppercase tracking-widest text-xs rounded transition-all cursor-pointer shadow-lg shadow-blue-900/10 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> CONFIGURE FLIGHT PLAN &gt;&gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLIGHT PLAN REGISTRATION OVERLAY */}
      {isRegistrationOpen && (
        <div className="absolute inset-0 bg-slate-100/95 z-50 flex items-center justify-center p-4 md:p-8 backdrop-blur-md overflow-y-auto" id="registration_screen">
          <div className="max-w-5xl w-full bg-white border-2 border-emerald-500/20 rounded-lg shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
            
            {/* Header branding */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Drone4BuildLogo className="h-9" />
                <span className="text-slate-300">|</span>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                  Airspace Compliance Registry
                </span>
              </div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">
                REGISTRY ID: <span className="text-slate-800">D4B-839-EASA</span>
              </div>
            </div>

            {/* Main Content: 3-column Layout */}
            <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
              
              {/* Column 1: Pilot & Drone Specs (4/12 cols) */}
              <div className="lg:col-span-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-blue-600" /> Pilot &amp; UAS Specs
                </h3>

                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3 text-[11px]">
                  <div>
                    <span className="text-slate-500 uppercase block text-[9px] font-bold">Operator Name</span>
                    <span className="text-slate-800 font-bold">Aleksandar Mladenoski</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[9px] font-bold">License Status</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> EASA A1/A3 Open Certificate
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[9px] font-bold">UAS Class</span>
                    <span className="text-slate-800 font-bold">Category A2 Open / Commercial Survey</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[9px] font-bold">Drone Airframe</span>
                    <span className="text-slate-800 font-mono font-bold">D4B-Surveyor X8 Dual-Hexa</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[9px] font-bold">Primary Sensors</span>
                    <span className="text-blue-600 font-bold">120m Sweep LiDAR + FPV Gimbal</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-[11px] text-slate-700 leading-relaxed">
                  <div className="text-[10px] text-blue-700 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Site Clearance
                  </div>
                  Authorized for structural mapping of skyscraper under-construction at block coordinates x=45, z=-45. All ground activity must remain within radar coverage.
                </div>
              </div>

              {/* Column 2: Interactive Tactical Map (4/12 cols) */}
              <div className="lg:col-span-4 flex flex-col">
                <TacticalMap />
              </div>

              {/* Column 3: Pre-Flight Safety Checklist (4/12 cols) */}
              <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-amber-600" /> Pre-Flight Safety Checks
                  </h3>

                  <p className="text-[10px] text-slate-500 leading-normal">
                    You must verify all system variables and sign off on EASA regulations prior to unlocking drone rotor ignition.
                  </p>

                  {/* Interactive Checkbox Items */}
                  <div className="space-y-2">
                    {/* Item 1 */}
                    <label className={`flex items-start gap-3 p-2.5 rounded border transition-all cursor-pointer text-[11px] ${checkWind ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      <input 
                        type="checkbox" 
                        checked={checkWind}
                        onChange={(e) => setCheckWind(e.target.checked)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-3.5 h-3.5"
                      />
                      <div>
                        <span className="font-bold block uppercase tracking-wide text-slate-700">Wind velocity check</span>
                        Current: 12 knots. (EASA safety limit: 15 knots).
                      </div>
                    </label>

                    {/* Item 2 */}
                    <label className={`flex items-start gap-3 p-2.5 rounded border transition-all cursor-pointer text-[11px] ${checkBattery ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      <input 
                        type="checkbox" 
                        checked={checkBattery}
                        onChange={(e) => setCheckBattery(e.target.checked)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-3.5 h-3.5"
                      />
                      <div>
                        <span className="font-bold block uppercase tracking-wide text-slate-700">Power cell calibration</span>
                        Fuel cells fully charged at 100%. Set low battery alarm.
                      </div>
                    </label>

                    {/* Item 3 */}
                    <label className={`flex items-start gap-3 p-2.5 rounded border transition-all cursor-pointer text-[11px] ${checkFAA ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      <input 
                        type="checkbox" 
                        checked={checkFAA}
                        onChange={(e) => setCheckFAA(e.target.checked)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-3.5 h-3.5"
                      />
                      <div>
                        <span className="font-bold block uppercase tracking-wide text-slate-700">EASA Assembly Agreement</span>
                        I agree to maintain lateral detours and NOT fly over crowds.
                      </div>
                    </label>

                    {/* Item 4 */}
                    <label className={`flex items-start gap-3 p-2.5 rounded border transition-all cursor-pointer text-[11px] ${checkCeiling ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      <input 
                        type="checkbox" 
                        checked={checkCeiling}
                        onChange={(e) => setCheckCeiling(e.target.checked)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-3.5 h-3.5"
                      />
                      <div>
                        <span className="font-bold block uppercase tracking-wide text-slate-700">Ceiling Sync (120m max)</span>
                        Calibrate altimeter with local site survey elevation datum.
                      </div>
                    </label>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    disabled={!(checkWind && checkBattery && checkFAA && checkCeiling)}
                    onClick={() => {
                      setIsRegistrationOpen(false);
                      addLog('Flight Plan D4B-839 Registered with EASA Agent. Rotor Ignition UNLOCKED!', 'success');
                      addLog('IGNITION UNLOCKED: Take off with SPACE or E keys.', 'warn');
                    }}
                    className={`w-full py-3 border font-bold uppercase tracking-widest text-xs rounded transition-all flex items-center justify-center gap-2 ${
                      (checkWind && checkBattery && checkFAA && checkCeiling)
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 cursor-pointer shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {checkWind && checkBattery && checkFAA && checkCeiling ? (
                      <>
                        <Unlock className="w-4 h-4" /> SUBMIT REGISTRY &amp; START TAKE OFF
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" /> VERIFY SAFETY CHECKS TO UNLOCK
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* POWER EXHAUSTION CRITICAL OVERLAY */}
      {missionFailed && failureReason === 'battery' && (
        <div className="absolute inset-0 bg-slate-100/95 z-50 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md" id="battery_fail_screen">
          <ShieldAlert className="w-16 h-16 text-amber-600 animate-pulse mb-4" />
          <h2 className="text-2xl font-black tracking-widest text-amber-600 uppercase">POWER CELL COMPLETELY EXHAUSTED</h2>
          <div className="max-w-lg text-slate-700 mt-2 space-y-3 text-xs md:text-sm leading-relaxed" id="battery_failed_text">
            <p className="font-bold text-amber-700">
              FLIGHT SYSTEM SHUTDOWN: Low-voltage safety override triggered.
            </p>
            <p>
              Your surveyor drone ran out of electrical charge before completing the safety course objectives. In high-wind urban settings, horizontal maneuvers significantly increase power draw.
            </p>
            <p className="text-slate-500">
              SAFETY ADVICE: You can land on the central <strong>HQ Launch Pad</strong> or the high <strong>Skyscraper Rooftop Helipad</strong> during flights to rapidly recharge your power cells!
            </p>
          </div>
          <button 
            onClick={resetGame}
            className="mt-6 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 border border-amber-400 text-white font-bold uppercase tracking-widest cursor-pointer rounded transition-all text-xs flex items-center gap-2 shadow-lg shadow-amber-500/10"
            id="recharge_reboot_btn"
          >
            <RotateCcw className="w-4 h-4" /> RECHARGE &amp; REBOOT DRONE
          </button>
        </div>
      )}
      
      {/* HEADER BAR */}
      <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white" id="header_bar">
        <div className="flex items-center gap-4">
          <Drone4BuildLogo className="h-9" />
          <span className="hidden lg:inline text-[9px] px-2 py-0.5 bg-slate-100 rounded text-slate-500 border border-slate-200 font-bold uppercase tracking-wider">
            FLIGHT COMPLIANCE LAB
          </span>
          {demoMode && (
            <span className="animate-pulse bg-amber-500/10 border border-amber-400/50 text-amber-600 font-bold text-[9px] px-2 py-0.5 rounded tracking-widest uppercase">
              DEMO MODE ACTIVE
            </span>
          )}
        </div>

        <div className="flex gap-4 md:gap-8 text-[11px] md:text-xs font-medium uppercase tracking-widest text-slate-500">
          <div className="flex flex-col">
            <span className="text-slate-400 text-[9px] uppercase font-bold">Satellite Link</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <Radio className="w-3 h-3" /> {satLock}% Lock
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-[9px] uppercase font-bold">Latency</span>
            <span className="text-emerald-600 font-bold">{latency}ms (Direct)</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-[9px] uppercase font-bold">Power Core</span>
            <span className={`font-bold flex items-center gap-1 ${demoMode ? 'text-emerald-600' : battery < 25 ? 'text-red-600 animate-pulse underline' : 'text-orange-500'}`}>
              <Battery className="w-3 h-3" /> {demoMode ? 'UNLIMITED' : `${battery}%`}
            </span>
          </div>
        </div>
      </div>

      {/* WORKSPACE CONTENT LAYOUT */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden" id="workspace_content">
        
        {/* LEFT SIDEBAR PANEL: CONTROL HUB */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col p-4 bg-slate-50 overflow-y-auto" id="left_sidebar">
          <div className="text-xs text-slate-600 mb-2 uppercase font-bold tracking-widest flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-emerald-600" /> Targeting & Navigation
          </div>
          
          {/* Radar Canvas Panel */}
          <div className="w-full aspect-square bg-white border border-slate-200 relative mb-4 p-1 rounded overflow-hidden" id="radar_panel">
            <canvas 
              ref={radarCanvasRef} 
              width={240} 
              height={240} 
              className="w-full h-full block rounded"
              id="radar_canvas"
            />
            <div className="absolute bottom-2 right-2 text-[9px] text-emerald-700 font-bold bg-white/85 px-1 py-0.5 rounded border border-emerald-500/20 uppercase tracking-tighter">
              LIDAR SCANNER
            </div>
            <div className="absolute top-2 left-2 text-[9px] text-slate-400 uppercase">
              RDR // 2D TOPOGRAPHY
            </div>
          </div>

          {/* Waypoints Objectives Tracker */}
          <div className="flex-1 space-y-2.5 mb-4" id="objectives_list">
            {/* Regulatory Education Block */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-slate-700 leading-normal space-y-2">
              <div className="text-amber-700 font-bold uppercase tracking-widest flex items-center gap-1.5 border-b border-amber-200 pb-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Regulation Notice (EASA)
              </div>
              <p>
                <strong>No-Fly Over People Rule:</strong> Under EASA Article 4, drone operators are strictly prohibited from flying over assemblies of uninvolved citizens to ensure flight safety.
              </p>
              <p className="text-slate-500 text-[10px]">
                Lidar has highlighted 3 assemblies with <span className="text-red-600 font-bold">red pillars</span>. Plan a lateral detour around them to complete your route.
              </p>
            </div>

            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Mission Objectives</div>
            
            {waypoints.current.map((wp, idx) => {
              const isActive = idx === currentWaypointIdx;
              const isCompleted = idx < currentWaypointIdx;
              const isFuture = idx > currentWaypointIdx;

              let styleClass = "border-slate-200 bg-white text-slate-600 shadow-sm";
              let dotColor = "bg-slate-400";
              
              if (isActive) {
                styleClass = "border-amber-400 bg-amber-50 text-amber-900 shadow-[inset_0_0_8px_rgba(245,158,11,0.05)]";
                dotColor = "bg-amber-500 animate-ping";
              } else if (isCompleted) {
                styleClass = "border-emerald-300 bg-emerald-50 text-emerald-900";
                dotColor = "bg-emerald-600";
              }

              return (
                <div key={wp.id} className={`p-2 border rounded-md text-[11px] flex gap-2 items-start transition-all ${styleClass}`}>
                  <div className="mt-0.5 relative">
                    <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
                    {isActive && <div className="absolute top-0 left-0 w-2 h-2 rounded-full bg-amber-500"></div>}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold uppercase tracking-wider flex justify-between items-center">
                      <span>{wp.name}</span>
                      {isCompleted && <span className="text-emerald-700 text-[10px] font-bold">CLEAR</span>}
                      {isActive && <span className="text-amber-700 text-[10px] font-bold animate-pulse">ACTIVE</span>}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{wp.description}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Terminal Console Log */}
          <div className="mt-auto p-2 bg-slate-900 border border-slate-850 rounded text-[9px] font-mono h-28 overflow-y-auto flex flex-col gap-1 text-slate-300 shadow-inner scrollbar-thin scrollbar-thumb-slate-800" id="terminal_feed">
            {logs.map((log, idx) => (
              <p key={idx} className="leading-3">
                <span className="text-slate-500">[{log.timestamp}]</span>{' '}
                <span className={
                  log.type === 'success' ? 'text-emerald-400 font-medium' :
                  log.type === 'warn' ? 'text-amber-400 font-medium' :
                  log.type === 'alert' ? 'text-red-400 font-bold animate-pulse' : 'text-slate-300'
                }>
                  &gt; {log.text}
                </span>
              </p>
            ))}
          </div>
        </div>

        {/* CENTER VIEW: 3D WEBGL ENGINE & HEAVY OVERLAYS */}
        <div className="flex-1 bg-slate-950 relative flex flex-col h-full min-h-0" id="center_view">
          
          {/* Active Flight Canvas Container */}
          <div className="flex-1 relative w-full h-full" id="canvas_container">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" id="flight_canvas" />

            {/* Central Targeting Crosshairs Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" id="crosshair_hud">
              <div className="w-[360px] h-[220px] border border-emerald-500/20 flex items-center justify-center relative rounded-md">
                {/* Angle corner guides */}
                <div className="w-5 h-5 border-l border-t border-emerald-500/60 absolute top-0 left-0"></div>
                <div className="w-5 h-5 border-r border-t border-emerald-500/60 absolute top-0 right-0"></div>
                <div className="w-5 h-5 border-l border-b border-emerald-500/60 absolute bottom-0 left-0"></div>
                <div className="w-5 h-5 border-r border-b border-emerald-500/60 absolute bottom-0 right-0"></div>

                {/* Micro compass tape inside reticle */}
                <div className="absolute top-2 w-full text-center text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest">
                  HDG {Math.round(droneStateRef.current.yaw * (180 / Math.PI)) % 360}° // PTCH {pitch}° // RLL {roll}°
                </div>

                {/* Centering Dot Ring */}
                <div className="w-16 h-16 border border-dashed border-emerald-500/40 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></div>
                </div>

                {/* Waypoint Target Info Box inside overlay */}
                {activeWp && (
                  <div className="absolute bottom-2 text-[10px] text-center text-amber-700 font-bold uppercase bg-white/90 px-2 py-1 border border-amber-400 rounded shadow-md">
                    SYS LOCK &gt;&gt; {activeWp.name} : {Math.round(altitude)}m ALT
                  </div>
                )}
              </div>
            </div>

            {/* Float Alert Notifications (Landed, crash, complete) */}
            {missionFailed && failureReason === 'people' && (
              <div className="absolute inset-0 bg-red-50/95 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md z-30" id="regulation_fail_screen">
                <ShieldAlert className="w-16 h-16 text-red-600 animate-pulse mb-4" />
                <h2 className="text-2xl font-black tracking-widest text-red-600 uppercase">REGULATION VIOLATION: UNSAFE FLIGHT</h2>
                <div className="max-w-lg text-slate-700 mt-2 space-y-3 text-xs md:text-sm leading-relaxed" id="failed_reason_text">
                  <p className="font-bold text-red-700">
                    FLIGHT SUSPENDED: You flew directly over the <span className="underline decoration-red-500 font-extrabold text-red-900 bg-red-100 px-1.5 py-0.5 rounded">{failedZoneName}</span>.
                  </p>
                  <p>
                    Under <strong>EASA Open Category regulations (EU 2019/947)</strong>, flying unmanned aircraft directly over assemblies of uninvolved people on the ground is strictly prohibited due to severe injury hazards in the event of hardware or power loss.
                  </p>
                  <p className="text-slate-500">
                    To successfully obtain your virtual pilot certification, you must plan a lateral detour. Look at your <strong>2D Lidar Scanner</strong> and the <strong>3D HUD warning pillars</strong> to pilot a course around the hazard zones.
                  </p>
                </div>
                <button 
                  onClick={resetGame}
                  className="mt-6 px-6 py-2.5 bg-red-600 hover:bg-red-500 border border-red-500 text-white font-bold uppercase tracking-widest cursor-pointer rounded transition-all text-xs flex items-center gap-2 shadow-lg shadow-red-600/15"
                  id="replan_btn"
                >
                  <RotateCcw className="w-4 h-4" /> REPLAN DETOUR &amp; RETRY
                </button>
              </div>
            )}

            {missionFailed && failureReason === 'collision' && (
              <div className="absolute inset-0 bg-red-50/95 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm z-30" id="crash_screen">
                <ShieldAlert className="w-16 h-16 text-red-600 animate-bounce mb-4" />
                <h2 className="text-2xl font-bold tracking-widest text-red-600 uppercase">HULL INTEGRITY FATAL</h2>
                <p className="text-sm max-w-md text-slate-700 mt-2">
                  Drone airframe sustained critical structural damage. Power core offline. Reboot and repair to deploy again.
                </p>
                <button 
                  onClick={resetGame}
                  className="mt-6 px-6 py-2.5 bg-red-600 hover:bg-red-500 border border-red-500 text-white font-bold uppercase tracking-widest cursor-pointer rounded transition-all text-xs flex items-center gap-2 shadow-lg shadow-red-600/15"
                  id="reboot_drone_btn"
                >
                  <RotateCcw className="w-4 h-4" /> REBOOT &amp; REPAIR DRONE
                </button>
              </div>
            )}

            {completedPatrol && (
              <div className="absolute inset-0 bg-emerald-50/95 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md z-30" id="victory_screen">
                <CheckCircle className="w-16 h-16 text-emerald-600 animate-pulse mb-4" />
                <h2 className="text-2xl md:text-3xl font-black tracking-widest text-emerald-800 uppercase">COMPLIANCE TEST PASSED</h2>
                <div className="max-w-lg text-slate-700 mt-2 space-y-2 text-xs md:text-sm leading-relaxed" id="victory_text">
                  <p className="font-bold text-emerald-600">
                    EXEMPLARY PILOTING: Safety parameters fully satisfied!
                  </p>
                  <p>
                    You successfully navigated from takeoff, cleared the Alley Checkpoint, and landed on high rooftop <strong>Helipad B</strong> without entering the safety buffers of any ground crowd assemblies.
                  </p>
                  <p className="text-slate-500">
                    By piloting laterally around the crowds, you demonstrated high situational awareness and perfect compliance with drone license safety standards.
                  </p>
                </div>
                <button 
                  onClick={resetGame}
                  className="mt-6 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white font-bold uppercase tracking-widest cursor-pointer rounded transition-all text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/15"
                  id="rerun_test_btn"
                >
                  <Play className="w-4 h-4" /> RE-RUN COMPLIANCE TEST
                </button>
              </div>
            )}

            {/* Flight Controls Legend / HUD Help Panel (Absolute Top Right of Canvas) */}
            <div className="absolute top-4 right-4 max-w-[250px] bg-white/90 border border-slate-200 p-3 rounded text-[10px] space-y-2 pointer-events-auto shadow-md backdrop-blur-sm" id="controls_legend">
              <div className="text-emerald-700 font-bold uppercase tracking-widest flex items-center gap-1 border-b border-slate-200 pb-1">
                <HelpCircle className="w-3.5 h-3.5 animate-pulse text-emerald-600" /> Pilot Guidance
              </div>
              <div className="space-y-1 text-slate-700 leading-relaxed">
                <p><span className="text-amber-600 font-bold">W / S</span> : Pitch Front / Back</p>
                <p><span className="text-amber-600 font-bold">A / D</span> : Turn Left / Right (Yaw)</p>
                <p><span className="text-amber-600 font-bold">E / Q</span> : Vertical Ascend / Descend</p>
                <p><span className="text-amber-600 font-bold">ARROWS</span> : Horizontal Strafe / Roll</p>
                <p><span className="text-amber-600 font-bold">SPACE</span> : Instant Thrust (Takeoff)</p>
                <p><span className="text-amber-600 font-bold">H Key</span> : Toggle Altitude Hover</p>
                <p><span className="text-amber-600 font-bold">V / C</span> : Cycle Camera Sources</p>
                <p><span className="text-amber-600 font-bold">R Key</span> : Engages Autopilot</p>
              </div>
              <div className="pt-1.5 border-t border-slate-200 text-slate-400 text-[9px] uppercase font-bold text-center">
                SYSTEM CALIBRATED: OK
              </div>
            </div>

            {/* Right Telemetry Telemetry Gauges Overlaid on Canvas bottom */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2.5" id="telemetry_gauges">
              {/* Distance to Checkpoint */}
              {activeWp && (
                <div className="bg-white/90 border border-amber-400 p-2.5 rounded shadow-md backdrop-blur-sm min-w-[170px]" id="waypoint_hud">
                  <div className="text-[9px] text-amber-600 uppercase font-bold tracking-widest">Active Waypoint</div>
                  <div className="text-sm font-bold text-slate-800 flex items-center justify-between mt-0.5">
                    <span>{activeWp.name}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex justify-between">
                    <span>Range:</span>
                    <span className="font-bold text-amber-600">{Math.round(droneStateRef.current.pos.distanceTo(activeWp.position))}m</span>
                  </div>
                </div>
              )}

              {/* Altitude Telemetry Box */}
              <div className="bg-white/90 border border-slate-200 p-2.5 rounded shadow-md backdrop-blur-sm min-w-[170px]" id="altitude_hud">
                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest flex items-center justify-between">
                  <span>Altitude (ALTM)</span>
                  {hoverOn && <span className="text-emerald-700 text-[8px] border border-emerald-500/30 bg-emerald-50 px-1 py-0.1 rounded uppercase font-bold">Hover ON</span>}
                </div>
                <div className="text-2xl font-bold flex items-baseline justify-between text-slate-800 mt-0.5">
                  <span>{altitude.toFixed(1)}</span>
                  <span className="text-xs text-slate-500 uppercase font-bold">M</span>
                </div>
                {/* VSI vertical speed bar indicator */}
                <div className="w-full h-1 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${vSpeed >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, Math.abs(vSpeed) * 15)}%` }}
                  ></div>
                </div>
                <div className="text-[9px] text-slate-500 flex justify-between mt-1">
                  <span>VSI Speed:</span>
                  <span className="font-bold">{vSpeed >= 0 ? '+' : ''}{vSpeed.toFixed(1)} m/s</span>
                </div>
              </div>

              {/* Speed Telemetry Box */}
              <div className="bg-white/90 border border-slate-200 p-2.5 rounded shadow-md backdrop-blur-sm min-w-[170px]" id="speed_hud">
                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Ground Speed</div>
                <div className="text-2xl font-bold flex items-baseline justify-between text-slate-800 mt-0.5">
                  <span>{speed.toFixed(1)}</span>
                  <span className="text-xs text-slate-500 uppercase font-bold">KM/H</span>
                </div>
              </div>

              {/* Hull Health / Integrity Box */}
              <div className="bg-white/90 border border-slate-200 p-2.5 rounded shadow-md backdrop-blur-sm min-w-[170px]" id="integrity_hud">
                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Hull Integrity</div>
                <div className="text-xl font-bold flex items-center justify-between text-slate-800 mt-0.5">
                  <span className={health < 35 ? 'text-red-600 animate-pulse underline font-bold' : 'text-slate-800'}>{health}%</span>
                  <span className="text-[9px] text-slate-500 uppercase">Status: {health > 70 ? 'HEALTHY' : health > 30 ? 'CAUTION' : 'CRITICAL'}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${health > 60 ? 'bg-emerald-500' : health > 25 ? 'bg-amber-500' : 'bg-red-600 animate-pulse'}`}
                    style={{ width: `${health}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Left Top HUD floating alerts state (Charging, hover, landed) */}
            <div className="absolute top-4 left-4 flex flex-col gap-2" id="alerts_hud">
              {isCharging && (
                <div className="bg-emerald-50/95 border border-emerald-300 p-2.5 rounded text-xs font-bold text-emerald-800 uppercase tracking-widest animate-pulse flex items-center gap-2 shadow-md">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                  DOCK CONNECTOR ACTIVE // CHARGING SYSTEM CELLS
                </div>
              )}
              {isLanded && !isCharging && (
                <div className="bg-slate-50/95 border border-slate-300 p-2.5 rounded text-xs font-bold text-slate-700 uppercase tracking-widest shadow-sm">
                  DRONE DOCKED // ROTORS IDLE
                </div>
              )}
              {battery < 20 && !isCharging && (
                <div className="bg-red-50/95 border border-red-300 p-2.5 rounded text-xs font-bold text-red-800 uppercase tracking-widest animate-pulse flex items-center gap-2 shadow-md">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  CRITICAL CORE VOLTAGE FAULT // FORCE LAND IMMEDIATELY
                </div>
              )}
            </div>
          </div>

          {/* LOWER OPERATOR BAR FOR CONTROLS IN HUD */}
          <div className="h-16 border-t border-slate-200 bg-white flex items-center px-4 justify-between gap-4" id="operator_controls">
            <div className="flex gap-2 items-center">
              <button 
                onClick={triggerAutopilot}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase cursor-pointer rounded border transition-all ${
                  autopilotOn 
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]' 
                    : 'bg-white text-amber-650 border-amber-500/50 hover:bg-amber-50'
                }`}
                id="emergency_btn"
              >
                {autopilotOn ? 'Disengage Autopilot' : 'Emergency Return (Autopilot)'}
              </button>
              <button 
                onClick={cycleCamera}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 bg-white text-[10px] font-bold uppercase cursor-pointer rounded hover:bg-slate-100 hover:text-slate-900 transition-all"
                id="cam_cycle_btn"
              >
                Switch Cam [V] : {activeCamName}
              </button>
              <button 
                onClick={toggleHover}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase cursor-pointer rounded border transition-all ${
                  hoverOn 
                    ? 'bg-emerald-600 text-white border-emerald-500' 
                    : 'bg-white text-emerald-700 border-emerald-500/50 hover:bg-emerald-50'
                }`}
                id="hover_btn"
              >
                Altimeter Hover [H]: {hoverOn ? 'ON' : 'OFF'}
              </button>
              <button 
                onClick={() => {
                  const nextDemo = !demoMode;
                  setDemoMode(nextDemo);
                  addLog(nextDemo ? 'DEMO MODE ACTIVATED: Collision damage and power cells drain disabled!' : 'Standard EASA compliance rules enforced.', nextDemo ? 'warn' : 'info');
                }}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase cursor-pointer rounded border transition-all ${
                  demoMode 
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.35)] font-black' 
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
                id="demo_btn"
              >
                Practice Flight (Demo): {demoMode ? 'ON' : 'OFF'}
              </button>
            </div>
            
            <div className="hidden lg:flex items-center gap-3 text-slate-500 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span>Wind NE {windSpeed}kts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span>Lidar Sync</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER BAR */}
      <div className="h-12 border-t border-slate-200 bg-slate-100 flex items-center px-6 justify-between text-xs text-slate-600" id="footer_bar">
        <div className="text-[10px] text-slate-500 tracking-wider uppercase">
          GPS ADDR: <span className="text-emerald-700 font-bold">{coordinates}</span>
        </div>
        <div className="hidden md:flex text-[10px] text-slate-400 tracking-widest uppercase gap-6">
          <span>Engine Temp: <strong className="text-slate-700">{engineTemp}°C</strong></span>
          <span>Frame Time: <strong className="text-slate-700">{frameTime}ms</strong></span>
          <span>Battery Status: <strong className="text-emerald-600">HEALTHY</strong></span>
        </div>
      </div>
    </div>
  );
}
