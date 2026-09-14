export const CASE_IDS = ['facade', 'solar', 'moisture', 'reflection'] as const;
export type CaseId = typeof CASE_IDS[number];
export type Field = 'focus' | 'status' | 'validation';
export type PriorityField = 'case' | 'reason';
export type Phase = 'intro' | 'case' | 'priority' | 'result';

export const STATUS_IDS = ['investigate', 'environment', 'possible', 'material', 'confirmed', 'moistureProof'] as const;
export type StatusId = typeof STATUS_IDS[number];
export const VALIDATION_IDS = ['envelope', 'conditions', 'moisture', 'material', 'none'] as const;
export type ValidationId = typeof VALIDATION_IDS[number];
export const REASON_IDS = ['repeatable', 'dramatic', 'colour', 'single'] as const;
export type ReasonId = typeof REASON_IDS[number];

export type Observation = {
  id: CaseId;
  focus: readonly [string, string];
  statusChoices: readonly StatusId[];
  validationChoices: readonly ValidationId[];
  correct: { focus: string; status: StatusId; validation: ValidationId };
};

export const OBSERVATIONS: readonly Observation[] = [
  { id: 'facade', focus: ['verticalBand', 'roofEdge'], statusChoices: ['investigate', 'confirmed', 'possible', 'environment'], validationChoices: ['envelope', 'none', 'conditions', 'material'], correct: { focus: 'verticalBand', status: 'investigate', validation: 'envelope' } },
  { id: 'solar', focus: ['sunlitPanel', 'shadedPanel'], statusChoices: ['environment', 'investigate', 'confirmed', 'material'], validationChoices: ['conditions', 'none', 'envelope', 'material'], correct: { focus: 'sunlitPanel', status: 'environment', validation: 'conditions' } },
  { id: 'moisture', focus: ['lowerPatch', 'upperWall'], statusChoices: ['possible', 'moistureProof', 'investigate', 'environment'], validationChoices: ['moisture', 'none', 'envelope', 'conditions'], correct: { focus: 'lowerPatch', status: 'possible', validation: 'moisture' } },
  { id: 'reflection', focus: ['glazing', 'masonry'], statusChoices: ['material', 'investigate', 'confirmed', 'environment'], validationChoices: ['material', 'none', 'envelope', 'conditions'], correct: { focus: 'glazing', status: 'material', validation: 'material' } }
];

export type CaseProgress = {
  selected: { focus: string | null; status: StatusId | null; validation: ValidationId | null };
  errors: Record<Field, number>;
  solved: boolean;
};

export type GameState = {
  version: 1;
  phase: Phase;
  index: number;
  cases: Record<CaseId, CaseProgress>;
  priority: {
    selected: { case: CaseId | null; reason: ReasonId | null };
    errors: Record<PriorityField, number>;
    solved: boolean;
  };
};

const newCase = (): CaseProgress => ({ selected: { focus: null, status: null, validation: null }, errors: { focus: 0, status: 0, validation: 0 }, solved: false });

export function newGame(): GameState {
  return {
    version: 1,
    phase: 'intro',
    index: 0,
    cases: { facade: newCase(), solar: newCase(), moisture: newCase(), reflection: newCase() },
    priority: { selected: { case: null, reason: null }, errors: { case: 0, reason: 0 }, solved: false }
  };
}

export function assessCase(state: GameState): { missing: Field[]; wrong: Field[]; solved: boolean } {
  const observation = OBSERVATIONS[state.index];
  if (!observation || state.phase !== 'case') return { missing: [], wrong: [], solved: false };
  const progress = state.cases[observation.id];
  if (progress.solved) return { missing: [], wrong: [], solved: true };
  const fields: Field[] = ['focus', 'status', 'validation'];
  const missing = fields.filter(field => progress.selected[field] === null);
  if (missing.length) return { missing, wrong: [], solved: false };
  const wrong = fields.filter(field => progress.selected[field] !== observation.correct[field]);
  for (const field of wrong) progress.errors[field] += 1;
  progress.solved = wrong.length === 0;
  return { missing: [], wrong, solved: progress.solved };
}

export function advance(state: GameState): void {
  if (state.phase !== 'case' || !state.cases[CASE_IDS[state.index]].solved) return;
  if (state.index < CASE_IDS.length - 1) state.index += 1;
  else state.phase = 'priority';
}

export function assessPriority(state: GameState): { missing: PriorityField[]; wrong: PriorityField[]; solved: boolean } {
  if (state.phase !== 'priority' || state.priority.solved) return { missing: [], wrong: [], solved: state.priority.solved };
  const fields: PriorityField[] = ['case', 'reason'];
  const missing = fields.filter(field => state.priority.selected[field] === null);
  if (missing.length) return { missing, wrong: [], solved: false };
  const wrong = fields.filter(field => state.priority.selected[field] !== (field === 'case' ? 'facade' : 'repeatable'));
  for (const field of wrong) state.priority.errors[field] += 1;
  state.priority.solved = wrong.length === 0;
  if (state.priority.solved) state.phase = 'result';
  return { missing: [], wrong, solved: state.priority.solved };
}

function points(errors: number, max: number): number {
  return errors === 0 ? max : errors === 1 ? max / 2 : 0;
}

export function score(state: GameState): number {
  let total = 0;
  for (const id of CASE_IDS) {
    const progress = state.cases[id];
    if (!progress.solved) continue;
    total += points(progress.errors.focus, 4);
    total += points(progress.errors.status, 8);
    total += points(progress.errors.validation, 8);
  }
  if (state.priority.solved) {
    total += points(state.priority.errors.case, 10);
    total += points(state.priority.errors.reason, 10);
  }
  return total;
}

export function passed(state: GameState): boolean {
  return state.phase === 'result' && state.priority.solved && CASE_IDS.every(id => state.cases[id].solved) && score(state) >= 75;
}

export function restoreGame(value: unknown): GameState | null {
  if (!value || typeof value !== 'object') return null;
  const state = value as GameState;
  if (state.version !== 1 || !['intro', 'case', 'priority', 'result'].includes(state.phase) || !Number.isInteger(state.index) || state.index < 0 || state.index >= CASE_IDS.length || !state.cases || !state.priority) return null;
  for (const observation of OBSERVATIONS) {
    const progress = state.cases[observation.id];
    if (!progress || !progress.selected || !progress.errors || typeof progress.solved !== 'boolean') return null;
    if (progress.selected.focus !== null && !observation.focus.includes(progress.selected.focus)) return null;
    if (progress.selected.status !== null && !STATUS_IDS.includes(progress.selected.status)) return null;
    if (progress.selected.validation !== null && !VALIDATION_IDS.includes(progress.selected.validation)) return null;
    if ((['focus', 'status', 'validation'] as const).some(field => !Number.isInteger(progress.errors[field]) || progress.errors[field] < 0 || progress.errors[field] > 20)) return null;
  }
  if (!state.priority.selected || !state.priority.errors || typeof state.priority.solved !== 'boolean') return null;
  if (state.priority.selected.case !== null && !CASE_IDS.includes(state.priority.selected.case)) return null;
  if (state.priority.selected.reason !== null && !REASON_IDS.includes(state.priority.selected.reason)) return null;
  if ((['case', 'reason'] as const).some(field => !Number.isInteger(state.priority.errors[field]) || state.priority.errors[field] < 0 || state.priority.errors[field] > 20)) return null;
  return state;
}
