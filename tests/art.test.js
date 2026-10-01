import test from 'node:test';
import assert from 'node:assert/strict';
import { MATTER } from '../src/content.js';
import { speciesProfile } from '../src/art/species.js';
import { absorptionFrame } from '../src/art/absorption.js';
import { ART_SPECIES } from '../src/art/enabled.js';

test('All catalog identities have stable profiles and defining ring/pair traits',()=>{
 assert.equal(MATTER.length,200);assert.equal(ART_SPECIES.size,200);
 const profiles=MATTER.map(speciesProfile);
 assert.equal(new Set(profiles.map(p=>p.seed)).size,200);
 for(const item of MATTER){const p=speciesProfile(item);assert.deepEqual(p,speciesProfile({...item,instanceSeed:Math.random()}));assert.ok(ART_SPECIES.has(item.id));
  if(/ringed/i.test(item.name))assert.equal(p.ring,true);
  if(/binary|pair/i.test(item.name))assert.equal(p.binary,true);
 }
 assert.equal(new Set(profiles.map(p=>p.absorption)).size,9);
 assert.notDeepEqual(profiles[95].palette,profiles[101].palette,'captured ice moon must not match red Mars');
 assert.equal(new Set(profiles.slice(30,40).map(p=>p.shape)).size,10);
});
test('Absorption classes remain finite and preserve rigid bodies while stars stretch radially',()=>{
 const kinds=['rigid','rubble','comet','rocky','gas','star','compact','blackhole','cosmic'];
 for(const kind of kinds)for(const p of [-1,0,.4,.8,1,2]){
  const a=absorptionFrame(kind,p),r=absorptionFrame(kind,p,true);
  for(const v of Object.values(a))if(typeof v==='number')assert.ok(Number.isFinite(v));
  assert.ok(a.alpha>=0&&a.alpha<=1);assert.ok(a.squash>0);assert.ok(r.tail<=a.tail&&r.scatter<=a.scatter);
 }
 assert.equal(absorptionFrame('rigid',1).stretch,1);assert.equal(absorptionFrame('blackhole',1).stretch,1);
 assert.ok(absorptionFrame('star',1).stretch>absorptionFrame('rocky',1).stretch);
 assert.equal(absorptionFrame('star',1).radial,true);assert.equal(absorptionFrame('rigid',1).radial,false);
});
