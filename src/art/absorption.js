const clamp=x=>Math.max(0,Math.min(1,x));
export function absorptionFrame(kind,progress,reduced=false) {
 const p=clamp(progress),late=clamp((p-.55)/.45),tidal=clamp((p-.4)/.6),calm=reduced?.5:1;
 const modes={
  rigid:{stretch:1,squash:1,trail:5,scatter:.004*late,heat:late,alpha:1,tail:late*.3,radial:false},
  rubble:{stretch:1+.4*late,squash:1-.2*late,trail:18,scatter:.04*late,heat:late*.4,alpha:1-.65*late,tail:.15+.3*late,radial:false},
  comet:{stretch:1+.5*tidal,squash:1-.4*tidal,trail:35,scatter:.012,heat:late*.3,alpha:1-.5*late,tail:.35,radial:true},
  rocky:{stretch:1+3*late,squash:1-.7*late,trail:24,scatter:.022*late,heat:late*.8,alpha:1-.35*late,tail:late*.65,radial:true},
  gas:{stretch:1+4*tidal,squash:1-.7*tidal,trail:40,scatter:.016*tidal,heat:tidal*.55,alpha:1-.8*tidal,tail:tidal*.6,radial:true},
  star:{stretch:1+8*tidal,squash:1-.9*tidal,trail:48,scatter:.002,heat:tidal,alpha:1-.25*late,tail:tidal*.85,radial:true},
  compact:{stretch:1+.12*late,squash:1,trail:18,scatter:.001,heat:.15*late,alpha:1,tail:.25,radial:false},
  blackhole:{stretch:1,squash:1,trail:18,scatter:.001,heat:0,alpha:1,tail:.2,radial:false},
  cosmic:{stretch:1+2*tidal,squash:1-.5*tidal,trail:36,scatter:.045*(1-tidal*.5),heat:tidal*.3,alpha:1-.8*tidal,tail:.35+tidal*.2,radial:true}
 };
 const f=modes[kind]||modes.rubble;
 return {...f,tail:f.tail*calm,scatter:f.scatter*calm,tidal,late};
}
