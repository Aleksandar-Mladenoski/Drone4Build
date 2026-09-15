export type RegionId='p1'|'p2'|'p3'|'p4'|'p5'|'p6'|'p7'|'p8';
export type Surface='render'|'window'|'cladding'|'parapet'|'plinth';
export type Context='standard'|'dark-cladding'|'soft-image';
export type AiState='detected'|'clean';
export type Truth='issue'|'clear';
export type Mask='tight'|'oversize'|'shifted'|'fragmented'|'none';
export type EvidenceLayer='raw'|'ai'|'context'|'focus';
export type Decision='validate'|'flag';
export type Phase='intro'|'audit'|'report';
export type Region={id:RegionId;sample:number;surface:Surface;context:Context;ai:AiState;confidence:number;truth:Truth;mask:Mask;quality:'clear'|'shadow'|'soft';x:number;y:number;w:number;h:number};
export type Review={id:RegionId;decision:Decision};

export const MAX_REVIEWS=6;
export const REGIONS:Region[]=[
  {id:'p1',sample:1,surface:'render',context:'standard',ai:'detected',confidence:84,truth:'issue',mask:'tight',quality:'clear',x:145,y:156,w:205,h:170},
  {id:'p2',sample:2,surface:'cladding',context:'dark-cladding',ai:'detected',confidence:92,truth:'clear',mask:'shifted',quality:'clear',x:675,y:130,w:164,h:196},
  {id:'p3',sample:3,surface:'render',context:'standard',ai:'detected',confidence:58,truth:'issue',mask:'fragmented',quality:'clear',x:365,y:156,w:292,h:170},
  {id:'p4',sample:4,surface:'cladding',context:'dark-cladding',ai:'detected',confidence:74,truth:'clear',mask:'oversize',quality:'shadow',x:675,y:340,w:164,h:202},
  {id:'p5',sample:5,surface:'render',context:'standard',ai:'clean',confidence:88,truth:'clear',mask:'none',quality:'clear',x:145,y:340,w:205,h:202},
  {id:'p6',sample:6,surface:'cladding',context:'dark-cladding',ai:'clean',confidence:79,truth:'issue',mask:'none',quality:'shadow',x:512,y:340,w:145,h:202},
  {id:'p7',sample:7,surface:'window',context:'soft-image',ai:'detected',confidence:64,truth:'issue',mask:'tight',quality:'soft',x:365,y:340,w:130,h:202},
  {id:'p8',sample:8,surface:'plinth',context:'dark-cladding',ai:'clean',confidence:83,truth:'clear',mask:'none',quality:'clear',x:145,y:558,w:694,h:55},
];
export type GameState={version:2;phase:Phase;reviews:Review[];selected:RegionId|null;evidenceLayer:EvidenceLayer;overlay:number;usedLayers:EvidenceLayer[];overlayAdjusted:boolean;concernMarked:boolean;aiOverlay:boolean;boardZoom:number};

export function fresh(phase:Phase='intro'):GameState{return{version:2,phase,reviews:[],selected:null,evidenceLayer:'raw',overlay:.72,usedLayers:[],overlayAdjusted:false,concernMarked:false,aiOverlay:true,boardZoom:1};}
export const regionById=(id:RegionId)=>REGIONS.find(region=>region.id===id)!;
export const reviewFor=(state:GameState,id:RegionId)=>state.reviews.find(review=>review.id===id);
export const mismatch=(region:Region)=>region.ai==='detected'?region.truth==='clear':region.truth==='issue';
export const outcome=(region:Region)=>region.ai==='detected'?(region.truth==='issue'?'truePositive':'falsePositive'):(region.truth==='issue'?'falseNegative':'trueNegative');
export function expectedDecision(region:Region):Decision{return region.ai==='detected'?(region.truth==='issue'?'validate':'flag'):(region.truth==='issue'?'flag':'validate');}

