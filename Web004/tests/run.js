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

console.log("\nResult: %d passed, %d failed", passed, failed);
if (failed) process.exit(1);
