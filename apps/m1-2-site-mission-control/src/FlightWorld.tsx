import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createHelipadTexture, createWindowTexture } from './prototype-assets';
import { inKnownZone, inNewZone, type Phase } from './rules';

type Props = { phase: Phase; onCheckpoint: () => void; onZone: (kind: 'known' | 'new') => void; onPosition: (x: number, z: number, y: number) => void; label: string };
const START = new THREE.Vector3(0, 1.6, 8);
const CHECKPOINT = new THREE.Vector3(4, 2.8, -10);

function marker(scene: THREE.Scene, x: number, z: number, radius: number, color: number, height = .11) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius - .16, radius, 48), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(x, height, z); scene.add(ring);
  return ring;
}

// The geometry and rotor arrangement follow the preserved prototype's procedural drone.
function createDrone() {
  const group = new THREE.Group();
  const carbon = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: .65, roughness: .28 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(.8, .24, .8), carbon); group.add(hull);
  const gimbal = new THREE.Mesh(new THREE.SphereGeometry(.18, 12, 12), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  gimbal.position.set(0, -.15, .25); group.add(gimbal);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
  lens.position.z = .13; gimbal.add(lens);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: .6 });
  for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(.08, .05, 1.2), armMat); arm.rotation.y = angle; group.add(arm);
  }
  const rotors: THREE.Group[] = [];
  const bladeMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
  for (const [x,z] of [[.42,.42],[-.42,.42],[.42,-.42],[-.42,-.42]]) {
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.12,8), carbon); hub.position.set(x,.1,z); group.add(hub);
    const blades = new THREE.Group(); blades.position.set(x,.18,z);
    for (const side of [-1,1]) { const blade = new THREE.Mesh(new THREE.BoxGeometry(.35,.015,.03), bladeMat); blade.position.x = side*.175; blades.add(blade); }
    group.add(blades); rotors.push(blades);
  }
  for (const x of [-.3,.3]) { const skid = new THREE.Mesh(new THREE.BoxGeometry(.04,.04,.9), carbon); skid.position.set(x,-.3,0); group.add(skid); }
  return { group, rotors };
}

