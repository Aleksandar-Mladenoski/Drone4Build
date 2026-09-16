import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, placeSelected, quality, repaired, restore, runReconstruction, selectImage } from './rules.ts';

test('initial synthetic dataset produces a visible weak reconstruction', () => {
  const state = runReconstruction(fresh('prepare'));
  assert.equal(repaired(state), false);
  assert.equal(quality(state).usable, false);
  assert.equal(quality(state).completeness, 68);
});

test('placing the held return view displaces the soft duplicate', () => {
  let state = selectImage(fresh('result'), 'east-return');
  state = placeSelected(state, 5);
  assert.equal(state.assignments[5], 'east-return');
  assert.equal(state.held, 'soft-east');
  assert.equal(repaired(state), true);
});

test('rebuild after correction creates a usable result', () => {
  let state = runReconstruction(fresh('prepare'));
  state = placeSelected(selectImage(state, 'east-return'), 5);
  state = runReconstruction(state);
  assert.equal(state.runs, 2);
  assert.deepEqual(quality(state), { score: 92, completeness: 96, coherence: 91, usable: true });
});

test('checkpoint rejects duplicate image assignments', () => {
  const state = fresh('prepare');
  assert.deepEqual(restore(state), state);
  assert.equal(restore({ ...state, assignments: Array(6).fill('west-high') }), null);
});
