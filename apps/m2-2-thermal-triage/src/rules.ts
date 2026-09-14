export type ViewMode = 'rgb' | 'thermal' | 'split';
export type Decision = 'unfiled' | 'retain' | 'reject';
export type Region = 'band' | 'glass' | 'solar' | 'lowerWall' | 'context';

export type Capture = { id: number; x: number; y: number; viewpoint: -1 | 0 | 1; region: Region; decision: Decision };
export type GameState = {
  version: 2;
  phase: 'intro' | 'investigate' | 'report';
  mode: ViewMode;
  viewpoint: -1 | 0 | 1;
  zoom: number;
  camera: { x: number; y: number };
  reticle: { x: number; y: number };
  captures: Capture[];
};

export function newGame(): GameState {
  return { version: 2, phase: 'intro', mode: 'rgb', viewpoint: 0, zoom: 1,
    camera: { x: 850, y: 475 }, reticle: { x: 850, y: 475 }, captures: [] };
}

export function regionAt(x: number, y: number): Region {
  if (x >= 805 && x <= 925 && y >= 220 && y <= 745) return 'band';
  if (x >= 1120 && x <= 1325 && y >= 340 && y <= 510) return 'glass';
  if (x >= 1350 && x <= 1490 && y >= 210 && y <= 715) return 'solar';
  if (x >= 350 && x <= 700 && y >= 680 && y <= 825) return 'lowerWall';
  return 'context';
}

export function capture(state: GameState): Capture | null {
  if (state.phase !== 'investigate' || state.captures.length >= 8) return null;
  const item: Capture = { id: Math.max(0, ...state.captures.map(entry => entry.id)) + 1,
    x: Math.round(state.reticle.x), y: Math.round(state.reticle.y), viewpoint: state.viewpoint,
    region: regionAt(state.reticle.x, state.reticle.y), decision: 'unfiled' };
  state.captures.push(item);
  return item;
}

export function canFile(state: GameState): boolean {
  return state.captures.length >= 3 && state.captures.every(item => item.decision !== 'unfiled') &&
    new Set(state.captures.map(item => item.viewpoint)).size >= 2;
}

export function evidenceStrength(state: GameState): { repeatable: boolean; reflectionChecked: boolean; score: number } {
  const retainedBand = state.captures.filter(item => item.region === 'band' && item.decision === 'retain');
  const repeatable = new Set(retainedBand.map(item => item.viewpoint)).size >= 2;
  const glass = state.captures.filter(item => item.region === 'glass');
  const reflectionChecked = new Set(glass.map(item => item.viewpoint)).size >= 2 && glass.some(item => item.decision === 'reject');
  const falsePositive = state.captures.some(item => item.region === 'glass' && item.decision === 'retain');
  return { repeatable, reflectionChecked, score: Math.max(0, Math.min(100,
    (repeatable ? 55 : retainedBand.length ? 25 : 0) + (reflectionChecked ? 35 : glass.length ? 12 : 0) +
    (state.captures.some(item => item.region === 'solar' && item.decision === 'reject') ? 10 : 0) - (falsePositive ? 20 : 0))) };
}

export function restoreGame(value: unknown): GameState | null {
  if (!value || typeof value !== 'object') return null;
  const state = value as GameState;
  if (state.version !== 2 || !['intro', 'investigate', 'report'].includes(state.phase) ||
    !['rgb', 'thermal', 'split'].includes(state.mode) || ![-1, 0, 1].includes(state.viewpoint) ||
    !Number.isFinite(state.zoom) || state.zoom < 1 || state.zoom > 3 || !state.camera || !state.reticle ||
    ![state.camera.x, state.camera.y, state.reticle.x, state.reticle.y].every(Number.isFinite) ||
    !Array.isArray(state.captures) || state.captures.length > 8) return null;
  for (const item of state.captures) {
    if (!Number.isInteger(item.id) || !Number.isFinite(item.x) || !Number.isFinite(item.y) ||
      ![-1, 0, 1].includes(item.viewpoint) || !['band', 'glass', 'solar', 'lowerWall', 'context'].includes(item.region) ||
      !['unfiled', 'retain', 'reject'].includes(item.decision)) return null;
  }
  return state;
}
