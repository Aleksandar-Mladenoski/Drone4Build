export type Payload = 'rgb' | 'thermal';
export type Battery = 'low' | 'charged';
export type ComponentId = Payload | `battery-${Battery}`;
export type MountType = 'payload' | 'battery';

export interface TestOutcome {
  hover: boolean;
  visual: boolean;
  sustained: boolean;
  success: boolean;
}

export interface Build {
  version: 3;
  platform: 'multirotor';
  payload: Payload | null;
  battery: Battery | null;
  tests: number;
  swaps: number;
  lastTest: TestOutcome | null;
}

export function newBuild(): Build {
  return { version: 3, platform: 'multirotor', payload: 'thermal', battery: 'low', tests: 0, swaps: 0, lastTest: null };
}

export function componentMount(component: ComponentId): MountType {
  return component.startsWith('battery-') ? 'battery' : 'payload';
}

export function compatible(component: ComponentId, mount: MountType): boolean {
  return componentMount(component) === mount;
}

export function attach(build: Build, component: ComponentId): Build {
  if (componentMount(component) === 'payload') {
    return { ...build, payload: component as Payload, swaps: build.swaps + 1, lastTest: null };
  }
  return { ...build, battery: component.slice(8) as Battery, swaps: build.swaps + 1, lastTest: null };
}

export function detach(build: Build, mount: MountType): Build {
  return mount === 'payload'
    ? { ...build, payload: null, swaps: build.swaps + 1, lastTest: null }
    : { ...build, battery: null, swaps: build.swaps + 1, lastTest: null };
}

export function testOutcome(build: Build): TestOutcome {
  const hover = build.platform === 'multirotor';
  const visual = build.payload === 'rgb';
  const sustained = build.battery === 'charged';
  return { hover, visual, sustained, success: hover && visual && sustained };
}

export function recordTest(build: Build): Build {
  return { ...build, tests: build.tests + 1, lastTest: testOutcome(build) };
}

export function restoreBuild(value: unknown): Build | null {
  if (!value || typeof value !== 'object') return null;
  const state = value as Partial<Build>;
  if (state.version !== 3 || state.platform !== 'multirotor') return null;
  if (![null, 'rgb', 'thermal'].includes(state.payload ?? null)) return null;
  if (![null, 'low', 'charged'].includes(state.battery ?? null)) return null;
  if (!Number.isInteger(state.tests) || (state.tests ?? -1) < 0) return null;
  if (!Number.isInteger(state.swaps) || (state.swaps ?? -1) < 0) return null;
  if (state.lastTest !== null && state.lastTest !== undefined) {
    const result = state.lastTest;
    if (typeof result !== 'object' || !['hover', 'visual', 'sustained', 'success']
      .every(key => typeof (result as unknown as Record<string, unknown>)[key] === 'boolean')) return null;
  }
  return state as Build;
}
