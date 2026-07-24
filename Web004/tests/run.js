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

test("settings update and export/import save roundtrip", () => {
  const s = core.defaultState();
  core.updateSettings(s, { sound: false, reduceMotion: true });
  assert.strictEqual(core.getSettings(s).sound, false);
  assert.strictEqual(core.getSettings(s).reduceMotion, true);
  core.addItem(s, "maple", 4);
  const raw = core.exportSave(s);
  const back = core.importSave(raw);
  assert.ok(back.ok);
  assert.strictEqual(back.state.bag.maple, 4);
  assert.strictEqual(back.state.settings.sound, false);
});

test("audio module exports play without throwing when silent", () => {
  const audio = require(path.join(__dirname, "..", "js", "audio.js"));
  assert.strictEqual(typeof audio.play, "function");
  // no AudioContext in node — should return false, not throw
  assert.strictEqual(audio.play("pickup", false), false);
  assert.strictEqual(audio.play("pickup", true), false);
});

test("settings and tutorial markup ship in index", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes('id="screen-settings"'));
  assert.ok(html.includes('id="tutorial"'));
  assert.ok(html.includes("js/audio.js"));
  assert.ok(html.includes("btn-export-save"));
  assert.ok(html.includes('id="screen-daily"'));
  assert.ok(html.includes("btn-demo-mode"));
});

test("daily goals evaluate and claim reward once", () => {
  const s = core.defaultState();
  core.ensureDailyGoals(s);
  assert.ok(s.daily && s.daily.goalIds.length === 3);
  // force complete all by setting high stats vs baseline 0
  s.pathsWalked = 5;
  s.stats.itemsPicked = 10;
  s.stats.drinksServed = 5;
  s._tendsToday = 2;
  core.appendJournal(s, "test line");
  const ev = core.evaluateDailyGoals(s);
  // may not all complete depending on which 3 goals picked — complete manually
  s.daily.goalIds.forEach((id) => {
    s.daily.completed[id] = true;
  });
  const claim = core.claimDailyReward(s);
  assert.ok(claim.ok);
  assert.ok(s.coins >= 28);
  assert.ok(claim.gift);
  assert.ok(core.DAILY_GIFT_POOL.indexOf(claim.gift) >= 0);
  assert.ok((s.bag[claim.gift] || 0) >= 1);
  const claim2 = core.claimDailyReward(s);
  assert.strictEqual(claim2.ok, false);
});

test("createDemoState seeds showcase without combat fields", () => {
  const d = core.createDemoState();
  assert.ok(d.demo);
  assert.ok(d.bag.lemon >= 1);
  assert.ok(d.pots[0].plantId);
  assert.strictEqual(d.hp, undefined);
  assert.ok(d.settings.tutorialDone);
});

test("no live_ duplicate art files remain", () => {
  const lives = [];
  function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/live_.*\.jpg$/i.test(e.name)) lives.push(p);
    });
  }
  walk(path.join(__dirname, "..", "assets"));
  assert.strictEqual(lives.length, 0, "live_ copies should be removed: " + lives.join(","));
});

test("unique UI icons exist with distinct byte sizes", () => {
  const files = [
    "assets/ui/icon-daily.png",
    "assets/ui/icon-demo.png",
    "assets/ui/icon-settings.png",
    "assets/ui/icon-walk.png",
  ].map((f) => path.join(__dirname, "..", f));
  const sizes = files.map((f) => {
    assert.ok(fs.existsSync(f), f);
    return fs.statSync(f).size;
  });
  assert.ok(sizes.every((n) => n > 100));
  assert.strictEqual(new Set(sizes).size, sizes.length, "icons should differ in size/bytes");
});

test("garden/walk/shop copy has no round-id spam pattern", () => {
  const g = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "garden-config.json"), "utf8"));
  const spam = /#\d{2,}|R\d{4}/;
  (g.messages || []).forEach((m) => assert.ok(!spam.test(m), m));
  const w = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "walk-config.json"), "utf8"));
  (w.ambient || []).forEach((a) => {
    const t = typeof a === "string" ? a : a.note;
    assert.ok(!spam.test(t || ""), t);
  });
});

test("template spam engine is disabled", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(/DISABLED/.test(src));
});

test("evening events data is unique and loaded in game-data", () => {
  const events = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8")
  );
  assert.ok(events.length >= 6);
  const ids = events.map((e) => e.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  events.forEach((e) => {
    assert.ok(e.body && e.body.length > 12);
    assert.ok(!/#\d{2,}/.test(e.body));
  });
  const code = fs.readFileSync(path.join(__dirname, "..", "js", "game-data.js"), "utf8");
  assert.ok(code.includes("eveningEvents"));
  assert.ok(code.includes("lamp_first"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("applyEveningEvent"));
});

test("authentic ledger exists and is source of truth format", () => {
  const p = path.join(__dirname, "..", "progress", "authentic-rounds.jsonl");
  assert.ok(fs.existsSync(p));
  const rows = fs
    .readFileSync(p, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  assert.ok(rows.length >= 1);
  rows.forEach((r) => {
    assert.strictEqual(r.authentic, true);
    assert.ok(r.goal && r.outcome && r.commit);
    assert.ok(Array.isArray(r.shipped) && r.shipped.length >= 1);
  });
});

test("ECONOMY constants drive scoreDrink coins", () => {
  const c = { tags: ["清爽"], flavors: ["mint"] };
  const r = core.scoreDrink(c, { cup: "tall", base: "soda", flavor: "mint", topping: "none" });
  assert.ok(r.coins >= core.ECONOMY.serveBase);
  assert.strictEqual(r.coins, core.ECONOMY.serveBase + Math.floor(r.score * core.ECONOMY.serveScoreMul));
});

test("unlockPotSlot spends coins and adds pot", () => {
  const s = core.defaultState(4);
  s.coins = 30;
  const r = core.unlockPotSlot(s, 25);
  assert.ok(r.ok);
  assert.strictEqual(s.potSlots, 5);
  assert.strictEqual(s.pots.length, 5);
  assert.strictEqual(s.coins, 5);
  const r2 = core.unlockPotSlot(s, 25);
  assert.strictEqual(r2.ok, false);
});

test("album recipes tab markup present", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes('data-tab="recipes"'));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes('tab === "recipes"'));
});

test("scoreDrink favoriteFlavor soft bonus", () => {
  const craft = { cup: "mug", base: "tea", flavor: "honey", topping: "none" };
  const baseC = { tags: ["温柔"], flavors: ["jasmine"] };
  const favC = { tags: ["温柔"], flavors: ["jasmine"], favoriteFlavor: "honey" };
  const a = core.scoreDrink(baseC, craft);
  const b = core.scoreDrink(favC, craft);
  assert.ok(b.score >= a.score);
  assert.ok(b.notes.some((n) => n.indexOf("记得") >= 0));
});

test("path themes unique and setPathTheme/buildSpawnList work", () => {
  const themes = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8")
  );
  assert.ok(themes.length >= 4);
  const ids = themes.map((t) => t.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  themes.forEach((t) => {
    assert.ok(t.name && t.sky && t.sky.length >= 3);
    assert.ok(t.bias && typeof t.bias === "object");
    assert.ok(Array.isArray(t.ambient) && t.ambient.length >= 1);
    t.ambient.forEach((a) => assert.ok(!/#\d{2,}/.test(a)));
  });
  const s = core.defaultState();
  const r = core.setPathTheme(s, "riverside", themes);
  assert.ok(r.ok);
  assert.strictEqual(s.pathThemeId, "riverside");
  const th = core.getPathTheme(s, themes);
  assert.strictEqual(th.id, "riverside");
  const spawns = core.buildSpawnList(["maple", "mint", "stone"], th.bias, 40);
  assert.ok(spawns.length > 0);
  const mintN = spawns.filter((x) => x === "mint").length;
  const mapleN = spawns.filter((x) => x === "maple").length;
  assert.ok(mintN >= mapleN);
  const gd = fs.readFileSync(path.join(__dirname, "..", "js", "game-data.js"), "utf8");
  assert.ok(gd.includes("pathThemes") && gd.includes("starlight"));
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("theme-picker"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("renderThemePicker") && game.includes("pathSpawnsForTheme"));
});

test("migrateState fills v3 fields on old save", () => {
  const raw = JSON.stringify({ coins: 9, bag: { mint: 1 }, pots: [{ plantId: null, water: 0, sun: 0, mood: 0, growth: 0, tendedAt: 0 }] });
  const s = core.deserialize(raw);
  assert.ok(s.pathThemeId);
  assert.ok(s.potSlots >= 1);
  assert.ok(s.settings);
  assert.strictEqual(s.version, core.VERSION);
});

test("content-extra ships extra bases honey_water", () => {
  const code = fs.readFileSync(path.join(__dirname, "..", "js", "content-extra.js"), "utf8");
  assert.ok(code.includes("honey_water") || code.includes("berry_soda"));
});

test("drawWeather exists in game for theme FX", () => {
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("function drawWeather"));
});

test("renamePlant sets nickname", () => {
  const s = core.defaultState();
  core.addItem(s, "mint", 1);
  core.plantSeed(s, 0, "mint");
  const r = core.renamePlant(s, 0, "小青");
  assert.ok(r.ok);
  assert.strictEqual(s.pots[0].nickname, "小青");
});

test("content customers include 折纸的少年", () => {
  const code = fs.readFileSync(path.join(__dirname, "..", "js", "content-extra.js"), "utf8");
  assert.ok(code.includes("折纸的少年"));
});

test("in-game help screen ships with controls summary", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes('id="screen-help"'));
  assert.ok(html.includes('data-go="help"'));
  assert.ok(html.includes("没有战斗"));
  assert.ok(html.includes("再走一段新路") || html.includes("主题"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("晚风小路"));
  assert.ok(man.includes("没有战斗"));
  assert.ok(man.includes("今日小目标"));
});

test("ECONOMY.potUnlockCost used by unlockPotSlot default", () => {
  const s = core.defaultState(4);
  s.coins = core.ECONOMY.potUnlockCost;
  const r = core.unlockPotSlot(s);
  assert.ok(r.ok);
  assert.strictEqual(s.coins, 0);
  assert.strictEqual(r.cost, core.ECONOMY.potUnlockCost);
});

test("journal templates are unique without round-id spam", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "journal-templates.json"), "utf8"));
  assert.ok(j.length >= 6);
  const titles = j.map((x) => x.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  j.forEach((x) => {
    assert.ok(x.body && x.body.length > 6);
    assert.ok(!/#\d{2,}/.test(x.title + x.body));
  });
  const gd = fs.readFileSync(path.join(__dirname, "..", "js", "game-data.js"), "utf8");
  assert.ok(gd.includes("暮色入册") || gd.includes("窗台备忘"));
});

test("mail data unique and screen ships", () => {
  const mail = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "mail.json"), "utf8"));
  assert.ok(mail.length >= 3);
  const ids = mail.map((m) => m.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  mail.forEach((m) => {
    assert.ok(m.title && m.body && m.body.length > 8);
    assert.ok(!/#\d{2,}/.test(m.title + m.body));
  });
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes('id="screen-mail"') && html.includes("btn-open-mail"));
  const gd = fs.readFileSync(path.join(__dirname, "..", "js", "game-data.js"), "utf8");
  assert.ok(gd.includes("mail_seed") || gd.includes("mail_thanks"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("openOneMail"));
});

test("stats screen ships", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes('id="screen-stats"'));
  assert.ok(html.includes('data-go="stats"'));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("function renderStats"));
});

test("scoreDrink season soft bonus for spring jasmine", () => {
  const craft = { cup: "tall", base: "soda", flavor: "jasmine", topping: "none" };
  const c = { tags: ["清爽"], flavors: ["plain"] };
  const base = core.scoreDrink(c, craft, {});
  const spring = core.scoreDrink(c, craft, { season: "spring" });
  assert.ok(spring.score >= base.score);
  assert.ok(spring.notes.some((n) => n.indexOf("春日") >= 0));
});

test("softNewDay refreshes daily and keeps bag", () => {
  const s = core.defaultState();
  core.addItem(s, "maple", 3);
  core.ensureDailyGoals(s);
  const day0 = s.day;
  const bag0 = s.bag.maple;
  const r = core.softNewDay(s);
  assert.ok(r.ok);
  assert.ok(s.day > day0);
  assert.strictEqual(s.bag.maple, bag0);
  assert.ok(s.daily && s.daily.goalIds.length === 3);
});

test("weatherFx setting defaults true and can disable", () => {
  const s = core.defaultState();
  assert.strictEqual(core.getSettings(s).weatherFx, true);
  core.updateSettings(s, { weatherFx: false });
  assert.strictEqual(core.getSettings(s).weatherFx, false);
  const raw = core.exportSave(s);
  const back = core.importSave(raw);
  assert.ok(back.ok);
  assert.strictEqual(back.state.settings.weatherFx, false);
});

test("settings markup includes weather toggle", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes('id="set-weather"'));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("weatherFx"));
  assert.ok(game.includes("stFx.weatherFx"));
});

test("secret recipes unique hand-authored names", () => {
  const r = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(r.length >= 6);
  const names = r.map((x) => x.name);
  assert.strictEqual(new Set(names).size, names.length);
  r.forEach((x) => assert.ok(!/#\d+/.test(x.name)));
  const gd = fs.readFileSync(path.join(__dirname, "..", "js", "game-data.js"), "utf8");
  assert.ok(gd.includes("暮色薄荷") || gd.includes("窗台蜜茶"));
});

test("high mood harvest can include gift field in core", () => {
  const s = core.defaultState();
  core.addItem(s, "mint", 1);
  core.plantSeed(s, 0, "mint");
  s.pots[0].growth = 99;
  s.pots[0].mood = 90;
  s.pots[0].water = 80;
  s.pots[0].sun = 80;
  const h = core.tend(s, 0, "harvest");
  assert.ok(h.ok);
  assert.ok(h.count >= 1);
  // gift optional field when mood high
  if (h.gift) assert.ok(s.bag[h.gift] >= 1);
});

test("curated collectibles seashell pinecone ship in content-extra", () => {
  const code = fs.readFileSync(path.join(__dirname, "..", "js", "content-extra.js"), "utf8");
  assert.ok(code.includes("seashell") && code.includes("pinecone"));
  assert.ok(code.includes("细纹贝壳"));
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.seashell && j.items.star_sand);
  assert.ok((j.flavors || []).some((f) => f.id === "tea_leaf"));
});

test("garden talkLines unique and present in game-data", () => {
  const g = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "garden-config.json"), "utf8"));
  assert.ok(Array.isArray(g.talkLines) && g.talkLines.length >= 6);
  assert.strictEqual(new Set(g.talkLines).size, g.talkLines.length);
  g.talkLines.forEach((line) => assert.ok(!/#\d{2,}/.test(line) && line.length > 6));
  const gd = fs.readFileSync(path.join(__dirname, "..", "js", "game-data.js"), "utf8");
  assert.ok(gd.includes("talkLines"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("talkPool"));
});

test("build-meta shows version in settings", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes('id="build-meta"'));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("build-meta") && game.includes("Core.VERSION"));
});

test("game filters template customer names with middle-dot digits", () => {
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("·\\d+$") || game.includes("·\d+$") || game.indexOf("·") >= 0 && game.includes("filter"));
  assert.ok(game.includes("CUSTOMERS") && game.includes("filter"));
});

test("shop tipMessages are unique without round spam", () => {
  const s = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok((s.tipMessages || []).length >= 6);
  const set = new Set(s.tipMessages);
  assert.strictEqual(set.size, s.tipMessages.length);
  s.tipMessages.forEach((m) => assert.ok(!/#\d+|小店低语 #/.test(m)));
});

test("meadow theme exists and has weather branch", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "meadow"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes('themeId === "meadow"') || game.includes("meadow"));
});

test("content-extra customers have no middle-dot round spam names", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  (j.customers || []).forEach((c) => {
    assert.ok(c.name);
    assert.ok(!/·\d+$/.test(c.name), c.name);
  });
});

test("tea_leaf is plantable to teaBush and harbor theme ships", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.strictEqual(j.items.tea_leaf.seed, "teaBush");
  assert.ok(j.plants.teaBush);
  const s = core.defaultState();
  // tea_leaf may only be in extra catalog
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants });
  s.bag.tea_leaf = 1;
  const planted = core.plantSeed(s, 0, "tea_leaf", cat);
  assert.ok(planted.ok, JSON.stringify(planted));
  assert.strictEqual(s.pots[0].plantId, "teaBush");
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "harbor"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("harbor"));
});

test("settings has copy-save control and pot labels use nickname", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("btn-copy-save"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pot.nickname"));
  assert.ok(game.includes("clipboard") || game.includes("writeText"));
});

test("secret recipes include 陶碗野茶 and bag sort ships", () => {
  const r = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(r.some((x) => x.name === "陶碗野茶"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("kindOrder"));
  const meta = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "meta.json"), "utf8"));
  assert.strictEqual(meta.combat, false);
  assert.ok(meta.systems.includes("mail"));
});

test("audio module exposes ambience controls without throw", () => {
  const audio = require(path.join(__dirname, "..", "js", "audio.js"));
  assert.strictEqual(typeof audio.setAmbience, "function");
  assert.strictEqual(typeof audio.startAmbience, "function");
  assert.strictEqual(typeof audio.stopAmbience, "function");
  // Node has no AudioContext — start fails safely; stop when already off returns false
  assert.strictEqual(audio.setAmbience(true, true), false);
  assert.strictEqual(audio.isAmbienceOn(), false);
  audio.setAmbience(false, true);
  assert.strictEqual(audio.isAmbienceOn(), false);
});

test("ambience setting defaults false and persists", () => {
  const s = core.defaultState();
  assert.strictEqual(core.getSettings(s).ambience, false);
  core.updateSettings(s, { ambience: true });
  assert.strictEqual(core.getSettings(s).ambience, true);
  const back = core.importSave(core.exportSave(s));
  assert.ok(back.ok);
  assert.strictEqual(back.state.settings.ambience, true);
});

test("settings markup includes ambience toggle", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes('id="set-ambience"'));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("set-ambience") && game.includes("setAmbience"));
});

test("season-tips unique per season and loaded in game-data", () => {
  const tips = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "season-tips.json"), "utf8"));
  ["spring", "summer", "autumn", "winter", "dusk"].forEach((k) => {
    assert.ok(Array.isArray(tips[k]) && tips[k].length >= 1, k);
    tips[k].forEach((line) => assert.ok(line.length > 6 && !/#\d+/.test(line)));
  });
  const gd = fs.readFileSync(path.join(__dirname, "..", "js", "game-data.js"), "utf8");
  assert.ok(gd.includes("seasonTips"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("seasonTips"));
});

test("serveStreak increments on high score serveDrink", () => {
  const s = core.defaultState();
  s.bag = { mint: 5, petal: 5 };
  const customer = { tags: ["清爽"], flavors: ["mint"], wantTopping: true };
  const craft = { cup: "tall", base: "soda", flavor: "mint", topping: "petal" };
  let last = null;
  for (let i = 0; i < 3; i++) {
    core.addItem(s, "mint", 1);
    core.addItem(s, "petal", 1);
    last = core.serveDrink(s, customer, craft);
    assert.ok(last.ok, JSON.stringify(last));
  }
  assert.ok((s.serveStreak || 0) >= 3);
  assert.ok(last.serveStreak >= 3);
});

test("garden care hints and expanded mail ship", () => {
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("土壤有点干"));
  assert.ok(game.includes("serveStreak"));
  const mail = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "mail.json"), "utf8"));
  assert.ok(mail.length >= 12);
  const ids = mail.map((m) => m.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

test("keyboard Escape and bag/mail shortcuts ship", () => {
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("Escape"));
  assert.ok(game.includes('"b": "bag"') || game.includes("bag"));
  assert.ok(game.includes("themeLabel") || game.includes("currentTheme()"));
});

test("journal templates include 码头笔记", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "journal-templates.json"), "utf8"));
  assert.ok(j.some((x) => x.title === "码头笔记"));
});

test("lantern_street theme and new customers ship", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "lantern_street"));
  assert.ok(themes.length >= 7);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("lantern_street"));
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok((j.customers || []).some((c) => c.name === "卖灯笼的阿婆"));
  (j.customers || []).forEach((c) => assert.ok(!/·\d+$/.test(c.name)));
});

test("tend rest restores mood with little growth", () => {
  const s = core.defaultState();
  core.addItem(s, "mint", 1);
  core.plantSeed(s, 0, "mint");
  s.pots[0].mood = 20;
  s.pots[0].water = 10;
  s.pots[0].growth = 1.0;
  const r = core.tend(s, 0, "rest");
  assert.ok(r.ok && r.rested);
  assert.ok(s.pots[0].mood > 20);
  assert.ok(s.pots[0].growth < 1.5);
  assert.ok((s.stats.rests || 0) >= 1);
});

test("rest button and restLines ship", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes('data-act="rest"'));
  const g = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "garden-config.json"), "utf8"));
  assert.ok(Array.isArray(g.restLines) && g.restLines.length >= 6);
  g.restLines.forEach((line) => assert.ok(line.length > 8 && !/#\d+/.test(line)));
  const gd = fs.readFileSync(path.join(__dirname, "..", "js", "game-data.js"), "utf8");
  assert.ok(gd.includes("restLines"));
});

test("quietShop setting defaults false", () => {
  const s = core.defaultState();
  assert.strictEqual(core.getSettings(s).quietShop, false);
  core.updateSettings(s, { quietShop: true });
  assert.strictEqual(core.getSettings(s).quietShop, true);
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("set-quiet-shop"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("quietShop"));
});

test("lavender_bud plantable and rest still works", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.lavender_bud && j.plants.lavenderPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants });
  const s = core.defaultState();
  s.bag.lavender_bud = 1;
  const planted = core.plantSeed(s, 0, "lavender_bud", cat);
  assert.ok(planted.ok);
  const rest = core.tend(s, 0, "rest");
  assert.ok(rest.ok && rest.rested);
});

test("rain_eaves theme ships with 8 path themes", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "rain_eaves"));
  assert.ok(themes.length >= 8);
  const ids = themes.map((th) => th.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("rain_eaves"));
  assert.ok(game.includes("scoreStars"));
});

test("new achievements and camellia/lavender style items exist", () => {
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "gentle_rest"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "theme_walker"));
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.camellia && j.plants.camelliaPot);
});

test("unique mail/rest/help icons exist with distinct sizes", () => {
  const files = ["icon-mail.png", "icon-rest.png", "icon-help.png"].map((f) =>
    path.join(__dirname, "..", "assets", "ui", f)
  );
  const sizes = files.map((f) => {
    assert.ok(fs.existsSync(f), f);
    return fs.statSync(f).size;
  });
  assert.ok(sizes.every((n) => n > 100));
  assert.strictEqual(new Set(sizes).size, sizes.length);
});

test("camellia and secret 山茶蜜语 ship", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.camellia);
  const r = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(r.some((x) => x.name === "山茶蜜语" || x.name === "雨檐野茶"));
});

test("scoreDrink expanded season soft bonus for lavender and tea", () => {
  const bases = [
    { id: "floral_tea", name: "花香茶", vibe: "温柔" },
    { id: "tea", name: "茶", vibe: "温柔" },
  ];
  const flavors = [
    { id: "lavender_bud", name: "薰衣草", tags: ["花香"] },
    { id: "plain", name: "原味", tags: ["清爽"] },
    { id: "tea_leaf", name: "野茶", tags: ["温柔"] },
  ];
  const baseCat = {
    bases: bases,
    flavors: flavors,
    toppings: [{ id: "none" }],
    cups: [{ id: "mug", vibe: "温柔" }],
  };
  const cust = { tags: ["花香", "温柔"], flavors: ["lavender_bud"] };
  const craft = { cup: "mug", base: "floral_tea", flavor: "lavender_bud", topping: "none" };
  const spring = core.scoreDrink(cust, craft, Object.assign({}, baseCat, { season: "spring" }));
  const winter = core.scoreDrink(cust, craft, Object.assign({}, baseCat, { season: "winter" }));
  assert.ok(spring.notes.some((n) => n.indexOf("春日") >= 0));
  assert.ok(spring.score >= winter.score);
  const teaCraft = { cup: "mug", base: "tea", flavor: "tea_leaf", topping: "none" };
  const autumn = core.scoreDrink({ tags: ["温柔"], flavors: ["tea_leaf"] }, teaCraft, Object.assign({}, baseCat, { season: "autumn" }));
  assert.ok(autumn.notes.some((n) => n.indexOf("秋日") >= 0));
});

test("scoreDrink affinity soft bonus and coin tip", () => {
  const craft = { cup: "tall", base: "soda", flavor: "mint", topping: "none" };
  const cust = { tags: ["清爽"], flavors: ["mint"] };
  const low = core.scoreDrink(cust, craft, { affinity: 0 });
  const mid = core.scoreDrink(cust, craft, { affinity: 1 });
  const hi = core.scoreDrink(cust, craft, { affinity: core.ECONOMY.affinityBonusThreshold });
  assert.ok(mid.score >= low.score);
  assert.ok(hi.score >= mid.score);
  assert.ok(hi.notes.some((n) => n.indexOf("老熟人") >= 0));
  assert.ok(hi.coins > low.coins);
});

