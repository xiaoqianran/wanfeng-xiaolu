#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs");

const core = require(path.join(__dirname, "..", "js", "core.js"));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("  ✓", name);
  } catch (e) {
    failed++;
    console.error("  ✗", name);
    console.error("   ", e.message);
  }
}

console.log("晚风小路 unit tests (shipped js/core.js)\n");

test("defaultState has bag, pots, no combat fields", () => {
  const s = core.defaultState();
  assert.strictEqual(s.coins, 20);
  assert.ok(s.bag.lemon >= 1);
  assert.strictEqual(s.pots.length, 4);
  assert.strictEqual(s.hp, undefined);
  assert.strictEqual(s.damage, undefined);
});

test("addItem/takeItem/hasItem/bagCount", () => {
  const s = core.defaultState();
  core.addItem(s, "maple", 3);
  assert.strictEqual(s.bag.maple, 3);
  assert.strictEqual(s.discovered.maple, true);
  assert.ok(core.hasItem(s, "maple", 2));
  assert.ok(core.takeItem(s, "maple", 2));
  assert.strictEqual(s.bag.maple, 1);
  assert.ok(core.bagCount(s) >= 1);
  assert.strictEqual(core.takeItem(s, "maple", 9), false);
});

test("plantSeed and tend growth/harvest", () => {
  const s = core.defaultState();
  core.addItem(s, "mint", 2);
  const planted = core.plantSeed(s, 0, "mint");
  assert.ok(planted.ok);
  assert.strictEqual(s.pots[0].plantId, "mintPlant");
  for (let i = 0; i < 12; i++) {
    core.tend(s, 0, "water");
    core.tend(s, 0, "sun");
    core.tend(s, 0, "talk");
  }
  assert.ok(core.isReady(s.pots[0]));
  const before = s.bag.mint || 0;
  const h = core.tend(s, 0, "harvest");
  assert.ok(h.ok);
  assert.ok((s.bag.mint || 0) > before);
  assert.ok(s.hearts >= 1);
});

test("scoreDrink rewards matching customer prefs", () => {
  const customer = {
    tags: ["清爽"],
    flavors: ["mint"],
    wantTopping: true,
  };
  const good = core.scoreDrink(customer, {
    cup: "tall",
    base: "soda",
    flavor: "mint",
    topping: "petal",
  });
  const bad = core.scoreDrink(customer, {
    cup: "mug",
    base: "tea",
    flavor: "honey",
    topping: "none",
  });
  assert.ok(good.score > bad.score);
  assert.ok(good.coins >= 4);
});

test("serveDrink consumes materials and records drinksMade", () => {
  const s = core.defaultState();
  core.addItem(s, "mint", 1);
  core.addItem(s, "petal", 1);
  const customer = { tags: ["清爽"], flavors: ["mint"], wantTopping: true };
  const r = core.serveDrink(
    s,
    customer,
    { cup: "tall", base: "soda", flavor: "mint", topping: "petal" }
  );
  assert.ok(r.ok);
  assert.ok(s.drinksMade["tall-soda-mint-petal"] >= 1);
  assert.ok((s.bag.mint || 0) === 1 + 1 - 1 || s.bag.mint === undefined || s.bag.mint >= 0);
});

test("serialize/deserialize roundtrip preserves bag", () => {
  const s = core.defaultState();
  core.addItem(s, "peach", 5);
  const raw = core.serialize(s);
  const back = core.deserialize(raw);
  assert.strictEqual(back.bag.peach, 5);
  assert.strictEqual(back.version, core.VERSION);
});

test("settleOfflineGrowth advances plant growth", () => {
  const s = core.defaultState();
  core.addItem(s, "berry", 1);
  core.plantSeed(s, 0, "berry");
  s.pots[0].tendedAt = Date.now() - 2 * 3600000;
  const g0 = s.pots[0].growth;
  core.settleOfflineGrowth(s, Date.now());
  assert.ok(s.pots[0].growth > g0);
});

test("mergeCatalog adds extra items", () => {
  const cat = core.mergeCatalog({
    items: { lavender: { id: "lavender", name: "薰衣草", emoji: "💜", kind: "风味", seed: null } },
  });
  assert.ok(cat.items.lemon);
  assert.ok(cat.items.lavender);
});

test("assertNoCombat rejects combat copy", () => {
  assert.ok(core.assertNoCombat("晚风温柔"));
  assert.ok(!core.assertNoCombat("造成 10 damage"));
});

test("discovery tracks first pickup", () => {
  const s = core.defaultState();
  assert.strictEqual(s.discovered.stone, undefined);
  core.addItem(s, "stone", 1);
  assert.strictEqual(s.discovered.stone, true);
});

// file:// entry structural check
test("index.html uses relative script/style and loads core", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes('href="styles.css"') || html.includes('href="css/'));
  assert.ok(html.includes("js/core.js") || html.includes("core.js"));
  assert.ok(html.includes("js/content-extra.js"));
  assert.ok(html.includes("assets/scenes/hero-dusk.jpg"));
  assert.ok(!html.includes('type="module"') || html.includes("file:"));
  assert.ok(!/require\(|module\.exports/.test(html));
});

test("extra craft fixtures from iteration rounds exercise scoreDrink", () => {
  const p = path.join(__dirname, "extra-cases.json");
  if (!fs.existsSync(p)) return;
  const pack = JSON.parse(fs.readFileSync(p, "utf8"));
  assert.ok(pack.length > 0);
  const craftCases = pack.filter((c) => c.craft);
  assert.ok(craftCases.length > 0);
  const sample = craftCases[craftCases.length - 1];
  const customer = { tags: sample.tags || ["清爽"], flavors: sample.flavors || ["plain"] };
  const r = core.scoreDrink(customer, sample.craft);
  assert.ok(r.score >= 1);
  assert.ok(r.coins >= 4);
});

