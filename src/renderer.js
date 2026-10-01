import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import blackhole from "./shaders/blackhole.glsl?raw";
import { cinematicFrame, SEED_RADIUS } from "./systems/cinematic.js";
import { MATTER } from "./content.js";
import { era, has } from "./engine.js";
import { visualState } from "./systems/visual-state.js";
import { drawEnvironment } from "./visual-environment.js";
import { ART_SPECIES } from "./art/enabled.js";
import { speciesProfile } from "./art/species.js";
import { absorptionFrame } from "./art/absorption.js";
import { interpolatedAge } from "./ui/presentation.js";
const species = MATTER.map(speciesProfile);
const QUALITY = {
  ULTRA: [1, 340],
  HIGH: [0.8, 280],
  BALANCED: [0.6, 230],
  MOBILE: [0.4, 190],
};
const vert = `out vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const bodyVert = `attribute vec4 bodyData; varying vec2 vUv; varying vec4 vData; varying vec2 vField; varying vec2 vCenter; void main(){vUv=uv;vData=bodyData;vec4 field=instanceMatrix*vec4(position,1.);vField=field.xy;vCenter=instanceMatrix[3].xy;gl_Position=projectionMatrix*modelViewMatrix*field;}`;
const bodyFrag = `precision highp float;varying vec2 vUv;varying vec4 vData;varying vec2 vField;varying vec2 vCenter;uniform sampler2D uMatterAtlas;uniform float uShadow;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){if(length(vField)<uShadow||dot(vField,vCenter)<0.)discard;vec2 p=(vUv-.5)*2.;float r=length(p),kind=vData.x,heat=vData.y,seed=vData.z;float edge=1.;vec3 color=vec3(.64,.62,.56);float alpha=1.;
if(kind<0.){float id=-kind-1.;vec2 cell=vec2(mod(id,16.),15.-floor(id/16.));vec2 uv=(cell+mix(vec2(.03125),vec2(.96875),vUv))/16.;vec4 tile=texture2D(uMatterAtlas,uv);if(tile.a<.01)discard;tile.rgb=mix(tile.rgb,tile.rgb+vec3(.4,.16,.03),heat*.5);gl_FragColor=vec4(tile.rgb,tile.a*vData.w);return;}
if(kind<1.5){edge=.78+.12*sin(atan(p.y,p.x)*7.+seed*20.)+.06*sin(atan(p.y,p.x)*13.);color=vec3(.46,.43,.38)*(0.8+.25*sin(p.x*28.)*sin(p.y*32.));}
if(kind>1.5&&kind<2.5){r=max(abs(p.x),abs(p.y)*1.5);edge=.85;color=vec3(.64,.67,.69);if(kind>2.1){float hull=max(abs(p.x)-.82,abs(p.y+.05)-.22);float cabin=max(abs(p.x+.48)-.23,abs(p.y-.23)-.22);float wheels=min(length(p-vec2(.5,-.31)),length(p-vec2(-.5,-.31)))-.17;if(min(hull,min(cabin,wheels))>0.)discard;if(wheels<0.)color*=.3;}else if(abs(p.x)<.12||abs(p.y)<.12)color*=.4;}
if(kind>2.5&&kind<3.5){float f=noise(p*3.+seed*100.)+.35*noise(p*9.)+.15*noise(p*23.);color=mix(vec3(.09,.20,.27),vec3(.44,.42,.24),smoothstep(.55,.66,f));color+=vec3(.24)*smoothstep(.72,.93,abs(p.y));}
if(kind>3.5&&kind<4.5){float bands=sin(p.y*24.+sin(p.x*5.)*.65);color=mix(vec3(.48,.27,.13),vec3(.8,.67,.43),bands*.5+.5);}
if(kind>4.5&&kind<5.5){color=mix(vec3(1.,.27,.035),vec3(1.,.91,.64),.6+.25*sin(p.x*33.+seed)*sin(p.y*28.));color*=2.8;edge=.86;alpha=exp(-max(0.,r-.75)*8.);}
if(kind>5.5&&kind<6.5){color=vec3(.5,.77,1.)*2.;edge=.55;}
if(kind>6.5&&kind<7.5){color=mix(vec3(0.),vec3(1.,.74,.38)*3.,exp(-abs(r-.64)*30.));edge=.93;}
if(kind>7.5){float arms=pow(.5+.5*sin(atan(p.y,p.x)*3.-r*12.),6.);float stars=pow(noise(p*70.),15.)*18.;alpha=(arms*.4+stars+exp(-r*18.))*exp(-r*2.);color=vec3(1.5,1.2,.8);}
if(r>edge&&kind<4.5)discard;if(r>1.)discard;
float light=sqrt(max(0.,1.-r*r));float diffuse=clamp(.22+light*.75-p.x*.5+p.y*.25,.1,1.);
if(kind<4.5)color*=diffuse;color=mix(color,vec3(1.7,.66,.2),heat*.65);alpha*=smoothstep(1.,.82,r)*vData.w;
gl_FragColor=vec4(color,alpha);}`;
const pointVert = `attribute vec3 tint;attribute float size;attribute float opacity;varying vec3 vTint;varying float vOpacity;void main(){vTint=tint;vOpacity=opacity;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=size;}`;
const pointFrag = `varying vec3 vTint;varying float vOpacity;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(vTint,exp(-r*r*4.)*vOpacity);}`;
export class Universe {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;
    this.renderer.info.autoReset = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
    this.camera.position.z = 10;
    this.u = {
      uResolution: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uCamPos: { value: new THREE.Vector3() },
      uCamBasis: { value: new THREE.Matrix3() },
      uTanHalfFov: { value: Math.tan(Math.PI / 6) },
      uRs: { value: 0.18 },
      uSpin: { value: 0 },
      uTemp: { value: 0.45 },
      uSteps: { value: 280 },
      uDisk: { value: 0 },
      uActivity: { value: 0 },
      uEra: { value: 0 },
      uCollapse: { value: 0 },
      uCollapseTime: { value: 0 },
      uJets: { value: 0 },
      uTurbulence: { value: 0 },
      uOrganization: { value: 0 },
    };
    this.u.uRadius = this.u.uRs;
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: vert,
      fragmentShader: blackhole,
      uniforms: this.u,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    this.scene.add(quad);
    this.objects = new THREE.Scene();
    this.geo = new THREE.PlaneGeometry(2, 2);
    this.bodyArray = new Float32Array(200 * 4);
    this.geo.setAttribute(
      "bodyData",
      new THREE.InstancedBufferAttribute(this.bodyArray, 4),
    );
    this.bodies = new THREE.InstancedMesh(
      this.geo,
      new THREE.ShaderMaterial({
        vertexShader: bodyVert,
        fragmentShader: bodyFrag,
        uniforms: {
          uShadow: { value: 0 },
          uMatterAtlas: {
            value: new THREE.TextureLoader().load(
              import.meta.env.BASE_URL + "matter-atlas.png",
              (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.generateMipmaps = false;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
              },
            ),
          },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
      200,
    );
    this.bodies.frustumCulled = false;
    this.bodies.count = 0;
    this.objects.add(this.bodies);
    this.particleCount = 12000;
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    this.opacities = new Float32Array(this.particleCount);
    this.pg = new THREE.BufferGeometry();
    for (const [key, array, num] of [
      ["position", this.positions, 3],
      ["tint", this.colors, 3],
      ["size", this.sizes, 1],
      ["opacity", this.opacities, 1],
    ])
      this.pg.setAttribute(
        key,
        new THREE.BufferAttribute(array, num).setUsage(THREE.DynamicDrawUsage),
      );
    this.points = new THREE.Points(
      this.pg,
      new THREE.ShaderMaterial({
        vertexShader: pointVert,
        fragmentShader: pointFrag,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.points.frustumCulled = false;
    this.objects.add(this.points);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const matterPass = new RenderPass(this.objects, this.camera);
    matterPass.clear = false;
    this.composer.addPass(matterPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.68, 0.55, 0.52);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.final = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        flash: { value: 0 },
        dark: { value: 1 },
        time: { value: 0 },
      },
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
      fragmentShader:
        "uniform sampler2D tDiffuse;uniform float flash;uniform float dark;uniform float time;varying vec2 vUv;void main(){vec2 p=vUv-.5;vec2 uv=vUv+p*sin(length(p)*80.-time*5.)*flash*.015;vec3 c=texture2D(tDiffuse,uv).rgb;float vignette=1.-.25*dot(p,p);gl_FragColor=vec4(c*vignette*dark+vec3(flash),1.);}",
    });
    this.composer.addPass(this.final);
    this.bloom.radius = 0.25;
    this.bloom.threshold = 1.15;
    this.quality = "AUTO";
    this.qi = 2;
    this.fps = 60;
    this.avg = 16;
    this.lastAdapt = 0;
    this.rs = 0.08;
    this.disk = 0;
    this.zoom = 0;
    this.contextDistance = 9.7;
    this.lastEra = 0;
    this.time = 0;
    this.resetCount = 0;
    this.matrix = new THREE.Object3D();
    this.observer = new ResizeObserver(() => {
      this.needsResize = true;
    });
    this.observer.observe(canvas.parentElement);
    this.resize();
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("renderer-lost"));
    });
    canvas.addEventListener("webglcontextrestored", () => location.reload());
  }
  resetFromState(s) {
    this.rs = SEED_RADIUS;
    this.disk = 0;
    this.zoom = 0;
    this.contextDistance = 9.7;
    this.lastEra = era(s);
    this.bodies.count = 0;
    this.pg.setDrawRange(0, 0);
    this.activeBodies = this.activeParticles = 0;
    this.u.uRs.value = SEED_RADIUS;
    this.u.uDisk.value =
      this.u.uActivity.value =
      this.u.uCollapse.value =
      this.u.uCollapseTime.value =
      this.u.uJets.value =
        0;
    this.final.uniforms.flash.value = 0;
    this.final.uniforms.dark.value = 1;
    this.resetCount++;
  }
  setQuality(preset) {
    if (this.quality === preset) return;
    this.quality = preset;
    this.resize();
  }
  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.aspect = this.width / this.height;
    const q =
      QUALITY[
        this.quality === "AUTO" ? Object.keys(QUALITY)[this.qi] : this.quality
      ];
    this.renderScale = q[0];
    this.u.uSteps.value = q[1];
    this.renderer.setSize(this.width * q[0], this.height * q[0], false);
    this.composer.setSize(this.width * q[0], this.height * q[0]);
    this.u.uResolution.value.set(this.width * q[0], this.height * q[0]);
    this.camera.left = -this.aspect;
    this.camera.right = this.aspect;
    this.camera.updateProjectionMatrix();
  }
  orbit(q, progress, rs) {
    const p = Math.max(0, Math.min(1, progress));
    const type = species[q.matter].absorption;
    const theta = q.seed * 100 + q.id * 2.39996;
    const turns =
      type === "blackhole" || type === "compact"
        ? 12
        : ["gas", "star", "rocky", "cosmic"].includes(type)
          ? 5
          : 2.5;
    const angle = theta + p * p * turns;
    const radius =
      (1 - Math.pow(p, 0.85)) * (1.12 + ((q.id * 17) % 13) / 35) + rs * 0.16;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.57];
  }
  render(s, dt, cinema = -1, worldCamera = null, fieldPulse = 0) {
    if (this.needsResize) {
      this.resize();
      this.needsResize = false;
    }
    this.time += dt;
    const t = this.time,
      e = era(s),
      u = this.u;
    this.avg = this.avg * 0.96 + Math.min(200, dt * 1000) * 0.04;
    this.fps = 1000 / this.avg;
    if (t - this.lastAdapt > 7 && this.quality === "AUTO") {
      if (this.avg > 25 && this.qi < 3) {
        this.qi++;
        this.resize();
      } else if (this.avg < 18 && this.qi > 0) {
        this.qi--;
        this.resize();
      }
      this.lastAdapt = t;
    }
    const aggregate = visualState(s);
    this.aggregate = aggregate;
    this.parallax ||= new THREE.Vector2();
    const targetX = worldCamera
      ? (-worldCamera.x * worldCamera.zoom) / (this.height * 0.5)
      : 0;
    const targetY = worldCamera
      ? (worldCamera.y * worldCamera.zoom) / (this.height * 0.5)
      : 0;
    // CameraDirector already eases travel. A second, weaker parallax would
    // detach the physical hole from the DOM ring around its world origin.
    this.parallax.set(targetX, targetY);
    this.objects.position.set(this.parallax.x, this.parallax.y, 0);
    if (!u.uWorldOffset) u.uWorldOffset = { value: new THREE.Vector2() };
    u.uWorldOffset.value.copy(this.parallax);
    this.rs += (aggregate.radius - this.rs) * Math.min(1, dt * 0.75);
    this.disk += (aggregate.disk - this.disk) * Math.min(1, dt * 0.7);
    this.contextDistance +=
      (aggregate.distance - this.contextDistance) * Math.min(1, dt * 0.18);
    const frame = cinematicFrame(
      cinema,
      this.rs,
      this.disk,
      s.settings.reducedMotion,
    );
    const { radius: rs, flash, dark, collapse, disk } = frame;
    const activity = aggregate.activity + collapse * 4 + fieldPulse * 0.7;
    u.uRs.value = Math.max(0.004, rs);
    u.uTime.value = t;
    u.uCollapseTime.value = cinema >= 0 && cinema < 9 ? cinema : 0;
    u.uSpin.value = aggregate.spin;
    u.uTemp.value = aggregate.temperature;
    u.uDisk.value = disk;
    u.uActivity.value = activity;
    u.uEra.value = aggregate.environment * 19;
    u.uCollapse.value = collapse;
    u.uJets.value = cinema < 0 ? aggregate.jets : 0;
    u.uTurbulence.value = aggregate.turbulence;
    u.uOrganization.value = aggregate.organization;
    const pos = u.uCamPos.value;
    const distance = this.contextDistance;
    pos.set(0, distance * 0.24, distance * 0.97077);
    const fwd = pos.clone().negate().normalize(),
      right = new THREE.Vector3()
        .crossVectors(fwd, new THREE.Vector3(0, 1, 0))
        .normalize(),
      up = new THREE.Vector3().crossVectors(right, fwd);
    u.uCamBasis.value.set(
      right.x,
      up.x,
      fwd.x,
      right.y,
      up.y,
      fwd.y,
      right.z,
      up.z,
      fwd.z,
    );
    this.bloom.strength = 0.22 + Math.min(0.25, activity * 0.04);
    this.final.uniforms.flash.value = flash + fieldPulse * 0.045;
    this.final.uniforms.dark.value = dark;
    this.final.uniforms.time.value = t;
    let bodies = 0,
      points = 0;
    const put = (x, y, r, g, b, size, opacity) => {
      if (points >= this.particleCount) return;
      let k = points * 3;
      this.positions[k] = x;
      this.positions[k + 1] = y;
      this.positions[k + 2] = 1;
      this.colors[k] = r;
      this.colors[k + 1] = g;
      this.colors[k + 2] = b;
      this.sizes[points] = size * this.renderScale;
      this.opacities[points] = opacity;
      points++;
    };
    const shadow = (2.6 * rs) / distance / Math.tan(Math.PI / 6);
    this.bodies.material.uniforms.uShadow.value = shadow * 0.88;
    for (const q of s.queue) {
      if (q.age < 0 || cinema >= 9) continue;
      const p =
          interpolatedAge(q, (s.simulation?.carry || 0) / 0.1) / q.duration,
        item = MATTER[q.matter],
        type = item.render;
      const grammar = absorptionFrame(
        species[q.matter].absorption,
        p,
        s.settings.reducedMotion,
      );
      let [x, y] = this.orbit(q, p, rs);
      if (cinema >= 0) {
        x *= 1 - collapse;
        y *= 1 - collapse;
      }
      const dist = Math.hypot(x, y);
      let size = ["star", "giant", "gas", "cosmic"].includes(type)
        ? 0.055
        : ["planet", "moon"].includes(type)
          ? 0.034
          : type === "blackhole"
            ? 0.055
            : type === "compact"
              ? 0.019
              : type === "machine"
                ? 0.025
                : type === "manufactured"
                  ? 0.014
                  : type === "dust"
                    ? 0.007
                    : 0.016;
      size *= 1 + (q.matter % 10) * 0.04;
      size = Math.max(
        size,
        ["manufactured", "machine"].includes(type) ? 0.025 : 0.012,
      );
      const physicalScale = 1 + q.matter / 200;
      const minReadableScale = ["manufactured", "machine"].includes(type)
        ? 0.021
        : 0.009;
      const displayScale = Math.max(
        minReadableScale,
        (size * physicalScale) / (1 + aggregate.maturity * 1.8),
      );
      size = displayScale;
      const lens = Math.max(
        0,
        1 - Math.abs(dist - shadow * 1.7) / Math.max(0.05, shadow * 1.8),
      );
      const stretch = grammar.radial;
      const tide = grammar.heat;
      const visible = dist > shadow * 0.88 && p < 0.985;
      if (visible) {
        this.matrix.position.set(x, y, 1);
        this.matrix.rotation.z = stretch
          ? Math.atan2(y, x)
          : t * (s.settings.reducedMotion ? 0.12 : 0.6) + q.id;
        this.matrix.scale.set(size * grammar.stretch, size * grammar.squash, 1);
        this.matrix.updateMatrix();
        // Tangential image shear, separate from the radial tidal grammar and orbit.
        const tangent = Math.atan2(y, x) + Math.PI / 2,
          cs = Math.cos(tangent),
          sn = Math.sin(tangent),
          strength = lens * 0.9;
        const shear = new THREE.Matrix4().set(
          1 + strength * cs * cs,
          strength * cs * sn,
          0,
          0,
          strength * cs * sn,
          1 + strength * sn * sn,
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          0,
          1,
        );
        const imageX = this.matrix.matrix.elements[12],
          imageY = this.matrix.matrix.elements[13];
        this.matrix.matrix.premultiply(shear);
        this.matrix.matrix.elements[12] = imageX;
        this.matrix.matrix.elements[13] = imageY;
        this.bodies.setMatrixAt(bodies, this.matrix.matrix);
        const kind =
          type === "cosmic"
            ? 8
            : type === "blackhole"
              ? 7
              : type === "compact"
                ? 6
                : ["star", "giant"].includes(type)
                  ? 5
                  : ["gas", "cosmic"].includes(type)
                    ? 4
                    : ["planet", "moon"].includes(type)
                      ? 3
                      : type === "machine"
                        ? 2.2
                        : type === "manufactured"
                          ? 2
                          : 1;
        this.bodyArray.set(
          [
            ART_SPECIES.has(q.matter) ? -q.matter - 1 : kind,
            tide,
            q.seed,
            grammar.alpha * Math.min(1, (1 - p) * 15),
          ],
          bodies * 4,
        );
        bodies++;
        if (lens > 0.3)
          for (let k = -4; k <= 4; k++) {
            const angle = Math.atan2(y, x) + Math.PI + k * 0.05 * lens;
            put(
              Math.cos(angle) * shadow * 1.25,
              Math.sin(angle) * shadow * 1.25,
              0.7,
              0.75,
              0.85,
              1.8,
              lens * 0.22 * (1 - Math.abs(k) / 5),
            );
          }
      }
      const trail = grammar.trail;
      for (let j = 0; j < trail; j++) {
        const progress = p - j * 0.0035;
        let [tx, ty] = this.orbit(q, progress, rs);
        if (type === "comet") {
          const rr = Math.max(0.01, Math.hypot(x, y));
          tx = x + (x / rr) * j * 0.004;
          ty = y + (y / rr) * j * 0.004;
        }
        if (Math.hypot(tx, ty) < shadow * 0.94) continue;
        const heat = grammar.heat > 0.3;
        const scatter = grammar.scatter;
        put(
          tx * (1 - collapse) + Math.sin(j * 17 + q.id) * scatter,
          ty * (1 - collapse) + Math.cos(j * 13) * scatter,
          heat ? 1.4 : 0.55,
          heat ? 0.55 : 0.62,
          heat ? 0.2 : 0.7,
          (species[q.matter].absorption === "star" ? 5 : 2) * (1 - j / trail) +
            0.6,
          (1 - j / trail) * grammar.tail,
        );
      }
      if (visible && type === "gas" && grammar.tidal > 0.2)
        put(
          x,
          y,
          0.8,
          0.65,
          0.39,
          Math.max(2, size * this.height * 0.22 * (1 - grammar.late * 0.5)),
          0.75,
        );
      if (type === "blackhole" && p > 0.65) {
        for (let j = 0; j < 48; j++) {
          const a = (j / 48) * Math.PI * 2,
            rr = (p - 0.65) * 2;
          put(
            Math.cos(a) * rr,
            Math.sin(a) * rr * 0.7,
            0.4,
            0.6,
            0.7,
            1.5,
            0.22 * (1 - p),
          );
        }
      }
    }
    drawEnvironment(
      aggregate.environment,
      this.aspect,
      distance,
      put,
      cinema > 9 ? 0 : 1,
    );
    // A procedural deep field reveals context as the camera changes scale.
    const starCount = 550;
    for (let j = 0; j < starCount; j++) {
      const a = j * 2.39996;
      let r = 0.23 + (((j * 7919) % 104729) / 104729) * 1.5;
      let x = Math.cos(a) * r * this.aspect,
        y = Math.sin(a) * r;
      if (Math.hypot(x, y) < shadow * 1.3) continue;
      const b = 0.2 + ((j * 37) % 17) / 30;
      const reveal = Math.max(
        0,
        Math.min(1, (70 + aggregate.environment * 480 - j) / 35),
      );
      if (reveal <= 0) continue;
      // Fixed seed positions in one world reference; camera context changes continuously.
      x *= 9.7 / distance;
      y *= 9.7 / distance;
      put(
        x,
        y,
        b * 0.75,
        b * 0.78,
        b * 0.8,
        j % 31 === 0 ? 2.7 : 1.1,
        cinema > 9 ? 0 : 0.42 * reveal,
      );
      if (collapse > 0.1)
        for (let k = 1; k < 8; k++)
          put(
            x * (1 - collapse * 0.97) * (1 + k * 0.013 * collapse),
            y * (1 - collapse * 0.97) * (1 + k * 0.013 * collapse),
            0.8,
            0.7,
            0.55,
            1.5,
            0.1,
          );
    }
    this.bodies.count = bodies;
    this.bodies.instanceMatrix.needsUpdate = true;
    this.geo.attributes.bodyData.needsUpdate = true;
    this.pg.setDrawRange(0, points);
    for (const a of Object.values(this.pg.attributes)) a.needsUpdate = true;
    this.activeBodies = bodies;
    this.activeParticles = points;
    this.renderer.info.reset();
    this.composer.render();
    this.drawCalls = this.renderer.info.render.calls;
  }
}
