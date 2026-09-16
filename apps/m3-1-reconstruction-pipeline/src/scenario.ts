// PROVISIONAL synthetic dataset. Replace with validated M3.1 examples when developed content exists.
export type ImageSample = { id: string; label: string; strip: 'west' | 'centre' | 'east'; quality: 'clear' | 'soft'; pattern: number };

export const IMAGES: ImageSample[] = [
  { id: 'west-high', label: 'West high', strip: 'west', quality: 'clear', pattern: 1 },
  { id: 'west-low', label: 'West low', strip: 'west', quality: 'clear', pattern: 2 },
  { id: 'centre-high', label: 'Centre high', strip: 'centre', quality: 'clear', pattern: 3 },
  { id: 'centre-low', label: 'Centre low', strip: 'centre', quality: 'clear', pattern: 4 },
  { id: 'east-high', label: 'East high', strip: 'east', quality: 'clear', pattern: 5 },
  { id: 'soft-east', label: 'Soft east duplicate', strip: 'east', quality: 'soft', pattern: 6 },
  { id: 'east-return', label: 'East return view', strip: 'east', quality: 'clear', pattern: 7 }
];

export const STATIONS = [
  { x: 112, y: 92, angle: 18 }, { x: 120, y: 225, angle: 10 },
  { x: 290, y: 74, angle: 4 }, { x: 300, y: 236, angle: -3 },
  { x: 468, y: 88, angle: -13 }, { x: 486, y: 224, angle: -18 }
];

export const INITIAL_ASSIGNMENTS = ['west-high', 'west-low', 'centre-high', 'centre-low', 'east-high', 'soft-east'];
export const INITIAL_HELD = 'east-return';
export const PROVISIONAL_NOTE = 'Deterministic synthetic processing · no real photogrammetry thresholds';
