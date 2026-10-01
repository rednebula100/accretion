import test from "node:test";
import assert from "node:assert/strict";
import { fresh,buy,tick,offlineAsync,rate,unlocked } from "../src/engine.js";
import { decode,encode } from "../src/save.js";
import { D,MATTER } from "../src/content.js";
function active(){const s=fresh();s.energy=D(1e5);s.nodes=['st-capture','st-scheduler'];s.research=['autostart'];buy(s,0,25);return s;}
function equal(a,b){
 assert.equal(a.highest,b.highest);assert.equal(a.absorbed,b.absorbed);assert.deepEqual(a.seen,b.seen);assert.deepEqual(a.nodes,b.nodes);assert.deepEqual(a.queue,b.queue);assert.ok(a.mass.eq(b.mass));assert.ok(a.energy.sub(b.energy).abs().div(a.energy.max(1)).lt(1e-10));
}
test("frame partition and offline share exact integer event order",async()=>{
 const a=active(),b=decode(encode(a)),c=decode(encode(a));
 for(let i=0;i<6000;i++)tick(a,.1);
 for(let i=0;i<36000;i++)tick(b,1/60);
 await offlineAsync(c,600);
 equal(a,b);equal(a,c);
});
test("fractional carry survives save and does not lose sub-frame time",()=>{
 const a=active();tick(a,.037);const b=decode(encode(a));tick(a,.063);tick(b,.063);equal(a,b);assert.equal(a.simulation.steps,1);assert.equal(a.simulation.carry,0);
});
test("concurrent resume cannot double-credit, and pending remainder survives reload",async()=>{
 const a=active(),b=decode(encode(a)); const first=offlineAsync(a,600),second=offlineAsync(a,600);assert.equal(first,second);await first;await offlineAsync(b,600);equal(a,b);
 const c=active();c.simulation.pendingOffline=90;const d=decode(encode(c));await offlineAsync(d,0);const e=active();tick(e,90);equal(d,e);assert.equal(d.simulation.pendingOffline,0);
});
test("clock rollback gives no negative or duplicate offline credit",async()=>{
 const a=fresh(),before=a.energy;const result=await offlineAsync(a,-100);assert.equal(result.seconds,0);assert.ok(a.energy.eq(before));
});
test("ambient encounter has one six-second cadence and never banks full-field bursts",()=>{
 const seeded=()=>{const s=fresh();s.nodes=['st-capture'];s.highest=12;s.seen=[0,12];s.dynamics.paid=[0];return s;};
 const a=seeded();tick(a,18);assert.equal(a.nextId,4);
 const b=seeded();b.captureClock=60;tick(b,.1);assert.equal(b.nextId,2);tick(b,1);assert.equal(b.nextId,2);
 const empty=fresh();empty.nodes=['st-capture'];tick(empty,60);assert.equal(empty.highest,-1);assert.equal(empty.nextId,1);
});
test("binary discovery search agrees with the monotone threshold reference",()=>{
 const s=fresh();s.origins=1;
 for(const cap of [79,139,199])for(let frontier=-1;frontier<200;frontier+=7)for(const item of MATTER){
  s.nodes=cap===79?[]:cap===139?['st-planetary']:['st-planetary','st-stellar'];s.dynamics.capabilities=cap===79?[]:cap===139?['b-roche']:['b-roche','c-stellar'];
  s.highest=frontier;s.mass=item.unlock;
  let expected=0;for(let i=1;i<=Math.min(cap,frontier+4);i++){if(s.mass.gte(MATTER[i].unlock))expected=i;else break;}
  assert.equal(unlocked(s),expected);
 }
});
