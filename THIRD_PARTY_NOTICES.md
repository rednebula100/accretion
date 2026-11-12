# Third-party notices

No external artwork, astronomical photograph, disk texture or audio recording is included. Matter, stars, disk noise and audio are generated locally.

## Adapted renderer

The black-hole fragment shader and its noise routines are adapted from [hasnain7abbas/gargantua-blackhole](https://github.com/hasnain7abbas/gargantua-blackhole), commit `cdd4df54922c841f8f0031830ae0d54e9b20726d`. The upstream README declares MIT. A preserved copy ships at `licenses/gargantua-upstream-README.md`.

Attribution: Hasnain Abbas and contributors. ACCRETION changes include normalized integration and empty-space skipping, state uniforms, palette/lighting, progressive disk/jet controls, cinematic behavior and a new application/post-processing pipeline. Original UI, CDN loading and assets were not reused.

The simplex-noise implementation is Ashima Arts / Stefan Gustavson MIT-licensed work. Its full license is preserved at `licenses/webgl-noise-MIT.txt`; the upstream comment describing it as public domain has been corrected.

## Bundled dependencies

| Dependency | Version | License | Included full notice |
| --- | --- | --- | --- |
| Three.js | 0.185.1 | MIT | `licenses/three-MIT.txt` |
| break_eternity.js | 2.1.3 | MIT | `licenses/break-eternity-MIT.txt` |
| GSAP | 3.15.1 | GreenSock Standard "no charge" license | https://gsap.com/community/standard-license/ |
| ZzFX | 1.4.0 | MIT (Frank Force) | bundled package notice |
| Lucide | 1.x | ISC | bundled package notice |
| vite-plugin-singlefile (build only) | 2.3.4 | MIT | — |
| Chakra Petch, via @fontsource/chakra-petch | 5.x | SIL OFL 1.1 | — |
| Pretendard (subset) | 1.3.x | SIL OFL 1.1 | — |
| Gargantua shader | cdd4df5 | MIT (upstream README declaration) | `licenses/gargantua-MIT.txt`, preserved upstream README |
| Ashima / Stefan Gustavson noise | upstream source | MIT | `licenses/webgl-noise-MIT.txt` |

Vite (MIT) and subset-font (BSD-3-Clause) are development dependencies and do not execute in the shipped game. See package-lock.json for complete dependency resolution.
