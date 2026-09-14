import '../../../packages/core/src/ui.css';
import './style.css';
import en from '../locales/en.json';
import { createScorm } from '../../../packages/core/src/scorm';
import { createTranslator } from '../../../packages/core/src/locale';
import { GATES, initialState, passed, restore, score, select, start, submit, type Gate, type GameState } from './rules';

const dictionaries = Object.fromEntries(
  Object.entries(import.meta.glob<Record<string, string>>('../locales/*.json', { eager: true, import: 'default' }))
    .map(([path, messages]) => [path.match(/\/([^/]+)\.json$/)?.[1] ?? 'en', messages]),
);
const { t, locale } = createTranslator(en, dictionaries);
const scorm = createScorm('m3-2-digital-handover');
const app = document.querySelector<HTMLDivElement>('#app')!;
if (!app) throw new Error('Missing app root');
document.documentElement.lang = locale;
document.title = `Drone4Build — ${t('app.title')}`;

let state: GameState = restore(scorm.load<GameState>()) ?? initialState();
let resumePrompt = state.mode === 'active';

const choices: Record<Gate, string[]> = {
  verify: ['ready-to-compare', 'reference-mismatch', 'units-problem'],
  integrate: ['visual-drag', 'align-documented', 'compare-as-is'],
  compare: ['point-density', 'opening-shift', 'line-style'],
  release: ['draft-new', 'approved-old', 'qa-failed', 'approved-current'],
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}
function txt(key: string, values?: Record<string, string | number>): string { return escapeHtml(t(key, values)); }
function persist(): void { scorm.save(state); }

function header(): string {
  const status = scorm.snapshot().status;
  const statusKey = status === 'passed' ? 'app.passed' : status === 'failed' ? 'app.failed' : 'app.active';
  return `<header class="topbar"><div class="brand"><span class="brand-mark" aria-hidden="true">D4B</span><div><span class="brand-overline">${txt('app.course')}</span><strong>${txt('app.title')}</strong></div></div><div class="topbar-right"><span class="module-label">${txt('app.subtitle')}</span><span class="status-pill">${txt('app.status', { status: t(statusKey) })}</span></div></header>`;
}

function progress(): string {
  return `<nav class="gate-track" aria-label="${txt('app.progress', { current: Math.min(state.gate + 1, 4) })}">${GATES.map((gate, index) => {
    const status = state.completed[index] ? 'done' : index === state.gate ? 'current' : 'pending';
    return `<div class="gate-step ${status}"><span class="step-number">${String(index + 1).padStart(2, '0')}</span><span class="step-name">${txt(`gate.${gate}.name`)}</span><span class="step-state">${txt(`gate.${status === 'done' ? 'completeLabel' : status === 'current' ? 'currentLabel' : 'pendingLabel'}`)}</span></div>`;
  }).join('')}</nav>`;
}

function intro(): string {
  const saved = resumePrompt;
  return `${header()}<main class="shell intro-shell"><div class="intro-visual">${diagram(false, false)}</div><section class="intro-copy"><p class="eyebrow">${txt('intro.eyebrow')}</p><h1>${txt('intro.title')}</h1><p class="intro-lead">${txt('intro.body')}</p><div class="intro-facts"><span>${txt('intro.duration')}</span><span>${txt('intro.scoring')}</span></div>${saved ? `<p class="resume-note">${txt('intro.resumeNote', { gate: state.gate + 1 })}</p><div class="action-row"><button class="primary" data-action="resume">${txt('intro.resume')}</button><button class="secondary" data-action="restart">${txt('intro.restart')}</button></div>` : `<button class="primary" data-action="start">${txt('intro.start')}</button>`}<p class="keyboard-hint">${txt('app.keyboard')}</p></section></main>`;
}

function metadata(): string {
  const rows = ['purpose', 'source', 'date', 'reference', 'projectReference', 'units', 'qa', 'version'];
  return `<section class="metadata-card" aria-label="${txt('metadata.title')}"><div class="panel-title"><span class="panel-icon" aria-hidden="true">▦</span><h2>${txt('metadata.title')}</h2></div><dl>${rows.map(row => `<div class="metadata-row"><dt>${txt(`metadata.${row}.label`)}</dt><dd>${txt(`metadata.${row}.value`)}</dd></div>`).join('')}</dl></section>`;
}

