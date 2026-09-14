import test from 'node:test';
import assert from 'node:assert/strict';
import { createScorm, createMockApi, formatSessionTime } from '../src/scorm.ts';

function memory() {
  const data = new Map<string,string>();
  return { getItem: (k:string)=>data.get(k)??null, setItem:(k:string,v:string)=>{data.set(k,v);}, removeItem:(k:string)=>{data.delete(k);} };
}
test('SCORM initializes, saves and resumes compact state', () => {
  const store=memory(), mock=createMockApi('test',store), first=createScorm('test',{api:mock,now:()=>1000,attachExit:false});
  assert.equal(first.snapshot().status,'incomplete');
  first.save({phase:'plan',round:2});
  assert.deepEqual(first.load(),{phase:'plan',round:2});
  const second=createScorm('test',{api:mock,now:()=>3000,attachExit:false});
  assert.deepEqual(second.load(),{phase:'plan',round:2});
  second.save(null); assert.equal(second.load(),null);
});
test('best passing score survives replay and later failure', () => {
  const mock=createMockApi('score',memory()), scorm=createScorm('score',{api:mock,attachExit:false});
  scorm.complete(87,true); assert.equal(scorm.snapshot().score,87); assert.equal(scorm.snapshot().status,'passed');
  scorm.complete(70,false); assert.equal(scorm.snapshot().score,87); assert.equal(scorm.snapshot().status,'passed');
  scorm.complete(92,true); assert.equal(scorm.snapshot().score,92);
});
test('explicit failure reports failed and next launch becomes incomplete', () => {
  const mock=createMockApi('failed',memory()), first=createScorm('failed',{api:mock,attachExit:false});
  first.complete(54,false); assert.equal(first.snapshot().status,'failed'); first.finish();
  const second=createScorm('failed',{api:mock,attachExit:false}); assert.equal(second.snapshot().status,'incomplete');
});
test('SCORM session time and finish are idempotent', () => {
  let clock=0; const mock=createMockApi('time',memory()), scorm=createScorm('time',{api:mock,now:()=>clock,attachExit:false});
  clock=65543; scorm.save({phase:'active'}); assert.equal(scorm.snapshot().sessionTime,'0000:01:05.54');
  scorm.finish(); scorm.finish(); assert.equal(mock.finished,true); assert.ok(mock.commits>=2);
  assert.equal(formatSessionTime(3600000),'0001:00:00.00');
});
test('failed LMS initialization falls back to local mock', () => {
  const broken={...createMockApi('broken',memory()), LMSInitialize:(_value:string)=>'false'};
  const scorm=createScorm('broken',{api:broken,storage:memory(),attachExit:false});
  assert.equal(scorm.snapshot().mode,'mock'); assert.equal(scorm.snapshot().status,'incomplete');
});
