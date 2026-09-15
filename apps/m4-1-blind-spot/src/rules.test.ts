import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PROBES, REGIONS, canFinalize, canQuarantine, fresh, integrity, outcome, patternDiscovered, restore, verify } from './rules.ts';

test('scenario contains detections, non-detections, every required outcome and one clustered weakness',()=>{
  assert.deepEqual(new Set(REGIONS.map(outcome)),new Set(['truePositive','falsePositive','falseNegative','trueNegative']));
  assert.ok(REGIONS.some(r=>r.ai==='detected'&&r.confidence>=90&&r.truth==='clear'));
  assert.ok(REGIONS.some(r=>r.ai==='clean'&&r.confidence>=75&&r.truth==='issue'));
  assert.ok(REGIONS.filter(r=>outcome(r)==='trueNegative').length>2);
  assert.ok(REGIONS.filter(r=>r.ai!== (r.truth==='issue'?'detected':'clean')).every(r=>r.material==='cladding'));
});

test('a verification probe reveals one region once and cannot be brute-forced',()=>{
  let state=fresh('audit'); state=verify(state,'a1'); state=verify(state,'a1');
  assert.equal(state.probes,MAX_PROBES-1); assert.deepEqual(state.checked,['a1']);
  for(const id of ['a2','a3','a4','b1','b2','b3'] as const) state=verify(state,id);
  assert.equal(state.probes,0); assert.equal(state.checked.length,MAX_PROBES);
  assert.ok(REGIONS.length>state.checked.length);
});

test('two cladding mismatches expose the systematic blind spot and allow spatial quarantine',()=>{
  let state=fresh('audit'); state=verify(state,'a4');
  assert.equal(canQuarantine(state),true); assert.equal(patternDiscovered(state),false);
  state=verify(state,'b4'); assert.equal(patternDiscovered(state),true);
  assert.equal(integrity({...state,claddingQuarantined:true}).unresolved,0);
});

test('mixed strategic sampling and quarantine creates a trustworthy report',()=>{
  let strong=fresh('audit'); for(const id of ['a1','a4','b4','c4'] as const) strong=verify(strong,id);
  strong={...strong,claddingQuarantined:true};
  assert.equal(canFinalize(strong),true); assert.deepEqual(integrity(strong),{score:100,passed:true,mixedSampling:true,validated:2,corrected:2,reviewRequired:0,unresolved:0,blindSpot:true});
  let poor=fresh('audit'); for(const id of ['a1','b2','c3','a4'] as const) poor=verify(poor,id);
  assert.equal(integrity(poor).passed,false); assert.equal(integrity(poor).mixedSampling,false);
});

test('compact audit state restores and malformed state is rejected',()=>{
  const state={...verify(fresh('audit'),'a4'),selected:'a4' as const,evidenceLayer:'focus' as const,overlay:.4,claddingQuarantined:true};
  assert.deepEqual(restore(JSON.parse(JSON.stringify(state))),state);
  assert.equal(restore({...state,probes:6}),null); assert.equal(restore({...state,checked:['x']}),null);
});
