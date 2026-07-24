#!/usr/bin/env node
"use strict";
/**
 * Add authentic plant+path+shop batch for 晚风小路.
 * Usage: node tools/add-plant-path-shop-batch.js batch.json
 * batch.json: [{id,name,emoji,tags,days,themeId,themeName,season,who,seedTitle}]
 */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const load = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const save = (p, o) => fs.writeFileSync(path.join(root, p), JSON.stringify(o, null, 2) + "\n");

function uniqTitle(base, used) {
  let t = base, n = 2;
  while (used.has(t)) { t = base + "·" + n; n++; }
  used.add(t);
  return t;
}

function buildEntry(raw) {
  const { id, name, emoji, tags, days, themeId, themeName, season, who, seedTitle } = raw;
  const winter = season === "winter";
  const sky = winter
    ? ["#282830", "#383848", "#585868", "#8888a0", "#c0c0d0"]
    : ["#203028", "#304838", "#506858", "#80a888", "#c0d8c0"];
  const ground = winter ? "#3a3a48" : "#2a4038";
  const pathCol = winter ? "#686878" : "#587868";
  return {
    id, name, emoji, days, tags, pot: id + "Pot", season,
    theme: {
      id: themeId, name: themeName, emoji,
      desc: name + "沿径，蜜与叶更常见。",
      sky, ground, path: pathCol,
      bias: { [id]: 2.7, honey: 2.0, leaf: 1.4, stone: 1.2 },
      ambient: [name + "的香很静。", "径很软，叶很轻。", "你拾起一点。"],
    },
    customer: {
      name: who, avatar: emoji, wish: name + "或蜜，慢慢喝也好。",
      tags, flavors: [id, "honey", "tea_leaf", tags.includes("清爽") ? "mint" : "lavender_bud"],
    },
    recipes: [
      { id: "rec_" + id + "_honey", name: name + "暖蜜", base: "honey_water", flavor: id },
      { id: "rec_" + id + "_tea", name: name + "暖茶", base: "floral_tea", flavor: id },
    ],
    tips: [name + "暖茶适合慢夜。"],
    mail: {
      id: "mail_" + id, title: name + "两份",
      body: who + "来信：新摘的。给你两份，别放太久。",
      effect: { items: { [id]: 2 }, coins: 2 },
    },
    events: [
      { id: "ev_" + id + "_sill", title: name + "窗台", body: name + "的香慢慢来。你浇水时放轻了手，晚风把叶边掀起一点，光也跟着碎了一点。" },
      { id: "ev_" + themeId, title: themeName, body: themeName + "把香铺得很长。你侧身走过，叶在风里轻轻晃，香气刚好不吵。" },
      { id: "ev_" + id + "_guest", title: "采" + name + "的人", body: "客人说" + name + "要温柔。你点头，把蜜多放了半勺，杯沿更润，灯也更暖。" },
      { id: "ev_" + id + "_seed", title: seedTitle, body: name + "落在掌心，比想象中更轻。你把它们收好，光也跟着碎了一点。" },
      { id: "ev_continue_" + id, title: "继续走·又见" + themeName, body: "第二次走" + themeName + "，" + name + "的香更熟，光也更稳。你把竹篮提得更稳。" },
    ],
  };
}

