const seedOf=name=>{let n=2166136261;for(const c of name)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
export function speciesProfile(item) {
 const name=item.name.toLowerCase(),kind=item.render,seed=seedOf(name);
 const rigid=['manufactured','machine'].includes(kind),rocky=['planet','moon'].includes(kind),stellar=['star','giant'].includes(kind);
 let palette=kind==='gas'?['#a58558','#dbc49a']:stellar?['#cf743e','#fff0c3']:kind==='compact'?['#9caebd','#e6eff2']:['#67665b','#b1aa91'];
 if(/ice|icy|neptune|uranus|water|ocean|earth|europa|methane|pluto/.test(name))palette=['#426472','#a8c0c1'];
 if(/carbon|graphite|coal/.test(name))palette=['#292e2b','#69756b'];
 if(/iron|metal|titanium|steel|nickel/.test(name))palette=['#687072','#c2c6bd'];
 if(/lava|volcan|mars|\bred\b/.test(name))palette=['#713b2b','#ce8659'];
 if(/blue|sirius|o-type|b-type|neutron|pulsar/.test(name))palette=['#789db0','#e1f0ee'];
 if(kind==='comet')palette=['#677d7d','#b2c4bd'];
 if(stellar){
  const index=item.id%10;
  if(item.category===13)palette=[`hsl(${18+index*2} 38% ${20+index*2}%)`,`hsl(${30+index} 55% ${42+index*3}%)`];
  if(item.category===14)palette=[`hsl(${8+index*3} 48% ${30+index}%)`,`hsl(${20+index*3} 62% ${50+index*2}%)`];
  if(item.category===15)palette=[`hsl(${index<3?30:190+index*2} ${index<3?45:28}% 65%)`,`hsl(${index<3?42:195} 35% 92%)`];
  if(/carbon star/.test(name))palette=['#a54e30','#e5a367'];
 }
 if(kind==='compact')palette=['#83a0af','#edf3ed'];
 const vehicles=[['truck','truck'],['excavator','excavator'],['locomotive','locomotive'],['hauler','hauler'],['station','station'],['submarine','submarine'],['cargo ship','ship'],['platform','platform'],['arcology','arcology'],['district','district']];
 const shape=rigid?(vehicles.find(([token])=>name.includes(token))?.[1]||(/flywheel|rotor|turbine/.test(name)?'wheel':/vessel|reactor/.test(name)?'vessel':/beam|ingot|billet/.test(name)?'beam':/crucible/.test(name)?'crucible':'machine')):
 kind==='cosmic'?(/filament/.test(name)?'filament':/group|galaxy cluster/.test(name)?'group':/spiral|galaxy|galactic/.test(name)?'spiral':'cluster'):'body';
 return {id:item.id,name:item.name,seed,kind,shape,palette,
  surface:kind==='gas'?'bands':/ocean|earth|subglacial/.test(name)?'ocean':/lava|volcan/.test(name)?'lava':/ice|icy|europa|pluto/.test(name)?'ice':rocky?'craters':'facets',
  ring:/ringed|saturn|haumea/.test(name),binary:/binary|pair/.test(name),contact:/contact binary/.test(name),
  atmosphere:/earth|venus|titan|neptune|gas|jupiter/.test(name),pulse:/pulsar|magnetar|magnetic/.test(name),
  protrusions:/flare|variable|wolf-rayet|mira|be star/.test(name),variant:item.id%10,
  aspect:/whisker|filing|shaving/.test(name)?[1.55,.38]:/flake|shard|plate|shelf/.test(name)?[1.25,.6]:[1,1],
  scale:rigid?.75:kind==='dust'?.36:kind==='compact'?.58:1,
  absorption:rigid?'rigid':kind==='comet'?'comet':rocky?'rocky':kind==='gas'?'gas':stellar?'star':kind==='compact'?'compact':kind==='blackhole'?'blackhole':kind==='cosmic'?'cosmic':'rubble'};
}
export function drawSpecies(ctx,p,size=64) {
 let seed=p.seed;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 ctx.save();ctx.translate(size/2,size/2);ctx.scale(size/64,size/64);
 const color=p.palette;
 function sphere(x,y,r) {
  if(['star','giant','compact','blackhole'].includes(p.kind))r*=.82+p.variant*.025;
  ctx.save();ctx.translate(x,y);
  if(p.kind==='star'||p.kind==='giant'||p.kind==='compact'){
   const glow=ctx.createRadialGradient(0,0,r*.1,0,0,r*1.5);glow.addColorStop(0,color[1]);glow.addColorStop(.52,color[0]);glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(-r*1.5,-r*1.5,r*3,r*3);
   if(p.pulse){ctx.strokeStyle=color[1];ctx.globalAlpha=.7;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-r*1.8,0);ctx.lineTo(r*1.8,0);ctx.moveTo(0,-r*1.8);ctx.lineTo(0,r*1.8);ctx.stroke();ctx.globalAlpha=1;}
  }
  if(p.kind==='blackhole'){
   ctx.fillStyle='#010202';ctx.beginPath();ctx.arc(0,0,r*.7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d3b980';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,r*1.2,r*.4,-.3,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#8a805f';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(0,0,r*.76,0,Math.PI*2);ctx.stroke();ctx.restore();return;
  }
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.save();ctx.clip();
  const light=ctx.createRadialGradient(-r*.35,-r*.4,0,r*.3,r*.3,r*1.7);light.addColorStop(0,color[1]);light.addColorStop(.58,color[0]);light.addColorStop(1,'#080c0b');ctx.fillStyle=light;ctx.fillRect(-r,-r,2*r,2*r);
  for(let k=0;k<38;k++){
   const px=(random()*2-1)*r,py=(random()*2-1)*r,rr=1+random()*r*.2;
   ctx.globalAlpha=.1+random()*.17;ctx.fillStyle=k%2?color[1]:'#152220';
   if(['star','giant','compact'].includes(p.kind)){ctx.globalAlpha=.08;ctx.fillStyle=color[1];ctx.fillRect(px,py,.6,.6);continue;}
   if(p.surface==='bands'){ctx.fillRect(-r,py,2*r,1+random()*2);}
   else if(p.surface==='ocean'||p.surface==='lava'){ctx.fillStyle=p.surface==='ocean'?'#aaa078':'#e39b4c';ctx.globalAlpha=.5;ctx.beginPath();for(let j=0;j<7;j++){const a=j*Math.PI*2/7,rad=rr*(.7+random());ctx.lineTo(px+Math.cos(a)*rad,py+Math.sin(a)*rad);}ctx.closePath();ctx.fill();}
   else{ctx.beginPath();ctx.arc(px,py,rr,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();ctx.globalAlpha=1;
  if(p.protrusions){ctx.strokeStyle=color[0];ctx.lineWidth=1;for(let j=0;j<3;j++){const a=random()*Math.PI*2;ctx.beginPath();ctx.arc(Math.cos(a)*r*.83,Math.sin(a)*r*.83,r*.3,a,a+Math.PI*1.5);ctx.stroke();}}
  if(p.atmosphere){ctx.strokeStyle=color[1];ctx.globalAlpha=.35;ctx.lineWidth=1.1;ctx.beginPath();ctx.arc(0,0,r+.8,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
 }
 if(p.shape!=='body'&&p.kind!=='cosmic'){
  ctx.scale(.88+random()*.15,.82+random()*.18);
  ctx.fillStyle=color[0];ctx.strokeStyle=color[1];ctx.lineWidth=1;
  if(p.shape==='wheel'){ctx.beginPath();ctx.arc(0,0,19,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#101612';ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();const blades=p.name.toLowerCase().includes('rotor')?12:5;for(let j=0;j<blades;j++){ctx.save();ctx.rotate(j*Math.PI*2/blades);ctx.fillStyle=color[1];ctx.fillRect(8,-2,10,3);ctx.restore();}}
  else if(p.shape==='vessel'){ctx.beginPath();ctx.roundRect(-12,-23,24,46,10);ctx.fill();ctx.stroke();ctx.fillRect(-17,-9,34,4);ctx.fillRect(-17,9,34,4);}
  else if(['truck','hauler','locomotive','excavator'].includes(p.shape)){
   ctx.fillRect(-25,-9,31,20);ctx.strokeRect(-25,-9,31,20);ctx.fillRect(7,-16,17,27);ctx.strokeRect(7,-16,17,27);ctx.fillStyle='#1a2929';ctx.fillRect(11,-13,10,8);
   for(let j=0;j<(p.shape==='locomotive'?5:3);j++){ctx.beginPath();ctx.arc(-20+j*(p.shape==='locomotive'?10:20),12,p.shape==='hauler'?7:4,0,Math.PI*2);ctx.fill();ctx.stroke();}
   if(p.shape==='excavator'){ctx.strokeStyle=color[1];ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(12,-10);ctx.lineTo(22,-27);ctx.lineTo(-1,-24);ctx.lineTo(-13,-12);ctx.stroke();}
  }
  else if(['submarine','ship'].includes(p.shape)){
   ctx.beginPath();ctx.ellipse(0,4,28,p.shape==='submarine'?10:13,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillRect(-5,-14,15,15);ctx.strokeRect(-5,-14,15,15);if(p.shape==='ship'){ctx.fillRect(-23,-9,8,12);ctx.fillRect(-13,-9,8,12);}else{ctx.fillRect(1,-22,3,10);}
  }
  else if(p.shape==='station'){
   ctx.fillRect(-5,-19,10,38);ctx.strokeRect(-5,-19,10,38);ctx.fillRect(-26,-3,52,6);for(const x of [-24,10]){ctx.fillStyle='#41575c';ctx.fillRect(x,-14,14,28);ctx.strokeRect(x,-14,14,28);}
  }
  else if(['platform','arcology','district'].includes(p.shape)){
   ctx.fillRect(-25,15,50,5);ctx.strokeRect(-25,15,50,5);for(let j=0;j<4;j++){const h=10+(p.variant+j*7)%25;ctx.fillRect(-23+j*12,15-h,10,h);ctx.strokeRect(-23+j*12,15-h,10,h);}if(p.shape==='platform'){ctx.fillRect(-21,20,4,10);ctx.fillRect(18,20,4,10);}if(p.shape==='arcology'){ctx.beginPath();ctx.arc(0,0,26,Math.PI,Math.PI*2);ctx.stroke();}
  }
  else {ctx.beginPath();if(p.shape==='beam'){ctx.moveTo(-25,-10);ctx.lineTo(17,-15);ctx.lineTo(25,-6);ctx.lineTo(25,10);ctx.lineTo(-17,15);ctx.lineTo(-25,7);}else if(p.shape==='crucible'){ctx.moveTo(-19,-19);ctx.lineTo(19,-19);ctx.lineTo(13,21);ctx.lineTo(-13,21);}else{ctx.moveTo(-22,-13);ctx.lineTo(-5,-13);ctx.lineTo(-5,-22);ctx.lineTo(13,-22);ctx.lineTo(13,-8);ctx.lineTo(23,-8);ctx.lineTo(23,19);ctx.lineTo(-22,19);}ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#242c29';for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(-12+k*9,-8);ctx.lineTo(-12+k*9,12);ctx.stroke();}}
  for(let k=0;k<4;k++){ctx.fillStyle=k%2?color[1]:'#202824';ctx.fillRect(-10+random()*20,-8+random()*16,2,2);}
 } else if(p.kind==='cosmic'){
  for(let k=0;k<180;k++){const a=random()*Math.PI*2,r=(p.name.includes('Nuclear')?random()**2:Math.sqrt(random()))*25;let x=Math.cos(a)*r,y=Math.sin(a)*r;
   if(p.shape==='spiral'){const arm=k%2*Math.PI+r*(.17+p.variant*.01);x=Math.cos(arm)*r+(random()-.5)*5;y=Math.sin(arm)*r*.5+(random()-.5)*4;}if(p.shape==='filament'){x=(random()-.5)*54;y=Math.sin(x*.13)*8+(random()-.5)*7;}if(p.shape==='group'){const center=k%4*Math.PI/2;x=Math.cos(center)*16+x*.35;y=Math.sin(center)*16+y*.35;}
   ctx.fillStyle=k%4===0?'#c4baa0':'#757e71';ctx.globalAlpha=.25+random()*.7;ctx.fillRect(x,y,k%17===0?1.7:.7,k%17===0?1.7:.7);}
 } else if(['dust','rock','asteroid','comet'].includes(p.kind)){
  ctx.scale(...p.aspect);
  if(p.kind==='comet'){const g=ctx.createLinearGradient(-23,12,20,-10);g.addColorStop(0,'transparent');g.addColorStop(1,'#8da4a2');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(9,-5);ctx.lineTo(-27,22);ctx.lineTo(-19,-3);ctx.closePath();ctx.fill();}
  const body=(x,r)=>{ctx.beginPath();for(let k=0;k<11;k++){const a=k*Math.PI*2/11,rr=r*(.72+random()*.28);ctx.lineTo(x+Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fillStyle=color[0];ctx.fill();ctx.strokeStyle=color[1];ctx.lineWidth=.8;ctx.stroke();ctx.save();ctx.clip();for(let k=0;k<14;k++){ctx.globalAlpha=.3;ctx.fillStyle=k%2?color[1]:'#272e28';ctx.beginPath();ctx.moveTo(x+(random()-.5)*r*2,(random()-.5)*r*2);ctx.lineTo(x+(random()-.5)*r*2,(random()-.5)*r*2);ctx.lineTo(x+(random()-.5)*r*2,(random()-.5)*r*2);ctx.fill();}ctx.restore();};
  if(p.binary){body(-8,15);body(10,12);}else body(p.kind==='comet'?9:0,p.kind==='comet'?11:p.kind==='dust'?13:22);
 } else {
  if(p.ring){ctx.strokeStyle='#a59a79';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,29,10,-.35,Math.PI,Math.PI*2);ctx.stroke();}
  if(p.binary){sphere(-12,-5,12);sphere(12,6,10);}else sphere(0,0,p.ring?17:p.kind==='compact'?13:21);
  if(p.ring){ctx.strokeStyle='#c3b495';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,29,10,-.35,0,Math.PI);ctx.stroke();ctx.strokeStyle='#625d4d';ctx.lineWidth=1;ctx.stroke();}
 }
 ctx.restore();
}
