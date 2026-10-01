import { chromium } from "playwright";
import fs from "node:fs";
const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Users/red_nebula/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe",
  }),
  results = [];
try {
  for (const quality of ["HIGH", "MOBILE"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.goto("http://127.0.0.1:4185");
    await page.waitForFunction(() => window.__accretion);
    await page.evaluate(
      async ({ text, quality }) => {
        const { decode } = await import("/src/save.js");
        const a = window.__accretion;
        a.replace(decode(text));
        a.pause(true);
        a.camera.go("dynamics");
        a.renderer.setQuality(quality);
      },
      {
        text: JSON.parse(
          fs.readFileSync("test-results/pass2a/fixtures.json", "utf8"),
        ).reconstruction,
        quality,
      },
    );
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const a = window.__accretion,
        r = a.renderer,
        gl = r.renderer.getContext(),
        ext = gl.getExtension("EXT_disjoint_timer_query_webgl2"),
        original = r.render.bind(r);
      window.__gpu = [];
      a.telemetry.timeline = [];
      if (!ext) return;
      const pending = [];
      r.render = (...args) => {
        if (
          pending.length &&
          gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)
        ) {
          const q = pending.shift();
          if (!gl.getParameter(ext.GPU_DISJOINT_EXT))
            window.__gpu.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
          gl.deleteQuery(q);
        }
        const q = pending.length < 4 ? gl.createQuery() : null;
        if (q) gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
        original(...args);
        if (q) {
          gl.endQuery(ext.TIME_ELAPSED_EXT);
          pending.push(q);
        }
      };
    });
    await page.locator('[data-action="reconstruct"]').click();
    await page.waitForTimeout(2000);
    results.push({
      quality,
      ...(await page.evaluate(() => {
        const rows = window.__accretion.telemetry.timeline,
          g = window.__gpu;
        return {
          frames: rows.length,
          fps: 1000 / (rows.reduce((a, r) => a + r.ms, 0) / rows.length),
          renderCPUMean:
            rows.reduce((a, r) => a + r.renderCPU, 0) / rows.length,
          gpuSamples: g.length,
          gpuMean: g.length ? g.reduce((a, b) => a + b, 0) / g.length : null,
          gpuMax: g.length ? Math.max(...g) : null,
          renderScale: window.__accretion.renderer.renderScale,
        };
      })),
    });
    await page.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(
  "test-results/pass2a/gpu-profile.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
