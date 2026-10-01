import { D } from '../content.js';
import { DYNAMICS } from '../data/dynamics.js';

const byId = new Map(DYNAMICS.map(n => [n.id, n]));
const processing = new Set(['b-roche', 'c-stellar', 'b-queue']);
export const dynamicsNode = id => byId.get(id);
export function freshDynamics() {
  return { flux:D(0), earned:D(0), coherence:D(0), bestHeld:D(0),
    owned:[], known:[], levels:{}, maxLevels:{}, capabilities:[], paid:[], workClaims:[],
    paidActivity:0, allocation:.5, schedule:'circulate', serial:0, duplex:false };
}
export const ownsDynamics = (s, id) => s.dynamics?.owned.includes(id) ?? false;
export const dynamicsLevel = (s, id) => s.dynamics?.levels[id] || 0;
export const processingCapability = (s, id) => s.dynamics?.capabilities.includes(id) ?? false;

export function dynamicsCost(s, id, offset=0) {
  const n=byId.get(id), d=s.dynamics;
  if (!n || !d) return null;
  let value=D(n.cost);
  if (n.repeatable) {
    const level=dynamicsLevel(s,id)+offset;
    value=value.mul(D(ownsDynamics(s,'b-compression')?1.4:1.55).pow(level))
      .mul(D(1.1).pow(Math.max(0,level-5)**2));
  }
  if (d.known.includes(id)) {
    if(n.region==='a' && d.coherence.gte(1)) value=value.mul(.15);
    if(n.region==='b' && d.coherence.gte(4)) value=value.mul(.25);
    if(n.region==='c' && d.coherence.gte(12)) value=value.mul(.2);
  }
  return value;
}
export function canDevelop(s, id, context) {
  const n=byId.get(id),d=s.dynamics;
  return !!n && !!d && (n.repeatable?dynamicsLevel(s,id)<20:!ownsDynamics(s,id)) &&
    n.prereqs.every(p=>p==='apparatus'?context.apparatus:ownsDynamics(s,p)) &&
    (id!=='c-source'||context.planetary) && (id!=='d-source'||context.magnetic);
}
export function visibleDynamics(s, context) {
  const d=s.dynamics;if(!d||!context.apparatus)return [];
  const regions={a:true,b:d.known.includes('a-close'),c:d.known.includes('b-roche'),d:d.known.includes('c-fold')};
  return DYNAMICS.filter(n=>d.known.includes(n.id)||(regions[n.region]&&n.prereqs.some(p=>p==='apparatus'||d.known.includes(p))));
}
export function quoteDynamics(s, id, context, count=1) {
  const n=byId.get(id), d=s.dynamics;
  const wanted=count==='MAX'?20:Number.isFinite(Number(count))?Math.floor(Number(count)):0;
  let quantity=0,total=D(0);
  if(n&&d&&canDevelop(s,id,context)) {
    const maximum=Math.max(0,Math.min(wanted,n.repeatable?20-dynamicsLevel(s,id):1));
    for(let i=0;i<maximum;i++) {
      const next=total.add(dynamicsCost(s,id,i));if(next.gt(d.flux))break;
      total=next;quantity++;
    }
  }
  return {id,quantity,total,unitCost:n&&d?dynamicsCost(s,id):D(0)};
}
export function buyDynamics(s, id, context, count=1) {
  const q=quoteDynamics(s,id,context,count),n=byId.get(id),d=s.dynamics;
  if(!q.quantity)return 0;
  d.flux=d.flux.sub(q.total);
  if(!d.owned.includes(id))d.owned.push(id);
  if(!d.known.includes(id))d.known.push(id);
  if(n.repeatable) {
    d.levels[id]=dynamicsLevel(s,id)+q.quantity;
    d.maxLevels[id]=Math.max(d.maxLevels[id]||0,d.levels[id]);
  }
  if(processing.has(id)&&!d.capabilities.includes(id))d.capabilities.push(id);
  return q.quantity;
}
export function coherencePotential(earned) {
  let value=earned.div(25000).pow(.25).floor();
  // Root rounding can turn an exact24-record threshold into23.9999999999.
  // Verify against the original earned amount, without granting an epsilon bonus.
  const next=value.add(1);
  if(next.gt(value)&&earned.gte(next.pow(4).mul(25000)))value=next;
  if(value.gt(0)&&earned.lt(value.pow(4).mul(25000)))value=value.sub(1);
  return value;
}
export function reconstructQuote(s) {
  const d=s.dynamics;
  if(!d)return {available:false,potential:D(0),gain:D(0),requirement:D(1),serial:0};
  const potential=coherencePotential(d.earned),requirement=d.coherence.mul(4).max(1);
  return {available:d.known.includes('a-close')&&potential.gte(requirement),potential,
    gain:potential.sub(d.coherence).max(0),requirement,serial:d.serial};
}
export function reconstruct(s, expectedSerial) {
  const q=reconstructQuote(s),d=s.dynamics;
  if(!q.available||expectedSerial!==q.serial)return false;
  d.coherence=q.potential;d.flux=D(0);d.earned=D(0);d.bestHeld=D(0);d.paidActivity=0;d.serial++;
  const retained=n=>(n.region==='a'&&d.coherence.gte(4))||(n.region==='b'&&d.coherence.gte(12));
  d.owned=d.owned.filter(id=>retained(byId.get(id)));
  for(const id of Object.keys(d.levels))if(!d.owned.includes(id))delete d.levels[id];
  // Knowledge, paid history, processing and work claims are universe records.
  return q.gain;
}
export function rebuildDynamics(s, context) {
  const d=s.dynamics;if(!d)return;
  for(const n of DYNAMICS) {
    const automatic=(n.region==='a'&&d.coherence.gte(1))||(n.region==='b'&&d.coherence.gte(4))||(n.region==='c'&&d.coherence.gte(12));
    if(automatic&&d.known.includes(n.id)&&(!n.repeatable||dynamicsLevel(s,n.id)<(d.maxLevels[n.id]||0)))buyDynamics(s,n.id,context);
  }
}

