import test from 'node:test';
import assert from 'node:assert/strict';
import { attach, compatible, detach, newBuild, recordTest, restoreBuild, testOutcome } from './rules.ts';

test('components only fit their physical mount type', () => {
  assert.equal(compatible('rgb', 'payload'), true);
  assert.equal(compatible('thermal', 'battery'), false);
  assert.equal(compatible('battery-charged', 'battery'), true);
  assert.equal(compatible('battery-charged', 'payload'), false);
});

test('attachment, replacement and detachment update the mounted machine', () => {
  const initial = newBuild();
  const visual = attach(initial, 'rgb');
  assert.equal(visual.payload, 'rgb');
  assert.equal(initial.payload, 'thermal');
  const ready = attach(visual, 'battery-charged');
  assert.equal(ready.battery, 'charged');
  assert.equal(detach(ready, 'payload').payload, null);
  assert.equal(ready.swaps, 2);
});

test('test consequences remain independent and visible', () => {
  const initial = newBuild();
  assert.deepEqual(testOutcome(initial), { hover: true, visual: false, sustained: false, success: false });
  const visual = attach(initial, 'rgb');
  assert.deepEqual(testOutcome(visual), { hover: true, visual: true, sustained: false, success: false });
  const ready = attach(visual, 'battery-charged');
  assert.equal(recordTest(ready).lastTest?.success, true);
});

test('rebuilding clears stale evidence and replay state is validated', () => {
  const tested = recordTest(newBuild());
  const rebuilt = attach(tested, 'rgb');
  assert.equal(rebuilt.lastTest, null);
  assert.equal(recordTest(rebuilt).tests, 2);
  assert.deepEqual(restoreBuild(JSON.parse(JSON.stringify(rebuilt))), rebuilt);
  assert.equal(restoreBuild({ ...rebuilt, version: 2 }), null);
});
