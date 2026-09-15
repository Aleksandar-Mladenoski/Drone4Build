import '../../../packages/core/src/ui.css';
import './style.css';
import en from '../locales/en.json';
import { createScorm } from '../../../packages/core/src/scorm.ts';
import { createTranslator } from '../../../packages/core/src/locale.ts';
import { REGIONS, canFinalize, canQuarantine, fresh, integrity, mismatch, outcome, patternDiscovered, regionById, restore, verify, type EvidenceLayer, type GameState, type Region, type RegionId } from './rules.ts';

const dictionaries=Object.fromEntries(Object.entries(import.meta.glob<Record<string,string>>('../locales/*.json',{eager:true,import:'default'}))
  .map(([path,messages])=>[path.match(/\/([^/]+)\.json$/)?.[1]??'en',messages]));
const {t,locale}=createTranslator(en,dictionaries);
const scorm=createScorm('m4-1-blind-spot');
const app=document.querySelector<HTMLDivElement>('#app')!;
document.documentElement.lang=locale;
document.title=`Drone4Build · ${t('title')}`;
let state=restore(scorm.load<GameState>())??fresh();
const esc=(value:string|number)=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const tx=(key:string,values?:Record<string,string|number>)=>esc(t(key,values));
const save=()=>scorm.save(state);

