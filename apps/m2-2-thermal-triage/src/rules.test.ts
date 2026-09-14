import test from 'node:test';
import assert from 'node:assert/strict';
import { CASE_IDS, OBSERVATIONS, advance, assessCase, assessPriority, newGame, passed, restoreGame, score, type GameState } from './rules.ts';

function selectCorrect(state: GameState) {
  const observation = OBSERVATIONS[state.index];
  state.cases[observation.id].selected = { ...observation.correct };
}

function solveAllCases(state: GameState) {
  state.phase = 'case';
  for (const id of CASE_IDS) {
    assert.equal(CASE_IDS[state.index], id);
    selectCorrect(state);
    assert.equal(assessCase(state).solved, true);
    advance(state);
  }
  assert.equal(state.phase, 'priority');
}

test('all four evidence classifications and validation actions yield a full-score pass', () => {
  const state = newGame();
  solveAllCases(state);
  state.priority.selected = { case: 'facade', reason: 'repeatable' };
  assert.equal(assessPriority(state).solved, true);
  assert.equal(score(state), 100);
  assert.equal(passed(state), true);
});

test('environmental artefact must be classified using survey context', () => {
  const state = newGame();
  state.phase = 'case'; state.index = 1;
  state.cases.solar.selected = { focus: 'sunlitPanel', status: 'investigate', validation: 'conditions' };
  const first = assessCase(state);
  assert.deepEqual(first.wrong, ['status']);
  assert.equal(state.cases.solar.solved, false);
  state.cases.solar.selected.status = 'environment';
  assert.equal(assessCase(state).solved, true);
  assert.equal(score(state), 16);
});

test('claiming thermography proves moisture cannot clear the observation', () => {
  const state = newGame();
  state.phase = 'case'; state.index = 2;
  state.cases.moisture.selected = { focus: 'lowerPatch', status: 'moistureProof', validation: 'none' };
  assert.deepEqual(assessCase(state).wrong, ['status', 'validation']);
  advance(state);
  assert.equal(state.index, 2);
  state.cases.moisture.selected.status = 'possible';
  state.cases.moisture.selected.validation = 'moisture';
  assert.equal(assessCase(state).solved, true);
});

test('a dramatic-looking observation is not the supported final priority', () => {
  const state = newGame();
  solveAllCases(state);
  state.priority.selected = { case: 'solar', reason: 'dramatic' };
  assert.deepEqual(assessPriority(state).wrong, ['case', 'reason']);
  assert.equal(state.phase, 'priority');
  state.priority.selected = { case: 'facade', reason: 'repeatable' };
  assert.equal(assessPriority(state).solved, true);
  assert.equal(score(state), 90);
  assert.equal(passed(state), true);
});

test('retries deduct only the affected decisions and can produce a below-threshold result', () => {
  const state = newGame();
  state.phase = 'case';
  for (let index = 0; index < 4; index++) {
    const observation = OBSERVATIONS[index];
    const progress = state.cases[observation.id];
    progress.selected = { focus: observation.correct.focus, status: 'confirmed', validation: 'none' };
    assert.deepEqual(assessCase(state).wrong, ['status', 'validation']);
    selectCorrect(state);
    assert.equal(assessCase(state).solved, true);
    advance(state);
  }
  state.priority.selected = { case: 'facade', reason: 'repeatable' };
  assert.equal(assessPriority(state).solved, true);
  assert.equal(score(state), 68);
  assert.equal(passed(state), false);
});

test('resume accepts a serialised checkpoint and rejects invalid data', () => {
  const state = newGame();
  state.phase = 'case';
  state.cases.facade.selected.focus = 'verticalBand';
  const copy = restoreGame(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(copy, state);
  assert.equal(restoreGame({ ...state, index: 9 }), null);
  assert.equal(restoreGame({ ...state, cases: { ...state.cases, facade: { ...state.cases.facade, selected: { ...state.cases.facade.selected, focus: 'unknown' } } } }), null);
});
