import '../packages/core/src/ui.css';
import './style.css';

const games = [
  {id:'m1-1-mission-loadout',code:'M1.1',title:'Hangar Zero · Tactile 3D prototype'},
  {id:'m1-2-site-mission-control',code:'M1.2',title:'Site Mission Control: Live Shift'},
  {id:'m2-1-defect-mapping',code:'M2.1',title:'Defect Mapping Sweep',provisional:true},
  {id:'m2-2-thermal-triage',code:'M2.2',title:'Thermal Investigator'},
  {id:'m3-1-reconstruction-pipeline',code:'M3.1',title:'Reconstruction Pipeline',provisional:true},
  {id:'m3-2-digital-handover',code:'M3.2',title:'Reality Merge'},
  {id:'m4-1-blind-spot',code:'M4.1',title:'Blind Spot · Gameplay Prototype / Vertical Slice'},
  {id:'m4-2-renovation-deployment',code:'M4.2',title:'Renovation Deployment Board',provisional:true}
] as const;
const app=document.getElementById('root')!;
const locale=new URLSearchParams(location.search).get('lang')||'en';
app.innerHTML=`<main class="shell"><div class="eyebrow">Gameplay recovery · human review</div><h1>Drone4Build Vertical Slices</h1><p class="muted">Play each core loop and record where navigation, interaction, feedback, or pacing feels unclear. These are gameplay slices for review, before final SCORM packaging and localisation.</p><label for="lang">Locale</label> <input id="lang" value="${locale}" maxlength="12"/><div id="games" class="hub-grid"></div><section class="panel"><h2>Mock SCORM values</h2><pre id="inspector"></pre><button id="refresh">Refresh inspector</button> <button id="reset">Reset all stored progress</button></section></main>`;
const gameContainer=document.getElementById('games')!;
const input=document.getElementById('lang') as HTMLInputElement;
for(const game of games) {
  const card=document.createElement('article');card.className='panel';
  const heading=document.createElement('h2');heading.textContent=`${game.code} · ${game.title}`;card.append(heading);
  if('provisional' in game&&game.provisional){const badge=document.createElement('strong');badge.className='provisional-badge';badge.textContent='PROVISIONAL · DEVELOPED MODULE NOT YET AVAILABLE';card.append(badge);}
  const standalone=document.createElement('a');standalone.textContent='Standalone';standalone.target='_blank';
  const mock=document.createElement('a');mock.textContent='SCORM mock';mock.target='_blank';
  function update(){const lang=encodeURIComponent(input.value||'en');standalone.href=`/apps/${game.id}/index.html?lang=${lang}`;mock.href=`/apps/${game.id}/index.html?scorm=mock&lang=${lang}`;}
  input.addEventListener('input',update);update();card.append(standalone,mock);gameContainer.append(card);
}
function inspect(){const result:Record<string,unknown>={};for(const game of games){try{result[game.id]=JSON.parse(localStorage.getItem(`d4b:mock:${game.id}`)||'{}');}catch{result[game.id]={error:'Unreadable mock state'};}}document.getElementById('inspector')!.textContent=JSON.stringify(result,null,2);}
document.getElementById('refresh')!.addEventListener('click',inspect);
document.getElementById('reset')!.addEventListener('click',()=>{for(const game of games)localStorage.removeItem(`d4b:mock:${game.id}`);inspect();});inspect();
