import * as THREE from 'three';
import { compatible, componentMount, type Build, type ComponentId, type MountType } from './rules.ts';

type Callbacks = {
  onAttach: (component: ComponentId) => void;
  onDetach: (mount: MountType) => void;
  onInspect: (component: ComponentId) => void;
  onMessage: (message: string) => void;
};
type PartRecord = {
  id: ComponentId;
  group: THREE.Group;
  home: THREE.Vector3;
  mount: MountType | null;
  lights: THREE.Mesh[];
};

const COLORS = { steel: 0x253943, pale: 0x9eb5b8, teal: 0x4ec8b0, amber: 0xe2aa4b, red: 0xd85b55 };
const MOUNTS: Record<MountType, THREE.Vector3> = {
  payload: new THREE.Vector3(0, 1.63, .72),
  battery: new THREE.Vector3(0, 1.92, -.53),
};

function box(w: number, h: number, d: number, color: number, roughness = .65) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness, metalness: .25 }));
  mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
}
function cylinder(r: number, h: number, color: number, sides = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, sides), new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .35 }));
  mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
}
function labelSprite(text: string, accent: string) {
  const canvas = document.createElement('canvas'); canvas.width = 420; canvas.height = 92;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#0c202bd9'; c.roundRect(4, 4, 412, 84, 18); c.fill();
  c.strokeStyle = accent; c.lineWidth = 4; c.stroke();
  c.fillStyle = '#eef8f3'; c.font = '700 29px Segoe UI'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 210, 46);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(1.08, .24, 1); sprite.position.y = .64; return sprite;
}
function markInteractive(group: THREE.Object3D, id: ComponentId) {
  group.traverse(child => { child.userData.component = id; });
}

function makePayload(id: 'rgb' | 'thermal') {
  const group = new THREE.Group();
  const body = box(.72, .42, .58, id === 'rgb' ? 0x587888 : 0x5d566e); group.add(body);
  const bracket = box(.48, .09, .5, COLORS.pale); bracket.position.y = .25; group.add(bracket);
  if (id === 'rgb') {
    const lens = cylinder(.16, .16, 0x132834, 24); lens.rotation.x = Math.PI / 2; lens.position.z = .34; group.add(lens);
    const glass = cylinder(.095, .17, 0x63c5dc, 24); glass.rotation.x = Math.PI / 2; glass.position.z = .35; group.add(glass);
  } else {
    for (const x of [-.2, 0, .2]) { const grille = box(.1, .23, .04, 0xe58d59); grille.position.set(x, 0, .31); group.add(grille); }
  }
  group.add(labelSprite(id === 'rgb' ? 'RGB CAMERA' : 'THERMAL PAYLOAD', id === 'rgb' ? '#6bd8df' : '#ee9661'));
  markInteractive(group, id); return { group, lights: [] as THREE.Mesh[] };
}
function makeBattery(id: 'battery-low' | 'battery-charged') {
  const group = new THREE.Group();
  const charged = id === 'battery-charged';
  group.add(box(.92, .38, .56, charged ? 0x365e55 : 0x554748));
  const grip = box(.48, .12, .25, COLORS.pale); grip.position.y = .25; group.add(grip);
  const lights: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const lit = charged || i === 0;
    const material = new THREE.MeshStandardMaterial({
      color: lit ? (charged ? COLORS.teal : COLORS.red) : 0x202b30,
      emissive: lit ? (charged ? COLORS.teal : COLORS.red) : 0,
      emissiveIntensity: lit ? .9 : 0,
    });
    const led = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), material);
    led.position.set(-.25 + i * .17, .02, .3); group.add(led); lights.push(led);
  }
  group.add(labelSprite(charged ? 'CHARGED PACK' : 'LOW PACK', charged ? '#64dab9' : '#e37467'));
  markInteractive(group, id); return { group, lights };
}
function makeDrone() {
  const drone = new THREE.Group();
  const body = box(1.55, .42, 1.15, COLORS.steel); body.position.y = 2.12; drone.add(body);
  const top = box(.88, .27, .75, 0x58717a); top.position.y = 2.46; drone.add(top);
  const nose = box(.72, .22, .32, COLORS.teal); nose.position.set(0, 2.14, .72); drone.add(nose);
  for (const side of [-1, 1]) for (const fore of [-1, 1]) {
    const arm = box(1.35, .09, .12, 0x70878d); arm.position.set(side * .78, 2.22, fore * .42); arm.rotation.y = -side * fore * .42; drone.add(arm);
    const motor = cylinder(.16, .2, 0x263a43); motor.position.set(side * 1.36, 2.25, fore * .89); drone.add(motor);
    const rotor = cylinder(.62, .025, 0x9bc4c3, 32); rotor.position.set(side * 1.36, 2.38, fore * .89); drone.add(rotor);
    const skid = box(.07, .55, .07, 0x273c45); skid.position.set(side * .58, 1.73, fore * .5); skid.rotation.x = .15 * fore; drone.add(skid);
  }
  const payloadRail = box(.9, .1, .56, 0x879da0); payloadRail.position.copy(MOUNTS.payload).add(new THREE.Vector3(0, .26, 0)); drone.add(payloadRail);
  const batteryRail = box(1.02, .12, .7, 0x83999d); batteryRail.position.copy(MOUNTS.battery).add(new THREE.Vector3(0, .25, 0)); drone.add(batteryRail);
  return drone;
}

