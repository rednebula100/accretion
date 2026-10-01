import test from 'node:test';
import assert from 'node:assert/strict';
import { cinematicFrame,SEED_RADIUS,CINEMATIC_DURATION } from '../src/systems/cinematic.js';
test('cinematic has one contraction, burst, dark interval and exact seed handoff',()=>{
 let last=.5;
 for(let t=0;t<9;t+=.01){const f=cinematicFrame(t,.5,1);assert.ok(f.radius<=last+1e-12);last=f.radius;}
 assert.ok(cinematicFrame(9,.5,1).flash>1);
 assert.equal(cinematicFrame(11,.5,1).dark,0);
 assert.equal(cinematicFrame(13.999999,.5,1).disk,0);
 assert.equal(cinematicFrame(CINEMATIC_DURATION,.5,1).radius,SEED_RADIUS);
 assert.equal(cinematicFrame(-1,SEED_RADIUS,0).radius,SEED_RADIUS);
 assert.ok(cinematicFrame(9,.5,1,true).flash<.25);
});
