// PROVISIONAL fictional project data. Replace when validated M4.2 learning material exists.
export type ActivityId = 'roof' | 'envelope' | 'facade' | 'handoff';
export type StakeholderId = 'site' | 'design' | 'records';
export type Activity = {
  id: ActivityId;
  label: string;
  short: string;
  area: string;
  owner: StakeholderId;
  output: string;
  flight: boolean;
  storage: number;
  icon: string;
};

export const ACTIVITIES: Activity[] = [
  { id: 'roof', label: 'Roof baseline sweep', short: 'ROOF', area: 'Roof zone', owner: 'site', output: 'baseline frames', flight: true, storage: 2, icon: '⌁' },
  { id: 'envelope', label: 'Envelope progress map', short: 'MAP', area: 'North elevation', owner: 'design', output: 'mapped update', flight: true, storage: 2, icon: '◇' },
  { id: 'facade', label: 'Courtyard visual check', short: 'COURT', area: 'Courtyard', owner: 'design', output: 'progress frames', flight: true, storage: 2, icon: '◫' },
  { id: 'handoff', label: 'Controlled data handoff', short: 'DATA', area: 'Project office', owner: 'records', output: 'review package', flight: false, storage: 1, icon: '⇢' }
];

export const STAKEHOLDERS = [
  { id: 'site' as const, label: 'Site coordination', port: 'triangle' },
  { id: 'design' as const, label: 'Renovation design', port: 'circle' },
  { id: 'records' as const, label: 'Project records', port: 'square' }
];

export const INITIAL_PLACEMENTS: Record<ActivityId, number> = { roof: 1, envelope: 2, facade: 3, handoff: 4 };
export const INITIAL_ROUTES: Record<ActivityId, StakeholderId | null> = { roof: 'site', envelope: 'design', facade: 'design', handoff: null };
export const SCENARIO_CAPACITY = { flightKits: 1, crewUnits: 2, storageUnits: 6 };
export const CHANGE_EVENT = 'Courtyard access closes during Window 3 and reopens in Window 4.';
export const PROVISIONAL_NOTE = 'All capacities are fictional scenario values, not professional benchmarks.';
