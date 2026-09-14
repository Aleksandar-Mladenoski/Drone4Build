import '../../../packages/core/src/ui.css';
import { createScorm } from '../../../packages/core/src/scorm.ts';
import { createTranslator } from '../../../packages/core/src/locale.ts';
import en from '../locales/en.json';
import { checks, decide, evaluate, missionIds, missions, newRound, passed, platforms, roundScore, sensors, totalScore, type Check, type MissionId, type Platform, type RoundState, type Sensor } from './rules.ts';
import './style.css';

type Phase = 'intro' | 'active' | 'between' | 'results';
type Notice = { key: string; issues: ('platform' | 'sensor' | 'readiness')[]; good: boolean } | null;
type AppState = { phase: Phase; missionIndex: number; rounds: RoundState[]; notice: Notice };

const scorm = createScorm('m1-1-mission-loadout');
const translator = createTranslator(en);
const t = translator.t;
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root unavailable');
document.title = `Drone4Build · ${t('title')}`;
document.documentElement.lang = translator.locale === 'en' ? 'en' : translator.locale;

function freshState(): AppState {
  return { phase: 'intro', missionIndex: 0, rounds: missions.map(() => newRound()), notice: null };
}

function validState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<AppState>;
  if (!['intro', 'active', 'between', 'results'].includes(state.phase || '')) return false;
  if (typeof state.missionIndex !== 'number' || !Number.isInteger(state.missionIndex) || state.missionIndex < 0 || state.missionIndex > 2) return false;
  if (!Array.isArray(state.rounds) || state.rounds.length !== missions.length) return false;
  if (state.notice !== null && state.notice !== undefined && (typeof state.notice !== 'object' || typeof state.notice.key !== 'string' || !Array.isArray(state.notice.issues) || typeof state.notice.good !== 'boolean')) return false;
  return state.rounds.every((round) => round && typeof round === 'object' &&
    (round.platform === null || platforms.includes(round.platform)) &&
    (round.sensor === null || sensors.includes(round.sensor)) &&
    checks.every((check) => typeof round.inspected?.[check] === 'boolean' && typeof round.resolved?.[check] === 'boolean') &&
    ['hold', 'clear', null].includes(round.firstDecision) &&
    ['platform', 'sensor', 'readiness', 'judgement'].every((key) => typeof round.penalties?.[key as keyof RoundState['penalties']] === 'boolean') &&
    typeof round.cleared === 'boolean');
}

const saved = scorm.load<unknown>();
let state = validState(saved) ? saved : freshState();

function persist() { scorm.save(state); }

