import { chromium } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const fixture = JSON.parse(
  fs.readFileSync("test-results/pass2a/fixtures.json", "utf8"),
)["second-result"];
const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Users/red_nebula/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe",
  }),
  errors = [];
try {
  const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    }),
    page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error") errors.push(e.text());
  });
  await page.addInitScript((text) => {
    if (!sessionStorage.getItem("fixture-loaded")) {
      const current = JSON.parse(text);
      current.savedAt = Date.now(); // Offline catch-up has its own parity suite.
      localStorage.setItem("accretion.save.v3", JSON.stringify(current));
      sessionStorage.setItem("fixture-loaded", "yes");
    }
  }, fixture);
  await page.goto("http://127.0.0.1:4174");
  await page.waitForTimeout(2200);
  assert.equal(
    await page.evaluate(() => typeof window.__accretion),
    "undefined",
  );
  assert.equal(await page.locator("[data-socket]").count(), 8);
  assert.match(await page.locator("#array-stage").innerText(), /CL 2/);
  await page.locator("#array-plan").click();
  await page.locator('[data-socket="3"]').click();
  await page.locator("#array-remove").click();
  await page.locator("#settings-open").click();
  await page
    .locator("#import")
    .setInputFiles({
      name: "roundtrip.json",
      mimeType: "application/json",
      buffer: Buffer.from(fixture),
    });
  await page.waitForTimeout(400);
  assert.match(await page.locator("#save-message").innerText(), /restored/);
  const download = page.waitForEvent("download");
  await page.locator("#export").click();
  const file = await download;
  await file.saveAs("test-results/pass2a/export.json");
  const exported = JSON.parse(
      fs.readFileSync("test-results/pass2a/export.json", "utf8"),
    ),
    original = JSON.parse(fixture);
  assert.deepEqual(exported.world.p2.layout, original.world.p2.layout);
  assert.deepEqual(exported.world.p2.tech, original.world.p2.tech);
  assert.equal(exported.world.p2.cl, 2);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#array-apply").isVisible(), false);
  await page.screenshot({ path: "test-results/pass2a/production-1366.png" });
  await page.reload();
  await page.waitForTimeout(1700);
  assert.match(await page.locator("#array-stage").innerText(), /CL 2/);
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "test-results/pass2a/production.json",
    JSON.stringify(
      {
        checks: [
          "production debug API absent",
          "P2 reload",
          "all 8 sockets present",
          "import discards uncommitted draft",
          "export preserves layout/tech/CL",
          "second reload retains import",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log("6 production checks passed");
} finally {
  await browser.close();
}
