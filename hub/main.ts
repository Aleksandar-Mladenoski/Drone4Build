import '../packages/core/src/ui.css';
import './style.css';

const games = [
  ['m1-1-mission-loadout','M1.1','Hangar Zero'],
  ['m1-2-site-mission-control','M1.2','Site Mission Control: Live Shift'],
  ['m2-2-thermal-triage','M2.2','Thermal Investigator'],
  ['m3-2-digital-handover','M3.2','Reality Merge']
] as const;
const app=document.getElementById('root')!;
const locale=new URLSearchParams(location.search).get('lang')||'en';
app.innerHTML=`<main class="shell"><div class="eyebrow">Gameplay recovery · human review</div><h1>Drone4Build Vertical Slices</h1><p class="muted">Play each core loop and record where navigation, interaction, feedback, or pacing feels unclear. These are gameplay slices for review, before final SCORM packaging and localisation.</p><label for="lang">Locale</label> <input id="lang" value="${locale}" maxlength="12"/><div id="games" class="hub-grid"></div><section class="panel"><h2>Mock SCORM values</h2><pre id="inspector"></pre><button id="refresh">Refresh inspector</button> <button id="reset">Reset all stored progress</button></section></main>`;
const gameContainer=document.getElementById('games')!;
const input=document.getElementById('lang') as HTMLInputElement;
for(const [id,code,title] of games) {
  const card=document.createElement('article');card.className='panel';
  const heading=document.createElement('h2');heading.textContent=`${code} · ${title}`;card.append(heading);
  const standalone=document.createElement('a');standalone.textContent='Standalone';standalone.target='_blank';
  const mock=document.createElement('a');mock.textContent='SCORM mock';mock.target='_blank';
  function update(){const lang=encodeURIComponent(input.value||'en');standalone.href=`/apps/${id}/index.html?lang=${lang}`;mock.href=`/apps/${id}/index.html?scorm=mock&lang=${lang}`;}
  input.addEventListener('input',update);update();card.append(standalone,mock);gameContainer.append(card);
}
function inspect(){const result:Record<string,unknown>={};for(const [id] of games){try{result[id]=JSON.parse(localStorage.getItem(`d4b:mock:${id}`)||'{}');}catch{result[id]={error:'Unreadable mock state'};}}document.getElementById('inspector')!.textContent=JSON.stringify(result,null,2);}
document.getElementById('refresh')!.addEventListener('click',inspect);
document.getElementById('reset')!.addEventListener('click',()=>{for(const [id] of games)localStorage.removeItem(`d4b:mock:${id}`);inspect();});inspect();
