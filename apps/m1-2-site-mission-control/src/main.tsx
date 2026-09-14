import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { createScorm } from '../../../packages/core/src/scorm';
import { createTranslator } from '../../../packages/core/src/locale';
import en from '../locales/en.json';
import { FlightWorld } from './FlightWorld';
import { canLand, initialState, planIsSafe, score, scoreBreakdown, passed, type GameState, type Plan } from './rules';
import '../../../packages/core/src/ui.css';
import './style.css';

const scorm = createScorm('m1-2-site-mission-control');
const dictionaries = Object.fromEntries(Object.entries(import.meta.glob<Record<string, string>>('../locales/*.json', { eager: true, import: 'default' }))
  .map(([path, messages]) => [path.match(/\/([^/]+)\.json$/)?.[1] ?? 'en', messages]));
const { t, locale } = createTranslator(en, dictionaries);
document.documentElement.lang = locale;
const saved = scorm.load<GameState>();

function SiteMap({ active }: { active: boolean }) {
  return <div className="site-map" role="img" aria-label={t('map')}>
    <svg viewBox="0 0 360 235" aria-hidden="true">
      <rect width="360" height="235" rx="14" fill="#294b55"/>
      <path d="M166 218 V12" stroke="#9fb5aa" strokeWidth="78" opacity=".65"/>
      <rect x="120" y="174" width="76" height="44" rx="5" fill="#dba83b"/><text x="158" y="200" textAnchor="middle" fill="#102a33" fontSize="12" fontWeight="bold">H</text>
      <rect x="91" y="92" width="68" height="70" rx="25" fill="#b44949" opacity=".85"/>
      <path d="M158 188 C207 170 225 126 206 77" fill="none" stroke="#74e4c8" strokeWidth="7" strokeDasharray="10 7"/>
      <circle cx="206" cy="77" r="10" fill="#74e4c8"/>
      {active&&<rect x="70" y="0" width="220" height="47" fill="#d15c4c" opacity=".72"/>}
    </svg>
    <div className="map-legend"><span><b className="legend-pad"/>{t('pad')}</span><span><b className="legend-known"/>{t('knownZone')}</span><span><b className="legend-target"/>{t('target')}</span>{active&&<span><b className="legend-new"/>{t('newZoneLabel')}</span>}</div>
  </div>;
}

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className="choice" aria-pressed={selected} onClick={onClick}>{children}</button>;
}

