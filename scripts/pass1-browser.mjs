import { chromium } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const out = "test-results/pass1";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Users/red_nebula/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (e) => {
  if (e.type() === "error") errors.push(e.text());
});
const scenes = [];
async function mark() {
  await page.evaluate(() => {
    window.__accretion.telemetry.timeline = [];
    window.__accretion.telemetry.frames = [];
  });
}
async function sample(name) {
  const data = await page.evaluate(() => {
    const a = window.__accretion,
      rows = a.telemetry.timeline,
      t = rows.map((r) => r.ms).sort((a, b) => a - b),
      lat = a.telemetry.inputLatency;
    return {
      frames: t.length,
      fps: 1000 / (t.reduce((a, b) => a + b, 0) / t.length),
      p95: t[Math.floor(t.length * 0.95)],
      worst: Math.max(...t),
      matterPeak: Math.max(...rows.map((r) => r.matter)),
      particlesPeak: Math.max(...rows.map((r) => r.particles)),
      animatedDOMPeak: Math.max(...rows.map((r) => r.animatedDOM)),
      svgPaths: document.querySelectorAll("path").length,
      quality: a.renderer.quality,
      inputToNextFrameWorst: lat.length ? Math.max(...lat) : null,
    };
  });
  scenes.push({ name, ...data });
}
try {
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:4185");
  await page.waitForFunction(() => window.__accretion);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: out + "/fresh.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollHeight === innerHeight,
    ),
    true,
  );
  await page.locator('[data-action="matter"][data-id="0"]:visible').click();
  await page.waitForTimeout(3500);
  assert.equal(await page.evaluate(() => window.__accretion.state.highest), 0);
  await page.evaluate(async () => {
    const { fresh, tick, buy, unlocked } = await import("/src/engine.js"),
      w = await import("/src/systems/world.js"),
      data = await import("/src/data/pass1.js");
    const s = fresh();
    s.world = w.freshWorld();
    window.__fixtures = {};
    for (let time = 0; time < 1000; time += 0.1) {
      for (const n of data.APPARATUS) w.purchaseApparatus(s, n.id);
      if (
        s.world.locations.dynamics === "DETECTED" &&
        !window.__fixtures.detected
      )
        window.__fixtures.detected = JSON.stringify(s);
      w.enterLocation(s, "dynamics");
      for (const n of data.FLOW_NODES)
        if (n.region === 0 || s.world.choices.includes("region"))
          w.purchaseFlow(s, n.id);
      if (w.reconstructionReady(s) && s.world.flow.includes("deep")) {
        window.__fixtures.reconstruction = JSON.stringify(s);
        w.reconstructWorld(s);
      }
      for (const id of ["region", "residual", "known"]) w.spendCoherence(s, id);
      const i = unlocked(s);
      if (i > s.highest && !s.queue.some((q) => q.matter === i)) buy(s, i);
      tick(s, 0.1);
      if (s.world.boundary === "READY") {
        window.__fixtures.ready = JSON.stringify(s);
        break;
      }
    }
    window.__accretion.pause(true);
  });
  async function fixture(name) {
    await page.evaluate(async (name) => {
      const { decode } = await import("/src/save.js");
      window.__accretion.replace(decode(window.__fixtures[name]));
    }, name);
    await page.waitForTimeout(300);
  }
  await fixture("detected");
  await page.screenshot({ path: out + "/dynamics-detected.png" });
  await mark();
  await page.locator('#signals [data-travel="dynamics"]').click();
  await page.waitForTimeout(1300);
  await page.screenshot({ path: out + "/dynamics-active.png" });
  await sample("dynamics-reveal");
  const boxes = await page
    .locator("#flow-graph .game-card")
    .evaluateAll((nodes) =>
      nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return { width: r.width, height: r.height };
      }),
    );
  assert.ok(boxes.every((r) => r.width >= 132 && r.height >= 76));
  assert.equal(
    await page.locator("[data-view],.system-bar,#workspace").count(),
    0,
  );
  await page.evaluate(() => {
    const c = window.__accretion.camera;
    c.go("matter");
  });
  await page.waitForFunction(() => window.__accretion.camera.inputLock === 0);
  await page.mouse.move(1200, 700);
  await page.mouse.down();
  await page.mouse.move(1250, 700, { steps: 8 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  assert.equal(
    await page.evaluate(() => window.__accretion.camera.mode),
    "manual",
  );
  const held = await page.evaluate(() => window.__accretion.camera.x);
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => window.__accretion.camera.x), held);
  await page.evaluate(() => {
    window.__accretion.camera.depth = 2;
    window.__accretion.camera.targetLocation = "dynamics";
  });
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => window.__accretion.camera.depth), 1);
  await page.waitForTimeout(1000);
  await fixture("reconstruction");
  await page.evaluate(() => window.__accretion.camera.go("dynamics"));
  await page.waitForTimeout(1100);
  await mark();
  await page.locator('[data-action="reconstruct"]').click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: out + "/reconstruction.png" });
  await page.waitForTimeout(1300);
  await sample("reconstruction");
  assert.equal(
    await page.evaluate(() => window.__accretion.state.world.coherence),
    4,
  );
  await page.locator('[data-action="coherence"][data-id="region"]').focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await page.evaluate(() => window.__accretion.state.world.coherence),
    2,
  );
  await fixture("ready");
  await mark();
  await page.locator("#home").click();
  await page.waitForTimeout(1100);
  await page.screenshot({ path: out + "/boundary-ready.png" });
  await sample("binding-ready");
  await mark();
  await page.locator("#anchor-action").click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: out + "/anchor.png" });
  await page.waitForTimeout(1500);
  await sample("anchor");
  assert.equal(
    await page.evaluate(() => window.__accretion.state.world.anchors),
    1,
  );
  await page.locator('[data-travel="anchor"]:visible').first().click();
  await page.waitForTimeout(1300);
  await page.screenshot({ path: out + "/field-anchor.png" });
  await mark();
  await page.locator('[data-action="module"][data-id="relay"]').click();
  await page.locator("#home").click();
  await page.evaluate(() => window.__accretion.pause(false));
  await page.waitForTimeout(12000);
  await page.screenshot({ path: out + "/second-run.png" });
  await sample("relay");
  assert.ok(await page.evaluate(() => window.__accretion.state.highest >= 1));
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.activeElement).outlineStyle,
    ),
    "solid",
  );
  const perf = await page.evaluate(() => {
    const a = window.__accretion.telemetry.frames
      .slice(-300)
      .sort((a, b) => a - b);
    return {
      fps: 1000 / (a.reduce((a, b) => a + b, 0) / a.length),
      p95: a[Math.floor(a.length * 0.95)],
      worst: Math.max(...a),
      matter: window.__accretion.state.queue.length,
      particles: window.__accretion.renderer?.pg.drawRange.count,
      dom: document.querySelectorAll("button,path").length,
    };
  });
  fs.writeFileSync(
    out + "/browser.json",
    JSON.stringify({ errors, perf, scenes }, null, 2),
  );
  console.log(JSON.stringify({ errors, perf, scenes }));
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