// The caller provides one finite physical snapshot. This function never calls
// the final Energy rate, final Flux rate, purchases, or the simulation itself.
export function dynamicsEffects(s, context) {
  const d=s.dynamics;
  if(!d)return {flux:D(0),energy:1,transit:1,holding:1,information:1};
  const has=id=>ownsDynamics(s,id),level=id=>dynamicsLevel(s,id);
  const groups=Math.max(0,Math.min(6,context.groups)),paidQueue=Math.max(0,context.paidQueue);
  const scale=has('d-source')?5e8:has('c-source')?4e5:has('b-source')?300:100;
  const balance=has('b-hysteresis')?d.flux.max(d.bestHeld.mul(.35)):d.flux;
  const H=has('a-reserve')?balance.div(scale).add(1).log10().mul(.6).add(1).min(4).toNumber():1;
  let f=D(context.apparatus?1:0),e=1,transit=1;
  for(const [id,mult] of [['a-source',2],['a-close',3],['b-source',4],['b-roche',3],['c-source',5],['c-fold',4],['d-source',6],['d-horizon',4]])if(has(id))f=f.mul(mult);
  f=f.mul(Math.pow(1+.4*level('a-conductance'),has('a-loop')?1.7:1.3)).mul(H);
  if(has('a-infall'))f=f.mul(1+Math.min(3,d.paidActivity/6));
  if(has('a-diet'))f=f.mul(1+Math.min(2,d.paid.length/20));
  f=f.mul(d.coherence.min(16).add(1)).mul(d.coherence.div(16).max(1).pow(.25)).mul(1+.25*groups);
  if(has('a-balance')){f=f.mul(1.8-.8*d.allocation);e*=1+.8*d.allocation;}
  if(has('a-work'))e*=1.8;
  if(has('a-shear'))transit*=.82;
  if(has('b-resonance'))f=f.mul(s.energy.div(context.frontierCost).sqrt().div(8).min(3).add(1));
  f=f.mul(1+.18*level('c-coupling')*groups);
  if(has('c-divert'))f=f.mul(1+Math.min(2,paidQueue/20));
  if(has('c-magnetic'))e*=1+2*(context.spin??s.spin);
  transit*=Math.pow(.96,level('d-packing'));
  if(has('d-feedback'))f=f.mul(d.earned.div(1e9).add(1).log10().mul(.4).add(1).min(4));
  if(has('d-reserves'))e*=1+.6*(H-1);
  if(has('d-coalescence')){f=f.mul(1+.5*groups);e*=2;}
  if(has('d-radiation'))e*=1+Math.min(3,paidQueue/12);
  if(has('d-source')){const i=Math.max(0,s.highest),late=Math.max(0,i-65)**2;e*=(3.2+i*.07+late*.09)/(3.2+i*.07+late*.035);}
  const information=has('d-horizon')?d.earned.add(1).log10().mul(.04).min(.5).add(1).toNumber():1;
  return {flux:f,energy:e,transit,holding:H,information};
}
export function advanceDynamics(s, dt, effects) {
  const d=s.dynamics;if(!d)return;
  const earned=effects.flux.mul(dt);
  d.flux=d.flux.add(earned);d.earned=d.earned.add(earned);d.bestHeld=d.bestHeld.max(d.flux);
  d.paidActivity*=Math.exp(-dt/12);
}
export function dynamicsAbsorb(s, q, effects, physical) {
  const d=s.dynamics;if(!d||D(q.cost).lte(0))return;
  d.paidActivity+=1;
  const tide=physical.tides?2:1;
  const extra=(ownsDynamics(s,'b-thermal') && !physical.thermal ? .27*tide : 0)+.01*dynamicsLevel(s,'b-buffer');
  s.energy=s.energy.add(D(q.cost).mul(extra));
  if(!d.paid.includes(q.matter)) {
    if(ownsDynamics(s,'a-return'))s.energy=s.energy.add(D(q.cost).mul(.3));
    if(ownsDynamics(s,'b-strata')){const impulse=effects.flux.mul(6);d.flux=d.flux.add(impulse);d.earned=d.earned.add(impulse);}
    d.paid.push(q.matter);
  }
}
export function radiativeWorkQuote(s, context) {
  const d=s.dynamics,index=context.frontier;
  const cost=D(2e8).mul(D(1.6).pow(Math.max(0,index-100)/5));
  return {index,cost,energy:context.frontierCost.mul(.75),available:!!d&&ownsDynamics(s,'c-controls')&&!d.workClaims.includes(index)};
}
export function releaseRadiativeWork(s, context, expectedIndex) {
  const q=radiativeWorkQuote(s,context);
  if(!q.available||q.index!==expectedIndex||s.dynamics.flux.lt(q.cost))return false;
  s.dynamics.flux=s.dynamics.flux.sub(q.cost);s.energy=s.energy.add(q.energy);s.dynamics.workClaims.push(q.index);
  return q.energy;
}

