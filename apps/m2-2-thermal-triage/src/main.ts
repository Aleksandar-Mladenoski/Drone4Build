import '../../../packages/core/src/ui.css';
import './style.css';
import { createScorm } from '../../../packages/core/src/scorm.ts';
import { createTranslator } from '../../../packages/core/src/locale.ts';
import en from '../locales/en.json';
import {
  CASE_IDS, OBSERVATIONS, REASON_IDS,
  advance, assessCase, assessPriority, newGame, passed, restoreGame, score,
  type CaseId, type Field, type GameState, type PriorityField, type ReasonId,
  type StatusId, type ValidationId
} from './rules.ts';

const { t, locale } = createTranslator(en);
const scorm = createScorm('m2-2-thermal-triage');
let state: GameState = restoreGame(scorm.load<GameState>()) ?? newGame();
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing game mount');
document.documentElement.lang = locale;
document.title = t('app.title');

type Feedback = { kind: 'missing' | 'wrong' | 'correct'; fields?: (Field | PriorityField)[] } | null;
let feedback: Feedback = null;

function h(value: string | number): string {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function save(): void { scorm.save(state); }

function header(): string {
  const fraction = state.phase === 'intro' ? 0 : state.phase === 'case' ? state.index + 1 : 5;
  const snapshot = scorm.snapshot();
  return `<header class="app-header">
    <div class="brand"><span class="brand-mark" aria-hidden="true">◈</span><div><div class="eyebrow">${h(t('app.course'))}</div><div class="brand-title">${h(t('app.title'))}</div></div></div>
    <div class="header-meta"><span class="connection">${h(t(snapshot.mode === 'mock' ? 'app.mock' : 'app.lms'))}</span><span>${h(t('app.score', { score: score(state) }))}</span></div>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${fraction}" aria-label="${h(t('app.progress', { current: Math.min(fraction, 4), total: 4 }))}"><span style="width:${fraction * 20}%"></span></div>
  </header>`;
}

function intro(): string {
  return `<main class="intro-layout">
    <section class="intro-copy panel"><p class="eyebrow">${h(t('intro.eyebrow'))}</p><h1>${h(t('intro.title'))}</h1><p>${h(t('intro.body'))}</p><div class="goal-callout">${h(t('intro.goal'))}</div><div class="actions"><button class="btn-primary" data-action="start">${h(t('intro.start'))} <span aria-hidden="true">→</span></button></div></section>
    <aside class="intro-visual panel"><div class="folio-stack" aria-hidden="true"><div class="folio folio-4"></div><div class="folio folio-3"></div><div class="folio folio-2"></div><div class="folio folio-1"><span>${h(t('intro.folioTop'))}</span><strong>04</strong><span>${h(t('intro.folioBottom'))}</span></div></div><p>${h(t('intro.note'))}</p></aside>
  </main>`;
}

function focusButtons(id: CaseId): string {
  const observation = OBSERVATIONS.find(item => item.id === id)!;
  const selected = state.cases[id].selected.focus;
  return observation.focus.map((focus, index) => `<button type="button" class="hotspot hotspot-${h(focus)} ${selected === focus ? 'selected' : ''}" data-action="focus" data-value="${h(focus)}" aria-pressed="${selected === focus}" aria-label="${h(t(`case.${id}.focus.${focus}`))}" ${state.cases[id].solved ? 'disabled' : ''}><span class="hotspot-label">${index + 1} · ${h(t(`case.${id}.focus.${focus}`))}</span></button>`).join('');
}

function choices<T extends string>(ids: readonly T[], prefix: string, action: string, selected: string | null): string {
  return ids.map(id => `<button type="button" class="choice choice-card ${selected === id ? 'selected' : ''}" aria-pressed="${selected === id}" data-action="${h(action)}" data-value="${h(id)}"><span class="choice-check" aria-hidden="true">${selected === id ? '✓' : '○'}</span><span>${h(t(`${prefix}.${id}`))}</span></button>`).join('');
}

function caseFeedback(): string {
  if (!feedback) return '';
  const id = CASE_IDS[state.index];
  if (feedback.kind === 'missing') return `<div class="feedback" role="status">${h(t('case.missing'))}</div>`;
  if (feedback.kind === 'correct') return `<div class="feedback good" role="status"><strong>${h(t('case.ready'))}</strong><p>${h(t(`case.${id}.feedback`))}</p></div>`;
  return `<div class="feedback" role="status"><strong>${h(t('case.wrong'))}</strong><p>${h(t(`case.${id}.hint`))}</p><ul>${(feedback.fields ?? []).map(field => `<li>${h(t(`case.feedback.${field}`))}</li>`).join('')}</ul></div>`;
}

function caseView(): string {
  const id = CASE_IDS[state.index];
  const observation = OBSERVATIONS[state.index];
  const progress = state.cases[id];
  const n = state.index + 1;
  return `<main class="case-layout">
    <div class="case-heading"><div><p class="eyebrow">${h(t('case.eyebrow'))} / ${h(t('app.progress', { current: n, total: 4 }))}</p><h1>${h(t(`case.${id}.title`))}</h1><p class="muted">${h(t(`case.${id}.summary`))}</p></div><div class="case-number" aria-hidden="true">0${n}</div></div>
    <section class="evidence-grid" aria-label="${h(t('case.eyebrow'))}">
      <div class="image-card thermal-card"><div class="image-header"><span class="image-symbol" aria-hidden="true">◐</span>${h(t('case.thermal'))}</div><div class="image-stage stage-${h(id)}"><img src="./assets/${h(id)}-thermal.svg" alt="${h(t('case.thermalAlt', { number: n, description: t(`case.${id}.altThermal`) }))}" />${focusButtons(id)}</div><p>${h(t(`case.${id}.thermal`))}</p></div>
      <div class="image-card"><div class="image-header"><span class="image-symbol" aria-hidden="true">▧</span>${h(t('case.rgb'))}</div><div class="image-stage"><img src="./assets/${h(id)}-rgb.svg" alt="${h(t('case.rgbAlt', { number: n, description: t(`case.${id}.altRgb`) }))}" /></div><p>${h(t(`case.${id}.visual`))}</p></div>
    </section>
    <div class="desk-layout"><section class="evidence-notes panel"><p class="eyebrow">${h(t('app.subtitle'))}</p><dl><div><dt>${h(t('case.note.thermal'))}</dt><dd>${h(t(`case.${id}.thermal`))}</dd></div><div><dt>${h(t('case.note.visual'))}</dt><dd>${h(t(`case.${id}.visual`))}</dd></div><div><dt>${h(t('case.note.survey'))}</dt><dd>${h(t(`case.${id}.survey`))}</dd></div></dl><div class="legend"><span aria-hidden="true" class="thermal-gradient"></span>${h(t('app.legend'))}</div></section>
      <section class="judgement panel"><h2>${h(t('case.mark'))}</h2><p class="muted compact">${progress.selected.focus ? h(t(`case.${id}.focus.${progress.selected.focus}`)) : '—'}</p><h2>${h(t('case.classify'))}</h2><div class="choice-grid">${choices(observation.statusChoices, 'case.status', 'status', progress.selected.status)}</div><h2>${h(t('case.validate'))}</h2><div class="choice-grid">${choices(observation.validationChoices, 'case.validation', 'validation', progress.selected.validation)}</div>${caseFeedback()}<div class="actions">${progress.solved ? `<button class="btn-primary" data-action="next">${h(t(state.index === 3 ? 'case.toPriority' : 'case.next'))} <span aria-hidden="true">→</span></button>` : `<button class="btn-primary" data-action="submit-case">${h(t('case.submit'))}</button>`}</div></section></div>
  </main>`;
}

function priorityFeedback(): string {
  if (!feedback) return '';
  if (feedback.kind === 'missing') return `<div class="feedback" role="status">${h(t('priority.missing'))}</div>`;
  if (feedback.kind === 'wrong') return `<div class="feedback" role="status"><strong>${h(t('priority.wrong'))}</strong><ul>${(feedback.fields ?? []).map(field => `<li>${h(t(`priority.feedback.${field}`))}</li>`).join('')}</ul></div>`;
  return '';
}

function priority(): string {
  return `<main class="priority-layout"><div class="case-heading"><div><p class="eyebrow">${h(t('priority.eyebrow'))}</p><h1>${h(t('priority.title'))}</h1><p class="muted">${h(t('priority.body'))}</p></div><div class="case-number" aria-hidden="true">05</div></div>
    <section class="priority-board panel"><h2>${h(t('priority.choose'))}</h2><div class="priority-cases">${CASE_IDS.map(id => `<button type="button" class="priority-card choice ${state.priority.selected.case === id ? 'selected' : ''}" data-action="priority-case" data-value="${id}" aria-pressed="${state.priority.selected.case === id}"><img src="./assets/${id}-thermal.svg" alt="" /><span>${h(t(`case.${id}.title`))}</span><small>${h(t(`case.${id}.summary`))}</small></button>`).join('')}</div><h2>${h(t('priority.reason'))}</h2><div class="reason-grid">${choices(REASON_IDS, 'priority.reason', 'priority-reason', state.priority.selected.reason)}</div>${priorityFeedback()}<div class="actions"><button class="btn-primary" data-action="submit-priority">${h(t('priority.submit'))}</button></div></section>
  </main>`;
}

function result(): string {
  const success = passed(state);
  const snapshot = scorm.snapshot();
  return `<main class="result-layout"><section class="result-card panel"><p class="eyebrow">${h(t('result.eyebrow'))}</p><div class="result-mark" aria-hidden="true">${success ? '✓' : '↻'}</div><h1>${h(t(success ? 'result.passed' : 'result.failed'))}</h1><p class="result-score">${h(t('result.score', { score: score(state) }))}</p><p>${h(t(success ? 'result.passDetail' : 'result.failDetail'))}</p><div class="takeaway">${h(t('result.takeaway'))}</div><p class="muted">${h(t('result.status', { status: t(`app.status.${snapshot.status}`) }))}</p><div class="actions"><button class="btn-primary" data-action="replay">${h(t('result.replay'))}</button><button data-action="finish">${h(t('result.exit'))}</button></div></section></main>`;
}

function render(focusSelector?: string): void {
  app!.innerHTML = `<div class="thermal-app shell">${header()}${state.phase === 'intro' ? intro() : state.phase === 'case' ? caseView() : state.phase === 'priority' ? priority() : result()}</div>`;
  if (focusSelector) app!.querySelector<HTMLElement>(focusSelector)?.focus();
}

app.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const value = button.dataset.value;
  feedback = null;
  if (action === 'start') {
    state.phase = 'case'; save(); render('[data-action="focus"]'); return;
  }
  if (state.phase === 'case') {
    const progress = state.cases[CASE_IDS[state.index]];
    if (action === 'focus' && value && !progress.solved) progress.selected.focus = value;
    else if (action === 'status' && value && !progress.solved) progress.selected.status = value as StatusId;
    else if (action === 'validation' && value && !progress.solved) progress.selected.validation = value as ValidationId;
    else if (action === 'submit-case') {
      const assessment = assessCase(state);
      feedback = { kind: assessment.missing.length ? 'missing' : assessment.wrong.length ? 'wrong' : 'correct', fields: assessment.wrong };
    } else if (action === 'next') {
      advance(state);
    } else return;
    save(); render(action === 'next' ? undefined : action === 'submit-case' && progress.solved ? '[data-action="next"]' : `[data-action="${action}"]${value ? `[data-value="${value}"]` : ''}`); return;
  }
  if (state.phase === 'priority') {
    if (action === 'priority-case' && value) state.priority.selected.case = value as CaseId;
    else if (action === 'priority-reason' && value) state.priority.selected.reason = value as ReasonId;
    else if (action === 'submit-priority') {
      const assessment = assessPriority(state);
      if (assessment.solved) scorm.complete(score(state), passed(state));
      else feedback = { kind: assessment.missing.length ? 'missing' : 'wrong', fields: assessment.wrong };
    } else return;
    save(); render(state.priority.solved ? undefined : `[data-action="${action}"]${value ? `[data-value="${value}"]` : ''}`); return;
  }
  if (state.phase === 'result' && action === 'replay') {
    state = newGame();
    if (scorm.snapshot().status !== 'passed') { scorm.set('cmi.core.lesson_status', 'incomplete'); scorm.commit(); }
    save(); render('[data-action="start"]'); return;
  }
  if (state.phase === 'result' && action === 'finish') { scorm.finish(); button.disabled = true; }
});

render();
