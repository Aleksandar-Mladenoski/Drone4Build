import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { aimScanCone, createScanConeGeometry, APPROACH_SECONDS, STOP_SECONDS, INSPECTION_TARGETS, sampleInspectionFlight } from './inspectionFlight.ts';

test('scan cone apex stays at the sensor and its broad base reaches the wall', () => {
  const geometry = createScanConeGeometry();
  const beam = new THREE.Mesh(geometry);
  const sensor = new THREE.Vector3(2.8, 3.1, -.41);
  const target = new THREE.Vector3(2.6, 3.25, -2.39);
  aimScanCone(beam, sensor, target); beam.updateMatrixWorld();
  assert.ok(beam.localToWorld(new THREE.Vector3()).distanceTo(sensor) < 1e-8);
  assert.ok(beam.localToWorld(new THREE.Vector3(0, -1, 0)).distanceTo(target) < 1e-8);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    if (Math.abs(positions.getY(i)) < 1e-8) assert.ok(Math.hypot(positions.getX(i), positions.getZ(i)) < 1e-8);
  }
  assert.ok(beam.localToWorld(new THREE.Vector3(1, -1, 0)).distanceTo(target) > .57);
  geometry.dispose(); (beam.material as THREE.Material).dispose();
});

test('drone visits six crack segments and captures only after each stable dwell', () => {
  assert.equal(sampleInspectionFlight(1, true).captures, 0);
  for (let i = 0; i < 6; i++) {
    const arrival = sampleInspectionFlight(APPROACH_SECONDS + i * STOP_SECONDS + 1, true);
    assert.ok(arrival.position.clone().add(new THREE.Vector3(0, -.28, -2.49)).distanceTo(INSPECTION_TARGETS[i]) < 1e-8);
    assert.equal(arrival.captures, i);
    assert.equal(arrival.scanning, true);
    const captured = sampleInspectionFlight(APPROACH_SECONDS + (i + 1) * STOP_SECONDS, true);
    assert.equal(captured.captures, i + 1);
  }
  const moving = sampleInspectionFlight(APPROACH_SECONDS + STOP_SECONDS + .45, true);
  assert.ok(moving.position.y > INSPECTION_TARGETS[0].y + .28);
  assert.ok(moving.position.y < INSPECTION_TARGETS[1].y + .28);
  const end = sampleInspectionFlight(20, true);
  assert.equal(end.done, true); assert.equal(end.captures, 6); assert.equal(end.scanning, false);
});

test('low battery stops at three captures, switches off scanning, and lands above ground', () => {
  const abortAt = APPROACH_SECONDS + 3 * STOP_SECONDS;
  const abort = sampleInspectionFlight(abortAt + .01, false);
  assert.equal(abort.stage, 'abort'); assert.equal(abort.captures, 3); assert.equal(abort.scanning, false);
  const end = sampleInspectionFlight(20, false);
  assert.equal(end.done, true); assert.equal(end.captures, 3); assert.ok(end.position.y >= .65 - 1e-8);
  assert.ok(end.position.y < abort.position.y);
});
