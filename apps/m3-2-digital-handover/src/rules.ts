export const GATES = ['verify', 'integrate', 'compare', 'release'] as const;
export type Gate = typeof GATES[number];
export type Mode = 'intro' | 'active' | 'result';

export interface GameState {
  version: 1;
  mode: Mode;
  gate: number;
  errors: [number, number, number, number];
  completed: [boolean, boolean, boolean, boolean];
  selection: string | null;
  feedback: string | null;
  released: boolean;
}

const ANSWERS: Record<Gate, string> = {
  verify: 'reference-mismatch',
  integrate: 'align-documented',
  compare: 'opening-shift',
  release: 'approved-current',
};

const WRONG_FEEDBACK: Record<Gate, Record<string, string>> = {
  verify: {
    'ready-to-compare': 'feedback.verify.ready',
    'units-problem': 'feedback.verify.units',
    'reference-mismatch': 'feedback.verify.correct',
  },
  integrate: {
    'visual-drag': 'feedback.integrate.drag',
    'compare-as-is': 'feedback.integrate.asis',
    'align-documented': 'feedback.integrate.correct',
  },
  compare: {
    'point-density': 'feedback.compare.density',
    'line-style': 'feedback.compare.style',
    'opening-shift': 'feedback.compare.correct',
  },
  release: {
    'approved-old': 'feedback.release.old',
    'draft-new': 'feedback.release.draft',
    'qa-failed': 'feedback.release.qa',
    'approved-current': 'feedback.release.correct',
  },
};

export function initialState(): GameState {
  return {
    version: 1,
    mode: 'intro',
    gate: 0,
    errors: [0, 0, 0, 0],
    completed: [false, false, false, false],
    selection: null,
    feedback: null,
    released: false,
  };
}

export function start(state: GameState): GameState {
  if (state.mode !== 'intro') return state;
  return { ...state, mode: 'active', feedback: null };
}

export function score(state: GameState): number {
  return state.completed.reduce<number>((sum, done, index) =>
    sum + (done ? Math.max(10, 25 - state.errors[index] * 5) : 0), 0);
}

export function passed(state: GameState): boolean {
  return state.mode === 'result' && state.released && score(state) >= 75;
}

export function select(state: GameState, choice: string): GameState {
  if (state.mode !== 'active') return state;
  return { ...state, selection: choice, feedback: null };
}

export function submit(state: GameState): GameState {
  if (state.mode !== 'active' || !state.selection) return state;
  const gate = GATES[state.gate];
  if (!gate) return state;

  const choice = state.selection;
  if (choice !== ANSWERS[gate]) {
    const errors = [...state.errors] as GameState['errors'];
    errors[state.gate] += 1;
    return {
      ...state,
      errors,
      selection: null,
      feedback: WRONG_FEEDBACK[gate][choice] ?? `feedback.${gate}.tryAgain`,
    };
  }

  const completed = [...state.completed] as GameState['completed'];
  completed[state.gate] = true;
  const isFinal = state.gate === GATES.length - 1;
  return {
    ...state,
    completed,
    mode: isFinal ? 'result' : 'active',
    gate: isFinal ? state.gate : state.gate + 1,
    selection: null,
    feedback: WRONG_FEEDBACK[gate][choice],
    released: isFinal,
  };
}

export function restore(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<GameState>;
  if (value.version !== 1 || !['intro', 'active', 'result'].includes(value.mode ?? '') ||
      !Number.isInteger(value.gate) || (value.gate ?? -1) < 0 || (value.gate ?? 4) > 3 ||
      !Array.isArray(value.errors) || value.errors.length !== 4 ||
      !value.errors.every(n => Number.isInteger(n) && n >= 0 && n <= 100) ||
      !Array.isArray(value.completed) || value.completed.length !== 4 ||
      !value.completed.every(n => typeof n === 'boolean') ||
      typeof value.released !== 'boolean') return null;
  const gate = value.gate as number;
  const completed = value.completed as GameState['completed'];
  if (completed.some((done, index) => done !== (value.mode === 'result' || index < gate))) return null;
  if (value.mode === 'result' && (!value.released || gate !== 3)) return null;
  if (value.mode !== 'result' && value.released) return null;
  return {
    version: 1,
    mode: value.mode as Mode,
    gate,
    errors: value.errors as GameState['errors'],
    completed,
    selection: typeof value.selection === 'string' ? value.selection : null,
    feedback: typeof value.feedback === 'string' ? value.feedback : null,
    released: value.released,
  };
}
