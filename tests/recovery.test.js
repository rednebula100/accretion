import test from 'node:test';import assert from 'node:assert/strict';
import {fresh} from '../src/engine.js';import {D} from '../src/content.js';import {estimateRecovery} from '../src/systems/recovery-estimate.js';import {isPaid,paidCount} from '../src/systems/paid.js';
test('Recovery preview does not mutate the live state or award local progress',async()=>{
 const s=fresh();s.nodes=['st-apparatus'];s.dynamics.known=['a-source','a-close'];s.dynamics.owned=[...s.dynamics.known];s.dynamics.earned=D(25000);s.dynamics.flux=D(9000);
 const before=JSON.stringify(s),seconds=await estimateRecovery(s);assert.equal(JSON.stringify(s),before);assert.ok(seconds===null||Number.isFinite(seconds));
});
test('Paid classification caches without losing huge costs or changed test/import values',()=>{
 const q={cost:'1e10000'};assert.equal(isPaid(q),true);q.cost='0';assert.equal(isPaid(q),false);q.cost='0.00000001';assert.equal(isPaid(q),true);assert.equal(paidCount([q,{cost:'0'}]),1);
});
