import { CAPTURE_CAPACITY, PASS_COVERAGE, ZONES } from './scenario.ts';

export type Phase = 'intro' | 'survey' | 'summary';
export type CaptureKind = 'useful' | 'context' | 'redundant';
export type Capture = { id: number; zoneId: string; kind: CaptureKind };
export type GameState = {
  version: 1;
  phase: Phase;
  cursor: string;
  visited: string[];
  captures: Capture[];
  steps: number;
  selectedCapture: number | null;
};

export function fresh(phase: Phase = 'intro'): GameState {
  return { version: 1, phase, cursor: 'z14', visited: [], captures: [], steps: 0, selectedCapture: null };
}

export const zone = (id: string) => ZONES.find(item => item.id === id)!;

export function visit(state: GameState, zoneId: string): GameState {
  if (state.phase !== 'survey' || !zone(zoneId)) return state;
  return {
    ...state,
    cursor: zoneId,
    steps: state.steps + 1,
    visited: state.visited.includes(zoneId) ? state.visited : [...state.visited, zoneId],
    selectedCapture: null
  };
}

export function move(state: GameState, dx: number, dy: number): GameState {
  const current = zone(state.cursor);
  const col = Math.max(0, Math.min(5, current.col + dx));
  const row = Math.max(0, Math.min(2, current.row + dy));
  return visit(state, `z${row * 6 + col + 1}`);
}

export function capture(state: GameState): GameState {
  if (state.phase !== 'survey' || state.captures.length >= CAPTURE_CAPACITY) return state;
  const current = zone(state.cursor);
  const nearExisting = state.captures.some(item => {
    const other = zone(item.zoneId);
    return Math.abs(other.col - current.col) + Math.abs(other.row - current.row) <= 1;
  });
  const kind: CaptureKind = nearExisting ? 'redundant' : current.feature ? 'useful' : 'context';
  const next = { id: state.captures.length + 1, zoneId: current.id, kind };
  return { ...state, captures: [...state.captures, next], visited: state.visited.includes(current.id) ? state.visited : [...state.visited, current.id], selectedCapture: next.id };
}

export type Summary = {
  score: number;
  passed: boolean;
  coverage: number;
  useful: number;
  context: number;
  redundant: number;
  missed: string[];
};

export function summarize(state: GameState): Summary {
  const coverage = state.visited.length / ZONES.length;
  const useful = state.captures.filter(item => item.kind === 'useful').length;
  const context = state.captures.filter(item => item.kind === 'context').length;
  const redundant = state.captures.filter(item => item.kind === 'redundant').length;
  const missed = ZONES.filter(item => item.feature && !state.captures.some(capture => capture.zoneId === item.id)).map(item => item.label);
  const score = Math.max(0, Math.min(100,
    Math.round(coverage * 50) + useful * 12 + (context >= 2 ? 10 : 0) - redundant * 10 - missed.length * 5
  ));
  return { score, passed: coverage >= PASS_COVERAGE && useful >= 2 && redundant <= 1 && score >= 75, coverage, useful, context, redundant, missed };
}

export const canFinish = (state: GameState) => state.phase === 'survey' && (state.steps >= 6 || state.captures.length >= 3);

export function restore(value: unknown): GameState | null {
  if (!value || typeof value !== 'object') return null;
  const state = value as Partial<GameState>;
  const ids = new Set(ZONES.map(item => item.id));
  if (state.version !== 1 || !['intro', 'survey', 'summary'].includes(state.phase ?? '') || !ids.has(state.cursor ?? '') ||
    !Array.isArray(state.visited) || state.visited.some(id => !ids.has(id)) || new Set(state.visited).size !== state.visited.length ||
    !Array.isArray(state.captures) || state.captures.length > CAPTURE_CAPACITY || state.captures.some(item => !item || !ids.has(item.zoneId) || !['useful', 'context', 'redundant'].includes(item.kind)) ||
    !Number.isInteger(state.steps) || state.steps! < 0 || (state.selectedCapture !== null && !Number.isInteger(state.selectedCapture))) return null;
  return state as GameState;
}
