import { chromium } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const out = "test-results/pass2a",
  fixtures = JSON.parse(fs.readFileSync(out + "/fixtures.json", "utf8"));
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Users/red_nebula/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
  errors = [],
  checks = [],
  scenes = [];
page.on("pageerror", (e) => errors.push(e.message));
const cdp = await page.context().newCDPSession(page);
await cdp.send("Performance.enable");
async function fixture(name, location = "array") {
  await page.evaluate(
    async ({ text, location }) => {
      const { decode } = await import("/src/save.js");
      const a = window.__accretion;
      a.replace(decode(text));
      a.pause(true);
      a.camera.go(location);
    },
    { text: fixtures[name], location },
  );
  await page.waitForTimeout(1100);
  // Anchor framing reflects the newly adopted regime after its first UI render.
  if (location === "anchor") {
    await page.evaluate(() => window.__accretion.camera.go("anchor"));
    await page.waitForTimeout(650);
  }
}
async function shot(name) {
  await page.screenshot({ path: `${out}/${name}.png` });
}
async function mark() {
  await page.evaluate(() => {
    const t = window.__accretion.telemetry;
    t.timeline = [];
    t.inputLatency = [];
  });
}
async function sample(name) {
  scenes.push({
    name,
    ...(await page.evaluate(() => {
      const a = window.__accretion,
        t = a.telemetry.timeline,
        ms = t.map((x) => x.ms).sort((a, b) => a - b);
      return {
        frames: t.length,
        fps: 1000 / (ms.reduce((a, b) => a + b, 0) / ms.length),
        p95: ms[Math.floor(ms.length * 0.95)],
        worst: Math.max(...ms),
        particlesPeak: Math.max(...t.map((x) => x.particles)),
        matterPeak: Math.max(...t.map((x) => x.matter)),
        animatedDOMPeak: Math.max(...t.map((x) => x.animatedDOM)),
        svgPaths: document.querySelectorAll("path").length,
        renderCPUMean: t.reduce((a, b) => a + b.renderCPU, 0) / t.length,
        inputToNextFrameWorst: Math.max(0, ...a.telemetry.inputLatency),
        quality: a.renderer.quality,
      };
    })),
  });
}
async function click(s) {
  await page.locator(s).click();
  await page.waitForTimeout(220);
}
try {
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:4185");
  await page.waitForFunction(() => window.__accretion);
  for (const [name, loc, file] of [
    ["regime-2", "anchor", "regime-ii"],
    ["regime-3", "anchor", "regime-iii"],
    ["array-echo", "array", "array-echo"],
    ["regime-4", "anchor", "regime-iv"],
    ["planetary-active", "universe", "planetary-active"],
    ["seed-partial", "array", "seed-partial"],
    ["seed-complete", "array", "seed-complete"],
  ]) {
    await fixture(name, loc);
    await mark();
    if (name.startsWith("regime"))
      await page.evaluate(() =>
        window.__accretion.bus.emit({
          type: "REGIME",
          regime:
            1 +
            [24, 58, 105].filter(
              (n) => window.__accretion.state.world.stability >= n,
            ).length,
        }),
      );
    await page.waitForTimeout(1200);
    await shot(file);
    await sample(file);
  }
  for (const [name, location] of [
    ["imprint-ready", "structure"],
    ["recall-ready", "dynamics"],
  ]) {
    await fixture(name, location);
    await mark();
    await page.evaluate(() => window.__accretion.pause(false));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__accretion.pause(true));
    await shot(name);
    await sample(name);
    assert.equal(
      await page.evaluate(
        (name) =>
          name === "imprint-ready"
            ? window.__accretion.state.world.apparatus.includes("feed")
            : window.__accretion.state.world.region === 1,
        name,
      ),
      true,
    );
  }
  checks.push("paid Imprint and Recall through live engine");
  await fixture("planetary-ready", "planetary");
  await mark();
  await click("#breach");
  await shot("planetary-breach");
  await page.waitForTimeout(1600);
  await sample("planetary-breach");
  assert.ok(
    await page.evaluate(() =>
      window.__accretion.state.world.capabilities.includes(
        "CAP_PLANETARY_BINDING",
      ),
    ),
  );
  checks.push("manual Planetary breach");
  await fixture("first-ready");
  await mark();
  await click("#converge");
  await page.waitForTimeout(200);
  await shot("first-convergence");
  await page.waitForTimeout(2200);
  await sample("first-convergence");
  assert.equal(
    await page.evaluate(() => window.__accretion.state.world.p2.cl),
    1,
  );
  checks.push("first Convergence through UI");
  await click("#array-plan");
  for (const [module, id] of [
    ["inlet", 0],
    ["inlet", 1],
    ["shear", 3],
    ["stabilizer", 4],
    ["stabilizer", 5],
    ["sink", 6],
  ]) {
    await click(`[data-module="${module}"]`);
    await click(`[data-socket="${id}"]`);
  }
  const source = await page.locator('[data-module="sink"]').boundingBox(),
    dest = await page.locator('[data-socket="7"]').boundingBox();
  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(dest.x + dest.width / 2, dest.y + dest.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  await page.waitForTimeout(250);
  assert.deepEqual(
    await page.evaluate(() => window.__accretion.state.world.p2.layout),
    Array(9).fill(null),
  );
  await mark();
  await page.waitForTimeout(1800);
  await shot("array-planning");
  await sample("cl1-planning");
  await click("#array-apply");
  const expected = [
    "inlet",
    "inlet",
    null,
    "shear",
    "stabilizer",
    "stabilizer",
    "sink",
    "sink",
    null,
  ];
  assert.deepEqual(
    await page.evaluate(() => window.__accretion.state.world.p2.layout),
    expected,
  );
  checks.push("tap + pointer drag edit, atomic Apply");
  await click("#array-plan");
  await click('[data-socket="3"]');
  await click("#array-remove");
  await click("#array-cancel");
  assert.deepEqual(
    await page.evaluate(() => window.__accretion.state.world.p2.layout),
    expected,
  );
  checks.push("draft discard preserves live layout");
  await page.evaluate(async () => {
    const { buy, tick } = await import("/src/engine.js");
    buy(window.__accretion.state, 0);
    tick(window.__accretion.state, 30);
  });
  await mark();
  await page.waitForTimeout(2200);
  await shot("array-active");
  await sample("cl1-active");
  assert.ok(
    await page.evaluate(() => window.__accretion.state.world.p2.live > 0),
  );
  await fixture("second-ready");
  const before = await page.evaluate(() =>
    structuredClone(window.__accretion.state.world.p2),
  );
  await mark();
  await click("#converge");
  await page.waitForTimeout(2300);
  await shot("second-convergence-result");
  await sample("second-convergence");
  const after = await page.evaluate(() => window.__accretion.state.world.p2);
  assert.equal(after.cl, 2);
  assert.deepEqual(after.layout, before.layout);
  assert.deepEqual(after.tech, before.tech);
  assert.equal(after.live, 0);
  assert.equal(after.potential, 0);
  assert.ok(after.alignment > before.alignment);
  checks.push("second Convergence retention + dormant reset");
  // Pan from real text, cross controls, release outside original target.
  await fixture("regime-2", "anchor");
  const title = await page.locator("#anchor header p").boundingBox();
  const oldX = await page.evaluate(() => window.__accretion.camera.x);
  await page.mouse.move(title.x + 10, title.y + 10);
  await page.mouse.down();
  await page.mouse.move(title.x - 190, title.y + 90, { steps: 12 });
  await page.mouse.up();
  assert.notEqual(await page.evaluate(() => window.__accretion.camera.x), oldX);
  assert.equal(await page.evaluate(() => getSelection().toString()), "");
  assert.equal(
    await page
      .locator("#game")
      .evaluate((e) => e.classList.contains("panning")),
    false,
  );
  assert.equal(
    await page
      .locator("#anchor header p")
      .evaluate((e) =>
        e.dispatchEvent(
          new DragEvent("dragstart", { bubbles: true, cancelable: true }),
        ),
      ),
    false,
  );
  checks.push("native text selection/drag blocked; captured release");
  await page.mouse.move(700, 800);
  await page.mouse.down();
  await page.mouse.move(740, 790, { steps: 4 });
  await page.evaluate(() =>
    document
      .getElementById("game")
      .dispatchEvent(
        new PointerEvent("pointercancel", { pointerId: 1, bubbles: true }),
      ),
  );
  await page.mouse.up();
  assert.equal(
    await page
      .locator("#game")
      .evaluate((e) => e.classList.contains("panning")),
    false,
  );
  checks.push("pointercancel cleanup");
  await fixture("second-result");
  await click("#settings-open");
  await click("#locate-well");
  await page.waitForTimeout(1100);
  await shot("erasure-safe");
  await click("#well-seal");
  let hold = await page.locator("#well-hold").boundingBox();
  await page.mouse.move(hold.x + 20, hold.y + 15);
  await page.mouse.down();
  await page.waitForTimeout(400);
  await page.mouse.up();
  assert.equal(await page.locator("#well-final").isVisible(), false);
  await mark();
  await page.locator("#well-hold").focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(2700);
  await page.keyboard.up("Space");
  assert.equal(await page.locator("#well-final").isVisible(), true);
  await shot("erasure-armed");
  await sample("erasure-arming");
  await click("#well-final");
  await page.waitForTimeout(1200);
  assert.equal(
    await page.evaluate(() => window.__accretion.state.world.p2.cl),
    0,
  );
  assert.equal(
    await page.evaluate(() => window.__accretion.state.world.anchors),
    0,
  );
  assert.equal(await page.evaluate(() => window.__accretion.state.highest), -1);
  assert.ok(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("accretion.emergency.pre-erasure"))
          .world.p2.cl === 2,
    ),
  );
  checks.push(
    "Erasure early release abort, keyboard hold, final wipe + backup",
  );
  await fixture("reconstruction", "dynamics");
  const start = (await cdp.send("Performance.getMetrics")).metrics;
  await mark();
  await click('[data-action="reconstruct"]');
  await page.waitForTimeout(1700);
  await sample("reconstruction");
  const end = (await cdp.send("Performance.getMetrics")).metrics;
  const profile = Object.fromEntries(
    end
      .filter((m) =>
        [
          "TaskDuration",
          "ScriptDuration",
          "LayoutDuration",
          "RecalcStyleDuration",
          "LayoutCount",
          "RecalcStyleCount",
        ].includes(m.name),
      )
      .map((m) => [
        m.name,
        m.value - (start.find((x) => x.name === m.name)?.value || 0),
      ]),
  );
  const gpu = await page.evaluate(() => {
    const gl = window.__accretion.renderer.renderer.getContext(),
      ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      renderer: ext
        ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
      timerQuery: !!gl.getExtension("EXT_disjoint_timer_query_webgl2"),
    };
  });
  assert.deepEqual(errors, []);
  checks.push("zero browser errors");
  fs.writeFileSync(
    out + "/browser.json",
    JSON.stringify({ checks, scenes, profile, gpu, errors }, null, 2),
  );
  console.log(
    JSON.stringify({ checks, scenes, profile, gpu, errors }, null, 2),
  );
} catch (e) {
  await shot("failure");
  throw e;
} finally {
  await browser.close();
}
