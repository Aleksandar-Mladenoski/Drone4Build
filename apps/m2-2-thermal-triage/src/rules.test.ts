import test from 'node:test';
import assert from 'node:assert/strict';
import { canFile, capture, evidenceStrength, newGame, regionAt, restoreGame } from './rules.ts';

test('scene capture records the same world position and the active viewpoint', () => {
  const state = newGame(); state.phase = 'investigate';
  state.reticle = { x: 852, y: 450 }; state.viewpoint = -1;
  assert.equal(regionAt(852, 450), 'band');
  assert.deepEqual(capture(state), { id: 1, x: 852, y: 450, viewpoint: -1, region: 'band', decision: 'unfiled' });
  state.mode = 'thermal';
  assert.deepEqual(state.reticle, { x: 852, y: 450 });
});

test('repeatable pattern and changing glass observation strengthen a filed investigation', () => {
  const state = newGame(); state.phase = 'investigate';
  for (const [x, y, viewpoint, decision] of [[850, 450, -1, 'retain'], [850, 450, 1, 'retain'], [1200, 420, 0, 'reject'], [1200, 420, 1, 'reject']] as const) {
    state.reticle = { x, y }; state.viewpoint = viewpoint;
    capture(state)!.decision = decision;
  }
  assert.equal(canFile(state), true);
  assert.deepEqual(evidenceStrength(state), { repeatable: true, reflectionChecked: true, score: 90 });
  assert.deepEqual(restoreGame(JSON.parse(JSON.stringify(state))), state);
});

test('one dramatic retained glass view does not become strong evidence', () => {
  const state = newGame(); state.phase = 'investigate';
  state.reticle = { x: 1200, y: 420 };
  capture(state)!.decision = 'retain';
  assert.equal(canFile(state), false);
  assert.equal(evidenceStrength(state).score, 0);
  assert.equal(restoreGame({ ...state, zoom: 9 }), null);
});
