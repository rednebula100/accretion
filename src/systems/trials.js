import { D, MATTER } from '../content.js';
import { hasEvaporated } from './progression.js';
import {paidCount} from './paid.js';
export const TRIALS=[
 {id:'census',name:'Spectral census',objective:'Absorb 6 distinct paid species from the nine-species band at entry.',restriction:'Manual acquisition only. Feeding stays inside the entry band.',reward:'Survey acquisition seeks unrecorded paid species. Opens transport and composition trials.'},
 {id:'cold',name:'Cold transport',objective:'Absorb 12 paid bodies, including 3 species from the entry band.',restriction:'Effective spin is capped at 0.15 until this trial ends.',reward:'Coast governor lowers spin during light traffic and restores your chosen spin under load.'},
 {id:'braid',name:'Alternating composition',objective:'Absorb 18 paid bodies across all three entry categories.',restriction:'Manual single-body purchases; successive purchases must use different categories.',reward:'Braid acquisition cycles matter categories automatically.'}
];
export const freshTrials=()=>({completed:[],active:null,policy:'frontier',coast:false,braidCategory:-1});
export function trialAvailable(s,id,{frontier,spin}) {
 if(!hasEvaporated(s)||s.experiment||s.trials.active||s.trials.completed.includes(id))return false;
 return id==='census'?frontier>=8:id==='cold'?s.trials.completed.includes('census')&&spin&&frontier>=8:id==='braid'?s.trials.completed.includes('census')&&frontier>=20:false;
}
export function startTrial(s,id,context) {
 if(!trialAvailable(s,id,context))return false;
 s.trials.active={id,startId:s.nextId,frontier:context.frontier,identities:[],count:0,lastCategory:-1};return true;
}
export function abortTrial(s){if(!s.trials.active)return false;s.trials.active=null;return true;}
export const trialManual=s=>['census','braid'].includes(s.trials?.active?.id);
export function trialAllows(s,i) {
 const a=s.trials?.active;if(!a)return true;
 if(a.id!=='braid')return i>=Math.max(0,a.frontier-8)&&i<=a.frontier;
 const c=MATTER[i].category,end=Math.floor(a.frontier/10);
 return c>=end-2&&c<=end&&c!==a.lastCategory;
}
export function effectiveSpin(s) {
 const cold=s.trials?.active?.id==='cold'||s.trials?.coast&&s.trials.completed.includes('cold')&&paidCount(s.queue)<12;
 return cold?Math.min(.15,s.spin):s.spin;
}
export function trialAbsorb(s,q,events) {
 const a=s.trials?.active;if(!a||q.id<a.startId||D(q.cost).lte(0))return;
 if(!a.identities.includes(q.matter))a.identities.push(q.matter);a.count++;
 const categories=new Set(a.identities.map(i=>MATTER[i].category)).size;
 const complete=a.id==='census'?a.identities.length>=6:a.id==='cold'?a.count>=12&&a.identities.length>=3:a.count>=18&&categories>=3;
 if(complete){s.trials.completed.push(a.id);s.trials.active=null;events.push({type:'experiment',name:TRIALS.find(t=>t.id===a.id).name});}
}
export function decodeTrials(raw) {
 if(raw===undefined)return freshTrials();
 const ids=TRIALS.map(t=>t.id),integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
 if(!raw||!Array.isArray(raw.completed)||raw.completed.some(id=>!ids.includes(id))||new Set(raw.completed).size!==raw.completed.length||!['frontier','survey','braid'].includes(raw.policy)||typeof raw.coast!=='boolean'||!integer(raw.braidCategory,-1,19))throw Error('Invalid Research records.');
 const t={completed:[...raw.completed],active:null,policy:raw.policy,coast:raw.coast,braidCategory:raw.braidCategory};
 if(t.policy==='survey'&&!t.completed.includes('census')||t.policy==='braid'&&!t.completed.includes('braid')||t.coast&&!t.completed.includes('cold'))throw Error('Unrecorded Research method.');
 if(raw.active){const a=raw.active;if(!ids.includes(a.id)||t.completed.includes(a.id)||!integer(a.startId,1,Number.MAX_SAFE_INTEGER)||!integer(a.frontier,0,199)||!integer(a.count,0,1e9)||!integer(a.lastCategory,-1,19)||!Array.isArray(a.identities)||a.identities.some(i=>!integer(i,0,199))||new Set(a.identities).size!==a.identities.length||a.identities.length>a.count)throw Error('Invalid active trial.');t.active={id:a.id,startId:a.startId,frontier:a.frontier,identities:[...a.identities],count:a.count,lastCategory:a.lastCategory};}
 return t;
}