export function decide(state:GameState,id:RegionId,decision:Decision):GameState{
  if(state.phase!=='audit'||state.reviews.length>=MAX_REVIEWS||reviewFor(state,id))return state;
  return{...state,reviews:[...state.reviews,{id,decision}]};
}
export function reviewedMismatchCount(state:GameState){return state.reviews.filter(review=>{const region=regionById(review.id);return region.context==='dark-cladding'&&mismatch(region);}).length;}
export const canMarkConcern=(state:GameState)=>reviewedMismatchCount(state)>=2;
export const patternDiscovered=(state:GameState)=>canMarkConcern(state)&&state.concernMarked;
export const canFinalize=(state:GameState)=>state.phase==='audit'&&state.reviews.length>=5;

export type Integrity={score:number;passed:boolean;correct:number;validated:number;flagged:number;falsePositivesPrevented:number;missedFindingsFound:number;reviewRequired:number;unresolved:number;mixedSampling:boolean;blindSpot:boolean};
export function integrity(state:GameState):Integrity{
  const reviewed=state.reviews.map(review=>({review,region:regionById(review.id)}));
  const mixedSampling=reviewed.some(x=>x.region.ai==='detected')&&reviewed.some(x=>x.region.ai==='clean');
  const correct=reviewed.filter(x=>x.review.decision===expectedDecision(x.region)).length;
  const falsePositivesPrevented=reviewed.filter(x=>outcome(x.region)==='falsePositive'&&x.review.decision==='flag').length;
  const missedFindingsFound=reviewed.filter(x=>outcome(x.region)==='falseNegative'&&x.review.decision==='flag').length;
  const lowConfidenceValidated=reviewed.some(x=>x.region.id==='p3'&&x.review.decision==='validate');
  const incorrect=reviewed.length-correct;
  const score=Math.max(0,Math.min(100,20+(mixedSampling?15:0)+Math.min(20,correct*4)+Math.min(20,falsePositivesPrevented*10)+(missedFindingsFound?20:0)+(lowConfidenceValidated?10:0)+(state.concernMarked?15:0)-incorrect*8));
  const contained=(region:Region)=>state.concernMarked&&region.context==='dark-cladding';
  const unresolved=REGIONS.filter(region=>mismatch(region)&&!contained(region)&&reviewFor(state,region.id)?.decision!==expectedDecision(region)).length;
  return{score,passed:score>=75&&mixedSampling&&state.concernMarked&&unresolved===0,correct,
    validated:reviewed.filter(x=>x.review.decision==='validate').length,flagged:reviewed.filter(x=>x.review.decision==='flag').length,
    falsePositivesPrevented,missedFindingsFound,reviewRequired:state.concernMarked?REGIONS.filter(r=>r.context==='dark-cladding'&&!reviewFor(state,r.id)).length:0,
    unresolved,mixedSampling,blindSpot:patternDiscovered(state)};
}

export function restore(value:unknown):GameState|null{
  if(!value||typeof value!=='object')return null;const s=value as Partial<GameState>,ids=new Set(REGIONS.map(r=>r.id));
  if(s.version!==2||!['intro','audit','report'].includes(s.phase??'')||!Array.isArray(s.reviews)||s.reviews.length>MAX_REVIEWS||
    s.reviews.some(r=>!r||!ids.has(r.id)||!['validate','flag'].includes(r.decision))||new Set(s.reviews.map(r=>r.id)).size!==s.reviews.length||
    (s.selected!==null&&!ids.has(s.selected as RegionId))||!['raw','ai','context','focus'].includes(s.evidenceLayer??'')||
    !Number.isFinite(s.overlay)||s.overlay!<0||s.overlay!>1||!Array.isArray(s.usedLayers)||s.usedLayers.some(layer=>!['raw','ai','context','focus'].includes(layer))||
    typeof s.overlayAdjusted!=='boolean'||typeof s.concernMarked!=='boolean'||typeof s.aiOverlay!=='boolean'||!Number.isFinite(s.boardZoom)||s.boardZoom!<.9||s.boardZoom!>1.3)return null;
  return s as GameState;
}
