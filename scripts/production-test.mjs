import { chromium } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
import { fresh } from "../src/engine.js";
import { encode } from "../src/save.js";
import { D } from "../src/content.js";

const local =
  "C:/Users/red_nebula/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH || (fs.existsSync(local) ? local : undefined),
});
const out = "test-results/pass1-production";
fs.mkdirSync(out, { recursive: true });
const errors = [],
  remote = [];
async function open(context) {
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (
      url.startsWith("http://127.0.0.1:4174/") ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    )
      return route.continue();
    remote.push(url);
    return route.abort();
  });
  await page.goto("http://127.0.0.1:4174");
  await page.waitForTimeout(1500);
  return page;
}
try {
  const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    }),
    page = await open(context);
  assert.equal(
    await page.evaluate(() => typeof window.__accretion),
    "undefined",
  );
  assert.equal(
    await page.evaluate(() => typeof window.__ACCRETION_DEBUG__),
    "undefined",
  );
  assert.equal(
    await page.locator("[data-view],#workspace,.system-bar").count(),
    0,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollHeight === innerHeight,
    ),
    true,
  );
  const before = await page.locator("#mass").textContent();
  await page.locator('[data-action="matter"][data-id="0"]:visible').click();
  assert.equal(await page.locator("#mass").textContent(), before);
  await page.waitForTimeout(5000);
  assert.notEqual(await page.locator("#mass").textContent(), before);
  await page.locator("#settings-open").click();
  await page.locator("#motion").check();
  await page.locator("#quality").selectOption("MOBILE");
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloadPromise;
  await download.saveAs(out + "/export.json");
  const exported = JSON.parse(fs.readFileSync(out + "/export.json", "utf8"));
  assert.equal(exported.world.version, 1);
  assert.ok(exported.seen.includes(0));
  assert.equal(exported.settings.reducedMotion, true);
  exported.simulation.pendingOffline = 2;
  exported.savedAt = Date.now();
  fs.writeFileSync(out + "/pending-import.json", JSON.stringify(exported));
  await page.locator("#import").setInputFiles(out + "/pending-import.json");
  await page.waitForFunction(
    () =>
      document.querySelector("#save-message").textContent === "Save restored.",
  );
  await page.locator("#settings-close").click();
  await page.reload();
  await page.waitForTimeout(5500);
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("accretion.save.v3")).simulation
          .pendingOffline,
    ),
    0,
  );
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("accretion.save.v3")).world.version,
    ),
    1,
  );
  await page.screenshot({ path: out + "/production.png" });
  await context.close();

  // Load a real legacy v3 payload before boot, then confirm exact backup and preserved records.
  const old = fresh();
  old.highest = 75;
  old.best = 75;
  old.seen = Array.from({ length: 76 }, (_, i) => i);
  old.everSeen = [...old.seen];
  old.energy = D(1e8);
  old.information = D(1234);
  old.origins = 3;
  old.runs = 2;
  const raw = encode(old),
    legacy = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
  await legacy.addInitScript((raw) => {
    if (!localStorage.getItem("accretion.save.v3"))
      localStorage.setItem("accretion.save.v3", raw);
  }, raw);
  const migrated = await open(legacy);
  await migrated.waitForTimeout(5000);
  const stored = await migrated.evaluate(() => ({
    raw: localStorage.getItem("accretion.save.v3.pre-spatial"),
    save: JSON.parse(localStorage.getItem("accretion.save.v3")),
  }));
  assert.equal(stored.raw, raw);
  assert.deepEqual(stored.save.everSeen, old.everSeen);
  assert.equal(stored.save.information, "1234");
  assert.equal(stored.save.origins, 3);
  assert.equal(stored.save.world.residue, 0);
  assert.equal(stored.save.world.compatibilityFrontier, 75);
  await legacy.close();
  const corrupt = await browser.newContext();
  await corrupt.addInitScript(() =>
    localStorage.setItem("accretion.save.v3", "{broken"),
  );
  const blocked = await open(corrupt);
  await blocked.waitForTimeout(5500);
  assert.equal(
    await blocked.evaluate(() => localStorage.getItem("accretion.save.v3")),
    "{broken",
  );
  await corrupt.close();
  assert.deepEqual(remote, []);
  assert.deepEqual(errors, []);
  const result = {
    debugHelpersAbsent: true,
    staticPurchaseAndAbsorption: true,
    saveExportImportReload: true,
    legacyBackupAndMigration: true,
    corruptSavePreserved: true,
    startupPendingLedgerProcessed: true,
    noGlobalScroll: true,
    oldNavigationAbsent: true,
    remoteRequests: remote,
    errors,
  };
  fs.writeFileSync(out + "/result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