function esc(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
function tx(key: string, values?: Record<string, string | number>) { return esc(t(key, values)); }

const icons: Record<Platform | Sensor, string> = {
  multirotor: '<circle cx="30" cy="22" r="5"/><circle cx="70" cy="22" r="5"/><circle cx="30" cy="58" r="5"/><circle cx="70" cy="58" r="5"/><path d="M50 40 30 22m20 18 20-18M50 40 30 58m20-18 20 18"/><rect x="42" y="34" width="16" height="12" rx="4"/>',
  fixedWing: '<path d="M50 12v56M46 34 14 47v8l36-8 36 8v-8L54 34M39 62l11-5 11 5"/>',
  vtol: '<circle cx="20" cy="18" r="5"/><circle cx="80" cy="18" r="5"/><circle cx="20" cy="62" r="5"/><circle cx="80" cy="62" r="5"/><path d="m20 18 30 15 30-15M20 62l30-15 30 15M50 14v52M36 40h28"/>',
  rgb: '<rect x="18" y="21" width="64" height="42" rx="6"/><circle cx="50" cy="42" r="13"/><path d="m28 21 5-8h34l5 8M34 70h32"/>',
  thermal: '<rect x="17" y="17" width="66" height="48" rx="5"/><path d="M30 56c-5-8 5-10 1-19s11-10 10-18M49 58c-4-8 7-11 2-20s12-9 10-18M67 57c-5-7 6-11 2-19"/>',
  lidar: '<path d="m50 10 30 18v35L50 80 20 63V28zM20 28l30 18 30-18M50 46v34M32 39l30-18M38 60l8-5m14 2 8-5"/>',
};
function icon(id: Platform | Sensor) {
  return `<svg class="equipment-icon" viewBox="0 0 100 90" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[id]}</svg>`;
}

function header() {
  const snap = scorm.snapshot();
  const statusKey = ['incomplete', 'passed', 'failed', 'completed'].includes(snap.status) ? snap.status : 'incomplete';
  return `<header class="app-header"><div class="brand"><span class="brand-mark" aria-hidden="true">D<span>4</span>B</span><div><div class="eyebrow">${tx('course')}</div><div class="brand-title">${tx('title')} <span>${tx('subtitle')}</span></div></div></div><div class="lms-pill"><span class="status-dot" aria-hidden="true"></span><div>${tx(`status.${snap.mode}`)}<small>${tx('status.score', { status: t(`status.${statusKey}`), score: snap.score })}</small></div></div></header>`;
}

function intro() {
  return `<div class="intro-layout"><section class="panel intro-card"><div class="eyebrow">${tx('course')}</div><h1>${tx('intro.heading')}</h1><p class="intro-copy">${tx('intro.body')}</p><div class="intro-goal"><span class="goal-symbol" aria-hidden="true">◎</span><div><strong>${tx('intro.goal')}</strong><span>${tx('intro.time')}</span></div></div><button class="btn-primary launch" data-action="start">${tx('intro.start')} <span aria-hidden="true">→</span></button></section><div class="intro-art" aria-hidden="true"><div class="blueprint-grid"></div><div class="art-drone">${icon('multirotor')}</div><div class="art-ring ring-one"></div><div class="art-ring ring-two"></div><div class="art-label label-a">01</div><div class="art-label label-b">02</div><div class="art-label label-c">03</div></div></div>`;
}

function equipmentCard(kind: 'platform' | 'sensor', id: Platform | Sensor, selected: boolean) {
  const label = `${kind}.${id}`;
  return `<button type="button" class="equipment-card choice" data-action="${kind}" data-id="${id}" aria-pressed="${selected}" aria-label="${tx(label)}: ${tx(`${kind}.${id}.detail`)}"><span class="equipment-visual">${icon(id)}</span><span class="equipment-name">${tx(label)}</span><span class="equipment-detail">${tx(`${kind}.${id}.detail`)}</span><span class="selection-indicator" aria-hidden="true">${selected ? '✓' : '+'}</span></button>`;
}

function readinessCard(check: Check, ruleId: MissionId, round: RoundState) {
  const inspected = round.inspected[check];
  const blocker = missions.find((mission) => mission.id === ruleId)!.blocker === check;
  const resolved = round.resolved[check];
  const stateClass = !inspected ? 'unknown' : blocker && !resolved ? 'issue' : 'ready';
  const status = !inspected ? tx('check.unknown') : blocker ? resolved ? tx('check.resolved') : tx(`check.issue.${ruleId}`) : tx('check.ready');
  return `<div class="readiness-card ${stateClass}"><div class="readiness-head"><span class="indicator" aria-hidden="true"></span><strong>${tx(`check.${check}`)}</strong><span class="readiness-state">${status}</span></div><div class="readiness-actions">${!inspected ? `<button type="button" data-action="inspect" data-id="${check}">${tx('check.inspect', { item: t(`check.${check}`) })}</button>` : blocker && !resolved ? `<button type="button" class="resolve" data-action="resolve" data-id="${check}">${tx(`check.action.${check}`)}</button><button type="button" class="secondary" data-action="ignore" data-id="${check}">${tx('check.markReady')}</button>` : ''}</div></div>`;
}

function notice() {
  if (!state.notice) return '';
  return `<div class="feedback ${state.notice.good ? 'good' : ''}" role="status" aria-label="${tx('a11y.feedback')}"><strong>${tx(state.notice.key)}</strong>${state.notice.issues.length ? `<ul>${state.notice.issues.map((issue) => `<li>${tx(`feedback.issue.${issue}`)}</li>`).join('')}</ul>` : ''}</div>`;
}

function missionView() {
  const rule = missions[state.missionIndex];
  const round = state.rounds[state.missionIndex];
  const between = state.phase === 'between';
  const progress = (state.missionIndex + (between ? 1 : 0)) / missions.length * 100;
  return `<div class="mission-layout"><div class="mission-top"><div><span class="eyebrow">${tx('progress.round', { current: state.missionIndex + 1, total: missions.length })}</span><h1>${tx(`mission.${rule.id}.title`)}</h1></div><div class="score-chip">${tx('progress.score', { score: state.rounds.slice(0, state.missionIndex + (between ? 1 : 0)).reduce((sum, item) => sum + roundScore(item), 0) })}</div></div><div class="progress" role="progressbar" aria-label="${tx('a11y.progress')}" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${state.missionIndex + (between ? 1 : 0)}"><span style="width:${progress}%"></span></div><div class="mission-grid"><aside class="mission-card panel"><div class="mission-index">${tx(`mission.${rule.id}.label`)}</div><div class="mission-illustration mission-${rule.id}" aria-hidden="true"><div class="building b1"></div><div class="building b2"></div><div class="survey-line"></div></div><h2>${tx(`mission.${rule.id}.title`)}</h2><p>${tx(`mission.${rule.id}.brief`)}</p><div class="requirement">${tx(`mission.${rule.id}.requirement`)}</div></aside><main class="bay panel"><div class="bay-heading"><div><div class="eyebrow">${tx('bay.title')}</div><h2>${tx('bay.platform')}</h2></div><span class="bay-number">01</span></div><div class="equipment-rack" role="group" aria-label="${tx('bay.platform')}">${platforms.map((id) => equipmentCard('platform', id, round.platform === id)).join('')}</div><div class="bay-heading"><h2>${tx('bay.sensor')}</h2><span class="bay-number">02</span></div><div class="equipment-rack" role="group" aria-label="${tx('bay.sensor')}">${sensors.map((id) => equipmentCard('sensor', id, round.sensor === id)).join('')}</div><p class="bay-note">${tx('bay.selectHint')}</p><div class="bay-heading readiness-heading"><h2>${tx('bay.readiness')}</h2><span class="bay-number">03</span></div><p class="bay-note">${tx('bay.inspectHint')}</p><div class="readiness-grid">${checks.map((check) => readinessCard(check, rule.id, round)).join('')}</div><div class="positioning-note">${tx('bay.positioning')}</div>${notice()}${between ? `<div class="actions"><button type="button" class="btn-primary" data-action="next">${tx(state.missionIndex === missions.length - 1 ? 'feedback.results' : 'feedback.next')} <span aria-hidden="true">→</span></button></div>` : `<div class="decision-bar"><div><div class="eyebrow">${tx('bay.decision')}</div><p>${tx('decision.help')}</p></div><div class="actions"><button type="button" data-action="hold">${tx('decision.hold')}</button><button type="button" class="btn-primary" data-action="clear">${tx('decision.clear')}</button></div></div>`}</main></div></div>`;
}

function results() {
  const score = totalScore(state.rounds);
  const success = passed(state.rounds);
  return `<section class="results panel"><div class="eyebrow">${tx('results.heading')}</div><div class="result-medallion ${success ? 'pass' : 'fail'}" aria-hidden="true">${success ? '✓' : '↺'}</div><h1 tabindex="-1">${tx(success ? 'results.pass' : 'results.fail')}</h1><div class="final-score">${tx('results.score', { score })}</div><div class="threshold">${tx('results.threshold')}</div><p>${tx('results.explanation')}</p><div class="mission-breakdown">${missions.map((mission, index) => `<div><span>${tx(`mission.${mission.id}.label`)}</span><strong>${tx('results.points', { score: roundScore(state.rounds[index]) })}</strong></div>`).join('')}</div><p class="muted">${tx('results.saved')}</p><button type="button" class="btn-primary" data-action="replay">${tx('results.replay')}</button></section>`;
}

function render(focus?: { action: string; id?: string }) {
  app!.innerHTML = `<div class="shell">${header()}${state.phase === 'intro' ? intro() : state.phase === 'results' ? results() : missionView()}</div>`;
  if (focus) {
    const selector = focus.id ? `[data-action="${focus.action}"][data-id="${focus.id}"]` : `[data-action="${focus.action}"]`;
    app!.querySelector<HTMLElement>(selector)?.focus();
  }
}

function focusReadinessNext() {
  app?.querySelector<HTMLElement>('[data-action="resolve"], [data-action="inspect"], [data-action="clear"]')?.focus();
}

app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if (!button) return;
  const action = button.dataset.action || '';
  const id = button.dataset.id || '';
  if (action === 'start' || action === 'replay') {
    state = freshState();
    state.phase = 'active';
    persist(); render({ action: 'platform', id: platforms[0] });
    return;
  }
  if (action === 'next' && state.phase === 'between') {
    if (state.missionIndex === missions.length - 1) state.phase = 'results';
    else { state.missionIndex++; state.phase = 'active'; }
    state.notice = null;
    persist();
    if (state.phase === 'results') scorm.complete(totalScore(state.rounds), passed(state.rounds));
    render();
    if (state.phase === 'results') app?.querySelector<HTMLElement>('h1')?.focus();
    return;
  }
  if (state.phase !== 'active') return;
  const rule = missions[state.missionIndex];
  const round = state.rounds[state.missionIndex];
  if (action === 'platform' && platforms.includes(id as Platform)) {
    round.platform = id as Platform;
    state.notice = null;
    persist(); render({ action, id });
  } else if (action === 'sensor' && sensors.includes(id as Sensor)) {
    round.sensor = id as Sensor;
    state.notice = null;
    persist(); render({ action, id });
  } else if (action === 'inspect' && checks.includes(id as Check)) {
    round.inspected[id as Check] = true;
    state.notice = null;
    persist(); render();
    focusReadinessNext();
  } else if (action === 'resolve' && id === rule.blocker && round.inspected[id as Check]) {
    round.resolved[id as Check] = true;
    state.notice = null;
    persist(); render();
    focusReadinessNext();
  } else if (action === 'ignore' && id === rule.blocker && round.inspected[id as Check]) {
    round.penalties.readiness = true;
    state.notice = { key: 'feedback.ignored', issues: ['readiness'], good: false };
    persist(); render({ action, id });
  } else if (action === 'hold' || action === 'clear') {
    const outcome = decide(rule, round, action);
    state.rounds[state.missionIndex] = outcome.round;
    const issues = outcome.evaluation.issues;
    state.notice = { key: `feedback.${outcome.outcome}`, issues: outcome.outcome === 'incomplete' || outcome.outcome === 'cleared' ? [] : issues, good: outcome.outcome === 'held' || outcome.outcome === 'cleared' };
    if (outcome.outcome === 'cleared') state.phase = 'between';
    persist(); render(outcome.outcome === 'cleared' ? { action: 'next' } : { action });
  }
});

render();