function header(){
  return `<header class="app-header"><div class="brand"><span class="brand-block">D<span>4</span>B</span><div><small>${tx('course')}</small><strong>${tx('title')} <i>${tx('subtitle')}</i></strong></div></div><div class="mode"><i></i>${tx(scorm.snapshot().mode==='mock'?'mode.mock':'mode.lms')}</div></header>`;
}
function materialDetail(r:Region){
  if(r.material==='cladding') return `<g class="cladding-ribs">${Array.from({length:7},(_,i)=>`<path d="M${r.x+12+i*18} ${r.y+8}V${r.y+r.h-8}"/>`).join('')}${Array.from({length:4},(_,i)=>`<circle cx="${r.x+18+(i%2)*92}" cy="${r.y+22+Math.floor(i/2)*(r.h-44)}" r="3"/>`).join('')}</g>`;
  const windowY=r.y+31,windowH=Math.min(70,r.h-55);
  return `<path class="panel-seam" d="M${r.x+r.w/2} ${r.y+8}V${r.y+r.h-8}"/><g class="windows"><rect x="${r.x+18}" y="${windowY}" width="${r.w/2-27}" height="${windowH}"/><rect x="${r.x+r.w/2+9}" y="${windowY}" width="${r.w/2-27}" height="${windowH}"/></g>`;
}
function aiMark(r:Region){
  if(r.ai==='detected'){
    const bx=r.material==='cladding'?r.x+43:r.x+45,by=r.y+40,bw=r.material==='cladding'?50:70,bh=Math.min(64,r.h-58);
    return `<g class="ai-detection"><path d="M${bx+12} ${by}H${bx}V${by+12}M${bx+bw-12} ${by}H${bx+bw}V${by+12}M${bx} ${by+bh-12}V${by+bh}H${bx+12}M${bx+bw-12} ${by+bh}H${bx+bw}V${by+bh-12}"/><rect x="${bx}" y="${by}" width="${bw}" height="${bh}"/><text x="${r.x+10}" y="${r.y+r.h-11}">${tx('board.detected')} · ${tx('board.confidence',{value:r.confidence})}</text></g>`;
  }
  return `<g class="ai-clean"><circle cx="${r.x+r.w-20}" cy="${r.y+20}" r="7"/><path d="M${r.x+r.w-23} ${r.y+20}l2 2 4-5"/><text x="${r.x+10}" y="${r.y+r.h-11}">${tx('board.clean')} · ${tx('board.confidence',{value:r.confidence})}</text></g>`;
}
function regionMark(r:Region){
  if(!state.checked.includes(r.id)) return '';
  const changed=mismatch(r);
  return `<g class="human-mark ${changed?'corrected':'validated'}"><circle cx="${r.x+r.w-19}" cy="${r.y+r.h-22}" r="13"/><path d="${changed?`M${r.x+r.w-25} ${r.y+r.h-28}l12 12m0-12-12 12`:`M${r.x+r.w-25} ${r.y+r.h-22}l4 4 8-10`}"/></g>`;
}
function building(report=false){
  const result=integrity(state);
  return `<svg class="building-board ${report?'report-board':''}" viewBox="0 0 1000 650" role="group" aria-label="${tx('board.title')}">
    <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#7babb1"/><stop offset="1" stop-color="#c6d3c9"/></linearGradient><linearGradient id="glass" x2="0" y2="1"><stop stop-color="#183c4b"/><stop offset=".48" stop-color="#356572"/><stop offset=".5" stop-color="#87adb0"/><stop offset="1" stop-color="#244c59"/></linearGradient><pattern id="reviewHatch" width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V13" stroke="#f4b94f" stroke-width="4" opacity=".34"/></pattern><filter id="shadow"><feDropShadow dx="0" dy="13" stdDeviation="12" flood-opacity=".25"/></filter></defs>
    <rect width="1000" height="650" fill="url(#sky)"/><path class="city" d="M0 400h65V255h48v98h54v-76h40v123h95v250H0zm875 0V224h43v82h42v-39h40v383H820V400z"/>
    <path class="ground" d="M0 560L1000 528V650H0Z"/><g filter="url(#shadow)"><path class="building-side" d="M105 120l43 20v434l-43 30z"/><path class="building-shell" d="M148 118h704l34 25-36 431H148z"/><path class="roof" d="M148 118l34-25h683l21 50-34-25z"/>
    ${REGIONS.map(r=>`<g class="region ${r.material} ${state.selected===r.id?'selected':''} ${state.checked.includes(r.id)?'checked':''} ${state.claddingQuarantined&&r.material==='cladding'&&!state.checked.includes(r.id)?'redirected':''}" ${report?'role="group"':`data-region="${r.id}" role="button" tabindex="0"`} aria-label="${tx('panel.bay',{bay:r.bay})}, ${tx(`panel.ai.${r.ai}`,{value:r.confidence})}"><rect class="region-panel" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>${materialDetail(r)}<text class="bay-label" x="${r.x+10}" y="${r.y+19}">${r.bay}</text>${aiMark(r)}${regionMark(r)}</g>`).join('')}
    ${state.claddingQuarantined?`<g class="review-zone"><rect x="700" y="134" width="151" height="442" fill="url(#reviewHatch)"/><path d="M696 130h159v450H696z"/><text x="842" y="123" text-anchor="end">${tx('board.reviewZone')}</text></g>`:''}
    <path class="building-base" d="M137 574h725l-18 25H124z"/></g>
    ${report&&result.unresolved>0?`<g class="risk-beacon"><circle cx="903" cy="88" r="22"/><text x="903" y="95" text-anchor="middle">!</text></g>`:''}
  </svg>`;
}
function hud(){
  const found=patternDiscovered(state),one=canQuarantine(state);
  return `<div class="audit-hud"><div><span>${tx('hud.probes')}</span><strong>${state.probes}<small>/ 6</small></strong><div class="probe-pips">${Array.from({length:6},(_,i)=>`<i class="${i<state.probes?'live':''}"></i>`).join('')}</div></div><div><span>${tx('hud.checked')}</span><strong>${state.checked.length}<small>/ 12</small></strong></div><div class="reliability ${found?'found':one?'testing':''}"><span>${tx('hud.context')}</span><strong>${tx(found?'hud.contextFound':one?'hud.contextTesting':'hud.contextOpen')}</strong></div></div>`;
}
function intro(){
  return `<div class="blind-shell">${header()}<main class="intro-stage"><div class="intro-building">${building()}</div><section class="intro-card"><div class="eyebrow">${tx('intro.eyebrow')}</div><h1>${tx('intro.title')}</h1><p>${tx('intro.body')}</p><div class="intro-rules"><span>${tx('intro.rule1')}</span><span>${tx('intro.rule2')}</span><span>${tx('intro.rule3')}</span></div><div class="intro-callout">${tx('intro.callout')}</div><button class="launch" data-action="start">${tx('intro.start')} <b>→</b></button></section></main></div>`;
}
function evidenceArt(r:Region){
  const issue=r.truth==='issue';
  const defect=issue?`<path class="raw-defect" d="M245 54l-12 42 17 25-13 38 16 34-8 40"/><path class="defect-edge" d="M248 55l-11 41 18 25-14 38 15 34-7 40"/>`:'';
  const texture=r.material==='cladding'?`${Array.from({length:15},(_,i)=>`<path class="e-rib" d="M${28+i*31} 20V254"/>`).join('')}<path class="bright-seam" d="M246 20V254"/>`:`<path class="concrete-seams" d="M20 86H505M20 174H505M170 20V254M350 20V254"/>`;
  const ai=r.ai==='detected'?`<g class="e-ai"><rect x="209" y="43" width="81" height="191"/><path d="M224 43h-15v15m81 0V43h-15m-51 191h-15v-15m81 0v15h-15"/></g>`:`<g class="no-mask"><circle cx="250" cy="138" r="25"/><path d="M239 138l8 8 16-19"/></g>`;
  const focusTarget=r.ai==='detected'?250:(r.material==='cladding'?405:360);
  const focus=`<g class="focus-map"><ellipse cx="${focusTarget}" cy="135" rx="78" ry="107"/><ellipse cx="${focusTarget+20}" cy="98" rx="45" ry="56"/><circle cx="${focusTarget-15}" cy="180" r="35"/></g>`;
  const context=`<g class="context-layer"><rect x="20" y="20" width="485" height="234"/><text x="34" y="48">${tx(r.material==='cladding'?'evidence.contextCladding':'evidence.contextConcrete')}</text>${r.material==='cladding'?'<path d="M56 63V232M93 63V232M130 63V232M167 63V232M204 63V232M241 63V232M278 63V232M315 63V232M352 63V232M389 63V232M426 63V232M463 63V232"/>':'<path d="M36 74H487M36 167H487"/>'}</g>`;
  const referenceTexture=r.material==='cladding'?Array.from({length:6},(_,i)=>`<path class="e-rib" d="M${566+i*27} 58V223"/>`).join(''):`<path class="concrete-seams" d="M545 108H732M630 48V233"/>`;
  return `<svg class="evidence-art layer-${state.evidenceLayer}" style="--overlay:${state.overlay}" viewBox="0 0 760 280" aria-label="${tx('panel.bay',{bay:r.bay})} ${tx('panel.selected')}"><defs><linearGradient id="frameBg" x2="0" y2="1"><stop stop-color="${r.material==='cladding'?'#718e92':'#a2aaa0'}"/><stop offset="1" stop-color="${r.material==='cladding'?'#3f6469':'#747c73'}"/></linearGradient><radialGradient id="heat"><stop stop-color="#fff176" stop-opacity=".88"/><stop offset=".4" stop-color="#ff8a3d" stop-opacity=".65"/><stop offset="1" stop-color="#de305d" stop-opacity="0"/></radialGradient><filter id="grain"><feTurbulence baseFrequency=".75" numOctaves="2" seed="7" result="n"/><feBlend in="SourceGraphic" in2="n" mode="soft-light"/></filter></defs><rect x="20" y="20" width="485" height="234" rx="5" fill="url(#frameBg)" filter="url(#grain)"/><g class="raw-surface">${texture}${defect}</g>${ai}${focus}${context}<g class="frame-label"><text x="31" y="270">${tx('evidence.raw')}</text><text x="548" y="270">${tx('evidence.reference')}</text></g><rect x="535" y="38" width="205" height="205" rx="4" fill="url(#frameBg)"/>${referenceTexture}<path class="reference-bracket" d="M550 57h14m-14 0v14m175-14h-14m14 0v14m-175 151h14m-14 0v-14m175 14h-14m14 0v-14"/>${r.ai==='clean'&&state.evidenceLayer==='ai'?`<text class="mask-label" x="261" y="145" text-anchor="middle">${tx('evidence.noMask')}</text>`:''}</svg>`;
}
function resultKey(r:Region){return `outcome.${outcome(r)}`;}
function patternCopy(){return tx(patternDiscovered(state)?'pattern.found':canQuarantine(state)?'pattern.one':'pattern.none');}
function forensic(){
  if(!state.selected) return `<aside class="forensic empty"><div class="scan-glyph"><i></i><i></i><i></i></div><div><div class="eyebrow">${tx('panel.selected')}</div><h2>${tx('panel.emptyTitle')}</h2><p>${tx('panel.emptyBody')}</p></div></aside>`;
  const r=regionById(state.selected),checked=state.checked.includes(r.id);
  return `<aside class="forensic" id="forensic"><div class="forensic-head"><div><div class="eyebrow">${tx('panel.selected')}</div><h2>${tx('panel.bay',{bay:r.bay})} <span>${tx(`panel.material.${r.material}`)}</span></h2><p>${tx(`panel.ai.${r.ai}`,{value:r.confidence})}</p></div><button class="close" data-action="close" aria-label="Close">×</button></div><div class="layer-tools">${(['raw','ai','focus','context'] as EvidenceLayer[]).map(layer=>`<button data-layer="${layer}" class="${state.evidenceLayer===layer?'active':''}">${tx(`layer.${layer}`)}</button>`).join('')}<label>${tx('layer.opacity')} <input type="range" min="0" max="1" step=".05" value="${state.overlay}" data-opacity/><output>${Math.round(state.overlay*100)}%</output></label></div>${evidenceArt(r)}<div class="verification-strip"><div class="finding ${checked?(mismatch(r)?'changed':'held'):''}">${checked?`<strong>${tx('verify.used')}</strong><p>${tx(resultKey(r))}</p>`:`<strong>${patternCopy()}</strong><p>${tx('panel.inspectPrompt')}</p>`}</div>${checked?'<span class="verified-seal">H</span>':`<button class="verify" data-action="verify" ${state.probes<=0?'disabled':''}>${tx(state.probes<=0?'verify.none':'verify.action')} <b>${state.probes}</b></button>`}</div>
  ${r.material==='cladding'?`<div class="zone-action"><div><strong>${tx(state.claddingQuarantined?'quarantine.active':'quarantine.action')}</strong><small>${canQuarantine(state)?patternCopy():tx('quarantine.hint')}</small></div><button data-action="quarantine" class="zone-button ${state.claddingQuarantined?'active':''}" ${!canQuarantine(state)?'disabled':''}>${state.claddingQuarantined?'✓':'＋'}</button></div>`:''}</aside>`;
}
function audit(){
  return `<div class="blind-shell">${header()}${hud()}<main class="audit-layout"><section class="board-panel"><div class="board-head"><div><div class="eyebrow">${tx('board.label')}</div><h1>${tx('board.title')}</h1></div><p>${tx('board.help')}</p></div>${building()}<div class="legend"><span class="detected">${tx('legend.detected')}</span><span class="clean">${tx('legend.clean')}</span><span class="valid">${tx('legend.validated')}</span><span class="corrected">${tx('legend.corrected')}</span><span class="review">${tx('legend.review')}</span></div></section>${forensic()}</main><footer class="audit-footer"><p>${canFinalize(state)?patternCopy():tx('audit.minimum')}</p><button data-action="finish" ${!canFinalize(state)?'disabled':''}>${tx('audit.finish')} →</button><small>${tx('footer.scenario')}</small></footer></div>`;
}
function report(){
  const result=integrity(state);
  return `<div class="blind-shell report-shell">${header()}<main class="report-layout"><section class="report-map"><div class="board-head"><div><div class="eyebrow">${tx('report.eyebrow')}</div><h1>${tx(result.passed?'report.strongTitle':'report.weakTitle')}</h1></div><strong class="integrity-score ${result.passed?'pass':'risk'}">${tx('report.score',{value:result.score})}</strong></div>${building(true)}</section><aside class="report-panel"><p>${tx(result.passed?'report.strongBody':'report.weakBody')}</p><div class="report-grid"><div><strong>${result.validated}</strong><span>${tx('report.validated')}</span></div><div><strong>${result.corrected}</strong><span>${tx('report.corrected')}</span></div><div><strong>${result.reviewRequired}</strong><span>${tx('report.review')}</span></div><div class="${result.unresolved?'risk':''}"><strong>${result.unresolved}</strong><span>${tx('report.unresolved')}</span></div></div><div class="report-tests"><p class="${result.mixedSampling?'yes':'no'}">${result.mixedSampling?'✓':'!'} ${tx(result.mixedSampling?'report.mixed':'report.oneSided')}</p><p class="${result.blindSpot?'yes':'no'}">${result.blindSpot?'✓':'!'} ${tx(result.blindSpot?'report.pattern':'report.noPattern')}</p></div><button data-action="revise">${tx('report.revise')}</button><button class="secondary" data-action="replay">${tx('report.replay')}</button></aside></main></div>`;
}
function render(){app.innerHTML=state.phase==='intro'?intro():state.phase==='report'?report():audit();}
function choose(id:RegionId){state={...state,selected:id,evidenceLayer:'ai'};save();render();}