function applyBatch(rawList) {
  const batch = rawList.map(buildEntry);
  const ce = load("data/content-extra.json");
  const themes = load("data/path-themes.json");
  const rec = load("data/secret-recipes.json");
  const shop = load("data/shop-config.json");
  const mailRaw = load("data/mail.json");
  const mailArr = Array.isArray(mailRaw) ? mailRaw : mailRaw.letters;
  const events = load("data/evening-events.json");
  const titleSet = new Set(events.map((e) => e.title));
  for (const b of batch) {
    if (ce.items[b.id] || themes.some((t) => t.id === b.theme.id)) throw new Error("exists " + b.id);
    ce.items[b.id] = { id: b.id, name: b.name, emoji: b.emoji, kind: "风味", seed: b.pot };
    ce.plants[b.pot] = { id: b.pot, name: b.name, emoji: ["🌱", "🌿", b.emoji], harvest: b.id, days: b.days };
    ce.flavors.push({ id: b.id, name: b.name, emoji: b.emoji, need: b.id, tags: b.tags });
    ce.customers.push(b.customer);
    themes.push(b.theme);
    for (const r of b.recipes) rec.push({ id: r.id, name: r.name, cup: "mug", base: r.base, flavor: r.flavor, topping: "none" });
    for (const t of b.tips) if (!shop.tipMessages.includes(t)) shop.tipMessages.push(t);
    mailArr.push(b.mail);
    for (const ev of b.events) {
      ev.title = uniqTitle(ev.title, titleSet);
      if ((ev.body || "").length <= 12) throw new Error("short " + ev.id);
      events.push(ev);
    }
  }
  save("data/content-extra.json", ce);
  save("data/path-themes.json", themes);
  save("data/secret-recipes.json", rec);
  save("data/shop-config.json", shop);
  save("data/mail.json", mailRaw);
  save("data/evening-events.json", events);

  const summerIds = batch.filter((b) => b.season === "summer").map((b) => b.id);
  const winterIds = batch.filter((b) => b.season === "winter").map((b) => b.id);

  let core = fs.readFileSync(path.join(root, "js/core.js"), "utf8");
  const summerBlock = core.match(/summer: \[[\s\S]*?\n    \],\n    autumn:/)[0];
  core = core.replace(summerBlock, summerBlock.replace(/\n    \],\n    autumn:/,
    "\n" + summerIds.map((id) => `      { flavor: "${id}", label: "${batch.find((b) => b.id === id).name}" },`).join("\n") + "\n    ],\n    autumn:"));
  const winterBlock = core.match(/winter: \[[\s\S]*?\n    \],\n    dusk:/)[0];
  core = core.replace(winterBlock, winterBlock.replace(/\n    \],\n    dusk:/,
    "\n" + winterIds.map((id) => `      { flavor: "${id}", label: "${batch.find((b) => b.id === id).name}" },`).join("\n") + "\n    ],\n    dusk:"));
  // Do NOT inject per-plant DEFAULT_ACHIEVEMENTS (was tens of thousands of
  // _sill/_walker entries — opening 温柔成就 froze the UI). Discoveries still
  // track via state.discovered / _themesTouched; FORAGE handles drink notes.
  // FORAGE set drives 野草特调; seasonal tags cover 夏日/冬日 soft bonuses.
  // Do NOT inject mega || flavor chains or per-theme drawWeather else-if blocks —
  // that previously grew game.js past the browser parse stack (~17k nested branches).
  const fm = core.match(/var FORAGE_FLAVORS = \{[\s\S]*?\n    \};/)[0];
  core = core.replace(fm, fm.replace(/\n    \};$/, ",\n" + batch.map((b) => `      ${b.id}: true`).join(",\n") + "\n    };"));
  fs.writeFileSync(path.join(root, "js/core.js"), core);

  // drawWeather uses a generic particle fallback for batch theme ids (see game.js).
  // Keep game.js untouched here so Pages/file:// stay interactive.

  let man = fs.readFileSync(path.join(root, "../docs/USER_MANUAL.md"), "utf8");
  const names = batch.map((b) => b.theme.name).filter((n) => !man.includes(n));
  if (names.length) {
    // append after last batch theme if possible
    const anchors = ["鹅绒委陵菜径", "水苏晚径", "一枝黄花草甸", "缬草晚径"];
    for (const a of anchors) {
      if (man.includes(a)) {
        man = man.replace(a, a + "、" + names.join("、"));
        break;
      }
    }
    fs.writeFileSync(path.join(root, "../docs/USER_MANUAL.md"), man);
  }

  const n = themes.length;
  const ids = batch.map((b) => b.id);
  const pots = batch.map((b) => b.pot);
  const themeIds = batch.map((b) => b.theme.id);
  const recipes = batch.map((b) => b.recipes[0].name);
  const testName = ids.join(" ") + " " + n + " themes";
  let tests = fs.readFileSync(path.join(root, "tests/run.js"), "utf8");
  if (!tests.includes(ids[0] + " " + ids[1])) {
    const block = `
test("${testName}", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "content-extra.json"), "utf8"));
  const ids = ${JSON.stringify(ids)};
  const pots = ${JSON.stringify(pots)};
  ids.forEach((id, i) => { assert.ok(j.items[id] && j.plants[pots[i]], id); });
  const cat = core.mergeCatalog({ items: j.items, plants: j.plants, flavors: j.flavors });
  const s = core.defaultState();
  ids.forEach((id) => { s.bag[id] = 1; });
  ids.slice(0, 4).forEach((id, i) => { assert.ok(core.plantSeed(s, i, id, cat).ok, id); });
  const themes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "path-themes.json"), "utf8"));
  ${JSON.stringify(themeIds)}.forEach((tid) => assert.ok(themes.some((th) => th.id === tid), tid));
  assert.ok(themes.length >= ${n});
  assert.strictEqual(new Set(themes.map((th) => th.id)).size, themes.length);
  const score = core.scoreDrink(
    { name: "t", tags: ["草本"], flavors: [ids[0]] },
    { cup: "mug", base: "honey_water", flavor: ids[0], topping: "none" },
    { cups: [{ id: "mug", vibe: "温柔" }], bases: j.bases, flavors: j.flavors, toppings: [{ id: "none" }] }
  );
  assert.ok(score.notes.some((n) => n === "野草特调"), JSON.stringify(score.notes));
  const winterPool = core.DAILY_SPECIAL_BY_SEASON.winter.map((x) => x.flavor);
  const summerPool = core.DAILY_SPECIAL_BY_SEASON.summer.map((x) => x.flavor);
  ${JSON.stringify(winterIds)}.forEach((id) => assert.ok(winterPool.includes(id), "w " + id));
  ${JSON.stringify(summerIds)}.forEach((id) => assert.ok(summerPool.includes(id), "s " + id));
  const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  assert.ok(game.includes("function drawWeather") && game.includes("function drawWalk"));
  const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "secret-recipes.json"), "utf8"));
  ${JSON.stringify(recipes)}.forEach((name) => assert.ok(recipes.some((r) => r.name === name), name));
  // bulk per-plant achievements intentionally not injected (UI perf)
  const man = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "USER_MANUAL.md"), "utf8");
  assert.ok(man.includes(${JSON.stringify(batch[0].theme.name)}));
  const shop = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "shop-config.json"), "utf8"));
  assert.ok(shop.tipMessages.some((t) => t.includes(${JSON.stringify(batch[0].name)})));
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evening-events.json"), "utf8"));
  assert.ok(events.some((e) => e.id === "ev_" + ${JSON.stringify(themeIds[0])} && e.body.length > 12));
  const titles = events.map((e) => e.title);
  assert.strictEqual(new Set(titles).size, titles.length);
  const rr = fs.readFileSync(path.join(__dirname, "..", "tools", "run-rounds.js"), "utf8");
  assert.ok(rr.includes("DISABLED"));
});
`;
    tests = tests.replace('\nconsole.log("\\nResult: %d passed, %d failed", passed, failed);',
      block + '\nconsole.log("\\nResult: %d passed, %d failed", passed, failed);');
    fs.writeFileSync(path.join(root, "tests/run.js"), tests);
  }
  return { themes: n, ids, names: batch.map((b) => b.name) };
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node tools/add-plant-path-shop-batch.js batch.json");
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const r = applyBatch(raw);
  console.log(JSON.stringify(r, null, 2));
}

module.exports = { applyBatch, buildEntry };
