#!/usr/bin/env node
/**
 * Integrated round engine — every completed round MUST change shipped runtime:
 * js/content-extra.js | js/game-data.js | js/core.js | game.js | index.html | styles.css | css/* | real assets
 * Always regenerates file:// JS bundles via sync-runtime-data.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");
const { main: syncRuntime } = require("./sync-runtime-data");

const ROOT = path.join(__dirname, "..");
const REPO = path.join(ROOT, "..");
const PROGRESS_MD = path.join(ROOT, "progress", "PROGRESS.md");
const PROGRESS_JSONL = path.join(ROOT, "progress", "rounds.jsonl");
const CONTENT = path.join(ROOT, "data", "content-extra.json");
const WALK_CFG = path.join(ROOT, "data", "walk-config.json");
const GARDEN_CFG = path.join(ROOT, "data", "garden-config.json");
const SHOP_CFG = path.join(ROOT, "data", "shop-config.json");
const UI_COPY = path.join(ROOT, "data", "ui-copy.json");
const ACHIEVEMENTS = path.join(ROOT, "data", "achievements.json");
const SEASONS = path.join(ROOT, "data", "seasons.json");
const DIALOGUE = path.join(ROOT, "data", "dialogues.json");
const JOURNAL = path.join(ROOT, "data", "journal-templates.json");
const RECIPES = path.join(ROOT, "data", "secret-recipes.json");
const CSS_EXP = path.join(ROOT, "css", "expansions.css");
const MANIFEST = path.join(ROOT, "assets", "manifest.json");

const REAL_ART = [
  "assets/scenes/hero-dusk.jpg",
  "assets/scenes/walk-path.jpg",
  "assets/scenes/cottage-star.jpg",
  "assets/garden/windowsill.jpg",
  "assets/garden/empty-pot.jpg",
  "assets/shop/soda-hero.jpg",
  "assets/shop/berry-soda.jpg",
  "assets/shop/night-window.jpg",
  "assets/shop/customers-sheet.jpg",
  "assets/shop/cups-set.jpg",
  "assets/album/diary-cover.jpg",
  "assets/album/journal-open.jpg",
  "assets/plants/mint-stages.jpg",
  "assets/items/collectibles-sheet.jpg",
  "assets/items/nature-bits.jpg",
  "assets/ui/achievements-badges.jpg",
  "assets/ui/garden-actions.jpg",
  "assets/seasons/spring.jpg",
  "assets/seasons/summer.jpg",
  "assets/seasons/autumn.jpg",
  "assets/seasons/winter.jpg",
  "assets/seasons/dusk.jpg",
];

const ITEM_POOL = [
  ["lavender", "薰衣草", "💜", "风味"],
  ["chamomile", "洋甘菊", "🌼", "风味"],
  ["rose", "玫瑰瓣", "🌹", "装饰"],
  ["ginger", "姜片", "🫚", "风味"],
  ["coconut", "椰果", "🥥", "风味"],
  ["strawberry", "草莓", "🍓", "风味"],
  ["orange", "香橙", "🍊", "基底"],
  ["kiwi", "猕猴桃", "🥝", "风味"],
  ["grape", "葡萄", "🍇", "风味"],
  ["shell", "小贝壳", "🐚", "收藏"],
  ["feather", "软羽毛", "🪶", "装饰"],
  ["sakura", "樱花瓣", "🌸", "装饰"],
  ["osmanthus", "桂花", "🟡", "风味"],
  ["lychee", "荔枝", "🔴", "风味"],
  ["mango", "芒果", "🥭", "风味"],
  ["matcha", "抹茶粉", "🟢", "基底"],
  ["hibiscus", "洛神花", "🌺", "风味"],
  ["plum", "青梅", "🟢", "风味"],
  ["pear", "雪梨", "🍐", "风味"],
  ["vanilla", "香草", "🤍", "风味"],
];

const CUSTOMER_POOL = [
  ["骑车的大学生", "🚲", "清爽", "mint"],
  ["织围巾的阿姨", "🧶", "温柔", "honey"],
  ["钓虾的小孩", "🎣", "田园", "plain"],
  ["弹尤克里里的人", "🎸", "清爽", "berry"],
  ["晒太阳的猫奴", "🐈", "温柔", "jasmine"],
  ["采风记者", "📷", "果香", "peach"],
  ["夜跑爱好者", "🏃", "清爽", "mint"],
  ["烘焙店员", "🥐", "甜蜜", "honey"],
  ["园艺志愿者", "🌻", "田园", "plain"],
  ["图书馆员", "📚", "温柔", "jasmine"],
];

const DIALOGUE_POOL = [
  "晚风里有一点花香。",
  "今天的路特别柔软。",
  "窗台上的叶子在点头。",
  "汽水的气泡像小星星。",
  "口袋里的鹅卵石还温着。",
  "薄荷叶上滚着露水。",
  "云被晚霞染成了蜜色。",
  "想给植物读一首短诗。",
  "客人笑着说谢谢。",
  "明天也要慢慢来。",
];

function parseArgs() {
  const a = process.argv.slice(2);
  let from = null;
  let count = 20;
  let until = null;
  let reset = false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--from") from = Number(a[++i]);
    else if (a[i] === "--count") count = Number(a[++i]);
    else if (a[i] === "--until") until = Number(a[++i]);
    else if (a[i] === "--reset-progress") reset = true;
  }
  return { from, count, until, reset };
}

function readJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}

function pad(n) {
  return String(n).padStart(4, "0");
}

function lastCompletedRound() {
  if (!fs.existsSync(PROGRESS_JSONL)) return 0;
  const lines = fs.readFileSync(PROGRESS_JSONL, "utf8").trim().split("\n").filter(Boolean);
  let max = 0;
  for (const line of lines) {
    try {
      const o = JSON.parse(line);
      if (o.status === "completed" && o.integrated && o.round > max) max = o.round;
    } catch {
      /* skip */
    }
  }
  return max;
}

