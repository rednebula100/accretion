// Adapted from hasnain7abbas/gargantua-blackhole (MIT), commit cdd4df5.

precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform vec2  uResolution;
uniform vec2 uWorldOffset;
uniform float uTime;
uniform vec3  uCamPos;
uniform mat3  uCamBasis;      // columns: right, up, forward
uniform float uTanHalfFov;
uniform float uRadius;
const float uRs = .72;            // schwarzschild radius (scene units)
uniform float uSpin;          // 0 .. 0.98
uniform float uTemp;          // 0 .. 1  (cool red -> blue-hot)
uniform int uSteps;
uniform float uDisk;
uniform float uActivity;
uniform float uEra;
uniform float uCollapse;
uniform float uCollapseTime;
uniform float uJets;
uniform float uTurbulence;
uniform float uOrganization;


// Simplex noise: Ashima Arts / Stefan Gustavson, MIT. See THIRD_PARTY_NOTICES.md.
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
float fbm(vec3 p){
  float f = 0.0, a = 0.5;
  for(int i = 0; i < 4; i++){
    f += a * snoise(p);
    p = p * 2.17 + vec3(11.3, 7.7, 5.1);
    a *= 0.5;
  }
  return f;
}
float fbm3(vec3 p){
  float f = 0.0, a = 0.5;
  for(int i = 0; i < 3; i++){
    f += a * snoise(p);
    p = p * 2.23 + vec3(11.3, 7.7, 5.1);
    a *= 0.5;
  }
  return f;
}


#define ESCAPE_R  34.0

// blackbody-ish ramp. t: 0 cool -> 1 blue-hot, with local modulation
vec3 plasmaColor(float t){
  t = clamp(t, 0.0, 1.6);
  vec3 c1 = vec3(1.00, 0.22, 0.03);   // deep red
  vec3 c2 = vec3(1.00, 0.52, 0.12);   // orange
  vec3 c3 = vec3(1.00, 0.83, 0.55);   // warm white
  vec3 c4 = vec3(0.95, 0.96, 1.00);   // white
  vec3 c5 = vec3(0.62, 0.78, 1.00);   // blue-white
  vec3 c = mix(c1, c2, smoothstep(0.00, 0.30, t));
  c = mix(c, c3, smoothstep(0.28, 0.58, t));
  c = mix(c, c4, smoothstep(0.55, 0.85, t));
  c = mix(c, c5, smoothstep(0.82, 1.25, t));
  return c;
}

// --- procedural starfield + faint nebula, sampled by escaped ray dir ---
float hash13(vec3 p){
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
vec3 hash33(vec3 p){
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
vec3 starLayer(vec3 rd, float scale, float bright){
  vec3 p = rd * scale;
  vec3 id = floor(p);
  vec3 col = vec3(0.0);
  vec3 rnd = hash33(id);
  vec3 sp = id + 0.15 + 0.7 * rnd;
  float d = length(p - sp);
  float mag = pow(hash13(id + 7.1), 22.0);           // few bright, many dim
  float star = smoothstep(0.13, 0.0, d) * mag * bright;
  // subtle temperature variation between stars
  vec3 tint = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.85, 0.68), rnd.x);
  return star * tint;
}
vec3 background(vec3 rd){
  vec3 col = vec3(0.0);
  col += starLayer(rd, 62.0, 1.4);
  col += starLayer(rd, 31.0, 2.6);
  col += starLayer(rd, 17.0, 3.8);
  // galactic dust band, tilted
  vec3 bn = normalize(vec3(0.22, 1.0, 0.31));
  float band = exp(-pow(dot(rd, bn) * 3.4, 2.0));
  float neb = fbm(rd * 3.1 + vec3(4.2)) * 0.5 + 0.5;
  float neb2 = fbm(rd * 7.3 - vec3(1.7)) * 0.5 + 0.5;
  col += band * (0.028 * vec3(0.62, 0.55, 0.72) * neb
               + 0.020 * vec3(0.82, 0.60, 0.44) * neb * neb2);
  // faint cold ambient nebulosity
  col += 0.0045 * vec3(0.35, 0.48, 0.72) * (fbm(rd * 2.1) * 0.5 + 0.5);
  return mix(vec3(dot(col,vec3(.333))),col, min(1.,uDisk)) * (0.22 + min(1.,uEra*.07)) * (1.0-uCollapse*.94);
}

