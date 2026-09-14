import '../../../packages/core/src/ui.css';
import './style.css';
import en from '../locales/en.json';
import { createScorm } from '../../../packages/core/src/scorm';
import { createTranslator } from '../../../packages/core/src/locale';
import { ANCHORS, CENTER, EXISTING_OPENING, PLANNED_OPENING, anchorErrors, canRegister, fresh, restore, transformPoint, tryInspect, type GameState, type Point } from './rules';

const dictionaries = Object.fromEntries(Object.entries(import.meta.glob<Record<string, string>>('../locales/*.json', { eager: true, import: 'default' }))
  .map(([path, messages]) => [path.match(/\/([^/]+)\.json$/)?.[1] ?? 'en', messages]));
const { t, locale } = createTranslator(en, dictionaries);
document.documentElement.lang = locale;
document.title = `Drone4Build · ${t('title')}`;
const scorm = createScorm('m3-2-digital-handover');
const app = document.querySelector<HTMLDivElement>('#app')!;
const saved = restore(scorm.load<GameState>());
let state: GameState = fresh();
let resumeAvailable = !!saved && saved.phase !== 'intro';
type Drag = { mode: 'move' | 'rotate'; last: Point; lastAngle: number; pointerId: number };
let drag: Drag | null = null;

function esc(s: string) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!); }
function tx(key: string, values?: Record<string, string | number>) { return esc(t(key, values)); }
function persist() { scorm.save(state); }
const names = ['A', 'B', 'C'];
const BUILDING = 'M210 160 H620 V260 H750 V500 H210 Z';