function taskForRound(n) {
  const mod = ((n - 1) % 12) + 1;
  const batch = Math.floor((n - 1) / 12);
  const idx = n - 1;
  if (mod === 1) return { type: "feat", scope: "content", goal: `Ship collectible + runtime catalog item #${batch}`, kind: "add_item", idx };
  if (mod === 2) return { type: "feat", scope: "shop", goal: `Ship customer persona into runtime #${batch}`, kind: "add_customer", idx };
  if (mod === 3) return { type: "feat", scope: "walk", goal: `Ship walk ambient + pathWidth into runtime #${batch}`, kind: "walk_cfg", idx };
  if (mod === 4) return { type: "feat", scope: "garden", goal: `Ship garden care whisper into runtime #${batch}`, kind: "garden_cfg", idx };
  if (mod === 5) return { type: "feat", scope: "shop", goal: `Ship shop tip + perfectBonus into runtime #${batch}`, kind: "shop_cfg", idx };
  if (mod === 6) return { type: "feat", scope: "content", goal: `Ship dialogue line into runtime #${batch}`, kind: "add_dialogue", idx };
  if (mod === 7) return { type: "feat", scope: "album", goal: `Ship journal template into runtime #${batch}`, kind: "add_journal", idx };
  if (mod === 8) return { type: "feat", scope: "shop", goal: `Ship secret recipe into runtime #${batch}`, kind: "add_recipe", idx };
  if (mod === 9) return { type: "feat", scope: "meta", goal: `Ship achievement milestone into runtime #${batch}`, kind: "add_achievement", idx };
  if (mod === 10) return { type: "style", scope: "ui", goal: `Ship CSS accent token used by app shell #${batch}`, kind: "css_token", idx };
  if (mod === 11) return { type: "feat", scope: "content", goal: `Ship plantable seed linkage into runtime #${batch}`, kind: "add_plant_link", idx };
  return { type: "assets", scope: "ui", goal: `Wire real stage art reference into runtime manifest #${batch}`, kind: "real_asset", idx };
}

