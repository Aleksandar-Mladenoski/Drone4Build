export const missionIds = ['facade', 'mapping', 'geometry'] as const;
export type MissionId = typeof missionIds[number];
export const platforms = ['multirotor', 'fixedWing', 'vtol'] as const;
export type Platform = typeof platforms[number];
export const sensors = ['rgb', 'thermal', 'lidar'] as const;
export type Sensor = typeof sensors[number];
export const checks = ['airframe', 'battery', 'sensor'] as const;
export type Check = typeof checks[number];
export type Decision = 'hold' | 'clear';
export type Penalty = 'platform' | 'sensor' | 'readiness' | 'judgement';

export interface MissionRule {
  id: MissionId;
  acceptedPlatforms: readonly Platform[];
  requiredSensor: Sensor;
  blocker: Check;
}

export const missions: readonly MissionRule[] = [
  { id: 'facade', acceptedPlatforms: ['multirotor', 'vtol'], requiredSensor: 'rgb', blocker: 'airframe' },
  { id: 'mapping', acceptedPlatforms: ['fixedWing', 'vtol'], requiredSensor: 'rgb', blocker: 'battery' },
  { id: 'geometry', acceptedPlatforms: ['multirotor', 'vtol'], requiredSensor: 'lidar', blocker: 'sensor' },
];

export interface RoundState {
  platform: Platform | null;
  sensor: Sensor | null;
  inspected: Record<Check, boolean>;
  resolved: Record<Check, boolean>;
  firstDecision: Decision | null;
  penalties: Record<Penalty, boolean>;
  cleared: boolean;
}

export function newRound(): RoundState {
  return {
    platform: null,
    sensor: null,
    inspected: { airframe: false, battery: false, sensor: false },
    resolved: { airframe: false, battery: false, sensor: false },
    firstDecision: null,
    penalties: { platform: false, sensor: false, readiness: false, judgement: false },
    cleared: false,
  };
}

export interface Evaluation {
  complete: boolean;
  platformOk: boolean;
  sensorOk: boolean;
  inspectedAll: boolean;
  readinessOk: boolean;
  canClear: boolean;
  issues: ('platform' | 'sensor' | 'readiness')[];
}

export function evaluate(rule: MissionRule, round: RoundState): Evaluation {
  const complete = round.platform !== null && round.sensor !== null;
  const platformOk = round.platform !== null && rule.acceptedPlatforms.includes(round.platform);
  const sensorOk = round.sensor === rule.requiredSensor;
  const inspectedAll = checks.every((check) => round.inspected[check]);
  const readinessOk = inspectedAll && round.resolved[rule.blocker];
  const issues: Evaluation['issues'] = [];
  if (!platformOk) issues.push('platform');
  if (!sensorOk) issues.push('sensor');
  if (!readinessOk) issues.push('readiness');
  return { complete, platformOk, sensorOk, inspectedAll, readinessOk, canClear: complete && issues.length === 0, issues };
}

export interface DecisionResult {
  outcome: 'incomplete' | 'held' | 'blocked' | 'cleared' | 'unnecessaryHold';
  evaluation: Evaluation;
  round: RoundState;
}

export function decide(rule: MissionRule, round: RoundState, decision: Decision): DecisionResult {
  const evaluation = evaluate(rule, round);
  if (!evaluation.complete || !evaluation.inspectedAll) {
    return { outcome: 'incomplete', evaluation, round };
  }
  if (round.cleared) return { outcome: 'cleared', evaluation, round };

  const penalties = { ...round.penalties };
  if (!evaluation.platformOk) penalties.platform = true;
  if (!evaluation.sensorOk) penalties.sensor = true;
  if (decision === 'clear' && !evaluation.readinessOk) penalties.readiness = true;
  if ((decision === 'clear' && !evaluation.canClear) || (round.firstDecision === null && decision === 'hold' && evaluation.canClear)) {
    penalties.judgement = true;
  }
  const next: RoundState = { ...round, penalties, firstDecision: round.firstDecision ?? decision };
  if (decision === 'hold') {
    return { outcome: evaluation.canClear ? 'unnecessaryHold' : 'held', evaluation, round: next };
  }
  if (!evaluation.canClear) return { outcome: 'blocked', evaluation, round: next };
  next.cleared = true;
  return { outcome: 'cleared', evaluation, round: next };
}

export function roundScore(round: RoundState): number {
  if (!round.cleared) return 0;
  return 32 - Object.values(round.penalties).filter(Boolean).length * 3;
}

export function totalScore(rounds: readonly RoundState[]): number {
  if (rounds.length !== missions.length || !rounds.every((round) => round.cleared)) return 0;
  return 4 + rounds.reduce((sum, round) => sum + roundScore(round), 0);
}

export function passed(rounds: readonly RoundState[]): boolean {
  return totalScore(rounds) >= 80;
}
