import { IMAGES, INITIAL_ASSIGNMENTS, INITIAL_HELD } from './scenario.ts';

export type Phase = 'intro' | 'prepare' | 'result' | 'report';
export type OutputView = 'cloud' | 'surface' | 'quality';
export type GameState = {
  version: 1;
  phase: Phase;
  assignments: string[];
  held: string;
  selectedImage: string | null;
  runs: number;
  traceActive: boolean;
  view: OutputView;
};

export function fresh(phase: Phase = 'intro'): GameState {
  return { version: 1, phase, assignments: [...INITIAL_ASSIGNMENTS], held: INITIAL_HELD, selectedImage: null, runs: 0, traceActive: false, view: 'cloud' };
}

export const image = (id: string) => IMAGES.find(item => item.id === id)!;
export const repaired = (state: GameState) => state.assignments[5] === 'east-return' && state.held === 'soft-east';

export function selectImage(state: GameState, id: string): GameState {
  if (state.phase === 'intro' || state.phase === 'report' || !image(id)) return state;
  return { ...state, selectedImage: state.selectedImage === id ? null : id };
}

export function placeSelected(state: GameState, slot: number): GameState {
  if (state.selectedImage === null || slot < 0 || slot >= state.assignments.length) return state;
  const assignments = [...state.assignments];
  const selectedIndex = assignments.indexOf(state.selectedImage);
  if (selectedIndex >= 0) [assignments[selectedIndex], assignments[slot]] = [assignments[slot], assignments[selectedIndex]];
  else if (state.held === state.selectedImage) { const displaced = assignments[slot]; assignments[slot] = state.held; return { ...state, assignments, held: displaced, selectedImage: null, phase: 'prepare', traceActive: false }; }
  return { ...state, assignments, selectedImage: null, phase: 'prepare', traceActive: false };
}

export function runReconstruction(state: GameState): GameState {
  if (state.phase === 'intro' || state.phase === 'report') return state;
  return { ...state, phase: 'result', runs: state.runs + 1, selectedImage: null, traceActive: false };
}

export function quality(state: GameState) {
  const fixed = repaired(state);
  return {
    score: fixed ? 92 : 46,
    completeness: fixed ? 96 : 68,
    coherence: fixed ? 91 : 52,
    usable: fixed && state.runs >= 2
  };
}

export function restore(value: unknown): GameState | null {
  if (!value || typeof value !== 'object') return null;
  const state = value as Partial<GameState>;
  const ids = new Set(IMAGES.map(item => item.id));
  if (state.version !== 1 || !['intro', 'prepare', 'result', 'report'].includes(state.phase ?? '') ||
    !Array.isArray(state.assignments) || state.assignments.length !== 6 || state.assignments.some(id => !ids.has(id)) || new Set(state.assignments).size !== 6 ||
    !ids.has(state.held ?? '') || state.assignments.includes(state.held!) || (state.selectedImage !== null && !ids.has(state.selectedImage ?? '')) ||
    !Number.isInteger(state.runs) || state.runs! < 0 || typeof state.traceActive !== 'boolean' || !['cloud', 'surface', 'quality'].includes(state.view ?? '')) return null;
  return state as GameState;
}
