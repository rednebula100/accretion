import { chromium } from "playwright";
import fs from "node:fs";
const out = "test-results/pass1-natural";
fs.mkdirSync(out, { recursive: true });
const resumeState = process.env.RESUME_CHECKPOINT
  ? JSON.parse(fs.readFileSync(process.env.RESUME_CHECKPOINT, "utf8"))
  : null;
const priorWall = resumeState
  ? JSON.parse(fs.readFileSync(out + "/progress.json", "utf8")).wall
  : 0;
const priorEvents = resumeState
  ? JSON.parse(fs.readFileSync(out + "/result.json", "utf8")).events.filter(
      (e) => e.wall <= priorWall,
    )
  : [];
const resume = resumeState
  ? {
      checkpoint: process.env.RESUME_CHECKPOINT,
      priorWall,
      simulationTime: resumeState.totalTime,
      excludedIdleSeconds: (Date.now() - resumeState.savedAt) / 1000,
      timestampRebasedForMeasurement: true,
    }
  : null;
if (resumeState) resumeState.savedAt = Date.now();
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Users/red_nebula/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
  errors = [],
  started = Date.now() - priorWall * 1000,
  events = [...priorEvents],
  navigations = [];
let lastTravel = "";
page.on("framenavigated", (frame) => {
  if (frame === page.mainFrame()) {
    navigations.push({ wall: (Date.now() - started) / 1000, url: frame.url() });
    lastTravel = "";
  }
});
page.on("pageerror", (e) => errors.push(e.message));
try {
  if (resumeState)
    await page.addInitScript((raw) => {
      if (!localStorage.getItem("accretion.save.v3"))
        localStorage.setItem("accretion.save.v3", raw);
    }, JSON.stringify(resumeState));
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:4185");
  await page.waitForFunction(() => window.__accretion);
  await page.evaluate(() => {
    window.__accretion.renderer.setQuality("MOBILE");
    window.__accretion.state.settings.quality = "MOBILE";
  });
  let lastReport = 0,
    done = false;
  while (Date.now() - started < 22 * 60 * 1000) {
    try {
      await page.waitForFunction(
        () => window.__accretion,
        {},
        { timeout: 15000 },
      );
      const next = await page.evaluate(async () => {
        const a = window.__accretion,
          s = a.state,
          w = s.world;
        if (document.querySelector("#game").dataset.cinematic) return null;
        const data = await import("/src/data/pass1.js"),
          engine = await import("/src/engine.js");
        if (w.anchors >= 2) return { done: true };
        if (w.anchors && !w.modules.includes("relay"))
          return {
            location: "anchor",
            selector: '[data-action="module"][data-id="relay"]',
          };
        for (const n of data.APPARATUS)
          if (
            s.highest >= n.at &&
            !w.apparatus.includes(n.id) &&
            s.energy.gte(n.cost)
          )
            return {
              location: "structure",
              selector: `[data-action="apparatus"][data-id="${n.id}"]`,
            };
        if (w.locations.dynamics === "DETECTED")
          return { location: "dynamics", visit: true };
        if (w.flow.includes("deep") && w.region === 0)
          return {
            location: "dynamics",
            selector: '[data-action="reconstruct"]',
          };
        for (const n of data.COHERENCE)
          if (w.coherence >= n.cost && !w.choices.includes(n.id))
            return {
              location: "dynamics",
              selector: `[data-action="coherence"][data-id="${n.id}"]`,
            };
        for (const n of data.FLOW_NODES)
          if (
            n.region === w.region &&
            (n.region === 0 || w.choices.includes("region")) &&
            !w.flow.includes(n.id) &&
            n.parents.every((p) => w.flow.includes(p)) &&
            s.dynamics.flux.gte(n.cost)
          )
            return {
              location: "dynamics",
              selector: `[data-action="flow"][data-id="${n.id}"]`,
            };
        if (w.boundary === "READY")
          return { location: "universe", selector: "#anchor-action" };
        const i = engine.unlocked(s);
        if (
          i > s.highest &&
          !s.queue.some((q) => q.matter === i) &&
          s.energy.gte(engine.price(s, i)) &&
          !(w.modules.includes("relay") && i <= Math.max(...w.manual) - 3)
        )
          return {
            location: "matter",
            selector: `[data-action="matter"][data-id="${i}"]`,
          };
        return null;
      });
      if (next?.done) {
        done = true;
        break;
      }
      if (next) {
        if (lastTravel !== next.location) {
          const sel =
            next.location === "universe"
              ? "#home"
              : `#signals [data-travel="${next.location}"]`;
          let loc = page.locator(sel);
          if (!(await loc.count()))
            loc = page.locator(`#${next.location} .location-title`);
          await loc.click({ timeout: 5000 });
          await page.waitForTimeout(1000);
          lastTravel = next.location;
        }
        if (next.selector) {
          await page.locator(next.selector).click({ timeout: 5000 });
          events.push({ wall: (Date.now() - started) / 1000, ...next });
        }
      }
      if (Date.now() - lastReport > 30000) {
        lastReport = Date.now();
        const s = await page.evaluate(() => ({
          highest: window.__accretion.state.highest,
          time: window.__accretion.state.totalTime,
          anchors: window.__accretion.state.world.anchors,
        }));
        fs.writeFileSync(
          out + "/checkpoint.json",
          JSON.stringify(
            await page.evaluate(() => window.__accretion.snapshot()),
          ),
        );
        fs.writeFileSync(
          out + "/progress.json",
          JSON.stringify({
            wall: (Date.now() - started) / 1000,
            ...s,
            last: next,
            errors,
          }),
        );
        console.log(JSON.stringify(s));
      }
      await page.waitForTimeout(200);
    } catch (error) {
      if (
        /context was destroyed|navigation|detached|Timeout/.test(error.message)
      ) {
        events.push({
          wall: (Date.now() - started) / 1000,
          retry: error.message.slice(0, 160),
        });
        lastTravel = "";
        await page.waitForTimeout(1000);
        continue;
      }
      throw error;
    }
  }
  const state = await page.evaluate(() => window.__accretion.snapshot());
  fs.writeFileSync(
    out + "/result.json",
    JSON.stringify(
      {
        done,
        wall: (Date.now() - started) / 1000,
        events,
        state,
        errors,
        navigations,
        resume,
      },
      null,
      2,
    ),
  );
  await page.screenshot({ path: out + "/complete.png" });
  console.log(
    JSON.stringify({ done, wall: (Date.now() - started) / 1000, errors }),
  );
  if (!done) throw Error("Natural route timeout");
} catch (error) {
  fs.writeFileSync(
    out + "/failure.json",
    JSON.stringify(
      {
        message: error.message,
        wall: (Date.now() - started) / 1000,
        errors,
        events,
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
