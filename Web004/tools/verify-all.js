#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const REPO = path.join(ROOT, "..");
const SCRATCH = process.env.SCRATCH || "/tmp/grok-goal-ab07a83532b9/implementer";
fs.mkdirSync(SCRATCH, { recursive: true });

function write(name, data) {
  fs.writeFileSync(path.join(SCRATCH, name), data);
  console.log("wrote", name);
}

// 1 progress
const stats = spawnSync("node", [path.join(ROOT, "tools", "progress-stats.js")], { encoding: "utf8" });
write("progress-count.txt", stats.stdout + stats.stderr);

// 2 commits
const log = execSync('git log --oneline', { cwd: REPO, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
const lines = log.trim().split("\n").filter(Boolean);
const alibaba = lines.filter((l) => {
  // subjects only: strip hash prefix from --oneline
  const subj = l.replace(/^[0-9a-f]+\s+/, "");
  return /^(feat|fix|test|docs|style|refactor|chore|assets|perf|ci|build)\([a-z0-9_-]+\): R\d{4} /.test(subj);
});
write(
  "commit-stats.txt",
  JSON.stringify({ totalCommits: lines.length, alibabaRoundCommits: alibaba.length, sample: alibaba.slice(0, 10) }, null, 2)
);

// 3 unit tests
const t = spawnSync("node", [path.join(ROOT, "tests", "run.js")], { encoding: "utf8", cwd: ROOT });
write("unit-tests.log", (t.stdout || "") + (t.stderr || ""));
if (t.status !== 0) console.error("tests failed");

// 4 script load in browser-like env
const vm = require("vm");
const coreCode = fs.readFileSync(path.join(ROOT, "js", "core.js"), "utf8");
const sandbox = { console, window: {}, globalThis: {}, module: { exports: {} }, exports: {} };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
try {
  vm.runInNewContext(coreCode, sandbox, { filename: "core.js" });
  // UMD may set module.exports
  const Core = sandbox.module.exports || sandbox.WanfengCore;
  if (!Core || !Core.addItem) throw new Error("Core API missing");
  const s = Core.defaultState();
  Core.addItem(s, "maple", 1);
  write("script-load.log", "OK core loaded; bag.maple=" + s.bag.maple + "\n");
} catch (e) {
  write("script-load.log", "FAIL " + e.stack);
}

// 5 browser probe
try {
  const v = spawnSync("npx", ["--yes", "playwright", "--version"], { encoding: "utf8", timeout: 60000 });
  if (v.status !== 0) {
    write("browser-unavailable.log", "playwright unavailable: " + (v.stderr || v.stdout));
  } else {
    write("browser-probe.txt", v.stdout);
  }
} catch (e) {
  write("browser-unavailable.log", String(e));
}

// 6 asset audit
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const refs = [];
const re = /(?:src|href)=["']([^"']+\.(?:css|js|png|jpg|jpeg|webp|gif|svg))["']/gi;
let m;
while ((m = re.exec(html))) refs.push(m[1]);
const css = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
const urlRe = /url\(["']?([^"')]+)["']?\)/gi;
while ((m = urlRe.exec(css))) refs.push(m[1]);
let ok = 0, bad = [];
for (const r of refs) {
  if (r.startsWith("http")) { ok++; continue; }
  const p = path.join(ROOT, r);
  if (fs.existsSync(p)) ok++;
  else bad.push(r);
}
// count generated images
function walk(d, acc = []) {
  if (!fs.existsSync(d)) return acc;
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(png|jpg|jpeg|webp)$/i.test(f)) acc.push(path.relative(ROOT, p));
  }
  return acc;
}
const images = walk(path.join(ROOT, "assets"));
write(
  "asset-audit.txt",
  JSON.stringify({ htmlCssRefs: refs.length, ok, broken: bad, imageFiles: images.length, images: images.slice(0, 40) }, null, 2)
);

// 7 cozy constraint sample
const game = fs.readFileSync(path.join(ROOT, "game.js"), "utf8") + fs.readFileSync(path.join(ROOT, "js", "core.js"), "utf8");
const combatHits = game.match(/\b(HP|damage|攻击|战斗|击杀)\b/gi) || [];
write("cozy-check.txt", "combat-like matches: " + combatHits.length + "\n" + combatHits.join(","));

console.log("verification captures written to", SCRATCH);