app.addEventListener('click',event=>{
  const target=event.target as HTMLElement;
  const region=target.closest<SVGGElement>('[data-region]')?.dataset.region as RegionId|undefined;
  if(region&&state.phase==='audit'){choose(region);return;}
  const layer=target.closest<HTMLButtonElement>('[data-layer]')?.dataset.layer as EvidenceLayer|undefined;
  if(layer){state={...state,evidenceLayer:layer};save();render();return;}
  const action=target.closest<HTMLButtonElement>('[data-action]')?.dataset.action;
  if(action==='start'){state=fresh('audit');save();render();}
  else if(action==='close'){state={...state,selected:null};save();render();}
  else if(action==='verify'&&state.selected){state=verify(state,state.selected);save();render();}
  else if(action==='quarantine'&&canQuarantine(state)){state={...state,claddingQuarantined:!state.claddingQuarantined};save();render();}
  else if(action==='finish'&&canFinalize(state)){const result=integrity(state);state={...state,phase:'report',selected:null};save();scorm.complete(result.score,result.passed);render();window.scrollTo({top:0,behavior:'smooth'});}
  else if(action==='revise'){state={...state,phase:'audit'};save();render();}
  else if(action==='replay'){state=fresh('audit');save();render();window.scrollTo({top:0,behavior:'smooth'});}
});
app.addEventListener('keydown',event=>{
  if(event.key!=='Enter'&&event.key!==' ')return;
  const region=(event.target as HTMLElement).closest<SVGGElement>('[data-region]')?.dataset.region as RegionId|undefined;
  if(region&&state.phase==='audit'){event.preventDefault();choose(region);}
});
app.addEventListener('input',event=>{
  const input=(event.target as HTMLElement).closest<HTMLInputElement>('[data-opacity]');if(!input)return;
  state={...state,overlay:Number(input.value)};
  document.querySelector<SVGElement>('.evidence-art')?.style.setProperty('--overlay',String(state.overlay));
  const output=input.parentElement?.querySelector('output');if(output)output.textContent=`${Math.round(state.overlay*100)}%`;
});
app.addEventListener('change',event=>{if((event.target as HTMLElement).matches('[data-opacity]'))save();});
window.addEventListener('beforeunload',()=>scorm.finish());
render();