export class WorkshopScene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(48, 1, .1, 100);
  private renderer: THREE.WebGLRenderer;
  private ray = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private parts = new Map<ComponentId, PartRecord>();
  private mounts = new Map<MountType, THREE.Mesh>();
  private animation = 0;
  private observer: ResizeObserver;
  private drag: { part: PartRecord; pointerId: number; startX: number; startY: number; moved: boolean; wasMounted: MountType | null } | null = null;
  private orbit: { pointerId: number; x: number; y: number } | null = null;
  private azimuth = .64;
  private polar = 1.08;
  private distance = 7.3;
  private target = new THREE.Vector3(0, 1.75, 0);

  constructor(private canvas: HTMLCanvasElement, build: Build, private callbacks: Callbacks) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.scene.background = new THREE.Color(0x102630);
    this.scene.fog = new THREE.Fog(0x102630, 12, 25);
    this.buildWorkshop();
    this.createParts(build);
    this.bind();
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas);
    this.resize(); this.animate();
  }

  private buildWorkshop() {
    this.scene.add(new THREE.HemisphereLight(0xcde9e8, 0x18232a, 2.1));
    const key = new THREE.DirectionalLight(0xffe5b3, 3.2); key.position.set(-4, 8, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); this.scene.add(key);
    const rim = new THREE.PointLight(0x5ee6ce, 22, 10); rim.position.set(4, 3, -3); this.scene.add(rim);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 14), new THREE.MeshStandardMaterial({ color: 0x28373b, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; this.scene.add(floor);
    const back = box(14, 7, .2, 0x1c333c); back.position.set(0, 3.4, -4.4); this.scene.add(back);
    for (let x = -6; x <= 6; x += 2) { const rib = box(.09, 6.6, .18, 0x50646b); rib.position.set(x, 3.4, -4.27); this.scene.add(rib); }
    const table = box(8.4, .35, 4.3, 0x5c574a); table.position.set(0, .78, 0); this.scene.add(table);
    for (const x of [-3.7, 3.7]) for (const z of [-1.6, 1.6]) { const leg = box(.28, 1.45, .28, 0x394c53); leg.position.set(x, 0, z); this.scene.add(leg); }
    const stand = cylinder(.9, .28, 0x344b55, 32); stand.position.set(0, 1.11, 0); this.scene.add(stand);
    const drone = makeDrone(); this.scene.add(drone);
    for (const [mount, position] of Object.entries(MOUNTS) as [MountType, THREE.Vector3][]) {
      const material = new THREE.MeshStandardMaterial({ color: 0x415861, emissive: COLORS.teal, emissiveIntensity: .16, transparent: true, opacity: .7 });
      const marker = new THREE.Mesh(new THREE.TorusGeometry(mount === 'payload' ? .48 : .56, .055, 10, 40), material);
      marker.rotation.x = Math.PI / 2; marker.position.copy(position); marker.userData.mount = mount; this.scene.add(marker); this.mounts.set(mount, marker);
    }
    for (const x of [-3, 3]) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x182f38, emissive: x < 0 ? 0x156d72 : 0x5d4c25, emissiveIntensity: .3 });
      const tray = new THREE.Mesh(new THREE.BoxGeometry(2.3, .12, 2.6), mat); tray.position.set(x, 1.02, .1); tray.receiveShadow = true; this.scene.add(tray);
    }
    const shelf = box(4.8, .12, .8, 0x4d5d60); shelf.position.set(-3.5, 2.8, -4); this.scene.add(shelf);
    for (let i = 0; i < 5; i++) { const crate = box(.55, .55, .55, i % 2 ? 0x80623d : 0x51656a); crate.position.set(-5.3 + i * .85, 3.14, -4); this.scene.add(crate); }
  }

  private createParts(build: Build) {
    const homes: Record<ComponentId, THREE.Vector3> = {
      rgb: new THREE.Vector3(-3.45, 1.3, .3),
      thermal: new THREE.Vector3(-2.35, 1.3, .3),
      'battery-low': new THREE.Vector3(2.1, 1.3, .45),
      'battery-charged': new THREE.Vector3(3.15, 1.3, .45),
    };
    const mounted: Partial<Record<ComponentId, MountType>> = {};
    if (build.payload) mounted[build.payload] = 'payload';
    if (build.battery) mounted[`battery-${build.battery}`] = 'battery';
    for (const id of ['rgb', 'thermal', 'battery-low', 'battery-charged'] as ComponentId[]) {
      const made = id === 'rgb' || id === 'thermal' ? makePayload(id) : makeBattery(id);
      const record: PartRecord = { id, group: made.group, home: homes[id], mount: mounted[id] ?? null, lights: made.lights };
      record.group.position.copy(record.mount ? MOUNTS[record.mount] : record.home);
      const label = record.group.children.find(child => child instanceof THREE.Sprite); if (label) label.visible = !record.mount;
      this.scene.add(record.group); this.parts.set(id, record);
    }
  }

  private bind() {
    this.canvas.addEventListener('pointerdown', this.pointerDown);
    this.canvas.addEventListener('pointermove', this.pointerMove);
    this.canvas.addEventListener('pointerup', this.pointerUp);
    this.canvas.addEventListener('pointercancel', this.pointerUp);
    this.canvas.addEventListener('wheel', this.wheel, { passive: false });
  }

  private point(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
  }
  private hitPart(event: PointerEvent) {
    this.point(event);
    const hits = this.ray.intersectObjects([...this.parts.values()].map(part => part.group), true);
    const id = hits[0]?.object.userData.component as ComponentId | undefined;
    return id ? this.parts.get(id) ?? null : null;
  }
  private dragPoint(event: PointerEvent, y: number) {
    this.point(event);
    const point = new THREE.Vector3();
    return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), point) ? point : null;
  }
  private screenDistance(event: PointerEvent, mount: MountType) {
    const rect = this.canvas.getBoundingClientRect();
    const projected = MOUNTS[mount].clone().project(this.camera);
    const x = rect.left + (projected.x + 1) * rect.width / 2;
    const y = rect.top + (1 - projected.y) * rect.height / 2;
    return Math.hypot(event.clientX - x, event.clientY - y);
  }

  private pointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const part = this.hitPart(event);
    this.canvas.setPointerCapture(event.pointerId);
    if (part) {
      this.drag = { part, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false, wasMounted: part.mount };
      this.callbacks.onMessage('pickup'); this.canvas.classList.add('grabbing'); return;
    }
    this.orbit = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    this.canvas.classList.add('orbiting');
  };
  private pointerMove = (event: PointerEvent) => {
    if (this.drag?.pointerId === event.pointerId) {
      const dx = event.clientX - this.drag.startX, dy = event.clientY - this.drag.startY;
      if (!this.drag.moved && Math.hypot(dx, dy) > 5) {
        this.drag.moved = true;
        if (this.drag.part.mount) {
          this.callbacks.onDetach(this.drag.part.mount);
          this.drag.part.mount = null;
          const label = this.drag.part.group.children.find(child => child instanceof THREE.Sprite); if (label) label.visible = true;
        }
      }
      if (!this.drag.moved) return;
      const point = this.dragPoint(event, 1.34);
      if (!point) return;
      point.x = THREE.MathUtils.clamp(point.x, -4, 4); point.z = THREE.MathUtils.clamp(point.z, -1.75, 1.8);
      this.drag.part.group.position.lerp(point, .72);
      const own = componentMount(this.drag.part.id);
      const near = this.screenDistance(event, own) < 105;
      this.highlightMounts(this.drag.part.id, near);
      return;
    }
    if (this.orbit?.pointerId === event.pointerId) {
      const dx = event.clientX - this.orbit.x, dy = event.clientY - this.orbit.y;
      this.azimuth -= dx * .008; this.polar = THREE.MathUtils.clamp(this.polar + dy * .007, .36, 1.48);
      this.orbit.x = event.clientX; this.orbit.y = event.clientY; return;
    }
    const part = this.hitPart(event);
    this.canvas.style.cursor = part ? 'grab' : 'crosshair';
  };
  private pointerUp = (event: PointerEvent) => {
    if (this.drag?.pointerId === event.pointerId) {
      const { part, moved } = this.drag;
      if (!moved) this.inspect(part);
      else {
        const own = componentMount(part.id);
        const other: MountType = own === 'payload' ? 'battery' : 'payload';
        if (this.screenDistance(event, own) < 110) this.snap(part, own);
        else if (this.screenDistance(event, other) < 100) {
          part.group.position.copy(part.home); this.callbacks.onMessage('rejected');
        } else {
          part.group.position.y = 1.3; part.home.copy(part.group.position); this.callbacks.onMessage('placed');
        }
      }
      this.drag = null; this.highlightMounts(null, false); this.canvas.classList.remove('grabbing');
    }
    if (this.orbit?.pointerId === event.pointerId) { this.orbit = null; this.canvas.classList.remove('orbiting'); }
  };
  private wheel = (event: WheelEvent) => {
    event.preventDefault(); this.distance = THREE.MathUtils.clamp(this.distance + event.deltaY * .006, 4.2, 10.2);
  };

  private inspect(part: PartRecord) {
    this.callbacks.onInspect(part.id);
    if (part.lights.length) {
      part.lights.forEach(light => ((light.material as THREE.MeshStandardMaterial).emissiveIntensity = 3));
      window.setTimeout(() => part.lights.forEach(light => ((light.material as THREE.MeshStandardMaterial).emissiveIntensity = .9)), 650);
    }
  }
  private snap(part: PartRecord, mount: MountType) {
    for (const candidate of this.parts.values()) {
      if (candidate !== part && candidate.mount === mount) {
        candidate.mount = null; candidate.group.position.copy(candidate.home);
        const label = candidate.group.children.find(child => child instanceof THREE.Sprite); if (label) label.visible = true;
      }
    }
    part.mount = mount; part.group.position.copy(MOUNTS[mount]); part.group.rotation.set(0, 0, 0);
    const label = part.group.children.find(child => child instanceof THREE.Sprite); if (label) label.visible = false;
    this.callbacks.onAttach(part.id); this.callbacks.onMessage('snapped');
    const marker = this.mounts.get(mount); if (marker) marker.scale.setScalar(1.35);
  }
  private highlightMounts(component: ComponentId | null, near: boolean) {
    for (const [type, mesh] of this.mounts) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (!component) { material.emissive.setHex(COLORS.teal); material.emissiveIntensity = .16; continue; }
      const fits = compatible(component, type);
      material.emissive.setHex(fits ? COLORS.teal : COLORS.red);
      material.emissiveIntensity = fits ? (near ? 2.8 : .95) : .28;
    }
  }
  resetCamera() { this.azimuth = .64; this.polar = 1.08; this.distance = 7.3; this.target.set(0, 1.75, 0); }
  focus(mount: MountType) { this.target.lerp(MOUNTS[mount], .7); this.distance = 5.1; }
  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
    this.camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height); this.camera.updateProjectionMatrix();
  }
  private animate = () => {
    this.animation = requestAnimationFrame(this.animate);
    const sin = Math.sin(this.polar);
    this.camera.position.set(
      this.target.x + this.distance * sin * Math.sin(this.azimuth),
      this.target.y + this.distance * Math.cos(this.polar),
      this.target.z + this.distance * sin * Math.cos(this.azimuth),
    );
    this.camera.lookAt(this.target);
    for (const mesh of this.mounts.values()) mesh.scale.lerp(new THREE.Vector3(1, 1, 1), .08);
    this.renderer.render(this.scene, this.camera);
  };
  dispose() {
    cancelAnimationFrame(this.animation); this.observer.disconnect();
    this.canvas.removeEventListener('pointerdown', this.pointerDown); this.canvas.removeEventListener('pointermove', this.pointerMove);
    this.canvas.removeEventListener('pointerup', this.pointerUp); this.canvas.removeEventListener('pointercancel', this.pointerUp); this.canvas.removeEventListener('wheel', this.wheel);
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(material => material.dispose()); }
      if (object instanceof THREE.Sprite) (object.material as THREE.SpriteMaterial).map?.dispose();
    });
    this.renderer.dispose();
  }
}