function dotLine(a: Point, b: Point, step = 10, cls = 'survey-dot') {
  const count = Math.max(2, Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / step));
  return Array.from({ length: count + 1 }, (_, i) => {
    const f = i / count, wobble = Math.sin(i * 19.3) * 1.4;
    return `<circle class="${cls}" cx="${(a.x + (b.x - a.x) * f + wobble).toFixed(1)}" cy="${(a.y + (b.y - a.y) * f - wobble).toFixed(1)}" r="${i % 4 === 0 ? 2.7 : 1.9}"/>`;
  }).join('');
}
function dottedRect(x: number, y: number, w: number, h: number, cls: string) {
  const p = [{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
  return p.map((a,i)=>dotLine(a,p[(i+1)%4],6,cls)).join('');
}
const perimeter = [{x:210,y:160},{x:620,y:160},{x:620,y:260},{x:750,y:260},{x:750,y:500},{x:210,y:500}];
const cloudDots = perimeter.map((p,i)=>dotLine(p,perimeter[(i+1)%perimeter.length])).join('') +
  dotLine({x:210,y:300},{x:750,y:300},13,'survey-dot secondary') +
  dotLine({x:470,y:160},{x:470,y:500},12,'survey-dot secondary') +
  dotLine({x:210,y:500},{x:620,y:160},17,'survey-dot secondary');
const fineDots = dottedRect(EXISTING_OPENING.x,EXISTING_OPENING.y,EXISTING_OPENING.width,EXISTING_OPENING.height,'survey-dot detail');

function intro() {
  return `<main class="slice-shell intro"><div class="eyebrow">${tx('brand')}</div><div class="intro-grid"><section><h1>${tx('introTitle')}</h1><p>${tx('introBody')}</p><div class="actions"><button class="btn-primary" data-action="start">${tx('start')}</button>${resumeAvailable ? `<button data-action="resume">${tx('resume')}</button><button data-action="restart">${tx('restart')}</button>` : ''}</div><p class="small-note">${tx('provisional')}</p></section><div class="intro-illustration" aria-hidden="true"><svg viewBox="0 0 460 320"><path d="M55 50 H320 V110 H400 V270 H55 Z" fill="#193b4a" stroke="#7aa9c6" stroke-width="4"/><g transform="translate(40 -28) rotate(11 230 165)">${dotLine({x:55,y:50},{x:320,y:50},8)}${dotLine({x:320,y:50},{x:400,y:270},8)}${dotLine({x:400,y:270},{x:55,y:270},8)}</g><circle cx="55" cy="50" r="10" fill="#e9be64"/><circle cx="320" cy="50" r="10" fill="#e9be64"/><circle cx="400" cy="270" r="10" fill="#e9be64"/></svg></div></div></main>`;
}

function viewport() {
  const surveyTransform = `translate(${state.transform.dx.toFixed(2)} ${state.transform.dy.toFixed(2)}) rotate(${state.transform.angle.toFixed(2)} ${CENTER.x} ${CENTER.y})`;
  const errors = anchorErrors(state.transform);
  const comparing = state.phase !== 'register';
  return `<svg id="viewport" class="viewport ${comparing?'comparing':'registering'}" viewBox="0 0 920 620" tabindex="0" role="application" aria-label="${tx('viewLabel')}">
    <defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0 H0 V32" fill="none" stroke="#284354" stroke-width="1"/></pattern><clipPath id="reveal"><rect id="clip-rect" x="180" y="130" width="${(600*state.clip/100).toFixed(1)}" height="400"/></clipPath><filter id="glow"><feGaussianBlur stdDeviation="6"/></filter></defs>
    <rect width="920" height="620" fill="#0b1e2c"/><rect width="920" height="620" fill="url(#grid)"/>
    <path d="M20 545 H900" stroke="#778c8e" stroke-width="32" opacity=".27"/><path d="M20 545 H900" stroke="#c8b885" stroke-width="2" stroke-dasharray="25 18" opacity=".55"/>
    <text x="42" y="586" class="map-label">${tx('road')}</text><text x="222" y="145" class="map-label">${tx('building')}</text>
    <path d="${BUILDING}" fill="#1b3547" stroke="#7598ae" stroke-width="5"/>
    <path d="M210 300 H750 M470 160 V500 M210 500 L620 160" fill="none" stroke="#62899e" stroke-width="2" opacity=".58"/>
    <rect x="${PLANNED_OPENING.x}" y="${PLANNED_OPENING.y}" width="${PLANNED_OPENING.width}" height="${PLANNED_OPENING.height}" fill="#152636" stroke="#b5d3e8" stroke-width="3" stroke-dasharray="8 5"/>
    ${comparing ? `<text x="${PLANNED_OPENING.x-2}" y="${PLANNED_OPENING.y-13}" class="map-label planned-label">${tx('planOpening')}</text>` : ''}
    <g id="tethers">${ANCHORS.map((a,i)=>{const moved=transformPoint(a,state.transform);return `<line id="tether-${i}" x1="${a.x}" y1="${a.y}" x2="${moved.x.toFixed(1)}" y2="${moved.y.toFixed(1)}" class="tether ${errors[i]<20?'near':''}"/>`;}).join('')}</g>
    ${ANCHORS.map((a,i)=>`<g class="model-anchor"><circle cx="${a.x}" cy="${a.y}" r="17"/><text x="${a.x}" y="${a.y+5}" text-anchor="middle">${names[i]}</text></g>`).join('')}
    <g id="cloud" transform="${surveyTransform}" style="opacity:${state.opacity}">
      <path d="${BUILDING}" class="cloud-hit" data-drag="move" aria-label="${tx('moveLayer')}"/>
      <g pointer-events="none">${cloudDots}</g>
      <g id="fine" clip-path="url(#reveal)" pointer-events="none" style="display:${comparing?'':'none'}">${fineDots}</g>
      ${ANCHORS.map((a,i)=>`<g class="survey-anchor" pointer-events="none"><circle cx="${a.x}" cy="${a.y}" r="12"/><text x="${a.x}" y="${a.y+4}" text-anchor="middle">${names[i]}</text></g>`).join('')}
      <path d="M470 330 V102" class="rotation-stem" pointer-events="none"/><circle cx="470" cy="102" r="20" class="rotation-handle" data-drag="rotate" aria-label="${tx('rotationHandle')}"/><path d="M461 102 A9 9 0 1 1 477 108" class="rotation-icon" pointer-events="none"/>
    </g>
    ${comparing ? `<line id="sweep-line" x1="${180+600*state.clip/100}" y1="145" x2="${180+600*state.clip/100}" y2="520" class="sweep-line"/><text x="${EXISTING_OPENING.x}" y="${EXISTING_OPENING.y+90}" class="map-label actual-label" style="display:${state.phase==='solved'?'':'none'}">${tx('actualOpening')}</text>` : ''}
    ${state.lastMark ? `<circle cx="${state.lastMark.x}" cy="${state.lastMark.y}" r="38" class="inspection-mark ${state.phase==='solved'?'found':'miss'}" pointer-events="none"/>` : ''}
    <text x="34" y="40" class="viewport-caption">${tx('site')}</text>
  </svg>`;
}

function workspace() {
  const errors = anchorErrors(state.transform);
  const phaseKey = state.phase==='register'?'stageRegister':state.phase==='compare'?'stageCompare':'stageSolved';
  const helpKey = state.phase==='register'?'registerHelp':state.phase==='compare'?'compareHelp':'solvedHelp';
  return `<main class="slice-shell"><header class="top"><div><div class="eyebrow">${tx('brand')}</div><h1>${tx('title')}</h1></div><span class="phase-badge">${tx(state.phase==='register'?'badgeRegister':state.phase==='compare'?'badgeCompare':'badgeSolved')}</span></header>
    <div class="play-layout"><div class="world-panel"><div class="world-title"><span>${tx('model')}</span><span>${tx('survey')}</span></div>${viewport()}<div class="under-map"><span>${tx(state.phase==='register'?'ghost':state.phase==='compare'?'inspectHint':'feedback.found')}</span><span>${tx('provisional')}</span></div></div>
    <aside class="instrument-panel"><p class="eyebrow">${tx(phaseKey)}</p><h2>${tx(phaseKey)}</h2><p>${tx(helpKey)}</p>
      <div class="anchor-readout" aria-live="polite">${ANCHORS.map((_,i)=>`<div class="anchor-row"><b>${tx('anchor',{name:names[i]})}</b><span id="error-${i}">${tx('anchorStatus',{name:names[i],distance:Math.round(errors[i])})}</span><i id="lamp-${i}" class="lamp ${errors[i]<20?'near':''}"></i></div>`).join('')}</div>
      <div class="registration-status" id="registration-status">${tx(state.phase==='register'?'anchorsNotReady':'anchorsReady')}</div>
      ${state.phase==='register' ? `<p class="small-note">${tx('snapHint')}</p><button data-action="reset">${tx('reset')}</button>` : `<div class="compare-tools"><label>${tx('opacity')}<input id="opacity" type="range" min="20" max="100" value="${Math.round(state.opacity*100)}"/></label><label>${tx('clip')}<input id="clip" type="range" min="5" max="100" value="${state.clip}"/></label></div>`}
      ${state.feedback ? `<div class="feedback ${state.phase==='solved'?'good':''}" role="status">${tx(state.feedback)}</div>` : ''}
      <p class="keyboard-note">${tx('keyboard')}</p><div class="status-bottom">${tx('performance',{count:state.falseMarks})}</div>
      ${state.phase==='solved' ? `<button class="btn-primary" data-action="replay">${tx('replay')}</button>` : ''}
    </aside></div></main>`;
}

function render() { app.innerHTML = state.phase==='intro' ? intro() : workspace(); }
function svgPoint(svg: SVGSVGElement, e: PointerEvent | MouseEvent): Point {
  const point = svg.createSVGPoint(); point.x=e.clientX; point.y=e.clientY;
  const local=point.matrixTransform(svg.getScreenCTM()!.inverse()); return {x:local.x,y:local.y};
}
function liveTransform() {
  const cloud=app.querySelector<SVGGElement>('#cloud'); if (!cloud) return;
  cloud.setAttribute('transform',`translate(${state.transform.dx.toFixed(2)} ${state.transform.dy.toFixed(2)}) rotate(${state.transform.angle.toFixed(2)} ${CENTER.x} ${CENTER.y})`);
  const errors=anchorErrors(state.transform);
  ANCHORS.forEach((a,i)=>{
    const moved=transformPoint(a,state.transform);
    const tether=app.querySelector<SVGLineElement>(`#tether-${i}`)!;
    tether.setAttribute('x2',String(moved.x));tether.setAttribute('y2',String(moved.y));tether.classList.toggle('near',errors[i]<20);
    app.querySelector(`#error-${i}`)!.textContent=t('anchorStatus',{name:names[i],distance:Math.round(errors[i])});
    app.querySelector(`#lamp-${i}`)!.classList.toggle('near',errors[i]<20);
  });
  app.querySelector('#registration-status')!.textContent=t(canRegister(state.transform)?'anchorsReady':'anchorsNotReady');
}
function maybeLock() {
  if (state.phase !== 'register' || !canRegister(state.transform)) { persist(); return; }
  state={...state, phase:'compare', transform:{dx:0,dy:0,angle:0}, feedback:'feedback.lock'};
  persist();render();app.querySelector<SVGSVGElement>('#viewport')?.focus();
}

app.addEventListener('click',e=>{
  const button=(e.target as Element).closest<HTMLButtonElement>('[data-action]');
  if(button){
    const action=button.dataset.action;
    if(action==='start'||action==='restart'||action==='reset'||action==='replay'){state={...fresh(),phase:'register'};resumeAvailable=false;persist();render();app.querySelector<SVGSVGElement>('#viewport')?.focus();return;}
    if(action==='resume'&&saved){state=saved;resumeAvailable=false;render();return;}
  }
  const svg=(e.target as Element).closest<SVGSVGElement>('#viewport');
  if(svg&&state.phase==='compare'&&!drag){state=tryInspect(state,svgPoint(svg,e as MouseEvent));persist();if(state.phase==='solved')scorm.complete(100,true);render();}
});

app.addEventListener('pointerdown',e=>{
  if(state.phase!=='register')return;
  const target=(e.target as Element).closest<SVGElement>('[data-drag]');
  const svg=app.querySelector<SVGSVGElement>('#viewport');
  if(!target||!svg)return;
  const point=svgPoint(svg,e);
  const center={x:CENTER.x+state.transform.dx,y:CENTER.y+state.transform.dy};
  drag={mode:target.getAttribute('data-drag') as Drag['mode'],last:point,lastAngle:Math.atan2(point.y-center.y,point.x-center.x),pointerId:e.pointerId};
  svg.setPointerCapture(e.pointerId);svg.focus();e.preventDefault();
});
app.addEventListener('pointermove',e=>{
  if(!drag||drag.pointerId!==e.pointerId)return;
  const svg=app.querySelector<SVGSVGElement>('#viewport')!;
  const point=svgPoint(svg,e);
  if(drag.mode==='move'){state.transform.dx+=point.x-drag.last.x;state.transform.dy+=point.y-drag.last.y;}
  else{const center={x:CENTER.x+state.transform.dx,y:CENTER.y+state.transform.dy};const angle=Math.atan2(point.y-center.y,point.x-center.x);let diff=(angle-drag.lastAngle)*180/Math.PI;if(diff>180)diff-=360;if(diff<-180)diff+=360;state.transform.angle+=diff;drag.lastAngle=angle;}
  drag.last=point;liveTransform();
});
app.addEventListener('pointerup',e=>{if(!drag||drag.pointerId!==e.pointerId)return;drag=null;maybeLock();});
app.addEventListener('pointercancel',()=>{if(drag){drag=null;persist();}});
app.addEventListener('keydown',e=>{
  if(state.phase!=='register'||(e.target as Element).id!=='viewport')return;
  const key=e.key.toLowerCase();
  if(key==='arrowleft')state.transform.dx-=5;
  else if(key==='arrowright')state.transform.dx+=5;
  else if(key==='arrowup')state.transform.dy-=5;
  else if(key==='arrowdown')state.transform.dy+=5;
  else if(key==='q')state.transform.angle-=1;
  else if(key==='e')state.transform.angle+=1;
  else return;
  e.preventDefault();liveTransform();maybeLock();
});
app.addEventListener('input',e=>{
  const input=e.target as HTMLInputElement;
  if(input.id==='opacity'){state.opacity=Number(input.value)/100;const cloud=app.querySelector<SVGGElement>('#cloud');if(cloud)cloud.style.opacity=String(state.opacity);}
  if(input.id==='clip'){state.clip=Number(input.value);app.querySelector('#clip-rect')?.setAttribute('width',String(600*state.clip/100));const x=180+600*state.clip/100;const line=app.querySelector('#sweep-line');line?.setAttribute('x1',String(x));line?.setAttribute('x2',String(x));}
});
app.addEventListener('change',e=>{if((e.target as HTMLElement).matches('input[type=range]'))persist();});
render();