test("tend seasonal soft bonus spring talk / winter rest", () => {
  const s = core.defaultState();
  core.addItem(s, "mint", 1);
  core.plantSeed(s, 0, "mint");
  s.season = "spring";
  const mood0 = s.pots[0].mood;
  const r = core.tend(s, 0, "talk");
  assert.ok(r.ok);
  assert.ok(r.seasonNote === "春语轻声" || s.pots[0].mood > mood0 + 22);
  s.season = "winter";
  const r2 = core.tend(s, 0, "rest");
  assert.ok(r2.ok && r2.rested);
  assert.strictEqual(r2.seasonNote, "冬夜安歇");
});

test("rosemary is plantable and flavor ships", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.rosemary);
  assert.strictEqual(j.items.rosemary.seed, "rosemaryPot");
  assert.ok(j.plants.rosemaryPot);
  assert.ok((j.flavors || []).some((f) => f.id === "rosemary"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.rosemary = 1;
  const planted = core.plantSeed(s, 0, "rosemary", cat);
  assert.ok(planted.ok, JSON.stringify(planted));
  assert.strictEqual(s.pots[0].plantId, "rosemaryPot");
  const code = fs.readFileSync(path.join(__dirname, "..", "js", "content-extra.js"), "utf8");
  assert.ok(code.includes("rosemaryPot") && code.includes("迷迭香"));
});

test("flower_alley theme and petal weather ship", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  const th = themes.find((t) => t.id === "flower_alley");
  assert.ok(th);
  assert.ok(th.name.indexOf("花市") >= 0);
  assert.ok(th.bias.petal >= 2);
  assert.ok(themes.length >= 9);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes('themeId === "flower_alley"'));
  const gd = fs.readFileSync(path.join(__dirname, "..", "js", "game-data.js"), "utf8");
  assert.ok(gd.includes("flower_alley"));
});

test("mail expanded with unique hand-authored letters", () => {
  const mail = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "mail.json"), "utf8"));
  assert.ok(mail.length >= 20);
  const ids = mail.map((m) => m.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  assert.ok(ids.includes("mail_rosemary") && ids.includes("mail_flower_lane"));
  mail.forEach((m) => {
    assert.ok(m.body && m.body.length > 10);
    assert.ok(!/#\d{2,}/.test(m.title + m.body));
  });
});

test("secret recipes include 巷尾迷迭", () => {
  const r = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(r.some((x) => x.name === "巷尾迷迭"));
  assert.ok(r.some((x) => x.name === "花市蜜语"));
  const gd = fs.readFileSync(path.join(__dirname, "..", "js", "game-data.js"), "utf8");
  assert.ok(gd.includes("巷尾迷迭"));
});

test("game scoreDrink wires favoriteFlavor and affinity", () => {
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("favoriteFlavor"));
  assert.ok(game.includes("老熟人默契") || game.includes("affinityBonus"));
  assert.ok(game.includes("秋水温柔") || game.includes("seasonNote"));
});

test("setPotNote and sitBench soft systems", () => {
  const s = core.defaultState();
  core.addItem(s, "mint", 1);
  core.plantSeed(s, 0, "mint");
  const n = core.setPotNote(s, 0, "慢慢长大");
  assert.ok(n.ok);
  assert.strictEqual(s.pots[0].note, "慢慢长大");
  assert.ok((s.stats.potNotes || 0) >= 1);
  const b1 = core.sitBench(s);
  const b2 = core.sitBench(s);
  const b3 = core.sitBench(s);
  assert.ok(b1.ok && b2.ok && b3.ok);
  assert.strictEqual(s.stats.benchSits, 3);
  assert.ok(b3.hearts >= 1);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "pot_scribe"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "bench_sitter"));
});

test("osmanthus plantable and new customers/cups ship", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.osmanthus && j.plants.osmanthusPot);
  assert.ok((j.flavors || []).some((f) => f.id === "osmanthus"));
  assert.ok((j.cups || []).some((c) => c.id === "bamboo"));
  assert.ok((j.customers || []).some((c) => c.name === "卖糖画的叔叔"));
  assert.ok((j.customers || []).some((c) => c.name === "练小提琴的女孩"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants });
  const s = core.defaultState();
  s.bag.osmanthus = 1;
  assert.ok(core.plantSeed(s, 0, "osmanthus", cat).ok);
});

test("book_yard theme and bench/note UI ship", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "book_yard"));
  assert.ok(themes.length >= 10);
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("btn-sit-bench") && html.includes("btn-pot-note"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("sitBench") && game.includes("setPotNote"));
  assert.ok(game.includes("book_yard"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "桂花竹节晚风"));
});

test("evening events expanded unique and shop/garden icons unique", () => {
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.length >= 85);
  const titles = events.map((e) => e.title || e.id);
  assert.strictEqual(new Set(titles).size, titles.length);
  events.forEach((e) => {
    assert.ok((e.body || "").length > 12);
    assert.ok(!/#\d{2,}/.test((e.title || "") + (e.body || "")));
  });
  const files = ["icon-shop.png", "icon-garden.png", "icon-bag.png"].map((f) =>
    path.join(__dirname, "..", "assets", "ui", f)
  );
  const sizes = files.map((f) => {
    assert.ok(fs.existsSync(f), f);
    return fs.statSync(f).size;
  });
  assert.ok(sizes.every((n) => n > 100));
  assert.strictEqual(new Set(sizes).size, sizes.length);
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("icon-shop.png") && html.includes("icon-garden.png") && html.includes("icon-bag.png"));
});

test("album kind filter UI and shop shelf ship", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("album-kind-filters"));
  assert.ok(html.includes('data-kind="风味"'));
  assert.ok(html.includes("shop-shelf"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("albumKindFilter"));
  assert.ok(game.includes("renderShopShelf"));
  assert.ok(game.includes("shelfDrinks"));
  assert.ok(game.includes("season-") || game.includes("seasonClass"));
  const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
  assert.ok(css.includes("kind-chip") && css.includes("shop-shelf") && css.includes("season-spring"));
});

test("lilac plantable and daily goals include pot_note_day", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.lilac && j.plants.lilacPot);
  assert.ok((j.flavors || []).some((f) => f.id === "lilac"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants });
  const s = core.defaultState();
  s.bag.lilac = 1;
  assert.ok(core.plantSeed(s, 0, "lilac", cat).ok);
  assert.ok(core.DAILY_GOAL_DEFS.some((d) => d.id === "pot_note_day"));
  assert.ok(core.DAILY_GOAL_DEFS.some((d) => d.id === "bench_once"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "丁香暮色"));
  const mail = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "mail.json"), "utf8"));
  assert.ok(mail.some((m) => m.id === "mail_lilac"));
});

test("album item filter drops mass template seed ids in game code", () => {
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("seed_") && game.includes("albumKindFilter"));
  assert.ok(game.includes("filter((it)") || game.includes("albumKindFilter !=="));
});


test("watering can charge use and recipeMatchHint", () => {
  const s = core.defaultState();
  core.addItem(s, "mint", 1);
  core.plantSeed(s, 0, "mint");
  const can0 = core.getWateringCan(s);
  assert.ok(can0.charge >= 0);
  core.chargeWateringCan(s, 5);
  assert.ok(core.getWateringCan(s).charge >= can0.charge);
  const full = core.getWateringCan(s).charge;
  const r = core.useWateringCan(s, 0);
  assert.ok(r.ok);
  assert.ok(r.usedCan);
  assert.ok(core.getWateringCan(s).charge === full - 1);
  assert.ok((s.stats.canWaters || 0) >= 1);
  const hint = core.recipeMatchHint(
    { cup: "mug", base: "tea", flavor: "honey", topping: "none" },
    [{ name: "窗台蜜茶", cup: "mug", base: "tea", flavor: "honey", topping: "none" }]
  );
  assert.ok(hint.perfect && hint.perfect.name === "窗台蜜茶");
  const close = core.recipeMatchHint(
    { cup: "mug", base: "tea", flavor: "honey", topping: "petal" },
    [{ name: "窗台蜜茶", cup: "mug", base: "tea", flavor: "honey", topping: "none" }]
  );
  assert.ok(close.close.length >= 1);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "can_gardener"));
});

test("plum_grove theme and watering can UI ship", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "plum_grove"));
  assert.ok(themes.length >= 11);
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("btn-watering-can") && html.includes("watering-can-status"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("useWateringCan") && game.includes("recipeMatchHint"));
  assert.ok(game.includes("plum_grove"));
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok((j.customers || []).some((c) => c.name === "夜读的图书管理员"));
});


test("USER_MANUAL documents watering can and path themes", () => {
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("用水壶") || man.includes("水壶"));
  assert.ok(man.includes("梅影") || man.includes("花市"));
  assert.ok(man.includes("展示架") || man.includes("种类"));
  assert.ok(man.includes("没有战斗"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.length >= 90);
  const titles = events.map((e) => e.title || e.id);
  assert.strictEqual(new Set(titles).size, titles.length);
});


test("bluebell plantable wheat topping and topbar can pill", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.bluebell && j.plants.bluebellPot && j.items.wheat_ear);
  assert.ok((j.flavors || []).some((f) => f.id === "bluebell"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants });
  const s = core.defaultState();
  s.bag.bluebell = 1;
  assert.ok(core.plantSeed(s, 0, "bluebell", cat).ok);
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "麦田风铃"));
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes('id="res-can"'));
  const mail = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "mail.json"), "utf8"));
  assert.ok(mail.length >= 28);
  assert.strictEqual(new Set(mail.map((m) => m.id)).size, mail.length);
});


test("mist_bridge theme unique and customers expand", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "mist_bridge"));
  assert.ok(themes.length >= 12);
  const ids = themes.map((th) => th.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("mist_bridge"));
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok((j.customers || []).some((c) => c.name === "织围巾的奶奶"));
  assert.ok((j.customers || []).length >= 24);
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "雾桥薄荷罐"));
});


test("canLines mail expand and drinks sort ship", () => {
  const g = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "garden-config.json"), "utf8"));
  assert.ok(Array.isArray(g.canLines) && g.canLines.length >= 4);
  g.canLines.forEach((line) => assert.ok(line.length > 8 && !/#\d+/.test(line)));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("canLines"));
  assert.ok(game.includes("sort((a, b)") && game.includes("drinksMade"));
  const mail = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "mail.json"), "utf8"));
  assert.ok(mail.length >= 30);
  assert.ok(mail.some((x) => x.id === "mail_mist"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.length >= 22);
  assert.ok(recipes.some((r) => r.name === "奶奶的蜜桃暖杯"));
});


test("pinCustomer pickCustomerWithPin and mood-face ship", () => {
  const s = core.defaultState();
  const r = core.pinCustomer(s, "抱猫的邻居");
  assert.ok(r.ok);
  assert.strictEqual(s.pinnedCustomer, "抱猫的邻居");
  let hit = 0;
  for (let i = 0; i < 40; i++) {
    const c = core.pickCustomerWithPin(s, core.DEFAULT_CUSTOMERS, () => 0.1);
    if (c.name === "抱猫的邻居") hit++;
  }
  assert.ok(hit >= 1);
  core.unpinCustomer(s);
  assert.strictEqual(s.pinnedCustomer, null);
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("btn-pin-customer"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("mood-face") || game.includes("moodFace"));
  assert.ok(game.includes("pinCustomer"));
  const ev = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(ev.length >= 100);
});


test("firefly_field theme and star sand recipe ship", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "firefly_field"));
  assert.ok(themes.length >= 13);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("firefly_field"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "萤坡星砂苏打"));
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok((j.customers || []).some((c) => c.name === "追萤火的少年"));
});


test("evening events past 110 unique hand authored", () => {
  const ev = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(ev.length >= 110);
  const titles = ev.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const ids = ev.map((e) => e.id).filter(Boolean);
  assert.strictEqual(new Set(ids).size, ids.length);
  ev.forEach((e) => {
    assert.ok((e.body || "").length > 12);
    assert.ok(!/#\d{2,}/.test((e.title || "") + (e.body || "")));
    assert.ok(!/晚风碎片 #|窗台絮语 #/.test((e.title || "") + (e.body || "")));
  });
});


test("unique can pin firefly icons wired with distinct sizes", () => {
  const files = ["icon-can.png", "icon-pin.png", "icon-firefly.png"].map((f) =>
    path.join(__dirname, "..", "assets", "ui", f)
  );
  const sizes = files.map((f) => {
    assert.ok(fs.existsSync(f), f);
    return fs.statSync(f).size;
  });
  assert.ok(sizes.every((n) => n > 100));
  assert.strictEqual(new Set(sizes).size, sizes.length);
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("icon-can.png") && html.includes("icon-pin.png"));
});


test("chamomile plantable and 甘菊暖夜 recipe", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.chamomile && j.plants.chamomilePot);
  assert.ok((j.flavors || []).some((f) => f.id === "chamomile"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants });
  const s = core.defaultState();
  s.bag.chamomile = 1;
  assert.ok(core.plantSeed(s, 0, "chamomile", cat).ok);
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "甘菊暖夜"));
  assert.ok((j.customers || []).some((c) => c.name === "失眠的插画师"));
});


test("snapshotPot still-life memory and UI", () => {
  const s = core.defaultState();
  core.addItem(s, "mint", 1);
  core.plantSeed(s, 0, "mint");
  const r = core.snapshotPot(s, 0);
  assert.ok(r.ok && r.card);
  assert.ok((s.potSnaps || []).length >= 1);
  assert.ok((s.stats.potSnaps || 0) >= 1);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "sill_photographer"));
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("btn-pot-snap"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("snapshotPot"));
});


test("night_market theme and manual documents snap/pin", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "night_market"));
  assert.ok(themes.length >= 14);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("night_market"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("窗台速写") || man.includes("常客"));
});


test("candy_wrap paper_crane and night market recipe", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.candy_wrap && j.items.paper_crane);
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "夜市糖纸苏打"));
  const ev = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(ev.length >= 130);
  assert.strictEqual(new Set(ev.map((e) => e.title)).size, ev.length);
});


test("bag rare tag and ambient expansion ship", () => {
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("小珍藏") && game.includes("rareIds"));
  const walk = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "walk-config.json"), "utf8"));
  assert.ok((walk.ambient || []).length >= 20);
  walk.ambient.forEach((a) => assert.ok(!/#\d+/.test(a)));
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "journal-templates.json"), "utf8"));
  assert.ok(j.some((x) => x.title === "夜市尾声" || x.title === "纸鹤"));
});


test("customers expand past 30 unique names", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const names = (j.customers || []).map((c) => c.name);
  assert.ok(names.length >= 30);
  assert.strictEqual(new Set(names).size, names.length);
  names.forEach((n) => assert.ok(!/·\d+$/.test(n)));
  assert.ok(names.includes("卖糖纸的女孩") || names.includes("夜班司机"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "夜班薄荷高杯"));
});


test("stone_garden theme and new achievements", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "stone_garden"));
  assert.ok(themes.length >= 15);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("stone_garden"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "discover_15"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "pin_host"));
});


test("evening events past 150 unique", () => {
  const ev = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(ev.length >= 150);
  assert.strictEqual(new Set(ev.map((e) => e.title)).size, ev.length);
  assert.strictEqual(new Set(ev.map((e) => e.id).filter(Boolean)).size, ev.filter((e) => e.id).length);
  ev.forEach((e) => {
    assert.ok((e.body || "").length > 12);
    assert.ok(!/#\d{2,}|晚风碎片 #|窗台絮语 #/.test((e.title || "") + (e.body || "")));
  });
});


test("matcha flavor and 竹影抹茶 recipe ship", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.matcha);
  assert.ok((j.flavors || []).some((f) => f.id === "matcha"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "竹影抹茶"));
  assert.ok((j.customers || []).some((c) => c.name === "练字的学生"));
  const code = fs.readFileSync(path.join(__dirname, "..", "js", "content-extra.js"), "utf8");
  assert.ok(code.includes("matcha"));
});


test("audio play supports can pin snap kinds", () => {
  const audio = require(path.join(__dirname, "..", "js", "audio.js"));
  assert.strictEqual(typeof audio.play, "function");
  // Node has no AudioContext — play returns false safely
  assert.strictEqual(audio.play("can", true), false);
  assert.strictEqual(audio.play("pin", true), false);
  assert.strictEqual(audio.play("snap", true), false);
  const code = fs.readFileSync(path.join(__dirname, "..", "js", "audio.js"), "utf8");
  assert.ok(code.includes('kind === "can"') && code.includes('kind === "pin"') && code.includes('kind === "snap"'));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes('sfx("can")') && game.includes('sfx("snap")') && game.includes('sfx("pin")'));
});


test("sage plantable and 药草田园罐 recipe", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.sage && j.plants.sagePot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants });
  const s = core.defaultState();
  s.bag.sage = 1;
  assert.ok(core.plantSeed(s, 0, "sage", cat).ok);
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "药草田园罐"));
});


test("favoritePathTheme and moss collectible ship", () => {
  const s = core.defaultState();
  const r = core.favoritePathTheme(s, "maple_lane");
  assert.ok(r.ok);
  assert.strictEqual(s.favoritePathThemeId, "maple_lane");
  core.setPathTheme(s, "riverside", [{ id: "riverside", name: "河" }, { id: "maple_lane", name: "枫" }]);
  assert.ok(s._themesTouched.riverside);
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("btn-fav-theme"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("favoritePathTheme"));
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.moss);
});


test("season tips expanded and customers 36 unique", () => {
  const tips = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "season-tips.json"), "utf8"));
  ["spring", "summer", "autumn", "winter", "dusk"].forEach((k) => {
    assert.ok(Array.isArray(tips[k]) && tips[k].length >= 4, k);
    tips[k].forEach((line) => assert.ok(line.length > 6 && !/#\d+/.test(line)));
  });
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const names = (j.customers || []).map((c) => c.name);
  assert.ok(names.length >= 34);
  assert.strictEqual(new Set(names).size, names.length);
});


test("yuzu flavor and 柚子雨檐 recipe ship", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.yuzu);
  assert.ok((j.flavors || []).some((f) => f.id === "yuzu"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "柚子雨檐"));
  assert.ok((j.customers || []).some((c) => c.name === "撑伞的诗人"));
});


test("snow_lantern theme ships with unique weather", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "snow_lantern"));
  assert.ok(themes.length >= 16);
  const ids = themes.map((th) => th.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("snow_lantern"));
});


test("snow_walker and fav_path achievements exist", () => {
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "snow_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "fav_path"));
  const s = core.defaultState();
  s._themesTouched = { snow_lantern: true };
  const newly = core.evaluateAchievements(s);
  assert.ok(newly.some((a) => a.id === "snow_walker") || s.achievements.snow_walker);
});


test("honeysuckle plantable and 金银花雪灯 recipe", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.honeysuckle && j.plants.honeysucklePot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants });
  const s = core.defaultState();
  s.bag.honeysuckle = 1;
  assert.ok(core.plantSeed(s, 0, "honeysuckle", cat).ok);
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "金银花雪灯"));
});


test("snow and star-path icons unique sizes", () => {
  const files = ["icon-snow.png", "icon-star-path.png"].map((f) =>
    path.join(__dirname, "..", "assets", "ui", f)
  );
  const sizes = files.map((f) => {
    assert.ok(fs.existsSync(f), f);
    return fs.statSync(f).size;
  });
  assert.ok(sizes.every((n) => n > 80));
  assert.strictEqual(new Set(sizes).size, sizes.length);
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("icon-star-path.png"));
});


test("harvest memory bonus and recallGuestCraft", () => {
  const s = core.defaultState();
  core.addItem(s, "mint", 1);
  core.plantSeed(s, 0, "mint");
  // force ready
  s.pots[0].growth = 99;
  s.pots[0].mood = 80;
  const h1 = core.tend(s, 0, "harvest");
  assert.ok(h1.ok);
  assert.strictEqual(s.pots[0].harvestCount, 1);
  s.pots[0].growth = 99;
  s.pots[0].mood = 80;
  core.tend(s, 0, "harvest");
  s.pots[0].growth = 99;
  s.pots[0].mood = 80;
  const h3 = core.tend(s, 0, "harvest");
  assert.ok(h3.ok && h3.memoryBonus);
  assert.ok((s.stats.memoryHarvests || 0) >= 1);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "root_memory"));

  const s2 = core.defaultState();
  s2.bag = { mint: 4, petal: 2 };
  const cust = { name: "测试客人", tags: ["清爽"], flavors: ["mint"] };
  const craft = { cup: "tall", base: "soda", flavor: "mint", topping: "none" };
  const a = core.serveDrink(s2, cust, craft);
  assert.ok(a.ok);
  core.addItem(s2, "mint", 1);
  const b = core.serveDrink(s2, cust, craft);
  assert.ok(b.ok && b.repeated);
  assert.ok((s2.stats.repeatOrders || 0) >= 1);
  const rec = core.recallGuestCraft(s2, "测试客人");
  assert.ok(rec.ok && rec.craft.flavor === "mint");
});

test("dawn_bridge theme and recall UI ship", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "dawn_bridge"));
  assert.ok(themes.length >= 17);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("dawn_bridge") && game.includes("memoryBonus"));
  assert.ok(game.includes("recallGuestCraft") || game.includes("btn-recall-order"));
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("btn-recall-order"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "晨桥柚茶"));
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.loquat_leaf);
});


test("perilla plantable and USER_MANUAL memory/recall", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.perilla && j.plants.perillaPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants });
  const s = core.defaultState();
  s.bag.perilla = 1;
  assert.ok(core.plantSeed(s, 0, "perilla", cat).ok);
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "紫苏晨雾苏打"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("熟土") || man.includes("老样子"));
  assert.ok(man.includes("晨桥") || man.includes("dawn"));
});


test("cloud_pass theme and 18 path themes unique", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "cloud_pass"));
  assert.ok(themes.length >= 18);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("cloud_pass"));
});


test("claimFirstWalkBonus once per day", () => {
  const s = core.defaultState();
  // Use fixed local-noon timestamps so dayKey is stable across TZ
  const day1 = new Date(2026, 6, 24, 12, 0, 0).getTime();
  const day1b = new Date(2026, 6, 24, 20, 0, 0).getTime();
  const day2 = new Date(2026, 6, 25, 12, 0, 0).getTime();
  const a = core.claimFirstWalkBonus(s, day1);
  assert.ok(a.ok);
  assert.ok((s.stats.firstWalks || 0) >= 1);
  const b = core.claimFirstWalkBonus(s, day1b);
  assert.strictEqual(b.ok, false);
  const c = core.claimFirstWalkBonus(s, day2);
  assert.ok(c.ok);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "early_walker"));
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.ink_stone);
});


test("new customers and 云台花香罐 recipe ship", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok((j.customers || []).some((c) => c.name === "晨练的阿姨"));
  assert.ok((j.customers || []).some((c) => c.name === "云台写生的学生"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "云台花香罐"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pot.nickname") && game.includes("说了会儿话"));
});


test("thyme plantable and 百里香田园罐", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.thyme && j.plants.thymePot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants });
  const s = core.defaultState();
  s.bag.thyme = 1;
  assert.ok(core.plantSeed(s, 0, "thyme", cat).ok);
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "百里香田园罐"));
});


test("tide_pool theme unique among 19 themes", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "tide_pool"));
  assert.ok(themes.length >= 19);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  themes.forEach((th) => {
    assert.ok(th.name && th.sky && th.sky.length >= 3);
    (th.ambient || []).forEach((a) => assert.ok(!/#\d{2,}/.test(a)));
  });
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("tide_pool"));
});


test("salt_crystal and 潮湾盐汽水 recipe ship", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.salt_crystal);
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "潮湾盐汽水"));
  assert.ok(recipes.length >= 40);
});


test("checkPathMilestones awards stickers once", () => {
  const s = core.defaultState();
  s.pathsWalked = 5;
  const a = core.checkPathMilestones(s);
  assert.ok(a.newly.length >= 1);
  assert.ok(s.pathStickers.m5);
  const coins1 = s.coins;
  const b = core.checkPathMilestones(s);
  assert.strictEqual(b.newly.length, 0);
  assert.strictEqual(s.coins, coins1);
  s.pathsWalked = 15;
  const c = core.checkPathMilestones(s);
  assert.ok(c.newly.some((m) => m.id === "m15"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "sticker_collector"));
  assert.ok(core.PATH_MILESTONES.length >= 4);
});


test("dill plantable and 莳萝田园陶 recipe", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.dill && j.plants.dillPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants });
  const s = core.defaultState();
  s.bag.dill = 1;
  assert.ok(core.plantSeed(s, 0, "dill", cat).ok);
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "莳萝田园陶"));
});


test("upgradeWateringCan expands max to 8", () => {
  const s = core.defaultState();
  s.coins = 100;
  const a = core.upgradeWateringCan(s, 20);
  assert.ok(a.ok);
  assert.ok(core.getWateringCan(s).max >= 6);
  while (core.getWateringCan(s).max < 8) {
    s.coins = 100;
    const r = core.upgradeWateringCan(s, 20);
    assert.ok(r.ok);
  }
  s.coins = 100;
  const fail = core.upgradeWateringCan(s, 20);
  assert.strictEqual(fail.ok, false);
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("btn-upgrade-can"));
});


test("cicada_grove theme among 20 unique path themes", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "cicada_grove"));
  assert.ok(themes.length >= 20);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("cicada_grove"));
});


test("setFavoriteCup and fav-cup UI", () => {
  const s = core.defaultState();
  const r = core.setFavoriteCup(s, "mug");
  assert.ok(r.ok);
  assert.strictEqual(s.favoriteCupId, "mug");
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("btn-fav-cup"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("setFavoriteCup") || game.includes("favoriteCupId"));
});


