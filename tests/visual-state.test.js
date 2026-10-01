import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from '../src/engine.js';
import { D, MATTER } from '../src/content.js';
import { visualState } from '../src/systems/visual-state.js';
test('Visual maturity is continuous across historical era jumps and bounded at huge mass',()=>{
 const s=fresh();assert.equal(visualState(s).radius,.08);
 s.mass=MATTER[20].unlock.mul(.999999);const before=visualState(s);s.mass=MATTER[20].unlock.mul(1.000001);const after=visualState(s);
 assert.ok(Math.abs(after.radius-before.radius)<1e-6);
 s.mass=D('1e100000');for(const value of Object.values(visualState(s)))assert.ok(Number.isFinite(value));
 assert.ok(visualState(s).radius<=.51);
});
test('Magnetic capability alone produces no jets; flow/spin and organization contribute independently',()=>{
 const s=fresh();s.nodes=['st-angular','st-magnetic','st-stellar','st-tidal'];s.spin=.9;
 assert.equal(visualState(s).jets,0);s.dynamics.paidActivity=12;
 const active=visualState(s);assert.ok(active.jets>0);s.spin=.1;assert.equal(visualState(s).jets,0);
 s.spin=.9;s.dynamics.paid=Array.from({length:100},(_,i)=>i);s.dynamics.coherence=D(16);
 assert.ok(visualState(s).organization>active.organization);assert.equal(visualState(s).radius,active.radius);
});
