import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, planIsSafe, inKnownZone, inNewZone, score, passed, canLand } from './rules.ts';

test('safe plan and unsafe plans', () => {
  const state = initialState();
  state.plan = { route: 'east', launch: 'designated', response: 'hold-return' };
  assert.equal(planIsSafe(state.plan), true);
  state.plan.route = 'west'; assert.equal(planIsSafe(state.plan), false);
});
test('known and newly active zones block routes', () => {
  assert.equal(inKnownZone(-5, -8), true); assert.equal(inKnownZone(4, -8), false);
  assert.equal(inNewZone(0, -17), true); assert.equal(inNewZone(0, -10), false);
});
test('professional response and landing determine pass', () => {
  const state = initialState(); state.phase = 'result';
  assert.equal(passed(state), false);
  assert.equal(score(state),0);
  state.planCleared=true; state.checkpoint=true; state.safeResponse = true; state.landed=true;
  assert.equal(score(state), 100); assert.equal(passed(state), true);
  assert.equal(canLand(0, 8, 2), true); assert.equal(canLand(0, -10, 2), false);
  state.adaptErrors = 3; assert.equal(passed(state), true);
  state.flightErrors = 3; assert.equal(passed(state), false);
});
