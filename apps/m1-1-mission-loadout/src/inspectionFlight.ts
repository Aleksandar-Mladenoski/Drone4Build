import * as THREE from 'three';

export const CRACK_POINTS = [
  new THREE.Vector3(2.75, .8, -2.39), new THREE.Vector3(2.95, 2, -2.39),
  new THREE.Vector3(2.6, 3.25, -2.39), new THREE.Vector3(2.9, 4.6, -2.39),
];
export const APPROACH_SECONDS = 2.4;
export const STOP_SECONDS = 1.6;
export const MOVE_SECONDS = .9;
const HOME = new THREE.Vector3(-5, .65, 3);
const smooth = (value: number) => {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

function crackAtHeight(y: number) {
  const end = CRACK_POINTS.findIndex(point => point.y >= y);
  if (end <= 0) return CRACK_POINTS[0].clone();
  const a = CRACK_POINTS[end - 1], b = CRACK_POINTS[end];
  return a.clone().lerp(b, (y - a.y) / (b.y - a.y));
}
export const INSPECTION_TARGETS = Array.from({ length: 6 }, (_, i) => crackAtHeight(1 + i * .72));
const aircraftAt = (target: THREE.Vector3) => new THREE.Vector3(target.x, target.y + .28, .1);

/** Capture only after arrival and a stable dwell at each position. */
export function sampleInspectionFlight(seconds: number, sustained: boolean) {
  const time = Math.max(0, seconds);
  const stops = sustained ? 6 : 3;
  const scanEnd = APPROACH_SECONDS + stops * STOP_SECONDS;
  const duration = scanEnd + (sustained ? .5 : 2.4);
  const scanTime = Math.max(0, time - APPROACH_SECONDS);
  const captures = Math.min(stops, Math.floor((scanTime + 1e-9) / STOP_SECONDS));
  const index = Math.min(stops - 1, captures);
  const previous = INSPECTION_TARGETS[Math.max(0, index - 1)];
  const target = previous.clone().lerp(INSPECTION_TARGETS[index], smooth((scanTime - index * STOP_SECONDS) / MOVE_SECONDS));
  const position = aircraftAt(target);
  const scanning = time >= APPROACH_SECONDS && time < scanEnd;
  let stage: 'launch' | 'inspect' | 'abort' | 'complete' = scanning ? 'inspect' : 'complete';
  if (time < APPROACH_SECONDS) {
    // Lift clear of the ground before approaching the first crack segment.
    const lift = HOME.clone().setY(2.2);
    position.copy(time < .8 ? HOME.clone().lerp(lift, smooth(time / .8)) : lift.lerp(aircraftAt(INSPECTION_TARGETS[0]), smooth((time - .8) / 1.6)));
    stage = 'launch';
  } else if (!sustained && time >= scanEnd) {
    position.copy(aircraftAt(INSPECTION_TARGETS[stops - 1])).lerp(new THREE.Vector3(target.x, .65, 1.5), smooth((time - scanEnd) / 2.4));
    stage = 'abort';
  }
  return { position, target, captures, scanning, stage, done: time >= duration,
    progress: sustained ? Math.min(1, time / duration) : Math.min(.58, time / scanEnd * .58) };
}

/** Local apex is the origin; the open base extends along local -Y. */
export function createScanConeGeometry() {
  return new THREE.ConeGeometry(1, 1, 32, 1, true).translate(0, -.5, 0);
}
export function aimScanCone(beam: THREE.Mesh, sensor: THREE.Vector3, target: THREE.Vector3) {
  const direction = target.clone().sub(sensor);
  beam.position.copy(sensor);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction.clone().normalize());
  beam.scale.set(.58, direction.length(), .58);
}
