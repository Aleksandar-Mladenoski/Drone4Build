import '../../../packages/core/src/ui.css';
import './style.css';
import en from '../locales/en.json';
import { createTranslator } from '../../../packages/core/src/locale';
import { createScorm } from '../../../packages/core/src/scorm';
import { IMAGES, PROVISIONAL_NOTE, STATIONS } from './scenario';
import { fresh, image, placeSelected, quality, repaired, restore, runReconstruction, selectImage, type GameState, type OutputView } from './rules';

const dictionaries = Object.fromEntries(Object.entries(import.meta.glob<Record<string, string>>('../locales/*.json', { eager: true, import: 'default' }))
  .map(([path, messages]) => [path.match(/\/([^/]+)\.json$/)?.[1] ?? 'en', messages]));
const { t, locale } = createTranslator(en, dictionaries);
document.documentElement.lang = locale;
document.title = `Drone4Build · ${t('title')}`;
const scorm = createScorm('m3-1-reconstruction-pipeline');
const app = document.querySelector<HTMLDivElement>('#app')!;
const saved = restore(scorm.load<GameState>());
let state = saved ?? fresh();
let resumeAvailable = !!saved && saved.phase !== 'intro';

function esc(value: string) { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!); }
function tx(key: string, values?: Record<string, string | number>) { return esc(t(key, values)); }
function save() { scorm.save(state); }
function sampleCard(id: string, held = false) {
  const item = image(id);
  return `<button class="image-card ${item.quality} ${state.selectedImage === id ? 'selected' : ''} ${held ? 'held' : ''}" draggable="true" data-image="${id}" aria-pressed="${state.selectedImage === id}"><span class="mini-photo pattern-${item.pattern}"><i></i><i></i><i></i></span><span><strong>${esc(item.label)}</strong><small>${tx(item.quality)}</small></span></button>`;
}

function intro() {
  return `<main class="pipeline-shell intro"><section><div class="eyebrow">${tx('brand')}</div><h1>${tx('introTitle')}</h1><p class="lede">${tx('introBody')}</p><div class="actions"><button class="btn-primary" data-action="start">${tx('start')}</button>${resumeAvailable ? `<button data-action="resume">${tx('resume')}</button><button data-action="restart">${tx('restart')}</button>` : ''}</div><p class="provisional-note">${tx('provisional')}</p></section><div class="intro-machine" aria-hidden="true"><div class="film">${IMAGES.slice(0,6).map(item=>`<i class="pattern-${item.pattern}"></i>`).join('')}</div><div class="processor">ALIGN<br/>BUILD</div><div class="ghost-model"><i></i><i></i><i></i><i></i></div></div></main>`;
}

function inputConstellation() {
  const stationCards = state.assignments.map((id, index) => {
    const position = STATIONS[index];
    return `<div class="camera-station ${state.traceActive && index === 5 ? 'trace-source' : ''}" style="left:${position.x}px;top:${position.y}px;--angle:${position.angle}deg" data-slot="${index}"><span>${tx('station', { number: index + 1 })}</span>${sampleCard(id)}</div>`;
  }).join('');
  return `<section class="input-panel"><div class="section-heading"><div><div class="eyebrow">${tx('inputTitle')}</div><p>${tx('inputHint')}</p></div><div class="run-count"><b>${state.runs}</b>${tx('runs')}</div></div><div class="constellation"><svg viewBox="0 0 620 350" aria-hidden="true"><path class="site-shape" d="M220 90 H420 L480 154 V286 H174 V145 Z"/><path class="coverage-line" d="M112 92 L250 160 M120 225 L250 220 M290 74 L310 150 M300 236 L320 238 M468 88 L408 157 M486 224 L408 230"/></svg>${stationCards}<div class="holding-bay"><span>${tx('holding')}</span>${sampleCard(state.held, true)}</div>${state.traceActive ? '<div class="trace-beam"></div>' : ''}</div><p class="dataset-note">${esc(PROVISIONAL_NOTE)}</p></section>`;
}

