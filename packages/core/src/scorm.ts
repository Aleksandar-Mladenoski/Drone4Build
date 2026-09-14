export interface ScormAPI {
  LMSInitialize(value: string): string;
  LMSFinish(value: string): string;
  LMSGetValue(key: string): string;
  LMSSetValue(key: string, value: string): string;
  LMSCommit(value: string): string;
  LMSGetLastError?(): string;
}

export type ScormSnapshot = {
  mode: 'lms' | 'mock';
  initialized: boolean;
  status: string;
  score: number;
  suspendData: string;
  sessionTime: string;
};

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Options = { api?: ScormAPI; storage?: Store; now?: () => number; attachExit?: boolean };

function findApi(start: Window | null): ScormAPI | undefined {
  let current = start;
  for (let i = 0; current && i < 12; i++) {
    try {
      const api = (current as Window & { API?: ScormAPI }).API;
      if (api) return api;
      if (current.parent === current) break;
      current = current.parent;
    } catch { break; }
  }
  return undefined;
}

export function formatSessionTime(milliseconds: number): string {
  const cs = Math.max(0, Math.floor(milliseconds / 10));
  const h = Math.floor(cs / 360000);
  const m = Math.floor(cs / 6000) % 60;
  const s = Math.floor(cs / 100) % 60;
  return `${String(h).padStart(4, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
}

export function createMockApi(gameId: string, storage?: Store): ScormAPI & { values: Record<string, string>; commits: number; finished: boolean } {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  const key = `d4b:mock:${gameId}`;
  let persisted: Record<string, string> = {};
  try { persisted = JSON.parse(store?.getItem(key) || '{}'); } catch { /* use empty mock */ }
  const mock = {
    values: persisted,
    commits: 0,
    finished: false,
    LMSInitialize: (_: string) => 'true',
    LMSFinish: (_: string) => { mock.finished = true; return 'true'; },
    LMSGetValue: (name: string) => mock.values[name] || '',
    LMSSetValue: (name: string, value: string) => { mock.values[name] = value; return 'true'; },
    LMSCommit: (_: string) => {
      mock.commits++;
      try { store?.setItem(key, JSON.stringify(mock.values)); } catch { /* storage may be disabled */ }
      return 'true';
    },
    LMSGetLastError: () => '0'
  };
  return mock;
}

export function createScorm(gameId: string, options: Options = {}) {
  const host = typeof window === 'undefined' ? null : window;
  const forceMock = host ? new URLSearchParams(host.location.search).get('scorm') === 'mock' : false;
  const found = forceMock ? undefined : (options.api ?? findApi(host) ?? (host?.opener ? findApi(host.opener) : undefined));
  let api = found ?? createMockApi(gameId, options.storage);
  let mode: 'lms' | 'mock' = found ? 'lms' : 'mock';
  const now = options.now ?? Date.now;
  const started = now();
  let initialized = false;
  try { initialized = api.LMSInitialize('') === 'true'; } catch { /* use local mock below */ }
  if (!initialized && found) {
    if (typeof console !== 'undefined') console.warn('[Drone4Build SCORM] LMS initialization failed; using local mock.');
    api = createMockApi(gameId, options.storage); mode = 'mock';
    initialized = api.LMSInitialize('') === 'true';
  }
  let finished = false;
  if (initialized) {
    try {
      const status = api.LMSGetValue('cmi.core.lesson_status');
      if (!['passed', 'completed', 'incomplete'].includes(status)) {
        api.LMSSetValue('cmi.core.lesson_status', 'incomplete');
        api.LMSCommit('');
      }
    } catch { if (typeof console !== 'undefined') console.warn('[Drone4Build SCORM] LMS status could not be read.'); }
  }
  const get = (key: string) => { try { return initialized ? api.LMSGetValue(key) : ''; } catch { return ''; } };
  const set = (key: string, value: string) => { try { return initialized && api.LMSSetValue(key, value) === 'true'; } catch { return false; } };
  const commit = () => { try { return initialized && api.LMSCommit('') === 'true'; } catch { return false; } };
  const session = () => set('cmi.core.session_time', formatSessionTime(now() - started));
  function save(state: unknown) {
    const payload = state == null ? '' : JSON.stringify({ v: 1, id: gameId, state });
    if (payload.length > 4096) throw new Error('SCORM suspend_data exceeds 4096 characters');
    set('cmi.suspend_data', payload);
    session(); commit();
  }
  function load<T>(): T | null {
    try {
      const data = JSON.parse(get('cmi.suspend_data'));
      return data?.v === 1 && data.id === gameId ? data.state as T : null;
    } catch { return null; }
  }
  function complete(score: number, passed: boolean) {
    if (!initialized) return;
    const result = Math.round(Math.max(0, Math.min(100, score)));
    const oldScore = Number(get('cmi.core.score.raw')) || 0;
    const oldStatus = get('cmi.core.lesson_status');
    const preservePass = oldStatus === 'passed' && (!passed || oldScore >= result);
    if (!preservePass) {
      set('cmi.core.score.raw', String(result));
      set('cmi.core.score.min', '0');
      set('cmi.core.score.max', '100');
      set('cmi.core.lesson_status', passed ? 'passed' : 'failed');
    }
    session(); commit();
  }
  function snapshot(): ScormSnapshot {
    return { mode, initialized, status: get('cmi.core.lesson_status'), score: Number(get('cmi.core.score.raw')) || 0,
      suspendData: get('cmi.suspend_data'), sessionTime: get('cmi.core.session_time') };
  }
  function finish() {
    if (!initialized || finished) return;
    session();
    set('cmi.core.exit', get('cmi.core.lesson_status') === 'incomplete' ? 'suspend' : '');
    commit(); try { api.LMSFinish(''); } catch { /* page exit is best effort */ }
    finished = true; initialized = false;
  }
  if (host && options.attachExit !== false) host.addEventListener('pagehide', finish, { once: true });
  return { load, save, complete, finish, snapshot, commit, get, set, mode, api };
}
