export type Phase = 'intro' | 'register' | 'compare' | 'solved';
export type Point = { x: number; y: number };
export type Transform = { dx: number; dy: number; angle: number };
export type GameState = { version: 2; phase: Phase; transform: Transform; opacity: number; clip: number; falseMarks: number; lastMark: Point | null; feedback: string | null };

export const CENTER: Point = { x: 470, y: 330 };
export const ANCHORS: Point[] = [{ x: 220, y: 180 }, { x: 610, y: 180 }, { x: 720, y: 475 }];
export const PLANNED_OPENING = { x: 333, y: 390, width: 72, height: 58 };
export const EXISTING_OPENING = { x: 422, y: 390, width: 72, height: 58 };
export const INITIAL_TRANSFORM: Transform = { dx: 88, dy: -46, angle: 11 };

export function fresh(): GameState {
  return { version: 2, phase: 'intro', transform: { ...INITIAL_TRANSFORM }, opacity: .88, clip: 100, falseMarks: 0, lastMark: null, feedback: null };
}

export function transformPoint(p: Point, transform: Transform): Point {
  const radians = transform.angle * Math.PI / 180;
  const x = p.x - CENTER.x, y = p.y - CENTER.y;
  return { x: CENTER.x + x * Math.cos(radians) - y * Math.sin(radians) + transform.dx,
    y: CENTER.y + x * Math.sin(radians) + y * Math.cos(radians) + transform.dy };
}

export function anchorErrors(transform: Transform): number[] {
  return ANCHORS.map(anchor => {
    const moved = transformPoint(anchor, transform);
    return Math.hypot(moved.x - anchor.x, moved.y - anchor.y);
  });
}

export function canRegister(transform: Transform): boolean {
  const errors = anchorErrors(transform);
  return Math.max(...errors) < 24 && errors.reduce((a, b) => a + b, 0) / errors.length < 17;
}

export function isRealDiscrepancy(p: Point): boolean {
  return p.x >= EXISTING_OPENING.x - 15 && p.x <= EXISTING_OPENING.x + EXISTING_OPENING.width + 15 &&
    p.y >= EXISTING_OPENING.y - 15 && p.y <= EXISTING_OPENING.y + EXISTING_OPENING.height + 15;
}

export function tryInspect(state: GameState, point: Point): GameState {
  if (state.phase !== 'compare') return state;
  if (isRealDiscrepancy(point)) return { ...state, phase: 'solved', lastMark: point, feedback: 'feedback.found' };
  return { ...state, falseMarks: state.falseMarks + 1, lastMark: point, feedback: 'feedback.false' };
}

export function restore(value: unknown): GameState | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as Partial<GameState>;
  if (s.version !== 2 || !['intro', 'register', 'compare', 'solved'].includes(s.phase ?? '') || !s.transform ||
      ![s.transform.dx, s.transform.dy, s.transform.angle, s.opacity, s.clip, s.falseMarks].every(Number.isFinite)) return null;
  return { ...fresh(), ...s, transform: { ...s.transform } } as GameState;
}
