import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, place, result, restore, resumeAfterEvent, route, startRun, tick } from './rules.ts';

test('simulation pauses after two windows for a real project event', () => {
  let state = startRun(fresh('plan'));
  state = tick(state);
  state = tick(state);
  assert.equal(state.phase, 'event');
  assert.equal(state.step, 2);
  assert.equal(state.eventSeen, true);
});

test('moving activities physically recovers the changed access window', () => {
  let state = startRun(route(fresh('plan'), 'handoff', 'records'));
  state = tick(tick(state));
  state = place(state, 'handoff', 3);
  state = place(state, 'facade', 4);
  state = resumeAfterEvent(state);
  state = tick(tick(state));
  assert.deepEqual(result(state), { done: 4, blocked: 0, conflicts: 0, routed: 4, score: 100, passed: true });
});

test('ignoring the access change produces a visible blocked activity', () => {
  let state = startRun(route(fresh('plan'), 'handoff', 'records'));
  state = tick(tick(state));
  state = resumeAfterEvent(state);
  state = tick(tick(state));
  assert.equal(result(state).passed, false);
  assert.ok(state.outcomes.some(item => item.activity === 'facade' && item.reason === 'access'));
});

test('same-window flights exceed the fictional single-kit capacity', () => {
  let state = place(fresh('plan'), 'envelope', 1);
  state = startRun(state);
  state = tick(state);
  assert.equal(result(state).conflicts, 2);
  assert.deepEqual(restore(fresh('plan')), fresh('plan'));
});