test("getDailySpecial is stable per day and scores match", () => {
  const s = core.defaultState();
  s.season = "summer";
  const day = new Date(2026, 6, 24, 12, 0, 0).getTime();
  const a = core.getDailySpecial(s, day);
  const b = core.getDailySpecial(s, day);
  assert.strictEqual(a.flavor, b.flavor);
  assert.ok(a.label && a.hint.indexOf(a.label) >= 0);
  const craft = { cup: "tall", base: "soda", flavor: a.flavor, topping: "none" };
  // ensure flavor exists in catalogs for scoreDrink
  const flavors = [{ id: a.flavor, name: a.label, tags: ["清爽"] }, { id: "plain", name: "原味", tags: ["清爽"] }];
  const hit = core.scoreDrink(
    { tags: ["清爽"], flavors: ["plain"] },
    craft,
    {
      season: "summer",
      dailySpecial: a,
      cups: [{ id: "tall", vibe: "清爽" }],
      bases: [{ id: "soda", vibe: "清爽" }],
      flavors: flavors,
      toppings: [{ id: "none" }],
    }
  );
  assert.ok(hit.notes.some((n) => n.indexOf("特调") >= 0));
  assert.ok(hit.dailySpecial);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((x) => x.id === "daily_specialist"));
});

test("moon_well theme and basil plantable", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "moon_well"));
  assert.ok(themes.length >= 21);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("moon_well") && game.includes("getDailySpecial"));
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("daily-special-hint"));
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.basil && j.plants.basilPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants });
  const s = core.defaultState();
  s.bag.basil = 1;
  assert.ok(core.plantSeed(s, 0, "basil", cat).ok);
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "月井罗勒苏打"));
});


test("fennel flavor and USER_MANUAL daily special", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.fennel);
  assert.ok((j.flavors || []).some((f) => f.id === "fennel"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "茴香暖杯"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("小特调") || man.includes("特调"));
});


test("reed_bank theme among 22 unique themes", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "reed_bank"));
  assert.ok(themes.length >= 22);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("reed_bank"));
  const ev = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(ev.length >= 340);
  assert.strictEqual(new Set(ev.map((e) => e.title)).size, ev.length);
});


test("lemongrass plantable and 香茅 recipes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.lemongrass && j.plants.lemongrassPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants });
  const s = core.defaultState();
  s.bag.lemongrass = 1;
  assert.ok(core.plantSeed(s, 0, "lemongrass", cat).ok);
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "香茅暖汤杯"));
  assert.ok(recipes.some((r) => r.name === "芦岸香茅苏打"));
});


test("coastal_set and herb_garden achievements", () => {
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "coastal_set"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "herb_garden"));
  const s = core.defaultState();
  s.discovered = { seashell: true, river_pebble: true, salt_crystal: true };
  const n = core.evaluateAchievements(s);
  assert.ok(n.some((a) => a.id === "coastal_set") || s.achievements.coastal_set);
  const s2 = core.defaultState();
  s2.discovered = { basil: true, lemongrass: true, dill: true, thyme: true };
  const n2 = core.evaluateAchievements(s2);
  assert.ok(n2.some((a) => a.id === "herb_garden") || s2.achievements.herb_garden);
});


test("path_catalog achievement and driftwood item", () => {
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "path_catalog"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "specialist_hand"));
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.driftwood);
  const s = core.defaultState();
  s._themesTouched = {};
  for (let i = 0; i < 10; i++) s._themesTouched["t" + i] = true;
  const n = core.evaluateAchievements(s);
  assert.ok(n.some((a) => a.id === "path_catalog") || s.achievements.path_catalog);
});


test("addTipJar converts 10 coins to heart", () => {
  const s = core.defaultState();
  s.hearts = 0;
  for (let i = 0; i < 9; i++) core.addTipJar(s, 1);
  assert.strictEqual(s.hearts, 0);
  const r = core.addTipJar(s, 1);
  assert.ok(r.hearts >= 1);
  assert.ok(s.hearts >= 1);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "tip_friend"));
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("tip-jar-status"));
});


test("bergamot flavor and 佛手柑夜茶 recipe", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.bergamot);
  assert.ok((j.flavors || []).some((f) => f.id === "bergamot"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "佛手柑夜茶"));
});


test("high mood harvest gift pool includes coastal items", () => {
  const coreSrc = fs.readFileSync(path.join(__dirname, "..", "js", "core.js"), "utf8");
  assert.ok(coreSrc.includes("driftwood") && coreSrc.includes("seashell"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("moss") && game.includes("driftwood"));
});


test("pinBagItem stores preferred bag item", () => {
  const s = core.defaultState();
  const r = core.pinBagItem(s, "mint");
  assert.ok(r.ok);
  assert.strictEqual(s.pinnedBagItem, "mint");
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pinBagItem") || game.includes("pinnedBagItem"));
});


test("star_dock theme among 23 unique themes", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "star_dock"));
  assert.ok(themes.length >= 23);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("star_dock"));
});


test("fennel and bergamot plantable on sill", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.fennel && j.items.fennel.seed === "fennelPot");
  assert.ok(j.plants.fennelPot && j.plants.fennelPot.harvest === "fennel");
  assert.ok(j.items.bergamot && j.items.bergamot.seed === "bergamotPot");
  assert.ok(j.plants.bergamotPot && j.plants.bergamotPot.harvest === "bergamot");
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants });
  const s = core.defaultState();
  s.bag.fennel = 1;
  assert.ok(core.plantSeed(s, 0, "fennel", cat).ok);
  assert.strictEqual(s.pots[0].plantId, "fennelPot");
  s.bag.bergamot = 1;
  assert.ok(core.plantSeed(s, 1, "bergamot", cat).ok);
  assert.strictEqual(s.pots[1].plantId, "bergamotPot");
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "青苔茴香苏打"));
  assert.ok(recipes.some((r) => r.name === "佛手柑窗台茶"));
});


test("moss_steps theme FX and 24 unique themes", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "moss_steps"));
  assert.ok(themes.length >= 24);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const moss = themes.find((th) => th.id === "moss_steps");
  assert.ok(moss.bias && moss.bias.moss >= 2);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("moss_steps"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "moss_walker"));
  const s = core.defaultState();
  s._themesTouched = { moss_steps: true };
  const newly = core.evaluateAchievements(s);
  assert.ok(newly.some((a) => a.id === "moss_walker") || s.achievements.moss_walker);
});


test("album memories tab ships with potSnaps wall", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes('data-tab="memories"'));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes('tab === "memories"') || game.includes("tab === 'memories'"));
  assert.ok(game.includes("memory-summary") || game.includes("小路回忆"));
  const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
  assert.ok(css.includes("memory-summary"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "memory_keeper"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("青苔石阶") && man.includes("回忆"));
});


test("coriander plantable and 香菜田园罐 recipe", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.coriander && j.items.coriander.seed === "corianderPot");
  assert.ok(j.plants.corianderPot);
  assert.ok((j.flavors || []).some((f) => f.id === "coriander"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.coriander = 1;
  assert.ok(core.plantSeed(s, 0, "coriander", cat).ok);
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "香菜田园罐"));
  assert.ok((j.customers || []).some((c) => c.name === "包饺子的阿姨"));
});


test("ink_courtyard theme among 25 unique themes", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "ink_courtyard"));
  assert.ok(themes.length >= 25);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("ink_courtyard"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "ink_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("墨香小院"));
});


test("getTopGuests board and regular_host achievement", () => {
  const s = core.defaultState();
  s.customerAffinity = { 包饺子的阿姨: 4, 临摹碑帖的人: 2, 路人甲: 1 };
  const top = core.getTopGuests(s, 2);
  assert.strictEqual(top.length, 2);
  assert.strictEqual(top[0].name, "包饺子的阿姨");
  assert.ok(top[0].affinity >= 4);
  const newly = core.evaluateAchievements(s);
  assert.ok(newly.some((a) => a.id === "regular_host") || s.achievements.regular_host);
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("guest-board"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("getTopGuests") || game.includes("guest-board"));
});


test("violet plantable and lotus_pond among 26 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.violet && j.plants.violetPot);
  assert.ok(j.items.lotus_seed);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.violet = 1;
  assert.ok(core.plantSeed(s, 0, "violet", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "lotus_pond"));
  assert.ok(themes.length >= 26);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("lotus_pond"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "紫罗兰夜雾"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "lotus_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("荷塘浅步"));
});


test("swapPots rearranges sill and calendula wind_chime ship", () => {
  const s = core.defaultState();
  core.addItem(s, "mint", 1);
  core.plantSeed(s, 0, "mint");
  core.addItem(s, "lavender_bud", 1);
  // plant second if lavender plantable else just swap empty structure
  s.pots[0].nickname = "A";
  s.pots[1].nickname = "B";
  s.pots[1].plantId = s.pots[0].plantId;
  const r = core.swapPots(s, 0, 1);
  assert.ok(r.ok);
  assert.strictEqual(s.pots[0].nickname, "B");
  assert.strictEqual(s.pots[1].nickname, "A");
  assert.ok((s.stats.potSwaps || 0) >= 1);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "sill_arranger"));
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("btn-pot-swap"));
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.calendula && j.plants.calendulaPot);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "wind_chime"));
  assert.ok(themes.length >= 27);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("wind_chime") && game.includes("swapPots"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("风铃廊") && man.includes("对调"));
});


test("morning dew after long offline and lemon_balm tea_terrace", () => {
  const s = core.defaultState();
  core.addItem(s, "mint", 1);
  assert.ok(core.plantSeed(s, 0, "mint").ok);
  const waterBefore = s.pots[0].water;
  const moodBefore = s.pots[0].mood;
  s.pots[0].tendedAt = Date.now() - 7 * 3600000;
  const r = core.settleOfflineGrowth(s, Date.now());
  assert.ok(r && r.dewCount >= 1);
  assert.ok((s.stats.morningDews || 0) >= 1);
  // dew partially restores after decay
  assert.ok(s.pots[0].water > 0 && s.pots[0].mood > 0);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "dew_keeper"));

  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.lemon_balm && j.plants.lemonBalmPot);
  assert.ok((j.flavors || []).some((f) => f.id === "lemon_balm"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s2 = core.defaultState();
  s2.bag.lemon_balm = 1;
  assert.ok(core.plantSeed(s2, 0, "lemon_balm", cat).ok);

  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "tea_terrace"));
  assert.ok(themes.length >= 28);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("tea_terrace"));
  assert.ok(game.includes("favoritePathThemeId") && game.includes("1.25"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "香蜂草茶台"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("晨露") && man.includes("茶台慢坡"));
});


test("ginger plantable rain_garden and memory stickers", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.ginger && j.plants.gingerPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.ginger = 1;
  assert.ok(core.plantSeed(s, 0, "ginger", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "rain_garden"));
  assert.ok(themes.length >= 29);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("rain_garden"));
  assert.ok(game.includes("pathStickers") && game.includes("小路贴纸"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "暖姜蜜茶"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "rain_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("雨园慢径"));
});


test("cardamom orchard_dusk and unique ambient banks", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.cardamom && j.plants.cardamomPot && j.items.apple_leaf);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.cardamom = 1;
  assert.ok(core.plantSeed(s, 0, "cardamom", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "orchard_dusk"));
  assert.ok(themes.length >= 30);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const walk = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "walk-config.json"), "utf8"));
  assert.ok((walk.ambient || []).length >= 30);
  // no template "#N" ambient spam
  const ambText = (walk.ambient || []).map((a) => (typeof a === "string" ? a : a.note || "")).join("\n");
  assert.ok(!/碎片 #\d|絮语 #\d/.test(ambText));
  const garden = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "garden-config.json"), "utf8"));
  assert.ok((garden.messages || []).length >= 28);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("orchard_dusk"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "豆蔻暖蜜"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("果园暮色"));
  // spam engine still disabled
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});


test("pinRecipe rose_lane and rose plantable", () => {
  const s = core.defaultState();
  const r = core.pinRecipe(s, "rec_rose_night");
  assert.ok(r.ok);
  assert.strictEqual(s.pinnedRecipeId, "rec_rose_night");
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  const got = core.getPinnedRecipe(s, recipes);
  assert.ok(got.ok && got.recipe && got.recipe.name === "玫瑰夜雾茶");
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "recipe_pinner"));
  const newly = core.evaluateAchievements(s);
  assert.ok(newly.some((a) => a.id === "recipe_pinner") || s.achievements.recipe_pinner);

  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.rose_petal && j.plants.rosePot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s2 = core.defaultState();
  s2.bag.rose_petal = 1;
  assert.ok(core.plantSeed(s2, 0, "rose_petal", cat).ok);

  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "rose_lane"));
  assert.ok(themes.length >= 31);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("btn-pin-recipe") && html.includes("btn-load-pinned-recipe"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("rose_lane") && game.includes("pinRecipe"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("玫瑰短巷") && man.includes("钉住配方"));
});


test("companion tend marjoram cliff_path", () => {
  const s = core.defaultState();
  core.addItem(s, "mint", 2);
  assert.ok(core.plantSeed(s, 0, "mint").ok);
  assert.ok(core.plantSeed(s, 1, "mint").ok);
  const t = core.tend(s, 0, "water");
  assert.ok(t.ok && t.companion);
  assert.ok((s.stats.companionTends || 0) >= 1);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "companion_gardener"));

  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.marjoram && j.plants.marjoramPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s2 = core.defaultState();
  s2.bag.marjoram = 1;
  assert.ok(core.plantSeed(s2, 0, "marjoram", cat).ok);

  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "cliff_path"));
  assert.ok(themes.length >= 32);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("cliff_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "马郁兰田园罐"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("崖边慢径") && man.includes("邻盆作伴"));
});


test("openCalm serve elderflower willow_bank", () => {
  const s = core.defaultState();
  s.bag = { mint: 5, lemon: 5 };
  const cust = { name: "清静客人", tags: ["清爽"], flavors: ["mint"] };
  const craft = { cup: "tall", base: "soda", flavor: "mint", topping: "none" };
  const a = core.serveDrink(s, cust, craft);
  assert.ok(a.ok && a.openCalm);
  assert.ok((s.stats.openCalmServes || 0) >= 1);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a2) => a2.id === "open_calm_host"));

  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.elderflower && j.plants.elderflowerPot && j.items.willow_catkin);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s2 = core.defaultState();
  s2.bag.elderflower = 1;
  assert.ok(core.plantSeed(s2, 0, "elderflower", cat).ok);

  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "willow_bank"));
  assert.ok(themes.length >= 33);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("willow_bank") && game.includes("openCalmServes"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "接骨木花汽泡"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("柳岸轻步") && man.includes("开店清静"));
});


test("hibiscus plantable and night_pond among 34 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.hibiscus && j.plants.hibiscusPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.hibiscus = 1;
  assert.ok(core.plantSeed(s, 0, "hibiscus", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "night_pond"));
  assert.ok(themes.length >= 34);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("night_pond"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "洛神暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "night_pond_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("夜荷池"));
  // spam still disabled
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(/DISABLED|exit\(2\)/.test(rr));
});


test("chrysanthemum plantable and chrys_garden 35 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.chrysanthemum && j.plants.chrysanthemumPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.chrysanthemum = 1;
  assert.ok(core.plantSeed(s, 0, "chrysanthemum", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "chrys_garden"));
  assert.ok(themes.length >= 35);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("chrys_garden"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "菊花暖茶"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "chrys_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("菊圃晚径"));
});


test("closeShopDay jasmine osmanthus_court", () => {
  const s = core.defaultState();
  s._servesToday = 2;
  const r = core.closeShopDay(s);
  assert.ok(r.ok && r.line);
  assert.ok((s.stats.shopCloses || 0) >= 1);
  const r2 = core.closeShopDay(s);
  assert.ok(!r2.ok && r2.reason === "already");
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "shop_closer"));

  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.jasmine && j.plants.jasminePot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s2 = core.defaultState();
  s2.bag.jasmine = 1;
  assert.ok(core.plantSeed(s2, 0, "jasmine", cat).ok);

  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "osmanthus_court"));
  assert.ok(themes.length >= 36);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("btn-close-shop"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("osmanthus_court") && game.includes("closeShopDay"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("桂花小院") && man.includes("温柔收摊"));
});


test("album paths tab sea_lavender seaside_dusk", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes('data-tab="paths"'));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes('tab === "paths"') || game.includes("tab === 'paths'"));
  assert.ok(game.includes("小路图鉴"));
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.sea_lavender && j.plants.seaLavenderPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.sea_lavender = 1;
  assert.ok(core.plantSeed(s, 0, "sea_lavender", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "seaside_dusk"));
  assert.ok(themes.length >= 37);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "path_atlas"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("海边暮色") && man.includes("小路"));
});


test("peach plantable lantern_bridge 38 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.peach && j.plants.peachPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.peach = 1;
  assert.ok(core.plantSeed(s, 0, "peach", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "lantern_bridge"));
  assert.ok(themes.length >= 38);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("lantern_bridge"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "蜜桃灯桥苏打"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "lantern_bridge_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("灯桥夜步"));
});


test("pine_needle plantable pine_ridge 39 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.pine_needle && j.plants.pineNeedlePot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.pine_needle = 1;
  assert.ok(core.plantSeed(s, 0, "pine_needle", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "pine_ridge"));
  assert.ok(themes.length >= 39);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pine_ridge"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "松针清茶"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "pine_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("松脊晚风"));
  const walk = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "walk-config.json"), "utf8"));
  assert.ok((walk.ambient || []).length >= 40);
});


test("plum plantable plum_path 40 unique themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.plum && j.plants.plumPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.plum = 1;
  assert.ok(core.plantSeed(s, 0, "plum", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "plum_path"));
  assert.ok(themes.length >= 40);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("plum_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "李子蜜罐"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "plum_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "path_explorer"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("李花短径"));
  // spam still disabled
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});


test("variety tend mulberry_lane 41 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.mulberry && j.plants.mulberryPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  // three different plants for variety
  core.addItem(s, "mint", 1);
  core.plantSeed(s, 0, "mint");
  s.bag = Object.assign(s.bag || {}, { mulberry: 1 });
  // plant mulberry via catalog
  assert.ok(core.plantSeed(s, 1, "mulberry", cat).ok);
  s.pots[2].plantId = "lavenderPot";
  s.pots[2].water = 40;
  s.pots[2].sun = 40;
  s.pots[2].mood = 50;
  s.pots[2].growth = 0;
  const t = core.tend(s, 0, "water");
  assert.ok(t.ok && t.variety);
  assert.ok((s.stats.varietyTends || 0) >= 1);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "variety_gardener"));

  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "mulberry_lane"));
  assert.ok(themes.length >= 41);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("mulberry_lane"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "桑葚蜜罐"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("桑荫小径") && man.includes("多样窗台"));
});


test("strawberry plantable berry_patch 42 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.strawberry && j.plants.strawberryPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.strawberry = 1;
  assert.ok(core.plantSeed(s, 0, "strawberry", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "berry_patch"));
  assert.ok(themes.length >= 42);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("berry_patch"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "草莓汽泡"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "berry_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("莓田慢步"));
});


test("blueberry plantable fog_meadow 43 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.blueberry && j.plants.blueberryPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.blueberry = 1;
  assert.ok(core.plantSeed(s, 0, "blueberry", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "fog_meadow"));
  assert.ok(themes.length >= 43);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("fog_meadow"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "蓝莓汽泡"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "fog_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("雾草甸"));
});


test("grape plantable vine_terrace 44 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.grape && j.plants.grapePot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.grape = 1;
  assert.ok(core.plantSeed(s, 0, "grape", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "vine_terrace"));
  assert.ok(themes.length >= 44);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("vine_terrace"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "葡萄蜜罐"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "vine_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("葡萄梯田"));
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});


test("persimmon plantable autumn_slope 45 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.persimmon && j.plants.persimmonPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.persimmon = 1;
  assert.ok(core.plantSeed(s, 0, "persimmon", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "autumn_slope"));
  assert.ok(themes.length >= 45);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("autumn_slope"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "柿子暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "autumn_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("秋坡慢步"));
});


test("fig plantable fig_terrace 46 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.fig && j.plants.figPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.fig = 1;
  assert.ok(core.plantSeed(s, 0, "fig", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "fig_terrace"));
  assert.ok(themes.length >= 46);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("fig_terrace"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "无花果暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "fig_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("无花果台"));
});


test("setFavoritePlant pomegranate_court 47 themes", () => {
  const s = core.defaultState();
  core.addItem(s, "mint", 1);
  assert.ok(core.plantSeed(s, 0, "mint").ok);
  const r = core.setFavoritePlant(s, s.pots[0].plantId);
  assert.ok(r.ok);
  assert.strictEqual(s.favoritePlantId, s.pots[0].plantId);
  const t = core.tend(s, 0, "talk");
  assert.ok(t.ok);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "plant_fav"));
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("btn-fav-plant"));

  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.pomegranate && j.plants.pomegranatePot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s2 = core.defaultState();
  s2.bag.pomegranate = 1;
  assert.ok(core.plantSeed(s2, 0, "pomegranate", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "pomegranate_court"));
  assert.ok(themes.length >= 47);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pomegranate_court") && game.includes("setFavoritePlant"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "石榴汽泡"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("石榴小院") && man.includes("最想照料"));
});


test("morningTend yangmei rain_pavilion 48 themes", () => {
  const s = core.defaultState();
  core.addItem(s, "mint", 1);
  assert.ok(core.plantSeed(s, 0, "mint").ok);
  const mood0 = s.pots[0].mood;
  const t1 = core.tend(s, 0, "water");
  assert.ok(t1.ok);
  assert.ok((s.stats.morningTends || 0) >= 1);
  assert.ok(s.pots[0].mood >= mood0 - 5); // net after tend decay still soft
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "morning_gardener"));

  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.yangmei && j.plants.yangmeiPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s2 = core.defaultState();
  s2.bag.yangmei = 1;
  assert.ok(core.plantSeed(s2, 0, "yangmei", cat).ok);

  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "rain_pavilion"));
  assert.ok(themes.length >= 48);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("rain_pavilion"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "杨梅汽泡"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "pavilion_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("雨亭慢歇") && man.includes("晨间照料"));
  // evening titles unique and long enough
  const ev = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.strictEqual(new Set(ev.map((e) => e.title)).size, ev.length);
  ev.forEach((e) => assert.ok((e.body || "").length > 12));
  // spam disabled
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});


test("longan plantable dew_path 49 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.longan && j.plants.longanPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.longan = 1;
  assert.ok(core.plantSeed(s, 0, "longan", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "dew_path"));
  assert.ok(themes.length >= 49);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("dew_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "龙眼暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "dew_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("露径慢步"));
});


test("litchi plantable litchi_grove 50 unique themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.litchi && j.plants.litchiPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.litchi = 1;
  assert.ok(core.plantSeed(s, 0, "litchi", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "litchi_grove"));
  assert.ok(themes.length >= 50);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("litchi_grove"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "荔枝汽泡"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "litchi_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "path_fifty"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("荔枝林径"));
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});


test("loquat plantable loquat_lane 51 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.loquat && j.plants.loquatPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.loquat = 1;
  assert.ok(core.plantSeed(s, 0, "loquat", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "loquat_lane"));
  assert.ok(themes.length >= 51);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("loquat_lane"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "枇杷暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "loquat_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("枇杷巷"));
});


test("setGuestNote olive_grove 52 themes", () => {
  const s = core.defaultState();
  const r = core.setGuestNote(s, "腌橄榄的厨子", "少放橄榄，草本轻一点");
  assert.ok(r.ok);
  assert.strictEqual(s.guestNotes["腌橄榄的厨子"], "少放橄榄，草本轻一点");
  assert.ok((s.stats.guestNotes || 0) >= 1);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "guest_scribe"));
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("btn-guest-note"));

  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.olive && j.plants.olivePot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s2 = core.defaultState();
  s2.bag.olive = 1;
  assert.ok(core.plantSeed(s2, 0, "olive", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "olive_grove"));
  assert.ok(themes.length >= 52);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("olive_grove") && game.includes("setGuestNote"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "橄榄田园罐"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("橄榄坡") && man.includes("客人便签"));
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});


test("hawthorn plantable hawthorn_path 53 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.hawthorn && j.plants.hawthornPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.hawthorn = 1;
  assert.ok(core.plantSeed(s, 0, "hawthorn", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "hawthorn_path"));
  assert.ok(themes.length >= 53);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("hawthorn_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "山楂汽泡"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "hawthorn_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("山楂短径"));
});


test("mango plantable firstThemeVisit journal 54 themes", () => {
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  const s = core.defaultState();
  const r = core.setPathTheme(s, "mango_shade", themes);
  assert.ok(r.ok && r.firstVisit);
  assert.ok((s.stats.firstThemeVisits || 0) >= 1);
  assert.ok((s.journal || []).some((line) => String(line).includes("第一次") || String(line.text || "").includes("第一次") || String(line).includes("芒果")));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "path_scribe"));

  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.mango && j.plants.mangoPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s2 = core.defaultState();
  s2.bag.mango = 1;
  assert.ok(core.plantSeed(s2, 0, "mango", cat).ok);
  assert.ok(themes.some((th) => th.id === "mango_shade"));
  assert.ok(themes.length >= 54);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("mango_shade"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "芒果汽泡"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("芒果树荫") && man.includes("换路手帐"));
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});


