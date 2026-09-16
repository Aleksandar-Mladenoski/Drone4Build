import '../../../packages/core/src/ui.css';
import './style.css';
import en from '../locales/en.json';
import { createTranslator } from '../../../packages/core/src/locale';
import { createScorm } from '../../../packages/core/src/scorm';
import { ACTIVITIES, CHANGE_EVENT, PROVISIONAL_NOTE, SCENARIO_CAPACITY, STAKEHOLDERS, type ActivityId, type StakeholderId } from './scenario';
import { fresh, place, restore, result, resumeAfterEvent, route, startRun, tick, type GameState, type Outcome } from './rules';

const dictionaries = Object.fromEntries(Object.entries(import.meta.glob<Record<string, string>>('../locales/*.json', { eager: true, import: 'default' }))
  .map(([path, messages]) => [path.match(/\/([^/]+)\.json$/)?.[1] ?? 'en', messages]));
const { t, locale } = createTranslator(en, dictionaries);
document.documentElement.lang = locale;
document.title = `Drone4Build · ${t('title')}`;
const scorm = createScorm('m4-2-renovation-deployment');
const app = document.querySelector<HTMLDivElement>('#app')!;
const saved = restore(scorm.load<GameState>());
let state = saved ?? fresh();
let resumeAvailable = !!saved && saved.phase !== 'intro';
let timer: number | null = null;

function esc(value: string) { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!); }
function tx(key: string, values?: Record<string, string | number>) { return esc(t(key, values)); }
function save() { scorm.save(state); }
function statusFor(id: ActivityId): Outcome | undefined { return [...state.outcomes].reverse().find(item => item.activity === id); }
function statusLabel(outcome?: Outcome) { return outcome ? tx(outcome.status) : tx('pending'); }

function intro() {
  return `<main class="deployment-shell intro"><section><div class="eyebrow">${tx('brand')}</div><h1>${tx('introTitle')}</h1><p class="lede">${tx('introBody')}</p><div class="actions"><button class="btn-primary" data-action="start">${tx('start')}</button>${resumeAvailable ? `<button data-action="resume">${tx('resume')}</button><button data-action="restart">${tx('restart')}</button>` : ''}</div><p class="provisional-note">${tx('provisional')}</p></section><div class="intro-board" aria-hidden="true"><div class="building"><i></i><i></i><i></i></div><div class="time-line">${Array.from({length:4},(_,i)=>`<span style="--n:${i}"></span>`).join('')}</div><div class="moving-token">◆</div></div></main>`;
}

function activityToken(id: ActivityId) {
  const item = ACTIVITIES.find(activity => activity.id === id)!;
  const outcome = statusFor(id);
  const locked = state.phase === 'running' || state.phase === 'complete';
  return `<button class="activity-token ${state.selected === id ? 'selected' : ''} ${outcome?.status ?? ''}" data-activity="${id}" draggable="${!locked}" aria-pressed="${state.selected === id}"><span class="activity-icon">${item.icon}</span><span><strong>${esc(item.label)}</strong><small>${esc(item.area)} · ${item.storage} storage</small></span><em>${statusLabel(outcome)}</em></button>`;
}

function timeline() {
  return `<section class="timeline-panel"><div class="section-heading"><div><div class="eyebrow">${tx('timeline')}</div><p>${tx('timelineHint')}</p></div><div class="progress-clock">${Array.from({length:4},(_,i)=>`<i class="${state.step > i ? 'past' : state.step === i && state.phase === 'running' ? 'live' : ''}">${i+1}</i>`).join('')}</div></div><div class="timeline-grid">${Array.from({length:4},(_,index)=>{const slot=index+1;const activities=ACTIVITIES.filter(item=>state.placements[item.id]===slot);return `<div class="time-slot ${state.step === slot && state.phase === 'running' ? 'active' : ''} ${state.eventSeen && slot === 3 ? 'changed' : ''}" data-slot="${slot}"><header><b>${tx('window',{number:slot})}</b><span>${slot===3&&state.eventSeen?'ACCESS CHANGED':''}</span></header><div class="slot-track">${activities.map(item=>activityToken(item.id)).join('')}</div><footer><i></i><i></i><span>${SCENARIO_CAPACITY.flightKits} KIT · ${SCENARIO_CAPACITY.crewUnits} CREW</span></footer></div>`;}).join('')}</div></section>`;
}

