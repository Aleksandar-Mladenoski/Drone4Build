import { ACTIVITIES, INITIAL_PLACEMENTS, INITIAL_ROUTES, type ActivityId, type StakeholderId } from './scenario.ts';

export type Phase = 'intro' | 'plan' | 'running' | 'event' | 'complete';
export type OutcomeStatus = 'done' | 'blocked' | 'conflict';
export type Outcome = { activity: ActivityId; slot: number; status: OutcomeStatus; reason: 'complete' | 'route' | 'access' | 'resource' | 'dependency' };
export type GameState = {
  version: 1;
  phase: Phase;
  placements: Record<ActivityId, number>;
  routes: Record<ActivityId, StakeholderId | null>;
  selected: ActivityId | null;
  step: number;
  outcomes: Outcome[];
  eventSeen: boolean;
  eventReplanned: boolean;
};

export function fresh(phase: Phase = 'intro'): GameState {
  return { version: 1, phase, placements: { ...INITIAL_PLACEMENTS }, routes: { ...INITIAL_ROUTES }, selected: null, step: 0, outcomes: [], eventSeen: false, eventReplanned: false };
}

export const activity = (id: ActivityId) => ACTIVITIES.find(item => item.id === id)!;

export function place(state: GameState, id: ActivityId, slot: number): GameState {
  if (!['plan', 'event'].includes(state.phase) || slot < 1 || slot > 4) return state;
  return { ...state, placements: { ...state.placements, [id]: slot }, selected: null };
}

export function route(state: GameState, id: ActivityId, stakeholder: StakeholderId): GameState {
  if (!['plan', 'event'].includes(state.phase)) return state;
  return { ...state, routes: { ...state.routes, [id]: stakeholder }, selected: null };
}

function outcomeFor(state: GameState, id: ActivityId, slot: number): Outcome {
  const item = activity(id);
  const sameSlotFlights = ACTIVITIES.filter(other => other.flight && state.placements[other.id] === slot).length;
  if (item.flight && sameSlotFlights > 1) return { activity: id, slot, status: 'conflict', reason: 'resource' };
  if (state.eventSeen && id === 'facade' && slot === 3) return { activity: id, slot, status: 'blocked', reason: 'access' };
  if (state.routes[id] !== item.owner) return { activity: id, slot, status: 'blocked', reason: 'route' };
  if (id === 'envelope' && !state.outcomes.some(result => result.activity === 'roof' && result.status === 'done')) return { activity: id, slot, status: 'blocked', reason: 'dependency' };
  if (id === 'handoff' && !state.outcomes.some(result => result.activity === 'envelope' && result.status === 'done')) return { activity: id, slot, status: 'blocked', reason: 'dependency' };
  return { activity: id, slot, status: 'done', reason: 'complete' };
}

export function startRun(state: GameState): GameState {
  if (state.phase !== 'plan') return state;
  return { ...state, phase: 'running', step: 0, outcomes: [], selected: null, eventSeen: false, eventReplanned: false };
}

export function tick(state: GameState): GameState {
  if (state.phase !== 'running') return state;
  const slot = state.step + 1;
  const scheduled = ACTIVITIES.filter(item => state.placements[item.id] === slot);
  let working = state;
  const nextOutcomes = [...state.outcomes];
  for (const item of scheduled) {
    const result = outcomeFor({ ...working, outcomes: nextOutcomes }, item.id, slot);
    nextOutcomes.push(result);
  }
  working = { ...working, step: slot, outcomes: nextOutcomes };
  if (slot === 2 && !working.eventSeen) return { ...working, phase: 'event', eventSeen: true };
  if (slot >= 4) return { ...working, phase: 'complete' };
  return working;
}

export function resumeAfterEvent(state: GameState): GameState {
  if (state.phase !== 'event') return state;
  const replanned = state.placements.facade === 4 && state.placements.handoff === 3;
  return { ...state, phase: 'running', selected: null, eventReplanned: replanned };
}

export function result(state: GameState) {
  const done = state.outcomes.filter(item => item.status === 'done').length;
  const blocked = state.outcomes.filter(item => item.status === 'blocked').length;
  const conflicts = state.outcomes.filter(item => item.status === 'conflict').length;
  const routed = ACTIVITIES.filter(item => state.routes[item.id] === item.owner).length;
  const score = Math.max(0, Math.min(100, done * 15 + routed * 5 + (state.eventReplanned ? 20 : 0) - conflicts * 10));
  return { done, blocked, conflicts, routed, score, passed: done === 4 && state.eventReplanned && routed === 4 };
}

export function restore(value: unknown): GameState | null {
  if (!value || typeof value !== 'object') return null;
  const state = value as Partial<GameState>;
  const activityIds = ACTIVITIES.map(item => item.id);
  const stakeholders = new Set(['site', 'design', 'records']);
  if (state.version !== 1 || !['intro', 'plan', 'running', 'event', 'complete'].includes(state.phase ?? '') ||
    !state.placements || activityIds.some(id => !Number.isInteger(state.placements?.[id]) || state.placements![id] < 1 || state.placements![id] > 4) ||
    !state.routes || activityIds.some(id => state.routes?.[id] !== null && !stakeholders.has(state.routes?.[id] ?? '')) ||
    (state.selected !== null && !activityIds.includes(state.selected!)) || !Number.isInteger(state.step) || state.step! < 0 || state.step! > 4 ||
    !Array.isArray(state.outcomes) || typeof state.eventSeen !== 'boolean' || typeof state.eventReplanned !== 'boolean') return null;
  return state as GameState;
}
