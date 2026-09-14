import '../../../packages/core/src/ui.css';
import './style.css';
import { createScorm } from '../../../packages/core/src/scorm.ts';
import { canFile, capture, evidenceStrength, newGame, restoreGame, type Decision, type GameState, type ViewMode } from './rules.ts';
import { constrainCamera, drawCapture, drawViewport, screenToWorld } from './scene.ts';

const scorm = createScorm('m2-2-thermal-triage');
let state: GameState = restoreGame(scorm.load<GameState>()) ?? newGame();
const app = document.querySelector<HTMLDivElement>('#app')!;
let drag: { x: number; y: number; cameraX: number; cameraY: number; moved: boolean } | null = null;
document.title = 'Drone4Build · Thermal Investigator';
const save = () => scorm.save(state);

function header() {
  return `<header class="game-header"><div><div class="eyebrow">DRONE4BUILD · M2.2</div><strong>◈ Thermal Investigator</strong></div><span class="mode-pill">${scorm.snapshot().mode === 'mock' ? 'Standalone / SCORM mock' : 'Connected to LMS'}</span></header>`;
}
function intro() {
  return `<main class="intro panel"><div class="intro-visual"><span class="thermal-glow"></span><span class="viewfinder">+</span></div><div class="intro-copy"><div class="eyebrow">M2.2 · EVIDENCE LAB</div><h1>Investigate the façade</h1><p>Explore a building through visible and thermal imagery. Capture candidate evidence from different viewpoints, then decide what belongs in the case file.</p><div class="intro-goals"><span>01 Explore the wall</span><span>02 Capture and classify</span><span>03 File the evidence</span></div><button class="primary" data-action="start">Start investigation →</button></div></main>`;
}
const regionName: Record<string,string> = { band:'Wall seam', glass:'Glazed bay', solar:'Solar strip', lowerWall:'Lower wall', context:'Context' };
function evidence() {
  return `<div class="evidence-list">${state.captures.length ? state.captures.map(item => `<article class="evidence-card ${item.decision}"><canvas data-capture="${item.id}" aria-label="Evidence capture ${item.id}"></canvas><div class="evidence-meta"><strong>#${item.id} · ${regionName[item.region]}</strong><span>Viewpoint ${item.viewpoint+2}</span></div><div class="decision-row"><button data-id="${item.id}" data-decision="retain" class="${item.decision === 'retain' ? 'selected' : ''}">Retain</button><button data-id="${item.id}" data-decision="reject" class="${item.decision === 'reject' ? 'selected' : ''}">Reject</button></div></article>`).join('') : '<p class="empty-evidence">No captures yet. Aim at a feature and capture it.</p>'}</div>`;
}
function investigation() {
  return `<main class="game-layout"><section class="viewport-panel"><div class="toolbar"><div><div class="eyebrow">LIVE CAMERA SURVEY</div><h1>Explore the wall</h1></div><div class="view-switch" role="group" aria-label="Imaging mode">${(['rgb','thermal','split'] as ViewMode[]).map(mode => `<button data-mode="${mode}" class="${state.mode === mode ? 'active' : ''}">${mode === 'rgb' ? 'RGB' : mode === 'thermal' ? 'Thermal' : 'Split'}</button>`).join('')}</div></div><div class="canvas-wrap"><canvas id="scene" aria-label="Interactive façade camera. Click to aim; drag to pan."></canvas><div class="scene-tag">${state.mode.toUpperCase()} · Viewpoint ${state.viewpoint+2} / 3</div><div class="reticle-hint">Click to aim · drag to pan · scroll to zoom</div></div><div class="flight-controls"><div class="control-group"><span>Viewpoint</span><button data-action="view-left" aria-label="Move viewpoint left">◀</button><strong>${state.viewpoint+2} / 3</strong><button data-action="view-right" aria-label="Move viewpoint right">▶</button></div><div class="control-group"><span>Zoom</span><button data-action="zoom-out">−</button><strong>${state.zoom.toFixed(1)}×</strong><button data-action="zoom-in">+</button></div><button class="capture-button" data-action="capture" ${state.captures.length >= 8 ? 'disabled' : ''}>◉ Capture at reticle</button></div><div class="field-note">A bright thermal response can be a material pattern or a reflection. Check whether it persists when your viewpoint changes. This simulation does not diagnose a defect.</div></section><aside class="review-panel"><div class="review-heading"><div><div class="eyebrow">CASE FILE</div><h2>Captured evidence</h2></div><span>${state.captures.length}/8</span></div>${evidence()}<div class="file-row"><p>Classify at least three captures from two viewpoints before filing.</p><button class="primary" data-action="file" ${canFile(state) ? '' : 'disabled'}>File evidence →</button></div></aside></main>`;
}
function report() {
  const result=evidenceStrength(state);
  return `<main class="report panel"><div class="eyebrow">EVIDENCE REPORT</div><h1>What did the survey show?</h1><p>The grade reflects repeatability and whether a likely reflection was checked. Thermal color alone is not a defect diagnosis.</p><div class="report-score"><strong>${result.score}%</strong><span>${result.score >= 70 ? 'Evidence ready for review' : 'More investigation recommended'}</span></div><div class="report-findings"><div class="${result.repeatable ? 'confirmed' : ''}"><strong>Persistent wall seam</strong><p>${result.repeatable ? 'Retained captures at different viewpoints support a repeatable thermal pattern.' : 'Capture and retain this seam from two viewpoints to test repeatability.'}</p></div><div class="${result.reflectionChecked ? 'confirmed' : ''}"><strong>Glazed bay reflection</strong><p>${result.reflectionChecked ? 'The changed appearance was checked from different viewpoints and excluded from the case file.' : 'Inspect the glazing from another viewpoint before interpreting its bright response.'}</p></div></div><div class="report-actions"><button data-action="back">Review captures</button><button class="primary" data-action="restart">New investigation</button></div></main>`;
}
function paint() {
  const canvas=document.querySelector<HTMLCanvasElement>('#scene'); if(canvas) drawViewport(canvas,state);
  document.querySelectorAll<HTMLCanvasElement>('[data-capture]').forEach(node => { const item=state.captures.find(entry=>entry.id===Number(node.dataset.capture)); if(item) drawCapture(node,item,'thermal'); });
}
function render() { app.innerHTML=`<div class="thermal-shell">${header()}${state.phase==='intro'?intro():state.phase==='report'?report():investigation()}</div>`; paint(); }
function updateZoom(next:number) { state.zoom=Math.max(1,Math.min(3,Math.round(next*10)/10)); save(); render(); }
app.addEventListener('click', event=>{
  const target=event.target as HTMLElement;
  const mode=target.closest<HTMLButtonElement>('[data-mode]')?.dataset.mode as ViewMode|undefined;
  if(mode){state.mode=mode;save();render();return;}
  const decisionButton=target.closest<HTMLButtonElement>('[data-decision]');
  if(decisionButton){const item=state.captures.find(entry=>entry.id===Number(decisionButton.dataset.id));if(item){item.decision=decisionButton.dataset.decision as Decision;save();render();}return;}
  const action=target.closest<HTMLButtonElement>('[data-action]')?.dataset.action;if(!action)return;
  if(action==='start'){state.phase='investigate';save();render();}
  else if(action==='view-left'||action==='view-right'){state.viewpoint=Math.max(-1,Math.min(1,state.viewpoint+(action==='view-left'?-1:1))) as -1|0|1;save();render();}
  else if(action==='zoom-in'||action==='zoom-out')updateZoom(state.zoom+(action==='zoom-in'?.25:-.25));
  else if(action==='capture'){capture(state);save();render();}
  else if(action==='file'&&canFile(state)){state.phase='report';const result=evidenceStrength(state);scorm.complete(result.score,result.score>=70);save();render();}
  else if(action==='back'){state.phase='investigate';save();render();}
  else if(action==='restart'){state=newGame();save();render();}
});
app.addEventListener('pointerdown',event=>{const canvas=(event.target as HTMLElement).closest<HTMLCanvasElement>('#scene');if(!canvas)return;drag={x:event.clientX,y:event.clientY,cameraX:state.camera.x,cameraY:state.camera.y,moved:false};canvas.setPointerCapture(event.pointerId);});
app.addEventListener('pointermove',event=>{const canvas=document.querySelector<HTMLCanvasElement>('#scene');if(!drag||!canvas)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>4)drag.moved=true;if(!drag.moved)return;const r=canvas.getBoundingClientRect();const unit=screenToWorld(state,r.width,r.height,r.width+1,r.height).x-screenToWorld(state,r.width,r.height,r.width,r.height).x;state.camera.x=drag.cameraX-dx*unit;state.camera.y=drag.cameraY-dy*unit;constrainCamera(state);paint();});
app.addEventListener('pointerup',event=>{const canvas=document.querySelector<HTMLCanvasElement>('#scene');if(!drag||!canvas)return;if(!drag.moved){const r=canvas.getBoundingClientRect();state.reticle=screenToWorld(state,r.width,r.height,event.clientX-r.left,event.clientY-r.top);constrainCamera(state);}drag=null;save();paint();});
app.addEventListener('wheel',event=>{if(!(event.target as HTMLElement).closest('#scene'))return;event.preventDefault();updateZoom(state.zoom+(event.deltaY<0?.2:-.2));},{passive:false});
window.addEventListener('resize',paint);
render();
