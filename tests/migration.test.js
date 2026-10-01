import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { decode, encode, load, save, SAVE_KEY, LEGACY_SAVE_KEY } from "../src/save.js";
import { rate,capacity,duration,price,gain,canRenew,renew,evaporate,fresh } from "../src/engine.js";
import { hasEvaporated } from "../src/systems/progression.js";
const directory=new URL("./fixtures/v2/",import.meta.url);
const expected=JSON.parse(fs.readFileSync(new URL("expected.json",directory)));
for(const fixture of expected) test(`v2 ${fixture.name}: queue, permanent state and golden effects survive v3`,()=>{
 const text=fs.readFileSync(new URL(`${fixture.name}.json`,directory),"utf8"), raw=JSON.parse(text),s=decode(text);
 assert.equal(s.version,3);assert.ok(s.legacy.compatibilityRun);
 for(const key of ["information","mass","energy"]) assert.equal(s[key].toString(),raw[key]);
 for(const key of ["origins","runs","best","everSeen","settings","queue","research","nodes","experiment","experiments"]) assert.deepEqual(s[key],raw[key]);
 assert.equal(rate(s).toString(),fixture.rate);assert.equal(capacity(s),fixture.capacity);assert.equal(duration(s,0),fixture.duration0);assert.equal(price(s,0).toString(),fixture.price0);assert.equal(gain(s).toString(),fixture.gain);assert.equal(canRenew(s),fixture.canRenew);
 const roundtrip=decode(encode(s));assert.deepEqual(roundtrip.queue,s.queue);assert.deepEqual(roundtrip.legacy,s.legacy);
 if(raw.origins || raw.runs) assert.ok(hasEvaporated(s));
});
test("migration never rewrites v2 and corrupt v3 cannot silently roll back or autosave",()=>{
 const data=new Map(), original=globalThis.localStorage;
 globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 try {
 const text=fs.readFileSync(new URL("post-origin.json",directory),"utf8");data.set(LEGACY_SAVE_KEY,text);
 const migrated=load();assert.ok(migrated.migrated);assert.ok(save(migrated.state));assert.equal(data.get(LEGACY_SAVE_KEY),text);assert.ok(data.has(SAVE_KEY));
 data.set(SAVE_KEY,"{broken");const recovery=load();assert.ok(recovery.error);assert.equal(save(recovery.state),false);assert.equal(data.get(SAVE_KEY),"{broken");assert.equal(data.get(SAVE_KEY+".recovery"),"{broken");assert.equal(data.get(LEGACY_SAVE_KEY),text);
 globalThis.localStorage.setItem=()=>{throw Error("quota")};assert.equal(save(fresh()),false);assert.ok(load().error);
 } finally { globalThis.localStorage=original; }
});
test("unknown versions/IDs, duplicate queues and invalid fractional clocks are rejected",()=>{
 const raw=JSON.parse(fs.readFileSync(new URL("queue-200.json",directory)));
 for(const patch of [{version:99},{nodes:["invented"]},{queue:[raw.queue[0],raw.queue[0]]},{version:3,simulation:{carry:.1,steps:0,pendingOffline:0}},{version:3,legacy:{compatibilityRun:true,v2NodeIds:["unknown"]}}]) assert.throws(()=>decode(JSON.stringify({...raw,...patch})));
});
test("Renewal compatibility retains post-reset navigation and clears run bridge",()=>{
 const s=decode(fs.readFileSync(new URL("all-permanents.json",directory),"utf8"));assert.ok(renew(s));assert.equal(s.origins,2);assert.equal(s.runs,0);assert.ok(hasEvaporated(s));assert.equal(s.legacy,null);assert.deepEqual(s.research,["autostart","heritage","compression"]);
});
