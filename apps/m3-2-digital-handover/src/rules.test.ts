import test from 'node:test';
import assert from 'node:assert/strict';
import { ANCHORS, anchorErrors, canRegister, fresh, isRealDiscrepancy, restore, transformPoint, tryInspect } from './rules.ts';

test('translation and rotation move multiple anchors consistently', () => {
  const shifted = transformPoint(ANCHORS[0], { dx: 20, dy: -5, angle: 0 });
  assert.deepEqual(shifted, { x: ANCHORS[0].x + 20, y: ANCHORS[0].y - 5 });
  assert.ok(anchorErrors({ dx: 0, dy: 0, angle: 10 })[0] !== anchorErrors({ dx: 0, dy: 0, angle: 10 })[2]);
});
test('one aligned control is insufficient; all three must converge', () => {
  assert.equal(canRegister({ dx: 0, dy: 0, angle: 0 }), true);
  assert.equal(canRegister({ dx: 35, dy: 0, angle: 0 }), false);
  assert.equal(canRegister({ dx: 0, dy: 0, angle: 10 }), false);
});
test('only a registered overlay permits finding the shifted opening', () => {
  const target = { x: 450, y: 420 };
  assert.equal(isRealDiscrepancy(target), true);
  let state = fresh(); state.phase = 'register';
  assert.equal(tryInspect(state, target).phase, 'register');
  state.phase = 'compare';
  assert.equal(tryInspect(state, { x: 250, y: 250 }).falseMarks, 1);
  assert.equal(tryInspect(state, target).phase, 'solved');
});
test('compact new checkpoint restores, old workflow state does not', () => {
  const state = fresh(); state.phase = 'compare';
  assert.deepEqual(restore(JSON.parse(JSON.stringify(state))), state);
  assert.equal(restore({ version: 1, mode: 'active' }), null);
});