function pointCloud(fixed: boolean) {
  const dots = Array.from({ length: 190 }, (_, index) => {
    const x = 112 + (index * 47) % 590;
    const y = 78 + (index * 71) % 330;
    if (!fixed && x > 548 && y < 286 && index % 3 !== 0) return '';
    const radius = index % 7 === 0 ? 3 : 2;
    return `<circle cx="${x}" cy="${y}" r="${radius}"/>`;
  }).join('');
  const ghost = fixed ? '' : `<g class="ghost-edge"><path d="M564 92 L716 148 V357 L570 370"/><path d="M580 102 L732 158 V367 L586 380"/></g>`;
  return `<g class="cloud-points">${dots}</g>${ghost}`;
}

function outputGraphic() {
  const fixed = repaired(state);
  const result = quality(state);
  if (state.runs === 0) return `<div class="output-idle"><div class="spinner-mark">◇</div><p>${tx('outputIdle')}</p></div>`;
  const surface = state.view !== 'cloud' ? `<path class="surface-mesh" d="M105 72 H565 L720 140 V372 H105 Z M105 205 H720 M260 72 V372 M430 72 V372"/>` : '';
  const qualityLayer = state.view === 'quality' ? `<g class="quality-layer ${fixed ? 'fixed' : ''}"><rect x="115" y="82" width="430" height="280"/><path d="M545 82 L706 145 V362 H545 Z"/></g>` : '';
  return `<svg class="reconstruction" viewBox="0 0 820 450" role="img" aria-label="${tx(fixed ? 'fixedTitle' : 'problemTitle')}"><defs><pattern id="out-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0 H0 V28" fill="none" stroke="#243e51"/></pattern></defs><rect width="820" height="450" fill="#091923"/><rect width="820" height="450" fill="url(#out-grid)"/>${surface}${pointCloud(fixed)}${qualityLayer}<g class="weak-zone ${fixed ? 'resolved' : ''}" data-action="trace" role="button" tabindex="0" aria-label="${tx('inspectWeak')}"><path d="M540 70 L735 130 V390 L540 390 Z"/><text x="635" y="410" text-anchor="middle">${fixed ? 'FILLED' : 'WEAK AREA'}</text></g><text x="28" y="38" class="output-label">RUN ${state.runs.toString().padStart(2,'0')} · ${state.view.toUpperCase()}</text></svg>`;
}

function outputPanel() {
  const fixed = repaired(state);
  const result = quality(state);
  return `<section class="output-panel ${state.traceActive ? 'tracing' : ''}"><div class="section-heading"><div><div class="eyebrow">${tx('outputTitle')}</div><h2>${state.runs ? tx(fixed ? 'fixedTitle' : 'problemTitle') : tx('outputIdle')}</h2></div><div class="view-switch">${(['cloud','surface','quality'] as OutputView[]).map(view=>`<button class="choice" aria-pressed="${state.view === view}" data-view="${view}">${tx(view)}</button>`).join('')}</div></div><div class="output-stage">${outputGraphic()}</div>${state.runs ? `<div class="quality-readout"><div><span>${tx('completeness')}</span><b>${result.completeness}%</b><i><em style="width:${result.completeness}%"></em></i></div><div><span>${tx('coherence')}</span><b>${result.coherence}%</b><i><em style="width:${result.coherence}%"></em></i></div><div class="fitness ${result.usable ? 'fit' : ''}"><span>${tx('fitness')}</span><b>${tx(result.usable ? 'fit' : 'unfit')}</b></div></div><p class="result-copy">${tx(fixed ? 'fixedBody' : state.traceActive ? 'traceHint' : 'problemBody')}</p>` : ''}</section>`;
}