function points(x1: number, y1: number, x2: number, y2: number, step: number, className: string): string {
  const count = Math.max(1, Math.floor(Math.hypot(x2 - x1, y2 - y1) / step));
  return Array.from({ length: count + 1 }, (_, i) => {
    const fraction = i / count;
    const ripple = (i % 3 - 1) * 1.7;
    const x = x1 + (x2 - x1) * fraction + (y1 === y2 ? 0 : ripple);
    const y = y1 + (y2 - y1) * fraction + (y1 === y2 ? ripple : 0);
    return `<circle class="${className}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.1"/>`;
  }).join('');
}

function diagram(aligned: boolean, withHotspots: boolean): string {
  const survey = [
    points(84, 276, 495, 276, 12, 'survey-dot'),
    points(84, 94, 84, 276, 10, 'survey-dot'),
    points(495, 94, 495, 276, 10, 'survey-dot'),
    points(84, 94, 495, 94, 12, 'survey-dot'),
    points(318, 168, 370, 168, 6, 'survey-dot opening-dot'),
    points(318, 168, 318, 225, 6, 'survey-dot opening-dot'),
    points(370, 168, 370, 225, 6, 'survey-dot opening-dot'),
    points(318, 225, 370, 225, 6, 'survey-dot opening-dot'),
  ].join('');
  const hotspots = withHotspots ? `<div class="hotspot-layer" role="group" aria-label="${txt('gate.compare.choose')}"><button class="hotspot hot-opening ${state.selection === 'opening-shift' ? 'selected' : ''}" data-choice="opening-shift" aria-pressed="${state.selection === 'opening-shift'}">${txt('diagram.opening')}</button><button class="hotspot hot-density ${state.selection === 'point-density' ? 'selected' : ''}" data-choice="point-density" aria-pressed="${state.selection === 'point-density'}">${txt('diagram.density')}</button><button class="hotspot hot-style ${state.selection === 'line-style' ? 'selected' : ''}" data-choice="line-style" aria-pressed="${state.selection === 'line-style'}">${txt('diagram.style')}</button></div>` : '';
  return `<div class="diagram-frame"><div class="diagram-head"><span class="diagram-head-title">${txt('diagram.title')}</span><span class="diagram-state ${aligned ? 'is-aligned' : ''}">${txt(aligned ? 'diagram.aligned' : 'diagram.unaligned')}</span></div><div class="diagram-canvas"><svg viewBox="0 0 580 350" role="img" aria-label="${txt(aligned ? 'diagram.description.aligned' : 'diagram.description.unaligned')}"><defs><pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M 25 0 L 0 0 0 25" fill="none" stroke="#253d57" stroke-width="0.7"/></pattern></defs><rect width="580" height="350" fill="#0b192a"/><rect width="580" height="350" fill="url(#grid)"/><path class="plan-outline" d="M84 276 V94 H495 V276 Z"/><path class="plan-opening" d="M260 168 H312 V225 H260 Z"/><path class="plan-roof" d="M70 94 H509"/><g transform="translate(${aligned ? '0 0' : '36 -20'})">${survey}</g><path class="ground" d="M47 293 H529"/></svg>${hotspots}</div><div class="diagram-legend"><span><i class="legend-plan"></i>${txt('diagram.planned')}</span><span><i class="legend-survey"></i>${txt('diagram.existing')}</span></div></div>`;
}

function optionCards(gate: Gate): string {
  return `<div class="options" role="radiogroup" aria-label="${txt(`gate.${gate}.choose`)}">${choices[gate].map((choice, index) => {
    const id = `${gate}-${choice}`;
    return `<label class="option-card"><input type="radio" name="choice" value="${choice}" id="${id}" ${state.selection === choice ? 'checked' : ''}/><span class="option-index">${String.fromCharCode(65 + index)}</span><span class="option-copy"><strong>${txt(`option.${gate}.${choice}.title`)}</strong><small>${txt(`option.${gate}.${choice}.detail`)}</small></span><span class="option-check" aria-hidden="true"></span></label>`;
  }).join('')}</div>`;
}

