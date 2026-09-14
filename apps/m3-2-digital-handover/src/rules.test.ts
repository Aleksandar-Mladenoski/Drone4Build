import assert from 'node:assert/strict';
import test from 'node:test';
import { initialState, passed, restore, score, select, start, submit } from './rules.ts';

function choose(state: ReturnType<typeof initialState>, choice: string) {
  return submit(select(state, choice));
}

test('spatial-reference mismatch must be identified before integration', () => {
  let state = start(initialState());
  state = choose(state, 'ready-to-compare');
  assert.equal(state.gate, 0);
  assert.equal(state.completed[0], false);
  assert.equal(state.errors[0], 1);
  state = choose(state, 'reference-mismatch');
  assert.equal(state.gate, 1);
  assert.equal(state.completed[0], true);
});

test('documented alignment unlocks comparison, visual drag does not', () => {
  let state = choose(start(initialState()), 'reference-mismatch');
  state = choose(state, 'visual-drag');
  assert.equal(state.gate, 1);
  assert.equal(state.completed[1], false);
  state = choose(state, 'align-documented');
  assert.equal(state.gate, 2);
  assert.equal(state.completed[1], true);
});

test('comparison distinguishes opening shift from display details', () => {
  let state = choose(choose(start(initialState()), 'reference-mismatch'), 'align-documented');
  state = choose(state, 'point-density');
  assert.equal(state.gate, 2);
  state = choose(state, 'line-style');
  assert.equal(state.gate, 2);
  state = choose(state, 'opening-shift');
  assert.equal(state.gate, 3);
  assert.equal(state.errors[2], 2);
});

test('outdated, draft and failed-QA packages cannot be released', () => {
  let state = choose(choose(choose(start(initialState()), 'reference-mismatch'), 'align-documented'), 'opening-shift');
  for (const choice of ['approved-old', 'draft-new', 'qa-failed']) {
    state = choose(state, choice);
    assert.equal(state.gate, 3);
    assert.equal(state.mode, 'active');
    assert.equal(state.released, false);
  }
  state = choose(state, 'approved-current');
  assert.equal(state.mode, 'result');
  assert.equal(state.released, true);
});

test('approved release maps to a passing score at the threshold', () => {
  let state = start(initialState());
  state = choose(state, 'units-problem');
  state = choose(state, 'reference-mismatch');
  state = choose(state, 'compare-as-is');
  state = choose(state, 'align-documented');
  state = choose(state, 'point-density');
  state = choose(state, 'opening-shift');
  state = choose(state, 'draft-new');
  state = choose(state, 'approved-current');
  assert.equal(score(state), 80);
  assert.equal(passed(state), true);
});

test('many corrected errors can produce a recoverable failed attempt', () => {
  let state = start(initialState());
  for (let i = 0; i < 4; i++) state = choose(state, 'ready-to-compare');
  state = choose(state, 'reference-mismatch');
  for (let i = 0; i < 4; i++) state = choose(state, 'visual-drag');
  state = choose(state, 'align-documented');
  state = choose(state, 'opening-shift');
  state = choose(state, 'approved-current');
  assert.equal(score(state), 70);
  assert.equal(passed(state), false);
});

test('suspend state restores gate and rejects malformed state', () => {
  const state = choose(start(initialState()), 'reference-mismatch');
  assert.deepEqual(restore(JSON.parse(JSON.stringify(state))), state);
  assert.equal(restore({ ...state, gate: 3 }), null);
});
