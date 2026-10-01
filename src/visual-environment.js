const reveal=(v,a,b)=>Math.max(0,Math.min(1,(v-a)/(b-a)));
/** Fixed observatory reference coordinates. These are context, never acquirable Matter. */
export function drawEnvironment(v,aspect,distance,put,visible=1) {
 const scale=9.7/distance;
 const dot=(x,y,size,alpha,tint=[.51,.53,.44])=>put(x*scale,y*scale,...tint,size,alpha*visible);
 const debris=reveal(v,.08,.25)*(1-reveal(v,.5,.7));
 for(let i=0;i<56;i++){const a=i*2.39996,r=1.02+((i*73)%41)/180;dot(Math.cos(a)*r,Math.sin(a)*r*.42,1,debris*.13);}
 const planetary=reveal(v,.28,.45)*(1-reveal(v,.75,.9));
 for(let i=0;i<48;i++){const a=i*Math.PI/24;dot(-aspect*.78+.082*Math.cos(a),.44+.082*Math.sin(a),1.2,planetary*.2);}
 dot(-aspect*.78+.14,.49,2.5,planetary*.4);
 const companions=reveal(v,.42,.6);
 dot(aspect*.79,.52,4.2,companions*.65,[.95,.78,.53]);dot(aspect*.79+.055,.54,2.3,companions*.45,[.65,.72,.8]);
 const cluster=reveal(v,.62,.8);
 for(let i=0;i<72;i++){const a=i*2.39996,r=.17*Math.sqrt((i+.5)/72);dot(aspect*.74+Math.cos(a)*r,-.56+Math.sin(a)*r*.65,i%11===0?2:1,cluster*(.32-.22*r/.17));}
 const galaxy=reveal(v,.8,.98);
 for(let i=0;i<110;i++){const r=.03+i/290,a=i*.18+(i%2)*Math.PI;dot(-aspect*.65+r*Math.cos(a),-.55+.35*r*Math.sin(a),1.8,galaxy*(.17-.11*r/.42),[.66,.57,.44]);}
}