function active(): string {
  const gate = GATES[state.gate];
  const aligned = state.gate >= 2;
  const visual = gate === 'verify' ? metadata() : diagram(aligned, gate === 'compare');
  const feedback = state.feedback ? `<div class="feedback ${state.feedback.endsWith('.correct') ? 'positive' : 'caution'}" role="status"><span aria-hidden="true">${state.feedback.endsWith('.correct') ? '✓' : '!'}</span><p>${txt(state.feedback)}</p></div>` : '';
  return `${header()}<main class="shell game-shell">${progress()}<div class="game-grid"><section class="workspace-panel"><div class="workspace-top"><span class="eyebrow">${txt(`gate.${gate}.kicker`)}</span><span class="score-meter">${txt('app.points', { score: score(state) })}</span></div>${visual}<p class="workspace-caption">${txt(`gate.${gate}.context`)}</p></section><section class="decision-panel"><div class="decision-heading"><p class="eyebrow">${txt('app.progress', { current: state.gate + 1 })}</p><h1>${txt(`gate.${gate}.title`)}</h1><p>${txt(`gate.${gate}.prompt`)}</p></div>${gate === 'compare' ? `<div class="compare-instruction">${txt('gate.compare.choose')}</div>` : optionCards(gate)}${feedback}<div class="decision-footer"><button class="primary" data-action="submit" ${state.selection ? '' : 'disabled'}>${txt('gate.submit')}</button><p>${txt('gate.scoreHint')}</p></div></section></div></main>`;
}

function result(): string {
  const success = passed(state);
  const resultRows = GATES.map((gate, index) => `<div class="result-row"><span>${txt(`gate.${gate}.name`)}</span><strong>${txt('result.gatePoints', { points: Math.max(10, 25 - state.errors[index] * 5) })}</strong></div>`).join('');
  return `${header()}<main class="shell result-shell"><section class="result-card"><div class="result-emblem ${success ? 'pass' : 'fail'}" aria-hidden="true">${success ? '✓' : '↻'}</div><p class="eyebrow">${txt('result.eyebrow')}</p><h1>${txt(success ? 'result.pass.title' : 'result.fail.title')}</h1><p class="result-lead">${txt(success ? 'result.pass.body' : 'result.fail.body')}</p><div class="result-score"><span>${txt('result.score')}</span><strong>${score(state)}<small>/100</small></strong><span>${txt('result.threshold')}</span></div><div class="result-meta"><span>✓ ${txt('result.release')}</span></div><div class="result-breakdown"><h2>${txt('result.breakdown')}</h2>${resultRows}</div><div class="action-row"><button class="primary" data-action="replay">${txt('result.replay')}</button><button class="secondary" data-action="finish">${txt('result.finish')}</button></div></section></main>`;
}

function render(): void {
  app.innerHTML = resumePrompt || state.mode === 'intro' ? intro() : state.mode === 'result' ? result() : active();
}

app.addEventListener('change', event => {
  const input = event.target as HTMLInputElement;
  if (input.name === 'choice' && input.value) {
    state = select(state, input.value);
    persist();
    app.querySelector('.feedback')?.remove();
    app.querySelector<HTMLButtonElement>('[data-action="submit"]')?.removeAttribute('disabled');
  }
});

app.addEventListener('click', event => {
  const target = event.target as HTMLElement;
  const choiceButton = target.closest<HTMLButtonElement>('[data-choice]');
  if (choiceButton?.dataset.choice) {
    state = select(state, choiceButton.dataset.choice);
    persist();
    app.querySelector('.feedback')?.remove();
    app.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button => {
      const selected = button.dataset.choice === state.selection;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    app.querySelector<HTMLButtonElement>('[data-action="submit"]')?.removeAttribute('disabled');
    return;
  }
  const action = target.closest<HTMLButtonElement>('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'start') state = start(state);
  if (action === 'resume') resumePrompt = false;
  if (action === 'restart' || action === 'replay') { state = start(initialState()); resumePrompt = false; }
  if (action === 'submit') {
    const wasResult = state.mode === 'result';
    state = submit(state);
    if (!wasResult && state.mode === 'result') scorm.complete(score(state), passed(state));
  }
  if (action === 'finish') { scorm.finish(); return; }
  if (action !== 'resume' && action !== 'finish') persist();
  render();
});

render();