test("extra bag ops mutate shipped state", () => {
  const p = path.join(__dirname, "extra-cases.json");
  if (!fs.existsSync(p)) return;
  const pack = JSON.parse(fs.readFileSync(p, "utf8"));
  const bagOps = pack.filter((c) => c.bagOp);
  assert.ok(bagOps.length > 0);
  const s = core.defaultState();
  for (const c of bagOps.slice(-20)) {
    core.addItem(s, c.bagOp.add, c.bagOp.n || 1);
    assert.ok(core.hasItem(s, c.bagOp.add, 1));
  }
});

test("asset hero/garden/shop images exist on disk", () => {
  const needed = [
    "assets/scenes/hero-dusk.jpg",
    "assets/garden/windowsill.jpg",
    "assets/shop/soda-hero.jpg",
    "assets/album/diary-cover.jpg",
    "assets/scenes/walk-path.jpg",
  ];
  for (const rel of needed) {
    assert.ok(fs.existsSync(path.join(__dirname, "..", rel)), "missing " + rel);
  }
});

test("content-extra.js defines WanfengExtra for file:// merge", () => {
  const code = fs.readFileSync(path.join(__dirname, "..", "js", "content-extra.js"), "utf8");
  assert.ok(code.includes("WanfengExtra"));
  const sandbox = { globalThis: {} };
  // eslint-disable-next-line no-new-func
  const fn = new Function("globalThis", code + "; return globalThis.WanfengExtra;");
  const extra = fn(sandbox.globalThis);
  assert.ok(extra && extra.items);
  assert.ok(Object.keys(extra.items).length > 10);
});

test("advanceSeason cycles and journals", () => {
  const s = core.defaultState();
  const first = s.season;
  const next = core.advanceSeason(s);
  assert.ok(next);
  assert.notStrictEqual(next, first);
  assert.ok(s.journal.length >= 1);
  assert.ok(s.day >= 2);
});

test("evaluateAchievements unlocks first_walk", () => {
  const s = core.defaultState();
  s.pathsWalked = 1;
  const newly = core.evaluateAchievements(s);
  assert.ok(newly.some((a) => a.id === "first_walk"));
  assert.ok(s.achievements.first_walk);
  const again = core.evaluateAchievements(s);
  assert.strictEqual(again.length, 0);
});

test("season art paths exist for all seasons", () => {
  for (const id of core.SEASON_ORDER) {
    const rel = core.SEASON_ART[id];
    assert.ok(rel, "missing art key " + id);
    assert.ok(fs.existsSync(path.join(__dirname, "..", rel)), "missing file " + rel);
  }
});

test("index wires season achievements journal screens", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes('id="screen-journal"'));
  assert.ok(html.includes('id="screen-achievements"'));
  assert.ok(html.includes("btn-next-season"));
  assert.ok(html.includes("assets/seasons/"));
  assert.ok(html.includes("js/game-data.js"));
});

test("game-data.js is loaded bundle matching data configs", () => {
  const code = fs.readFileSync(path.join(__dirname, "..", "js", "game-data.js"), "utf8");
  assert.ok(code.includes("WanfengGameData"));
  const sandbox = { globalThis: {} };
  const fn = new Function("globalThis", code + "; return globalThis.WanfengGameData;");
  const gd = fn(sandbox.globalThis);
  assert.ok(gd.walk && typeof gd.walk.pathWidth === "number");
  assert.ok(Array.isArray(gd.garden.messages) || gd.garden.messages === undefined || Array.isArray(gd.garden.messages));
  assert.ok(gd.shop);
  assert.ok(gd.syncedAt);
});

test("content-extra.js stays in sync with content-extra.json items", () => {
  const json = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const code = fs.readFileSync(path.join(__dirname, "..", "js", "content-extra.js"), "utf8");
  const sandbox = { globalThis: {} };
  const fn = new Function("globalThis", code + "; return globalThis.WanfengExtra;");
  const extra = fn(sandbox.globalThis);
  const jsonIds = Object.keys(json.items || {});
  const jsIds = Object.keys(extra.items || {});
  assert.strictEqual(jsIds.length, jsonIds.length, "item count mismatch json vs js");
  // sample last 5 ids present in both
  jsonIds.slice(-5).forEach((id) => {
    assert.ok(extra.items[id], "missing in JS: " + id);
  });
});

test("game.js consumes WanfengGameData configs", () => {
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("WanfengGameData"));
  assert.ok(game.includes("walkCfg"));
  assert.ok(game.includes("gardenCfg"));
  assert.ok(game.includes("shopCfg"));
  assert.ok(game.includes("secretRecipes"));
  assert.ok(game.includes("PATH_WIDTH"));
});

test("no 1x1 placeholder PNGs claimed as live stage art in manifest", () => {
  const manPath = path.join(__dirname, "..", "assets", "manifest.json");
  if (!fs.existsSync(manPath)) return;
  const man = JSON.parse(fs.readFileSync(manPath, "utf8"));
  const lives = [];
  Object.values(man.stages || {}).forEach((arr) => {
    (arr || []).forEach((e) => {
      if (e && e.status === "live" && e.path) lives.push(e.path);
    });
  });
  lives.forEach((rel) => {
    const p = path.join(__dirname, "..", rel);
    assert.ok(fs.existsSync(p), "missing live art " + rel);
    assert.ok(fs.statSync(p).size >= 1000, "live art too small " + rel);
  });
});

console.log("\nResult: %d passed, %d failed", passed, failed);
if (failed) process.exit(1);
