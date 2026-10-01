import { chromium } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const out = "test-results/pass2a1";
fs.mkdirSync(out, { recursive: true });
const fixtures = JSON.parse(
  fs.readFileSync("test-results/pass2a/fixtures.json", "utf8"),
);
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
async function fixture(name, id = "universe") {
  await page.evaluate(
    async ({ text, id }) => {
      const a = window.__accretion;
      const { decode } = await import("/src/save.js");
      const { fresh } = await import("/src/engine.js");
      a.replace(text ? decode(text) : fresh());
      a.pause(true);
      a.camera.go(id);
    },
    { text: fixtures[name], id },
  );
  await page.waitForTimeout(1500);
}
async function capture(name) {
  await page.screenshot({ path: `${out}/${name}.png` });
  const result = await page.evaluate(() => {
    const a = window.__accretion,
      c = a.composition;
    const focus = c.layout.points[a.camera.targetLocation];
    return {
      stage: c.layout.stage,
      depth: a.camera.depth,
      focus: a.camera.targetLocation,
      zoom: a.camera.zoom,
      solves: c.solves,
      maxSolve: Math.max(...c.solveMS),
      bounds: c.layout.bounds,
      points: c.layout.points,
      scroll: document.documentElement.scrollHeight > innerHeight,
      focused: focus
        ? {
            x: innerWidth / 2 + (focus.x - a.camera.x) * a.camera.zoom,
            y: innerHeight / 2 + (focus.y - a.camera.y) * a.camera.zoom,
            w: focus.footprint[0] * a.camera.zoom,
            h: focus.footprint[1] * a.camera.zoom,
          }
        : null,
    };
  });
  assert.equal(result.scroll, false);
  if (result.focused) {
    const b = result.focused;
    assert.ok(
      b.x - b.w / 2 >= 45 &&
        b.x + b.w / 2 <= (await page.viewportSize()).width - 45,
      `${name} horizontal safety`,
    );
    assert.ok(
      b.y - b.h / 2 >= 100 &&
        b.y + b.h / 2 <= (await page.viewportSize()).height - 80,
      `${name} vertical safety`,
    );
  }
  scenes.push({ name, ...result });
}
try {
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:4185");
  await page.waitForFunction(() => window.__accretion);
  for (const [state, id, name] of [
    ["fresh", "universe", "fresh-universe"],
    ["anchor-0", "universe", "anchored-universe"],
    ["planetary-active", "universe", "planetary-universe"],
    ["planetary-active", "planetary", "planetary-focused"],
    ["regime-4", "universe", "regime-iv-universe"],
    ["array-echo", "universe", "echo-universe"],
    ["seed-partial", "array", "seed-focused"],
    ["first-result", "universe", "post-convergence-universe"],
    ["potential", "array", "array-focused"],
    ["regime-4", "anchor", "anchor-focused"],
    ["planetary-active", "structure", "structure-focused"],
    ["recall-ready", "dynamics", "dynamics-focused"],
  ]) {
    await fixture(state, id);
    await capture(name);
  }
  checks.push("12 stage/focus captures; safe focused extents; no page scroll");
  await fixture("array-active");
  const stable = await page.evaluate(
    () => window.__accretion.composition.solves,
  );
  await page.waitForTimeout(1500);
  assert.equal(
    await page.evaluate(() => window.__accretion.composition.solves),
    stable,
  );
  checks.push("idle polling causes zero new layout solves");
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 900, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [state, id] of [
      ["planetary-active", "universe"],
      ["array-active", "array"],
      ["regime-4", "anchor"],
    ]) {
      await fixture(state, id);
      await capture(`${viewport.width}-${id}`);
    }
  }
  checks.push("1366x768 and 900x900 safe framing");
  await page.setViewportSize({ width: 1440, height: 900 });
  await fixture("array-active", "array");
  await page.locator("#array-plan").click();
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => window.__accretion.camera.depth), 2);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(650);
  assert.equal(await page.evaluate(() => window.__accretion.camera.depth), 1);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(650);
  assert.equal(await page.evaluate(() => window.__accretion.camera.depth), 0);
  checks.push("Array planning D2 and Esc D2 -> D1 -> D0");
  await fixture("regime-2", "anchor");
  const before = await page.evaluate(() => {
    const a = window.__accretion,
      p = a.composition.current.anchor;
    return { dx: p.x - a.camera.x, dy: p.y - a.camera.y };
  });
  await page.evaluate(() => {
    window.__accretion.state.world.stability = 105;
  });
  await page.waitForTimeout(1100);
  const after = await page.evaluate(() => {
    const a = window.__accretion,
      p = a.composition.current.anchor;
    return { dx: p.x - a.camera.x, dy: p.y - a.camera.y };
  });
  assert.ok(
    Math.abs(before.dx - after.dx) < 1 && Math.abs(before.dy - after.dy) < 1,
    "focused displacement compensation",
  );
  checks.push("Regime growth tracks focused location displacement");
  await fixture("anchor-0");
  await page.mouse.move(720, 300);
  await page.mouse.down();
  await page.mouse.move(780, 330, { steps: 5 });
  const held = await page.evaluate(() => window.__accretion.composition.solves);
  await page.evaluate(() => {
    window.__accretion.state.world.stability = 105;
  });
  await page.waitForTimeout(400);
  assert.equal(
    await page.evaluate(() => window.__accretion.composition.solves),
    held,
  );
  await page.mouse.up();
  await page.waitForTimeout(900);
  assert.ok(
    (await page.evaluate(() => window.__accretion.composition.solves)) > held,
  );
  assert.equal(await page.evaluate(() => getSelection().toString()), "");
  checks.push(
    "world drag defers reflow until release without native selection",
  );
  await page.evaluate(() => window.__accretion.camera.go("matter"));
  await page.waitForFunction(() => window.__accretion.camera.inputLock === 0);
  const empty = await page.evaluate(() => {
    for (let y = 180; y < innerHeight - 120; y += 80)
      for (let x = 40; x < innerWidth - 100; x += 80) {
        const el = document.elementFromPoint(x,y);
        if (el && !el.closest("button,input,select,dialog,.location,#signals,#hud,#compass,#binding,.calibration-terminal")) return {x,y};
      }
    throw new Error("No empty world surface for travel interruption test");
  });
  await page.mouse.move(empty.x, empty.y);
  await page.mouse.down();
  assert.equal(await page.evaluate(() => window.__accretion.camera.travel), null);
  await page.mouse.move(empty.x+50, empty.y+30, { steps: 5 });
  await page.mouse.up();
  const manual = await page.evaluate(() => ({
    x: window.__accretion.camera.x,
    y: window.__accretion.camera.y,
  }));
  await page.waitForTimeout(1000);
  assert.deepEqual(
    await page.evaluate(() => ({
      x: window.__accretion.camera.x,
      y: window.__accretion.camera.y,
    })),
    manual,
  );
  checks.push("travel interruption has no snap-back");
  await fixture("potential");
  const standard = await page.evaluate(
    () => window.__accretion.composition.layout,
  );
  await page.evaluate(() => (window.__accretion.camera.reducedMotion = true));
  await fixture("potential");
  await capture("reduced-universe");
  assert.deepEqual(
    await page.evaluate(() => window.__accretion.composition.layout),
    standard,
  );
  checks.push("reduced motion preserves final layout");
  assert.equal(errors.length, 0, errors.join("\n"));
  checks.push("zero browser errors");
  fs.writeFileSync(
    `${out}/browser.json`,
    JSON.stringify({ checks, scenes, errors }, null, 2),
  );
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally {
  await browser.close();
}