function workspace() {
  return `<main class="pipeline-shell"><header class="topbar"><div><div class="eyebrow">${tx('brand')}</div><h1>${tx('title')}</h1><p>${tx('subtitle')}</p></div><div class="pipeline-flow"><span class="active">INPUT</span><i></i><span class="${state.runs ? 'active' : ''}">PROCESS</span><i></i><span class="${state.runs ? 'active' : ''}">OUTPUT</span></div></header><div class="workspace">${inputConstellation()}${outputPanel()}</div><footer class="action-bar"><p>${state.traceActive ? tx('swapHint') : tx('scenarioNote')}</p><div><button data-action="reset">${tx('restart')}</button><button class="btn-primary" data-action="run">${tx(state.runs ? 'rebuild' : 'process')}</button>${state.runs ? `<button data-action="record">${tx('record')}</button>` : ''}</div></footer></main>`;
}

function report() {
  const result = quality(state);
  return `<main class="pipeline-shell report"><div class="eyebrow">${tx('brand')}</div><div class="report-grid"><section><h1>${tx(result.usable ? 'reportPass' : 'reportFail')}</h1><p>${tx(result.usable ? 'reportPassBody' : 'reportFailBody')}</p><div class="metric-grid"><div><b>${result.score}</b><span>SCORE</span></div><div><b>${result.completeness}%</b><span>${tx('completeness')}</span></div><div><b>${result.coherence}%</b><span>${tx('coherence')}</span></div><div class="${result.usable ? 'good' : 'bad'}"><b>${tx(result.usable ? 'fit' : 'unfit')}</b><span>${tx('fitness')}</span></div></div><div class="actions"><button data-action="return">${tx('return')}</button><button class="btn-primary" data-action="replay">${tx('replay')}</button></div></section><div class="report-model">${outputGraphic()}</div></div></main>`;
}

function render() { app.innerHTML = state.phase === 'intro' ? intro() : state.phase === 'report' ? report() : workspace(); }

app.addEventListener('click', event => {
  const target = event.target as Element;
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action === 'start' || action === 'restart' || action === 'reset' || action === 'replay') { state = fresh('prepare'); resumeAvailable = false; save(); render(); return; }
  if (action === 'resume' && saved) { state = saved; resumeAvailable = false; render(); return; }
  if (action === 'run') { state = runReconstruction(state); save(); render(); return; }
  if (action === 'trace') { state = { ...state, traceActive: !state.traceActive }; save(); render(); return; }
  if (action === 'record') { const result = quality(state); state = { ...state, phase: 'report' }; scorm.complete(result.score, result.usable); save(); render(); return; }
  if (action === 'return') { state = { ...state, phase: 'result' }; save(); render(); return; }
  const slotTarget = target.closest<HTMLElement>('[data-slot]');
  if (slotTarget && state.selectedImage) { state = placeSelected(state, Number(slotTarget.dataset.slot)); save(); render(); return; }
  const imageTarget = target.closest<HTMLElement>('[data-image]');
  if (imageTarget) { state = selectImage(state, imageTarget.dataset.image!); save(); render(); return; }
  const viewTarget = target.closest<HTMLElement>('[data-view]');
  if (viewTarget) { state = { ...state, view: viewTarget.dataset.view as OutputView }; save(); render(); }
});

app.addEventListener('dragstart', event => {
  const dragEvent = event as DragEvent;
  const card = (event.target as Element).closest<HTMLElement>('[data-image]');
  if (card) dragEvent.dataTransfer?.setData('text/plain', card.dataset.image!);
});
app.addEventListener('dragover', event => { if ((event.target as Element).closest('[data-slot]')) event.preventDefault(); });
app.addEventListener('drop', event => {
  const dragEvent = event as DragEvent;
  const slot = (event.target as Element).closest<HTMLElement>('[data-slot]');
  const id = dragEvent.dataTransfer?.getData('text/plain');
  if (!slot || !id) return;
  event.preventDefault(); state = placeSelected(selectImage({ ...state, selectedImage: null }, id), Number(slot.dataset.slot)); save(); render();
});

render();
