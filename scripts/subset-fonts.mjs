// Builds tiny Pretendard subsets containing only the glyphs the game actually uses (keeps the single-file build small).
import subsetFont from "subset-font";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : /\.(js|css|html)$/.test(f) ? [join(d, f)] : []));
let text = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~×·→←↑↓−–—…∞☉⊕µ◆";
for (const f of [...walk("src"), "index.html"]) text += readFileSync(f, "utf8");
const chars = [...new Set(text)].filter((c) => c.charCodeAt(0) >= 32).join("");
mkdirSync("src/assets/fonts", { recursive: true });
for (const [w, name] of [[500, "Medium"], [700, "Bold"]]) {
  const out = await subsetFont(readFileSync(`node_modules/pretendard/dist/web/static/woff2/Pretendard-${name}.woff2`), chars, { targetFormat: "woff2" });
  writeFileSync(`src/assets/fonts/pretendard-${w}.woff2`, out);
  console.log(`pretendard-${w}.woff2`, out.length, "bytes,", chars.length, "glyphs");
}