function App() {
  const [state, setState] = useState<GameState>(initialState);
  const [resumeAvailable, setResumeAvailable] = useState(!!saved && saved.phase !== 'intro');
  const [position, setPosition] = useState({ x: 0, z: 8, y: 1.6 });
  const update = (next: GameState) => { setState(next); scorm.save(next); };
  const newMission = () => { const next = { ...initialState(), phase: 'plan' as const }; setResumeAvailable(false); update(next); };
  const revisePlan = (field: keyof Plan, value: string) => update({ ...state, plan: { ...state.plan, [field]: value }, feedback: '' });
  const launch = () => {
    if (!state.plan.route || !state.plan.launch || !state.plan.response) { update({ ...state, feedback: 'planIncomplete' }); return; }
    if (!planIsSafe(state.plan)) { update({ ...state, planErrors: state.planErrors + 1, feedback: 'planUnsafe' }); return; }
    update({ ...state, phase: 'flight', planCleared: true, feedback: 'planGood' });
  };
  const endAttempt = () => { const next = { ...state, phase: 'result' as const, feedback: '' }; update(next); scorm.complete(score(next), false); };
  const zone = (kind: 'known' | 'new') => setState(current => { const next = { ...current, flightErrors: current.flightErrors + 1, feedback: kind === 'known' ? 'zone' : 'newZone' }; scorm.save(next); return next; });
  const checkpoint = () => setState(current => { if (current.phase !== 'flight') return current; const next = { ...current, phase: 'adapt' as const, checkpoint: true, feedback: 'checkpoint' }; scorm.save(next); return next; });
  const adapt = (safe: boolean) => {
    if (!safe) { update({ ...state, adaptErrors: state.adaptErrors + 1, feedback: 'adaptWrong' }); return; }
    update({ ...state, phase: 'return', safeResponse: true, feedback: 'adaptGood' });
  };
  const land = () => {
    if (!canLand(position.x, position.z, position.y)) { update({ ...state, feedback: 'notAtPad' }); return; }
    const next = { ...state, phase: 'result' as const, landed: true, feedback: '' }; update(next); scorm.complete(score(next), passed(next));
  };
  const points = score(state);
  const status = scorm.snapshot();
  return <main className="shell mission-shell">
    <header className="mission-head"><div><div className="eyebrow">{t('brand')}</div><h1>{t('title')}</h1><p className="muted">{t('subtitle')}</p></div><div className="scorm-pill">{t('mock',{mode:status.mode,status:status.status})}</div></header>
    {state.phase === 'intro' && <section className="intro-layout"><div className="panel"><span className="eyebrow">{t('goal')}</span><h2>{t('introTitle')}</h2><p>{t('introText')}</p><div className="actions"><button className="btn-primary" onClick={newMission}>{t('start')}</button>{resumeAvailable&&<button onClick={() => { if (saved) { setState(saved); setResumeAvailable(false); } }}>{t('resume')}</button>}</div></div><SiteMap active={false}/></section>}
    {state.phase === 'plan' && <div className="plan-layout"><section className="panel"><div className="eyebrow">{t('progress',{current:1})}</div><h2>{t('routeTitle')}</h2><div className="choice-stack"><Choice selected={state.plan.route==='east'} onClick={()=>revisePlan('route','east')}>{t('routeEast')}</Choice><Choice selected={state.plan.route==='west'} onClick={()=>revisePlan('route','west')}>{t('routeWest')}</Choice></div><h2>{t('launchTitle')}</h2><div className="choice-stack"><Choice selected={state.plan.launch==='designated'} onClick={()=>revisePlan('launch','designated')}>{t('launchDesignated')}</Choice><Choice selected={state.plan.launch==='unreviewed'} onClick={()=>revisePlan('launch','unreviewed')}>{t('launchUnreviewed')}</Choice></div><h2>{t('responseTitle')}</h2><div className="choice-stack"><Choice selected={state.plan.response==='hold-return'} onClick={()=>revisePlan('response','hold-return')}>{t('responseHold')}</Choice><Choice selected={state.plan.response==='continue'} onClick={()=>revisePlan('response','continue')}>{t('responseContinue')}</Choice></div>{state.feedback&&<div className="feedback" role="status">{t(state.feedback)}</div>}<div className="actions"><button className="btn-primary" onClick={launch}>{t('clearPlan')}</button><button onClick={endAttempt}>{t('endAttempt')}</button></div></section><SiteMap active={false}/></div>}
    {['flight','adapt','return'].includes(state.phase) && <div className="flight-layout"><div className="flight-panel"><FlightWorld phase={state.phase} onCheckpoint={checkpoint} onZone={zone} onPosition={(x,z,y)=>setPosition({x,z,y})} label={t('flightView')}/><div className="flight-stats"><span>{t('altitude',{height:position.y.toFixed(1)})}</span><span>{t('distance',{distance:Math.hypot(position.x-4,position.z+10).toFixed(1)})}</span><span>{t('statusHover')}</span></div></div><section className="panel mission-sidebar"><div className="eyebrow">{t('progress',{current:state.phase==='flight'?2:state.phase==='adapt'?3:4})}</div><h2>{t(state.phase==='flight'?'flightTitle':state.phase==='adapt'?'adaptTitle':'returnTitle')}</h2><p>{t(state.phase==='flight'?'flightText':state.phase==='adapt'?'adaptText':'returnText')}</p>{state.feedback&&<div className="feedback" role="status">{t(state.feedback)}</div>}{state.phase==='adapt'&&<div className="choice-stack"><button onClick={()=>adapt(false)}>{t('adaptContinue')}</button><button className="btn-primary" onClick={()=>adapt(true)}>{t('adaptReturn')}</button></div>}{state.phase==='return'&&<button className="btn-primary" onClick={land}>{t('land')}</button>}{state.phase!=='adapt'&&<div className="control-pad" aria-label={t('instructions')}>{([['w','buttonForward'],['s','buttonBack'],['a','buttonLeft'],['d','buttonRight'],['e','buttonUp'],['q','buttonDown']] as const).map(([key,label])=><button key={key} onClick={()=>window.dispatchEvent(new CustomEvent('d4b-nudge',{detail:key}))}>{t(label)}</button>)}</div>}<SiteMap active={state.phase!=='flight'}/><button className="exit-button" onClick={endAttempt}>{t('endAttempt')}</button></section></div>}
    {state.phase==='result'&&<section className="panel result-panel"><div className="eyebrow">{t('progress',{current:4})}</div><h2>{t('resultTitle')}</h2><div className="result-score">{points}</div><p>{t(passed(state)?'resultPass':state.landed?'resultFail':'resultUnfinished')}</p><p>{t('resultScore',{score:points})}</p><p className="muted">{t('resultBreakdown',scoreBreakdown(state))}</p><button className="btn-primary" onClick={newMission}>{t('replay')}</button></section>}
  </main>;
}

createRoot(document.getElementById('root')!).render(<App/>);
