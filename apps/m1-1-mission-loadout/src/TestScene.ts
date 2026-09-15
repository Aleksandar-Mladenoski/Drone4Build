import * as THREE from 'three';
import type { TestOutcome } from './rules.ts';

type Callbacks = {
  onProgress: (progress: number, captures: number, stage: 'launch' | 'inspect' | 'abort' | 'complete') => void;
  onComplete: () => void;
};
const box = (w: number, h: number, d: number, color: number) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: .75, metalness: .15 }));
  mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
};
function makeDrone() {
  const group = new THREE.Group();
  group.add(box(1.1, .28, .78, 0x253a43));
  for (const x of [-.7, .7]) for (const z of [-.55, .55]) {
    const arm = box(.9, .05, .08, 0x70878d); arm.position.set(x / 2, .05, z / 2); arm.rotation.y = x * z > 0 ? .55 : -.55; group.add(arm);
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .025, 24), new THREE.MeshStandardMaterial({ color: 0xa3c7c4, transparent: true, opacity: .7 }));
    rotor.position.set(x, .16, z); group.add(rotor);
  }
  const sensor = box(.35, .28, .3, 0x496b78); sensor.position.set(0, -.28, .34); group.add(sensor);
  const status = new THREE.Mesh(new THREE.SphereGeometry(.065, 12, 8), new THREE.MeshStandardMaterial({ color: 0x55dfb8, emissive: 0x55dfb8, emissiveIntensity: 2 }));
  status.position.set(0, .17, .25); status.name = 'status'; group.add(status);
  return group;
}

export class TestScene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(48, 1, .1, 80);
  private renderer: THREE.WebGLRenderer;
  private observer: ResizeObserver;
  private frame = 0;
  private started = performance.now();
  private drone = makeDrone();
  private beam: THREE.Mesh;
  private tiles: THREE.Mesh[] = [];
  private done = false;

  constructor(private canvas: HTMLCanvasElement, private outcome: TestOutcome, private callbacks: Callbacks) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); this.renderer.shadowMap.enabled = true;
    this.scene.background = new THREE.Color(0x8db9c2);
    this.scene.add(new THREE.HemisphereLight(0xe8ffff, 0x435754, 2.5));
    const sun = new THREE.DirectionalLight(0xffe6b4, 3); sun.position.set(-5, 10, 7); sun.castShadow = true; this.scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 18), new THREE.MeshStandardMaterial({ color: 0x6f8d76, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.scene.add(ground);
    const wall = box(8, 6.5, .6, 0x9aaba9); wall.position.set(2, 3.25, -2.8); this.scene.add(wall);
    for (const x of [-.5, 1.6, 3.7, 5.8]) for (const y of [1.4, 3.4, 5.4]) {
      const window = box(1.25, 1.15, .08, 0x294e61); window.position.set(x, y, -2.46); this.scene.add(window);
    }
    const crack = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(2.75, .8, -2.39), new THREE.Vector3(2.95, 2, -2.38), new THREE.Vector3(2.6, 3.25, -2.37), new THREE.Vector3(2.9, 4.6, -2.36)]),
      new THREE.LineBasicMaterial({ color: 0x6c2d29, linewidth: 3 }),
    ); this.scene.add(crack);
    this.drone.position.set(-5, .2, 3); this.scene.add(this.drone);
    const beamMaterial = new THREE.MeshBasicMaterial({ color: outcome.visual ? 0x5bd9e1 : 0xf09059, transparent: true, opacity: .25, side: THREE.DoubleSide });
    this.beam = new THREE.Mesh(new THREE.ConeGeometry(1.25, 5, 24, 1, true), beamMaterial);
    this.beam.rotation.x = -Math.PI / 2; this.beam.position.set(-1, 2.2, 0); this.scene.add(this.beam);
    for (let i = 0; i < 6; i++) {
      const tile = box(.72, .48, .05, 0x172b35); tile.position.set(6.6, 4.9 - Math.floor(i / 2) * .72, -1.8 + (i % 2) * .85); this.scene.add(tile); this.tiles.push(tile);
    }
    this.camera.position.set(9, 6.5, 11); this.camera.lookAt(1, 2.5, -1);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas); this.resize(); this.animate();
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect(); this.renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
    this.camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height); this.camera.updateProjectionMatrix();
  }
  private animate = (now = performance.now()) => {
    this.frame = requestAnimationFrame(this.animate);
    const raw = Math.min(1, (now - this.started) / 8200);
    const progress = this.outcome.sustained ? raw : Math.min(raw, .58);
    const takeoff = Math.min(1, raw / .16);
    const inspect = Math.max(0, (progress - .14) / .72);
    this.drone.position.x = THREE.MathUtils.lerp(-5, -.2, takeoff);
    this.drone.position.y = THREE.MathUtils.lerp(.2, 2.4, takeoff) + (this.outcome.sustained ? Math.sin(now * .006) * .05 : -Math.max(0, raw - .46) * 4.2);
    this.drone.position.z = THREE.MathUtils.lerp(3, -.1, takeoff);
    this.drone.rotation.z = Math.sin(now * .008) * .025;
    this.beam.visible = raw > .15 && (this.outcome.sustained || raw < .55);
    this.beam.position.set(this.drone.position.x + 1.65, this.drone.position.y, -1.25);
    const captureCount = Math.min(this.outcome.sustained ? 6 : 3, Math.floor(inspect * 7));
    this.tiles.forEach((tile, index) => {
      const material = tile.material as THREE.MeshStandardMaterial;
      if (index < captureCount) {
        material.color.setHex(this.outcome.visual ? (index % 2 ? 0x6da6b0 : 0xb6ced0) : (index % 2 ? 0xf09a62 : 0x8a5071));
        material.emissive.setHex(this.outcome.visual ? 0x17414c : 0x7c342a); material.emissiveIntensity = .7;
      }
    });
    if (!this.outcome.sustained && raw >= .55) {
      const status = this.drone.getObjectByName('status') as THREE.Mesh;
      (status.material as THREE.MeshStandardMaterial).color.setHex(0xe1554f); (status.material as THREE.MeshStandardMaterial).emissive.setHex(0xe1554f);
    }
    const stage = raw < .15 ? 'launch' : !this.outcome.sustained && raw >= .55 ? 'abort' : raw >= .98 ? 'complete' : 'inspect';
    this.callbacks.onProgress(progress, captureCount, stage);
    if (raw >= 1 && !this.done) { this.done = true; this.callbacks.onComplete(); }
    this.renderer.render(this.scene, this.camera);
  };
  dispose() {
    cancelAnimationFrame(this.frame); this.observer.disconnect();
    this.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(material => material.dispose()); } });
    this.renderer.dispose();
  }
}
