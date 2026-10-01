import fs from 'node:fs';
import * as e from '../src/engine.js';import * as d from '../src/systems/dynamics.js';import {DYNAMICS} from '../src/data/dynamics.js';
const policies=process.argv.slice(2).length?process.argv.slice(2):['structure-first','tree-first','balanced','low-input','holding','aggressive','delayed','automation'];
const output=process.env.SIMULATION_OUTPUT||'test-results/progression';fs.mkdirSync(output,{recursive:true});
for(const policy of policies){
 const s=e.fresh(),events=[];let next=0,firstEvap=null,manual=0,lastAction=0,maxActionGap=0;
 for(let step=0;step<108000&&!d.ownsDynamics(s,'d-horizon');step++){
  const time=step*.1;
  if(time+1e-8>=next){next+=policy==='low-input'?15:2;const before=manual;
   for(const n of e.structureList(s).filter(n=>e.canBuildNode(s,n.id)))if(e.buyNode(s,n.id)){manual++;events.push({time,type:'structure',id:n.id});break;}
   s.dynamics.allocation=policy==='holding'?.8:policy==='tree-first'?.15:policy==='structure-first'?.9:.5;
   const choices=DYNAMICS.filter(n=>d.canDevelop(s,n.id,e.dynamicsContext(s))&&s.dynamics.flux.gte(d.dynamicsCost(s,n.id).mul(policy==='holding'?1.8:1))).sort((a,b)=>d.dynamicsCost(s,a.id).cmp(d.dynamicsCost(s,b.id)));
   if(policy==='automation')choices.sort((a,b)=>Number(['b-target','c-controls','c-scheduler'].includes(b.id))-Number(['b-target','c-controls','c-scheduler'].includes(a.id)));
   if(policy==='structure-first')choices.sort((a,b)=>Number(['a-work','a-shear','b-thermal'].includes(b.id))-Number(['a-work','a-shear','b-thermal'].includes(a.id)));
   if(choices[0]&&e.developDynamics(s,choices[0].id)){manual++;events.push({time,type:'develop',id:choices[0].id});}
   const work=e.workQuote(s);if(!['tree-first','holding'].includes(policy)&&work.available&&s.energy.lt(work.energy)&&s.dynamics.flux.gte(work.cost.mul(policy==='structure-first'?1:2))&&e.releaseWork(s,work.index)){manual++;events.push({time,type:'work',frontier:work.index});}
   if(!d.ownsDynamics(s,'c-scheduler')){const i=e.unlocked(s),reserve=e.structureList(s).find(n=>e.canBuildNode(s,n.id))?.cost||0,budget=s.energy.sub(reserve).max(0),n=Math.min(policy==='low-input'?10:1,budget.div(e.price(s,i)).floor().toNumber());if(n>0&&e.buy(s,i,n))manual++;}
   const q=d.reconstructQuote(s),serial=s.dynamics.serial,known=s.dynamics.known;
   const ready=policy==='aggressive'?q.gain.gte(1):policy==='delayed'?(serial===0?known.includes('b-roche'):serial===1?known.includes('c-fold'):false):serial===0?known.includes('a-close'):serial===1?known.includes('b-roche')&&q.potential.gte(4):serial===2?known.includes('c-controls')&&q.potential.gte(12):false;
   if(ready&&e.reconstructDynamics(s,serial)){manual++;events.push({time,type:'reconstruct',coherence:s.dynamics.coherence.toString()});}
   if(manual>before){maxActionGap=Math.max(maxActionGap,time-lastAction);lastAction=time;}
  }
  e.tick(s,.1);if(!firstEvap&&e.canEvaporate(s))firstEvap={seconds:s.elapsed,information:e.gain(s).toString()};
 }
 const result={policy,complete:e.canEvaporate(s)&&d.ownsDynamics(s,'d-horizon'),seconds:s.elapsed,firstEvap,information:e.gain(s).toString(),resets:s.dynamics.serial,nodes:s.dynamics.owned.length,structures:s.nodes.length,manual,maxActionGap,note:'Deterministic scripted engine simulation, not wall-clock play.'};
 fs.writeFileSync(`${output}/${policy}.json`,JSON.stringify({result,events},null,2));console.log(result);if(!result.complete)process.exitCode=1;
}
