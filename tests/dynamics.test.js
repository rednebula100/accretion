import test from 'node:test';
import assert from 'node:assert/strict';
import { D } from '../src/content.js';
import { DYNAMICS } from '../src/data/dynamics.js';
import { freshDynamics, dynamicsCost, canDevelop, buyDynamics, quoteDynamics, reconstructQuote, reconstruct,
  rebuildDynamics, dynamicsEffects, advanceDynamics, dynamicsAbsorb, radiativeWorkQuote, releaseRadiativeWork } from '../src/systems/dynamics.js';
const context={apparatus:true,planetary:true,magnetic:true,groups:6,paidQueue:20,frontier:125,frontierCost:D('1e24')};
const state=()=>({dynamics:freshDynamics(),energy:D(100),spin:.35,highest:121,mass:D(5),queue:[],nodes:[],research:[]});
const close=(a,b)=>assert.ok(D(a).sub(b).abs().div(D(b).abs().max(1)).lt(1e-10),`${a} != ${b}`);

test('Dynamics graph is finite, connected and physical convergence has no self-locked input',()=>{
  const visited=new Set(['apparatus']);
  for(const n of DYNAMICS){assert.ok(n.prereqs.every(p=>visited.has(p)),n.id);assert.ok(D(n.cost).gt(0));visited.add(n.id);}
  const s=state();s.dynamics.owned=['b-roche','c-fold'];
  assert.equal(canDevelop(s,'c-source',{...context,planetary:false}),false);
  assert.equal(canDevelop(s,'d-source',{...context,magnetic:false}),false);
  assert.equal(canDevelop(s,'c-source',context),true);
  assert.equal(canDevelop(s,'d-source',context),true);
});
test('Repeatable bulk quote charges only affordable levels, stops at20 and recomputes stale quotes',()=>{
  const s=state();s.dynamics.flux=D('1e80');buyDynamics(s,'a-source',context);
  const q=quoteDynamics(s,'a-conductance',context,'MAX');assert.equal(q.quantity,20);
  const before=s.dynamics.flux;assert.equal(buyDynamics(s,'a-conductance',context,'MAX'),20);
  close(s.dynamics.flux,before.sub(q.total));assert.equal(buyDynamics(s,'a-conductance',context),0);
  const t=state();t.dynamics.flux=D(100);buyDynamics(t,'a-source',context);
  assert.equal(quoteDynamics(t,'a-conductance',context,20).quantity,2);
  t.dynamics.flux=D(24);assert.equal(buyDynamics(t,'a-conductance',context,20),0);
});
test('Reconstruction is a serial-checked record transaction and retains universe obligations',()=>{
  const s=state(),d=s.dynamics;d.known=DYNAMICS.map(n=>n.id);d.owned=[...d.known];
  d.coherence=D(6);d.earned=D(25000).mul(D(24).pow(4));d.workClaims=[125];d.capabilities=['b-roche'];
  d.levels={'a-conductance':10,'c-coupling':5};d.maxLevels={...d.levels};d.paid=[1,2];
  const q=reconstructQuote(s);assert.equal(q.potential.toNumber(),24);assert.equal(q.available,true);
  assert.equal(reconstruct(s,q.serial).toNumber(),18);assert.equal(reconstruct(s,q.serial),false);
  assert.equal(s.mass.toNumber(),5);assert.equal(s.energy.toNumber(),100);assert.deepEqual(d.workClaims,[125]);
  assert.ok(d.owned.includes('b-roche'));assert.ok(!d.owned.includes('c-source'));assert.equal(d.levels['a-conductance'],10);
  assert.equal(d.levels['c-coupling'],undefined);assert.equal(d.maxLevels['c-coupling'],5);
  assert.deepEqual(d.paid,[1,2]);assert.deepEqual(d.capabilities,['b-roche']);
});
test('Recovery never buys unknown nodes or levels beyond previous purchases',()=>{
  const s=state(),d=s.dynamics;d.coherence=D(1);d.flux=D('1e100');
  d.known=['a-source','a-conductance'];d.maxLevels={'a-conductance':3};
  for(let i=0;i<30;i++)rebuildDynamics(s,context);
  assert.deepEqual(d.owned,['a-source','a-conductance']);assert.equal(d.levels['a-conductance'],3);
  // A known repeatable line remains cheaper, but automation never explores new levels.
  close(dynamicsCost(s,'a-conductance'),D(25).mul(D(1.55).pow(3)).mul(.15));
});
test('Ambient cannot claim paid identity, production impulses or radiative work twice',()=>{
  const s=state(),d=s.dynamics;d.owned=['a-return','b-strata','c-controls'];d.flux=D('1e15');
  const fx={flux:D(25)};dynamicsAbsorb(s,{matter:3,cost:'0'},fx,{thermal:false,tides:false});
  assert.deepEqual(d.paid,[]);assert.equal(s.energy.toNumber(),100);
  dynamicsAbsorb(s,{matter:3,cost:'100'},fx,{thermal:false,tides:false});
  assert.deepEqual(d.paid,[3]);assert.equal(d.earned.toNumber(),150);assert.equal(s.energy.toNumber(),130);
  dynamicsAbsorb(s,{matter:3,cost:'100'},fx,{thermal:false,tides:false});assert.equal(d.earned.toNumber(),150);
  const q=radiativeWorkQuote(s,context),before=d.flux;
  assert.equal(releaseRadiativeWork(s,context,124),false);
  close(releaseRadiativeWork(s,context,125),q.energy);close(d.flux,before.sub(q.cost));
  assert.equal(releaseRadiativeWork(s,context,125),false);assert.equal(s.mass.toNumber(),5);assert.deepEqual(d.paid,[3]);
});
test('Huge-number feedback stays finite without converting enormous balances to Number',()=>{
  const s=state(),d=s.dynamics;d.owned=DYNAMICS.map(n=>n.id);d.coherence=D('1e10000');
  d.flux=D('1e20000');d.bestHeld=d.flux;d.earned=d.flux;s.energy=D('1e15000');
  const fx=dynamicsEffects(s,context);assert.ok(Number.isFinite(fx.flux.layer)&&Number.isFinite(fx.flux.mag));
  assert.ok(Number.isFinite(fx.energy));assert.equal(fx.holding,4);assert.equal(fx.information,1.5);
  advanceDynamics(s,.1,fx);assert.ok(d.flux.gt(0)&&d.earned.gt(0));
});