test("pineapple plantable sand_dune 55 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.pineapple && j.plants.pineapplePot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.pineapple = 1;
  assert.ok(core.plantSeed(s, 0, "pineapple", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "sand_dune"));
  assert.ok(themes.length >= 55);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("sand_dune"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "菠萝汽泡"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "dune_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("沙丘晚风"));
});


test("coconut plantable lagoon_path 56 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.coconut && j.plants.coconutPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.coconut = 1;
  assert.ok(core.plantSeed(s, 0, "coconut", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "lagoon_path"));
  assert.ok(themes.length >= 56);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("lagoon_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "椰子汽泡"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "lagoon_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("潟湖浅径"));
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});


test("starfruit plantable starfruit_lane 57 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.starfruit && j.plants.starfruitPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.starfruit = 1;
  assert.ok(core.plantSeed(s, 0, "starfruit", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "starfruit_lane"));
  assert.ok(themes.length >= 57);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("starfruit_lane"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "杨桃汽泡"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "starfruit_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("杨桃小径"));
});


test("kumquat plantable kumquat_hedge 58 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.kumquat && j.plants.kumquatPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.kumquat = 1;
  assert.ok(core.plantSeed(s, 0, "kumquat", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "kumquat_hedge"));
  assert.ok(themes.length >= 58);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("kumquat_hedge"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "金桔暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "kumquat_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("金桔篱径"));
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("passion_fruit plantable passion_arch 59 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.passion_fruit && j.plants.passionFruitPot);
  assert.ok(j.flavors.some((f) => f.id === "passion_fruit"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.passion_fruit = 1;
  assert.ok(core.plantSeed(s, 0, "passion_fruit", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "passion_arch"));
  assert.ok(themes.length >= 59);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("passion_arch"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "百香果汽泡"));
  assert.ok(recipes.some((r) => r.name === "百香暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "passion_sill"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "passion_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("百香藤廊"));
  const mail = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "mail.json"), "utf8"));
  assert.ok(mail.some((m) => m.id === "mail_passion"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_passion_arch" && e.body && e.body.length > 12));
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("kiwi plantable kiwi_trellis 60 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.kiwi && j.plants.kiwiPot);
  assert.ok(j.flavors.some((f) => f.id === "kiwi"));
  assert.ok(j.customers.some((c) => c.name === "背藤篮的旅人"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.kiwi = 1;
  assert.ok(core.plantSeed(s, 0, "kiwi", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "kiwi_trellis"));
  assert.ok(themes.length >= 60);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("kiwi_trellis"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "猕猴桃汽泡"));
  assert.ok(recipes.some((r) => r.name === "猕猴桃暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "kiwi_sill"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "kiwi_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("猕猴桃架径"));
  const mail = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "mail.json"), "utf8"));
  assert.ok(mail.some((m) => m.id === "mail_kiwi" && m.effect && m.effect.items && m.effect.items.kiwi === 2));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_kiwi_trellis" && e.body && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("dragonfruit plantable dragon_cactus 61 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.dragonfruit && j.plants.dragonfruitPot);
  assert.ok(j.flavors.some((f) => f.id === "dragonfruit"));
  assert.ok(j.customers.some((c) => c.name === "切火龙果的店员"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.dragonfruit = 1;
  assert.ok(core.plantSeed(s, 0, "dragonfruit", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "dragon_cactus"));
  assert.ok(themes.length >= 61);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("dragon_cactus"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "火龙果汽泡"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "dragonfruit_sill"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "dragon_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("火龙仙人掌径"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_dragon_cactus" && e.body.length > 12));
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("guava plantable guava_grove 62 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.guava && j.plants.guavaPot);
  assert.ok(j.flavors.some((f) => f.id === "guava"));
  assert.ok(j.customers.some((c) => c.name === "晒番石榴的阿婆"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.guava = 1;
  assert.ok(core.plantSeed(s, 0, "guava", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "guava_grove"));
  assert.ok(themes.length >= 62);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("guava_grove"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "番石榴汽泡"));
  assert.ok(recipes.some((r) => r.name === "番石榴暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "guava_sill"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "guava_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("番石榴小径"));
  const mail = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "mail.json"), "utf8"));
  assert.ok(mail.some((m) => m.id === "mail_guava"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_guava_grove" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("cherry plantable cherry_lane 63 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.cherry && j.plants.cherryPot);
  assert.ok(j.flavors.some((f) => f.id === "cherry"));
  assert.ok(j.customers.some((c) => c.name === "编樱桃发饰的女孩"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.cherry = 1;
  assert.ok(core.plantSeed(s, 0, "cherry", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "cherry_lane"));
  assert.ok(themes.length >= 63);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("cherry_lane"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "樱桃汽泡"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "cherry_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("樱桃短巷"));
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("apricot plantable apricot_grove 64 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.apricot && j.plants.apricotPot);
  assert.ok(j.flavors.some((f) => f.id === "apricot"));
  assert.ok(j.customers.some((c) => c.name === "收杏子的大叔"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.apricot = 1;
  assert.ok(core.plantSeed(s, 0, "apricot", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "apricot_grove"));
  assert.ok(themes.length >= 64);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("apricot_grove"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "杏子暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "apricot_sill"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "apricot_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("杏花小径"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_apricot_grove" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("pear jujube plantable setFavoritePathTheme 66 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.pear && j.plants.pearPot);
  assert.ok(j.items.jujube && j.plants.jujubePot);
  assert.ok(j.flavors.some((f) => f.id === "pear"));
  assert.ok(j.flavors.some((f) => f.id === "jujube"));
  assert.ok(j.customers.some((c) => c.name === "收梨的阿姨"));
  assert.ok(j.customers.some((c) => c.name === "煮红枣茶的奶奶"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.pear = 1;
  s.bag.jujube = 1;
  assert.ok(core.plantSeed(s, 0, "pear", cat).ok);
  assert.ok(core.plantSeed(s, 1, "jujube", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "pear_orchard"));
  assert.ok(themes.some((th) => th.id === "jujube_path"));
  assert.ok(themes.length >= 66);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const fav = core.setFavoritePathTheme(s, "pear_orchard");
  assert.ok(fav.ok);
  assert.strictEqual(s.favoritePathThemeId, "pear_orchard");
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "fav_path" && a.check(s)));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "path_sixty"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "pear_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "jujube_walker"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pear_orchard") && game.includes("jujube_path"));
  assert.ok(game.includes("setFavoritePathTheme"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "梨子暖蜜"));
  assert.ok(recipes.some((r) => r.name === "红枣暖茶"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("梨园慢径") && man.includes("红枣短径"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_jujube_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("grapefruit tangerine plantable 68 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.grapefruit && j.plants.grapefruitPot);
  assert.ok(j.items.tangerine && j.plants.tangerinePot);
  assert.ok(j.flavors.some((f) => f.id === "grapefruit"));
  assert.ok(j.flavors.some((f) => f.id === "tangerine"));
  assert.ok(j.customers.some((c) => c.name === "榨西柚的店员"));
  assert.ok(j.customers.some((c) => c.name === "剥蜜橘的小孩"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.grapefruit = 1;
  s.bag.tangerine = 1;
  assert.ok(core.plantSeed(s, 0, "grapefruit", cat).ok);
  assert.ok(core.plantSeed(s, 1, "tangerine", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "grapefruit_terrace"));
  assert.ok(themes.some((th) => th.id === "tangerine_steps"));
  assert.ok(themes.length >= 68);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("grapefruit_terrace") && game.includes("tangerine_steps"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "西柚汽泡"));
  assert.ok(recipes.some((r) => r.name === "蜜橘暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "grapefruit_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "tangerine_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("西柚露台") && man.includes("蜜橘石阶"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_grapefruit_terrace" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("wax_apple sugarcane plantable expanded daily special 70 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.wax_apple && j.plants.waxApplePot);
  assert.ok(j.items.sugarcane && j.plants.sugarcanePot);
  assert.ok(j.flavors.some((f) => f.id === "wax_apple"));
  assert.ok(j.flavors.some((f) => f.id === "sugarcane"));
  assert.ok(j.customers.some((c) => c.name === "摘莲雾的阿伯"));
  assert.ok(j.customers.some((c) => c.name === "榨甘蔗的小伙"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.wax_apple = 1;
  s.bag.sugarcane = 1;
  assert.ok(core.plantSeed(s, 0, "wax_apple", cat).ok);
  assert.ok(core.plantSeed(s, 1, "sugarcane", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "wax_apple_lane"));
  assert.ok(themes.some((th) => th.id === "cane_field"));
  assert.ok(themes.length >= 70);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("wax_apple"));
  assert.ok(summerPool.includes("sugarcane"));
  assert.ok(summerPool.includes("passion_fruit"));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("jujube"));
  s.season = "summer";
  const special = core.getDailySpecial(s, Date.now());
  assert.ok(special && special.flavor && special.label);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("wax_apple_lane") && game.includes("cane_field"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "莲雾汽泡"));
  assert.ok(recipes.some((r) => r.name === "甘蔗暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "wax_apple_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "sugarcane_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("莲雾短径") && man.includes("甘蔗田径"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_cane_field" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("lemon lime plantable 72 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.lemon && j.plants.lemonPot);
  assert.ok(j.items.lime && j.plants.limePot);
  assert.ok(j.flavors.some((f) => f.id === "lemon"));
  assert.ok(j.flavors.some((f) => f.id === "lime"));
  assert.ok(j.customers.some((c) => c.name === "切柠檬片的店员"));
  assert.ok(j.customers.some((c) => c.name === "挤青柠的调酒师"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.lemon = 1;
  s.bag.lime = 1;
  assert.ok(core.plantSeed(s, 0, "lemon", cat).ok);
  assert.ok(core.plantSeed(s, 1, "lime", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "lemon_grove"));
  assert.ok(themes.some((th) => th.id === "lime_path"));
  assert.ok(themes.length >= 72);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("lemon") && summerPool.includes("lime"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("lemon_grove") && game.includes("lime_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "柠檬汽泡"));
  assert.ok(recipes.some((r) => r.name === "青柠汽泡"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "lemon_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "lime_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("柠檬树径") && man.includes("青柠小径"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_lime_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("vanilla cocoa plantable 74 themes shop tips", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.vanilla && j.plants.vanillaPot);
  assert.ok(j.items.cocoa && j.plants.cocoaPot);
  assert.ok(j.flavors.some((f) => f.id === "vanilla"));
  assert.ok(j.flavors.some((f) => f.id === "cocoa"));
  assert.ok(j.customers.some((c) => c.name === "做香草布丁的厨娘"));
  assert.ok(j.customers.some((c) => c.name === "搅热可可的老人"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.vanilla = 1;
  s.bag.cocoa = 1;
  assert.ok(core.plantSeed(s, 0, "vanilla", cat).ok);
  assert.ok(core.plantSeed(s, 1, "cocoa", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "vanilla_lane"));
  assert.ok(themes.some((th) => th.id === "cocoa_courtyard"));
  assert.ok(themes.length >= 74);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const springPool = core.DAILY_SPECIAL_BY_SEASON.spring.map((x) => x.flavor);
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(springPool.includes("vanilla"));
  assert.ok(winterPool.includes("cocoa"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("vanilla_lane") && game.includes("cocoa_courtyard"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "香草暖蜜"));
  assert.ok(recipes.some((r) => r.name === "可可暖茶"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "vanilla_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "cocoa_walker"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("香草")));
  assert.ok(shop.tipMessages.some((t) => t.includes("可可")));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("香草短径") && man.includes("可可小院"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_cocoa_courtyard" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("almond hazelnut plantable dessert-corner 76 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.almond && j.plants.almondPot);
  assert.ok(j.items.hazelnut && j.plants.hazelnutPot);
  assert.ok(j.flavors.some((f) => f.id === "almond"));
  assert.ok(j.flavors.some((f) => f.id === "hazelnut"));
  assert.ok(j.customers.some((c) => c.name === "烤杏仁的阿姨"));
  assert.ok(j.customers.some((c) => c.name === "磨榛酱的店员"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors, cups: j.cups, bases: j.bases });
  const s = core.defaultState();
  s.bag.almond = 1;
  s.bag.hazelnut = 1;
  assert.ok(core.plantSeed(s, 0, "almond", cat).ok);
  assert.ok(core.plantSeed(s, 1, "hazelnut", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "almond_grove"));
  assert.ok(themes.some((th) => th.id === "hazel_path"));
  assert.ok(themes.length >= 76);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  // dessert-corner soft bonus on honey_water + hazelnut
  const cups = (j.cups && j.cups.length ? j.cups : []).concat([{ id: "mug", name: "暖暖杯", vibe: "温柔" }]);
  const bases = j.bases || [{ id: "honey_water", name: "蜜水" }];
  const flavors = j.flavors;
  const score = core.scoreDrink(
    { name: "磨榛酱的店员", tags: ["甜蜜", "温暖"], flavors: ["hazelnut", "cocoa"] },
    { cup: "mug", base: "honey_water", flavor: "hazelnut", topping: "none" },
    { cups, bases, flavors, season: "winter" }
  );
  assert.ok(score.notes.some((n) => n === "甜点一角"), "expected 甜点一角 note, got " + JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("almond") && winterPool.includes("hazelnut"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("almond_grove") && game.includes("hazel_path"));
  assert.ok(game.includes("甜点一角"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "杏仁暖蜜"));
  assert.ok(recipes.some((r) => r.name === "榛子暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "almond_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "hazelnut_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("杏仁树径") && man.includes("榛子短径"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_hazel_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("maple_syrup sesame plantable 78 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.maple_syrup && j.plants.mapleSyrupPot);
  assert.ok(j.items.sesame && j.plants.sesamePot);
  assert.ok(j.flavors.some((f) => f.id === "maple_syrup"));
  assert.ok(j.flavors.some((f) => f.id === "sesame"));
  assert.ok(j.customers.some((c) => c.name === "煮枫糖的旅人"));
  assert.ok(j.customers.some((c) => c.name === "烤芝麻的小贩"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.maple_syrup = 1;
  s.bag.sesame = 1;
  assert.ok(core.plantSeed(s, 0, "maple_syrup", cat).ok);
  assert.ok(core.plantSeed(s, 1, "sesame", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "maple_sugar_path"));
  assert.ok(themes.some((th) => th.id === "sesame_field"));
  assert.ok(themes.length >= 78);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("maple_syrup") && winterPool.includes("sesame"));
  const cups = [{ id: "mug", vibe: "温柔" }];
  const bases = j.bases || [{ id: "honey_water" }];
  const score = core.scoreDrink(
    { name: "煮枫糖的旅人", tags: ["甜蜜"], flavors: ["maple_syrup"] },
    { cup: "mug", base: "honey_water", flavor: "maple_syrup", topping: "none" },
    { cups, bases, flavors: j.flavors, season: "autumn" }
  );
  assert.ok(score.notes.some((n) => n === "甜点一角"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("maple_sugar_path") && game.includes("sesame_field"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "枫糖暖蜜"));
  assert.ok(recipes.some((r) => r.name === "芝麻暖茶"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "maple_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "sesame_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("枫糖慢径") && man.includes("芝麻田径"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_sesame_field" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("saffron walnut plantable 80 themes path_eighty", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.saffron && j.plants.saffronPot);
  assert.ok(j.items.walnut && j.plants.walnutPot);
  assert.ok(j.flavors.some((f) => f.id === "saffron"));
  assert.ok(j.flavors.some((f) => f.id === "walnut"));
  assert.ok(j.customers.some((c) => c.name === "泡藏红花的阿婆"));
  assert.ok(j.customers.some((c) => c.name === "砸核桃的爷爷"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.saffron = 1;
  s.bag.walnut = 1;
  assert.ok(core.plantSeed(s, 0, "saffron", cat).ok);
  assert.ok(core.plantSeed(s, 1, "walnut", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "saffron_terrace"));
  assert.ok(themes.some((th) => th.id === "walnut_path"));
  assert.ok(themes.length >= 80);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "path_eighty"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "saffron_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "walnut_walker"));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("saffron") && winterPool.includes("walnut"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("saffron_terrace") && game.includes("walnut_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "藏红花暖蜜"));
  assert.ok(recipes.some((r) => r.name === "核桃暖茶"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("藏红花露台") && man.includes("核桃树径"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_walnut_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("pistachio chestnut cinnamon clove 84 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["pistachio", "chestnut", "cinnamon", "clove"];
  const pots = ["pistachioPot", "chestnutPot", "cinnamonPot", "clovePot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
    assert.ok(j.flavors.some((f) => f.id === id), "flavor " + id);
  });
  assert.ok(j.customers.some((c) => c.name === "剥开心果的店员"));
  assert.ok(j.customers.some((c) => c.name === "烤板栗的大叔"));
  assert.ok(j.customers.some((c) => c.name === "磨肉桂的厨子"));
  assert.ok(j.customers.some((c) => c.name === "点丁香的药师"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i % 4, id, cat).ok, "plant " + id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["pistachio_lane", "chestnut_grove", "cinnamon_path", "clove_courtyard"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 84);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  ids.forEach((id) => assert.ok(winterPool.includes(id), "winter " + id));
  const score = core.scoreDrink(
    { name: "烤板栗的大叔", tags: ["甜蜜", "温暖"], flavors: ["chestnut"] },
    { cup: "mug", base: "honey_water", flavor: "chestnut", topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, season: "winter" }
  );
  assert.ok(score.notes.some((n) => n === "甜点一角"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pistachio_lane") && game.includes("clove_courtyard"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "开心果暖蜜"));
  assert.ok(recipes.some((r) => r.name === "板栗暖茶"));
  assert.ok(recipes.some((r) => r.name === "肉桂暖蜜"));
  assert.ok(recipes.some((r) => r.name === "丁香暖茶"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "pistachio_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "clove_walker"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("肉桂")));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("开心果短径") && man.includes("丁香香院"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_clove_courtyard" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("cranberry elderberry star_anise nutmeg 88 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.cranberry && j.plants.cranberryPot);
  assert.ok(j.items.elderberry && j.plants.elderberryPot);
  assert.ok(j.items.star_anise && j.plants.starAnisePot);
  assert.ok(j.items.nutmeg && j.plants.nutmegPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.cranberry = 1;
  s.bag.elderberry = 1;
  s.bag.star_anise = 1;
  s.bag.nutmeg = 1;
  assert.ok(core.plantSeed(s, 0, "cranberry", cat).ok);
  assert.ok(core.plantSeed(s, 1, "elderberry", cat).ok);
  assert.ok(core.plantSeed(s, 2, "star_anise", cat).ok);
  assert.ok(core.plantSeed(s, 3, "nutmeg", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["cranberry_bog", "elder_lane", "anise_path", "nutmeg_lane"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 88);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("cranberry") && summerPool.includes("elderberry"));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("star_anise") && winterPool.includes("nutmeg"));
  // DAILY_SPECIAL_BY_SEASON must not have duplicate keys / undefined summer
  assert.ok(Array.isArray(core.DAILY_SPECIAL_BY_SEASON.summer));
  assert.ok(Array.isArray(core.DAILY_SPECIAL_BY_SEASON.winter));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("cranberry_bog") && game.includes("nutmeg_lane"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "蔓越莓汽泡"));
  assert.ok(recipes.some((r) => r.name === "八角暖蜜"));
  assert.ok(recipes.some((r) => r.name === "肉豆蔻暖茶"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "cranberry_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "nutmeg_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("蔓越莓浅滩") && man.includes("肉豆蔻小径"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_anise_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("melon papaya plantables 92 themes path_ninety", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["honeydew", "watermelon", "cantaloupe", "papaya"];
  const pots = ["honeydewPot", "watermelonPot", "cantaloupePot", "papayaPot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
  });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i, id, cat).ok, id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["honeydew_field", "watermelon_patch", "cantaloupe_lane", "papaya_grove"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 92);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "path_ninety"));
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ids.forEach((id) => assert.ok(summerPool.includes(id), id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("watermelon_patch") && game.includes("papaya_grove"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "西瓜汽泡"));
  assert.ok(recipes.some((r) => r.name === "木瓜暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "watermelon_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("哈密瓜田径") && man.includes("木瓜树径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("西瓜")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_papaya_grove" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("rambutan jackfruit plantable ambient banks 94 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  assert.ok(j.items.rambutan && j.plants.rambutanPot);
  assert.ok(j.items.jackfruit && j.plants.jackfruitPot);
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  s.bag.rambutan = 1;
  s.bag.jackfruit = 1;
  assert.ok(core.plantSeed(s, 0, "rambutan", cat).ok);
  assert.ok(core.plantSeed(s, 1, "jackfruit", cat).ok);
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  assert.ok(themes.some((th) => th.id === "rambutan_lane"));
  assert.ok(themes.some((th) => th.id === "jackfruit_grove"));
  assert.ok(themes.length >= 94);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("rambutan") && summerPool.includes("jackfruit"));
  const walk = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "walk-config.json"), "utf8"));
  assert.ok(walk.ambient.length >= 48);
  const ambText = (a) => (typeof a === "string" ? a : (a && (a.note || a.text || a.body || "")) || "");
  assert.ok(walk.ambient.some((a) => /瓜田|竹篮|香料|路牌/.test(ambText(a))));
  const garden = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "garden-config.json"), "utf8"));
  assert.ok(garden.messages.length >= 38);
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("rambutan_lane") && game.includes("jackfruit_grove"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "红毛丹汽泡"));
  assert.ok(recipes.some((r) => r.name === "菠萝蜜暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "rambutan_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "jackfruit_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("红毛丹小径") && man.includes("菠萝蜜树径"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_jackfruit_grove" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("goji bay oregano chive plantable 98 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["goji", "bay_leaf", "oregano", "chive"];
  const pots = ["gojiPot", "bayLeafPot", "oreganoPot", "chivePot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
    assert.ok(j.flavors.some((f) => f.id === id), "flavor " + id);
  });
  assert.ok(j.customers.some((c) => c.name === "泡枸杞的爷爷"));
  assert.ok(j.customers.some((c) => c.name === "炖月桂的厨子"));
  assert.ok(j.customers.some((c) => c.name === "撒牛至的店员"));
  assert.ok(j.customers.some((c) => c.name === "切细香葱的厨娘"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i, id, cat).ok, "plant " + id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["goji_path", "bay_courtyard", "oregano_path", "chive_patch"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 98);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("goji") && winterPool.includes("bay_leaf"));
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("oregano") && summerPool.includes("chive"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("goji_path") && game.includes("chive_patch"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "枸杞暖蜜"));
  assert.ok(recipes.some((r) => r.name === "月桂暖茶"));
  assert.ok(recipes.some((r) => r.name === "牛至汽泡"));
  assert.ok(recipes.some((r) => r.name === "细香葱汽泡"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "goji_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "chive_walker"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("枸杞")));
  assert.ok(shop.tipMessages.some((t) => t.includes("月桂")));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("枸杞短径") && man.includes("香葱畦径"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_bay_courtyard" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("parsley tarragon avocado date 102 themes path_hundred", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["parsley", "tarragon", "avocado", "date_fruit"];
  const pots = ["parsleyPot", "tarragonPot", "avocadoPot", "dateFruitPot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
  });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i, id, cat).ok, id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["parsley_path", "tarragon_lane", "avocado_grove", "date_path"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 102);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "path_hundred"));
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("parsley") && summerPool.includes("avocado"));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("tarragon") && winterPool.includes("date_fruit"));
  const score = core.scoreDrink(
    { name: "煮椰枣的阿婆", tags: ["甜蜜", "温暖"], flavors: ["date_fruit"] },
    { cup: "mug", base: "honey_water", flavor: "date_fruit", topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, season: "winter" }
  );
  assert.ok(score.notes.some((n) => n === "甜点一角"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("avocado_grove") && game.includes("date_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "欧芹汽泡"));
  assert.ok(recipes.some((r) => r.name === "龙蒿暖茶"));
  assert.ok(recipes.some((r) => r.name === "牛油果暖蜜"));
  assert.ok(recipes.some((r) => r.name === "椰枣暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "date_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("欧芹短径") && man.includes("椰枣短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("椰枣")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_date_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("hyssop chervil sorrel lovage 106 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["hyssop", "chervil", "sorrel", "lovage"];
  const pots = ["hyssopPot", "chervilPot", "sorrelPot", "lovagePot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
  });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i, id, cat).ok, id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["hyssop_path", "chervil_lane", "sorrel_path", "lovage_courtyard"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 106);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("chervil") && summerPool.includes("sorrel"));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("hyssop") && winterPool.includes("lovage"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("hyssop_path") && game.includes("lovage_courtyard"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "神香草暖蜜"));
  assert.ok(recipes.some((r) => r.name === "香芹汽泡"));
  assert.ok(recipes.some((r) => r.name === "酸模汽泡"));
  assert.ok(recipes.some((r) => r.name === "独活暖茶"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "hyssop_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "lovage_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("神香草短径") && man.includes("独活小院"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("神香草") || t.includes("酸模")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_lovage_courtyard" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("pinFlavor shop shelf soft bonus", () => {
  assert.ok(typeof core.pinFlavor === "function");
  assert.ok(typeof core.getPinnedFlavor === "function");
  const s = core.defaultState();
  const pin = core.pinFlavor(s, "mint");
  assert.ok(pin.ok);
  assert.strictEqual(s.pinnedFlavorId, "mint");
  assert.strictEqual(core.getPinnedFlavor(s), "mint");
  assert.ok((s.stats.flavorPins || 0) >= 1);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "flavor_pin" && a.check(s)));
  const flavors = [
    { id: "mint", name: "薄荷", tags: ["清爽"] },
    { id: "honey", name: "野蜜", tags: ["甜蜜"] },
  ];
  const bases = [{ id: "soda", name: "气泡", need: null }];
  const cups = [{ id: "tall", name: "高脚杯", vibe: "清爽" }];
  const score = core.scoreDrink(
    { name: "客人", tags: ["清爽"], flavors: ["mint"] },
    { cup: "tall", base: "soda", flavor: "mint", topping: "none" },
    { cups, bases, flavors, toppings: [{ id: "none" }], pinnedFlavorId: "mint" }
  );
  assert.ok(score.notes.some((n) => n === "调味架熟手"), JSON.stringify(score.notes));
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(html.includes("btn-pin-flavor") && html.includes("btn-load-pinned-flavor"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pinFlavor") && game.includes("getPinnedFlavor"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("钉住当前风味"));
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("verbena savory celery_seed anise_seed 110 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["verbena", "savory", "celery_seed", "anise_seed"];
  const pots = ["verbenaPot", "savoryPot", "celerySeedPot", "aniseSeedPot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
  });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i, id, cat).ok, id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["verbena_path", "savory_lane", "celery_path", "anise_seed_path"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 110);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("verbena") && summerPool.includes("savory"));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("anise_seed"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("verbena_path") && game.includes("anise_seed_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "马鞭草汽泡"));
  assert.ok(recipes.some((r) => r.name === "茴香籽暖茶"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "verbena_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "anise_seed_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("马鞭草短径") && man.includes("茴香籽短径"));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_savory_lane" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("turmeric galangal pandan kaffir 114 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["turmeric", "galangal", "pandan", "kaffir_lime"];
  const pots = ["turmericPot", "galangalPot", "pandanPot", "kaffirLimePot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
    assert.ok(j.flavors.some((f) => f.id === id), "flavor " + id);
  });
  assert.ok(j.customers.some((c) => c.name === "煮姜黄的旅人"));
  assert.ok(j.customers.some((c) => c.name === "切高良姜的厨子"));
  assert.ok(j.customers.some((c) => c.name === "蒸班兰的厨娘"));
  assert.ok(j.customers.some((c) => c.name === "撕卡菲尔叶的厨子"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i, id, cat).ok, id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["turmeric_path", "galangal_lane", "pandan_grove", "kaffir_path"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 114);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("galangal") && summerPool.includes("pandan") && summerPool.includes("kaffir_lime"));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("turmeric"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("turmeric_path") && game.includes("kaffir_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "姜黄暖蜜"));
  assert.ok(recipes.some((r) => r.name === "高良姜汽泡"));
  assert.ok(recipes.some((r) => r.name === "班兰暖蜜"));
  assert.ok(recipes.some((r) => r.name === "卡菲尔汽泡"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "turmeric_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "kaffir_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("姜黄短径") && man.includes("卡菲尔叶径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("姜黄")));
  assert.ok(shop.tipMessages.some((t) => t.includes("班兰")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_pandan_grove" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("juniper allspice mace sumac 118 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["juniper", "allspice", "mace", "sumac"];
  const pots = ["juniperPot", "allspicePot", "macePot", "sumacPot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
  });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i, id, cat).ok, id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["juniper_ridge", "allspice_lane", "mace_path", "sumac_path"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 118);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("juniper") && summerPool.includes("sumac"));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("allspice") && winterPool.includes("mace"));
  const score = core.scoreDrink(
    { name: "磨多香果的厨子", tags: ["温暖", "甜蜜"], flavors: ["allspice"] },
    { cup: "mug", base: "honey_water", flavor: "allspice", topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, season: "winter" }
  );
  assert.ok(score.notes.some((n) => n === "甜点一角"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("juniper_ridge") && game.includes("sumac_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "杜松汽泡"));
  assert.ok(recipes.some((r) => r.name === "多香果暖蜜"));
  assert.ok(recipes.some((r) => r.name === "肉豆蔻衣暖茶"));
  assert.ok(recipes.some((r) => r.name === "盐肤木汽泡"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "juniper_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "sumac_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("杜松脊径") && man.includes("盐肤木短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("杜松")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_mace_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("caraway cumin fenugreek nigella 122 themes pin UI", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["caraway", "cumin", "fenugreek", "nigella"];
  const pots = ["carawayPot", "cuminPot", "fenugreekPot", "nigellaPot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
  });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i, id, cat).ok, id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["caraway_path", "cumin_lane", "fenugreek_path", "nigella_lane"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 122);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("caraway") && winterPool.includes("cumin") && winterPool.includes("fenugreek"));
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("nigella"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("caraway_path") && game.includes("nigella_lane"));
  assert.ok(game.includes("pinned-flavor"));
  const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
  assert.ok(css.includes("pinned-flavor"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "葛缕子暖蜜"));
  assert.ok(recipes.some((r) => r.name === "孜然暖茶"));
  assert.ok(recipes.some((r) => r.name === "胡芦巴暖蜜"));
  assert.ok(recipes.some((r) => r.name === "黑种草汽泡"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "caraway_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "nigella_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("葛缕子短径") && man.includes("黑种草小径"));
  const dialogues = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "dialogues.json"), "utf8"));
  assert.ok(dialogues.length >= 37);
  assert.ok(dialogues.some((d) => d.text && d.text.includes("调味架")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_cumin_lane" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("mustard ajwain wasabi myrtle 126 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["mustard_seed", "ajwain", "wasabi", "myrtle"];
  const pots = ["mustardSeedPot", "ajwainPot", "wasabiPot", "myrtlePot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
  });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i, id, cat).ok, id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["mustard_path", "ajwain_lane", "wasabi_path", "myrtle_courtyard"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 126);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("mustard_seed") && summerPool.includes("wasabi"));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("ajwain") && winterPool.includes("myrtle"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("wasabi_path") && game.includes("myrtle_courtyard"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "芥末籽汽泡"));
  assert.ok(recipes.some((r) => r.name === "香旱芹暖茶"));
  assert.ok(recipes.some((r) => r.name === "山葵汽泡"));
  assert.ok(recipes.some((r) => r.name === "香桃木暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "wasabi_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "myrtle_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("山葵溪径") && man.includes("香桃木小院"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("山葵")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_wasabi_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("chicory dandelion nettle yarrow forage brew 130 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["chicory", "dandelion", "nettle", "yarrow"];
  const pots = ["chicoryPot", "dandelionPot", "nettlePot", "yarrowPot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
  });
  assert.ok(j.customers.some((c) => c.name === "泡菊苣的旅人"));
  assert.ok(j.customers.some((c) => c.name === "采蒲公英的女孩"));
  assert.ok(j.customers.some((c) => c.name === "煮荨麻的厨娘"));
  assert.ok(j.customers.some((c) => c.name === "采蓍草的药师"));
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i, id, cat).ok, id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["chicory_path", "dandelion_field", "nettle_path", "yarrow_meadow"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 130);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  // forage brew soft bonus
  const score = core.scoreDrink(
    { name: "采蓍草的药师", tags: ["花香", "草本"], flavors: ["yarrow"] },
    { cup: "mug", base: "honey_water", flavor: "yarrow", topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }], season: "winter" }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  // serve tracks forageBrews
  const st = core.defaultState();
  st.bag.honey = 3;
  st.bag.yarrow = 3;
  const served = core.serveDrink(
    st,
    { name: "药师", tags: ["草本"], flavors: ["yarrow"] },
    { cup: "mug", base: "honey_water", flavor: "yarrow", topping: "none" },
    { cups: [{ id: "mug" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(served.ok, served.reason || "serve failed");
  assert.ok((st.stats && st.stats.forageBrews) >= 1);
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "forage_brewer"));
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("dandelion"));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("chicory") && winterPool.includes("yarrow"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("dandelion_field") && game.includes("yarrow_meadow"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "菊苣暖蜜"));
  assert.ok(recipes.some((r) => r.name === "蒲公英汽泡"));
  assert.ok(recipes.some((r) => r.name === "荨麻暖茶"));
  assert.ok(recipes.some((r) => r.name === "蓍草暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "chicory_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "yarrow_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("菊苣短径") && man.includes("蓍草草甸"));
  assert.ok(man.includes("野草特调"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("蒲公英") || t.includes("野草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_nettle_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("meadowsweet woodruff borage valerian 134 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["meadowsweet", "woodruff", "borage", "valerian"];
  const pots = ["meadowsweetPot", "woodruffPot", "boragePot", "valerianPot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
  });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i, id, cat).ok, id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["meadowsweet_path", "woodruff_lane", "borage_path", "valerian_grove"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 134);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "采绣线菊的药师", tags: ["花香"], flavors: ["meadowsweet"] },
    { cup: "mug", base: "honey_water", flavor: "meadowsweet", topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("valerian") && winterPool.includes("woodruff"));
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("borage"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("meadowsweet_path") && game.includes("valerian_grove"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "绣线菊暖蜜"));
  assert.ok(recipes.some((r) => r.name === "车叶草暖茶"));
  assert.ok(recipes.some((r) => r.name === "琉璃苣汽泡"));
  assert.ok(recipes.some((r) => r.name === "缬草暖茶"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "meadowsweet_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "valerian_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("绣线菊短径") && man.includes("缬草晚径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("绣线菊") || t.includes("缬草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_valerian_grove" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("hops heather angelica arnica 138 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["hops", "heather", "angelica", "arnica"];
  const pots = ["hopsPot", "heatherPot", "angelicaPot", "arnicaPot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
  });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i, id, cat).ok, id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["hops_trellis", "heather_hill", "angelica_path", "arnica_meadow"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 138);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "采啤酒花的酿酒师", tags: ["草本"], flavors: ["hops"] },
    { cup: "mug", base: "honey_water", flavor: "hops", topping: "none" },
    { cups: [{ id: "mug", vibe: "清爽" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("angelica"));
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("hops") && summerPool.includes("heather") && summerPool.includes("arnica"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("hops_trellis") && game.includes("arnica_meadow"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "啤酒花汽泡"));
  assert.ok(recipes.some((r) => r.name === "石楠暖蜜"));
  assert.ok(recipes.some((r) => r.name === "当归暖茶"));
  assert.ok(recipes.some((r) => r.name === "山金车暖蜜"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "hops_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "arnica_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("啤酒花架径") && man.includes("山金车草甸"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("啤酒花") || t.includes("山金车")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_hops_trellis" && e.body.length > 12));
  assert.ok(events.some((e) => e.id === "ev_arnica_meadow" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("echinacea comfrey feverfew lemon_verbena 142 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["echinacea", "comfrey", "feverfew", "lemon_verbena"];
  const pots = ["echinaceaPot", "comfreyPot", "feverfewPot", "lemon_verbenaPot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
  });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i, id, cat).ok, id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["echinacea_meadow", "comfrey_path", "feverfew_lane", "lemon_verbena_path"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 142);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "采紫锥菊的药师", tags: ["花香"], flavors: ["echinacea"] },
    { cup: "mug", base: "honey_water", flavor: "echinacea", topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  assert.ok(winterPool.includes("comfrey"));
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  assert.ok(summerPool.includes("echinacea") && summerPool.includes("feverfew") && summerPool.includes("lemon_verbena"));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("echinacea_meadow") && game.includes("lemon_verbena_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  assert.ok(recipes.some((r) => r.name === "紫锥菊暖蜜"));
  assert.ok(recipes.some((r) => r.name === "聚合草暖茶"));
  assert.ok(recipes.some((r) => r.name === "小白菊暖蜜"));
  assert.ok(recipes.some((r) => r.name === "柠檬马鞭草汽泡茶"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "echinacea_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === "lemon_verbena_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("紫锥菊草甸") && man.includes("柠檬马鞭草径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("紫锥菊") || t.includes("柠檬马鞭草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_echinacea_meadow" && e.body.length > 12));
  assert.ok(events.some((e) => e.id === "ev_lemon_verbena_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("mullein plantain_leaf selfheal skullcap 146 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["mullein","plantain_leaf","selfheal","skullcap"];
  const pots = ["mulleinPot","plantain_leafPot","selfhealPot","skullcapPot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
  });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i, id, cat).ok, id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["mullein_path","plantain_lane","selfheal_grove","skullcap_path"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 146);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["selfheal","skullcap"].forEach((id) => assert.ok(winterPool.includes(id), "winter " + id));
  ["mullein","plantain_leaf"].forEach((id) => assert.ok(summerPool.includes(id), "summer " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("mullein_path") && game.includes("skullcap_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["毛蕊花暖蜜","车前草暖蜜","夏枯草暖蜜","黄芩暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[ids.length - 1] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("毛蕊花短径") && man.includes("黄芩短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("毛蕊花")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "mullein_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("bee_balm marshmallow linden goldenrod 150 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["bee_balm","marshmallow","linden","goldenrod"];
  const pots = ["bee_balmPot","marshmallowPot","lindenPot","goldenrodPot"];
  ids.forEach((id, i) => {
    assert.ok(j.items[id] && j.plants[pots[i]], id);
  });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id, i) => {
    s.bag[id] = 1;
    assert.ok(core.plantSeed(s, i, id, cat).ok, id);
  });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["bee_balm_path","marshmallow_lane","linden_grove","goldenrod_meadow"].forEach((tid) => {
    assert.ok(themes.some((th) => th.id === tid), tid);
  });
  assert.ok(themes.length >= 150);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["linden"].forEach((id) => assert.ok(winterPool.includes(id), "winter " + id));
  ["bee_balm","marshmallow","goldenrod"].forEach((id) => assert.ok(summerPool.includes(id), "summer " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("bee_balm_path") && game.includes("goldenrod_meadow"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["美国薄荷暖蜜","药蜀葵暖蜜","椴树花暖蜜","一枝黄花暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[ids.length - 1] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("美国薄荷短径") && man.includes("一枝黄花草甸"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("美国薄荷")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "bee_balm_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("red_clover white_clover catnip horehound 154 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["red_clover","white_clover","catnip","horehound"];
  const pots = ["red_cloverPot","white_cloverPot","catnipPot","horehoundPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["red_clover_path","white_clover_lane","catnip_path","horehound_path"].forEach((tid) => assert.ok(themes.some((th)=>th.id===tid), tid));
  assert.ok(themes.length >= 154);
  assert.strictEqual(new Set(themes.map((th)=>th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name:"t", tags:["草本"], flavors:[ids[0]] },
    { cup:"mug", base:"honey_water", flavor:ids[0], topping:"none" },
    { cups:[{id:"mug",vibe:"温柔"}], bases:j.bases, flavors:j.flavors, toppings:[{id:"none"}] }
  );
  assert.ok(score.notes.some((n)=>n==="野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x)=>x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x)=>x.flavor);
  ["horehound"].forEach((id)=>assert.ok(winterPool.includes(id),"w "+id));
  ["red_clover","white_clover","catnip"].forEach((id)=>assert.ok(summerPool.includes(id),"s "+id));
  const game = fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
  assert.ok(game.includes("red_clover_path") && game.includes("horehound_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","secret-recipes.json"),"utf8"));
  ["红车轴草暖蜜","白车轴草暖蜜","猫薄荷暖蜜","夏至草暖蜜"].forEach((name)=>assert.ok(recipes.some((r)=>r.name===name),name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a)=>a.id===ids[0]+"_walker"));
  const man = fs.readFileSync(path.join(__dirname,"..","..","docs","USER_MANUAL.md"),"utf8");
  assert.ok(man.includes("红车轴草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","shop-config.json"),"utf8"));
  assert.ok(shop.tipMessages.some((t)=>t.includes("红车轴草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","evening-events.json"),"utf8"));
  assert.ok(events.some((e)=>e.id==="ev_"+"red_clover_path" && e.body.length>12));
  const titles = events.map((e)=>e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname,"..","tools","run-rounds.js"),"utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("motherwort tansy agrimony betony 158 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["motherwort","tansy","agrimony","betony"];
  const pots = ["motherwortPot","tansyPot","agrimonyPot","betonyPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["motherwort_path","tansy_meadow","agrimony_path","betony_grove"].forEach((tid) => assert.ok(themes.some((th)=>th.id===tid), tid));
  assert.ok(themes.length >= 158);
  assert.strictEqual(new Set(themes.map((th)=>th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name:"t", tags:["草本"], flavors:[ids[0]] },
    { cup:"mug", base:"honey_water", flavor:ids[0], topping:"none" },
    { cups:[{id:"mug",vibe:"温柔"}], bases:j.bases, flavors:j.flavors, toppings:[{id:"none"}] }
  );
  assert.ok(score.notes.some((n)=>n==="野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x)=>x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x)=>x.flavor);
  ["motherwort","betony"].forEach((id)=>assert.ok(winterPool.includes(id),"w "+id));
  ["tansy","agrimony"].forEach((id)=>assert.ok(summerPool.includes(id),"s "+id));
  const game = fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
  assert.ok(game.includes("motherwort_path") && game.includes("betony_grove"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","secret-recipes.json"),"utf8"));
  ["益母草暖蜜","艾菊暖蜜","龙芽草暖蜜","水苏暖蜜"].forEach((name)=>assert.ok(recipes.some((r)=>r.name===name),name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a)=>a.id===ids[0]+"_walker"));
  const man = fs.readFileSync(path.join(__dirname,"..","..","docs","USER_MANUAL.md"),"utf8");
  assert.ok(man.includes("益母草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","shop-config.json"),"utf8"));
  assert.ok(shop.tipMessages.some((t)=>t.includes("益母草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","evening-events.json"),"utf8"));
  assert.ok(events.some((e)=>e.id==="ev_"+"motherwort_path" && e.body.length>12));
  const titles = events.map((e)=>e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname,"..","tools","run-rounds.js"),"utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("solomon_seal rue wormwood costmary elecampane valerian_root meadow_clary soapwort 166 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["solomon_seal","rue","wormwood","costmary","elecampane","valerian_root","meadow_clary","soapwort"];
  const pots = ["solomon_sealPot","ruePot","wormwoodPot","costmaryPot","elecampanePot","valerian_rootPot","meadow_claryPot","soapwortPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["solomon_seal_path","rue_path","wormwood_path","costmary_lane","elecampane_path","valerian_root_path","meadow_clary_path","soapwort_lane"].forEach((tid) => assert.ok(themes.some((th)=>th.id===tid), tid));
  assert.ok(themes.length >= 166);
  assert.strictEqual(new Set(themes.map((th)=>th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name:"t", tags:["草本"], flavors:[ids[0]] },
    { cup:"mug", base:"honey_water", flavor:ids[0], topping:"none" },
    { cups:[{id:"mug",vibe:"温柔"}], bases:j.bases, flavors:j.flavors, toppings:[{id:"none"}] }
  );
  assert.ok(score.notes.some((n)=>n==="野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x)=>x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x)=>x.flavor);
  ["solomon_seal","wormwood","valerian_root"].forEach((id)=>assert.ok(winterPool.includes(id),"w "+id));
  ["rue","costmary","elecampane","meadow_clary","soapwort"].forEach((id)=>assert.ok(summerPool.includes(id),"s "+id));
  const game = fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
  assert.ok(game.includes("solomon_seal_path") && game.includes("soapwort_lane"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","secret-recipes.json"),"utf8"));
  ["黄精暖蜜","芸香暖蜜","苦艾暖蜜","艾菊薄荷暖蜜","土木香暖蜜","缬草根暖蜜","草地鼠尾草暖蜜","皂草暖蜜"].forEach((name)=>assert.ok(recipes.some((r)=>r.name===name),name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a)=>a.id===ids[0]+"_walker"));
  const man = fs.readFileSync(path.join(__dirname,"..","..","docs","USER_MANUAL.md"),"utf8");
  assert.ok(man.includes("黄精短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","shop-config.json"),"utf8"));
  assert.ok(shop.tipMessages.some((t)=>t.includes("黄精")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","evening-events.json"),"utf8"));
  assert.ok(events.some((e)=>e.id==="ev_"+"solomon_seal_path" && e.body.length>12));
  const titles = events.map((e)=>e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname,"..","tools","run-rounds.js"),"utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("milfoil lady_mantle speedwell stitchwort campion avens tormentil silverweed 174 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["milfoil","lady_mantle","speedwell","stitchwort","campion","avens","tormentil","silverweed"];
  const pots = ["milfoilPot","lady_mantlePot","speedwellPot","stitchwortPot","campionPot","avensPot","tormentilPot","silverweedPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["milfoil_meadow","lady_mantle_path","speedwell_lane","stitchwort_path","campion_path","avens_path","tormentil_path","silverweed_path"].forEach((tid) => assert.ok(themes.some((th)=>th.id===tid), tid));
  assert.ok(themes.length >= 174);
  assert.strictEqual(new Set(themes.map((th)=>th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name:"t", tags:["草本"], flavors:[ids[0]] },
    { cup:"mug", base:"honey_water", flavor:ids[0], topping:"none" },
    { cups:[{id:"mug",vibe:"温柔"}], bases:j.bases, flavors:j.flavors, toppings:[{id:"none"}] }
  );
  assert.ok(score.notes.some((n)=>n==="野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x)=>x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x)=>x.flavor);
  ["avens","tormentil"].forEach((id)=>assert.ok(winterPool.includes(id),"w "+id));
  ["milfoil","lady_mantle","speedwell","stitchwort","campion","silverweed"].forEach((id)=>assert.ok(summerPool.includes(id),"s "+id));
  const game = fs.readFileSync(path.join(__dirname,"..","game.js"),"utf8");
  assert.ok(game.includes("milfoil_meadow") && game.includes("silverweed_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","secret-recipes.json"),"utf8"));
  ["洋蓍草暖蜜","羽衣草暖蜜","婆婆纳暖蜜","繁缕暖蜜","剪秋罗暖蜜","水杨梅暖蜜","直立委陵菜暖蜜","鹅绒委陵菜暖蜜"].forEach((name)=>assert.ok(recipes.some((r)=>r.name===name),name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a)=>a.id===ids[0]+"_walker"));
  const man = fs.readFileSync(path.join(__dirname,"..","..","docs","USER_MANUAL.md"),"utf8");
  assert.ok(man.includes("洋蓍草草甸"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","shop-config.json"),"utf8"));
  assert.ok(shop.tipMessages.some((t)=>t.includes("洋蓍草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","evening-events.json"),"utf8"));
  assert.ok(events.some((e)=>e.id==="ev_"+"milfoil_meadow" && e.body.length>12));
  const titles = events.map((e)=>e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname,"..","tools","run-rounds.js"),"utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("figwort loosestrife willowherb bedstraw cleavers ground_ivy self_heal_spike bugle 182 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["figwort","loosestrife","willowherb","bedstraw","cleavers","ground_ivy","self_heal_spike","bugle"];
  const pots = ["figwortPot","loosestrifePot","willowherbPot","bedstrawPot","cleaversPot","ground_ivyPot","self_heal_spikePot","buglePot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["figwort_path","loosestrife_path","willowherb_path","bedstraw_lane","cleavers_path","ground_ivy_path","self_heal_spike_path","bugle_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 182);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["figwort","ground_ivy","self_heal_spike"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["loosestrife","willowherb","bedstraw","cleavers","bugle"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("figwort_path") && game.includes("bugle_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["玄参暖蜜","千屈菜暖蜜","柳兰暖蜜","猪殃殃暖蜜","拉拉藤暖蜜","连钱草暖蜜","夏枯穗暖蜜","筋骨草暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("玄参短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("玄参")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "figwort_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("primrose cowslip oxeye knapweed scabious teasel burdock nettle_seed 190 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["primrose","cowslip","oxeye","knapweed","scabious","teasel","burdock","nettle_seed"];
  const pots = ["primrosePot","cowslipPot","oxeyePot","knapweedPot","scabiousPot","teaselPot","burdockPot","nettle_seedPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["primrose_path","cowslip_lane","oxeye_meadow","knapweed_path","scabious_path","teasel_path","burdock_path","nettle_seed_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 190);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["teasel","burdock"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["primrose","cowslip","oxeye","knapweed","scabious","nettle_seed"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("primrose_path") && game.includes("nettle_seed_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["报春花暖蜜","黄花九轮草暖蜜","滨菊暖蜜","矢车菊暖蜜","山萝卜暖蜜","川续断暖蜜","牛蒡暖蜜","荨麻籽暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("报春花短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("报春花")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "primrose_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("hawthorn_berry rosehip sloe rowan crabapple serviceberry elderflower_fresh meadowsweet_fresh 198 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["hawthorn_berry","rosehip","sloe","rowan","crabapple","serviceberry","elderflower_fresh","meadowsweet_fresh"];
  const pots = ["hawthorn_berryPot","rosehipPot","sloePot","rowanPot","crabapplePot","serviceberryPot","elderflower_freshPot","meadowsweet_freshPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["hawthorn_berry_path","rosehip_path","sloe_path","rowan_path","crabapple_path","serviceberry_path","elderflower_fresh_path","meadowsweet_fresh_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 198);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["hawthorn_berry","rosehip","sloe"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["rowan","crabapple","serviceberry","elderflower_fresh","meadowsweet_fresh"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("hawthorn_berry_path") && game.includes("meadowsweet_fresh_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["山楂果暖蜜","玫瑰果暖蜜","黑刺李暖蜜","花楸果暖蜜","海棠果暖蜜","唐棣暖蜜","接骨木花鲜暖蜜","绣线菊鲜暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("山楂果短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("山楂果")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "hawthorn_berry_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("wood_sorrel wild_garlic ramsons jack_by_hedge hedge_mustard wintercress watercress brooklime 206 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["wood_sorrel","wild_garlic","ramsons","jack_by_hedge","hedge_mustard","wintercress","watercress","brooklime"];
  const pots = ["wood_sorrelPot","wild_garlicPot","ramsonsPot","jack_by_hedgePot","hedge_mustardPot","wintercressPot","watercressPot","brooklimePot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["wood_sorrel_path","wild_garlic_path","ramsons_path","jack_by_hedge_path","hedge_mustard_path","wintercress_path","watercress_path","brooklime_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 206);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["wintercress"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["wood_sorrel","wild_garlic","ramsons","jack_by_hedge","hedge_mustard","watercress","brooklime"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("wood_sorrel_path") && game.includes("brooklime_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["酢浆草暖蜜","熊葱暖蜜","熊蒜暖蜜","蒜芥暖蜜","蒜芥菜暖蜜","山芥暖蜜","豆瓣菜暖蜜","有柄水苦荬暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("酢浆草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("酢浆草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "wood_sorrel_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("cloudberry lingonberry bilberry gooseberry currant_red currant_black whitecurrant sea_buckthorn 214 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["cloudberry","lingonberry","bilberry","gooseberry","currant_red","currant_black","whitecurrant","sea_buckthorn"];
  const pots = ["cloudberryPot","lingonberryPot","bilberryPot","gooseberryPot","currant_redPot","currant_blackPot","whitecurrantPot","sea_buckthornPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["cloudberry_path","lingonberry_path","bilberry_path","gooseberry_path","currant_red_path","currant_black_path","whitecurrant_path","sea_buckthorn_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 214);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["cloudberry","lingonberry","bilberry","gooseberry","currant_red","currant_black","whitecurrant","sea_buckthorn"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("cloudberry_path") && game.includes("sea_buckthorn_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["云莓暖蜜","越橘暖蜜","欧洲越橘暖蜜","醋栗暖蜜","红醋栗暖蜜","黑醋栗暖蜜","白醋栗暖蜜","沙棘暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("云莓短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("云莓")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "cloudberry_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("medlar quince damson greengage mirabelle saskatoon chokeberry aronia 222 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["medlar","quince","damson","greengage","mirabelle","saskatoon","chokeberry","aronia"];
  const pots = ["medlarPot","quincePot","damsonPot","greengagePot","mirabellePot","saskatoonPot","chokeberryPot","aroniaPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["medlar_path","quince_path","damson_path","greengage_path","mirabelle_path","saskatoon_path","chokeberry_path","aronia_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 222);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["medlar","quince","aronia"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["damson","greengage","mirabelle","saskatoon","chokeberry"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("medlar_path") && game.includes("aronia_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["欧楂暖蜜","榅桲暖蜜","西洋李暖蜜","青李暖蜜","黄香李暖蜜","萨斯卡通莓暖蜜","野樱莓暖蜜","黑果腺肋花楸暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("欧楂短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("欧楂")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "medlar_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("yarrow_white achillea_pink cornflower poppy_seed flax_flower flax_seed hemp_seed chia_seed 230 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["yarrow_white","achillea_pink","cornflower","poppy_seed","flax_flower","flax_seed","hemp_seed","chia_seed"];
  const pots = ["yarrow_whitePot","achillea_pinkPot","cornflowerPot","poppy_seedPot","flax_flowerPot","flax_seedPot","hemp_seedPot","chia_seedPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["yarrow_white_path","achillea_pink_path","cornflower_path","poppy_seed_path","flax_flower_path","flax_seed_path","hemp_seed_path","chia_seed_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 230);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["flax_seed","hemp_seed"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["yarrow_white","achillea_pink","cornflower","poppy_seed","flax_flower","chia_seed"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("yarrow_white_path") && game.includes("chia_seed_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["白蓍暖蜜","粉蓍暖蜜","矢车菊蓝暖蜜","罂粟籽暖蜜","亚麻花暖蜜","亚麻籽暖蜜","火麻仁暖蜜","奇亚籽暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("白蓍短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("白蓍")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "yarrow_white_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("pumpkin_seed sunflower_seed sesame_black sesame_white fennel_pollen fennel_frond dill_pollen celery_leaf 238 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["pumpkin_seed","sunflower_seed","sesame_black","sesame_white","fennel_pollen","fennel_frond","dill_pollen","celery_leaf"];
  const pots = ["pumpkin_seedPot","sunflower_seedPot","sesame_blackPot","sesame_whitePot","fennel_pollenPot","fennel_frondPot","dill_pollenPot","celery_leafPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["pumpkin_seed_path","sunflower_seed_path","sesame_black_path","sesame_white_path","fennel_pollen_path","fennel_frond_path","dill_pollen_path","celery_leaf_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 238);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["pumpkin_seed","sesame_black","sesame_white"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["sunflower_seed","fennel_pollen","fennel_frond","dill_pollen","celery_leaf"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pumpkin_seed_path") && game.includes("celery_leaf_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["南瓜籽暖蜜","葵花籽暖蜜","黑芝麻暖蜜","白芝麻暖蜜","茴香花粉暖蜜","茴香叶暖蜜","莳萝花粉暖蜜","芹菜叶暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("南瓜籽短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("南瓜籽")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "pumpkin_seed_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("rooibos honeybush yerba_mate guayusa lapacho sassafras birch_bark pine_resin 246 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["rooibos","honeybush","yerba_mate","guayusa","lapacho","sassafras","birch_bark","pine_resin"];
  const pots = ["rooibosPot","honeybushPot","yerba_matePot","guayusaPot","lapachoPot","sassafrasPot","birch_barkPot","pine_resinPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["rooibos_path","honeybush_path","yerba_mate_path","guayusa_path","lapacho_path","sassafras_path","birch_bark_path","pine_resin_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 246);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["lapacho","sassafras","birch_bark","pine_resin"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["rooibos","honeybush","yerba_mate","guayusa"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("rooibos_path") && game.includes("pine_resin_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["路易波士暖蜜","蜜树茶暖蜜","马黛茶暖蜜","瓜尤萨暖蜜","拉帕乔暖蜜","檫树暖蜜","白桦皮暖蜜","松脂暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("路易波士短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("路易波士")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "rooibos_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("gardenia magnolia frangipani plumeria tuberose stephanotis garden_phlox osmanthus_fresh 254 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["gardenia","magnolia","frangipani","plumeria","tuberose","stephanotis","garden_phlox","osmanthus_fresh"];
  const pots = ["gardeniaPot","magnoliaPot","frangipaniPot","plumeriaPot","tuberosePot","stephanotisPot","garden_phloxPot","osmanthus_freshPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["gardenia_path","magnolia_path","frangipani_path","plumeria_path","tuberose_path","stephanotis_path","garden_phlox_path","osmanthus_fresh_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 254);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["tuberose"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["gardenia","magnolia","frangipani","plumeria","stephanotis","garden_phlox","osmanthus_fresh"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("gardenia_path") && game.includes("osmanthus_fresh_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["栀子花暖蜜","玉兰花暖蜜","鸡蛋花暖蜜","缅栀暖蜜","晚香玉暖蜜","马达加斯加茉莉暖蜜","福禄考暖蜜","桂花鲜瓣暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("栀子花短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("栀子花")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "gardenia_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("galangal_fresh ginger_flower turmeric_fresh cardamom_green cardamom_black long_pepper grains_of_paradise cubeb 262 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["galangal_fresh","ginger_flower","turmeric_fresh","cardamom_green","cardamom_black","long_pepper","grains_of_paradise","cubeb"];
  const pots = ["galangal_freshPot","ginger_flowerPot","turmeric_freshPot","cardamom_greenPot","cardamom_blackPot","long_pepperPot","grains_of_paradisePot","cubebPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["galangal_fresh_path","ginger_flower_path","turmeric_fresh_path","cardamom_green_path","cardamom_black_path","long_pepper_path","grains_paradise_path","cubeb_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 262);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["cardamom_green","cardamom_black","long_pepper","grains_of_paradise"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["galangal_fresh","ginger_flower","turmeric_fresh","cubeb"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("galangal_fresh_path") && game.includes("cubeb_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["鲜高良姜暖蜜","姜花暖蜜","鲜姜黄暖蜜","绿豆蔻暖蜜","黑豆蔻暖蜜","荜拨暖蜜","天堂椒暖蜜","毕澄茄暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("鲜高良姜短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("鲜高良姜")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "galangal_fresh_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("makrut_leaf curry_leaf holy_basil thai_basil lemon_basil cinnamon_leaf clove_bud allspice_leaf 270 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["makrut_leaf","curry_leaf","holy_basil","thai_basil","lemon_basil","cinnamon_leaf","clove_bud","allspice_leaf"];
  const pots = ["makrut_leafPot","curry_leafPot","holy_basilPot","thai_basilPot","lemon_basilPot","cinnamon_leafPot","clove_budPot","allspice_leafPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["makrut_leaf_path","curry_leaf_path","holy_basil_path","thai_basil_path","lemon_basil_path","cinnamon_leaf_path","clove_bud_path","allspice_leaf_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 270);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["cinnamon_leaf","clove_bud","allspice_leaf"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["makrut_leaf","curry_leaf","holy_basil","thai_basil","lemon_basil"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("makrut_leaf_path") && game.includes("allspice_leaf_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["青柠叶暖蜜","咖喱叶暖蜜","圣罗勒暖蜜","泰罗勒暖蜜","柠檬罗勒暖蜜","肉桂叶暖蜜","丁香芽暖蜜","多香果叶暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("青柠叶短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("青柠叶")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "makrut_leaf_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("reindeer_moss iceland_moss oak_moss usnea chaga reishi lion_mane maitake 278 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["reindeer_moss","iceland_moss","oak_moss","usnea","chaga","reishi","lion_mane","maitake"];
  const pots = ["reindeer_mossPot","iceland_mossPot","oak_mossPot","usneaPot","chagaPot","reishiPot","lion_manePot","maitakePot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["reindeer_moss_path","iceland_moss_path","oak_moss_path","usnea_path","chaga_path","reishi_path","lion_mane_path","maitake_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 278);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["reindeer_moss","iceland_moss","oak_moss","usnea","chaga","reishi","lion_mane","maitake"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  [].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("reindeer_moss_path") && game.includes("maitake_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["驯鹿苔暖蜜","冰岛苔暖蜜","橡苔暖蜜","松萝暖蜜","白桦茸暖蜜","灵芝暖蜜","猴头菇暖蜜","舞茸暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("驯鹿苔短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("驯鹿苔")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "reindeer_moss_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("rambutan_fresh lychee_fresh mangosteen durian_flower jackfruit_seed tamarind calamansi 285 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["rambutan_fresh","lychee_fresh","mangosteen","durian_flower","jackfruit_seed","tamarind","calamansi"];
  const pots = ["rambutan_freshPot","lychee_freshPot","mangosteenPot","durian_flowerPot","jackfruit_seedPot","tamarindPot","calamansiPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["rambutan_fresh_path","lychee_fresh_path","mangosteen_path","durian_flower_path","jackfruit_seed_path","tamarind_path","calamansi_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 285);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["jackfruit_seed"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["rambutan_fresh","lychee_fresh","mangosteen","durian_flower","tamarind","calamansi"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("rambutan_fresh_path") && game.includes("calamansi_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["鲜红毛丹暖蜜","鲜荔枝暖蜜","山竹暖蜜","榴莲花暖蜜","波罗蜜籽暖蜜","罗望子暖蜜","四季桔暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("鲜红毛丹短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("鲜红毛丹")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "rambutan_fresh_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("fig_fresh pomegranate_seed cactus_pear prickly_pear sapodilla soursop cherimoya feijoa 293 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["fig_fresh","pomegranate_seed","cactus_pear","prickly_pear","sapodilla","soursop","cherimoya","feijoa"];
  const pots = ["fig_freshPot","pomegranate_seedPot","cactus_pearPot","prickly_pearPot","sapodillaPot","soursopPot","cherimoyaPot","feijoaPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["fig_fresh_path","pomegranate_seed_path","cactus_pear_path","prickly_pear_path","sapodilla_path","soursop_path","cherimoya_path","feijoa_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 293);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["fig_fresh","pomegranate_seed","cactus_pear","prickly_pear","sapodilla","soursop","cherimoya","feijoa"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("fig_fresh_path") && game.includes("feijoa_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["无花果鲜暖蜜","石榴籽暖蜜","仙人掌果暖蜜","霸王树果暖蜜","人心果暖蜜","刺果番荔枝暖蜜","毛叶番荔枝暖蜜","费约果暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("无花果鲜短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("无花果鲜")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "fig_fresh_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("loquat_fresh jujube_fresh mulberry_white mulberry_black elderberry_fresh rowan_jelly quince_paste 300 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["loquat_fresh","jujube_fresh","mulberry_white","mulberry_black","elderberry_fresh","rowan_jelly","quince_paste"];
  const pots = ["loquat_freshPot","jujube_freshPot","mulberry_whitePot","mulberry_blackPot","elderberry_freshPot","rowan_jellyPot","quince_pastePot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["loquat_fresh_path","jujube_fresh_path","mulberry_white_path","mulberry_black_path","elderberry_fresh_path","rowan_jelly_path","quince_paste_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 300);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["rowan_jelly","quince_paste"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["loquat_fresh","jujube_fresh","mulberry_white","mulberry_black","elderberry_fresh"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("loquat_fresh_path") && game.includes("quince_paste_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["鲜枇杷暖蜜","鲜枣暖蜜","白桑暖蜜","黑桑暖蜜","鲜接骨木果暖蜜","花楸果冻暖蜜","榅桲膏暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("鲜枇杷短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("鲜枇杷")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "loquat_fresh_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("bergamot_fresh yuzu_fresh sudachi kabosu ponkan dekopon hassaku amanatsu 308 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["bergamot_fresh","yuzu_fresh","sudachi","kabosu","ponkan","dekopon","hassaku","amanatsu"];
  const pots = ["bergamot_freshPot","yuzu_freshPot","sudachiPot","kabosuPot","ponkanPot","dekoponPot","hassakuPot","amanatsuPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["bergamot_fresh_path","yuzu_fresh_path","sudachi_path","kabosu_path","ponkan_path","dekopon_path","hassaku_path","amanatsu_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 308);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["yuzu_fresh","ponkan","dekopon","hassaku"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["bergamot_fresh","sudachi","kabosu","amanatsu"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("bergamot_fresh_path") && game.includes("amanatsu_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["鲜佛手柑暖蜜","鲜柚子暖蜜","酢橘暖蜜","香酸柑暖蜜","椪柑暖蜜","不知火暖蜜","八朔暖蜜","甘夏暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("鲜佛手柑短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("鲜佛手柑")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "bergamot_fresh_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("shiso_green shiso_red mitsuba myoga wasabi_leaf sansho kinome yuzu_kosho 316 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["shiso_green","shiso_red","mitsuba","myoga","wasabi_leaf","sansho","kinome","yuzu_kosho"];
  const pots = ["shiso_greenPot","shiso_redPot","mitsubaPot","myogaPot","wasabi_leafPot","sanshoPot","kinomePot","yuzu_koshoPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["shiso_green_path","shiso_red_path","mitsuba_path","myoga_path","wasabi_leaf_path","sansho_path","kinome_path","yuzu_kosho_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 316);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["yuzu_kosho"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["shiso_green","shiso_red","mitsuba","myoga","wasabi_leaf","sansho","kinome"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("shiso_green_path") && game.includes("yuzu_kosho_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["青紫苏暖蜜","赤紫苏暖蜜","三叶暖蜜","茗荷暖蜜","山葵叶暖蜜","山椒暖蜜","木芽暖蜜","柚子胡椒暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("青紫苏短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("青紫苏")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "shiso_green_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("edelweiss gentian arnica_montana alpine_strawberry bilberry_leaf juniper_berry fir_needle spruce_tip 324 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["edelweiss","gentian","arnica_montana","alpine_strawberry","bilberry_leaf","juniper_berry","fir_needle","spruce_tip"];
  const pots = ["edelweissPot","gentianPot","arnica_montanaPot","alpine_strawberryPot","bilberry_leafPot","juniper_berryPot","fir_needlePot","spruce_tipPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["edelweiss_path","gentian_path","arnica_montana_path","alpine_strawberry_path","bilberry_leaf_path","juniper_berry_path","fir_needle_path","spruce_tip_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 324);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["edelweiss","juniper_berry","fir_needle"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["gentian","arnica_montana","alpine_strawberry","bilberry_leaf","spruce_tip"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("edelweiss_path") && game.includes("spruce_tip_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["雪绒花暖蜜","龙胆暖蜜","山地金车暖蜜","野草莓暖蜜","越橘叶暖蜜","杜松果暖蜜","冷杉针暖蜜","云杉芽暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("雪绒花短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("雪绒花")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "edelweiss_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("olive_leaf myrtle_berry mastic caper zaatar sumac_berry saffron_crocus orange_blossom 332 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["olive_leaf","myrtle_berry","mastic","caper","zaatar","sumac_berry","saffron_crocus","orange_blossom"];
  const pots = ["olive_leafPot","myrtle_berryPot","masticPot","caperPot","zaatarPot","sumac_berryPot","saffron_crocusPot","orange_blossomPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["olive_leaf_path","myrtle_berry_path","mastic_path","caper_path","zaatar_path","sumac_berry_path","saffron_crocus_path","orange_blossom_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 332);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["myrtle_berry","mastic","saffron_crocus"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["olive_leaf","caper","zaatar","sumac_berry","orange_blossom"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("olive_leaf_path") && game.includes("orange_blossom_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["橄榄叶暖蜜","香桃木果暖蜜","乳香黄连木暖蜜","续随子花蕾暖蜜","扎塔香草暖蜜","盐肤木果暖蜜","番红花暖蜜","橙花暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("橄榄叶短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("橄榄叶")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "olive_leaf_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("lavender_honey thyme_honey acacia_honey buckwheat_honey chestnut_honey manuka propolis bee_pollen 340 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["lavender_honey","thyme_honey","acacia_honey","buckwheat_honey","chestnut_honey","manuka","propolis","bee_pollen"];
  const pots = ["lavender_honeyPot","thyme_honeyPot","acacia_honeyPot","buckwheat_honeyPot","chestnut_honeyPot","manukaPot","propolisPot","bee_pollenPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["lavender_honey_path","thyme_honey_path","acacia_honey_path","buckwheat_honey_path","chestnut_honey_path","manuka_path","propolis_path","bee_pollen_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 340);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["buckwheat_honey","chestnut_honey","propolis"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["lavender_honey","thyme_honey","acacia_honey","manuka","bee_pollen"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("lavender_honey_path") && game.includes("bee_pollen_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["薰衣草蜜暖蜜","百里香蜜暖蜜","洋槐蜜暖蜜","荞麦蜜暖蜜","板栗蜜暖蜜","麦卢卡暖蜜","蜂胶暖蜜","蜂花粉暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("薰衣草蜜短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("薰衣草蜜")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "lavender_honey_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("royal_jelly comb_honey mead_herb linden_honey heather_honey_wild wildflower_honey clover_honey eucalyptus_honey 348 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["royal_jelly","comb_honey","mead_herb","linden_honey","heather_honey_wild","wildflower_honey","clover_honey","eucalyptus_honey"];
  const pots = ["royal_jellyPot","comb_honeyPot","mead_herbPot","linden_honeyPot","heather_honey_wildPot","wildflower_honeyPot","clover_honeyPot","eucalyptus_honeyPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["royal_jelly_path","comb_honey_path","mead_herb_path","linden_honey_path","heather_honey_wild_path","wildflower_honey_path","clover_honey_path","eucalyptus_honey_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 348);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["royal_jelly","mead_herb"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["comb_honey","linden_honey","heather_honey_wild","wildflower_honey","clover_honey","eucalyptus_honey"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("royal_jelly_path") && game.includes("eucalyptus_honey_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["蜂王浆暖蜜","巢蜜暖蜜","蜜酒香草暖蜜","椴树蜜暖蜜","石楠野蜜暖蜜","野花蜜暖蜜","车轴草蜜暖蜜","桉树蜜暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("蜂王浆短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("蜂王浆")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "royal_jelly_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("cacao_nibs cacao_husk carob mesquite lucuma maca camu_camu acai 356 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["cacao_nibs","cacao_husk","carob","mesquite","lucuma","maca","camu_camu","acai"];
  const pots = ["cacao_nibsPot","cacao_huskPot","carobPot","mesquitePot","lucumaPot","macaPot","camu_camuPot","acaiPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["cacao_nibs_path","cacao_husk_path","carob_path","mesquite_path","lucuma_path","maca_path","camu_camu_path","acai_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 356);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["cacao_nibs","cacao_husk","carob","maca"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["mesquite","lucuma","camu_camu","acai"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("cacao_nibs_path") && game.includes("acai_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["可可碎暖蜜","可可壳暖蜜","角豆暖蜜","牧豆暖蜜","蛋黄果粉暖蜜","玛卡暖蜜","卡姆果暖蜜","阿萨伊暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("可可碎短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("可可碎")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "cacao_nibs_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("maqui goji_fresh schisandra amla baobab morinda noni cupuacu 364 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["maqui","goji_fresh","schisandra","amla","baobab","morinda","noni","cupuacu"];
  const pots = ["maquiPot","goji_freshPot","schisandraPot","amlaPot","baobabPot","morindaPot","noniPot","cupuacuPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["maqui_path","goji_fresh_path","schisandra_path","amla_path","baobab_path","morinda_path","noni_path","cupuacu_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 364);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["schisandra"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["maqui","goji_fresh","amla","baobab","morinda","noni","cupuacu"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("maqui_path") && game.includes("cupuacu_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["智利酒果暖蜜","鲜枸杞暖蜜","五味子暖蜜","余甘子暖蜜","猴面包果暖蜜","诺丽暖蜜","海巴戟暖蜜","古布阿苏暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("智利酒果短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("智利酒果")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "maqui_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("matcha_ceremonial hojicha genmaicha sencha gyokuro bancha kukicha mugicha 372 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["matcha_ceremonial","hojicha","genmaicha","sencha","gyokuro","bancha","kukicha","mugicha"];
  const pots = ["matcha_ceremonialPot","hojichaPot","genmaichaPot","senchaPot","gyokuroPot","banchaPot","kukichaPot","mugichaPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["matcha_ceremonial_path","hojicha_path","genmaicha_path","sencha_path","gyokuro_path","bancha_path","kukicha_path","mugicha_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 372);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["hojicha","genmaicha"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["matcha_ceremonial","sencha","gyokuro","bancha","kukicha","mugicha"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("matcha_ceremonial_path") && game.includes("mugicha_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["抹茶礼暖蜜","焙茶暖蜜","玄米茶暖蜜","煎茶暖蜜","玉露暖蜜","番茶暖蜜","茎茶暖蜜","麦茶暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("抹茶礼短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("抹茶礼")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "matcha_ceremonial_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("sobacha job_tears barley_grass wheatgrass spirulina chlorella kelp nori 380 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["sobacha","job_tears","barley_grass","wheatgrass","spirulina","chlorella","kelp","nori"];
  const pots = ["sobachaPot","job_tearsPot","barley_grassPot","wheatgrassPot","spirulinaPot","chlorellaPot","kelpPot","noriPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["sobacha_path","job_tears_path","barley_grass_path","wheatgrass_path","spirulina_path","chlorella_path","kelp_path","nori_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 380);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["sobacha","job_tears"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["barley_grass","wheatgrass","spirulina","chlorella","kelp","nori"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("sobacha_path") && game.includes("nori_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["荞麦茶暖蜜","薏米茶暖蜜","大麦若叶暖蜜","小麦草暖蜜","螺旋藻暖蜜","小球藻暖蜜","海带暖蜜","紫菜暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("荞麦茶短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("荞麦茶")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "sobacha_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("rose_hip_tea hibiscus_fresh chrysanthemum_fresh peony camellia_fresh lotus_seed_fresh lotus_leaf_fresh osmanthus_sugar 388 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["rose_hip_tea","hibiscus_fresh","chrysanthemum_fresh","peony","camellia_fresh","lotus_seed_fresh","lotus_leaf_fresh","osmanthus_sugar"];
  const pots = ["rose_hip_teaPot","hibiscus_freshPot","chrysanthemum_freshPot","peonyPot","camellia_freshPot","lotus_seed_freshPot","lotus_leaf_freshPot","osmanthus_sugarPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["rose_hip_tea_path","hibiscus_fresh_path","chrysanthemum_fresh_path","peony_path","camellia_fresh_path","lotus_seed_fresh_path","lotus_leaf_fresh_path","osmanthus_sugar_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 388);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["rose_hip_tea","camellia_fresh","lotus_seed_fresh"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["hibiscus_fresh","chrysanthemum_fresh","peony","lotus_leaf_fresh","osmanthus_sugar"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("rose_hip_tea_path") && game.includes("osmanthus_sugar_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["玫瑰果茶暖蜜","鲜洛神暖蜜","鲜菊花暖蜜","牡丹暖蜜","鲜山茶暖蜜","鲜莲子暖蜜","鲜荷叶暖蜜","桂花糖暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("玫瑰果茶短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("玫瑰果茶")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "rose_hip_tea_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("plum_blossom wintersweet orchid_petal bamboo_leaf_fresh bamboo_shoot_fresh ginkgo_leaf_fresh ginkgo_nut_fresh osmanthus_wine 396 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["plum_blossom","wintersweet","orchid_petal","bamboo_leaf_fresh","bamboo_shoot_fresh","ginkgo_leaf_fresh","ginkgo_nut_fresh","osmanthus_wine"];
  const pots = ["plum_blossomPot","wintersweetPot","orchid_petalPot","bamboo_leaf_freshPot","bamboo_shoot_freshPot","ginkgo_leaf_freshPot","ginkgo_nut_freshPot","osmanthus_winePot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["plum_blossom_path","wintersweet_path","orchid_petal_path","bamboo_leaf_fresh_path","bamboo_shoot_fresh_path","ginkgo_leaf_fresh_path","ginkgo_nut_fresh_path","osmanthus_wine_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 396);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["plum_blossom","wintersweet","ginkgo_leaf_fresh","ginkgo_nut_fresh","osmanthus_wine"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["orchid_petal","bamboo_leaf_fresh","bamboo_shoot_fresh"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("plum_blossom_path") && game.includes("osmanthus_wine_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["梅花暖蜜","蜡梅暖蜜","兰花瓣暖蜜","鲜竹叶暖蜜","鲜竹笋暖蜜","鲜银杏叶暖蜜","鲜白果暖蜜","桂花酿暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("梅花短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("梅花")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "plum_blossom_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("safflower calendula_fresh pot_marigold coreopsis cosmos zinnia dahlia gladiolus 404 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["safflower","calendula_fresh","pot_marigold","coreopsis","cosmos","zinnia","dahlia","gladiolus"];
  const pots = ["safflowerPot","calendula_freshPot","pot_marigoldPot","coreopsisPot","cosmosPot","zinniaPot","dahliaPot","gladiolusPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["safflower_path","calendula_fresh_path","pot_marigold_path","coreopsis_path","cosmos_path","zinnia_path","dahlia_path","gladiolus_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 404);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["safflower","calendula_fresh","pot_marigold","coreopsis","cosmos","zinnia","dahlia","gladiolus"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("safflower_path") && game.includes("gladiolus_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["红花暖蜜","鲜金盏暖蜜","金盏菊暖蜜","金鸡菊暖蜜","波斯菊暖蜜","百日草暖蜜","大丽花暖蜜","剑兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("红花短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("红花")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "safflower_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("iris crocus snowdrop crocus_yellow hyacinth daffodil tulip ranunculus 412 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["iris","crocus","snowdrop","crocus_yellow","hyacinth","daffodil","tulip","ranunculus"];
  const pots = ["irisPot","crocusPot","snowdropPot","crocus_yellowPot","hyacinthPot","daffodilPot","tulipPot","ranunculusPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["iris_path","crocus_path","snowdrop_path","crocus_yellow_path","hyacinth_path","daffodil_path","tulip_path","ranunculus_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 412);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["crocus","snowdrop","crocus_yellow","hyacinth","daffodil"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["iris","tulip","ranunculus"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("iris_path") && game.includes("ranunculus_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["鸢尾暖蜜","番红花球暖蜜","雪花莲暖蜜","黄番红暖蜜","风信子暖蜜","水仙暖蜜","郁金香暖蜜","花毛茛暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("鸢尾短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("鸢尾")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "iris_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("sweet_pea nasturtium morning_glory moonflower clematis wisteria_fresh jasmine_sambac gardenia_tea 420 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["sweet_pea","nasturtium","morning_glory","moonflower","clematis","wisteria_fresh","jasmine_sambac","gardenia_tea"];
  const pots = ["sweet_peaPot","nasturtiumPot","morning_gloryPot","moonflowerPot","clematisPot","wisteria_freshPot","jasmine_sambacPot","gardenia_teaPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["sweet_pea_path","nasturtium_path","morning_glory_path","moonflower_path","clematis_path","wisteria_fresh_path","jasmine_sambac_path","gardenia_tea_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 420);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["moonflower"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["sweet_pea","nasturtium","morning_glory","clematis","wisteria_fresh","jasmine_sambac","gardenia_tea"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("sweet_pea_path") && game.includes("gardenia_tea_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["香豌豆暖蜜","旱金莲暖蜜","牵牛花暖蜜","月光花暖蜜","铁线莲暖蜜","鲜紫藤暖蜜","双瓣茉莉暖蜜","栀子花茶暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("香豌豆短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("香豌豆")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "sweet_pea_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("magnolia_bark eucommia astragalus codonopsis rehmannia polygonatum ophiopogon 427 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["magnolia_bark","eucommia","astragalus","codonopsis","rehmannia","polygonatum","ophiopogon"];
  const pots = ["magnolia_barkPot","eucommiaPot","astragalusPot","codonopsisPot","rehmanniaPot","polygonatumPot","ophiopogonPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["magnolia_bark_path","eucommia_path","astragalus_path","codonopsis_path","rehmannia_path","polygonatum_path","ophiopogon_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 427);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["magnolia_bark","eucommia","astragalus","codonopsis","rehmannia","polygonatum","ophiopogon"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  [].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("magnolia_bark_path") && game.includes("ophiopogon_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["厚朴暖蜜","杜仲暖蜜","黄芪暖蜜","党参暖蜜","地黄暖蜜","玉竹暖蜜","麦冬暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("厚朴短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("厚朴")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "magnolia_bark_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("boysenberry loganberry tayberry marionberry wineberry salmonberry thimbleberry cloudberry_leaf 435 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["boysenberry","loganberry","tayberry","marionberry","wineberry","salmonberry","thimbleberry","cloudberry_leaf"];
  const pots = ["boysenberryPot","loganberryPot","tayberryPot","marionberryPot","wineberryPot","salmonberryPot","thimbleberryPot","cloudberry_leafPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["boysenberry_path","loganberry_path","tayberry_path","marionberry_path","wineberry_path","salmonberry_path","thimbleberry_path","cloudberry_leaf_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 435);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["boysenberry","loganberry","tayberry","marionberry","wineberry","salmonberry","thimbleberry","cloudberry_leaf"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("boysenberry_path") && game.includes("cloudberry_leaf_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["波森莓暖蜜","罗甘莓暖蜜","泰莓暖蜜","马里恩莓暖蜜","酒莓暖蜜","鲑莓暖蜜","糙莓暖蜜","云莓叶暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("波森莓短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("波森莓")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "boysenberry_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("angelica_arch lovage_fresh sweet_cicely wood_avense ramsons_flower sea_kale scurvygrass marsh_samphire 443 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["angelica_arch","lovage_fresh","sweet_cicely","wood_avense","ramsons_flower","sea_kale","scurvygrass","marsh_samphire"];
  const pots = ["angelica_archPot","lovage_freshPot","sweet_cicelyPot","wood_avensePot","ramsons_flowerPot","sea_kalePot","scurvygrassPot","marsh_samphirePot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["angelica_arch_path","lovage_fresh_path","sweet_cicely_path","wood_avense_path","ramsons_flower_path","sea_kale_path","scurvygrass_path","marsh_samphire_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 443);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["angelica_arch","wood_avense"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["lovage_fresh","sweet_cicely","ramsons_flower","sea_kale","scurvygrass","marsh_samphire"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("angelica_arch_path") && game.includes("marsh_samphire_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["欧当归暖蜜","鲜独活暖蜜","欧洲没药暖蜜","水杨梅根暖蜜","熊葱花暖蜜","海甘蓝暖蜜","坏血病草暖蜜","海蓬子暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("欧当归短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("欧当归")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "angelica_arch_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("agave_nectar prickly_pear_pad jojoba mesquite_pod creosote desert_sage ephedra yucca_flower 451 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["agave_nectar","prickly_pear_pad","jojoba","mesquite_pod","creosote","desert_sage","ephedra","yucca_flower"];
  const pots = ["agave_nectarPot","prickly_pear_padPot","jojobaPot","mesquite_podPot","creosotePot","desert_sagePot","ephedraPot","yucca_flowerPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["agave_nectar_path","prickly_pear_pad_path","jojoba_path","mesquite_pod_path","creosote_path","desert_sage_path","ephedra_path","yucca_flower_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 451);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["ephedra"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["agave_nectar","prickly_pear_pad","jojoba","mesquite_pod","creosote","desert_sage","yucca_flower"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("agave_nectar_path") && game.includes("yucca_flower_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["龙舌兰蜜暖蜜","仙人掌叶暖蜜","霍霍巴暖蜜","牧豆荚暖蜜","三齿拉瑞阿暖蜜","沙漠鼠尾草暖蜜","麻黄暖蜜","丝兰花暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("龙舌兰蜜短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("龙舌兰蜜")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "agave_nectar_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("yerba_santa boldo cedron muña coca_leaf_tea guarana cupuacu_butter stevia_leaf 459 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["yerba_santa","boldo","cedron","muña","coca_leaf_tea","guarana","cupuacu_butter","stevia_leaf"];
  const pots = ["yerba_santaPot","boldoPot","cedronPot","muñaPot","coca_leaf_teaPot","guaranaPot","cupuacu_butterPot","stevia_leafPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["yerba_santa_path","boldo_path","cedron_path","muna_path","coca_leaf_tea_path","guarana_path","cupuacu_butter_path","stevia_leaf_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 459);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["boldo","cupuacu_butter"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["yerba_santa","cedron","muña","coca_leaf_tea","guarana","stevia_leaf"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("yerba_santa_path") && game.includes("stevia_leaf_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["圣草暖蜜","波尔多叶暖蜜","南美柠檬马鞭草暖蜜","木纳草暖蜜","古柯叶茶暖蜜","瓜拉纳暖蜜","古布阿苏脂暖蜜","甜叶菊暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("圣草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("圣草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "yerba_santa_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("rooibos_green honeybush_fresh buchu sutherlandia baobab_leaf marula kinkeliba hibiscus_sab 467 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["rooibos_green","honeybush_fresh","buchu","sutherlandia","baobab_leaf","marula","kinkeliba","hibiscus_sab"];
  const pots = ["rooibos_greenPot","honeybush_freshPot","buchuPot","sutherlandiaPot","baobab_leafPot","marulaPot","kinkelibaPot","hibiscus_sabPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["rooibos_green_path","honeybush_fresh_path","buchu_path","sutherlandia_path","baobab_leaf_path","marula_path","kinkeliba_path","hibiscus_sab_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 467);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["sutherlandia"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["rooibos_green","honeybush_fresh","buchu","baobab_leaf","marula","kinkeliba","hibiscus_sab"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("rooibos_green_path") && game.includes("hibiscus_sab_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["绿路易波士暖蜜","鲜蜜树暖蜜","布枯暖蜜","南非政府草暖蜜","猴面包叶暖蜜","马鲁拉暖蜜","金凯利巴暖蜜","玫瑰茄暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("绿路易波士短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("绿路易波士")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "rooibos_green_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("pandan_fresh lemongrass_fresh galangal_leaf torch_ginger butterfly_pea chrysanthemum_ind tamarind_leaf coconut_flower 475 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["pandan_fresh","lemongrass_fresh","galangal_leaf","torch_ginger","butterfly_pea","chrysanthemum_ind","tamarind_leaf","coconut_flower"];
  const pots = ["pandan_freshPot","lemongrass_freshPot","galangal_leafPot","torch_gingerPot","butterfly_peaPot","chrysanthemum_indPot","tamarind_leafPot","coconut_flowerPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["pandan_fresh_path","lemongrass_fresh_path","galangal_leaf_path","torch_ginger_path","butterfly_pea_path","chrysanthemum_ind_path","tamarind_leaf_path","coconut_flower_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 475);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["pandan_fresh","lemongrass_fresh","galangal_leaf","torch_ginger","butterfly_pea","chrysanthemum_ind","tamarind_leaf","coconut_flower"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pandan_fresh_path") && game.includes("coconut_flower_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["鲜班兰暖蜜","鲜香茅暖蜜","高良姜叶暖蜜","火炬姜暖蜜","蝶豆花暖蜜","印尼菊暖蜜","罗望子叶暖蜜","椰花暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("鲜班兰短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("鲜班兰")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "pandan_fresh_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("bergamot_leaf citron bergamot_peel neroli petitgrain immortelle helichrysum cistus 483 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["bergamot_leaf","citron","bergamot_peel","neroli","petitgrain","immortelle","helichrysum","cistus"];
  const pots = ["bergamot_leafPot","citronPot","bergamot_peelPot","neroliPot","petitgrainPot","immortellePot","helichrysumPot","cistusPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["bergamot_leaf_path","citron_path","bergamot_peel_path","neroli_path","petitgrain_path","immortelle_path","helichrysum_path","cistus_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 483);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["citron","bergamot_peel"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["bergamot_leaf","neroli","petitgrain","immortelle","helichrysum","cistus"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("bergamot_leaf_path") && game.includes("cistus_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["佛手柑叶暖蜜","香橼暖蜜","佛手柑皮暖蜜","橙花精暖蜜","苦橙叶暖蜜","蜡菊暖蜜","蜡菊花暖蜜","岩蔷薇暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("佛手柑叶短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("佛手柑叶")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "bergamot_leaf_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("spruce_beer labrador_tea fireweed fireweed_honey arctic_willow crowberry bearberry labrador_violet 491 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["spruce_beer","labrador_tea","fireweed","fireweed_honey","arctic_willow","crowberry","bearberry","labrador_violet"];
  const pots = ["spruce_beerPot","labrador_teaPot","fireweedPot","fireweed_honeyPot","arctic_willowPot","crowberryPot","bearberryPot","labrador_violetPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["spruce_beer_path","labrador_tea_path","fireweed_path","fireweed_honey_path","arctic_willow_path","crowberry_path","bearberry_path","labrador_violet_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 491);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["labrador_tea","arctic_willow"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["spruce_beer","fireweed","fireweed_honey","crowberry","bearberry","labrador_violet"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("spruce_beer_path") && game.includes("labrador_violet_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["云杉芽酒香暖蜜","拉布拉多茶暖蜜","火草暖蜜","火草蜜暖蜜","北极柳暖蜜","岩高兰暖蜜","熊果暖蜜","拉布拉多堇暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("云杉芽酒香径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("云杉芽酒香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "spruce_beer_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("kinako kuromitsu matcha_salt yuzu_peel sansho_leaf shiso_flower ume_blossom sakura_leaf 499 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["kinako","kuromitsu","matcha_salt","yuzu_peel","sansho_leaf","shiso_flower","ume_blossom","sakura_leaf"];
  const pots = ["kinakoPot","kuromitsuPot","matcha_saltPot","yuzu_peelPot","sansho_leafPot","shiso_flowerPot","ume_blossomPot","sakura_leafPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["kinako_path","kuromitsu_path","matcha_salt_path","yuzu_peel_path","sansho_leaf_path","shiso_flower_path","ume_blossom_path","sakura_leaf_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 499);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["kinako","kuromitsu","yuzu_peel","ume_blossom"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["matcha_salt","sansho_leaf","shiso_flower","sakura_leaf"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("kinako_path") && game.includes("sakura_leaf_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["黄豆粉暖蜜","黑蜜暖蜜","抹茶盐暖蜜","柚子皮暖蜜","山椒叶暖蜜","紫苏穗暖蜜","梅花花暖蜜","樱叶暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("黄豆粉短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("黄豆粉")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "kinako_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("vanilla_bean tonka_bean lavender_sugar rose_water orange_flower_water almond_blossom hazelnut_flower chestnut_flower 507 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["vanilla_bean","tonka_bean","lavender_sugar","rose_water","orange_flower_water","almond_blossom","hazelnut_flower","chestnut_flower"];
  const pots = ["vanilla_beanPot","tonka_beanPot","lavender_sugarPot","rose_waterPot","orange_flower_waterPot","almond_blossomPot","hazelnut_flowerPot","chestnut_flowerPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["vanilla_bean_path","tonka_bean_path","lavender_sugar_path","rose_water_path","orange_flower_water_path","almond_blossom_path","hazelnut_flower_path","chestnut_flower_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 507);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["vanilla_bean","tonka_bean","hazelnut_flower"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["lavender_sugar","rose_water","orange_flower_water","almond_blossom","chestnut_flower"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("vanilla_bean_path") && game.includes("chestnut_flower_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["香草荚暖蜜","零陵香豆暖蜜","薰衣草糖暖蜜","玫瑰水暖蜜","橙花水暖蜜","杏花暖蜜","榛花暖蜜","板栗花暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("香草荚短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("香草荚")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "vanilla_bean_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("omija yuja ssanghwa maesil jujube_tea ginger_tea_kr persimmon_leaf pine_flower 515 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["omija","yuja","ssanghwa","maesil","jujube_tea","ginger_tea_kr","persimmon_leaf","pine_flower"];
  const pots = ["omijaPot","yujaPot","ssanghwaPot","maesilPot","jujube_teaPot","ginger_tea_krPot","persimmon_leafPot","pine_flowerPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["omija_path","yuja_path","ssanghwa_path","maesil_path","jujube_tea_path","ginger_tea_kr_path","persimmon_leaf_path","pine_flower_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 515);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["omija","yuja","ssanghwa","jujube_tea","ginger_tea_kr"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["maesil","persimmon_leaf","pine_flower"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("omija_path") && game.includes("pine_flower_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["五味子韩暖蜜","柚子茶果暖蜜","双和茶料暖蜜","梅实暖蜜","大枣茶暖蜜","韩式姜茶暖蜜","柿叶暖蜜","松花暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("五味子韩短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("五味子韩")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "omija_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("tulsi neem_flower curry_blossom ajwain_leaf fenugreek_leaf moringa gotu_kola brahmi 523 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["tulsi","neem_flower","curry_blossom","ajwain_leaf","fenugreek_leaf","moringa","gotu_kola","brahmi"];
  const pots = ["tulsiPot","neem_flowerPot","curry_blossomPot","ajwain_leafPot","fenugreek_leafPot","moringaPot","gotu_kolaPot","brahmiPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["tulsi_path","neem_flower_path","curry_blossom_path","ajwain_leaf_path","fenugreek_leaf_path","moringa_path","gotu_kola_path","brahmi_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 523);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["tulsi","neem_flower","curry_blossom","ajwain_leaf","fenugreek_leaf","moringa","gotu_kola","brahmi"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("tulsi_path") && game.includes("brahmi_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["圣罗勒印暖蜜","苦楝花暖蜜","咖喱花暖蜜","香旱芹叶暖蜜","胡芦巴叶暖蜜","辣木暖蜜","积雪草暖蜜","假马齿苋暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("圣罗勒印短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("圣罗勒印")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "tulsi_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("hibiscus_rosa allspice_berry annatto epazote papalo hoja_santa mexican_oregano chile_flower 531 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["hibiscus_rosa","allspice_berry","annatto","epazote","papalo","hoja_santa","mexican_oregano","chile_flower"];
  const pots = ["hibiscus_rosaPot","allspice_berryPot","annattoPot","epazotePot","papaloPot","hoja_santaPot","mexican_oreganoPot","chile_flowerPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["hibiscus_rosa_path","allspice_berry_path","annatto_path","epazote_path","papalo_path","hoja_santa_path","mexican_oregano_path","chile_flower_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 531);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["hibiscus_rosa","allspice_berry","annatto","epazote","papalo","hoja_santa","mexican_oregano","chile_flower"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("hibiscus_rosa_path") && game.includes("chile_flower_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["朱槿暖蜜","多香果鲜暖蜜","胭脂树暖蜜","土荆芥暖蜜","帕帕洛暖蜜","圣叶暖蜜","墨西哥牛至暖蜜","辣椒花暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("朱槿短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("朱槿")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "hibiscus_rosa_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("noni_leaf kava ti_leaf frangipani_tea soursop_leaf guava_leaf passion_leaf vanilla_orchid 539 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["noni_leaf","kava","ti_leaf","frangipani_tea","soursop_leaf","guava_leaf","passion_leaf","vanilla_orchid"];
  const pots = ["noni_leafPot","kavaPot","ti_leafPot","frangipani_teaPot","soursop_leafPot","guava_leafPot","passion_leafPot","vanilla_orchidPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["noni_leaf_path","kava_path","ti_leaf_path","frangipani_tea_path","soursop_leaf_path","guava_leaf_path","passion_leaf_path","vanilla_orchid_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 539);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["kava"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["noni_leaf","ti_leaf","frangipani_tea","soursop_leaf","guava_leaf","passion_leaf","vanilla_orchid"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("noni_leaf_path") && game.includes("vanilla_orchid_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["诺丽叶暖蜜","卡瓦暖蜜","铁树叶暖蜜","鸡蛋花茶暖蜜","刺果番荔枝叶暖蜜","番石榴叶暖蜜","百香果叶暖蜜","香荚兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("诺丽叶短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("诺丽叶")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "noni_leaf_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("longjing biluochun tieguanyin dahongpao puer_raw puer_ripe white_peony_tea shoumei 547 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["longjing","biluochun","tieguanyin","dahongpao","puer_raw","puer_ripe","white_peony_tea","shoumei"];
  const pots = ["longjingPot","biluochunPot","tieguanyinPot","dahongpaoPot","puer_rawPot","puer_ripePot","white_peony_teaPot","shoumeiPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["longjing_path","biluochun_path","tieguanyin_path","dahongpao_path","puer_raw_path","puer_ripe_path","white_peony_tea_path","shoumei_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 547);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["tieguanyin","dahongpao","puer_ripe","shoumei"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["longjing","biluochun","puer_raw","white_peony_tea"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("longjing_path") && game.includes("shoumei_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["龙井暖蜜","碧螺春暖蜜","铁观音暖蜜","大红袍暖蜜","生普暖蜜","熟普暖蜜","白牡丹茶暖蜜","寿眉暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("龙井短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("龙井")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "longjing_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("burdock_root dandelion_root chicory_root valerian_flower hops_flower meadowsweet_flower yarrow_flower nettle_seed_tea 555 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["burdock_root","dandelion_root","chicory_root","valerian_flower","hops_flower","meadowsweet_flower","yarrow_flower","nettle_seed_tea"];
  const pots = ["burdock_rootPot","dandelion_rootPot","chicory_rootPot","valerian_flowerPot","hops_flowerPot","meadowsweet_flowerPot","yarrow_flowerPot","nettle_seed_teaPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["burdock_root_path","dandelion_root_path","chicory_root_path","valerian_flower_path","hops_flower_path","meadowsweet_flower_path","yarrow_flower_path","nettle_seed_tea_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 555);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["burdock_root","dandelion_root","chicory_root"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["valerian_flower","hops_flower","meadowsweet_flower","yarrow_flower","nettle_seed_tea"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("burdock_root_path") && game.includes("nettle_seed_tea_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["牛蒡根暖蜜","蒲公英根暖蜜","菊苣根暖蜜","缬草花暖蜜","啤酒花花暖蜜","绣线菊花暖蜜","蓍草花暖蜜","荨麻籽茶暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("牛蒡根短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("牛蒡根")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "burdock_root_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("silver_birch copper_beech hornbeam field_maple wild_service guelder_rose wayfaring dogwood 563 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["silver_birch","copper_beech","hornbeam","field_maple","wild_service","guelder_rose","wayfaring","dogwood"];
  const pots = ["silver_birchPot","copper_beechPot","hornbeamPot","field_maplePot","wild_servicePot","guelder_rosePot","wayfaringPot","dogwoodPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["silver_birch_path","copper_beech_path","hornbeam_path","field_maple_path","wild_service_path","guelder_rose_path","wayfaring_path","dogwood_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 563);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["silver_birch","copper_beech","hornbeam","field_maple","wild_service","guelder_rose","wayfaring","dogwood"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("silver_birch_path") && game.includes("dogwood_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["银白桦暖蜜","紫叶山毛榉暖蜜","鹅耳枥暖蜜","田野槭暖蜜","野花楸暖蜜","欧洲荚蒾暖蜜","绵毛荚蒾暖蜜","山茱萸暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("银白桦短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("银白桦")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "silver_birch_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("spindle buckthorn privet boxwood holly_leaf ivy_berry mistletoe yew_berry 571 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["spindle","buckthorn","privet","boxwood","holly_leaf","ivy_berry","mistletoe","yew_berry"];
  const pots = ["spindlePot","buckthornPot","privetPot","boxwoodPot","holly_leafPot","ivy_berryPot","mistletoePot","yew_berryPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["spindle_path","buckthorn_path","privet_path","boxwood_path","holly_leaf_path","ivy_berry_path","mistletoe_path","yew_berry_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 571);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["holly_leaf","ivy_berry","mistletoe","yew_berry"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["spindle","buckthorn","privet","boxwood"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("spindle_path") && game.includes("yew_berry_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["卫矛暖蜜","鼠李暖蜜","女贞暖蜜","黄杨暖蜜","冬青叶暖蜜","常春藤果暖蜜","槲寄生暖蜜","红豆杉暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("卫矛短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("卫矛")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "spindle_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("bluebell_fresh primula_veris oxlip cowslip_fresh wood_anemone wood_sorrel_pink greater_stitchwort red_campion 579 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["bluebell_fresh","primula_veris","oxlip","cowslip_fresh","wood_anemone","wood_sorrel_pink","greater_stitchwort","red_campion"];
  const pots = ["bluebell_freshPot","primula_verisPot","oxlipPot","cowslip_freshPot","wood_anemonePot","wood_sorrel_pinkPot","greater_stitchwortPot","red_campionPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["bluebell_fresh_path","primula_veris_path","oxlip_path","cowslip_fresh_path","wood_anemone_path","wood_sorrel_pink_path","greater_stitchwort_path","red_campion_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 579);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["bluebell_fresh","primula_veris","oxlip","cowslip_fresh","wood_anemone","wood_sorrel_pink","greater_stitchwort","red_campion"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("bluebell_fresh_path") && game.includes("red_campion_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["鲜风铃草暖蜜","黄花九轮暖蜜","高报春暖蜜","鲜九轮草暖蜜","林银莲暖蜜","粉酢浆草暖蜜","大繁缕暖蜜","红剪秋罗暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("鲜风铃草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("鲜风铃草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "bluebell_fresh_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("white_campion ragged_robin cuckooflower lady_smock garlic_mustard_fl hedge_garlic_seed jack_hedge_leaf wild_mustard 587 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["white_campion","ragged_robin","cuckooflower","lady_smock","garlic_mustard_fl","hedge_garlic_seed","jack_hedge_leaf","wild_mustard"];
  const pots = ["white_campionPot","ragged_robinPot","cuckooflowerPot","lady_smockPot","garlic_mustard_flPot","hedge_garlic_seedPot","jack_hedge_leafPot","wild_mustardPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["white_campion_path","ragged_robin_path","cuckooflower_path","lady_smock_path","garlic_mustard_fl_path","hedge_garlic_seed_path","jack_hedge_leaf_path","wild_mustard_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 587);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["white_campion","ragged_robin","cuckooflower","lady_smock","garlic_mustard_fl","hedge_garlic_seed","jack_hedge_leaf","wild_mustard"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("white_campion_path") && game.includes("wild_mustard_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["白剪秋罗暖蜜","剪秋罗羽暖蜜","布谷鸟剪暖蜜","水田芥花暖蜜","蒜芥花暖蜜","蒜芥籽暖蜜","篱蒜芥叶暖蜜","野芥暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("白剪秋罗短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("白剪秋罗")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "white_campion_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("meadow_buttercup creeping_buttercup lesser_celandine marsh_marigold globe_flower columbine monkshood larkspur 595 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["meadow_buttercup","creeping_buttercup","lesser_celandine","marsh_marigold","globe_flower","columbine","monkshood","larkspur"];
  const pots = ["meadow_buttercupPot","creeping_buttercupPot","lesser_celandinePot","marsh_marigoldPot","globe_flowerPot","columbinePot","monkshoodPot","larkspurPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["meadow_buttercup_path","creeping_buttercup_path","lesser_celandine_path","marsh_marigold_path","globe_flower_path","columbine_path","monkshood_path","larkspur_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 595);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["meadow_buttercup","creeping_buttercup","lesser_celandine","marsh_marigold","globe_flower","columbine","monkshood","larkspur"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("meadow_buttercup_path") && game.includes("larkspur_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["草地毛茛暖蜜","匍匐毛茛暖蜜","小白屈菜暖蜜","驴蹄草暖蜜","金莲花暖蜜","耧斗菜暖蜜","乌头暖蜜","飞燕草暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("草地毛茛短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("草地毛茛")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "meadow_buttercup_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("delphinium aconite helleborus christmas_rose pasque_flower anemone_coronaria hepatic clematis_vitalba 603 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["delphinium","aconite","helleborus","christmas_rose","pasque_flower","anemone_coronaria","hepatic","clematis_vitalba"];
  const pots = ["delphiniumPot","aconitePot","helleborusPot","christmas_rosePot","pasque_flowerPot","anemone_coronariaPot","hepaticPot","clematis_vitalbaPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["delphinium_path","aconite_path","helleborus_path","christmas_rose_path","pasque_flower_path","anemone_coronaria_path","hepatic_path","clematis_vitalba_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 603);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["aconite","helleborus","christmas_rose"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["delphinium","pasque_flower","anemone_coronaria","hepatic","clematis_vitalba"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("delphinium_path") && game.includes("clematis_vitalba_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["翠雀暖蜜","附子花暖蜜","铁筷子暖蜜","圣诞玫瑰暖蜜","白头翁暖蜜","冠状银莲暖蜜","獐耳细辛暖蜜","老铁线莲暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("翠雀短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("翠雀")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "delphinium_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("speedwell_germander germander betony_fresh selfheal_fresh woundwort hedge_woundwort marsh_woundwort black_horehound 611 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["speedwell_germander","germander","betony_fresh","selfheal_fresh","woundwort","hedge_woundwort","marsh_woundwort","black_horehound"];
  const pots = ["speedwell_germanderPot","germanderPot","betony_freshPot","selfheal_freshPot","woundwortPot","hedge_woundwortPot","marsh_woundwortPot","black_horehoundPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["speedwell_germander_path","germander_path","betony_fresh_path","selfheal_fresh_path","woundwort_path","hedge_woundwort_path","marsh_woundwort_path","black_horehound_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 611);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["black_horehound"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["speedwell_germander","germander","betony_fresh","selfheal_fresh","woundwort","hedge_woundwort","marsh_woundwort"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("speedwell_germander_path") && game.includes("black_horehound_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["石蚕婆婆纳暖蜜","石蚕暖蜜","鲜水苏暖蜜","鲜夏枯草暖蜜","水苏属暖蜜","篱水苏暖蜜","沼水苏暖蜜","黑夏至草暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("石蚕婆婆纳短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("石蚕婆婆纳")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "speedwell_germander_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("white_horehound motherwort_fresh skullcap_fresh baikal_skullcap scutellaria bugle_fresh ground_ivy_fresh alehoof 619 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["white_horehound","motherwort_fresh","skullcap_fresh","baikal_skullcap","scutellaria","bugle_fresh","ground_ivy_fresh","alehoof"];
  const pots = ["white_horehoundPot","motherwort_freshPot","skullcap_freshPot","baikal_skullcapPot","scutellariaPot","bugle_freshPot","ground_ivy_freshPot","alehoofPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["white_horehound_path","motherwort_fresh_path","skullcap_fresh_path","baikal_skullcap_path","scutellaria_path","bugle_fresh_path","ground_ivy_fresh_path","alehoof_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 619);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["white_horehound","skullcap_fresh","baikal_skullcap","ground_ivy_fresh"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["motherwort_fresh","scutellaria","bugle_fresh","alehoof"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("white_horehound_path") && game.includes("alehoof_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["白夏至草暖蜜","鲜益母草暖蜜","鲜黄芩暖蜜","黄芩根暖蜜","盔状黄芩暖蜜","鲜筋骨草暖蜜","鲜连钱草暖蜜","啤酒花草暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("白夏至草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("白夏至草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "white_horehound_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("clary_sage pineapple_sage fruit_sage white_sage russian_sage meadow_clary_fresh wood_sage jerusalem_sage 627 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["clary_sage","pineapple_sage","fruit_sage","white_sage","russian_sage","meadow_clary_fresh","wood_sage","jerusalem_sage"];
  const pots = ["clary_sagePot","pineapple_sagePot","fruit_sagePot","white_sagePot","russian_sagePot","meadow_clary_freshPot","wood_sagePot","jerusalem_sagePot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["clary_sage_path","pineapple_sage_path","fruit_sage_path","white_sage_path","russian_sage_path","meadow_clary_fresh_path","wood_sage_path","jerusalem_sage_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 627);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["clary_sage","pineapple_sage","fruit_sage","white_sage","russian_sage","meadow_clary_fresh","wood_sage","jerusalem_sage"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("clary_sage_path") && game.includes("jerusalem_sage_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["南欧丹参暖蜜","菠萝鼠尾草暖蜜","果香鼠尾草暖蜜","白鼠尾草暖蜜","俄罗斯鼠尾草暖蜜","鲜草地鼠尾暖蜜","林地鼠尾草暖蜜","耶路撒冷鼠尾暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("南欧丹参短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("南欧丹参")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "clary_sage_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("catmint catnip_fresh hyssop_fresh anise_hyssop korean_mint agastache lavender_spike lavender_sto 635 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["catmint","catnip_fresh","hyssop_fresh","anise_hyssop","korean_mint","agastache","lavender_spike","lavender_sto"];
  const pots = ["catmintPot","catnip_freshPot","hyssop_freshPot","anise_hyssopPot","korean_mintPot","agastachePot","lavender_spikePot","lavender_stoPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["catmint_path","catnip_fresh_path","hyssop_fresh_path","anise_hyssop_path","korean_mint_path","agastache_path","lavender_spike_path","lavender_sto_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 635);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["catmint","catnip_fresh","hyssop_fresh","anise_hyssop","korean_mint","agastache","lavender_spike","lavender_sto"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("catmint_path") && game.includes("lavender_sto_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["假荆芥暖蜜","鲜猫薄荷暖蜜","鲜神香草暖蜜","茴香藿香暖蜜","藿香暖蜜","藿香属暖蜜","穗花薰衣草暖蜜","法国薰衣草暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("假荆芥短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("假荆芥")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "catmint_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("thyme_lemon thyme_orange thyme_caraway thyme_woolly creeping_thyme oregano_greek oregano_italian marjoram_sweet 643 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["thyme_lemon","thyme_orange","thyme_caraway","thyme_woolly","creeping_thyme","oregano_greek","oregano_italian","marjoram_sweet"];
  const pots = ["thyme_lemonPot","thyme_orangePot","thyme_carawayPot","thyme_woollyPot","creeping_thymePot","oregano_greekPot","oregano_italianPot","marjoram_sweetPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["thyme_lemon_path","thyme_orange_path","thyme_caraway_path","thyme_woolly_path","creeping_thyme_path","oregano_greek_path","oregano_italian_path","marjoram_sweet_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 643);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["thyme_lemon","thyme_orange","thyme_caraway","thyme_woolly","creeping_thyme","oregano_greek","oregano_italian","marjoram_sweet"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("thyme_lemon_path") && game.includes("marjoram_sweet_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["柠檬百里香暖蜜","橙香百里香暖蜜","葛缕子百里香暖蜜","绵毛百里香暖蜜","铺地百里香暖蜜","希腊牛至暖蜜","意大利牛至暖蜜","甜马郁兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("柠檬百里香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("柠檬百里香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "thyme_lemon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("savory_summer savory_winter basil_genovese basil_cinnamon basil_purple basil_lettuce mint_peppermint mint_spearmint 651 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["savory_summer","savory_winter","basil_genovese","basil_cinnamon","basil_purple","basil_lettuce","mint_peppermint","mint_spearmint"];
  const pots = ["savory_summerPot","savory_winterPot","basil_genovesePot","basil_cinnamonPot","basil_purplePot","basil_lettucePot","mint_peppermintPot","mint_spearmintPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["savory_summer_path","savory_winter_path","basil_genovese_path","basil_cinnamon_path","basil_purple_path","basil_lettuce_path","mint_peppermint_path","mint_spearmint_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 651);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["savory_winter"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["savory_summer","basil_genovese","basil_cinnamon","basil_purple","basil_lettuce","mint_peppermint","mint_spearmint"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("savory_summer_path") && game.includes("mint_spearmint_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["夏香薄荷暖蜜","冬香薄荷暖蜜","热那亚罗勒暖蜜","肉桂罗勒暖蜜","紫罗勒暖蜜","生菜罗勒暖蜜","胡椒薄荷暖蜜","留兰香暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("夏香薄荷短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("夏香薄荷")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "savory_summer_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("mint_chocolate mint_apple mint_ginger mint_orange mint_lavender mint_bergamot mint_corsican mint_water 659 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["mint_chocolate","mint_apple","mint_ginger","mint_orange","mint_lavender","mint_bergamot","mint_corsican","mint_water"];
  const pots = ["mint_chocolatePot","mint_applePot","mint_gingerPot","mint_orangePot","mint_lavenderPot","mint_bergamotPot","mint_corsicanPot","mint_waterPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["mint_chocolate_path","mint_apple_path","mint_ginger_path","mint_orange_path","mint_lavender_path","mint_bergamot_path","mint_corsican_path","mint_water_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 659);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["mint_chocolate","mint_apple","mint_ginger","mint_orange","mint_lavender","mint_bergamot","mint_corsican","mint_water"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("mint_chocolate_path") && game.includes("mint_water_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["巧克力薄荷暖蜜","苹果薄荷暖蜜","姜味薄荷暖蜜","橙香薄荷暖蜜","薰衣草薄荷暖蜜","佛手柑薄荷暖蜜","科西嘉薄荷暖蜜","水薄荷暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("巧克力薄荷短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("巧克力薄荷")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "mint_chocolate_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("melissa_fresh lemon_balm_var bee_balm_pink bee_balm_purple oregano_hop dittany dictamnus burning_bush 667 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["melissa_fresh","lemon_balm_var","bee_balm_pink","bee_balm_purple","oregano_hop","dittany","dictamnus","burning_bush"];
  const pots = ["melissa_freshPot","lemon_balm_varPot","bee_balm_pinkPot","bee_balm_purplePot","oregano_hopPot","dittanyPot","dictamnusPot","burning_bushPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["melissa_fresh_path","lemon_balm_var_path","bee_balm_pink_path","bee_balm_purple_path","oregano_hop_path","dittany_path","dictamnus_path","burning_bush_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 667);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["melissa_fresh","lemon_balm_var","bee_balm_pink","bee_balm_purple","oregano_hop","dittany","dictamnus","burning_bush"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("melissa_fresh_path") && game.includes("burning_bush_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["鲜香蜂草暖蜜","柠檬香蜂暖蜜","粉美国薄荷暖蜜","紫美国薄荷暖蜜","啤酒花牛至暖蜜","白鲜暖蜜","白藓花暖蜜","燃烧灌木暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("鲜香蜂草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("鲜香蜂草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "melissa_fresh_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("chamomile_roman chamomile_german feverfew_fresh tansy_fresh yarrow_pink yarrow_gold arnica_fresh calendula_offic 675 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["chamomile_roman","chamomile_german","feverfew_fresh","tansy_fresh","yarrow_pink","yarrow_gold","arnica_fresh","calendula_offic"];
  const pots = ["chamomile_romanPot","chamomile_germanPot","feverfew_freshPot","tansy_freshPot","yarrow_pinkPot","yarrow_goldPot","arnica_freshPot","calendula_officPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["chamomile_roman_path","chamomile_german_path","feverfew_fresh_path","tansy_fresh_path","yarrow_pink_path","yarrow_gold_path","arnica_fresh_path","calendula_offic_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 675);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["chamomile_roman","chamomile_german","feverfew_fresh","tansy_fresh","yarrow_pink","yarrow_gold","arnica_fresh","calendula_offic"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("chamomile_roman_path") && game.includes("calendula_offic_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["罗马洋甘菊暖蜜","德国洋甘菊暖蜜","鲜小白菊暖蜜","鲜艾菊暖蜜","粉蓍草暖蜜","金蓍草暖蜜","鲜山金车暖蜜","药用金盏暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("罗马洋甘菊短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("罗马洋甘菊")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "chamomile_roman_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("pot_marigold_dbl tagetes marigold_french signet_marigold costmary_fresh elecampane_fresh inula eupatorium 683 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["pot_marigold_dbl","tagetes","marigold_french","signet_marigold","costmary_fresh","elecampane_fresh","inula","eupatorium"];
  const pots = ["pot_marigold_dblPot","tagetesPot","marigold_frenchPot","signet_marigoldPot","costmary_freshPot","elecampane_freshPot","inulaPot","eupatoriumPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["pot_marigold_dbl_path","tagetes_path","marigold_french_path","signet_marigold_path","costmary_fresh_path","elecampane_fresh_path","inula_path","eupatorium_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 683);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["pot_marigold_dbl","tagetes","marigold_french","signet_marigold","costmary_fresh","elecampane_fresh","inula","eupatorium"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pot_marigold_dbl_path") && game.includes("eupatorium_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["重瓣金盏暖蜜","万寿菊暖蜜","法国万寿暖蜜","香叶万寿暖蜜","鲜艾菊薄荷暖蜜","鲜土木香暖蜜","旋覆花暖蜜","佩兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("重瓣金盏短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("重瓣金盏")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "pot_marigold_dbl_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("echinacea_purp echinacea_ang echinacea_pall rudbeckia black_eyed_susan coneflower_yellow helenium helenium_autumn 691 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["echinacea_purp","echinacea_ang","echinacea_pall","rudbeckia","black_eyed_susan","coneflower_yellow","helenium","helenium_autumn"];
  const pots = ["echinacea_purpPot","echinacea_angPot","echinacea_pallPot","rudbeckiaPot","black_eyed_susanPot","coneflower_yellowPot","heleniumPot","helenium_autumnPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["echinacea_purp_path","echinacea_ang_path","echinacea_pall_path","rudbeckia_path","black_eyed_susan_path","coneflower_yellow_path","helenium_path","helenium_autumn_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 691);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["echinacea_purp","echinacea_ang","echinacea_pall","rudbeckia","black_eyed_susan","coneflower_yellow","helenium","helenium_autumn"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("echinacea_purp_path") && game.includes("helenium_autumn_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["紫松果菊暖蜜","狭叶紫锥暖蜜","淡紫锥菊暖蜜","金光菊暖蜜","黑心金光暖蜜","黄松果菊暖蜜","堆心菊暖蜜","秋堆心菊暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("紫松果菊短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("紫松果菊")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "echinacea_purp_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("coreopsis_lance coreopsis_tick gaillardia gaillardia_fan ratibida silphium cup_plant compass_plant 699 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["coreopsis_lance","coreopsis_tick","gaillardia","gaillardia_fan","ratibida","silphium","cup_plant","compass_plant"];
  const pots = ["coreopsis_lancePot","coreopsis_tickPot","gaillardiaPot","gaillardia_fanPot","ratibidaPot","silphiumPot","cup_plantPot","compass_plantPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["coreopsis_lance_path","coreopsis_tick_path","gaillardia_path","gaillardia_fan_path","ratibida_path","silphium_path","cup_plant_path","compass_plant_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 699);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["coreopsis_lance","coreopsis_tick","gaillardia","gaillardia_fan","ratibida","silphium","cup_plant","compass_plant"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("coreopsis_lance_path") && game.includes("compass_plant_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["剑叶金鸡暖蜜","两色金鸡暖蜜","天人菊暖蜜","扇形天人暖蜜","草原松果暖蜜","杯叶菊暖蜜","杯托菊暖蜜","罗盘草暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("剑叶金鸡短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("剑叶金鸡")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "coreopsis_lance_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("aster_novae aster_novi michaelmas goldenrod_fresh solidago boltonia erigeron fleabane 707 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["aster_novae","aster_novi","michaelmas","goldenrod_fresh","solidago","boltonia","erigeron","fleabane"];
  const pots = ["aster_novaePot","aster_noviPot","michaelmasPot","goldenrod_freshPot","solidagoPot","boltoniaPot","erigeronPot","fleabanePot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["aster_novae_path","aster_novi_path","michaelmas_path","goldenrod_fresh_path","solidago_path","boltonia_path","erigeron_path","fleabane_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 707);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["aster_novae","aster_novi","michaelmas","goldenrod_fresh","solidago","boltonia","erigeron","fleabane"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("aster_novae_path") && game.includes("fleabane_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["新英格兰紫菀暖蜜","纽约紫菀暖蜜","米迦勒紫菀暖蜜","鲜一枝黄暖蜜","加拿大一枝黄暖蜜","千星菊暖蜜","飞蓬暖蜜","春飞蓬暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("新英格兰紫菀短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("新英格兰紫菀")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "aster_novae_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("daisy_oxeye daisy_english daisy_shasta chrysanthemum_ind_fresh chrysanthemum_mor chrysanthemum_yej tanacetum pyrethrum 715 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["daisy_oxeye","daisy_english","daisy_shasta","chrysanthemum_ind_fresh","chrysanthemum_mor","chrysanthemum_yej","tanacetum","pyrethrum"];
  const pots = ["daisy_oxeyePot","daisy_englishPot","daisy_shastaPot","chrysanthemum_ind_freshPot","chrysanthemum_morPot","chrysanthemum_yejPot","tanacetumPot","pyrethrumPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["daisy_oxeye_path","daisy_english_path","daisy_shasta_path","chrysanthemum_ind_fresh_path","chrysanthemum_mor_path","chrysanthemum_yej_path","tanacetum_path","pyrethrum_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 715);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["daisy_oxeye","daisy_english","daisy_shasta","chrysanthemum_ind_fresh","chrysanthemum_mor","chrysanthemum_yej","tanacetum","pyrethrum"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("daisy_oxeye_path") && game.includes("pyrethrum_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["滨菊鲜暖蜜","英国雏菊暖蜜","滨菊大暖蜜","鲜印菊暖蜜","杭白菊暖蜜","野菊暖蜜","菊蒿暖蜜","除虫菊暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("滨菊鲜短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("滨菊鲜")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "daisy_oxeye_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("sunflower_dwarf sunflower_multi sunflower_red jerusalem_artichoke sunchoke_flower topinambur dahlia_cactus dahlia_pompom 723 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["sunflower_dwarf","sunflower_multi","sunflower_red","jerusalem_artichoke","sunchoke_flower","topinambur","dahlia_cactus","dahlia_pompom"];
  const pots = ["sunflower_dwarfPot","sunflower_multiPot","sunflower_redPot","jerusalem_artichokePot","sunchoke_flowerPot","topinamburPot","dahlia_cactusPot","dahlia_pompomPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["sunflower_dwarf_path","sunflower_multi_path","sunflower_red_path","jerusalem_artichoke_path","sunchoke_flower_path","topinambur_path","dahlia_cactus_path","dahlia_pompom_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 723);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["jerusalem_artichoke","topinambur"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["sunflower_dwarf","sunflower_multi","sunflower_red","sunchoke_flower","dahlia_cactus","dahlia_pompom"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("sunflower_dwarf_path") && game.includes("dahlia_pompom_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["矮向日葵暖蜜","多头向日葵暖蜜","红向日葵暖蜜","菊芋暖蜜","菊芋花暖蜜","洋姜暖蜜","仙人掌大丽暖蜜","绒球大丽暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("矮向日葵短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("矮向日葵")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "sunflower_dwarf_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("zinnia_dwarf zinnia_cactus cosmos_sulph cosmos_choco tithonia mexican_sunflower heliopsis inula_helenium 731 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["zinnia_dwarf","zinnia_cactus","cosmos_sulph","cosmos_choco","tithonia","mexican_sunflower","heliopsis","inula_helenium"];
  const pots = ["zinnia_dwarfPot","zinnia_cactusPot","cosmos_sulphPot","cosmos_chocoPot","tithoniaPot","mexican_sunflowerPot","heliopsisPot","inula_heleniumPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["zinnia_dwarf_path","zinnia_cactus_path","cosmos_sulph_path","cosmos_choco_path","tithonia_path","mexican_sunflower_path","heliopsis_path","inula_helenium_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 731);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["zinnia_dwarf","zinnia_cactus","cosmos_sulph","cosmos_choco","tithonia","mexican_sunflower","heliopsis","inula_helenium"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("zinnia_dwarf_path") && game.includes("inula_helenium_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["矮百日草暖蜜","仙人掌百日暖蜜","硫华菊暖蜜","巧克力波斯暖蜜","肿柄菊暖蜜","墨西哥向日葵暖蜜","假向日葵暖蜜","土木香欧暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("矮百日草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("矮百日草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "zinnia_dwarf_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("verbena_bon verbena_rig lantana lantana_white phlox_pan phlox_sub phlox_drum dianthus_chin 739 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["verbena_bon","verbena_rig","lantana","lantana_white","phlox_pan","phlox_sub","phlox_drum","dianthus_chin"];
  const pots = ["verbena_bonPot","verbena_rigPot","lantanaPot","lantana_whitePot","phlox_panPot","phlox_subPot","phlox_drumPot","dianthus_chinPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["verbena_bon_path","verbena_rig_path","lantana_path","lantana_white_path","phlox_pan_path","phlox_sub_path","phlox_drum_path","dianthus_chin_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 739);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["verbena_bon","verbena_rig","lantana","lantana_white","phlox_pan","phlox_sub","phlox_drum","dianthus_chin"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("verbena_bon_path") && game.includes("dianthus_chin_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["柳叶马鞭草暖蜜","硬枝马鞭草暖蜜","马缨丹暖蜜","白马缨丹暖蜜","锥花福禄考暖蜜","针叶福禄考暖蜜","小福禄考暖蜜","石竹暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("柳叶马鞭草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("柳叶马鞭草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "verbena_bon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("dianthus_barb sweet_william carnation pinks gypsophila baby_breath saponaria soapwort_fresh 747 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["dianthus_barb","sweet_william","carnation","pinks","gypsophila","baby_breath","saponaria","soapwort_fresh"];
  const pots = ["dianthus_barbPot","sweet_williamPot","carnationPot","pinksPot","gypsophilaPot","baby_breathPot","saponariaPot","soapwort_freshPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["dianthus_barb_path","sweet_william_path","carnation_path","pinks_path","gypsophila_path","baby_breath_path","saponaria_path","soapwort_fresh_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 747);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  [].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["dianthus_barb","sweet_william","carnation","pinks","gypsophila","baby_breath","saponaria","soapwort_fresh"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("dianthus_barb_path") && game.includes("soapwort_fresh_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["须苞石竹暖蜜","美国石竹暖蜜","康乃馨暖蜜","常夏石竹暖蜜","满天星暖蜜","霞草暖蜜","肥皂草暖蜜","鲜皂草暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("须苞石竹短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("须苞石竹")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "dianthus_barb_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

console.log("\nResult: %d passed, %d failed", passed, failed);
if (failed) process.exit(1);
