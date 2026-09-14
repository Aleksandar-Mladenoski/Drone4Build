import test from 'node:test';
import assert from 'node:assert/strict';
import { mount, newBuild, recordTest, removeSensor, testOutcome } from './rules.ts';

test('parts physically replace the mounted part in their snap zone', () => {
  const initial = newBuild();
  const craft = mount(initial, 'platform:multirotor');
  assert.equal(craft.platform, 'multirotor');
  assert.equal(initial.platform, 'fixedWing');
  const camera = mount(craft, 'sensor:rgb');
  assert.equal(camera.sensor, 'rgb');
  assert.equal(removeSensor(camera).sensor, null);
  assert.equal(mount(camera, 'battery:charged').battery, 'charged');
});

test('the miniature test exposes independent platform, sensor and readiness consequences', () => {
  let build = newBuild();
  assert.deepEqual(testOutcome(build), { hover: false, visual: false, sustained: false, success: false });
  build = mount(build, 'platform:multirotor');
  assert.deepEqual(testOutcome(build), { hover: true, visual: false, sustained: false, success: false });
  build = mount(build, 'sensor:rgb');
  assert.deepEqual(testOutcome(build), { hover: true, visual: true, sustained: false, success: false });
  build = mount(build, 'battery:charged');
  assert.equal(recordTest(build).lastTest?.success, true);
});

test('rebuilding clears stale test result and preserves the retest count', () => {
  const tested = recordTest(newBuild());
  const rebuilt = mount(tested, 'platform:multirotor');
  assert.equal(rebuilt.lastTest, null);
  assert.equal(recordTest(rebuilt).tests, 2);
});