export function FlightWorld({ phase, onCheckpoint, onZone, onPosition, label }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const live = useRef({ phase, onCheckpoint, onZone, onPosition });
  live.current = { phase, onCheckpoint, onZone, onPosition };
  useEffect(() => {
    const host = mount.current; if (!host) return;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x8eafc0); scene.fog = new THREE.Fog(0x8eafc0, 35, 85);
    const camera = new THREE.PerspectiveCamera(55, 1, .1, 120);
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; host.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xeaf9ff, 0x677982, 2.0));
    const sun = new THREE.DirectionalLight(0xfff4d6, 2.3); sun.position.set(-10, 22, 12); sun.castShadow = true; scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: 0x596c65, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const grid = new THREE.GridHelper(90, 45, 0x91a5a1, 0x748782); grid.position.y = .03; scene.add(grid);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(10, 34), new THREE.MeshStandardMaterial({ color: 0x9ca99d, roughness: 1 }));
    path.rotation.x = -Math.PI / 2; path.position.set(4,.045,-2); scene.add(path);
    const wallTexture = createWindowTexture(.2); wallTexture.repeat.set(2,2);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x7994a5, map: wallTexture });
    for (const [x,z,w,d,h] of [[-16,-4,8,18,14],[17,-13,10,10,18],[-15,-25,10,10,12],[15,12,10,10,11]] as const) {
      const building = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat); building.position.set(x,h/2,z); building.castShadow = true; scene.add(building);
    }
    const padTexture = createHelipadTexture();
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(8,8), new THREE.MeshStandardMaterial({ map: padTexture }));
    pad.rotation.x = -Math.PI / 2; pad.position.set(0,.08,8); scene.add(pad); marker(scene,0,8,4.4,0xfac55c);
    // Crane base and boom give the pre-existing exclusion area a visible cause.
    const craneMat = new THREE.MeshStandardMaterial({ color: 0xd4a83e, metalness: .3 });
    const mast = new THREE.Mesh(new THREE.BoxGeometry(.4,12,.4), craneMat); mast.position.set(-5,6,-9); scene.add(mast);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(10,.35,.35), craneMat); boom.position.set(-3,12,-9); scene.add(boom);
    const known = new THREE.Mesh(new THREE.CylinderGeometry(5,5,.09,48), new THREE.MeshBasicMaterial({ color: 0xcd5652, transparent: true, opacity: .53 }));
    known.position.set(-5,.1,-9); scene.add(known); marker(scene,-5,-9,5.2,0xe64345);
    const newZone = new THREE.Mesh(new THREE.PlaneGeometry(40,22), new THREE.MeshBasicMaterial({ color: 0xb63d38, transparent: true, opacity: .45, side: THREE.DoubleSide }));
    newZone.rotation.x = -Math.PI/2; newZone.position.set(0,.13,-26); scene.add(newZone);
    const newLine = marker(scene, 0,-15,18,0xe64345,.15);
    const target = marker(scene, CHECKPOINT.x,CHECKPOINT.z,3.6,0x51e1c5);
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(3.6,3.6,5,32,1,true), new THREE.MeshBasicMaterial({ color: 0x51e1c5, transparent: true, opacity: .11, side: THREE.DoubleSide, depthWrite: false }));
    beacon.position.set(CHECKPOINT.x,2.5,CHECKPOINT.z); scene.add(beacon);
    const { group: drone, rotors } = createDrone(); scene.add(drone);
    const initial = live.current.phase === 'return' || live.current.phase === 'adapt' ? CHECKPOINT : START;
    const pos = initial.clone(); const vel = new THREE.Vector3(); let lastSafe = initial.clone();
    let lastTime = performance.now(), lastReport = 0, lastZone = 0, reached = false, frame = 0;
    const keys = new Set<string>();
    const down = (e: KeyboardEvent) => { if (['w','a','s','d','q','e','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) { keys.add(e.key.toLowerCase()); e.preventDefault(); } };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const nudge = (e: Event) => {
      const key = (e as CustomEvent<string>).detail;
      if (live.current.phase !== 'flight' && live.current.phase !== 'return') return;
      if (key === 'w') pos.z -= 1.4; if (key === 's') pos.z += 1.4;
      if (key === 'a') pos.x -= 1.4; if (key === 'd') pos.x += 1.4;
      if (key === 'q') pos.y = Math.max(1.1,pos.y-.5); if (key === 'e') pos.y = Math.min(7,pos.y+.5);
    };
    window.addEventListener('keydown',down); window.addEventListener('keyup',up); window.addEventListener('d4b-nudge',nudge);
    const resize = () => { const w=host.clientWidth,h=host.clientHeight; renderer.setSize(w,h); camera.aspect=w/h; camera.updateProjectionMatrix(); }; resize();
    const observer = new ResizeObserver(resize); observer.observe(host);
    const animate = (time: number) => {
      frame=requestAnimationFrame(animate); const dt=Math.min(.05,(time-lastTime)/1000); lastTime=time;
      const current=live.current.phase; newZone.visible=current==='adapt'||current==='return'; newLine.visible=newZone.visible;
      target.visible=current==='flight'; beacon.visible=current==='flight';
      if (current==='flight'||current==='return') {
        const z=(keys.has('w')||keys.has('arrowup')?-1:0)+(keys.has('s')||keys.has('arrowdown')?1:0);
        const x=(keys.has('a')||keys.has('arrowleft')?-1:0)+(keys.has('d')||keys.has('arrowright')?1:0);
        const y=(keys.has('e')?1:0)+(keys.has('q')?-1:0);
        // Assisted movement from the prototype: horizontal drag and strong vertical hover damping.
        vel.x=(vel.x+x*11*dt)*.86; vel.z=(vel.z+z*11*dt)*.86; vel.y=(vel.y+y*12*dt)*.82;
        pos.addScaledVector(vel,dt); pos.y=THREE.MathUtils.clamp(pos.y,1.1,8); pos.x=THREE.MathUtils.clamp(pos.x,-20,20); pos.z=THREE.MathUtils.clamp(pos.z,-32,16);
        const violation=inKnownZone(pos.x,pos.z)?'known':current==='return'&&inNewZone(pos.x,pos.z)?'new':null;
        if (violation && time-lastZone>1300) { pos.copy(lastSafe); vel.set(0,0,0); lastZone=time; live.current.onZone(violation); }
        if (!violation) lastSafe.copy(pos);
        if (current==='flight'&&!reached&&Math.hypot(pos.x-CHECKPOINT.x,pos.z-CHECKPOINT.z)<3.8) { reached=true; vel.set(0,0,0); live.current.onCheckpoint(); }
      } else vel.multiplyScalar(.8);
      drone.position.copy(pos); drone.rotation.z=THREE.MathUtils.lerp(drone.rotation.z,-vel.x*.08,.1);
      for (const rotor of rotors) rotor.rotation.y += dt*18;
      camera.position.lerp(new THREE.Vector3(pos.x+10,pos.y+10,pos.z+15),.09); camera.lookAt(pos.x,pos.y,pos.z-5);
      renderer.render(scene,camera);
      if (time-lastReport>120) { live.current.onPosition(pos.x,pos.z,pos.y); lastReport=time; }
    };
    frame=requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('keydown',down); window.removeEventListener('keyup',up); window.removeEventListener('d4b-nudge',nudge); scene.traverse(obj=>{ if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); const materials=Array.isArray(obj.material)?obj.material:[obj.material]; materials.forEach(m=>m.dispose()); } }); wallTexture.dispose(); padTexture.dispose(); renderer.dispose(); host.removeChild(renderer.domElement); };
  }, []);
  return <div ref={mount} className="flight-world" role="img" aria-label={label}/>;
}
