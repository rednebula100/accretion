import { chromium } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const out = "test-results/pass2a2";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Users/red_nebula/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
  errors = [],
  checks = [],
  captures = [];
page.on("pageerror", (e) => errors.push(e.message));
async function scene({
  highest = -1,
  apparatus = [],
  flow = [],
  flux = 0,
  energy = 1e6,
  focus = "universe",
  boundary = "HIDDEN",
  reconstructions = 0,
} = {}) {
  await page.evaluate(
    async (o) => {
      const { fresh } = await import("/src/engine.js"),
        { freshWorld } = await import("/src/systems/world.js"),
        { D } = await import("/src/content.js");
      const s = fresh();
      s.world = freshWorld();
      s.highest = o.highest;
      s.energy = D(o.energy);
      s.dynamics.flux = D(o.flux);
      Object.assign(s.world, {
        apparatus: o.apparatus,
        flow: o.flow,
        boundary: o.boundary,
        reconstructions: o.reconstructions,
      });
      if (o.apparatus.includes("grid")) s.world.locations.dynamics = "ACTIVE";
      if (o.apparatus.includes("tap")) s.world.locations.converter = "ACTIVE";
      const a = window.__accretion;
      a.pause(true);
      a.replace(s);
      a.camera.go(o.focus);
    },
    {
      highest,
      apparatus,
      flow,
      flux,
      energy,
      focus,
      boundary,
      reconstructions,
    },
  );
  await page.waitForTimeout(1150);
}
async function shot(name) {
  await page.screenshot({ path: `${out}/${name}.png` });
  captures.push(name);
}
async function go(id) {
  await page.evaluate((id) => window.__accretion.camera.go(id), id);
  await page.waitForTimeout(1100);
}
try {
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:4185");
  await page.waitForFunction(() => window.__accretion);
  await scene({ energy: 36 });
  await shot("01-fresh-context");
  const before = await page.evaluate(() => ({
    x: window.__accretion.camera.x,
    y: window.__accretion.camera.y,
    depth: window.__accretion.camera.depth,
  }));
  await page.locator("#matter .location-title").click();
  await page.waitForTimeout(650);
  assert.deepEqual(
    await page.evaluate(() => ({
      x: window.__accretion.camera.x,
      y: window.__accretion.camera.y,
      depth: window.__accretion.camera.depth,
    })),
    before,
  );
  await go("structure");
  assert.deepEqual(
    await page.evaluate(() =>
      [...window.__accretion.composition.expanded].sort(),
    ),
    ["matter", "structure"],
  );
  await go("universe");
  await shot("02-both-expanded");
  checks.push(
    "title expands without travel; distinct focus retains both expanded; Universe retains expansion",
  );
  await go("structure");
  await page.locator("#structure .location-title").click();
  await page.waitForTimeout(650);
  await shot("03-structure-compact");
  assert.equal(
    await page.locator("#structure").getAttribute("data-presentation"),
    "compact",
  );
  await scene({
    highest: 29,
    apparatus: ["feed", "field", "grid"],
    energy: 100,
    focus: "structure",
  });
  await shot("04-scaffold");
  assert.equal(await page.locator('#apparatus [data-id="tap"]').count(), 1);
  assert.match(
    await page.locator('#apparatus [data-id="tap"]').innerText(),
    /Requires/,
  );
  await shot("12-tap-revealed-locked");
  await scene({
    highest: 24,
    apparatus: ["feed", "field", "grid"],
    focus: "structure",
  });
  assert.equal(await page.locator('#apparatus [data-id="tap"]').count(), 0);
  assert.equal(await page.locator('#apparatus [data-id="binding"]').count(), 0);
  await shot("11-tap-hidden");
  checks.push(
    "unrevealed Structure absent; revealed unaffordable price reason visible",
  );
  await scene({
    highest: 29,
    apparatus: ["grid", "tap"],
    flux: 100,
    focus: "dynamics",
  });
  assert.equal(
    await page.locator('#flow-graph [data-action="flow"]').count(),
    1,
  );
  await shot("05-first-flow-reveal");
  await page.locator('#flow-graph [data-id="inflow"]').click();
  await page.waitForTimeout(800);
  assert.equal(
    await page.locator('#flow-graph [data-action="flow"]').count(),
    3,
  );
  assert.equal(await page.locator('#flow-graph [data-id="deep"]').count(), 0);
  await shot("06-flow-branches");
  checks.push(
    "Dynamics begins at one node; first purchase reveals two immediate branches only",
  );
  await scene({
    highest: 40,
    apparatus: ["grid", "tap"],
    flow: ["inflow", "density", "reservoir", "deep"],
    flux: 80,
    focus: "dynamics",
  });
  assert.match(await page.locator(".reconstruct").innerText(), /\+5 Coherence/);
  await shot("07-coherence-preview");
  await page.locator(".reconstruct").click();
  await page.waitForTimeout(1900);
  assert.equal(
    await page.evaluate(() => window.__accretion.state.world.coherence),
    5,
  );
  checks.push(
    "human click Reconstruction grants exactly previewed five Coherence",
  );
  for (const [highest, boundary, reconstructions, name] of [
    [39, "ECHO", 0, "08-ring-zero"],
    [44, "DETECTED", 1, "09-ring-mid"],
    [59, "READY", 1, "10-ring-ready"],
  ]) {
    await scene({
      highest,
      boundary,
      reconstructions,
      apparatus: highest === 59 ? ["binding"] : [],
      focus: "universe",
    });
    await shot(name);
    const alignment = await page.evaluate(() => {
      const a = window.__accretion,
        offset = a.renderer.u.uWorldOffset.value;
      return Math.max(
        Math.abs((offset.x * innerHeight) / 2 + a.camera.x * a.camera.zoom),
        Math.abs((offset.y * innerHeight) / 2 - a.camera.y * a.camera.zoom),
      );
    });
    assert.ok(alignment < 1, "BH and ring share a projected world origin");
  }
  await scene({
    highest: 29,
    apparatus: ["grid", "tap"],
    flux: 40,
    focus: "converter",
  });
  await shot("13-flux-hud");
  const fluxX = await page.locator("#flux").boundingBox();
  await page.evaluate(async () => {
    const { D } = await import("/src/content.js");
    window.__accretion.state.energy = D("1e100");
  });
  await page.waitForTimeout(500);
  assert.equal((await page.locator("#flux").boundingBox()).x, fluxX.x);
  await page.locator("#convert").click();
  await page.waitForTimeout(100);
  await shot("14-converter-feedback");
  assert.equal(
    await page.evaluate(() =>
      window.__accretion.state.dynamics.flux.toNumber(),
    ),
    20,
  );
  checks.push(
    "Energy width does not move Flux; Converter spends exactly 20 Flux",
  );
  await scene({ highest: 3, focus: "structure" });
  await page.locator('#apparatus [data-id="feed"]').click();
  await page.waitForTimeout(80);
  await shot("15-purchase-feedback");
  assert.ok(
    await page
      .locator('[data-hardware="feed"]')
      .evaluate((e) => e.classList.contains("powered")),
  );
  await scene({ energy: 36 });
  await page.evaluate(() => {
    const a = window.__accretion;
    a.camera.x = 240;
    a.camera.y = -230;
    a.camera.zoom = 1;
    a.camera.travel = null;
    a.camera.contextAttached = false;
  });
  await page.waitForTimeout(200);
  await shot("16-calibration-utility");
  await page.locator("#calibration-terminal").click();
  assert.ok(await page.locator("#settings").isVisible());
  await page.locator("#settings-close").click();
  await page.keyboard.press("o");
  assert.ok(await page.locator("#settings").isVisible());
  await page.locator("#motion").check();
  await page.locator("#settings-close").click();
  await page.locator("#home").click();
  await page.waitForTimeout(500);
  await shot("17-universe-framing");
  checks.push(
    "Fresh world terminal and O shortcut open existing settings; reduced motion remains usable",
  );
  await page.evaluate(() => {
    const a = window.__accretion,
      p = a.composition.current.matter;
    a.camera.travel = null;
    a.camera.x = p.x + innerWidth / 2;
    a.camera.y = p.y;
    a.camera.zoom = 1;
    a.camera.contextAttached = false;
  });
  await page.waitForTimeout(400);
  assert.equal(
    await page.locator("#matter").getAttribute("data-visibility"),
    "PARTIAL",
  );
  assert.ok(await page.locator("#matter").isVisible());
  assert.equal(
    await page.locator('#signals [data-travel="matter"]').count(),
    0,
  );
  await shot("18-partial-location");
  checks.push(
    "half-visible Matter retains facility and does not become marker",
  );
  await page.setViewportSize({ width: 768, height: 900 });
  await go("universe");
  await shot("19-responsive-hud");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(await page.locator(".action-particle").count(), 18);
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    `${out}/browser.json`,
    JSON.stringify({ checks, captures, errors }, null, 2),
  );
  console.log(JSON.stringify({ checks, captures: captures.length, errors }));
} finally {
  await browser.close();
}
