import test from 'node:test';
import assert from 'node:assert/strict';
import { capture, fresh, move, restore, summarize, visit } from './rules.ts';
import { ZONES } from './scenario.ts';

test('survey movement builds persistent spatial coverage', () => {
  let state = { ...fresh('survey'), visited: ['z14'] };
  state = move(state, 1, 0);
  state = move(state, 0, -1);
  state = visit(state, 'z2');
  assert.deepEqual(state.visited, ['z14', 'z15', 'z9', 'z2']);
  assert.equal(state.cursor, 'z2');
});

test('near-identical captures consume capacity as redundant evidence', () => {
  let state = visit(fresh('survey'), 'z2');
  state = capture(state);
  state = visit(state, 'z3');
  state = capture(state);
  assert.equal(state.captures[0].kind, 'useful');
  assert.equal(state.captures[1].kind, 'redundant');
});

test('complete sweep with distributed feature evidence passes', () => {
  let state = fresh('survey');
  for (const item of ZONES) state = visit(state, item.id);
  for (const id of ['z2', 'z10', 'z17', 'z7', 'z18']) { state = visit(state, id); state = capture(state); }
  const result = summarize(state);
  assert.equal(result.coverage, 1);
  assert.equal(result.useful, 3);
  assert.equal(result.passed, true);
});

test('incomplete redundant record fails and checkpoint validates', () => {
  let state = visit(fresh('survey'), 'z8');
  state = capture(state);
  state = capture(state);
  assert.equal(summarize(state).passed, false);
  assert.deepEqual(restore(state), state);
  assert.equal(restore({ ...state, cursor: 'missing' }), null);
});
