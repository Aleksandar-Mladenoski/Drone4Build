export type Route = 'east' | 'west';
export type Phase = 'brief' | 'flight' | 'result';
export type ObjectiveId = 'roof' | 'facade';
export type GameState = {
  phase: Phase;
  route: Route;
  completed: ObjectiveId[];
  craneActive: boolean;
  landed: boolean;
  battery: number;
  encounters: number;
  elapsed: number;
};

export const PAD = { x: 0, z: 65 };
export const OBJECTIVES = {
  roof: { x: 37, z: -34, y: 11, label: 'Roof edge' },
  facade: { x: -39, z: -48, y: 8, label: 'Façade' },
} as const;
export const CRANE = { x: 0, z: 5, radius: 16 };

export function initialState(): GameState {
  return { phase: 'brief', route: 'east', completed: [], craneActive: false, landed: false, battery: 100, encounters: 0, elapsed: 0 };
}
export function objectiveOrder(route: Route): ObjectiveId[] { return route === 'east' ? ['roof', 'facade'] : ['facade', 'roof']; }
export function withinObjective(x: number, y: number, z: number, id: ObjectiveId): boolean {
  const target = OBJECTIVES[id];
  return Math.hypot(x - target.x, z - target.z) < 7 && Math.abs(y - target.y) < 5;
}
export function withinPad(x: number, y: number, z: number): boolean {
  return Math.hypot(x - PAD.x, z - PAD.z) < 6 && y < 2.2;
}
export function withinCraneZone(x: number, z: number): boolean {
  return Math.hypot(x - CRANE.x, z - CRANE.z) < CRANE.radius;
}
export function canFinish(state: GameState): boolean { return state.completed.length === 2 && state.landed; }
export function score(state: GameState): number {
  if (!canFinish(state)) return 0;
  return Math.max(70, 100 - state.encounters * 10 - (state.battery < 15 ? 10 : 0));
}