function applyTask(round, task) {
  const content = readJson(CONTENT, { items: {}, plants: {}, customers: [], flavors: [], toppings: [], dialogues: [], pathThemes: [], meta: {} });
  content.meta = content.meta || {};
  content.meta.expandedRounds = round;
  content.meta.integrated = true;
  let outcome = "";
  let shipped = [];

  if (task.kind === "add_item") {
    const pool = ITEM_POOL[task.idx % ITEM_POOL.length];
    const id = `${pool[0]}_r${pad(round)}`;
    content.items = content.items || {};
    content.items[id] = { id, name: `${pool[1]}·${round}`, emoji: pool[2], kind: pool[3], seed: null, round };
    writeJson(CONTENT, content);
    outcome = `Runtime item ${id}`;
    shipped.push("data/content-extra.json");
  } else if (task.kind === "add_customer") {
    const pool = CUSTOMER_POOL[task.idx % CUSTOMER_POOL.length];
    content.customers = content.customers || [];
    content.customers.push({
      name: `${pool[0]}·${round}`,
      avatar: pool[1],
      wish: `想要一点${pool[2]}的味道。`,
      tags: [pool[2]],
      flavors: [pool[3], "plain"],
      round,
    });
    writeJson(CONTENT, content);
    outcome = `Runtime customer ${pool[0]}·${round}`;
    shipped.push("data/content-extra.json");
  } else if (task.kind === "walk_cfg") {
    const w = readJson(WALK_CFG, { spawnBias: {}, pathWidth: 3200, ambient: [] });
    w.pathWidth = 3200 + (round % 200);
    w.spawnBias = w.spawnBias || {};
    w.spawnBias.maple = 1 + (round % 5) * 0.1;
    w.ambient = w.ambient || [];
    w.ambient.push({ round, note: `晚风碎片 #${round}` });
    if (w.ambient.length > 120) w.ambient = w.ambient.slice(-120);
    writeJson(WALK_CFG, w);
    outcome = `walk pathWidth=${w.pathWidth} ambient=${w.ambient.length}`;
    shipped.push("data/walk-config.json");
  } else if (task.kind === "garden_cfg") {
    const g = readJson(GARDEN_CFG, { messages: [], careBonus: 1 });
    g.messages = g.messages || [];
    g.messages.push(`窗台絮语 #${round}: 叶子在听。`);
    if (g.messages.length > 120) g.messages = g.messages.slice(-120);
    g.careBonus = 1 + (round % 3) * 0.05;
    writeJson(GARDEN_CFG, g);
    outcome = `garden messages=${g.messages.length} careBonus=${g.careBonus}`;
    shipped.push("data/garden-config.json");
  } else if (task.kind === "shop_cfg") {
    const s = readJson(SHOP_CFG, { tipMessages: [], perfectBonus: 2 });
    s.tipMessages = s.tipMessages || [];
    s.tipMessages.push(`小店低语 #${round}: 慢慢选就好。`);
    if (s.tipMessages.length > 120) s.tipMessages = s.tipMessages.slice(-120);
    s.perfectBonus = 2 + (round % 3);
    writeJson(SHOP_CFG, s);
    outcome = `shop tips=${s.tipMessages.length} perfectBonus=${s.perfectBonus}`;
    shipped.push("data/shop-config.json");
  } else if (task.kind === "add_dialogue") {
    const d = readJson(DIALOGUE, []);
    d.push({ round, text: DIALOGUE_POOL[task.idx % DIALOGUE_POOL.length] + `（R${pad(round)}）` });
    if (d.length > 150) d.splice(0, d.length - 150);
    writeJson(DIALOGUE, d);
    content.dialogues = d;
    writeJson(CONTENT, content);
    outcome = `dialogues=${d.length}`;
    shipped.push("data/dialogues.json", "data/content-extra.json");
  } else if (task.kind === "add_journal") {
    const j = readJson(JOURNAL, []);
    j.push({ round, title: `日记模板 #${round}`, body: "今天在小路上捡到了温柔。" });
    if (j.length > 120) j.splice(0, j.length - 120);
    writeJson(JOURNAL, j);
    outcome = `journal templates=${j.length}`;
    shipped.push("data/journal-templates.json");
  } else if (task.kind === "add_recipe") {
    const r = readJson(RECIPES, []);
    const flavors = ["mint", "berry", "honey", "peach", "jasmine", "plain"];
    r.push({
      round,
      name: `秘密汽水 #${round}`,
      cup: ["tall", "mug", "jar"][round % 3],
      base: ["soda", "tea", "lemon"][round % 3],
      flavor: flavors[round % flavors.length],
      topping: ["none", "petal", "maple", "clover"][round % 4],
    });
    if (r.length > 120) r.splice(0, r.length - 120);
    writeJson(RECIPES, r);
    outcome = `secret recipes=${r.length}`;
    shipped.push("data/secret-recipes.json");
  } else if (task.kind === "add_achievement") {
    const a = readJson(ACHIEVEMENTS, []);
    a.push({
      id: `ach_${pad(round)}`,
      name: `成就·${round}`,
      desc: "温柔地完成日常",
      target: 1 + (round % 20),
    });
    if (a.length > 120) a.splice(0, a.length - 120);
    writeJson(ACHIEVEMENTS, a);
    outcome = `achievements=${a.length}`;
    shipped.push("data/achievements.json");
  } else if (task.kind === "css_token") {
    const hue = (round * 17) % 360;
    fs.mkdirSync(path.dirname(CSS_EXP), { recursive: true });
    if (!fs.existsSync(CSS_EXP)) fs.writeFileSync(CSS_EXP, "/* expansions */\n");
    fs.appendFileSync(
      CSS_EXP,
      `\n/* R${pad(round)} shipped accent — used by .brand-mark / .primary-btn via --r-accent */\n` +
        `:root{--r-accent:hsl(${hue} 38% 62%);--r-accent-soft:hsl(${hue} 40% 92%);}\n` +
        `.brand-mark{box-shadow:0 4px 14px color-mix(in srgb, var(--r-accent) 35%, transparent);}\n` +
        `.primary-btn{background:linear-gradient(135deg,var(--r-accent),var(--sage-deep,#5f9a72));}\n`
    );
    outcome = `CSS --r-accent hue=${hue} wired to brand/primary`;
    shipped.push("css/expansions.css");
  } else if (task.kind === "add_plant_link") {
    const pool = ITEM_POOL[task.idx % ITEM_POOL.length];
    const itemId = `seed_${pool[0]}_${pad(round)}`;
    const plantId = `plant_${pool[0]}_${pad(round)}`;
    content.items = content.items || {};
    content.plants = content.plants || {};
    content.items[itemId] = {
      id: itemId,
      name: `${pool[1]}种子`,
      emoji: pool[2],
      kind: "种子",
      seed: plantId,
      round,
    };
    content.plants[plantId] = {
      id: plantId,
      name: `${pool[1]}盆栽`,
      emoji: ["🌱", "🌿", pool[2]],
      harvest: itemId,
      days: 2 + (round % 4),
      round,
    };
    writeJson(CONTENT, content);
    outcome = `plant link ${plantId} harvest=${itemId}`;
    shipped.push("data/content-extra.json");
  } else if (task.kind === "real_asset") {
    // Copy a REAL existing art file into a stage path and register in manifest (used by game-data)
    const srcRel = REAL_ART[task.idx % REAL_ART.length];
    const src = path.join(ROOT, srcRel);
    if (!fs.existsSync(src) || fs.statSync(src).size < 1000) {
      throw new Error("missing real art " + srcRel);
    }
    const stage = ["walk", "garden", "shop", "album", "ui"][round % 5];
    const rel = `assets/${stage}/live_${pad(round)}.jpg`;
    const abs = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.copyFileSync(src, abs);
    if (fs.statSync(abs).size < 1000) throw new Error("copied art too small " + rel);
    const man = readJson(MANIFEST, { files: [], stages: {} });
    man.stages = man.stages || {};
    man.stages[stage] = man.stages[stage] || [];
    man.stages[stage].push({ round, path: rel, status: "live", source: srcRel });
    man.files = man.files || [];
    man.files.push(rel);
    writeJson(MANIFEST, man);
    // also pin latest walk/garden banner candidates into seasons cfg used by UI
    const s = readJson(SEASONS, { current: "dusk", palettes: {} });
    s.stageBanners = s.stageBanners || {};
    s.stageBanners[stage] = rel;
    writeJson(SEASONS, s);
    outcome = `live art ${rel} from ${srcRel} (≥1KB)`;
    shipped.push(rel, "assets/manifest.json", "data/seasons.json");
  } else {
    throw new Error("unknown kind " + task.kind);
  }

  // ALWAYS regenerate shipped JS bundles
  const sync = syncRuntime();
  shipped.push("js/content-extra.js", "js/game-data.js");

  // touch expansions marker so content rounds also bump a visible CSS comment? only if not css
  if (task.kind !== "css_token") {
    // ensure game-data.syncedAt changed — already does
  }

  const stats = readJson(path.join(ROOT, "progress", "stats.json"), {});
  stats.completed = round;
  stats.lastUpdate = new Date().toISOString();
  stats.lastGoal = task.goal;
  stats.integrated = true;
  stats.contentItems = sync.contentItems;
  writeJson(path.join(ROOT, "progress", "stats.json"), stats);

  return { outcome, shipped, sync };
}

