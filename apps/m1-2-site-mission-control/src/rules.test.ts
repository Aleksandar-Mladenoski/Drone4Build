import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, objectiveOrder, withinObjective, withinPad, withinCraneZone, canFinish, score } from './rules.ts';

test('both planning routes visit the two inspections in a different order', () => {
  assert.deepEqual(objectiveOrder('east'), ['roof', 'facade']);
  assert.deepEqual(objectiveOrder('west'), ['facade', 'roof']);
});
test('objectives need a nearby hover at the relevant altitude', () => {
  assert.equal(withinObjective(37, 11, -34, 'roof'), true);
  assert.equal(withinObjective(37, 2, -34, 'roof'), false);
  assert.equal(withinObjective(-39, 8, -48, 'facade'), true);
});
test('crane work area and pad are spatial rather than answer choices', () => {
  assert.equal(withinCraneZone(0, 5), true);
  assert.equal(withinCraneZone(20, 5), false);
  assert.equal(withinPad(0, 1.5, 65), true);
  assert.equal(withinPad(0, 5, 65), false);
});
test('landing after two inspections finishes the flight', () => {
  const state = initialState();
  assert.equal(canFinish(state), false);
  state.completed = ['roof', 'facade']; state.landed = true;
  assert.equal(canFinish(state), true);
  assert.equal(score(state), 100);
  state.encounters = 2;
  assert.equal(score(state), 80);
});
