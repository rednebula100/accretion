// WebGL layer: ray-marched black hole (kept from the original project) + instanced matter + particles + post FX.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import blackhole from "../shaders/blackhole.glsl?raw";
import atlasUrl from "../assets/matter-atlas.png";

const QUALITY = { ULTRA: [1, 340], HIGH: [0.8, 280], BALANCED: [0.6, 230], MOBILE: [0.42, 190] };
const DIST = 9.7;
export const SHADOW_K = 2.6 / DIST / Math.tan(Math.PI / 6); // screen radius of the shadow per unit BH radius
const MAXB = 420,
  MAXP = 7000;

const vert = `out vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const bodyVert = `attribute vec4 bodyData;varying vec2 vUv;varying vec4 vData;void main(){vUv=uv;vData=bodyData;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`;
const bodyFrag = `precision highp float;varying vec2 vUv;varying vec4 vData;uniform sampler2D uAtlas;
void main(){float id=vData.x;vec2 cell=vec2(mod(id,16.),15.-floor(id/16.));vec2 uv=(cell+mix(vec2(.03125),vec2(.96875),vUv))/16.;vec4 t=texture2D(uAtlas,uv);if(t.a<.02)discard;
vec2 p=vUv-.5;float rim=smoothstep(.12,.5,length(p));vec3 c=t.rgb*1.45+vec3(.10,.13,.17)*rim;
c=mix(c,c*vec3(1.5,.75,.35)+vec3(.9,.32,.05)*(.35+rim),vData.y*.85);c+=vec3(1.5,1.3,1.05)*vData.z;gl_FragColor=vec4(c,t.a*vData.w);}`;
const pointVert = `attribute vec3 tint;attribute float size;attribute float opacity;varying vec3 vTint;varying float vOpacity;void main(){vTint=tint;vOpacity=opacity;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=size;}`;
const pointFrag = `varying vec3 vTint;varying float vOpacity;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(vTint,exp(-r*r*3.5)*vOpacity);}`;
const finalFrag = `uniform sampler2D tDiffuse;uniform float flash,dark,ab,red,aspect;uniform vec2 shake;uniform vec4 wave;varying vec2 vUv;
void main(){vec2 uv=vUv+shake;vec2 p=uv-.5;vec2 q=vec2(p.x*aspect,p.y)*2.;vec2 d=q-wave.xy;float dl=length(d);float w=exp(-pow((dl-wave.z)*7.,2.))*wave.w;
uv+=normalize(d+1e-5)*w*.035/vec2(aspect,1.);vec2 dir=p*(ab+w*.02);
vec3 c=vec3(texture2D(tDiffuse,uv+dir).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-dir).b);float v=dot(p,p);
c*=(1.-.6*v)*dark;c+=vec3(1.,.10,.06)*red*v*v*2.2;c+=vec3(flash);gl_FragColor=vec4(c,1.);}`;

export class Gfx {
  constructor(canvas) {
    this.canvas = canvas;
    const R = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", alpha: false }));
    R.setPixelRatio(1);
    R.toneMapping = THREE.ACESFilmicToneMapping;
    R.toneMappingExposure = 0.9;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
    this.camera.position.z = 10;
    const u = (this.u = {
      uResolution: { value: new THREE.Vector2() },
      uWorldOffset: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uCamPos: { value: new THREE.Vector3() },
      uCamBasis: { value: new THREE.Matrix3() },
      uTanHalfFov: { value: Math.tan(Math.PI / 6) },
      uRs: { value: 0.12 },
      uSpin: { value: 0.3 },
      uTemp: { value: 0.4 },
      uSteps: { value: 230 },
      uDisk: { value: 0.3 },
      uActivity: { value: 0 },
      uEra: { value: 3 },
      uCollapse: { value: 0 },
      uCollapseTime: { value: 0 },
      uJets: { value: 0 },
      uTurbulence: { value: 0 },
      uOrganization: { value: 0.4 },
    });
    u.uRadius = u.uRs;
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: vert, fragmentShader: blackhole, uniforms: u, depthTest: false, depthWrite: false }));
    quad.frustumCulled = false;
    this.scene.add(quad);
    this.setCamera(DIST);

    this.objects = new THREE.Scene();
    const geo = new THREE.PlaneGeometry(1, 1);
    this.bodyData = new Float32Array(MAXB * 4);
    geo.setAttribute("bodyData", new THREE.InstancedBufferAttribute(this.bodyData, 4).setUsage(THREE.DynamicDrawUsage));
    const tex = new THREE.TextureLoader().load(atlasUrl, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.generateMipmaps = false;
      t.minFilter = t.magFilter = THREE.LinearFilter;
    });
    this.bodies = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({ vertexShader: bodyVert, fragmentShader: bodyFrag, uniforms: { uAtlas: { value: tex } }, transparent: true, depthTest: false, depthWrite: false }), MAXB);
    this.bodies.frustumCulled = false;
    this.bodies.count = 0;
    this.nb = 0;
    this.m4 = new THREE.Matrix4();

    this.pos = new Float32Array(MAXP * 3);
    this.col = new Float32Array(MAXP * 3);
    this.siz = new Float32Array(MAXP);
    this.opa = new Float32Array(MAXP);
    this.pg = new THREE.BufferGeometry();
    for (const [k, a, n] of [["position", this.pos, 3], ["tint", this.col, 3], ["size", this.siz, 1], ["opacity", this.opa, 1]]) this.pg.setAttribute(k, new THREE.BufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage));
    this.points = new THREE.Points(this.pg, new THREE.ShaderMaterial({ vertexShader: pointVert, fragmentShader: pointFrag, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false;
    this.objects.add(this.points);
    this.objects.add(this.bodies);
    // particle sim (struct of arrays)
    this.P = { n: 0, x: new Float32Array(MAXP), y: new Float32Array(MAXP), vx: new Float32Array(MAXP), vy: new Float32Array(MAXP), life: new Float32Array(MAXP), max: new Float32Array(MAXP), size: new Float32Array(MAXP), r: new Float32Array(MAXP), g: new Float32Array(MAXP), b: new Float32Array(MAXP), pull: new Float32Array(MAXP), drag: new Float32Array(MAXP) };
    this.dust = Array.from({ length: 260 }, (_, i) => ({ a: i * 2.39996, r: 0.2 + ((i * 7919) % 1000) / 1000, s: 0.6 + (i % 7) / 7 }));

    this.composer = new EffectComposer(R);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const mp = new RenderPass(this.objects, this.camera);
    mp.clear = false;
    this.composer.addPass(mp);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.4, 0.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.final = new ShaderPass({ uniforms: { tDiffuse: { value: null }, flash: { value: 0 }, dark: { value: 1 }, ab: { value: 0 }, red: { value: 0 }, aspect: { value: 1 }, shake: { value: new THREE.Vector2() }, wave: { value: new THREE.Vector4(0, 0, 0, 0) } }, vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}", fragmentShader: finalFrag });
    this.composer.addPass(this.final);

    this.bh = { radius: 0.12, disk: 0.3, activity: 0, temp: 0.4, jets: 0, spin: 0.3, turb: 0, era: 3, collapse: 0, collapseT: 0 };
    this.view = { ox: 0, oy: 0, zoom: 1 };
    this.fx = { flash: 0, dark: 1, ab: 0, red: 0, sx: 0, sy: 0, wave: [0, 0, 0, 0] };
    this.quality = "AUTO";
    this.qi = 2;
    this.avg = 16;
    this.time = 0;
    this.lastAdapt = 0;
    new ResizeObserver(() => (this.needsResize = true)).observe(canvas.parentElement);
    this.resize();
  }
  setCamera(d) {
    const pos = this.u.uCamPos.value.set(0, d * 0.24, d * 0.97077);
    const fwd = pos.clone().negate().normalize(),
      right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize(),
      up = new THREE.Vector3().crossVectors(right, fwd);
    this.u.uCamBasis.value.set(right.x, up.x, fwd.x, right.y, up.y, fwd.y, right.z, up.z, fwd.z);
  }
  setQuality(q) {
    this.quality = q;
    this.resize();
  }
  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.aspect = this.width / this.height;
    const q = QUALITY[this.quality === "AUTO" ? Object.keys(QUALITY)[this.qi] : this.quality] || QUALITY.BALANCED;
    this.renderScale = q[0];
    this.u.uSteps.value = q[1];
    const w = Math.round(this.width * q[0]),
      h = Math.round(this.height * q[0]);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.u.uResolution.value.set(w, h);
    this.camera.left = -this.aspect;
    this.camera.right = this.aspect;
    this.camera.updateProjectionMatrix();
    this.final.uniforms.aspect.value = this.aspect;
  }
  begin() {
    this.nb = 0;
  }
  body(x, y, sx, sy, rot, id, heat, flash, alpha) {
    if (this.nb >= MAXB) return;
    const c = Math.cos(rot),
      s = Math.sin(rot),
      e = this.m4.elements;
    e[0] = c * sx; e[1] = s * sx; e[4] = -s * sy; e[5] = c * sy; e[10] = 1; e[12] = x; e[13] = y; e[14] = 1; e[15] = 1;
    this.bodies.setMatrixAt(this.nb, this.m4);
    const k = this.nb * 4;
    this.bodyData[k] = id; this.bodyData[k + 1] = heat; this.bodyData[k + 2] = flash; this.bodyData[k + 3] = alpha;
    this.nb++;
  }
  emit(x, y, vx, vy, life, size, r, g, b, pull = 0, drag = 1.5) {
    const P = this.P;
    if (P.n >= MAXP - 800) return;
    const i = P.n++;
    P.x[i] = x; P.y[i] = y; P.vx[i] = vx; P.vy[i] = vy; P.life[i] = P.max[i] = life; P.size[i] = size; P.r[i] = r; P.g[i] = g; P.b[i] = b; P.pull[i] = pull; P.drag[i] = drag;
  }
  burst(x, y, n, speed, life, size, col, pull = 0, spread = 6.2832, dir = 0) {
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() - 0.5) * spread,
        v = speed * (0.25 + Math.random());
      this.emit(x, y, Math.cos(a) * v, Math.sin(a) * v, life * (0.5 + Math.random()), size * (0.5 + Math.random()), col[0], col[1], col[2], pull);
    }
  }
  render(dt) {
    if (this.needsResize) {
      this.resize();
      this.needsResize = false;
    }
    this.time += dt;
    this.avg = this.avg * 0.96 + Math.min(200, dt * 1000) * 0.04;
    if (this.time - this.lastAdapt > 5 && this.quality === "AUTO") {
      if (this.avg > 24 && this.qi < 3) (this.qi++, this.resize());
      else if (this.avg < 17.2 && this.qi > 0) (this.qi--, this.resize());
      this.lastAdapt = this.time;
    }
    const u = this.u,
      b = this.bh,
      v = this.view,
      f = this.fx,
      rs = this.renderScale;
    this.setCamera(DIST / v.zoom);
    u.uRs.value = Math.max(0.004, b.radius);
    u.uTime.value = this.time;
    u.uSpin.value = b.spin;
    u.uTemp.value = b.temp;
    u.uDisk.value = b.disk;
    u.uActivity.value = b.activity;
    u.uEra.value = b.era;
    u.uCollapse.value = b.collapse;
    u.uCollapseTime.value = b.collapseT;
    u.uJets.value = b.jets;
    u.uTurbulence.value = b.turb;
    u.uWorldOffset.value.set(v.ox, v.oy);
    this.objects.position.set(v.ox, v.oy, 0);
    this.objects.scale.set(v.zoom, v.zoom, 1);
    this.bloom.strength = 0.42 + Math.min(0.5, b.activity * 0.12);
    this.bloom.radius = 0.35;
    this.bloom.threshold = 0.92;
    const F = this.final.uniforms;
    F.flash.value = f.flash;
    F.dark.value = f.dark;
    F.ab.value = f.ab;
    F.red.value = f.red;
    F.shake.value.set(f.sx, f.sy);
    F.wave.value.set(f.wave[0] * v.zoom + v.ox, f.wave[1] * v.zoom + v.oy, f.wave[2] * v.zoom, f.wave[3]);
    // particles
    const P = this.P;
    let n = 0;
    const shadow = SHADOW_K * b.radius * 0.9;
    for (let i = 0; i < P.n; i++) {
      const life = P.life[i] - dt;
      if (life <= 0) continue;
      let x = P.x[i], y = P.y[i], vx = P.vx[i], vy = P.vy[i];
      const d2 = x * x + y * y;
      if (P.pull[i]) {
        const d = Math.sqrt(d2) + 1e-4, a = (P.pull[i] * dt) / (d2 + 0.02);
        vx += (-x / d) * a - (y / d) * a * 0.9;
        vy += (-y / d) * a + (x / d) * a * 0.45;
        if (d < shadow) continue;
      }
      const dr = Math.max(0, 1 - P.drag[i] * dt);
      vx *= dr; vy *= dr; x += vx * dt; y += vy * dt;
      P.x[n] = x; P.y[n] = y; P.vx[n] = vx; P.vy[n] = vy; P.life[n] = life; P.max[n] = P.max[i]; P.size[n] = P.size[i]; P.r[n] = P.r[i]; P.g[n] = P.g[i]; P.b[n] = P.b[i]; P.pull[n] = P.pull[i]; P.drag[n] = P.drag[i];
      const k = life / P.max[n];
      this.pos[n * 3] = x; this.pos[n * 3 + 1] = y; this.pos[n * 3 + 2] = 1;
      this.col[n * 3] = P.r[n]; this.col[n * 3 + 1] = P.g[n]; this.col[n * 3 + 2] = P.b[n];
      this.siz[n] = P.size[n] * rs * (0.4 + 0.6 * k) * (this.height / 800);
      this.opa[n] = Math.min(1, k * 2.2);
      n++;
    }
    P.n = n;
    // ambient dust slowly spiralling in: the field is never dead
    const inner = shadow * 2.2;
    for (const d of this.dust) {
      d.r -= dt * 0.012 * d.s * (1 + b.activity);
      if (d.r < inner) d.r = 1.25;
      d.a += dt * 0.16 * d.s * Math.pow(0.5 / d.r, 1.5);
      this.pos[n * 3] = Math.cos(d.a) * d.r; this.pos[n * 3 + 1] = Math.sin(d.a) * d.r * 0.52; this.pos[n * 3 + 2] = 1;
      this.col[n * 3] = 0.55; this.col[n * 3 + 1] = 0.6; this.col[n * 3 + 2] = 0.72;
      this.siz[n] = (1.4 + d.s) * rs * (this.height / 800);
      this.opa[n] = 0.16 * Math.min(1, (d.r - inner) * 8) * Math.min(1, (1.25 - d.r) * 6) * (1 - b.collapse);
      n++;
    }
    this.pg.setDrawRange(0, n);
    for (const a of Object.values(this.pg.attributes)) a.needsUpdate = true;
    this.bodies.count = this.nb;
    this.bodies.instanceMatrix.needsUpdate = true;
    this.bodies.geometry.attributes.bodyData.needsUpdate = true;
    this.composer.render();
  }
}
