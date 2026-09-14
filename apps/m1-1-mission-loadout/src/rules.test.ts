import test from 'node:test';
import assert from 'node:assert/strict';
import { checks, decide, evaluate, missions, newRound, passed, roundScore, totalScore, type MissionRule, type Platform, type RoundState, type Sensor } from './rules.ts';

function prepared(rule: MissionRule, platform: Platform, sensor: Sensor, resolve = true): RoundState {
  const round = newRound();
  round.platform = platform;
  round.sensor = sensor;
  for (const check of checks) round.inspected[check] = true;
  round.resolved[rule.blocker] = resolve;
  return round;
}

test('valid configurations include both genuinely suitable platform options', () => {
  const valid: [Platform, Sensor][] = [
    ['multirotor', 'rgb'], ['vtol', 'rgb'],
    ['fixedWing', 'rgb'], ['vtol', 'rgb'],
    ['multirotor', 'lidar'], ['vtol', 'lidar'],
  ];
  for (let i = 0; i < missions.length; i++) {
    for (const [platform, sensor] of valid.slice(i * 2, i * 2 + 2)) {
      assert.equal(evaluate(missions[i], prepared(missions[i], platform, sensor)).canClear, true);
    }
  }
});

test('incompatible platform or information type is rejected', () => {
  assert.deepEqual(evaluate(missions[0], prepared(missions[0], 'fixedWing', 'thermal')).issues, ['platform', 'sensor']);
  assert.deepEqual(evaluate(missions[1], prepared(missions[1], 'multirotor', 'rgb')).issues, ['platform']);
  assert.deepEqual(evaluate(missions[2], prepared(missions[2], 'multirotor', 'rgb')).issues, ['sensor']);
});

test('uninspected or unresolved readiness blocker prevents clearance', () => {
  const round = prepared(missions[0], 'multirotor', 'rgb', false);
  assert.equal(decide(missions[0], round, 'clear').outcome, 'blocked');
  round.resolved.airframe = true;
  round.inspected.battery = false;
  assert.equal(decide(missions[0], round, 'clear').outcome, 'incomplete');
});

test('a hold permits targeted correction without resetting valid choices', () => {
  const round = prepared(missions[0], 'multirotor', 'thermal', false);
  const held = decide(missions[0], round, 'hold');
  assert.equal(held.outcome, 'held');
  assert.equal(held.round.platform, 'multirotor');
  held.round.sensor = 'rgb';
  held.round.resolved.airframe = true;
  const cleared = decide(missions[0], held.round, 'clear');
  assert.equal(cleared.outcome, 'cleared');
  assert.equal(cleared.round.cleared, true);
  assert.equal(cleared.round.penalties.sensor, true);
  assert.equal(cleared.round.penalties.judgement, false);
});

test('premature clearance costs readiness and judgement points, then correction succeeds', () => {
  const round = prepared(missions[0], 'multirotor', 'rgb', false);
  const blocked = decide(missions[0], round, 'clear');
  assert.equal(blocked.outcome, 'blocked');
  blocked.round.resolved.airframe = true;
  const cleared = decide(missions[0], blocked.round, 'clear');
  assert.equal(cleared.outcome, 'cleared');
  assert.equal(roundScore(cleared.round), 26);
});

test('score spans 0-100 and 80% is the pass threshold', () => {
  const perfect = missions.map((rule) => decide(rule, prepared(rule, rule.acceptedPlatforms[0], rule.requiredSensor), 'clear').round);
  assert.equal(totalScore(perfect), 100);
  assert.equal(passed(perfect), true);
  assert.equal(totalScore(perfect.slice(0, 2)), 0);
  const borderline = structuredClone(perfect);
  for (const penalty of ['platform', 'sensor', 'readiness', 'judgement'] as const) borderline[0].penalties[penalty] = true;
  for (const penalty of ['platform', 'sensor'] as const) borderline[1].penalties[penalty] = true;
  assert.equal(totalScore(borderline), 82);
  assert.equal(passed(borderline), true);
  borderline[1].penalties.readiness = true;
  assert.equal(totalScore(borderline), 79);
  assert.equal(passed(borderline), false);
});