// --- accretion disk volumetric sample ---
// returns rgb emission (pre-multiplied) in .rgb, absorption in .a
vec4 diskSample(vec3 p, vec3 rd, float rInner, float rOuter){
  if(uDisk < .001) return vec4(0.);
  float r = length(p.xz);
  if(r < rInner * 0.92 || r > rOuter) return vec4(0.0);

  float H = uRs * (0.032 + 0.085 * smoothstep(rInner, rOuter, r)) * (1.0 + .35*uTurbulence); // flaring height
  float vert = exp(-(p.y * p.y) / (H * H));
  if(vert < 0.004) return vec4(0.0);

  // Keplerian differential rotation (prograde with spin)
  float omega = 0.55 / (pow(r / uRs, 1.5) * 0.35 + 0.05);
  float ang = (uTime + uCollapseTime * uCollapseTime * .3) * omega;
  float ca = cos(ang), sa = sin(ang);
  vec2 q = mat2(ca, -sa, sa, ca) * p.xz;   // rewind rotation -> shearing noise

  // turbulence: stretched azimuthally for streaky gas lanes
  vec3 np = vec3(q.x, p.y * 5.0, q.y) * (2.4 / uRs);
  float turb = fbm3(np)*(0.55+.75*uTurbulence);
  float lanes = fbm3(vec3(np.xz * 0.5, uTime * 0.05).xzy);
  float density = vert
    * smoothstep(rInner * 0.92, rInner * 1.25, r)
    * pow(smoothstep(rOuter, rOuter * 0.42, r), 1.4)
    * (0.15 + 0.85 * clamp(turb * 0.85 + 0.5, 0.0, 1.0))
    * (0.28 + 0.72 * clamp(lanes * (0.8+.6*uOrganization) + 0.5, 0.0, 1.0));
  if(density < 0.003) return vec4(0.0);

  // orbital velocity for doppler (beta in c units, capped)
  float beta = clamp(0.5 * sqrt(uRs / max(r, uRs * 1.05)), 0.0, 0.72);
  vec3 vdir = normalize(vec3(-p.z, 0.0, p.x));            // prograde tangent
  float dshift = 1.0 / (1.0 + beta * dot(vdir, rd));      // >1 approaching
  float boost = mix(1.0, min(dshift * dshift * dshift, 5.0), 0.65);

  // temperature: hot inside, cool outside; doppler-shifted; grav redshift
  float g = sqrt(clamp(1.0 - uRs / max(r, uRs * 1.02), 0.0, 1.0));
  float tRad = pow(rInner * 1.35 / r, 0.75);
  float t = (0.12 + 1.05 * uTemp) * tRad * dshift * (0.35 + 0.65 * g);

  vec3 emit = plasmaColor(t) * density * boost * (0.40 + 2.6 * tRad) * g;
  return vec4(emit * uDisk * (1.0 + uActivity * 1.1), density * uDisk);
}

void main(){
  vec2 ndc = vUv * 2.0 - 1.0;
  float aspect = uResolution.x / uResolution.y;
  ndc -= vec2(uWorldOffset.x/aspect,uWorldOffset.y);
  vec3 rd = normalize(uCamBasis * vec3(ndc.x * aspect * uTanHalfFov,
                                       ndc.y * uTanHalfFov, 1.0));
  vec3 p = uCamPos * (.72 / max(uRadius, .001));
  float b = dot(p,rd), c = dot(p,p) - 256.0;
  float discriminant = b*b-c;
  if(c > 0.0){
    if(discriminant < 0.0 || b > 0.0){fragColor=vec4(background(rd),1.0);return;}
    p += rd * max(0.0,-b-sqrt(discriminant));
  }

  float rInner = uRs * (2.6 - 1.55 * uSpin);   // ISCO shrinks with spin
  float rOuter = uRs * 9.5;

  // conserved angular momentum^2 for photon (schwarzschild bend strength)
  vec3 hv = cross(p, rd);
  float h2 = dot(hv, hv);

  vec3 col = vec3(0.0);
  float trans = 1.0;
  bool captured = false;
  bool escaped = false;

  // uniform loop bound: keeps ANGLE/D3D from unrolling the march
  for(int i = 0; i < uSteps; i++){
    float r2 = dot(p, p);
    float r = sqrt(r2);

    if(r < uRs * 1.01){ captured = true; break; }
    if(r2 > ESCAPE_R * ESCAPE_R && dot(p, rd) > 0.0){ escaped = true; break; }

    // adaptive step: fine near hole & disk plane, coarse far away
    float dt = clamp(r * 0.09, 0.008 * uRs, 0.65);
    float rxz = length(p.xz);
    if(abs(p.y) < uRs * 0.7 && rxz < rOuter * 1.25) dt = min(dt, 0.028 * uRs + 0.12 * abs(p.y));
    dt *= 1.25;

    // geodesic bend:  a = -3/2 h^2 r_vec / r^5   (schwarzschild null ray)
    vec3 accel = -1.5 * h2 * uRs * p / (r2 * r2 * r);
    // frame dragging: tangential pull, ~1/r^3 like the Kerr metric
    accel += uSpin * uRs * uRs * 0.3 * cross(vec3(0.0, 1.0, 0.0), p) / (r2 * r2);

    rd = normalize(rd + accel * dt);
    p += rd * dt;

    // volumetric disk accumulation
    vec4 dsk = diskSample(p, rd, rInner, rOuter);
    if(dsk.a > 0.0){
      col += trans * dsk.rgb * dt * 4.5;
      trans *= exp(-dsk.a * dt * 9.0);
      if(trans < 0.01){ captured = true; break; }   // fully occluded
    }
  }

  if(escaped){
    col += trans * background(normalize(rd));
  }
  // rays that ran out of steps near the hole -> shadow (correct look)

  // A faint capture corona makes a non-accreting seed legible against space.
  vec2 screen = ndc * vec2(aspect,1.0);
  float apparent = 2.6 * uRadius / length(uCamPos) / uTanHalfFov;
  float halo = exp(-abs(length(screen) - apparent)*220.0) * (.18+uActivity*.2) * (1.0-uDisk);
  col += vec3(halo);
  float jet = exp(-abs(screen.x)*85.0) * exp(-abs(screen.y)*2.8) * smoothstep(apparent, apparent*2.5,abs(screen.y));
  col += vec3(.30,.48,.58) * jet * uJets * (1.0+uActivity);
  fragColor = vec4(col, 1.0);
}
