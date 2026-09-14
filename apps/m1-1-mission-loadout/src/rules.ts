export const platforms = ['multirotor', 'fixedWing'] as const;
export type Platform = typeof platforms[number];
export const sensors = ['rgb', 'thermal'] as const;
export type Sensor = typeof sensors[number];
export type Part = `platform:${Platform}` | `sensor:${Sensor}` | 'battery:charged';

export interface Build {
  platform: Platform | null;
  sensor: Sensor | null;
  battery: 'low' | 'charged';
  angle: number;
  tests: number;
  lastTest: TestOutcome | null;
}

export interface TestOutcome {
  hover: boolean;
  visual: boolean;
  sustained: boolean;
  success: boolean;
}

export function newBuild(): Build {
  // The deliberately unsuitable pre-build gives the learner something tangible to diagnose.
  return { platform: 'fixedWing', sensor: 'thermal', battery: 'low', angle: -18, tests: 0, lastTest: null };
}

export function mount(build: Build, part: Part): Build {
  if (part.startsWith('platform:')) return { ...build, platform: part.slice(9) as Platform, lastTest: null };
  if (part.startsWith('sensor:')) return { ...build, sensor: part.slice(7) as Sensor, lastTest: null };
  return { ...build, battery: 'charged', lastTest: null };
}

export function removeSensor(build: Build): Build {
  return { ...build, sensor: null, lastTest: null };
}

export function testOutcome(build: Build): TestOutcome {
  const hover = build.platform === 'multirotor';
  const visual = build.sensor === 'rgb';
  const sustained = build.battery === 'charged';
  return { hover, visual, sustained, success: hover && visual && sustained };
}

export function recordTest(build: Build): Build {
  return { ...build, tests: build.tests + 1, lastTest: testOutcome(build) };
}