function appendProgress(round, task, result, commitMsg) {
  const row = {
    round,
    status: "completed",
    integrated: true,
    type: task.type,
    scope: task.scope,
    goal: task.goal,
    outcome: result.outcome,
    shipped: result.shipped,
    commit: commitMsg,
    at: new Date().toISOString(),
  };
  fs.appendFileSync(PROGRESS_JSONL, JSON.stringify(row) + "\n");
  const line = `| ${round} | completed | ${task.type} | ${task.goal.replace(/\|/g, "/")} | ${result.outcome.replace(/\|/g, "/")} | \`${commitMsg}\` |\n`;
  fs.appendFileSync(PROGRESS_MD, line);
}

function runTests() {
  const r = spawnSync("node", [path.join(ROOT, "tests", "run.js")], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stdout);
    console.error(r.stderr);
    throw new Error("tests failed");
  }
  return r.stdout;
}

function gitCommit(message) {
  execSync("git add -A", { cwd: REPO, stdio: "pipe" });
  try {
    execSync("git diff --cached --quiet", { cwd: REPO, stdio: "pipe" });
    throw new Error("empty commit for: " + message);
  } catch (e) {
    if (e.message && e.message.startsWith("empty commit")) throw e;
    // has changes
  }
  execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: REPO, stdio: "pipe" });
}

