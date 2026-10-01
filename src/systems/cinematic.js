export const CINEMATIC_DURATION = 14;
export const SEED_RADIUS = .08;
/** Independent elapsed cinematic time; never multiply the renderer's lifetime clock. */
export function cinematicFrame(seconds, matureRadius, matureDisk, reduced = false) {
 if(seconds<0)return {radius:matureRadius,disk:matureDisk,collapse:0,flash:0,dark:1};
 if(seconds<9){const collapse=Math.min(1,seconds/8);return {radius:matureRadius*Math.max(.022,(1-seconds/9)**1.55),disk:Math.max(.7,matureDisk),collapse,flash:0,dark:1};}
 if(seconds<9.8)return {radius:.004,disk:0,collapse:0,flash:Math.exp(-(seconds-9)*9)*(reduced?.22:1.6),dark:.1};
 if(seconds<12)return {radius:.001,disk:0,collapse:0,flash:0,dark:0};
 return {radius:SEED_RADIUS*Math.min(1,(seconds-12)/2),disk:0,collapse:0,flash:0,dark:Math.min(1,(seconds-12)/1.5)};
}
