import '../../../packages/core/src/ui.css';
import './style.css';
import en from '../locales/en.json';
import { createTranslator } from '../../../packages/core/src/locale';
import { createScorm } from '../../../packages/core/src/scorm';
import { CAPTURE_CAPACITY, PROVISIONAL_NOTE, ZONES } from './scenario';
import { canFinish, capture, fresh, move, restore, summarize, visit, zone, type CaptureKind, type GameState } from './rules';

const dictionaries = Object.fromEntries(Object.entries(import.meta.glob<Record<string, string>>('../locales/*.json', { eager: true, import: 'default' }))
  .map(([path, messages]) => [path.match(/\/([^/]+)\.json$/)?.[1] ?? 'en', messages]));
const { t, locale } = createTranslator(en, dictionaries);
document.documentElement.lang = locale;
document.title = `Drone4Build · ${t('title')}`;
const scorm = createScorm('m2-1-defect-mapping');
const app = document.querySelector<HTMLDivElement>('#app')!;
const saved = restore(scorm.load<GameState>());
let state = saved ?? fresh();
let resumeAvailable = !!saved && saved.phase !== 'intro';
let feedback: CaptureKind | null = null;

function esc(value: string) { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!); }
function tx(key: string, values?: Record<string, string | number>) { return esc(t(key, values)); }
function save() { scorm.save(state); }
function geometry(id: string) {
  const item = zone(id);
  return { x: 92 + item.col * 119, y: 74 + item.row * 132, w: 110, h: 122 };
}

function intro() {
  return `<main class="sweep-shell intro"><section><div class="eyebrow">${tx('brand')}</div><h1>${tx('introTitle')}</h1><p class="lede">${tx('introBody')}</p><div class="actions"><button class="btn-primary" data-action="start">${tx('start')}</button>${resumeAvailable ? `<button data-action="resume">${tx('resume')}</button><button data-action="restart">${tx('restart')}</button>` : ''}</div><p class="provisional-note">${tx('provisional')}</p></section><div class="intro-map" aria-hidden="true"><div class="scan-beam"></div>${Array.from({length:18},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div></main>`;
}

function buildingMap(readonly = false) {
  const current = geometry(state.cursor);
  const pins = state.captures.map(item => {
    const g = geometry(item.zoneId);
    return `<g class="evidence-pin ${item.kind} ${state.selectedCapture === item.id ? 'selected' : ''}" transform="translate(${g.x + g.w - 16} ${g.y + 18})" data-pin="${item.id}" role="button" tabindex="0" aria-label="${tx('pin', { number: item.id })}"><circle r="13"/><text text-anchor="middle" y="5">${item.id}</text></g>`;
  }).join('');
  const cells = ZONES.map(item => {
    const g = geometry(item.id);
    const inspected = state.visited.includes(item.id);
    const feature = item.feature ? `<path class="feature-mark" d="M${g.x+26} ${g.y+76} Q${g.x+55} ${g.y+50} ${g.x+83} ${g.y+82}"/>` : '';
    return `<g class="survey-zone ${inspected ? 'inspected' : ''} ${state.cursor === item.id ? 'active' : ''}" data-zone="${item.id}" role="button" tabindex="${readonly ? -1 : 0}" aria-label="${esc(item.label)} · ${tx(inspected ? 'visited' : 'unvisited')}"><rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="3"/>${item.row > 0 ? `<rect class="window" x="${g.x+19}" y="${g.y+22}" width="${g.w-38}" height="54"/>` : `<path class="roof-edge" d="M${g.x+8} ${g.y+78} L${g.x+40} ${g.y+46} L${g.x+102} ${g.y+68}"/>`}${feature}<text x="${g.x+9}" y="${g.y+108}">${esc(item.label)}</text></g>`;
  }).join('');
  return `<svg id="survey-map" viewBox="0 0 900 500" tabindex="0" role="application" aria-label="${tx('mapTitle')}"><defs><pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0 H0 V24" fill="none" stroke="#274653" stroke-width="1"/></pattern></defs><rect width="900" height="500" fill="#0a202a"/><rect width="900" height="500" fill="url(#map-grid)"/><path class="building-shadow" d="M72 454 H826 L850 478 H48 Z"/><path class="building-outline" d="M76 58 H806 L830 448 H66 Z"/>${cells}${pins}${!readonly ? `<g class="camera-footprint" transform="translate(${current.x} ${current.y})"><rect width="${current.w}" height="${current.h}" rx="8"/><path d="M8 30 V8 H30 M80 8 H102 V30 M102 92 V114 H80 M30 114 H8 V92"/><text x="55" y="64" text-anchor="middle">${tx('camera')}</text></g>` : ''}</svg>`;
}

function record() {
  if (!state.captures.length) return `<p class="empty-record">${tx('emptyRecord')}</p>`;
  return `<div class="evidence-list">${state.captures.map(item => {
    const source = zone(item.zoneId);
    return `<button class="evidence-card ${item.kind} ${state.selectedCapture === item.id ? 'selected' : ''}" data-return="${item.id}"><span class="thumb"><i></i><b>${item.id}</b></span><span><strong>${esc(source.label)}</strong><small>${tx(item.kind)}</small></span></button>`;
  }).join('')}</div>`;
}