function siteMap() {
  const active = ACTIVITIES.filter(item => state.placements[item.id] === Math.max(1, state.step));
  return `<section class="site-panel"><div class="eyebrow">${tx('site')}</div><svg viewBox="0 0 520 310" role="img" aria-label="${tx('site')}"><defs><pattern id="site-grid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0 H0 V22" fill="none" stroke="#29464a"/></pattern></defs><rect width="520" height="310" fill="#0c2428"/><rect width="520" height="310" fill="url(#site-grid)"/><path class="site-building" d="M122 55 H394 V255 H122 Z M190 105 H326 V210 H190 Z" fill-rule="evenodd"/><path class="scaffold" d="M104 48 V264 M412 48 V264 M88 70 H428 M88 238 H428"/><path class="access ${state.eventSeen ? 'closed' : ''}" d="M212 224 H306 V278 H212 Z"/><text x="259" y="252" text-anchor="middle">COURTYARD</text>${active.map((item,index)=>`<g class="site-activity ${statusFor(item.id)?.status ?? ''}" transform="translate(${165+index*88} ${90+index*45})"><circle r="22"/><text y="5" text-anchor="middle">${item.icon}</text></g>`).join('')}</svg><div class="site-legend"><span><i class="access-dot"></i>${state.eventSeen ? 'Window 3 closed' : 'Access available'}</span><span>${CHANGE_EVENT}</span></div></section>`;
}

function routes() {
  return `<section class="route-panel"><div class="eyebrow">${tx('routes')}</div><p>${tx('routesHint')}</p><div class="route-network"><div class="output-nodes">${ACTIVITIES.map(item=>`<button data-activity="${item.id}" class="output-node ${state.selected===item.id?'selected':''}"><i>${item.icon}</i><span>${esc(item.output)}</span><b>${state.routes[item.id] ? '→' : '×'}</b></button>`).join('')}</div><svg viewBox="0 0 120 270" aria-hidden="true">${ACTIVITIES.map((item,index)=>{const target=state.routes[item.id];const y1=35+index*65;const y2=target==='site'?45:target==='design'?135:target==='records'?225:y1;return `<path class="route-line ${target?'connected':''}" d="M0 ${y1} C45 ${y1},75 ${y2},120 ${y2}"/>`;}).join('')}</svg><div class="stakeholder-nodes">${STAKEHOLDERS.map(item=>`<button data-stakeholder="${item.id}" class="stakeholder ${item.port}"><i></i><span>${esc(item.label)}</span></button>`).join('')}</div></div></section>`;
}

function eventPanel() {
  if (state.phase !== 'event') return '';
  return `<section class="change-event"><div class="event-pulse">!</div><div><div class="eyebrow">${tx('change')}</div><h2>${tx('changeBody')}</h2><p>${tx('changeHint')}</p></div><button class="btn-primary" data-action="resume-run">${tx('resumeRun')}</button></section>`;
}

function resultPanel() {
  if (state.phase !== 'complete') return '';
  const summary = result(state);
  return `<section class="project-result ${summary.passed ? 'pass' : 'fail'}"><div><div class="eyebrow">PROJECT SIMULATION COMPLETE</div><h2>${tx(summary.passed ? 'completePass' : 'completeFail')}</h2><p>${tx(summary.passed ? 'completePassBody' : 'completeFailBody')}</p></div><div class="result-metrics"><span><b>${summary.done}/4</b>${tx('activitiesDone')}</span><span><b>${summary.blocked}</b>${tx('blockedCount')}</span><span><b>${summary.conflicts}</b>${tx('conflicts')}</span><span><b>${summary.routed}/4</b>${tx('routed')}</span><span><b>${tx(state.eventReplanned?'yes':'no')}</b>${tx('replanned')}</span><span class="score"><b>${summary.score}</b>SCORE</span></div><div class="actions"><button data-action="revise">${tx('revise')}</button><button class="btn-primary" data-action="replay">${tx('replay')}</button></div></section>`;
}

