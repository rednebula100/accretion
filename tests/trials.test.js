import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, beginTrial, buy, quote, tick, duration, rate, evaporate, reconstructDynamics, offlineAsync, unlocked } from '../src/engine.js';
import { D, MATTER } from '../src/content.js';
import { abortTrial, effectiveSpin } from '../src/systems/trials.js';
import { encode, decode } from '../src/save.js';
function fixture(){const s=fresh();s.runs=1;s.highest=28;s.mass=MATTER[28].unlock.mul(2);s.energy=D('1e30');s.nodes=['st-capture','st-angular','st-scheduler'];s.research=['autostart'];s.auto=false;return s;}
test('Trials require prior Evap and exclude pre-entry queue/ambient; census awards once',()=>{
 const s=fixture();s.runs=0;assert.equal(beginTrial(s,'census'),false);s.runs=1;
 buy(s,25,10);assert.ok(beginTrial(s,'census'));assert.equal(beginTrial(s,'cold'),false);
 s.auto=true;tick(s,60);assert.equal(s.trials.active.count,0);
 const end=s.trials.active.frontier;
 assert.equal(buy(s,0,1),0);
 for(let i=end-5;i<=end;i++)assert.equal(buy(s,i,1),1);
 tick(s,60);assert.deepEqual(s.trials.completed,['census']);assert.equal(s.trials.active,null);
 assert.equal(beginTrial(s,'census'),false);
 assert.deepEqual(decode(encode(s)).trials,s.trials);
});
test('Cold transport caps effective spin without overwriting preference; governor changes with paid load',()=>{
 const s=fixture();s.trials.completed=['census'];s.spin=.9;
 const before=duration(s,25),energy=rate(s);assert.ok(beginTrial(s,'cold'));
 assert.equal(s.spin,.9);assert.equal(effectiveSpin(s),.15);assert.ok(duration(s,25)<before);assert.ok(rate(s).lt(energy));
 const end=s.trials.active.frontier;for(let i=end-2;i<=end;i++)buy(s,i,4);
 tick(s,60);assert.ok(s.trials.completed.includes('cold'));assert.equal(effectiveSpin(s),.9);
 s.trials.coast=true;assert.equal(effectiveSpin(s),.15);buy(s,25,12);assert.equal(effectiveSpin(s),.9);
});
test('Alternation limits actual quote and transaction, rejects repeated category, survives reload and abort',()=>{
 const s=fixture();s.trials.completed=['census'];assert.ok(beginTrial(s,'braid'));
 assert.equal(quote(s,20,'MAX').quantity,1);assert.equal(buy(s,20,100),1);assert.equal(buy(s,21,1),0);
 const resumed=decode(encode(s));assert.equal(buy(resumed,21,1),0);assert.ok(abortTrial(resumed));assert.equal(buy(resumed,21,1),1);
 for(let k=0;k<17;k++)assert.equal(buy(s,[10,0,20][k%3],100),1);
 tick(s,60);assert.deepEqual(s.trials.completed,['census','braid']);
});
test('Research survives local reset; Evap cancels unfinished trial but retains methods',()=>{
 const s=fixture();s.trials.completed=['census'];beginTrial(s,'cold');const active=s.trials.active;
 s.dynamics.known=['a-close'];s.dynamics.earned=D(25000);assert.ok(reconstructDynamics(s,0));assert.equal(s.trials.active,active);
 s.highest=170;s.nodes.push('st-evaporation');assert.ok(evaporate(s));assert.equal(s.trials.active,null);assert.deepEqual(s.trials.completed,['census']);
});
test('Active Research offline follows identical paid event progress and rejects corrupt methods',async()=>{
 const s=fixture();s.trials.completed=['census'];beginTrial(s,'cold');for(let i=24;i<=26;i++)buy(s,i,4);
 const other=decode(encode(s));for(let i=0;i<600;i++)tick(s,.1);await offlineAsync(other,60);
 assert.deepEqual(other.trials,s.trials);assert.equal(other.absorbed,s.absorbed);assert.ok(other.energy.sub(s.energy).abs().div(s.energy).lt(1e-9));
 const raw=JSON.parse(encode(fresh()));raw.trials.policy='braid';assert.throws(()=>decode(JSON.stringify(raw)),/Unrecorded/);
});

test('Survey and braid rewards change actual scheduler acquisitions without free discoveries',()=>{
 const s=fixture();s.auto=true;s.nodes.push('st-decay');s.trials.completed=['census','braid'];s.trials.policy='survey';
 const end=unlocked(s);s.dynamics.paid=[end];s.seen=[end];tick(s,1.2);
 assert.ok(s.queue.some(q=>q.matter===end-1&&D(q.cost).gt(0)));assert.ok(!s.seen.includes(end-1));
 s.queue=[];s.trials.policy='braid';s.dynamics.paid=[1,11,21];s.seen=[1,11,21];s.trials.braidCategory=-1;
 const acquired=[];for(let k=0;k<3;k++){tick(s,1.2);acquired.push(s.queue.at(-1).matter);}
 assert.deepEqual(acquired,[1,11,21]);
 const resumed=decode(encode(s));assert.equal(resumed.trials.policy,'braid');assert.equal(resumed.trials.braidCategory,2);
});