export function decodeDynamics(raw) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid Dynamics state.');
  const d=freshDynamics();
  for(const key of ['flux','earned','coherence','bestHeld']) {
    const value=D(raw[key]);
    if(raw[key]===undefined||!Number.isFinite(value.layer)||!Number.isFinite(value.mag)||value.lt(0))throw Error(`Invalid Dynamics ${key}.`);
    d[key]=value;
  }
  for(const key of ['owned','known','capabilities','paid','workClaims']) {
    const list=raw[key],numeric=key==='paid'||key==='workClaims';
    if(!Array.isArray(list)||list.length>(numeric?200:41)||list.some(id=>numeric?!Number.isInteger(id)||id<0||id>=200:key==='capabilities'?!processing.has(id):!byId.has(id)))throw Error(`Invalid Dynamics ${key}.`);
    d[key]=[...new Set(list)];
  }
  if(d.owned.some(id=>!d.known.includes(id))||d.capabilities.some(id=>!d.known.includes(id)))throw Error('Invalid Dynamics knowledge ledger.');
  for(const key of ['levels','maxLevels']) {
    if(!raw[key]||typeof raw[key]!=='object'||Array.isArray(raw[key]))throw Error('Invalid repeatable levels.');
    for(const [id,level] of Object.entries(raw[key])) {
      if(!byId.get(id)?.repeatable||!Number.isInteger(level)||level<1||level>20||!d.known.includes(id))throw Error('Invalid repeatable level.');
      d[key][id]=level;
    }
  }
  for(const n of DYNAMICS.filter(n=>n.repeatable)) {
    if(d.owned.includes(n.id)!==Object.hasOwn(d.levels,n.id)||(d.levels[n.id]||0)>(d.maxLevels[n.id]||0))throw Error('Invalid repeatable ownership.');
  }
  if(!Number.isSafeInteger(raw.serial)||raw.serial<0||raw.serial>1e9)throw Error('Invalid reconstruction serial.');
  if(!Number.isFinite(raw.paidActivity)||raw.paidActivity<0||raw.paidActivity>1e9)throw Error('Invalid paid activity.');
  if(!Number.isFinite(raw.allocation)||raw.allocation<0||raw.allocation>1)throw Error('Invalid flow allocation.');
  if(!['frontier','circulate'].includes(raw.schedule)||typeof raw.duplex!=='boolean')throw Error('Invalid scheduling policy.');
  for(const key of ['serial','paidActivity','allocation','schedule','duplex'])d[key]=raw[key];
  return d;
}