function board() {
  const editable = state.phase === 'plan' || state.phase === 'event';
  return `<main class="deployment-shell"><header class="topbar"><div><div class="eyebrow">${tx('brand')}</div><h1>${tx('title')}</h1><p>${tx('objective')}</p></div><div class="capacity"><span>${tx('capacity')}</span><b>${tx('flightKit')}</b><b>${tx('crew')}</b><b>${tx('storage')}</b></div></header>${eventPanel()}<div class="board-layout"><div>${timeline()}${siteMap()}</div>${routes()}</div>${state.selected && editable ? `<div class="selection-toast">${tx('selected')}</div>` : ''}${state.phase === 'plan' ? `<footer class="run-bar"><p>${esc(PROVISIONAL_NOTE)}</p><button class="btn-primary" data-action="run">${tx('run')}</button></footer>` : state.phase === 'running' ? `<footer class="run-bar live"><p>${tx('running')} · ${tx('window',{number:state.step+1})}</p><div class="running-light"></div></footer>` : ''}${resultPanel()}</main>`;
}

function render() { app.innerHTML = state.phase === 'intro' ? intro() : board(); if (state.phase === 'running') armSimulation(); }
function armSimulation() {
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    state = tick(state);
    save();
    if (state.phase === 'complete') { const summary = result(state); scorm.complete(summary.score, summary.passed); }
    render();
  }, 850);
}

app.addEventListener('click', event => {
  const target = event.target as Element;
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action === 'start' || action === 'restart' || action === 'replay') { state = fresh('plan'); resumeAvailable = false; save(); render(); return; }
  if (action === 'resume' && saved) { state = saved; resumeAvailable = false; render(); return; }
  if (action === 'run') { state = startRun(state); save(); render(); return; }
  if (action === 'resume-run') { state = resumeAfterEvent(state); save(); render(); return; }
  if (action === 'revise') { state = { ...state, phase: 'plan', step: 0, outcomes: [], eventSeen: false, eventReplanned: false, selected: null }; save(); render(); return; }
  const activityTarget = target.closest<HTMLElement>('[data-activity]');
  if (activityTarget && ['plan','event'].includes(state.phase)) { const id = activityTarget.dataset.activity as ActivityId; state = { ...state, selected: state.selected === id ? null : id }; save(); render(); return; }
  const slotTarget = target.closest<HTMLElement>('[data-slot]');
  if (slotTarget && state.selected) { state = place(state, state.selected, Number(slotTarget.dataset.slot)); save(); render(); return; }
  const stakeholder = target.closest<HTMLElement>('[data-stakeholder]');
  if (stakeholder && state.selected) { state = route(state, state.selected, stakeholder.dataset.stakeholder as StakeholderId); save(); render(); }
});

app.addEventListener('dragstart', event => {
  const dragEvent = event as DragEvent;
  const token = (event.target as Element).closest<HTMLElement>('[data-activity]');
  if (token) dragEvent.dataTransfer?.setData('text/plain', token.dataset.activity!);
});
app.addEventListener('dragover', event => { if ((event.target as Element).closest('[data-slot]')) event.preventDefault(); });
app.addEventListener('drop', event => {
  const dragEvent = event as DragEvent;
  const slot = (event.target as Element).closest<HTMLElement>('[data-slot]');
  const id = dragEvent.dataTransfer?.getData('text/plain') as ActivityId;
  if (!slot || !id) return;
  event.preventDefault(); state = place(state, id, Number(slot.dataset.slot)); save(); render();
});

render();
