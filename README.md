# ACCRETION

[**Play Demo — 브라우저에서 바로 플레이**](https://rednebula100.github.io/accretion/)

No installation or sign-in required. Desktop Chrome or Edge with WebGL2 is recommended.

Feed a microscopic black hole. Shape its field, discover a coherent response to the south, and Anchor a memory of the universe you built.

This is **Spatial Pass 2A.2** of the existing ACCRETION project. The continuous world now reaches Binding Regimes I–IV, the Planetary Boundary, a one-time Array Seed, a playable CL1 Array and a second Convergence. CL2/CL3 technologies and later Research/Evaporation UI remain outside this pass.

## Play locally

Requires Node.js 20.19+ or 22.12+ and a hardware-accelerated WebGL2 browser.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:4173. For a static build:

```sh
npm run build
npm start
```

Open http://127.0.0.1:4174. Keep the same browser origin to retain its save. Fonts, textures and scripts are local; no account, runtime CDN or analytics service is used. Development performance samples stay in memory on your computer.

## The playable loop

- **Matter Feed, west:** buy a physical body. Mass arrives only after it crosses the horizon. The established 200 identities, atlas and nine absorption families are retained; this slice opens IDs 0–59, 60–79 after Anchor and 80–109 after the Planetary breach.
- **Structure, northwest:** seven capabilities cover transit, disk formation, Dynamics detection, Flux production, Binding stabilization, planetary handling and the Array's central link.
- **Dynamics, south:** an unnamed Echo becomes a detected signal. Enter its authored graph, develop three or four nodes, and perform Reconstruction inside the graph. Mass, Energy, Structure and transit survive the local reset; the old flow becomes knowledge and grants Coherence according to the reconstructed flow.
- **Coherence:** buy Residual Flow, Known Flow and access to Region B. These govern Flux recovery, mastered transit and a new branch, respectively.
- **Binding Limit, around the black hole:** three shell segments show apparatus, coherent response and Matter progress. A ready field can Anchor.
- **Field Anchor, east:** the reset creates a new Seed and leaves Residue, discoveries, mastery and permanent modules. Choose Mass Echo/Residual Coupling for output or Catalog Relay for known-range automation. Relay cannot feed unknown Matter and stops short of the mastered frontier.
- **Converter, southeast:** exchange 20 Flux for ten seconds of Energy production. A 15-second cooldown prevents repeated dumping.
- **Binding Regimes:** earned Stability grows the Anchor's physical arms. Imprint, Spool, Recall, Scheduler and Bulk Capture compress previously mastered work; first discoveries remain manual. The Regulator follows your explicit conversion rules.
- **Planetary Boundary:** three world-space channels converge, then your first manual breach opens Worlds. No additional hard gate at 90 or 100.
- **Array Seed:** integrate Field, Flow and Link components once. Convergence exchanges the lower universe for Alignment and a persistent machine around the black hole.
- **CL1 Array:** eight sockets (nine with purchased technology), four module types, actual conductance/flow and a Stress tradeoff. Tap or drag modules in a private plan, compare output and apply atomically. Potential permits another Convergence; layout and purchased technology survive, then repower from the new base economy.
- **Erasure Well:** the Settings locator leads to a remote full-reset utility. Breaking its seal, sustaining a hold and taking the final action are all required. A technical pre-erasure snapshot is retained before the active saves are cleared.

## Controls

Drag empty space to pan, scroll to zoom, or use a Focus control or edge signal to travel. Location titles expand their own content. Drag or scroll interrupts ordinary travel after its short input lock, without snapping back. Escape backs out one camera depth. The ACCRETION emblem returns to the universe.

Full cards are clickable. Tab and Enter/Space provide keyboard operation with visible focus. Settings contains quality, reduced motion, audio, save export and import. AUTO adapts rendering resolution without changing economy rules; MOBILE is available for slower GPUs.

## Saves

The existing `accretion.save.v3` key is extended with a versioned spatial record. The first legacy-v3 import retains its original bytes under `accretion.save.v3.pre-spatial`; v2 originals remain untouched. Existing currencies, observations, Research and other legacy records are preserved. Pass 1 imports gain no free Stability or P2 unlocks; their purchased schematics become known. Corrupt originals are retained and automatic overwrite is blocked. Array plans and Erasure arming are transient and are discarded on import/reload.

Visible autosave runs every five seconds and on hiding the page. Online and offline progression use the same 100ms lattice. Returning to the page credits hidden time once; hidden reset presentation resumes without advancing the paused economy. The existing four-hour offline allowance and legacy extension remain. Export before changing browser origins.

Advanced legacy records are preserved, but this slice does not expose the old Research, Index, Memory or Evaporation panels. Those screens were removed with the conflicting navigation; the corresponding data/engine regression tests remain. Export a backup before importing an advanced save.

## Validation

```sh
npm test
npm run simulate
npm run build
# Keep a dev server on 4185 for browser validation:
npm run dev -- --port 4185
npm run test:browser
npm run test:pass2a
npm run test:offline:pass2a
# Keep npm start on 4174 for static production validation:
npm run test:production
npm run test:production:pass2a
```

Run `npm run simulate` before the Pass 2A browser/offline checks to generate earned-state fixtures. Browser scripts use Playwright with isolated profiles. `CHROME_PATH` can select an installed Chromium. Run `node scripts/pages-smoke.mjs` to verify the public demo using an isolated browser profile.

`src/engine.js` retains deterministic simulation and legacy compatibility; `src/systems/world.js` implements the spatial progression. `src/data/pass1.js` defines its small capability set. Camera, presentation events and visibility accounting live in `src/ui/`. `src/renderer.js`, `src/shaders/` and `src/art/` retain the established universe renderer and Matter identities. See `THIRD_PARTY_NOTICES.md` for licenses.

## GitHub Pages deployment

Pushes to `main` run unit tests, build the game and deploy it through GitHub Actions. The repository website links directly to the playable demo.

For the original local development checkout, run `powershell -File scripts/publish-github.ps1` after testing. This publishes a game-only snapshot to `main` without changing the current checkout or including private design documents and local audit history. A separate clone of the public repository can use ordinary commits and pushes to `main`; do not mix these two publishing workflows.

Saves belong to each browser and website origin. To move an existing local game to the demo, use Calibration → Export save locally, then Calibration → Import save on the demo.
