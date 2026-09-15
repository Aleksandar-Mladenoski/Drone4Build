import test from'node:test';import assert from'node:assert/strict';
import{MAX_REVIEWS,REGIONS,canFinalize,canMarkConcern,decide,expectedDecision,fresh,integrity,outcome,restore,reviewedMismatchCount}from'./rules.ts';

test('eight diverse samples include required AI outcomes and fallible confidence',()=>{
  assert.equal(REGIONS.length,8);assert.deepEqual(new Set(REGIONS.map(outcome)),new Set(['truePositive','falsePositive','falseNegative','trueNegative']));
  assert.ok(REGIONS.some(r=>r.confidence>=90&&outcome(r)==='falsePositive'));assert.ok(REGIONS.some(r=>r.confidence<60&&outcome(r)==='truePositive'));
  assert.ok(REGIONS.some(r=>r.ai==='clean'&&r.truth==='issue'));assert.ok(new Set(REGIONS.map(r=>r.surface)).size>=4);
  assert.ok(REGIONS.filter(r=>r.ai!==(r.truth==='issue'?'detected':'clean')).every(r=>r.context==='dark-cladding'));
});
test('human decisions consume limited review capacity once per sample',()=>{
  let state=fresh('audit');state=decide(state,'p1','validate');state=decide(state,'p1','flag');
  assert.deepEqual(state.reviews,[{id:'p1',decision:'validate'}]);for(const id of['p2','p3','p4','p5','p6','p7']as const)state=decide(state,id,expectedDecision(REGIONS.find(r=>r.id===id)!));
  assert.equal(state.reviews.length,MAX_REVIEWS);assert.equal(decide(state,'p8','validate'),state);assert.equal(canFinalize(state),true);
});
test('repeated cladding errors support a broader reliability concern',()=>{
  let state=fresh('audit');state=decide(state,'p2','flag');assert.equal(reviewedMismatchCount(state),1);assert.equal(canMarkConcern(state),false);
  state=decide(state,'p4','flag');assert.equal(reviewedMismatchCount(state),2);assert.equal(canMarkConcern(state),true);
});
test('evidence-based mixed decisions produce a trustworthy inspection',()=>{
  let state=fresh('audit');for(const id of['p1','p2','p3','p4','p5','p6']as const)state=decide(state,id,expectedDecision(REGIONS.find(r=>r.id===id)!));state={...state,concernMarked:true};
  assert.deepEqual(integrity(state),{score:100,passed:true,correct:6,validated:3,flagged:3,falsePositivesPrevented:2,missedFindingsFound:1,reviewRequired:1,unresolved:0,mixedSampling:true,blindSpot:true});
  let poor=fresh('audit');for(const id of['p1','p2','p3','p4','p7']as const)poor=decide(poor,id,'validate');assert.equal(integrity(poor).passed,false);assert.ok(integrity(poor).unresolved>0);
});
test('compact version-two state restores and rejects malformed reviews',()=>{
  const state={...decide(fresh('audit'),'p1','validate'),selected:'p2' as const,usedLayers:['raw','ai']as const,overlayAdjusted:true};
  assert.deepEqual(restore(JSON.parse(JSON.stringify(state))),state);assert.equal(restore({...state,version:1}),null);assert.equal(restore({...state,reviews:[{id:'x',decision:'flag'}]}),null);
});