function survey() {
  const coverage = Math.round(state.visited.length / ZONES.length * 100);
  const current = zone(state.cursor);
  return `<main class="sweep-shell"><header class="topbar"><div><div class="eyebrow">${tx('brand')}</div><h1>${tx('title')}</h1><p>${tx('subtitle')}</p></div><div class="hud"><span><b>${coverage}%</b>${tx('coverage')}</span><span><b>${state.captures.length}/${CAPTURE_CAPACITY}</b>${tx('evidence')}</span><span class="status ${canFinish(state) ? 'ready' : ''}">${tx(canFinish(state) ? 'statusReady' : 'statusOpen')}</span></div></header><div class="survey-layout"><section class="map-panel"><div class="panel-heading"><div><h2>${tx('mapTitle')}</h2><p>${tx('mapHint')}</p></div><div class="legend"><i class="seen"></i>${tx('visited')}<i></i>${tx('unvisited')}</div></div>${buildingMap()}</section><aside class="control-panel"><div class="eyebrow">${tx('currentView')}</div><h2>${esc(current.label)}</h2><p>${esc(current.area)}${current.feature ? ` · ${esc(current.feature)}` : ''}</p><div class="viewfinder"><span></span><b>${String(current.col + 1).padStart(2, '0')} / ${String(current.row + 1).padStart(2, '0')}</b></div><div class="move-pad"><button data-move="0,-1" aria-label="${tx('moveUp')}">↑</button><button data-move="-1,0" aria-label="${tx('moveLeft')}">←</button><button data-move="0,1" aria-label="${tx('moveDown')}">↓</button><button data-move="1,0" aria-label="${tx('moveRight')}">→</button></div><button class="btn-primary capture-button" data-action="capture" ${state.captures.length >= CAPTURE_CAPACITY ? 'disabled' : ''}>${tx(state.captures.length >= CAPTURE_CAPACITY ? 'captureFull' : 'capture')}</button>${feedback ? `<div class="feedback ${feedback === 'redundant' ? 'warn' : 'good'}" role="status">${tx(`feedback.${feedback}`)}</div>` : ''}<button data-action="finish" ${canFinish(state) ? '' : 'disabled'}>${tx('finish')}</button>${!canFinish(state) ? `<p class="small-note">${tx('finishHint')}</p>` : ''}</aside></div><section class="record-panel"><div><div class="eyebrow">${tx('recordTitle')}</div><p>${esc(PROVISIONAL_NOTE)}</p></div>${record()}</section></main>`;
}

function summary() {
  const result = summarize(state);
  return `<main class="sweep-shell summary"><header><div class="eyebrow">${tx('brand')}</div><h1>${tx(result.passed ? 'summaryPass' : 'summaryFail')}</h1><p>${tx(result.passed ? 'summaryPassBody' : 'summaryFailBody')}</p></header><div class="summary-layout"><section class="map-panel">${buildingMap(true)}</section><aside class="summary-card"><div class="score">${result.score}<small>/100</small></div><dl><div><dt>${tx('areasVisited')}</dt><dd>${state.visited.length}/${ZONES.length}</dd></div><div><dt>${tx('featurePins')}</dt><dd>${result.useful}</dd></div><div><dt>${tx('contextPins')}</dt><dd>${result.context}</dd></div><div><dt>${tx('duplicates')}</dt><dd>${result.redundant}</dd></div><div><dt>${tx('missed')}</dt><dd>${result.missed.length ? result.missed.map(esc).join(', ') : tx('none')}</dd></div></dl><div class="actions"><button data-action="continue">${tx('continue')}</button><button class="btn-primary" data-action="replay">${tx('replay')}</button></div></aside></div><section class="record-panel">${record()}</section></main>`;
}

function render() { app.innerHTML = state.phase === 'intro' ? intro() : state.phase === 'survey' ? survey() : summary(); }

app.addEventListener('click', event => {
  const target = event.target as Element;
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action === 'start' || action === 'restart' || action === 'replay') { state = visit(fresh('survey'), 'z14'); resumeAvailable = false; feedback = null; save(); render(); return; }
  if (action === 'resume' && saved) { state = saved; resumeAvailable = false; render(); return; }
  if (action === 'capture') { state = capture(state); feedback = state.captures.at(-1)?.kind ?? null; save(); render(); return; }
  if (action === 'finish' && canFinish(state)) { state = { ...state, phase: 'summary' }; const result = summarize(state); scorm.complete(result.score, result.passed); save(); render(); return; }
  if (action === 'continue') { state = { ...state, phase: 'survey' }; save(); render(); return; }
  const moveButton = target.closest<HTMLElement>('[data-move]');
  if (moveButton) { const [dx, dy] = moveButton.dataset.move!.split(',').map(Number); state = move(state, dx, dy); feedback = null; save(); render(); return; }
  const zoneTarget = target.closest<HTMLElement>('[data-zone]');
  if (zoneTarget && state.phase === 'survey') { state = visit(state, zoneTarget.dataset.zone!); feedback = null; save(); render(); return; }
  const recordTarget = target.closest<HTMLElement>('[data-return], [data-pin]');
  if (recordTarget) { const id = Number(recordTarget.dataset.return ?? recordTarget.dataset.pin); const item = state.captures.find(capture => capture.id === id); if (item) { state = { ...visit({ ...state, phase: 'survey' }, item.zoneId), selectedCapture: id }; feedback = null; save(); render(); } }
});

app.addEventListener('keydown', event => {
  if (state.phase !== 'survey' || !(event.target as Element).closest('#survey-map')) return;
  const direction: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  if (!direction[event.key]) return;
  event.preventDefault(); state = move(state, ...direction[event.key]); feedback = null; save(); render(); app.querySelector<SVGElement>('#survey-map')?.focus();
});

render();
