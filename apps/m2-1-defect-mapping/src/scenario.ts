// PROVISIONAL scenario data. Replace this module when validated M2.1 learning material exists.
export type Zone = {
  id: string;
  row: number;
  col: number;
  area: 'roofline' | 'upper facade' | 'lower facade';
  label: string;
  feature?: 'parapet return' | 'recess edge' | 'service base';
};

const labels = [
  'West parapet', 'Parapet return', 'Roof access edge', 'East parapet', 'Upper corner', 'Upper return',
  'West window band', 'Upper render', 'Central recess', 'Recess edge', 'East window band', 'Service junction',
  'West plinth', 'Lower render', 'Entrance edge', 'Lower recess', 'Service base', 'East plinth'
];

export const ZONES: Zone[] = labels.map((label, index) => ({
  id: `z${index + 1}`,
  row: Math.floor(index / 6),
  col: index % 6,
  area: index < 6 ? 'roofline' : index < 12 ? 'upper facade' : 'lower facade',
  label,
  feature: index === 1 ? 'parapet return' : index === 9 ? 'recess edge' : index === 16 ? 'service base' : undefined
}));

export const CAPTURE_CAPACITY = 6;
export const PASS_COVERAGE = 0.78;
export const PROVISIONAL_NOTE = 'Fictional review scenario · qualitative values only';