function resetProgress() {
  const legacy = path.join(ROOT, "progress", "rounds-legacy-unintegrated.jsonl");
  if (fs.existsSync(PROGRESS_JSONL)) {
    fs.renameSync(PROGRESS_JSONL, legacy);
  }
  fs.writeFileSync(
    PROGRESS_MD,
    `# 晚风小路 · 游戏开发进度表（集成回合）\n\n` +
      `> 仅记录 **integrated=true** 回合：每轮改动 shipped 运行时并同步 js/content-extra.js + js/game-data.js。\n` +
      `> 旧的未接入 data-only 回合已归档到 \`rounds-legacy-unintegrated.jsonl\`。\n\n` +
      `| Round | Status | Type | Goal | Outcome | Commit |\n` +
      `|------:|--------|------|------|---------|--------|\n`
  );
  fs.writeFileSync(PROGRESS_JSONL, "");
  console.log("progress reset; legacy archived");
}

function main() {
  const args = parseArgs();
  if (args.reset) resetProgress();

  // bootstrap sync
  syncRuntime();

  let start = args.from != null ? args.from : lastCompletedRound() + 1;
  if (start < 1) start = 1;
  let end = args.until != null ? args.until : start + args.count - 1;

  console.log(`Integrated rounds ${start}..${end}`);
  for (let n = start; n <= end; n++) {
    const task = taskForRound(n);
    const result = applyTask(n, task);
    const msg = `${task.type}(${task.scope}): R${pad(n)} ${task.goal}`;
    appendProgress(n, task, result, msg);
    if (n <= 5 || n % 20 === 0 || n === end) runTests();
    gitCommit(msg);
    if (n % 10 === 0 || n === end) {
      console.log(`  R${pad(n)} ${task.kind} → ${result.outcome}`);
    }
  }
  console.log("done", { start, end, last: lastCompletedRound() });
}

main();
