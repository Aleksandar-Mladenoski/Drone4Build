export type Phase = 'intro' | 'plan' | 'flight' | 'adapt' | 'return' | 'result';
export type Plan = { route: '' | 'east' | 'west'; launch: '' | 'designated' | 'unreviewed'; response: '' | 'hold-return' | 'continue' };
export type GameState = { phase: Phase; plan: Plan; planErrors: number; flightErrors: number; adaptErrors: number; planCleared: boolean; safeResponse: boolean; landed: boolean; feedback: string; checkpoint: boolean };
export const initialState = (): GameState => ({ phase: 'intro', plan: { route: '', launch: '', response: '' }, planErrors: 0, flightErrors: 0, adaptErrors: 0, planCleared: false, safeResponse: false, landed: false, feedback: '', checkpoint: false });
export function planIsSafe(plan: Plan) { return plan.route === 'east' && plan.launch === 'designated' && plan.response === 'hold-return'; }
export function inKnownZone(x: number, z: number) { return x < -2 && x > -9 && z < -3 && z > -15; }
export function inNewZone(_x: number, z: number) { return z < -15; }
export function scoreBreakdown(state: GameState) {
  return { planning: state.planCleared ? Math.max(0, 40 - Math.min(20, state.planErrors * 5)) : 0,
    flight: state.checkpoint ? Math.max(0, 30 - Math.min(20, state.flightErrors * 5)) : 0,
    adapt: state.safeResponse && state.landed ? Math.max(0, 30 - Math.min(20, state.adaptErrors * 10)) : 0 };
}
export function score(state: GameState) { const part=scoreBreakdown(state); return part.planning+part.flight+part.adapt; }
export function passed(state: GameState) { return state.phase === 'result' && state.safeResponse && state.landed && score(state) >= 80; }
export function canLand(x: number, z: number, y: number) { return Math.hypot(x, z - 8) < 4.5 && y <= 2.8; }
