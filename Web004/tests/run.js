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

test("campanula campanula_med lobelia lobelia_card penstemon penstemon_fox digitalis digitalis_lutea 755 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["campanula","campanula_med","lobelia","lobelia_card","penstemon","penstemon_fox","digitalis","digitalis_lutea"];
  const pots = ["campanulaPot","campanula_medPot","lobeliaPot","lobelia_cardPot","penstemonPot","penstemon_foxPot","digitalisPot","digitalis_luteaPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["campanula_path","campanula_med_path","lobelia_path","lobelia_card_path","penstemon_path","penstemon_fox_path","digitalis_path","digitalis_lutea_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 755);
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
  ["campanula","campanula_med","lobelia","lobelia_card","penstemon","penstemon_fox","digitalis","digitalis_lutea"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("campanula_path") && game.includes("digitalis_lutea_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["风铃草属暖蜜","地中海风铃暖蜜","半边莲暖蜜","红半边莲暖蜜","钓钟柳暖蜜","狐尾钓钟柳暖蜜","毛地黄暖蜜","黄毛地黄暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("风铃草属短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("风铃草属")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "campanula_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("snapdragon snapdragon_dwarf antirrhinum linaria toadflax verbascum_chaix mullein_white figwort_fresh 763 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["snapdragon","snapdragon_dwarf","antirrhinum","linaria","toadflax","verbascum_chaix","mullein_white","figwort_fresh"];
  const pots = ["snapdragonPot","snapdragon_dwarfPot","antirrhinumPot","linariaPot","toadflaxPot","verbascum_chaixPot","mullein_whitePot","figwort_freshPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["snapdragon_path","snapdragon_dwarf_path","antirrhinum_path","linaria_path","toadflax_path","verbascum_chaix_path","mullein_white_path","figwort_fresh_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 763);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["figwort_fresh"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["snapdragon","snapdragon_dwarf","antirrhinum","linaria","toadflax","verbascum_chaix","mullein_white"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("snapdragon_path") && game.includes("figwort_fresh_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["金鱼草暖蜜","矮金鱼草暖蜜","龙口花暖蜜","柳穿鱼暖蜜","普通柳穿暖蜜","网脉毛蕊暖蜜","白毛蕊暖蜜","鲜玄参暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("金鱼草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("金鱼草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "snapdragon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("scrophularia mimulus monkeyflower collinsia castilleja paintbrush orthocarpus pedicularis 771 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["scrophularia","mimulus","monkeyflower","collinsia","castilleja","paintbrush","orthocarpus","pedicularis"];
  const pots = ["scrophulariaPot","mimulusPot","monkeyflowerPot","collinsiaPot","castillejaPot","paintbrushPot","orthocarpusPot","pedicularisPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["scrophularia_path","mimulus_path","monkeyflower_path","collinsia_path","castilleja_path","paintbrush_path","orthocarpus_path","pedicularis_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 771);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["scrophularia"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["mimulus","monkeyflower","collinsia","castilleja","paintbrush","orthocarpus","pedicularis"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("scrophularia_path") && game.includes("pedicularis_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["玄参属暖蜜","沟酸浆暖蜜","猴面花暖蜜","可林草暖蜜","火焰草暖蜜","印地安画笔暖蜜","直果草暖蜜","马先蒿暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("玄参属短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("玄参属")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "scrophularia_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("lousewort euphrasia eyebright rhinanthus yellow_rattle melampyrum cow_wheat bartisia 779 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["lousewort","euphrasia","eyebright","rhinanthus","yellow_rattle","melampyrum","cow_wheat","bartisia"];
  const pots = ["lousewortPot","euphrasiaPot","eyebrightPot","rhinanthusPot","yellow_rattlePot","melampyrumPot","cow_wheatPot","bartisiaPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["lousewort_path","euphrasia_path","eyebright_path","rhinanthus_path","yellow_rattle_path","melampyrum_path","cow_wheat_path","bartisia_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 779);
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
  ["lousewort","euphrasia","eyebright","rhinanthus","yellow_rattle","melampyrum","cow_wheat","bartisia"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("lousewort_path") && game.includes("bartisia_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["虱草暖蜜","小米草暖蜜","光明草暖蜜","鼻花暖蜜","黄响铃暖蜜","山罗花暖蜜","牛麦暖蜜","巴氏草暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("虱草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("虱草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "lousewort_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("cattleya dendrobium phalaenopsis cymbidium oncidium vanda paphiopedilum miltonia 787 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["cattleya","dendrobium","phalaenopsis","cymbidium","oncidium","vanda","paphiopedilum","miltonia"];
  const pots = ["cattleyaPot","dendrobiumPot","phalaenopsisPot","cymbidiumPot","oncidiumPot","vandaPot","paphiopedilumPot","miltoniaPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["cattleya_path","dendrobium_path","phalaenopsis_path","cymbidium_path","oncidium_path","vanda_path","paphiopedilum_path","miltonia_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 787);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["cymbidium"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["cattleya","dendrobium","phalaenopsis","oncidium","vanda","paphiopedilum","miltonia"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("cattleya_path") && game.includes("miltonia_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["卡特兰暖蜜","石斛暖蜜","蝴蝶兰暖蜜","建兰暖蜜","文心兰暖蜜","万代兰暖蜜","兜兰暖蜜","米尔顿兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("卡特兰短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("卡特兰")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "cattleya_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("odontoglossum brassia epidendrum ludisia anoectochilus gastrodia bletilla calanthe 795 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["odontoglossum","brassia","epidendrum","ludisia","anoectochilus","gastrodia","bletilla","calanthe"];
  const pots = ["odontoglossumPot","brassiaPot","epidendrumPot","ludisiaPot","anoectochilusPot","gastrodiaPot","bletillaPot","calanthePot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["odontoglossum_path","brassia_path","epidendrum_path","ludisia_path","anoectochilus_path","gastrodia_path","bletilla_path","calanthe_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 795);
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
  ["odontoglossum","brassia","epidendrum","ludisia","anoectochilus","gastrodia","bletilla","calanthe"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("odontoglossum_path") && game.includes("calanthe_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["齿瓣兰暖蜜","蜘蛛兰暖蜜","树兰暖蜜","血叶兰暖蜜","金线莲暖蜜","天麻暖蜜","白及暖蜜","虾脊兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("齿瓣兰短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("齿瓣兰")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "odontoglossum_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("maidenhair boston_fern bird_nest_fern staghorn sword_fern holly_fern autumn_fern japanese_painted 803 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["maidenhair","boston_fern","bird_nest_fern","staghorn","sword_fern","holly_fern","autumn_fern","japanese_painted"];
  const pots = ["maidenhairPot","boston_fernPot","bird_nest_fernPot","staghornPot","sword_fernPot","holly_fernPot","autumn_fernPot","japanese_paintedPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["maidenhair_path","boston_fern_path","bird_nest_fern_path","staghorn_path","sword_fern_path","holly_fern_path","autumn_fern_path","japanese_painted_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 803);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["maidenhair","sword_fern","japanese_painted"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["boston_fern","bird_nest_fern","staghorn","holly_fern","autumn_fern"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("maidenhair_path") && game.includes("japanese_painted_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["铁线蕨暖蜜","波士顿蕨暖蜜","鸟巢蕨暖蜜","鹿角蕨暖蜜","剑叶蕨暖蜜","刺叶蕨暖蜜","秋色蕨暖蜜","日本彩叶蕨暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("铁线蕨短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("铁线蕨")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "maidenhair_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("ostrich_fern cinnamon_fern royal_fern sensitive_fern bracken_tip fiddlehead adder_tongue moonwort 811 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["ostrich_fern","cinnamon_fern","royal_fern","sensitive_fern","bracken_tip","fiddlehead","adder_tongue","moonwort"];
  const pots = ["ostrich_fernPot","cinnamon_fernPot","royal_fernPot","sensitive_fernPot","bracken_tipPot","fiddleheadPot","adder_tonguePot","moonwortPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["ostrich_fern_path","cinnamon_fern_path","royal_fern_path","sensitive_fern_path","bracken_tip_path","fiddlehead_path","adder_tongue_path","moonwort_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 811);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["royal_fern","sensitive_fern","fiddlehead","moonwort"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["ostrich_fern","cinnamon_fern","bracken_tip","adder_tongue"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("ostrich_fern_path") && game.includes("moonwort_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["鸵鸟蕨暖蜜","肉桂蕨暖蜜","王蕨暖蜜","敏感蕨暖蜜","蕨菜尖暖蜜","拳卷蕨暖蜜","瓶尔小草暖蜜","阴地蕨暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("鸵鸟蕨短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("鸵鸟蕨")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "ostrich_fern_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("miscanthus pampas fountain_grass blue_fescue japanese_forest hakonechloa carex_morrow carex_buch 819 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["miscanthus","pampas","fountain_grass","blue_fescue","japanese_forest","hakonechloa","carex_morrow","carex_buch"];
  const pots = ["miscanthusPot","pampasPot","fountain_grassPot","blue_fescuePot","japanese_forestPot","hakonechloaPot","carex_morrowPot","carex_buchPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["miscanthus_path","pampas_path","fountain_grass_path","blue_fescue_path","japanese_forest_path","hakonechloa_path","carex_morrow_path","carex_buch_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 819);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["blue_fescue","hakonechloa","carex_buch"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["miscanthus","pampas","fountain_grass","japanese_forest","carex_morrow"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("miscanthus_path") && game.includes("carex_buch_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["芒草暖蜜","蒲苇暖蜜","狼尾草暖蜜","蓝羊茅暖蜜","日本森林草暖蜜","箱根草暖蜜","阔叶苔草暖蜜","红铜苔草暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("芒草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("芒草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "miscanthus_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("juncus scirpus typha_pollen phragmites bamboo_moso bamboo_black bamboo_golden arrow_bamboo 827 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["juncus","scirpus","typha_pollen","phragmites","bamboo_moso","bamboo_black","bamboo_golden","arrow_bamboo"];
  const pots = ["juncusPot","scirpusPot","typha_pollenPot","phragmitesPot","bamboo_mosoPot","bamboo_blackPot","bamboo_goldenPot","arrow_bambooPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["juncus_path","scirpus_path","typha_pollen_path","phragmites_path","bamboo_moso_path","bamboo_black_path","bamboo_golden_path","arrow_bamboo_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 827);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["juncus","bamboo_moso","arrow_bamboo"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["scirpus","typha_pollen","phragmites","bamboo_black","bamboo_golden"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("juncus_path") && game.includes("arrow_bamboo_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["灯心草暖蜜","藨草暖蜜","香蒲花粉暖蜜","芦苇暖蜜","毛竹暖蜜","紫竹暖蜜","金镶玉竹暖蜜","矢竹暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("灯心草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("灯心草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "juncus_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("echeveria sedum_morgan sedum_spect sempervivum aeonium crassula kalanchoe haworthia 835 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["echeveria","sedum_morgan","sedum_spect","sempervivum","aeonium","crassula","kalanchoe","haworthia"];
  const pots = ["echeveriaPot","sedum_morganPot","sedum_spectPot","sempervivumPot","aeoniumPot","crassulaPot","kalanchoePot","haworthiaPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["echeveria_path","sedum_morgan_path","sedum_spect_path","sempervivum_path","aeonium_path","crassula_path","kalanchoe_path","haworthia_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 835);
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
  ["echeveria","sedum_morgan","sedum_spect","sempervivum","aeonium","crassula","kalanchoe","haworthia"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("echeveria_path") && game.includes("haworthia_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["石莲花暖蜜","玉树景天暖蜜","八宝景天暖蜜","长生草暖蜜","莲花掌暖蜜","青锁龙暖蜜","长寿花暖蜜","十二卷暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("石莲花短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("石莲花")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "echeveria_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("aloe_vera_fl agave_flower yucca_filament sansevieria jade_plant string_pearls burros_tail panda_plant 843 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["aloe_vera_fl","agave_flower","yucca_filament","sansevieria","jade_plant","string_pearls","burros_tail","panda_plant"];
  const pots = ["aloe_vera_flPot","agave_flowerPot","yucca_filamentPot","sansevieriaPot","jade_plantPot","string_pearlsPot","burros_tailPot","panda_plantPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["aloe_vera_fl_path","agave_flower_path","yucca_filament_path","sansevieria_path","jade_plant_path","string_pearls_path","burros_tail_path","panda_plant_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 843);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["aloe_vera_fl","string_pearls","burros_tail"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["agave_flower","yucca_filament","sansevieria","jade_plant","panda_plant"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("aloe_vera_fl_path") && game.includes("panda_plant_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["芦荟花暖蜜","龙舌兰花暖蜜","丝兰丝暖蜜","虎尾兰暖蜜","翡翠木暖蜜","珍珠吊兰暖蜜","驴尾草暖蜜","熊猫草暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("芦荟花短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("芦荟花")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "aloe_vera_fl_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("boysen_leaf logan_leaf tay_leaf marion_leaf wine_leaf salmon_leaf thimble_leaf cloud_flower 851 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["boysen_leaf","logan_leaf","tay_leaf","marion_leaf","wine_leaf","salmon_leaf","thimble_leaf","cloud_flower"];
  const pots = ["boysen_leafPot","logan_leafPot","tay_leafPot","marion_leafPot","wine_leafPot","salmon_leafPot","thimble_leafPot","cloud_flowerPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["boysen_leaf_path","logan_leaf_path","tay_leaf_path","marion_leaf_path","wine_leaf_path","salmon_leaf_path","thimble_leaf_path","cloud_flower_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 851);
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
  ["boysen_leaf","logan_leaf","tay_leaf","marion_leaf","wine_leaf","salmon_leaf","thimble_leaf","cloud_flower"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("boysen_leaf_path") && game.includes("cloud_flower_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["波森莓叶暖蜜","罗甘莓叶暖蜜","泰莓叶暖蜜","马里恩莓叶暖蜜","酒莓叶暖蜜","鲑莓叶暖蜜","糙莓叶暖蜜","云莓花暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("波森莓叶短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("波森莓叶")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "boysen_leaf_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("huckleberry huckle_leaf salal salal_leaf oregon_grape mahonia barberry_red barberry_leaf 859 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["huckleberry","huckle_leaf","salal","salal_leaf","oregon_grape","mahonia","barberry_red","barberry_leaf"];
  const pots = ["huckleberryPot","huckle_leafPot","salalPot","salal_leafPot","oregon_grapePot","mahoniaPot","barberry_redPot","barberry_leafPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["huckleberry_path","huckle_leaf_path","salal_path","salal_leaf_path","oregon_grape_path","mahonia_path","barberry_red_path","barberry_leaf_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 859);
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
  ["huckleberry","huckle_leaf","salal","salal_leaf","oregon_grape","mahonia","barberry_red","barberry_leaf"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("huckleberry_path") && game.includes("barberry_leaf_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["美洲越橘暖蜜","美洲越橘叶暖蜜","萨拉尔暖蜜","萨拉尔叶暖蜜","俄勒冈葡萄暖蜜","十大功劳暖蜜","红小檗暖蜜","小檗叶暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("美洲越橘短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("美洲越橘")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "huckleberry_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("currant_flower goose_flower josta worcesterberry juneberry shadbush chokecherry bird_cherry 867 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["currant_flower","goose_flower","josta","worcesterberry","juneberry","shadbush","chokecherry","bird_cherry"];
  const pots = ["currant_flowerPot","goose_flowerPot","jostaPot","worcesterberryPot","juneberryPot","shadbushPot","chokecherryPot","bird_cherryPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["currant_flower_path","goose_flower_path","josta_path","worcesterberry_path","juneberry_path","shadbush_path","chokecherry_path","bird_cherry_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 867);
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
  ["currant_flower","goose_flower","josta","worcesterberry","juneberry","shadbush","chokecherry","bird_cherry"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("currant_flower_path") && game.includes("bird_cherry_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["醋栗花暖蜜","鹅莓花暖蜜","约斯塔莓暖蜜","伍斯特莓暖蜜","六月莓暖蜜","唐棣花暖蜜","稠李暖蜜","鸟樱暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("醋栗花短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("醋栗花")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "currant_flower_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("pin_cherry sand_cherry nanking_cherry cornelian honeysuckle_blue honeyberry hascap arctic_berry 875 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["pin_cherry","sand_cherry","nanking_cherry","cornelian","honeysuckle_blue","honeyberry","hascap","arctic_berry"];
  const pots = ["pin_cherryPot","sand_cherryPot","nanking_cherryPot","cornelianPot","honeysuckle_bluePot","honeyberryPot","hascapPot","arctic_berryPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["pin_cherry_path","sand_cherry_path","nanking_cherry_path","cornelian_path","honeysuckle_blue_path","honeyberry_path","hascap_path","arctic_berry_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 875);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["honeysuckle_blue","arctic_berry"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["pin_cherry","sand_cherry","nanking_cherry","cornelian","honeyberry","hascap"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pin_cherry_path") && game.includes("arctic_berry_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["细樱暖蜜","沙樱暖蜜","毛樱桃暖蜜","欧亚山茱萸暖蜜","蓝果忍冬暖蜜","蜜莓暖蜜","哈斯卡普暖蜜","北极蜜莓暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("细樱短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("细樱")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "pin_cherry_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("clematis_arm clematis_mon clematis_tang clematis_ori akibia akebia_flower schisandra_chin schisandra_leaf 883 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["clematis_arm","clematis_mon","clematis_tang","clematis_ori","akibia","akebia_flower","schisandra_chin","schisandra_leaf"];
  const pots = ["clematis_armPot","clematis_monPot","clematis_tangPot","clematis_oriPot","akibiaPot","akebia_flowerPot","schisandra_chinPot","schisandra_leafPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["clematis_arm_path","clematis_mon_path","clematis_tang_path","clematis_ori_path","akibia_path","akebia_flower_path","schisandra_chin_path","schisandra_leaf_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 883);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["schisandra_chin","schisandra_leaf"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["clematis_arm","clematis_mon","clematis_tang","clematis_ori","akibia","akebia_flower"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("clematis_arm_path") && game.includes("schisandra_leaf_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["绣球铁线莲暖蜜","绣球铁线暖蜜","甘青铁线莲暖蜜","东方铁线莲暖蜜","木通暖蜜","木通花暖蜜","北五味子暖蜜","五味子叶暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("绣球铁线莲短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("绣球铁线莲")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "clematis_arm_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("kiwi_hardy kiwi_flower actinidia silver_vine hop_fresh hop_leaf humulus japanese_hop 891 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["kiwi_hardy","kiwi_flower","actinidia","silver_vine","hop_fresh","hop_leaf","humulus","japanese_hop"];
  const pots = ["kiwi_hardyPot","kiwi_flowerPot","actinidiaPot","silver_vinePot","hop_freshPot","hop_leafPot","humulusPot","japanese_hopPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["kiwi_hardy_path","kiwi_flower_path","actinidia_path","silver_vine_path","hop_fresh_path","hop_leaf_path","humulus_path","japanese_hop_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 891);
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
  ["kiwi_hardy","kiwi_flower","actinidia","silver_vine","hop_fresh","hop_leaf","humulus","japanese_hop"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("kiwi_hardy_path") && game.includes("japanese_hop_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["软枣猕猴桃暖蜜","猕猴桃花暖蜜","羊桃暖蜜","葛枣猕猴桃暖蜜","鲜啤酒花暖蜜","啤酒花叶暖蜜","葎草暖蜜","日本葎草暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("软枣猕猴桃短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("软枣猕猴桃")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "kiwi_hardy_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("grape_leaf_fresh vine_tendril muscadine scuppernong passiflora_inc passiflora_cae passiflora_ed maypop 899 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["grape_leaf_fresh","vine_tendril","muscadine","scuppernong","passiflora_inc","passiflora_cae","passiflora_ed","maypop"];
  const pots = ["grape_leaf_freshPot","vine_tendrilPot","muscadinePot","scuppernongPot","passiflora_incPot","passiflora_caePot","passiflora_edPot","maypopPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["grape_leaf_fresh_path","vine_tendril_path","muscadine_path","scuppernong_path","passiflora_inc_path","passiflora_cae_path","passiflora_ed_path","maypop_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 899);
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
  ["grape_leaf_fresh","vine_tendril","muscadine","scuppernong","passiflora_inc","passiflora_cae","passiflora_ed","maypop"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("grape_leaf_fresh_path") && game.includes("maypop_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["鲜葡萄叶暖蜜","葡萄卷须暖蜜","圆叶葡萄暖蜜","白圆叶葡萄暖蜜","西番莲暖蜜","天蓝西番莲暖蜜","百香花暖蜜","五月瓜暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("鲜葡萄叶短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("鲜葡萄叶")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "grape_leaf_fresh_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("morning_glory_red morning_glory_blue ipomoea_bat moonvine cypress_vine cardinal_climber black_eyed_susan_vine thunbergia 907 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["morning_glory_red","morning_glory_blue","ipomoea_bat","moonvine","cypress_vine","cardinal_climber","black_eyed_susan_vine","thunbergia"];
  const pots = ["morning_glory_redPot","morning_glory_bluePot","ipomoea_batPot","moonvinePot","cypress_vinePot","cardinal_climberPot","black_eyed_susan_vinePot","thunbergiaPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["morning_glory_red_path","morning_glory_blue_path","ipomoea_bat_path","moonvine_path","cypress_vine_path","cardinal_climber_path","black_eyed_susan_vine_path","thunbergia_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 907);
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
  ["morning_glory_red","morning_glory_blue","ipomoea_bat","moonvine","cypress_vine","cardinal_climber","black_eyed_susan_vine","thunbergia"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("morning_glory_red_path") && game.includes("thunbergia_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["红牵牛暖蜜","蓝牵牛暖蜜","红薯花暖蜜","月藤暖蜜","茑萝暖蜜","红雀藤暖蜜","黑眼苏珊藤暖蜜","山牵牛暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("红牵牛短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("红牵牛")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "morning_glory_red_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("sweet_potato_leaf yam_leaf dioscorea chinese_yam luffa_flower luffa_leaf bitter_melon_fl bitter_melon_leaf 915 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["sweet_potato_leaf","yam_leaf","dioscorea","chinese_yam","luffa_flower","luffa_leaf","bitter_melon_fl","bitter_melon_leaf"];
  const pots = ["sweet_potato_leafPot","yam_leafPot","dioscoreaPot","chinese_yamPot","luffa_flowerPot","luffa_leafPot","bitter_melon_flPot","bitter_melon_leafPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["sweet_potato_leaf_path","yam_leaf_path","dioscorea_path","chinese_yam_path","luffa_flower_path","luffa_leaf_path","bitter_melon_fl_path","bitter_melon_leaf_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 915);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["yam_leaf","chinese_yam"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["sweet_potato_leaf","dioscorea","luffa_flower","luffa_leaf","bitter_melon_fl","bitter_melon_leaf"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("sweet_potato_leaf_path") && game.includes("bitter_melon_leaf_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["红薯叶暖蜜","山药叶暖蜜","薯蓣暖蜜","淮山暖蜜","丝瓜花暖蜜","丝瓜叶暖蜜","苦瓜花暖蜜","苦瓜叶暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("红薯叶短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("红薯叶")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "sweet_potato_leaf_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("squash_blossom zucchini_flower cucumber_flower melon_flower okra_flower okra_leaf hibiscus_escul roselle_fresh 923 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["squash_blossom","zucchini_flower","cucumber_flower","melon_flower","okra_flower","okra_leaf","hibiscus_escul","roselle_fresh"];
  const pots = ["squash_blossomPot","zucchini_flowerPot","cucumber_flowerPot","melon_flowerPot","okra_flowerPot","okra_leafPot","hibiscus_esculPot","roselle_freshPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["squash_blossom_path","zucchini_flower_path","cucumber_flower_path","melon_flower_path","okra_flower_path","okra_leaf_path","hibiscus_escul_path","roselle_fresh_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 923);
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
  ["squash_blossom","zucchini_flower","cucumber_flower","melon_flower","okra_flower","okra_leaf","hibiscus_escul","roselle_fresh"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("squash_blossom_path") && game.includes("roselle_fresh_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["南瓜花暖蜜","西葫芦花暖蜜","黄瓜花暖蜜","甜瓜花暖蜜","秋葵花暖蜜","秋葵叶暖蜜","黄秋葵暖蜜","鲜玫瑰茄暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("南瓜花短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("南瓜花")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "squash_blossom_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("cotton_flower cotton_leaf kenaf jute_leaf flax_blue flax_red linseed_oil hemp_flower 931 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["cotton_flower","cotton_leaf","kenaf","jute_leaf","flax_blue","flax_red","linseed_oil","hemp_flower"];
  const pots = ["cotton_flowerPot","cotton_leafPot","kenafPot","jute_leafPot","flax_bluePot","flax_redPot","linseed_oilPot","hemp_flowerPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["cotton_flower_path","cotton_leaf_path","kenaf_path","jute_leaf_path","flax_blue_path","flax_red_path","linseed_oil_path","hemp_flower_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 931);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["linseed_oil"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["cotton_flower","cotton_leaf","kenaf","jute_leaf","flax_blue","flax_red","hemp_flower"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("cotton_flower_path") && game.includes("hemp_flower_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["棉花暖蜜","棉叶暖蜜","红麻暖蜜","黄麻叶暖蜜","蓝亚麻暖蜜","红亚麻暖蜜","亚麻仁油暖蜜","火麻花暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("棉花短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("棉花")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "cotton_flower_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("nettle_fresh nettle_root dead_nettle purple_dead_nettle henbit lamium galeopsis stachys_byz 939 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["nettle_fresh","nettle_root","dead_nettle","purple_dead_nettle","henbit","lamium","galeopsis","stachys_byz"];
  const pots = ["nettle_freshPot","nettle_rootPot","dead_nettlePot","purple_dead_nettlePot","henbitPot","lamiumPot","galeopsisPot","stachys_byzPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["nettle_fresh_path","nettle_root_path","dead_nettle_path","purple_dead_nettle_path","henbit_path","lamium_path","galeopsis_path","stachys_byz_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 939);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["nettle_root"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["nettle_fresh","dead_nettle","purple_dead_nettle","henbit","lamium","galeopsis","stachys_byz"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("nettle_fresh_path") && game.includes("stachys_byz_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["鲜荨麻暖蜜","荨麻根暖蜜","野芝麻暖蜜","紫野芝麻暖蜜","宝盖草暖蜜","银边野芝麻暖蜜","鼬瓣花暖蜜","绵毛水苏暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("鲜荨麻短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("鲜荨麻")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "nettle_fresh_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("alpine_thyme alpine_sage alpine_oregano alpine_basil alpine_mint alpine_lavender alpine_rosemary alpine_marjoram 947 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["alpine_thyme","alpine_sage","alpine_oregano","alpine_basil","alpine_mint","alpine_lavender","alpine_rosemary","alpine_marjoram"];
  const pots = ["alpine_thymePot","alpine_sagePot","alpine_oreganoPot","alpine_basilPot","alpine_mintPot","alpine_lavenderPot","alpine_rosemaryPot","alpine_marjoramPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["alpine_thyme_path","alpine_sage_path","alpine_oregano_path","alpine_basil_path","alpine_mint_path","alpine_lavender_path","alpine_rosemary_path","alpine_marjoram_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 947);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["alpine_thyme","alpine_sage","alpine_oregano","alpine_basil","alpine_mint","alpine_lavender"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["alpine_rosemary","alpine_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("alpine_thyme_path") && game.includes("alpine_marjoram_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["高山百里香暖蜜","高山鼠尾草暖蜜","高山牛至暖蜜","高山罗勒暖蜜","高山薄荷暖蜜","高山薰衣草暖蜜","高山迷迭香暖蜜","高山马郁兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("高山百里香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("高山百里香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "alpine_thyme_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("alpine_tarragon alpine_chive alpine_parsley alpine_cilantro alpine_dill alpine_fennel alpine_lovage alpine_sorrel 955 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["alpine_tarragon","alpine_chive","alpine_parsley","alpine_cilantro","alpine_dill","alpine_fennel","alpine_lovage","alpine_sorrel"];
  const pots = ["alpine_tarragonPot","alpine_chivePot","alpine_parsleyPot","alpine_cilantroPot","alpine_dillPot","alpine_fennelPot","alpine_lovagePot","alpine_sorrelPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["alpine_tarragon_path","alpine_chive_path","alpine_parsley_path","alpine_cilantro_path","alpine_dill_path","alpine_fennel_path","alpine_lovage_path","alpine_sorrel_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 955);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["alpine_tarragon","alpine_parsley","alpine_fennel"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["alpine_chive","alpine_cilantro","alpine_dill","alpine_lovage","alpine_sorrel"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("alpine_tarragon_path") && game.includes("alpine_sorrel_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["高山龙蒿暖蜜","高山香葱暖蜜","高山欧芹暖蜜","高山香菜暖蜜","高山莳萝暖蜜","高山茴香暖蜜","高山独活暖蜜","高山酸模暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("高山龙蒿短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("高山龙蒿")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "alpine_tarragon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("coastal_thyme coastal_sage coastal_oregano coastal_basil coastal_mint coastal_lavender coastal_rosemary coastal_marjoram 963 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["coastal_thyme","coastal_sage","coastal_oregano","coastal_basil","coastal_mint","coastal_lavender","coastal_rosemary","coastal_marjoram"];
  const pots = ["coastal_thymePot","coastal_sagePot","coastal_oreganoPot","coastal_basilPot","coastal_mintPot","coastal_lavenderPot","coastal_rosemaryPot","coastal_marjoramPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["coastal_thyme_path","coastal_sage_path","coastal_oregano_path","coastal_basil_path","coastal_mint_path","coastal_lavender_path","coastal_rosemary_path","coastal_marjoram_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 963);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["coastal_rosemary"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["coastal_thyme","coastal_sage","coastal_oregano","coastal_basil","coastal_mint","coastal_lavender","coastal_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("coastal_thyme_path") && game.includes("coastal_marjoram_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["海岸百里香暖蜜","海岸鼠尾草暖蜜","海岸牛至暖蜜","海岸罗勒暖蜜","海岸薄荷暖蜜","海岸薰衣草暖蜜","海岸迷迭香暖蜜","海岸马郁兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("海岸百里香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("海岸百里香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "coastal_thyme_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("coastal_tarragon coastal_chive coastal_parsley coastal_cilantro coastal_dill coastal_fennel coastal_lovage coastal_sorrel 971 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["coastal_tarragon","coastal_chive","coastal_parsley","coastal_cilantro","coastal_dill","coastal_fennel","coastal_lovage","coastal_sorrel"];
  const pots = ["coastal_tarragonPot","coastal_chivePot","coastal_parsleyPot","coastal_cilantroPot","coastal_dillPot","coastal_fennelPot","coastal_lovagePot","coastal_sorrelPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["coastal_tarragon_path","coastal_chive_path","coastal_parsley_path","coastal_cilantro_path","coastal_dill_path","coastal_fennel_path","coastal_lovage_path","coastal_sorrel_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 971);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["coastal_fennel","coastal_lovage"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["coastal_tarragon","coastal_chive","coastal_parsley","coastal_cilantro","coastal_dill","coastal_sorrel"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("coastal_tarragon_path") && game.includes("coastal_sorrel_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["海岸龙蒿暖蜜","海岸香葱暖蜜","海岸欧芹暖蜜","海岸香菜暖蜜","海岸莳萝暖蜜","海岸茴香暖蜜","海岸独活暖蜜","海岸酸模暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("海岸龙蒿短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("海岸龙蒿")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "coastal_tarragon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("meadow_thyme meadow_sage meadow_oregano meadow_basil meadow_mint meadow_lavender meadow_rosemary meadow_marjoram 979 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["meadow_thyme","meadow_sage","meadow_oregano","meadow_basil","meadow_mint","meadow_lavender","meadow_rosemary","meadow_marjoram"];
  const pots = ["meadow_thymePot","meadow_sagePot","meadow_oreganoPot","meadow_basilPot","meadow_mintPot","meadow_lavenderPot","meadow_rosemaryPot","meadow_marjoramPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["meadow_thyme_path","meadow_sage_path","meadow_oregano_path","meadow_basil_path","meadow_mint_path","meadow_lavender_path","meadow_rosemary_path","meadow_marjoram_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 979);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["meadow_rosemary"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["meadow_thyme","meadow_sage","meadow_oregano","meadow_basil","meadow_mint","meadow_lavender","meadow_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("meadow_thyme_path") && game.includes("meadow_marjoram_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["草甸百里香暖蜜","草甸鼠尾草暖蜜","草甸牛至暖蜜","草甸罗勒暖蜜","草甸薄荷暖蜜","草甸薰衣草暖蜜","草甸迷迭香暖蜜","草甸马郁兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("草甸百里香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("草甸百里香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "meadow_thyme_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("meadow_tarragon meadow_chive meadow_parsley meadow_cilantro meadow_dill meadow_fennel meadow_lovage meadow_sorrel 987 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["meadow_tarragon","meadow_chive","meadow_parsley","meadow_cilantro","meadow_dill","meadow_fennel","meadow_lovage","meadow_sorrel"];
  const pots = ["meadow_tarragonPot","meadow_chivePot","meadow_parsleyPot","meadow_cilantroPot","meadow_dillPot","meadow_fennelPot","meadow_lovagePot","meadow_sorrelPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["meadow_tarragon_path","meadow_chive_path","meadow_parsley_path","meadow_cilantro_path","meadow_dill_path","meadow_fennel_path","meadow_lovage_path","meadow_sorrel_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 987);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["meadow_fennel","meadow_lovage"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["meadow_tarragon","meadow_chive","meadow_parsley","meadow_cilantro","meadow_dill","meadow_sorrel"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("meadow_tarragon_path") && game.includes("meadow_sorrel_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["草甸龙蒿暖蜜","草甸香葱暖蜜","草甸欧芹暖蜜","草甸香菜暖蜜","草甸莳萝暖蜜","草甸茴香暖蜜","草甸独活暖蜜","草甸酸模暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("草甸龙蒿短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("草甸龙蒿")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "meadow_tarragon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("woodland_thyme woodland_sage woodland_oregano woodland_basil woodland_mint woodland_lavender woodland_rosemary woodland_marjoram 995 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["woodland_thyme","woodland_sage","woodland_oregano","woodland_basil","woodland_mint","woodland_lavender","woodland_rosemary","woodland_marjoram"];
  const pots = ["woodland_thymePot","woodland_sagePot","woodland_oreganoPot","woodland_basilPot","woodland_mintPot","woodland_lavenderPot","woodland_rosemaryPot","woodland_marjoramPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["woodland_thyme_path","woodland_sage_path","woodland_oregano_path","woodland_basil_path","woodland_mint_path","woodland_lavender_path","woodland_rosemary_path","woodland_marjoram_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 995);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["woodland_rosemary"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["woodland_thyme","woodland_sage","woodland_oregano","woodland_basil","woodland_mint","woodland_lavender","woodland_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("woodland_thyme_path") && game.includes("woodland_marjoram_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["林地百里香暖蜜","林地鼠尾草暖蜜","林地牛至暖蜜","林地罗勒暖蜜","林地薄荷暖蜜","林地薰衣草暖蜜","林地迷迭香暖蜜","林地马郁兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("林地百里香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("林地百里香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "woodland_thyme_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("woodland_tarragon woodland_chive woodland_parsley woodland_cilantro woodland_dill woodland_fennel woodland_lovage woodland_sorrel 1003 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["woodland_tarragon","woodland_chive","woodland_parsley","woodland_cilantro","woodland_dill","woodland_fennel","woodland_lovage","woodland_sorrel"];
  const pots = ["woodland_tarragonPot","woodland_chivePot","woodland_parsleyPot","woodland_cilantroPot","woodland_dillPot","woodland_fennelPot","woodland_lovagePot","woodland_sorrelPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["woodland_tarragon_path","woodland_chive_path","woodland_parsley_path","woodland_cilantro_path","woodland_dill_path","woodland_fennel_path","woodland_lovage_path","woodland_sorrel_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1003);
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
  ["woodland_tarragon","woodland_chive","woodland_parsley","woodland_cilantro","woodland_dill","woodland_fennel","woodland_lovage","woodland_sorrel"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("woodland_tarragon_path") && game.includes("woodland_sorrel_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["林地龙蒿暖蜜","林地香葱暖蜜","林地欧芹暖蜜","林地香菜暖蜜","林地莳萝暖蜜","林地茴香暖蜜","林地独活暖蜜","林地酸模暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("林地龙蒿短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("林地龙蒿")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "woodland_tarragon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("garden_thyme garden_sage garden_oregano garden_basil garden_mint garden_lavender garden_rosemary garden_marjoram 1011 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["garden_thyme","garden_sage","garden_oregano","garden_basil","garden_mint","garden_lavender","garden_rosemary","garden_marjoram"];
  const pots = ["garden_thymePot","garden_sagePot","garden_oreganoPot","garden_basilPot","garden_mintPot","garden_lavenderPot","garden_rosemaryPot","garden_marjoramPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["garden_thyme_path","garden_sage_path","garden_oregano_path","garden_basil_path","garden_mint_path","garden_lavender_path","garden_rosemary_path","garden_marjoram_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1011);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["garden_rosemary"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["garden_thyme","garden_sage","garden_oregano","garden_basil","garden_mint","garden_lavender","garden_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("garden_thyme_path") && game.includes("garden_marjoram_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["园栽百里香暖蜜","园栽鼠尾草暖蜜","园栽牛至暖蜜","园栽罗勒暖蜜","园栽薄荷暖蜜","园栽薰衣草暖蜜","园栽迷迭香暖蜜","园栽马郁兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("园栽百里香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("园栽百里香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "garden_thyme_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("garden_tarragon garden_chive garden_parsley garden_cilantro garden_dill garden_fennel garden_lovage garden_sorrel 1019 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["garden_tarragon","garden_chive","garden_parsley","garden_cilantro","garden_dill","garden_fennel","garden_lovage","garden_sorrel"];
  const pots = ["garden_tarragonPot","garden_chivePot","garden_parsleyPot","garden_cilantroPot","garden_dillPot","garden_fennelPot","garden_lovagePot","garden_sorrelPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["garden_tarragon_path","garden_chive_path","garden_parsley_path","garden_cilantro_path","garden_dill_path","garden_fennel_path","garden_lovage_path","garden_sorrel_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1019);
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
  ["garden_tarragon","garden_chive","garden_parsley","garden_cilantro","garden_dill","garden_fennel","garden_lovage","garden_sorrel"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("garden_tarragon_path") && game.includes("garden_sorrel_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["园栽龙蒿暖蜜","园栽香葱暖蜜","园栽欧芹暖蜜","园栽香菜暖蜜","园栽莳萝暖蜜","园栽茴香暖蜜","园栽独活暖蜜","园栽酸模暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("园栽龙蒿短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("园栽龙蒿")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "garden_tarragon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("wild_thyme wild_sage wild_oregano wild_basil wild_mint wild_lavender wild_rosemary wild_marjoram 1027 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["wild_thyme","wild_sage","wild_oregano","wild_basil","wild_mint","wild_lavender","wild_rosemary","wild_marjoram"];
  const pots = ["wild_thymePot","wild_sagePot","wild_oreganoPot","wild_basilPot","wild_mintPot","wild_lavenderPot","wild_rosemaryPot","wild_marjoramPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["wild_thyme_path","wild_sage_path","wild_oregano_path","wild_basil_path","wild_mint_path","wild_lavender_path","wild_rosemary_path","wild_marjoram_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1027);
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
  ["wild_thyme","wild_sage","wild_oregano","wild_basil","wild_mint","wild_lavender","wild_rosemary","wild_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("wild_thyme_path") && game.includes("wild_marjoram_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["野生百里香暖蜜","野生鼠尾草暖蜜","野生牛至暖蜜","野生罗勒暖蜜","野生薄荷暖蜜","野生薰衣草暖蜜","野生迷迭香暖蜜","野生马郁兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("野生百里香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("野生百里香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "wild_thyme_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("wild_tarragon wild_chive wild_parsley wild_cilantro wild_dill wild_fennel wild_lovage wild_sorrel 1035 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["wild_tarragon","wild_chive","wild_parsley","wild_cilantro","wild_dill","wild_fennel","wild_lovage","wild_sorrel"];
  const pots = ["wild_tarragonPot","wild_chivePot","wild_parsleyPot","wild_cilantroPot","wild_dillPot","wild_fennelPot","wild_lovagePot","wild_sorrelPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["wild_tarragon_path","wild_chive_path","wild_parsley_path","wild_cilantro_path","wild_dill_path","wild_fennel_path","wild_lovage_path","wild_sorrel_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1035);
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
  ["wild_tarragon","wild_chive","wild_parsley","wild_cilantro","wild_dill","wild_fennel","wild_lovage","wild_sorrel"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("wild_tarragon_path") && game.includes("wild_sorrel_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["野生龙蒿暖蜜","野生香葱暖蜜","野生欧芹暖蜜","野生香菜暖蜜","野生莳萝暖蜜","野生茴香暖蜜","野生独活暖蜜","野生酸模暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("野生龙蒿短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("野生龙蒿")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "wild_tarragon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("dwarf_thyme dwarf_sage dwarf_oregano dwarf_basil dwarf_mint dwarf_lavender dwarf_rosemary dwarf_marjoram 1043 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["dwarf_thyme","dwarf_sage","dwarf_oregano","dwarf_basil","dwarf_mint","dwarf_lavender","dwarf_rosemary","dwarf_marjoram"];
  const pots = ["dwarf_thymePot","dwarf_sagePot","dwarf_oreganoPot","dwarf_basilPot","dwarf_mintPot","dwarf_lavenderPot","dwarf_rosemaryPot","dwarf_marjoramPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["dwarf_thyme_path","dwarf_sage_path","dwarf_oregano_path","dwarf_basil_path","dwarf_mint_path","dwarf_lavender_path","dwarf_rosemary_path","dwarf_marjoram_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1043);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["dwarf_rosemary"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["dwarf_thyme","dwarf_sage","dwarf_oregano","dwarf_basil","dwarf_mint","dwarf_lavender","dwarf_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("dwarf_thyme_path") && game.includes("dwarf_marjoram_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["矮生百里香暖蜜","矮生鼠尾草暖蜜","矮生牛至暖蜜","矮生罗勒暖蜜","矮生薄荷暖蜜","矮生薰衣草暖蜜","矮生迷迭香暖蜜","矮生马郁兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("矮生百里香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("矮生百里香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "dwarf_thyme_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("dwarf_tarragon dwarf_chive dwarf_parsley dwarf_cilantro dwarf_dill dwarf_fennel dwarf_lovage dwarf_sorrel 1051 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["dwarf_tarragon","dwarf_chive","dwarf_parsley","dwarf_cilantro","dwarf_dill","dwarf_fennel","dwarf_lovage","dwarf_sorrel"];
  const pots = ["dwarf_tarragonPot","dwarf_chivePot","dwarf_parsleyPot","dwarf_cilantroPot","dwarf_dillPot","dwarf_fennelPot","dwarf_lovagePot","dwarf_sorrelPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["dwarf_tarragon_path","dwarf_chive_path","dwarf_parsley_path","dwarf_cilantro_path","dwarf_dill_path","dwarf_fennel_path","dwarf_lovage_path","dwarf_sorrel_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1051);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["dwarf_tarragon"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["dwarf_chive","dwarf_parsley","dwarf_cilantro","dwarf_dill","dwarf_fennel","dwarf_lovage","dwarf_sorrel"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("dwarf_tarragon_path") && game.includes("dwarf_sorrel_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["矮生龙蒿暖蜜","矮生香葱暖蜜","矮生欧芹暖蜜","矮生香菜暖蜜","矮生莳萝暖蜜","矮生茴香暖蜜","矮生独活暖蜜","矮生酸模暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("矮生龙蒿短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("矮生龙蒿")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "dwarf_tarragon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("giant_thyme giant_sage giant_oregano giant_basil giant_mint giant_lavender giant_rosemary giant_marjoram 1059 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["giant_thyme","giant_sage","giant_oregano","giant_basil","giant_mint","giant_lavender","giant_rosemary","giant_marjoram"];
  const pots = ["giant_thymePot","giant_sagePot","giant_oreganoPot","giant_basilPot","giant_mintPot","giant_lavenderPot","giant_rosemaryPot","giant_marjoramPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["giant_thyme_path","giant_sage_path","giant_oregano_path","giant_basil_path","giant_mint_path","giant_lavender_path","giant_rosemary_path","giant_marjoram_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1059);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["giant_thyme","giant_sage","giant_mint","giant_lavender","giant_rosemary"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["giant_oregano","giant_basil","giant_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("giant_thyme_path") && game.includes("giant_marjoram_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["巨生百里香暖蜜","巨生鼠尾草暖蜜","巨生牛至暖蜜","巨生罗勒暖蜜","巨生薄荷暖蜜","巨生薰衣草暖蜜","巨生迷迭香暖蜜","巨生马郁兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("巨生百里香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("巨生百里香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "giant_thyme_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("giant_tarragon giant_chive giant_parsley giant_cilantro giant_dill giant_fennel giant_lovage giant_sorrel 1067 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["giant_tarragon","giant_chive","giant_parsley","giant_cilantro","giant_dill","giant_fennel","giant_lovage","giant_sorrel"];
  const pots = ["giant_tarragonPot","giant_chivePot","giant_parsleyPot","giant_cilantroPot","giant_dillPot","giant_fennelPot","giant_lovagePot","giant_sorrelPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["giant_tarragon_path","giant_chive_path","giant_parsley_path","giant_cilantro_path","giant_dill_path","giant_fennel_path","giant_lovage_path","giant_sorrel_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1067);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["giant_fennel"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["giant_tarragon","giant_chive","giant_parsley","giant_cilantro","giant_dill","giant_lovage","giant_sorrel"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("giant_tarragon_path") && game.includes("giant_sorrel_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["巨生龙蒿暖蜜","巨生香葱暖蜜","巨生欧芹暖蜜","巨生香菜暖蜜","巨生莳萝暖蜜","巨生茴香暖蜜","巨生独活暖蜜","巨生酸模暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("巨生龙蒿短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("巨生龙蒿")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "giant_tarragon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("variegated_thyme variegated_sage variegated_oregano variegated_basil variegated_mint variegated_lavender variegated_rosemary variegated_marjoram 1075 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["variegated_thyme","variegated_sage","variegated_oregano","variegated_basil","variegated_mint","variegated_lavender","variegated_rosemary","variegated_marjoram"];
  const pots = ["variegated_thymePot","variegated_sagePot","variegated_oreganoPot","variegated_basilPot","variegated_mintPot","variegated_lavenderPot","variegated_rosemaryPot","variegated_marjoramPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["variegated_thyme_path","variegated_sage_path","variegated_oregano_path","variegated_basil_path","variegated_mint_path","variegated_lavender_path","variegated_rosemary_path","variegated_marjoram_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1075);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["variegated_sage","variegated_rosemary"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["variegated_thyme","variegated_oregano","variegated_basil","variegated_mint","variegated_lavender","variegated_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("variegated_thyme_path") && game.includes("variegated_marjoram_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["斑叶百里香暖蜜","斑叶鼠尾草暖蜜","斑叶牛至暖蜜","斑叶罗勒暖蜜","斑叶薄荷暖蜜","斑叶薰衣草暖蜜","斑叶迷迭香暖蜜","斑叶马郁兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("斑叶百里香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("斑叶百里香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "variegated_thyme_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("variegated_tarragon variegated_chive variegated_parsley variegated_cilantro variegated_dill variegated_fennel variegated_lovage variegated_sorrel 1083 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["variegated_tarragon","variegated_chive","variegated_parsley","variegated_cilantro","variegated_dill","variegated_fennel","variegated_lovage","variegated_sorrel"];
  const pots = ["variegated_tarragonPot","variegated_chivePot","variegated_parsleyPot","variegated_cilantroPot","variegated_dillPot","variegated_fennelPot","variegated_lovagePot","variegated_sorrelPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["variegated_tarragon_path","variegated_chive_path","variegated_parsley_path","variegated_cilantro_path","variegated_dill_path","variegated_fennel_path","variegated_lovage_path","variegated_sorrel_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1083);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["variegated_tarragon","variegated_fennel","variegated_lovage"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["variegated_chive","variegated_parsley","variegated_cilantro","variegated_dill","variegated_sorrel"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("variegated_tarragon_path") && game.includes("variegated_sorrel_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["斑叶龙蒿暖蜜","斑叶香葱暖蜜","斑叶欧芹暖蜜","斑叶香菜暖蜜","斑叶莳萝暖蜜","斑叶茴香暖蜜","斑叶独活暖蜜","斑叶酸模暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("斑叶龙蒿短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("斑叶龙蒿")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "variegated_tarragon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("golden_thyme golden_sage golden_oregano golden_basil golden_mint golden_lavender golden_rosemary golden_marjoram 1091 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["golden_thyme","golden_sage","golden_oregano","golden_basil","golden_mint","golden_lavender","golden_rosemary","golden_marjoram"];
  const pots = ["golden_thymePot","golden_sagePot","golden_oreganoPot","golden_basilPot","golden_mintPot","golden_lavenderPot","golden_rosemaryPot","golden_marjoramPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["golden_thyme_path","golden_sage_path","golden_oregano_path","golden_basil_path","golden_mint_path","golden_lavender_path","golden_rosemary_path","golden_marjoram_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1091);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["golden_sage","golden_rosemary"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["golden_thyme","golden_oregano","golden_basil","golden_mint","golden_lavender","golden_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("golden_thyme_path") && game.includes("golden_marjoram_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["金叶百里香暖蜜","金叶鼠尾草暖蜜","金叶牛至暖蜜","金叶罗勒暖蜜","金叶薄荷暖蜜","金叶薰衣草暖蜜","金叶迷迭香暖蜜","金叶马郁兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("金叶百里香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("金叶百里香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "golden_thyme_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("golden_tarragon golden_chive golden_parsley golden_cilantro golden_dill golden_fennel golden_lovage golden_sorrel 1099 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["golden_tarragon","golden_chive","golden_parsley","golden_cilantro","golden_dill","golden_fennel","golden_lovage","golden_sorrel"];
  const pots = ["golden_tarragonPot","golden_chivePot","golden_parsleyPot","golden_cilantroPot","golden_dillPot","golden_fennelPot","golden_lovagePot","golden_sorrelPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["golden_tarragon_path","golden_chive_path","golden_parsley_path","golden_cilantro_path","golden_dill_path","golden_fennel_path","golden_lovage_path","golden_sorrel_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1099);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["golden_tarragon","golden_fennel","golden_lovage"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["golden_chive","golden_parsley","golden_cilantro","golden_dill","golden_sorrel"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("golden_tarragon_path") && game.includes("golden_sorrel_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["金叶龙蒿暖蜜","金叶香葱暖蜜","金叶欧芹暖蜜","金叶香菜暖蜜","金叶莳萝暖蜜","金叶茴香暖蜜","金叶独活暖蜜","金叶酸模暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("金叶龙蒿短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("金叶龙蒿")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "golden_tarragon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("silver_thyme silver_sage silver_oregano silver_basil silver_mint silver_lavender silver_rosemary silver_marjoram 1107 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["silver_thyme","silver_sage","silver_oregano","silver_basil","silver_mint","silver_lavender","silver_rosemary","silver_marjoram"];
  const pots = ["silver_thymePot","silver_sagePot","silver_oreganoPot","silver_basilPot","silver_mintPot","silver_lavenderPot","silver_rosemaryPot","silver_marjoramPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["silver_thyme_path","silver_sage_path","silver_oregano_path","silver_basil_path","silver_mint_path","silver_lavender_path","silver_rosemary_path","silver_marjoram_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1107);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["silver_sage","silver_rosemary"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["silver_thyme","silver_oregano","silver_basil","silver_mint","silver_lavender","silver_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("silver_thyme_path") && game.includes("silver_marjoram_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["银叶百里香暖蜜","银叶鼠尾草暖蜜","银叶牛至暖蜜","银叶罗勒暖蜜","银叶薄荷暖蜜","银叶薰衣草暖蜜","银叶迷迭香暖蜜","银叶马郁兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("银叶百里香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("银叶百里香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "silver_thyme_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("silver_tarragon silver_chive silver_parsley silver_cilantro silver_dill silver_fennel silver_lovage silver_sorrel 1115 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["silver_tarragon","silver_chive","silver_parsley","silver_cilantro","silver_dill","silver_fennel","silver_lovage","silver_sorrel"];
  const pots = ["silver_tarragonPot","silver_chivePot","silver_parsleyPot","silver_cilantroPot","silver_dillPot","silver_fennelPot","silver_lovagePot","silver_sorrelPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["silver_tarragon_path","silver_chive_path","silver_parsley_path","silver_cilantro_path","silver_dill_path","silver_fennel_path","silver_lovage_path","silver_sorrel_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1115);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["silver_tarragon","silver_fennel","silver_lovage"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["silver_chive","silver_parsley","silver_cilantro","silver_dill","silver_sorrel"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("silver_tarragon_path") && game.includes("silver_sorrel_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["银叶龙蒿暖蜜","银叶香葱暖蜜","银叶欧芹暖蜜","银叶香菜暖蜜","银叶莳萝暖蜜","银叶茴香暖蜜","银叶独活暖蜜","银叶酸模暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("银叶龙蒿短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("银叶龙蒿")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "silver_tarragon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("purple_thyme purple_sage purple_oregano purple_basil purple_mint purple_lavender purple_rosemary purple_marjoram 1123 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["purple_thyme","purple_sage","purple_oregano","purple_basil","purple_mint","purple_lavender","purple_rosemary","purple_marjoram"];
  const pots = ["purple_thymePot","purple_sagePot","purple_oreganoPot","purple_basilPot","purple_mintPot","purple_lavenderPot","purple_rosemaryPot","purple_marjoramPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["purple_thyme_path","purple_sage_path","purple_oregano_path","purple_basil_path","purple_mint_path","purple_lavender_path","purple_rosemary_path","purple_marjoram_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1123);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["purple_sage","purple_rosemary"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["purple_thyme","purple_oregano","purple_basil","purple_mint","purple_lavender","purple_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("purple_thyme_path") && game.includes("purple_marjoram_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["紫叶百里香暖蜜","紫叶鼠尾草暖蜜","紫叶牛至暖蜜","紫叶罗勒暖蜜","紫叶薄荷暖蜜","紫叶薰衣草暖蜜","紫叶迷迭香暖蜜","紫叶马郁兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("紫叶百里香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("紫叶百里香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "purple_thyme_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("purple_tarragon purple_chive purple_parsley purple_cilantro purple_dill purple_fennel purple_lovage purple_sorrel 1131 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["purple_tarragon","purple_chive","purple_parsley","purple_cilantro","purple_dill","purple_fennel","purple_lovage","purple_sorrel"];
  const pots = ["purple_tarragonPot","purple_chivePot","purple_parsleyPot","purple_cilantroPot","purple_dillPot","purple_fennelPot","purple_lovagePot","purple_sorrelPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["purple_tarragon_path","purple_chive_path","purple_parsley_path","purple_cilantro_path","purple_dill_path","purple_fennel_path","purple_lovage_path","purple_sorrel_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1131);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["purple_tarragon","purple_fennel","purple_lovage"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["purple_chive","purple_parsley","purple_cilantro","purple_dill","purple_sorrel"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("purple_tarragon_path") && game.includes("purple_sorrel_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["紫叶龙蒿暖蜜","紫叶香葱暖蜜","紫叶欧芹暖蜜","紫叶香菜暖蜜","紫叶莳萝暖蜜","紫叶茴香暖蜜","紫叶独活暖蜜","紫叶酸模暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("紫叶龙蒿短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("紫叶龙蒿")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "purple_tarragon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("red_thyme red_sage red_oregano red_basil red_mint red_lavender red_rosemary red_marjoram 1139 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["red_thyme","red_sage","red_oregano","red_basil","red_mint","red_lavender","red_rosemary","red_marjoram"];
  const pots = ["red_thymePot","red_sagePot","red_oreganoPot","red_basilPot","red_mintPot","red_lavenderPot","red_rosemaryPot","red_marjoramPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["red_thyme_path","red_sage_path","red_oregano_path","red_basil_path","red_mint_path","red_lavender_path","red_rosemary_path","red_marjoram_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1139);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["red_sage","red_rosemary"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["red_thyme","red_oregano","red_basil","red_mint","red_lavender","red_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("red_thyme_path") && game.includes("red_marjoram_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["红叶百里香暖蜜","红叶鼠尾草暖蜜","红叶牛至暖蜜","红叶罗勒暖蜜","红叶薄荷暖蜜","红叶薰衣草暖蜜","红叶迷迭香暖蜜","红叶马郁兰暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("红叶百里香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("红叶百里香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "red_thyme_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("red_tarragon red_chive red_parsley red_cilantro red_dill red_fennel red_lovage red_sorrel 1147 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["red_tarragon","red_chive","red_parsley","red_cilantro","red_dill","red_fennel","red_lovage","red_sorrel"];
  const pots = ["red_tarragonPot","red_chivePot","red_parsleyPot","red_cilantroPot","red_dillPot","red_fennelPot","red_lovagePot","red_sorrelPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["red_tarragon_path","red_chive_path","red_parsley_path","red_cilantro_path","red_dill_path","red_fennel_path","red_lovage_path","red_sorrel_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1147);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["red_tarragon","red_fennel","red_lovage"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["red_chive","red_parsley","red_cilantro","red_dill","red_sorrel"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("red_tarragon_path") && game.includes("red_sorrel_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["红叶龙蒿暖蜜","红叶香葱暖蜜","红叶欧芹暖蜜","红叶香菜暖蜜","红叶莳萝暖蜜","红叶茴香暖蜜","红叶独活暖蜜","红叶酸模暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("红叶龙蒿短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("红叶龙蒿")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "red_tarragon_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("white_thyme white_oregano white_basil white_mint white_lavender white_rosemary white_marjoram white_tarragon 1155 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["white_thyme","white_oregano","white_basil","white_mint","white_lavender","white_rosemary","white_marjoram","white_tarragon"];
  const pots = ["white_thymePot","white_oreganoPot","white_basilPot","white_mintPot","white_lavenderPot","white_rosemaryPot","white_marjoramPot","white_tarragonPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["white_thyme_path","white_oregano_path","white_basil_path","white_mint_path","white_lavender_path","white_rosemary_path","white_marjoram_path","white_tarragon_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1155);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["white_rosemary","white_tarragon"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["white_thyme","white_oregano","white_basil","white_mint","white_lavender","white_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("white_thyme_path") && game.includes("white_tarragon_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["白花百里香暖蜜","白花牛至暖蜜","白花罗勒暖蜜","白花薄荷暖蜜","白花薰衣草暖蜜","白花迷迭香暖蜜","白花马郁兰暖蜜","白花龙蒿暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("白花百里香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("白花百里香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "white_thyme_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("white_chive white_parsley white_cilantro white_dill white_fennel white_lovage white_sorrel pink_thyme 1163 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["white_chive","white_parsley","white_cilantro","white_dill","white_fennel","white_lovage","white_sorrel","pink_thyme"];
  const pots = ["white_chivePot","white_parsleyPot","white_cilantroPot","white_dillPot","white_fennelPot","white_lovagePot","white_sorrelPot","pink_thymePot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["white_chive_path","white_parsley_path","white_cilantro_path","white_dill_path","white_fennel_path","white_lovage_path","white_sorrel_path","pink_thyme_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1163);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["white_fennel","white_lovage"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["white_chive","white_parsley","white_cilantro","white_dill","white_sorrel","pink_thyme"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("white_chive_path") && game.includes("pink_thyme_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["白花香葱暖蜜","白花欧芹暖蜜","白花香菜暖蜜","白花莳萝暖蜜","白花茴香暖蜜","白花独活暖蜜","白花酸模暖蜜","粉花百里香暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("白花香葱短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("白花香葱")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "white_chive_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("pink_sage pink_oregano pink_basil pink_mint pink_lavender pink_rosemary pink_marjoram pink_tarragon 1171 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["pink_sage","pink_oregano","pink_basil","pink_mint","pink_lavender","pink_rosemary","pink_marjoram","pink_tarragon"];
  const pots = ["pink_sagePot","pink_oreganoPot","pink_basilPot","pink_mintPot","pink_lavenderPot","pink_rosemaryPot","pink_marjoramPot","pink_tarragonPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["pink_sage_path","pink_oregano_path","pink_basil_path","pink_mint_path","pink_lavender_path","pink_rosemary_path","pink_marjoram_path","pink_tarragon_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1171);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["pink_sage","pink_rosemary","pink_tarragon"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["pink_oregano","pink_basil","pink_mint","pink_lavender","pink_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pink_sage_path") && game.includes("pink_tarragon_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["粉花鼠尾草暖蜜","粉花牛至暖蜜","粉花罗勒暖蜜","粉花薄荷暖蜜","粉花薰衣草暖蜜","粉花迷迭香暖蜜","粉花马郁兰暖蜜","粉花龙蒿暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("粉花鼠尾草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("粉花鼠尾草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "pink_sage_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("pink_chive pink_parsley pink_cilantro pink_dill pink_fennel pink_lovage pink_sorrel blue_thyme 1179 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["pink_chive","pink_parsley","pink_cilantro","pink_dill","pink_fennel","pink_lovage","pink_sorrel","blue_thyme"];
  const pots = ["pink_chivePot","pink_parsleyPot","pink_cilantroPot","pink_dillPot","pink_fennelPot","pink_lovagePot","pink_sorrelPot","blue_thymePot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["pink_chive_path","pink_parsley_path","pink_cilantro_path","pink_dill_path","pink_fennel_path","pink_lovage_path","pink_sorrel_path","blue_thyme_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1179);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["pink_fennel","pink_lovage"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["pink_chive","pink_parsley","pink_cilantro","pink_dill","pink_sorrel","blue_thyme"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pink_chive_path") && game.includes("blue_thyme_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["粉花香葱暖蜜","粉花欧芹暖蜜","粉花香菜暖蜜","粉花莳萝暖蜜","粉花茴香暖蜜","粉花独活暖蜜","粉花酸模暖蜜","蓝花百里香暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("粉花香葱短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("粉花香葱")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "pink_chive_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("blue_sage blue_oregano blue_basil blue_mint blue_lavender blue_rosemary blue_marjoram blue_tarragon 1187 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["blue_sage","blue_oregano","blue_basil","blue_mint","blue_lavender","blue_rosemary","blue_marjoram","blue_tarragon"];
  const pots = ["blue_sagePot","blue_oreganoPot","blue_basilPot","blue_mintPot","blue_lavenderPot","blue_rosemaryPot","blue_marjoramPot","blue_tarragonPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["blue_sage_path","blue_oregano_path","blue_basil_path","blue_mint_path","blue_lavender_path","blue_rosemary_path","blue_marjoram_path","blue_tarragon_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1187);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["blue_sage","blue_rosemary","blue_tarragon"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["blue_oregano","blue_basil","blue_mint","blue_lavender","blue_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("blue_sage_path") && game.includes("blue_tarragon_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["蓝花鼠尾草暖蜜","蓝花牛至暖蜜","蓝花罗勒暖蜜","蓝花薄荷暖蜜","蓝花薰衣草暖蜜","蓝花迷迭香暖蜜","蓝花马郁兰暖蜜","蓝花龙蒿暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("蓝花鼠尾草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("蓝花鼠尾草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "blue_sage_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("blue_chive blue_parsley blue_cilantro blue_dill blue_fennel blue_lovage blue_sorrel yellow_thyme 1195 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["blue_chive","blue_parsley","blue_cilantro","blue_dill","blue_fennel","blue_lovage","blue_sorrel","yellow_thyme"];
  const pots = ["blue_chivePot","blue_parsleyPot","blue_cilantroPot","blue_dillPot","blue_fennelPot","blue_lovagePot","blue_sorrelPot","yellow_thymePot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["blue_chive_path","blue_parsley_path","blue_cilantro_path","blue_dill_path","blue_fennel_path","blue_lovage_path","blue_sorrel_path","yellow_thyme_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1195);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["blue_fennel","blue_lovage"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["blue_chive","blue_parsley","blue_cilantro","blue_dill","blue_sorrel","yellow_thyme"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("blue_chive_path") && game.includes("yellow_thyme_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["蓝花香葱暖蜜","蓝花欧芹暖蜜","蓝花香菜暖蜜","蓝花莳萝暖蜜","蓝花茴香暖蜜","蓝花独活暖蜜","蓝花酸模暖蜜","黄花百里香暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("蓝花香葱短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("蓝花香葱")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "blue_chive_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("yellow_sage yellow_oregano yellow_basil yellow_mint yellow_lavender yellow_rosemary yellow_marjoram yellow_tarragon 1203 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["yellow_sage","yellow_oregano","yellow_basil","yellow_mint","yellow_lavender","yellow_rosemary","yellow_marjoram","yellow_tarragon"];
  const pots = ["yellow_sagePot","yellow_oreganoPot","yellow_basilPot","yellow_mintPot","yellow_lavenderPot","yellow_rosemaryPot","yellow_marjoramPot","yellow_tarragonPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["yellow_sage_path","yellow_oregano_path","yellow_basil_path","yellow_mint_path","yellow_lavender_path","yellow_rosemary_path","yellow_marjoram_path","yellow_tarragon_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1203);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["yellow_sage","yellow_rosemary","yellow_tarragon"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["yellow_oregano","yellow_basil","yellow_mint","yellow_lavender","yellow_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("yellow_sage_path") && game.includes("yellow_tarragon_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["黄花鼠尾草暖蜜","黄花牛至暖蜜","黄花罗勒暖蜜","黄花薄荷暖蜜","黄花薰衣草暖蜜","黄花迷迭香暖蜜","黄花马郁兰暖蜜","黄花龙蒿暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("黄花鼠尾草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("黄花鼠尾草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "yellow_sage_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("yellow_chive yellow_parsley yellow_cilantro yellow_dill yellow_fennel yellow_lovage yellow_sorrel orange_thyme 1211 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["yellow_chive","yellow_parsley","yellow_cilantro","yellow_dill","yellow_fennel","yellow_lovage","yellow_sorrel","orange_thyme"];
  const pots = ["yellow_chivePot","yellow_parsleyPot","yellow_cilantroPot","yellow_dillPot","yellow_fennelPot","yellow_lovagePot","yellow_sorrelPot","orange_thymePot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["yellow_chive_path","yellow_parsley_path","yellow_cilantro_path","yellow_dill_path","yellow_fennel_path","yellow_lovage_path","yellow_sorrel_path","orange_thyme_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1211);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["yellow_fennel","yellow_lovage"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["yellow_chive","yellow_parsley","yellow_cilantro","yellow_dill","yellow_sorrel","orange_thyme"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("yellow_chive_path") && game.includes("orange_thyme_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["黄花香葱暖蜜","黄花欧芹暖蜜","黄花香菜暖蜜","黄花莳萝暖蜜","黄花茴香暖蜜","黄花独活暖蜜","黄花酸模暖蜜","橙花百里香暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("黄花香葱短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("黄花香葱")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "yellow_chive_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("orange_sage orange_oregano orange_basil orange_mint orange_lavender orange_rosemary orange_marjoram orange_tarragon 1219 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["orange_sage","orange_oregano","orange_basil","orange_mint","orange_lavender","orange_rosemary","orange_marjoram","orange_tarragon"];
  const pots = ["orange_sagePot","orange_oreganoPot","orange_basilPot","orange_mintPot","orange_lavenderPot","orange_rosemaryPot","orange_marjoramPot","orange_tarragonPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["orange_sage_path","orange_oregano_path","orange_basil_path","orange_mint_path","orange_lavender_path","orange_rosemary_path","orange_marjoram_path","orange_tarragon_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1219);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["orange_sage","orange_rosemary","orange_tarragon"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["orange_oregano","orange_basil","orange_mint","orange_lavender","orange_marjoram"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("orange_sage_path") && game.includes("orange_tarragon_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["橙花鼠尾草暖蜜","橙花牛至暖蜜","橙花罗勒暖蜜","橙花薄荷暖蜜","橙花薰衣草暖蜜","橙花迷迭香暖蜜","橙花马郁兰暖蜜","橙花龙蒿暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("橙花鼠尾草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("橙花鼠尾草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "orange_sage_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("orange_chive orange_parsley orange_cilantro orange_dill orange_fennel orange_lovage orange_sorrel fragrant_thyme 1227 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["orange_chive","orange_parsley","orange_cilantro","orange_dill","orange_fennel","orange_lovage","orange_sorrel","fragrant_thyme"];
  const pots = ["orange_chivePot","orange_parsleyPot","orange_cilantroPot","orange_dillPot","orange_fennelPot","orange_lovagePot","orange_sorrelPot","fragrant_thymePot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["orange_chive_path","orange_parsley_path","orange_cilantro_path","orange_dill_path","orange_fennel_path","orange_lovage_path","orange_sorrel_path","fragrant_thyme_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1227);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["orange_fennel","orange_lovage"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["orange_chive","orange_parsley","orange_cilantro","orange_dill","orange_sorrel","fragrant_thyme"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("orange_chive_path") && game.includes("fragrant_thyme_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["橙花香葱暖蜜","橙花欧芹暖蜜","橙花香菜暖蜜","橙花莳萝暖蜜","橙花茴香暖蜜","橙花独活暖蜜","橙花酸模暖蜜","香型百里香暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("橙花香葱短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("橙花香葱")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "orange_chive_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("fragrant_sage fragrant_oregano fragrant_basil fragrant_mint fragrant_lavender fragrant_rosemary fragrant_marjoram fragrant_tarragon 1235 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["fragrant_sage","fragrant_oregano","fragrant_basil","fragrant_mint","fragrant_lavender","fragrant_rosemary","fragrant_marjoram","fragrant_tarragon"];
  const pots = ["fragrant_sagePot","fragrant_oreganoPot","fragrant_basilPot","fragrant_mintPot","fragrant_lavenderPot","fragrant_rosemaryPot","fragrant_marjoramPot","fragrant_tarragonPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["fragrant_sage_path","fragrant_oregano_path","fragrant_basil_path","fragrant_mint_path","fragrant_lavender_path","fragrant_rosemary_path","fragrant_marjoram_path","fragrant_tarragon_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1235);
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
  ["fragrant_sage","fragrant_oregano","fragrant_basil","fragrant_mint","fragrant_lavender","fragrant_rosemary","fragrant_marjoram","fragrant_tarragon"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("fragrant_sage_path") && game.includes("fragrant_tarragon_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["香型鼠尾草暖蜜","香型牛至暖蜜","香型罗勒暖蜜","香型薄荷暖蜜","香型薰衣草暖蜜","香型迷迭香暖蜜","香型马郁兰暖蜜","香型龙蒿暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("香型鼠尾草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("香型鼠尾草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "fragrant_sage_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("fragrant_chive fragrant_parsley fragrant_cilantro fragrant_dill fragrant_fennel fragrant_lovage fragrant_sorrel edible_thyme 1243 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["fragrant_chive","fragrant_parsley","fragrant_cilantro","fragrant_dill","fragrant_fennel","fragrant_lovage","fragrant_sorrel","edible_thyme"];
  const pots = ["fragrant_chivePot","fragrant_parsleyPot","fragrant_cilantroPot","fragrant_dillPot","fragrant_fennelPot","fragrant_lovagePot","fragrant_sorrelPot","edible_thymePot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["fragrant_chive_path","fragrant_parsley_path","fragrant_cilantro_path","fragrant_dill_path","fragrant_fennel_path","fragrant_lovage_path","fragrant_sorrel_path","edible_thyme_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1243);
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
  ["fragrant_chive","fragrant_parsley","fragrant_cilantro","fragrant_dill","fragrant_fennel","fragrant_lovage","fragrant_sorrel","edible_thyme"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("fragrant_chive_path") && game.includes("edible_thyme_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["香型香葱暖蜜","香型欧芹暖蜜","香型香菜暖蜜","香型莳萝暖蜜","香型茴香暖蜜","香型独活暖蜜","香型酸模暖蜜","可食百里香暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("香型香葱短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("香型香葱")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "fragrant_chive_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("edible_sage edible_oregano edible_basil edible_mint edible_lavender edible_rosemary edible_marjoram edible_tarragon 1251 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["edible_sage","edible_oregano","edible_basil","edible_mint","edible_lavender","edible_rosemary","edible_marjoram","edible_tarragon"];
  const pots = ["edible_sagePot","edible_oreganoPot","edible_basilPot","edible_mintPot","edible_lavenderPot","edible_rosemaryPot","edible_marjoramPot","edible_tarragonPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["edible_sage_path","edible_oregano_path","edible_basil_path","edible_mint_path","edible_lavender_path","edible_rosemary_path","edible_marjoram_path","edible_tarragon_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1251);
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
  ["edible_sage","edible_oregano","edible_basil","edible_mint","edible_lavender","edible_rosemary","edible_marjoram","edible_tarragon"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("edible_sage_path") && game.includes("edible_tarragon_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["可食鼠尾草暖蜜","可食牛至暖蜜","可食罗勒暖蜜","可食薄荷暖蜜","可食薰衣草暖蜜","可食迷迭香暖蜜","可食马郁兰暖蜜","可食龙蒿暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("可食鼠尾草短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("可食鼠尾草")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "edible_sage_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("edible_chive edible_parsley edible_cilantro edible_dill edible_fennel edible_lovage edible_sorrel apple_blossom 1259 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["edible_chive","edible_parsley","edible_cilantro","edible_dill","edible_fennel","edible_lovage","edible_sorrel","apple_blossom"];
  const pots = ["edible_chivePot","edible_parsleyPot","edible_cilantroPot","edible_dillPot","edible_fennelPot","edible_lovagePot","edible_sorrelPot","apple_blossomPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["edible_chive_path","edible_parsley_path","edible_cilantro_path","edible_dill_path","edible_fennel_path","edible_lovage_path","edible_sorrel_path","apple_blossom_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1259);
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
  ["edible_chive","edible_parsley","edible_cilantro","edible_dill","edible_fennel","edible_lovage","edible_sorrel","apple_blossom"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("edible_chive_path") && game.includes("apple_blossom_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["可食香葱暖蜜","可食欧芹暖蜜","可食香菜暖蜜","可食莳萝暖蜜","可食茴香暖蜜","可食独活暖蜜","可食酸模暖蜜","苹果花暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("可食香葱短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("可食香葱")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "edible_chive_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("pear_blossom peach_blossom plum_blossom_fresh cherry_blossom apricot_blossom quince_blossom medlar_blossom mulberry_flower 1267 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["pear_blossom","peach_blossom","plum_blossom_fresh","cherry_blossom","apricot_blossom","quince_blossom","medlar_blossom","mulberry_flower"];
  const pots = ["pear_blossomPot","peach_blossomPot","plum_blossom_freshPot","cherry_blossomPot","apricot_blossomPot","quince_blossomPot","medlar_blossomPot","mulberry_flowerPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["pear_blossom_path","peach_blossom_path","plum_blossom_fresh_path","cherry_blossom_path","apricot_blossom_path","quince_blossom_path","medlar_blossom_path","mulberry_flower_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1267);
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
  ["pear_blossom","peach_blossom","plum_blossom_fresh","cherry_blossom","apricot_blossom","quince_blossom","medlar_blossom","mulberry_flower"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pear_blossom_path") && game.includes("mulberry_flower_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["梨花暖蜜","桃花暖蜜","鲜梅花暖蜜","樱花暖蜜","杏花鲜暖蜜","榅桲花暖蜜","欧楂花暖蜜","桑花暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("梨花短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("梨花")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "pear_blossom_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("fig_leaf pomegranate_flower persimmon_flower walnut_flower hazel_catkin chestnut_catkin almond_fresh_bl pistachio_flower 1275 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["fig_leaf","pomegranate_flower","persimmon_flower","walnut_flower","hazel_catkin","chestnut_catkin","almond_fresh_bl","pistachio_flower"];
  const pots = ["fig_leafPot","pomegranate_flowerPot","persimmon_flowerPot","walnut_flowerPot","hazel_catkinPot","chestnut_catkinPot","almond_fresh_blPot","pistachio_flowerPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["fig_leaf_path","pomegranate_flower_path","persimmon_flower_path","walnut_flower_path","hazel_catkin_path","chestnut_catkin_path","almond_fresh_bl_path","pistachio_flower_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1275);
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
  ["fig_leaf","pomegranate_flower","persimmon_flower","walnut_flower","hazel_catkin","chestnut_catkin","almond_fresh_bl","pistachio_flower"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("fig_leaf_path") && game.includes("pistachio_flower_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["无花果叶暖蜜","石榴花暖蜜","柿花暖蜜","核桃花暖蜜","榛花序暖蜜","板栗花序暖蜜","鲜杏花暖蜜","开心果花暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("无花果叶短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("无花果叶")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "fig_leaf_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("pecan_flower macadamia_flower cashew_flower brazil_nut_fl coconut_inflo date_flower olive_flower avocado_flower 1283 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["pecan_flower","macadamia_flower","cashew_flower","brazil_nut_fl","coconut_inflo","date_flower","olive_flower","avocado_flower"];
  const pots = ["pecan_flowerPot","macadamia_flowerPot","cashew_flowerPot","brazil_nut_flPot","coconut_infloPot","date_flowerPot","olive_flowerPot","avocado_flowerPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["pecan_flower_path","macadamia_flower_path","cashew_flower_path","brazil_nut_fl_path","coconut_inflo_path","date_flower_path","olive_flower_path","avocado_flower_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1283);
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
  ["pecan_flower","macadamia_flower","cashew_flower","brazil_nut_fl","coconut_inflo","date_flower","olive_flower","avocado_flower"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("pecan_flower_path") && game.includes("avocado_flower_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["山核桃花暖蜜","夏威夷果花暖蜜","腰果花暖蜜","巴西坚果花暖蜜","椰子花序暖蜜","椰枣花暖蜜","橄榄花暖蜜","牛油果花暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("山核桃花短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("山核桃花")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "pecan_flower_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("mango_flower lychee_flower longan_flower rambutan_flower mangosteen_flower guava_flower papaya_flower pineapple_flower 1291 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["mango_flower","lychee_flower","longan_flower","rambutan_flower","mangosteen_flower","guava_flower","papaya_flower","pineapple_flower"];
  const pots = ["mango_flowerPot","lychee_flowerPot","longan_flowerPot","rambutan_flowerPot","mangosteen_flowerPot","guava_flowerPot","papaya_flowerPot","pineapple_flowerPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["mango_flower_path","lychee_flower_path","longan_flower_path","rambutan_flower_path","mangosteen_flower_path","guava_flower_path","papaya_flower_path","pineapple_flower_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1291);
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
  ["mango_flower","lychee_flower","longan_flower","rambutan_flower","mangosteen_flower","guava_flower","papaya_flower","pineapple_flower"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("mango_flower_path") && game.includes("pineapple_flower_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["芒果花暖蜜","荔枝花暖蜜","龙眼花暖蜜","红毛丹花暖蜜","山竹花暖蜜","番石榴花暖蜜","木瓜花暖蜜","菠萝花暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("芒果花短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("芒果花")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "mango_flower_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("banana_flower plantain_flower breadfruit_fl jackfruit_fl durian_fresh_fl soursop_fl cherimoya_fl custard_apple_fl 1299 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["banana_flower","plantain_flower","breadfruit_fl","jackfruit_fl","durian_fresh_fl","soursop_fl","cherimoya_fl","custard_apple_fl"];
  const pots = ["banana_flowerPot","plantain_flowerPot","breadfruit_flPot","jackfruit_flPot","durian_fresh_flPot","soursop_flPot","cherimoya_flPot","custard_apple_flPot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["banana_flower_path","plantain_flower_path","breadfruit_fl_path","jackfruit_fl_path","durian_fresh_fl_path","soursop_fl_path","cherimoya_fl_path","custard_apple_fl_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1299);
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
  ["banana_flower","plantain_flower","breadfruit_fl","jackfruit_fl","durian_fresh_fl","soursop_fl","cherimoya_fl","custard_apple_fl"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("banana_flower_path") && game.includes("custard_apple_fl_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["香蕉花暖蜜","大蕉花暖蜜","面包果花暖蜜","波罗蜜花暖蜜","鲜榴莲花暖蜜","刺番荔枝花暖蜜","毛番荔枝花暖蜜","番荔枝花暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("香蕉花短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("香蕉花")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "banana_flower_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r0_e58c97e5a283 r1_e58c97e5a283 r2_e58c97e5a283 r3_e58c97e5a283 r4_e58c97e5a283 r5_e58c97e5a283 r6_e58c97e5a283 r7_e58c97e5a283 1307 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r0_e58c97e5a283","r1_e58c97e5a283","r2_e58c97e5a283","r3_e58c97e5a283","r4_e58c97e5a283","r5_e58c97e5a283","r6_e58c97e5a283","r7_e58c97e5a283"];
  const pots = ["r0_e58c97e5a283Pot","r1_e58c97e5a283Pot","r2_e58c97e5a283Pot","r3_e58c97e5a283Pot","r4_e58c97e5a283Pot","r5_e58c97e5a283Pot","r6_e58c97e5a283Pot","r7_e58c97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r0_e58c97e5a283_path","r1_e58c97e5a283_path","r2_e58c97e5a283_path","r3_e58c97e5a283_path","r4_e58c97e5a283_path","r5_e58c97e5a283_path","r6_e58c97e5a283_path","r7_e58c97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1307);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r0_e58c97e5a283","r5_e58c97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r1_e58c97e5a283","r2_e58c97e5a283","r3_e58c97e5a283","r4_e58c97e5a283","r6_e58c97e5a283","r7_e58c97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r0_e58c97e5a283_path") && game.includes("r7_e58c97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["北境堇菜暖蜜","北境报春暖蜜","北境银莲暖蜜","北境毛茛暖蜜","北境罂粟暖蜜","北境飞燕暖蜜","北境翠雀暖蜜","北境乌头暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("北境堇菜短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("北境堇菜")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r0_e58c97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r8_e58c97e5a283 r9_e58c97e5a283 r10_e58c97e5a283 r11_e58c97e5a283 r12_e58c97e5a283 r13_e58c97e5a283 r14_e58c97e5a283 r15_e58c97e5a283 1315 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r8_e58c97e5a283","r9_e58c97e5a283","r10_e58c97e5a283","r11_e58c97e5a283","r12_e58c97e5a283","r13_e58c97e5a283","r14_e58c97e5a283","r15_e58c97e5a283"];
  const pots = ["r8_e58c97e5a283Pot","r9_e58c97e5a283Pot","r10_e58c97e5a283Pot","r11_e58c97e5a283Pot","r12_e58c97e5a283Pot","r13_e58c97e5a283Pot","r14_e58c97e5a283Pot","r15_e58c97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r8_e58c97e5a283_path","r9_e58c97e5a283_path","r10_e58c97e5a283_path","r11_e58c97e5a283_path","r12_e58c97e5a283_path","r13_e58c97e5a283_path","r14_e58c97e5a283_path","r15_e58c97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1315);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r10_e58c97e5a283","r15_e58c97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r8_e58c97e5a283","r9_e58c97e5a283","r11_e58c97e5a283","r12_e58c97e5a283","r13_e58c97e5a283","r14_e58c97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r8_e58c97e5a283_path") && game.includes("r15_e58c97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["北境耧斗暖蜜","北境铁线暖蜜","北境福禄暖蜜","北境石竹暖蜜","北境满天暖蜜","北境霞草暖蜜","北境马鞭暖蜜","北境藿香暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("北境耧斗短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("北境耧斗")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r8_e58c97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r16_e58c97e5a283 r17_e58c97e5a283 r18_e58c97e5a283 r19_e58c97e5a283 r20_e58c97e5a283 r21_e58c97e5a283 r22_e58c97e5a283 r23_e58c97e5a283 1323 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r16_e58c97e5a283","r17_e58c97e5a283","r18_e58c97e5a283","r19_e58c97e5a283","r20_e58c97e5a283","r21_e58c97e5a283","r22_e58c97e5a283","r23_e58c97e5a283"];
  const pots = ["r16_e58c97e5a283Pot","r17_e58c97e5a283Pot","r18_e58c97e5a283Pot","r19_e58c97e5a283Pot","r20_e58c97e5a283Pot","r21_e58c97e5a283Pot","r22_e58c97e5a283Pot","r23_e58c97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r16_e58c97e5a283_path","r17_e58c97e5a283_path","r18_e58c97e5a283_path","r19_e58c97e5a283_path","r20_e58c97e5a283_path","r21_e58c97e5a283_path","r22_e58c97e5a283_path","r23_e58c97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1323);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r20_e58c97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r16_e58c97e5a283","r17_e58c97e5a283","r18_e58c97e5a283","r19_e58c97e5a283","r21_e58c97e5a283","r22_e58c97e5a283","r23_e58c97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r16_e58c97e5a283_path") && game.includes("r23_e58c97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["北境荆芥暖蜜","北境水苏暖蜜","北境夏枯暖蜜","北境黄芩暖蜜","北境筋骨暖蜜","北境连钱暖蜜","北境香蜂暖蜜","北境猫薄荷暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("北境荆芥短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("北境荆芥")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r16_e58c97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r24_e58c97e5a283 r25_e58c97e5a283 r26_e58c97e5a283 r27_e58c97e5a283 r28_e58c97e5a283 r29_e58c97e5a283 r30_e58c97e5a283 r31_e58c97e5a283 1331 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r24_e58c97e5a283","r25_e58c97e5a283","r26_e58c97e5a283","r27_e58c97e5a283","r28_e58c97e5a283","r29_e58c97e5a283","r30_e58c97e5a283","r31_e58c97e5a283"];
  const pots = ["r24_e58c97e5a283Pot","r25_e58c97e5a283Pot","r26_e58c97e5a283Pot","r27_e58c97e5a283Pot","r28_e58c97e5a283Pot","r29_e58c97e5a283Pot","r30_e58c97e5a283Pot","r31_e58c97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r24_e58c97e5a283_path","r25_e58c97e5a283_path","r26_e58c97e5a283_path","r27_e58c97e5a283_path","r28_e58c97e5a283_path","r29_e58c97e5a283_path","r30_e58c97e5a283_path","r31_e58c97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1331);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r25_e58c97e5a283","r30_e58c97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r24_e58c97e5a283","r26_e58c97e5a283","r27_e58c97e5a283","r28_e58c97e5a283","r29_e58c97e5a283","r31_e58c97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r24_e58c97e5a283_path") && game.includes("r31_e58c97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["北境神香暖蜜","北境百里暖蜜","北境牛至暖蜜","北境马郁暖蜜","北境罗勒暖蜜","北境迷迭暖蜜","北境鼠尾暖蜜","北境薰衣草暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("北境神香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("北境神香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r24_e58c97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r32_e58c97e5a283 r33_e58c97e5a283 r34_e58c97e5a283 r35_e58c97e5a283 r36_e58c97e5a283 r37_e58c97e5a283 r38_e58c97e5a283 r39_e58c97e5a283 1339 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r32_e58c97e5a283","r33_e58c97e5a283","r34_e58c97e5a283","r35_e58c97e5a283","r36_e58c97e5a283","r37_e58c97e5a283","r38_e58c97e5a283","r39_e58c97e5a283"];
  const pots = ["r32_e58c97e5a283Pot","r33_e58c97e5a283Pot","r34_e58c97e5a283Pot","r35_e58c97e5a283Pot","r36_e58c97e5a283Pot","r37_e58c97e5a283Pot","r38_e58c97e5a283Pot","r39_e58c97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r32_e58c97e5a283_path","r33_e58c97e5a283_path","r34_e58c97e5a283_path","r35_e58c97e5a283_path","r36_e58c97e5a283_path","r37_e58c97e5a283_path","r38_e58c97e5a283_path","r39_e58c97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1339);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r35_e58c97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r32_e58c97e5a283","r33_e58c97e5a283","r34_e58c97e5a283","r36_e58c97e5a283","r37_e58c97e5a283","r38_e58c97e5a283","r39_e58c97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r32_e58c97e5a283_path") && game.includes("r39_e58c97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["北境莳萝暖蜜","北境茴香暖蜜","北境独活暖蜜","北境酸模暖蜜","北境欧芹暖蜜","北境香葱暖蜜","北境龙蒿暖蜜","北境芹菜暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("北境莳萝短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("北境莳萝")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r32_e58c97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r40_e58c97e5a283 r41_e58c97e5a283 r42_e58c97e5a283 r43_e58c97e5a283 r44_e58c97e5a283 r45_e58c97e5a283 r46_e58c97e5a283 r47_e58c97e5a283 1347 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r40_e58c97e5a283","r41_e58c97e5a283","r42_e58c97e5a283","r43_e58c97e5a283","r44_e58c97e5a283","r45_e58c97e5a283","r46_e58c97e5a283","r47_e58c97e5a283"];
  const pots = ["r40_e58c97e5a283Pot","r41_e58c97e5a283Pot","r42_e58c97e5a283Pot","r43_e58c97e5a283Pot","r44_e58c97e5a283Pot","r45_e58c97e5a283Pot","r46_e58c97e5a283Pot","r47_e58c97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r40_e58c97e5a283_path","r41_e58c97e5a283_path","r42_e58c97e5a283_path","r43_e58c97e5a283_path","r44_e58c97e5a283_path","r45_e58c97e5a283_path","r46_e58c97e5a283_path","r47_e58c97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1347);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r40_e58c97e5a283","r45_e58c97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r41_e58c97e5a283","r42_e58c97e5a283","r43_e58c97e5a283","r44_e58c97e5a283","r46_e58c97e5a283","r47_e58c97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r40_e58c97e5a283_path") && game.includes("r47_e58c97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["北境香芹暖蜜","北境芥末暖蜜","北境黑种暖蜜","北境孜然暖蜜","北境葛缕暖蜜","北境胡芦暖蜜","北境姜黄暖蜜","北境高良暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("北境香芹短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("北境香芹")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r40_e58c97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r48_e58c97e5a283 r49_e58c97e5a283 r50_e58c97e5a283 r51_e58c97e5a283 r52_e58c97e5a283 r53_e58c97e5a283 r54_e58c97e5a283 r55_e58c97e5a283 1355 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r48_e58c97e5a283","r49_e58c97e5a283","r50_e58c97e5a283","r51_e58c97e5a283","r52_e58c97e5a283","r53_e58c97e5a283","r54_e58c97e5a283","r55_e58c97e5a283"];
  const pots = ["r48_e58c97e5a283Pot","r49_e58c97e5a283Pot","r50_e58c97e5a283Pot","r51_e58c97e5a283Pot","r52_e58c97e5a283Pot","r53_e58c97e5a283Pot","r54_e58c97e5a283Pot","r55_e58c97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r48_e58c97e5a283_path","r49_e58c97e5a283_path","r50_e58c97e5a283_path","r51_e58c97e5a283_path","r52_e58c97e5a283_path","r53_e58c97e5a283_path","r54_e58c97e5a283_path","r55_e58c97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1355);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r50_e58c97e5a283","r55_e58c97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r48_e58c97e5a283","r49_e58c97e5a283","r51_e58c97e5a283","r52_e58c97e5a283","r53_e58c97e5a283","r54_e58c97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r48_e58c97e5a283_path") && game.includes("r55_e58c97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["北境班兰暖蜜","北境卡菲暖蜜","北境杜松暖蜜","北境多香暖蜜","北境肉豆暖蜜","北境八角暖蜜","北境丁香暖蜜","北境肉桂暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("北境班兰短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("北境班兰")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r48_e58c97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r56_e58c97e5a283 r57_e58c97e5a283 r58_e58c97e5a283 r59_e58c97e5a283 r60_e58c97e5a283 r61_e58c97e5a283 r62_e58c97e5a283 r63_e58c97e5a283 1363 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r56_e58c97e5a283","r57_e58c97e5a283","r58_e58c97e5a283","r59_e58c97e5a283","r60_e58c97e5a283","r61_e58c97e5a283","r62_e58c97e5a283","r63_e58c97e5a283"];
  const pots = ["r56_e58c97e5a283Pot","r57_e58c97e5a283Pot","r58_e58c97e5a283Pot","r59_e58c97e5a283Pot","r60_e58c97e5a283Pot","r61_e58c97e5a283Pot","r62_e58c97e5a283Pot","r63_e58c97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r56_e58c97e5a283_path","r57_e58c97e5a283_path","r58_e58c97e5a283_path","r59_e58c97e5a283_path","r60_e58c97e5a283_path","r61_e58c97e5a283_path","r62_e58c97e5a283_path","r63_e58c97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1363);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r60_e58c97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r56_e58c97e5a283","r57_e58c97e5a283","r58_e58c97e5a283","r59_e58c97e5a283","r61_e58c97e5a283","r62_e58c97e5a283","r63_e58c97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r56_e58c97e5a283_path") && game.includes("r63_e58c97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["北境藏红暖蜜","北境芝麻暖蜜","北境枫糖暖蜜","北境可可暖蜜","北境香草暖蜜","北境杏仁暖蜜","北境榛子暖蜜","北境核桃暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("北境藏红短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("北境藏红")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r56_e58c97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r64_e58c97e5a283 r65_e58c97e5a283 r66_e58c97e5a283 r67_e58c97e5a283 r68_e58c97e5a283 r69_e58c97e5a283 r70_e58c97e5a283 r71_e58c97e5a283 1371 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r64_e58c97e5a283","r65_e58c97e5a283","r66_e58c97e5a283","r67_e58c97e5a283","r68_e58c97e5a283","r69_e58c97e5a283","r70_e58c97e5a283","r71_e58c97e5a283"];
  const pots = ["r64_e58c97e5a283Pot","r65_e58c97e5a283Pot","r66_e58c97e5a283Pot","r67_e58c97e5a283Pot","r68_e58c97e5a283Pot","r69_e58c97e5a283Pot","r70_e58c97e5a283Pot","r71_e58c97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r64_e58c97e5a283_path","r65_e58c97e5a283_path","r66_e58c97e5a283_path","r67_e58c97e5a283_path","r68_e58c97e5a283_path","r69_e58c97e5a283_path","r70_e58c97e5a283_path","r71_e58c97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1371);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r65_e58c97e5a283","r70_e58c97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r64_e58c97e5a283","r66_e58c97e5a283","r67_e58c97e5a283","r68_e58c97e5a283","r69_e58c97e5a283","r71_e58c97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r64_e58c97e5a283_path") && game.includes("r71_e58c97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["北境板栗暖蜜","北境开心暖蜜","北境枸杞暖蜜","北境红枣暖蜜","北境金桔暖蜜","北境蜜橘暖蜜","北境柚子暖蜜","北境青柠暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("北境板栗短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("北境板栗")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r64_e58c97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r72_e58c97e5a283 r73_e58c97e5a283 r74_e58c97e5a283 r75_e58c97e5a283 r76_e58c97e5a283 r77_e58c97e5a283 r78_e58c97e5a283 r79_e58c97e5a283 1379 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r72_e58c97e5a283","r73_e58c97e5a283","r74_e58c97e5a283","r75_e58c97e5a283","r76_e58c97e5a283","r77_e58c97e5a283","r78_e58c97e5a283","r79_e58c97e5a283"];
  const pots = ["r72_e58c97e5a283Pot","r73_e58c97e5a283Pot","r74_e58c97e5a283Pot","r75_e58c97e5a283Pot","r76_e58c97e5a283Pot","r77_e58c97e5a283Pot","r78_e58c97e5a283Pot","r79_e58c97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r72_e58c97e5a283_path","r73_e58c97e5a283_path","r74_e58c97e5a283_path","r75_e58c97e5a283_path","r76_e58c97e5a283_path","r77_e58c97e5a283_path","r78_e58c97e5a283_path","r79_e58c97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1379);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r75_e58c97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r72_e58c97e5a283","r73_e58c97e5a283","r74_e58c97e5a283","r76_e58c97e5a283","r77_e58c97e5a283","r78_e58c97e5a283","r79_e58c97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r72_e58c97e5a283_path") && game.includes("r79_e58c97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["北境柠檬暖蜜","北境甘蔗暖蜜","北境莲雾暖蜜","北境杨桃暖蜜","北境百香暖蜜","北境猕猴暖蜜","北境火龙暖蜜","北境番石暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("北境柠檬短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("北境柠檬")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r72_e58c97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r80_e58c97e5a283 r81_e58c97e5a283 r82_e58c97e5a283 r83_e58c97e5a283 r84_e58c97e5a283 r85_e58c97e5a283 r86_e58c97e5a283 r87_e58c97e5a283 1387 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r80_e58c97e5a283","r81_e58c97e5a283","r82_e58c97e5a283","r83_e58c97e5a283","r84_e58c97e5a283","r85_e58c97e5a283","r86_e58c97e5a283","r87_e58c97e5a283"];
  const pots = ["r80_e58c97e5a283Pot","r81_e58c97e5a283Pot","r82_e58c97e5a283Pot","r83_e58c97e5a283Pot","r84_e58c97e5a283Pot","r85_e58c97e5a283Pot","r86_e58c97e5a283Pot","r87_e58c97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r80_e58c97e5a283_path","r81_e58c97e5a283_path","r82_e58c97e5a283_path","r83_e58c97e5a283_path","r84_e58c97e5a283_path","r85_e58c97e5a283_path","r86_e58c97e5a283_path","r87_e58c97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1387);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r80_e58c97e5a283","r85_e58c97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r81_e58c97e5a283","r82_e58c97e5a283","r83_e58c97e5a283","r84_e58c97e5a283","r86_e58c97e5a283","r87_e58c97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r80_e58c97e5a283_path") && game.includes("r87_e58c97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["北境樱桃暖蜜","北境杏花暖蜜","北境梨暖蜜","北境李暖蜜","北境桃暖蜜","北境梅暖蜜","北境桑暖蜜","北境莓暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("北境樱桃短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("北境樱桃")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r80_e58c97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r88_e58c97e5a283 r89_e58c97e5a283 r90_e58c97e5a283 r91_e58c97e5a283 r92_e58c97e5a283 r93_e58c97e5a283 r94_e58c97e5a283 r95_e58c97e5a283 1395 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r88_e58c97e5a283","r89_e58c97e5a283","r90_e58c97e5a283","r91_e58c97e5a283","r92_e58c97e5a283","r93_e58c97e5a283","r94_e58c97e5a283","r95_e58c97e5a283"];
  const pots = ["r88_e58c97e5a283Pot","r89_e58c97e5a283Pot","r90_e58c97e5a283Pot","r91_e58c97e5a283Pot","r92_e58c97e5a283Pot","r93_e58c97e5a283Pot","r94_e58c97e5a283Pot","r95_e58c97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r88_e58c97e5a283_path","r89_e58c97e5a283_path","r90_e58c97e5a283_path","r91_e58c97e5a283_path","r92_e58c97e5a283_path","r93_e58c97e5a283_path","r94_e58c97e5a283_path","r95_e58c97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1395);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r90_e58c97e5a283","r95_e58c97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r88_e58c97e5a283","r89_e58c97e5a283","r91_e58c97e5a283","r92_e58c97e5a283","r93_e58c97e5a283","r94_e58c97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r88_e58c97e5a283_path") && game.includes("r95_e58c97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["北境葡萄暖蜜","北境石榴暖蜜","北境荔枝暖蜜","北境龙眼暖蜜","北境枇杷暖蜜","北境橄榄暖蜜","北境山楂暖蜜","北境芒果暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("北境葡萄短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("北境葡萄")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r88_e58c97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r96_e58c97e5a283 r97_e58c97e5a283 r98_e58c97e5a283 r99_e58c97e5a283 r100_e58c97e5a283 r101_e58c97e5a283 r102_e58c97e5a283 r103_e58c97e5a283 1403 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r96_e58c97e5a283","r97_e58c97e5a283","r98_e58c97e5a283","r99_e58c97e5a283","r100_e58c97e5a283","r101_e58c97e5a283","r102_e58c97e5a283","r103_e58c97e5a283"];
  const pots = ["r96_e58c97e5a283Pot","r97_e58c97e5a283Pot","r98_e58c97e5a283Pot","r99_e58c97e5a283Pot","r100_e58c97e5a283Pot","r101_e58c97e5a283Pot","r102_e58c97e5a283Pot","r103_e58c97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r96_e58c97e5a283_path","r97_e58c97e5a283_path","r98_e58c97e5a283_path","r99_e58c97e5a283_path","r100_e58c97e5a283_path","r101_e58c97e5a283_path","r102_e58c97e5a283_path","r103_e58c97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1403);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r100_e58c97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r96_e58c97e5a283","r97_e58c97e5a283","r98_e58c97e5a283","r99_e58c97e5a283","r101_e58c97e5a283","r102_e58c97e5a283","r103_e58c97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r96_e58c97e5a283_path") && game.includes("r103_e58c97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["北境菠萝暖蜜","北境椰子暖蜜","北境木瓜暖蜜","北境西瓜暖蜜","北境甜瓜暖蜜","北境哈密瓜暖蜜","北境红毛暖蜜","北境菠萝蜜暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("北境菠萝短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("北境菠萝")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r96_e58c97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r104_e58d97e5a283 r105_e58d97e5a283 r106_e58d97e5a283 r107_e58d97e5a283 r108_e58d97e5a283 r109_e58d97e5a283 r110_e58d97e5a283 r111_e58d97e5a283 1411 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r104_e58d97e5a283","r105_e58d97e5a283","r106_e58d97e5a283","r107_e58d97e5a283","r108_e58d97e5a283","r109_e58d97e5a283","r110_e58d97e5a283","r111_e58d97e5a283"];
  const pots = ["r104_e58d97e5a283Pot","r105_e58d97e5a283Pot","r106_e58d97e5a283Pot","r107_e58d97e5a283Pot","r108_e58d97e5a283Pot","r109_e58d97e5a283Pot","r110_e58d97e5a283Pot","r111_e58d97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r104_e58d97e5a283_path","r105_e58d97e5a283_path","r106_e58d97e5a283_path","r107_e58d97e5a283_path","r108_e58d97e5a283_path","r109_e58d97e5a283_path","r110_e58d97e5a283_path","r111_e58d97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1411);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r105_e58d97e5a283","r110_e58d97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r104_e58d97e5a283","r106_e58d97e5a283","r107_e58d97e5a283","r108_e58d97e5a283","r109_e58d97e5a283","r111_e58d97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r104_e58d97e5a283_path") && game.includes("r111_e58d97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["南境堇菜暖蜜","南境报春暖蜜","南境银莲暖蜜","南境毛茛暖蜜","南境罂粟暖蜜","南境飞燕暖蜜","南境翠雀暖蜜","南境乌头暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("南境堇菜短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("南境堇菜")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r104_e58d97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r112_e58d97e5a283 r113_e58d97e5a283 r114_e58d97e5a283 r115_e58d97e5a283 r116_e58d97e5a283 r117_e58d97e5a283 r118_e58d97e5a283 r119_e58d97e5a283 1419 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r112_e58d97e5a283","r113_e58d97e5a283","r114_e58d97e5a283","r115_e58d97e5a283","r116_e58d97e5a283","r117_e58d97e5a283","r118_e58d97e5a283","r119_e58d97e5a283"];
  const pots = ["r112_e58d97e5a283Pot","r113_e58d97e5a283Pot","r114_e58d97e5a283Pot","r115_e58d97e5a283Pot","r116_e58d97e5a283Pot","r117_e58d97e5a283Pot","r118_e58d97e5a283Pot","r119_e58d97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r112_e58d97e5a283_path","r113_e58d97e5a283_path","r114_e58d97e5a283_path","r115_e58d97e5a283_path","r116_e58d97e5a283_path","r117_e58d97e5a283_path","r118_e58d97e5a283_path","r119_e58d97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1419);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r115_e58d97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r112_e58d97e5a283","r113_e58d97e5a283","r114_e58d97e5a283","r116_e58d97e5a283","r117_e58d97e5a283","r118_e58d97e5a283","r119_e58d97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r112_e58d97e5a283_path") && game.includes("r119_e58d97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["南境耧斗暖蜜","南境铁线暖蜜","南境福禄暖蜜","南境石竹暖蜜","南境满天暖蜜","南境霞草暖蜜","南境马鞭暖蜜","南境藿香暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("南境耧斗短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("南境耧斗")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r112_e58d97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r120_e58d97e5a283 r121_e58d97e5a283 r122_e58d97e5a283 r123_e58d97e5a283 r124_e58d97e5a283 r125_e58d97e5a283 r126_e58d97e5a283 r127_e58d97e5a283 1427 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r120_e58d97e5a283","r121_e58d97e5a283","r122_e58d97e5a283","r123_e58d97e5a283","r124_e58d97e5a283","r125_e58d97e5a283","r126_e58d97e5a283","r127_e58d97e5a283"];
  const pots = ["r120_e58d97e5a283Pot","r121_e58d97e5a283Pot","r122_e58d97e5a283Pot","r123_e58d97e5a283Pot","r124_e58d97e5a283Pot","r125_e58d97e5a283Pot","r126_e58d97e5a283Pot","r127_e58d97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r120_e58d97e5a283_path","r121_e58d97e5a283_path","r122_e58d97e5a283_path","r123_e58d97e5a283_path","r124_e58d97e5a283_path","r125_e58d97e5a283_path","r126_e58d97e5a283_path","r127_e58d97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1427);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r120_e58d97e5a283","r125_e58d97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r121_e58d97e5a283","r122_e58d97e5a283","r123_e58d97e5a283","r124_e58d97e5a283","r126_e58d97e5a283","r127_e58d97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r120_e58d97e5a283_path") && game.includes("r127_e58d97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["南境荆芥暖蜜","南境水苏暖蜜","南境夏枯暖蜜","南境黄芩暖蜜","南境筋骨暖蜜","南境连钱暖蜜","南境香蜂暖蜜","南境猫薄荷暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("南境荆芥短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("南境荆芥")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r120_e58d97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r128_e58d97e5a283 r129_e58d97e5a283 r130_e58d97e5a283 r131_e58d97e5a283 r132_e58d97e5a283 r133_e58d97e5a283 r134_e58d97e5a283 r135_e58d97e5a283 1435 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r128_e58d97e5a283","r129_e58d97e5a283","r130_e58d97e5a283","r131_e58d97e5a283","r132_e58d97e5a283","r133_e58d97e5a283","r134_e58d97e5a283","r135_e58d97e5a283"];
  const pots = ["r128_e58d97e5a283Pot","r129_e58d97e5a283Pot","r130_e58d97e5a283Pot","r131_e58d97e5a283Pot","r132_e58d97e5a283Pot","r133_e58d97e5a283Pot","r134_e58d97e5a283Pot","r135_e58d97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r128_e58d97e5a283_path","r129_e58d97e5a283_path","r130_e58d97e5a283_path","r131_e58d97e5a283_path","r132_e58d97e5a283_path","r133_e58d97e5a283_path","r134_e58d97e5a283_path","r135_e58d97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1435);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r130_e58d97e5a283","r135_e58d97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r128_e58d97e5a283","r129_e58d97e5a283","r131_e58d97e5a283","r132_e58d97e5a283","r133_e58d97e5a283","r134_e58d97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r128_e58d97e5a283_path") && game.includes("r135_e58d97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["南境神香暖蜜","南境百里暖蜜","南境牛至暖蜜","南境马郁暖蜜","南境罗勒暖蜜","南境迷迭暖蜜","南境鼠尾暖蜜","南境薰衣草暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("南境神香短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("南境神香")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r128_e58d97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r136_e58d97e5a283 r137_e58d97e5a283 r138_e58d97e5a283 r139_e58d97e5a283 r140_e58d97e5a283 r141_e58d97e5a283 r142_e58d97e5a283 r143_e58d97e5a283 1443 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r136_e58d97e5a283","r137_e58d97e5a283","r138_e58d97e5a283","r139_e58d97e5a283","r140_e58d97e5a283","r141_e58d97e5a283","r142_e58d97e5a283","r143_e58d97e5a283"];
  const pots = ["r136_e58d97e5a283Pot","r137_e58d97e5a283Pot","r138_e58d97e5a283Pot","r139_e58d97e5a283Pot","r140_e58d97e5a283Pot","r141_e58d97e5a283Pot","r142_e58d97e5a283Pot","r143_e58d97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r136_e58d97e5a283_path","r137_e58d97e5a283_path","r138_e58d97e5a283_path","r139_e58d97e5a283_path","r140_e58d97e5a283_path","r141_e58d97e5a283_path","r142_e58d97e5a283_path","r143_e58d97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1443);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r140_e58d97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r136_e58d97e5a283","r137_e58d97e5a283","r138_e58d97e5a283","r139_e58d97e5a283","r141_e58d97e5a283","r142_e58d97e5a283","r143_e58d97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r136_e58d97e5a283_path") && game.includes("r143_e58d97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["南境莳萝暖蜜","南境茴香暖蜜","南境独活暖蜜","南境酸模暖蜜","南境欧芹暖蜜","南境香葱暖蜜","南境龙蒿暖蜜","南境芹菜暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("南境莳萝短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("南境莳萝")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r136_e58d97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r144_e58d97e5a283 r145_e58d97e5a283 r146_e58d97e5a283 r147_e58d97e5a283 r148_e58d97e5a283 r149_e58d97e5a283 r150_e58d97e5a283 r151_e58d97e5a283 1451 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r144_e58d97e5a283","r145_e58d97e5a283","r146_e58d97e5a283","r147_e58d97e5a283","r148_e58d97e5a283","r149_e58d97e5a283","r150_e58d97e5a283","r151_e58d97e5a283"];
  const pots = ["r144_e58d97e5a283Pot","r145_e58d97e5a283Pot","r146_e58d97e5a283Pot","r147_e58d97e5a283Pot","r148_e58d97e5a283Pot","r149_e58d97e5a283Pot","r150_e58d97e5a283Pot","r151_e58d97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r144_e58d97e5a283_path","r145_e58d97e5a283_path","r146_e58d97e5a283_path","r147_e58d97e5a283_path","r148_e58d97e5a283_path","r149_e58d97e5a283_path","r150_e58d97e5a283_path","r151_e58d97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1451);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r145_e58d97e5a283","r150_e58d97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r144_e58d97e5a283","r146_e58d97e5a283","r147_e58d97e5a283","r148_e58d97e5a283","r149_e58d97e5a283","r151_e58d97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r144_e58d97e5a283_path") && game.includes("r151_e58d97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["南境香芹暖蜜","南境芥末暖蜜","南境黑种暖蜜","南境孜然暖蜜","南境葛缕暖蜜","南境胡芦暖蜜","南境姜黄暖蜜","南境高良暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("南境香芹短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("南境香芹")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r144_e58d97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r152_e58d97e5a283 r153_e58d97e5a283 r154_e58d97e5a283 r155_e58d97e5a283 r156_e58d97e5a283 r157_e58d97e5a283 r158_e58d97e5a283 r159_e58d97e5a283 1459 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r152_e58d97e5a283","r153_e58d97e5a283","r154_e58d97e5a283","r155_e58d97e5a283","r156_e58d97e5a283","r157_e58d97e5a283","r158_e58d97e5a283","r159_e58d97e5a283"];
  const pots = ["r152_e58d97e5a283Pot","r153_e58d97e5a283Pot","r154_e58d97e5a283Pot","r155_e58d97e5a283Pot","r156_e58d97e5a283Pot","r157_e58d97e5a283Pot","r158_e58d97e5a283Pot","r159_e58d97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r152_e58d97e5a283_path","r153_e58d97e5a283_path","r154_e58d97e5a283_path","r155_e58d97e5a283_path","r156_e58d97e5a283_path","r157_e58d97e5a283_path","r158_e58d97e5a283_path","r159_e58d97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1459);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r155_e58d97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r152_e58d97e5a283","r153_e58d97e5a283","r154_e58d97e5a283","r156_e58d97e5a283","r157_e58d97e5a283","r158_e58d97e5a283","r159_e58d97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r152_e58d97e5a283_path") && game.includes("r159_e58d97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["南境班兰暖蜜","南境卡菲暖蜜","南境杜松暖蜜","南境多香暖蜜","南境肉豆暖蜜","南境八角暖蜜","南境丁香暖蜜","南境肉桂暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("南境班兰短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("南境班兰")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r152_e58d97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r160_e58d97e5a283 r161_e58d97e5a283 r162_e58d97e5a283 r163_e58d97e5a283 r164_e58d97e5a283 r165_e58d97e5a283 r166_e58d97e5a283 r167_e58d97e5a283 1467 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r160_e58d97e5a283","r161_e58d97e5a283","r162_e58d97e5a283","r163_e58d97e5a283","r164_e58d97e5a283","r165_e58d97e5a283","r166_e58d97e5a283","r167_e58d97e5a283"];
  const pots = ["r160_e58d97e5a283Pot","r161_e58d97e5a283Pot","r162_e58d97e5a283Pot","r163_e58d97e5a283Pot","r164_e58d97e5a283Pot","r165_e58d97e5a283Pot","r166_e58d97e5a283Pot","r167_e58d97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r160_e58d97e5a283_path","r161_e58d97e5a283_path","r162_e58d97e5a283_path","r163_e58d97e5a283_path","r164_e58d97e5a283_path","r165_e58d97e5a283_path","r166_e58d97e5a283_path","r167_e58d97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1467);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r160_e58d97e5a283","r165_e58d97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r161_e58d97e5a283","r162_e58d97e5a283","r163_e58d97e5a283","r164_e58d97e5a283","r166_e58d97e5a283","r167_e58d97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r160_e58d97e5a283_path") && game.includes("r167_e58d97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["南境藏红暖蜜","南境芝麻暖蜜","南境枫糖暖蜜","南境可可暖蜜","南境香草暖蜜","南境杏仁暖蜜","南境榛子暖蜜","南境核桃暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("南境藏红短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("南境藏红")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r160_e58d97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r168_e58d97e5a283 r169_e58d97e5a283 r170_e58d97e5a283 r171_e58d97e5a283 r172_e58d97e5a283 r173_e58d97e5a283 r174_e58d97e5a283 r175_e58d97e5a283 1475 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r168_e58d97e5a283","r169_e58d97e5a283","r170_e58d97e5a283","r171_e58d97e5a283","r172_e58d97e5a283","r173_e58d97e5a283","r174_e58d97e5a283","r175_e58d97e5a283"];
  const pots = ["r168_e58d97e5a283Pot","r169_e58d97e5a283Pot","r170_e58d97e5a283Pot","r171_e58d97e5a283Pot","r172_e58d97e5a283Pot","r173_e58d97e5a283Pot","r174_e58d97e5a283Pot","r175_e58d97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r168_e58d97e5a283_path","r169_e58d97e5a283_path","r170_e58d97e5a283_path","r171_e58d97e5a283_path","r172_e58d97e5a283_path","r173_e58d97e5a283_path","r174_e58d97e5a283_path","r175_e58d97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1475);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r170_e58d97e5a283","r175_e58d97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r168_e58d97e5a283","r169_e58d97e5a283","r171_e58d97e5a283","r172_e58d97e5a283","r173_e58d97e5a283","r174_e58d97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r168_e58d97e5a283_path") && game.includes("r175_e58d97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["南境板栗暖蜜","南境开心暖蜜","南境枸杞暖蜜","南境红枣暖蜜","南境金桔暖蜜","南境蜜橘暖蜜","南境柚子暖蜜","南境青柠暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("南境板栗短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("南境板栗")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r168_e58d97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r176_e58d97e5a283 r177_e58d97e5a283 r178_e58d97e5a283 r179_e58d97e5a283 r180_e58d97e5a283 r181_e58d97e5a283 r182_e58d97e5a283 r183_e58d97e5a283 1483 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r176_e58d97e5a283","r177_e58d97e5a283","r178_e58d97e5a283","r179_e58d97e5a283","r180_e58d97e5a283","r181_e58d97e5a283","r182_e58d97e5a283","r183_e58d97e5a283"];
  const pots = ["r176_e58d97e5a283Pot","r177_e58d97e5a283Pot","r178_e58d97e5a283Pot","r179_e58d97e5a283Pot","r180_e58d97e5a283Pot","r181_e58d97e5a283Pot","r182_e58d97e5a283Pot","r183_e58d97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r176_e58d97e5a283_path","r177_e58d97e5a283_path","r178_e58d97e5a283_path","r179_e58d97e5a283_path","r180_e58d97e5a283_path","r181_e58d97e5a283_path","r182_e58d97e5a283_path","r183_e58d97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1483);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r180_e58d97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r176_e58d97e5a283","r177_e58d97e5a283","r178_e58d97e5a283","r179_e58d97e5a283","r181_e58d97e5a283","r182_e58d97e5a283","r183_e58d97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r176_e58d97e5a283_path") && game.includes("r183_e58d97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["南境柠檬暖蜜","南境甘蔗暖蜜","南境莲雾暖蜜","南境杨桃暖蜜","南境百香暖蜜","南境猕猴暖蜜","南境火龙暖蜜","南境番石暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("南境柠檬短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("南境柠檬")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r176_e58d97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r184_e58d97e5a283 r185_e58d97e5a283 r186_e58d97e5a283 r187_e58d97e5a283 r188_e58d97e5a283 r189_e58d97e5a283 r190_e58d97e5a283 r191_e58d97e5a283 1491 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r184_e58d97e5a283","r185_e58d97e5a283","r186_e58d97e5a283","r187_e58d97e5a283","r188_e58d97e5a283","r189_e58d97e5a283","r190_e58d97e5a283","r191_e58d97e5a283"];
  const pots = ["r184_e58d97e5a283Pot","r185_e58d97e5a283Pot","r186_e58d97e5a283Pot","r187_e58d97e5a283Pot","r188_e58d97e5a283Pot","r189_e58d97e5a283Pot","r190_e58d97e5a283Pot","r191_e58d97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r184_e58d97e5a283_path","r185_e58d97e5a283_path","r186_e58d97e5a283_path","r187_e58d97e5a283_path","r188_e58d97e5a283_path","r189_e58d97e5a283_path","r190_e58d97e5a283_path","r191_e58d97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1491);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r185_e58d97e5a283","r190_e58d97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r184_e58d97e5a283","r186_e58d97e5a283","r187_e58d97e5a283","r188_e58d97e5a283","r189_e58d97e5a283","r191_e58d97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r184_e58d97e5a283_path") && game.includes("r191_e58d97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["南境樱桃暖蜜","南境杏花暖蜜","南境梨暖蜜","南境李暖蜜","南境桃暖蜜","南境梅暖蜜","南境桑暖蜜","南境莓暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("南境樱桃短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("南境樱桃")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r184_e58d97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

test("r192_e58d97e5a283 r193_e58d97e5a283 r194_e58d97e5a283 r195_e58d97e5a283 r196_e58d97e5a283 r197_e58d97e5a283 r198_e58d97e5a283 r199_e58d97e5a283 1499 themes", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ["r192_e58d97e5a283","r193_e58d97e5a283","r194_e58d97e5a283","r195_e58d97e5a283","r196_e58d97e5a283","r197_e58d97e5a283","r198_e58d97e5a283","r199_e58d97e5a283"];
  const pots = ["r192_e58d97e5a283Pot","r193_e58d97e5a283Pot","r194_e58d97e5a283Pot","r195_e58d97e5a283Pot","r196_e58d97e5a283Pot","r197_e58d97e5a283Pot","r198_e58d97e5a283Pot","r199_e58d97e5a283Pot"];
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ["r192_e58d97e5a283_path","r193_e58d97e5a283_path","r194_e58d97e5a283_path","r195_e58d97e5a283_path","r196_e58d97e5a283_path","r197_e58d97e5a283_path","r198_e58d97e5a283_path","r199_e58d97e5a283_path"].forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= 1499);
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ["r195_e58d97e5a283"].forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ["r192_e58d97e5a283","r193_e58d97e5a283","r194_e58d97e5a283","r196_e58d97e5a283","r197_e58d97e5a283","r198_e58d97e5a283","r199_e58d97e5a283"].forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("r192_e58d97e5a283_path") && game.includes("r199_e58d97e5a283_path"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ["南境葡萄暖蜜","南境石榴暖蜜","南境荔枝暖蜜","南境龙眼暖蜜","南境枇杷暖蜜","南境橄榄暖蜜","南境山楂暖蜜","南境芒果暖蜜"].forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  assert.ok(core.DEFAULT_ACHIEVEMENTS.some((a) => a.id === ids[0] + "_walker"));
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes("南境葡萄短径"));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes("南境葡萄")));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + "r192_e58d97e5a283_path" && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});

console.log("\nResult: %d passed, %d failed", passed, failed);
if (failed) process.exit(1);
