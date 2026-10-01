import {decode,encode} from '../save.js';
import {fluxEffects,reconstructDynamics,tick} from '../engine.js';
// Isolated projection with the current queue and automation; no manual purchases.
export async function estimateRecovery(state){
 const copy=decode(encode(state)),target=fluxEffects(copy).flux;
 if(!reconstructDynamics(copy,copy.dynamics.serial))return null;
 let lastYield=performance.now();
 for(let seconds=0;seconds<=600;seconds++){
  if(fluxEffects(copy).flux.gte(target))return seconds;
  tick(copy,1);
  if(performance.now()-lastYield>8){await new Promise(resolve=>setTimeout(resolve,0));lastYield=performance.now();}
 }
 return null;
}
