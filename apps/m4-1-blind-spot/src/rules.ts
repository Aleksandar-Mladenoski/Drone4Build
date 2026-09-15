export type RegionId = 'a1'|'a2'|'a3'|'a4'|'b1'|'b2'|'b3'|'b4'|'c1'|'c2'|'c3'|'c4';
export type Material = 'concrete'|'cladding';
export type AiState = 'detected'|'clean';
export type Truth = 'issue'|'clear';
export type EvidenceLayer = 'raw'|'ai'|'focus'|'context';
export type Phase = 'intro'|'audit'|'report';
export type Region = { id:RegionId; bay:string; material:Material; ai:AiState; confidence:number; truth:Truth; x:number; y:number; w:number; h:number };

export const MAX_PROBES = 6;
export const REGIONS:Region[] = [
  {id:'a1',bay:'A1',material:'concrete',ai:'detected',confidence:84,truth:'issue',x:154,y:142,w:176,h:142},
  {id:'a2',bay:'A2',material:'concrete',ai:'clean',confidence:90,truth:'clear',x:338,y:142,w:176,h:142},
  {id:'a3',bay:'A3',material:'concrete',ai:'clean',confidence:76,truth:'clear',x:522,y:142,w:176,h:142},
  {id:'a4',bay:'A4',material:'cladding',ai:'detected',confidence:91,truth:'clear',x:706,y:142,w:138,h:142},
  {id:'b1',bay:'B1',material:'concrete',ai:'clean',confidence:87,truth:'clear',x:154,y:292,w:176,h:142},
  {id:'b2',bay:'B2',material:'concrete',ai:'detected',confidence:66,truth:'issue',x:338,y:292,w:176,h:142},
  {id:'b3',bay:'B3',material:'concrete',ai:'clean',confidence:94,truth:'clear',x:522,y:292,w:176,h:142},
  {id:'b4',bay:'B4',material:'cladding',ai:'clean',confidence:79,truth:'issue',x:706,y:292,w:138,h:142},
  {id:'c1',bay:'C1',material:'concrete',ai:'clean',confidence:89,truth:'clear',x:154,y:442,w:176,h:126},
  {id:'c2',bay:'C2',material:'concrete',ai:'clean',confidence:81,truth:'clear',x:338,y:442,w:176,h:126},
  {id:'c3',bay:'C3',material:'concrete',ai:'detected',confidence:73,truth:'issue',x:522,y:442,w:176,h:126},
  {id:'c4',bay:'C4',material:'cladding',ai:'clean',confidence:88,truth:'clear',x:706,y:442,w:138,h:126},
];
export type GameState = { version:1; phase:Phase; probes:number; checked:RegionId[]; selected:RegionId|null; evidenceLayer:EvidenceLayer; overlay:number; claddingQuarantined:boolean };

export function fresh(phase:Phase='intro'):GameState { return {version:1,phase,probes:MAX_PROBES,checked:[],selected:null,evidenceLayer:'ai',overlay:.72,claddingQuarantined:false}; }
export const regionById=(id:RegionId)=>REGIONS.find(region=>region.id===id)!;
export const mismatch=(region:Region)=>region.ai==='detected' ? region.truth==='clear' : region.truth==='issue';
export const outcome=(region:Region)=>region.ai==='detected' ? (region.truth==='issue'?'truePositive':'falsePositive') : (region.truth==='issue'?'falseNegative':'trueNegative');

export function verify(state:GameState,id:RegionId):GameState {
  if(state.phase!=='audit'||state.probes<=0||state.checked.includes(id)) return state;
  return {...state,probes:state.probes-1,checked:[...state.checked,id]};
}
export function canQuarantine(state:GameState):boolean {
  return state.checked.some(id=>{const r=regionById(id);return r.material==='cladding'&&mismatch(r);});
}
export function patternDiscovered(state:GameState):boolean {
  return state.checked.filter(id=>{const r=regionById(id);return r.material==='cladding'&&mismatch(r);}).length>=2;
}
export function canFinalize(state:GameState):boolean { return state.phase==='audit'&&state.checked.length>=4; }

export type Integrity = { score:number; passed:boolean; mixedSampling:boolean; validated:number; corrected:number; reviewRequired:number; unresolved:number; blindSpot:boolean };
export function integrity(state:GameState):Integrity {
  const checked=REGIONS.filter(r=>state.checked.includes(r.id));
  const mixedSampling=checked.some(r=>r.ai==='detected')&&checked.some(r=>r.ai==='clean');
  const tp=checked.some(r=>r.ai==='detected'&&r.truth==='issue');
  const fp=checked.some(r=>r.ai==='detected'&&r.truth==='clear');
  const fn=checked.some(r=>r.ai==='clean'&&r.truth==='issue');
  const blindSpot=patternDiscovered(state);
  const useful=checked.filter(r=>mismatch(r)||r.truth==='issue').length;
  const score=Math.min(100,20+(mixedSampling?20:0)+(tp?15:0)+(fp?15:0)+(fn?20:0)+(state.claddingQuarantined?15:0)+(blindSpot?15:0)+(useful>=3?5:0));
  const protectedByZone=(r:Region)=>state.claddingQuarantined&&r.material==='cladding';
  const unresolved=REGIONS.filter(r=>mismatch(r)&&!state.checked.includes(r.id)&&!protectedByZone(r)).length;
  return {score,passed:score>=75&&mixedSampling&&state.claddingQuarantined&&unresolved===0,
    mixedSampling,validated:checked.filter(r=>!mismatch(r)).length,corrected:checked.filter(mismatch).length,
    reviewRequired:state.claddingQuarantined?REGIONS.filter(r=>r.material==='cladding'&&!state.checked.includes(r.id)).length:0,
    unresolved,blindSpot};
}

export function restore(value:unknown):GameState|null {
  if(!value||typeof value!=='object') return null;
  const s=value as Partial<GameState>;
  const ids=new Set(REGIONS.map(r=>r.id));
  if(s.version!==1||!['intro','audit','report'].includes(s.phase??'')||!Number.isInteger(s.probes)||s.probes!<0||s.probes!>MAX_PROBES||
    !Array.isArray(s.checked)||s.checked.some(id=>!ids.has(id))||new Set(s.checked).size!==s.checked.length||s.checked.length!==MAX_PROBES-s.probes!||
    (s.selected!==null&&!ids.has(s.selected as RegionId))||!['raw','ai','focus','context'].includes(s.evidenceLayer??'')||
    !Number.isFinite(s.overlay)||s.overlay!<0||s.overlay!>1||typeof s.claddingQuarantined!=='boolean') return null;
  return s as GameState;
}
