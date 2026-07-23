/* 晚风小路 · 散步 + 盆栽 + 汽水铺 · DOM/canvas layer */
(() => {
  "use strict";

  const Core = globalThis.WanfengCore;
  if (!Core) {
    console.error("WanfengCore missing — load js/core.js first");
    return;
  }

  // roundRect 兼容
  if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const radius = typeof r === "number" ? r : 8;
      this.beginPath();
      this.moveTo(x + radius, y);
      this.arcTo(x + w, y, x + w, y + h, radius);
      this.arcTo(x + w, y + h, x, y + h, radius);
      this.arcTo(x, y + h, x, y, radius);
      this.arcTo(x, y, x + w, y, radius);
      this.closePath();
      return this;
    };
  }

  const SAVE_KEY = Core.SAVE_KEY;

  // ---------- 图鉴数据（from shipped core + optional extra catalog） ----------
  const extra = globalThis.WanfengExtra || {};
  let catalog = Core.mergeCatalog({
    items: extra.items || {},
    plants: extra.plants || {},
    cups: extra.cups || [],
    bases: extra.bases || [],
    flavors: extra.flavors || [],
    toppings: extra.toppings || [],
    customers: extra.customers || [],
  });
  const ITEMS = catalog.items;
  const PLANTS = catalog.plants;
  let CUPS = catalog.cups.slice();
  let BASES = catalog.bases.slice();
  let FLAVORS = catalog.flavors.slice();
  // keep shop UI readable: prefer base options + a sample of extras
  if (FLAVORS.length > 16) {
    const baseIds = new Set(Core.DEFAULT_FLAVORS.map((f) => f.id));
    const base = FLAVORS.filter((f) => baseIds.has(f.id));
    const rest = FLAVORS.filter((f) => !baseIds.has(f.id)).slice(-10);
    FLAVORS = base.concat(rest);
  }
  let TOPPINGS = catalog.toppings.slice();
  if (TOPPINGS.length > 12) {
    const baseIds = new Set(Core.DEFAULT_TOPPINGS.map((t) => t.id));
    const base = TOPPINGS.filter((t) => baseIds.has(t.id));
    const rest = TOPPINGS.filter((t) => !baseIds.has(t.id)).slice(-8);
    TOPPINGS = base.concat(rest);
  }
  let CUSTOMERS = catalog.customers.slice();
  if (CUSTOMERS.length > 24) {
    CUSTOMERS = Core.DEFAULT_CUSTOMERS.concat(CUSTOMERS.slice(-16));
  }

  const PATH_SPAWNS = Object.keys(ITEMS).filter((id) => ITEMS[id] && !String(id).startsWith("seed_")).slice(0, 40);
  const DIALOGUES = (extra.dialogues || []).map((d) => (typeof d === "string" ? d : d.text)).filter(Boolean);

  // ---------- 状态 ----------
  function defaultState() {
    return Core.defaultState(4);
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return Core.deserialize(raw);
    } catch {
      return null;
    }
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, Core.serialize(state));
    } catch { /* ignore */ }
  }

  let state = load() || defaultState();
  if (!state.customer) state.customer = randomCustomer();

  function bagCount() {
    return Core.bagCount(state);
  }

  function hasItem(id, n = 1) {
    return Core.hasItem(state, id, n);
  }

  function addItem(id, n = 1) {
    Core.addItem(state, id, n);
    save();
    refreshResources();
  }

  function takeItem(id, n = 1) {
    const ok = Core.takeItem(state, id, n);
    if (ok) {
      save();
      refreshResources();
    }
    return ok;
  }

  // expose for debugging / tests in browser
  globalThis.WanfengGame = {
    getState: () => state,
    core: Core,
    addItem,
    hasItem,
    takeItem,
    advanceSeason: () => {
      Core.advanceSeason(state);
      checkAchievements();
      save();
      refreshResources();
      return state.season;
    },
  };

  function toast(msg) {
    const stack = document.getElementById("toast-stack");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 300);
    }, 2400);
  }

  function refreshResources() {
    document.getElementById("res-coins").textContent = state.coins;
    document.getElementById("res-hearts").textContent = state.hearts;
    document.getElementById("res-bag").textContent = bagCount();
    const seasonEl = document.getElementById("res-season");
    if (seasonEl) {
      seasonEl.textContent = Core.SEASON_LABELS[state.season] || state.season || "黄昏";
    }
    applySeasonArt();
  }

  function applySeasonArt() {
    const art = Core.SEASON_ART[state.season] || Core.SEASON_ART.dusk;
    const hero = document.querySelector(".hero-art");
    if (hero && art) hero.src = art;
    const walkBanner = document.querySelector("#screen-walk .scene-banner");
    if (walkBanner && art) walkBanner.src = art;
    const title = document.getElementById("home-title");
    if (title) {
      const label = Core.SEASON_LABELS[state.season] || "黄昏";
      title.textContent = label + "的风也很温柔";
    }
  }

  function checkAchievements(silent) {
    const newly = Core.evaluateAchievements(state);
    if (newly.length) {
      save();
      if (!silent) {
        newly.forEach((a) => toast("✨ 成就：" + a.name));
      }
    }
    return newly;
  }

  // ---------- 导航 ----------
  function go(screen) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    const el = document.getElementById(`screen-${screen}`);
    if (el) el.classList.add("active");

    if (screen === "walk") startWalk();
    if (screen === "garden") renderGarden();
    if (screen === "shop") renderShop();
    if (screen === "album") renderAlbum(currentAlbumTab);
    if (screen === "journal") renderJournal();
    if (screen === "achievements") renderAchievements();
    if (screen !== "walk") stopWalk();
  }

  function renderJournal() {
    const box = document.getElementById("journal-list");
    if (!box) return;
    const entries = (state.journal || []).slice().reverse();
    if (!entries.length) {
      box.innerHTML = '<div class="journal-card"><p class="muted">还没有写下什么。去散散步、浇浇水、做一杯汽水吧。</p></div>';
      return;
    }
    box.innerHTML = entries
      .map((e) => {
        const season = Core.SEASON_LABELS[e.season] || e.season || "";
        return `<article class="journal-card"><div class="meta">第 ${e.day || "?"} 天 · ${season}</div><p>${e.text}</p></article>`;
      })
      .join("");
  }

  function renderAchievements() {
    const grid = document.getElementById("achievements-grid");
    if (!grid) return;
    checkAchievements(true);
    grid.innerHTML = Core.DEFAULT_ACHIEVEMENTS.map((a) => {
      const done = !!(state.achievements && state.achievements[a.id]);
      return `<div class="album-card ${done ? "done" : "locked"}">
        <div class="emoji">${done ? "✨" : "☁️"}</div>
        <div class="name">${a.name}</div>
        <div class="meta">${done ? "已达成 · " + a.desc : a.desc}</div>
      </div>`;
    }).join("");
  }

  document.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => go(btn.dataset.go));
  });

  // ---------- 散步（Canvas） ----------
  const canvas = document.getElementById("walk-canvas");
  const ctx = canvas.getContext("2d");
  let walkRaf = 0;
  let walkRunning = false;
  let keys = { left: false, right: false };
  let world = null;

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeWorld(seed) {
    const rand = mulberry32(seed);
    const width = 3200;
    const items = [];
    const trees = [];
    const hills = [];

    for (let i = 0; i < 28; i++) {
      const id = PATH_SPAWNS[Math.floor(rand() * PATH_SPAWNS.length)];
      items.push({
        id,
        x: 180 + rand() * (width - 360),
        y: 0,
        taken: false,
        bob: rand() * Math.PI * 2,
      });
    }

    for (let i = 0; i < 18; i++) {
      trees.push({
        x: rand() * width,
        h: 40 + rand() * 50,
        type: rand() > 0.5 ? 0 : 1,
      });
    }

    for (let i = 0; i < 6; i++) {
      hills.push({
        x: i * 600 + rand() * 100,
        w: 400 + rand() * 280,
        h: 60 + rand() * 50,
        color: rand() > 0.5 ? "#a8c47c" : "#96b86e",
      });
    }

    return {
      seed,
      width,
      camX: 0,
      playerX: 120,
      playerFacing: 1,
      groundY: 0,
      items,
      trees,
      hills,
      time: 0,
      collected: 0,
    };
  }

  function startWalk() {
    if (!world) world = makeWorld(1000 + state.pathsWalked * 97);
    walkRunning = true;
    resizeWalk();
    cancelAnimationFrame(walkRaf);
    loopWalk();
  }

  function stopWalk() {
    walkRunning = false;
    cancelAnimationFrame(walkRaf);
  }

  function resizeWalk() {
    const stage = document.getElementById("walk-stage");
    const w = stage.clientWidth || 900;
    const h = Math.min(420, Math.max(280, Math.round(w * 0.42)));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (world) world.groundY = h * 0.72;
  }

  window.addEventListener("resize", () => {
    if (walkRunning) resizeWalk();
  });

  function loopWalk() {
    if (!walkRunning) return;
    updateWalk();
    drawWalk();
    walkRaf = requestAnimationFrame(loopWalk);
  }

  function updateWalk() {
    if (!world) return;
    world.time += 1;
    const speed = 3.2;
    if (keys.left) {
      world.playerX -= speed;
      world.playerFacing = -1;
    }
    if (keys.right) {
      world.playerX += speed;
      world.playerFacing = 1;
    }
    world.playerX = Math.max(60, Math.min(world.width - 60, world.playerX));

    const viewW = canvas.clientWidth || 900;
    world.camX = world.playerX - viewW * 0.35;
    world.camX = Math.max(0, Math.min(world.width - viewW, world.camX));

    // 拾取
    for (const it of world.items) {
      if (it.taken) continue;
      if (Math.abs(it.x - world.playerX) < 36) {
        it.taken = true;
        world.collected++;
        addItem(it.id, 1);
        const def = ITEMS[it.id];
        showPickup(`${def.emoji} 捡到了 ${def.name}`);
        toast(`${def.emoji} 背包 +1 ${def.name}`);
        // 种子提示
        if (def.seed && PLANTS[def.seed]) {
          // 收集物本身可种
        }
      }
    }
  }

  function showPickup(text) {
    const el = document.getElementById("pickup-toast");
    el.hidden = false;
    el.textContent = text;
    clearTimeout(showPickup._t);
    showPickup._t = setTimeout(() => {
      el.hidden = true;
    }, 1400);
  }

  function drawWalk() {
    if (!world) return;
    const w = canvas.clientWidth || 900;
    const h = canvas.clientHeight || 420;
    const cam = world.camX;
    const gy = world.groundY;

    // 天空渐变：黄昏
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#3d4a6b");
    sky.addColorStop(0.35, "#8b6a8a");
    sky.addColorStop(0.55, "#e8a878");
    sky.addColorStop(0.75, "#f0c898");
    sky.addColorStop(1, "#c8b888");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // 太阳
    const sunX = w * 0.78;
    const sunY = h * 0.28;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 70);
    sunGrad.addColorStop(0, "rgba(255, 240, 180, 0.95)");
    sunGrad.addColorStop(0.4, "rgba(255, 180, 100, 0.55)");
    sunGrad.addColorStop(1, "rgba(255, 140, 80, 0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
    ctx.fill();

    // 远山
    for (const hill of world.hills) {
      const hx = hill.x - cam * 0.45;
      ctx.fillStyle = hill.color;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.ellipse(hx, gy + 20, hill.w / 2, hill.h, 0, Math.PI, 0);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 地面
    ctx.fillStyle = "#8faf6a";
    ctx.fillRect(0, gy, w, h - gy);
    ctx.fillStyle = "#a8c47c";
    ctx.fillRect(0, gy, w, 12);

    // 小路
    ctx.fillStyle = "#c4ae88";
    ctx.beginPath();
    ctx.moveTo(0, gy + 8);
    for (let x = 0; x <= w; x += 20) {
      const wx = x + cam;
      const wave = Math.sin(wx * 0.01) * 6;
      ctx.lineTo(x, gy + 28 + wave);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // 小路纹理
    ctx.strokeStyle = "rgba(160, 130, 90, 0.25)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 14]);
    ctx.beginPath();
    ctx.moveTo(0, gy + 48);
    for (let x = 0; x <= w; x += 16) {
      const wx = x + cam;
      ctx.lineTo(x, gy + 48 + Math.sin(wx * 0.012) * 5);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 树
    for (const t of world.trees) {
      const tx = t.x - cam;
      if (tx < -80 || tx > w + 80) continue;
      ctx.fillStyle = "#6b5344";
      ctx.fillRect(tx - 5, gy - t.h * 0.35, 10, t.h * 0.4);
      ctx.fillStyle = t.type ? "#5f8f5a" : "#6fa86a";
      ctx.beginPath();
      ctx.ellipse(tx, gy - t.h * 0.5, 22 + t.h * 0.15, 28 + t.h * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 可拾取物
    ctx.font = "28px serif";
    ctx.textAlign = "center";
    for (const it of world.items) {
      if (it.taken) continue;
      const ix = it.x - cam;
      if (ix < -40 || ix > w + 40) continue;
      const bob = Math.sin(world.time * 0.05 + it.bob) * 4;
      const def = ITEMS[it.id];
      // 光晕
      ctx.fillStyle = "rgba(255, 250, 220, 0.35)";
      ctx.beginPath();
      ctx.ellipse(ix, gy - 8 + bob, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(def.emoji, ix, gy - 12 + bob);
    }

    // 玩家（小清新小人）
    const px = world.playerX - cam;
    const py = gy - 4;
    const face = world.playerFacing;
    const walkPhase = (keys.left || keys.right) ? Math.sin(world.time * 0.25) * 4 : 0;

    // 影子
    ctx.fillStyle = "rgba(60, 50, 40, 0.15)";
    ctx.beginPath();
    ctx.ellipse(px, gy + 4, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 腿
    ctx.strokeStyle = "#5a6a7a";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(px - 4, py - 22);
    ctx.lineTo(px - 6 + walkPhase, py);
    ctx.moveTo(px + 4, py - 22);
    ctx.lineTo(px + 6 - walkPhase, py);
    ctx.stroke();

    // 身体
    ctx.fillStyle = "#7eb8c8";
    ctx.beginPath();
    ctx.roundRect(px - 12, py - 48, 24, 28, 8);
    ctx.fill();

    // 头
    ctx.fillStyle = "#f5d8c0";
    ctx.beginPath();
    ctx.arc(px, py - 58, 12, 0, Math.PI * 2);
    ctx.fill();

    // 头发
    ctx.fillStyle = "#5a4a42";
    ctx.beginPath();
    ctx.ellipse(px, py - 66, 13, 8, 0, Math.PI, 0);
    ctx.fill();

    // 脸朝向
    ctx.fillStyle = "#3a3028";
    ctx.beginPath();
    ctx.arc(px + face * 4, py - 58, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 篮子
    ctx.font = "16px serif";
    ctx.fillText("🧺", px - face * 18, py - 30);

    // 前景草
    ctx.fillStyle = "#7a9e58";
    for (let i = 0; i < 30; i++) {
      const gx = ((i * 97 + 20) - (cam * 1.1) % 97);
      const gh = 8 + (i % 5) * 3;
      ctx.fillRect(gx, h - gh - 4, 3, gh);
    }

    // HUD
    ctx.fillStyle = "rgba(255,253,249,0.88)";
    ctx.beginPath();
    ctx.roundRect(12, 12, 150, 36, 18);
    ctx.fill();
    ctx.fillStyle = "#4a463f";
    ctx.font = "13px 'Noto Sans SC', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`本路拾取 ${world.collected} 件`, 28, 35);
  }

  // 输入
  document.getElementById("btn-left").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    keys.left = true;
  });
  document.getElementById("btn-right").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    keys.right = true;
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => {
    document.getElementById("btn-left").addEventListener(ev, () => (keys.left = false));
    document.getElementById("btn-right").addEventListener(ev, () => (keys.right = false));
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
  });

  document.getElementById("btn-new-path").addEventListener("click", () => {
    state.pathsWalked++;
    state.coins += 2;
    Core.appendJournal(state, "又走完一段小路，口袋轻响。");
    checkAchievements();
    save();
    refreshResources();
    world = makeWorld(2000 + state.pathsWalked * 131 + Date.now() % 1000);
    toast("✨ 晚风换了一条小路，送你 2 枚金币");
    if (walkRunning) resizeWalk();
  });

  const btnSeason = document.getElementById("btn-next-season");
  if (btnSeason) {
    btnSeason.addEventListener("click", () => {
      const s = Core.advanceSeason(state);
      checkAchievements();
      save();
      refreshResources();
      toast("🍃 季节轻轻换成了 " + (Core.SEASON_LABELS[s] || s));
    });
  }

  // ---------- 盆栽 ----------
  function growthStage(pot) {
    if (!pot.plantId) return 0;
    const def = PLANTS[pot.plantId];
    const g = pot.growth;
    if (g >= def.days) return 2;
    if (g >= def.days * 0.45) return 1;
    return 0;
  }

  function isReady(pot) {
    if (!pot.plantId) return false;
    return pot.growth >= PLANTS[pot.plantId].days;
  }

  function renderGarden() {
    const sill = document.getElementById("windowsill");
    sill.innerHTML = "";
    state.pots.forEach((pot, i) => {
      const slot = document.createElement("div");
      slot.className = "pot-slot" + (pot.plantId ? "" : " pot-empty") + (state.selectedPot === i ? " selected" : "");
      if (pot.plantId && pot.mood > 50) slot.classList.add("happy");

      let visual = "＋";
      let label = "空花盆";
      if (pot.plantId) {
        const def = PLANTS[pot.plantId];
        visual = def.emoji[growthStage(pot)];
        label = def.name + (isReady(pot) ? " · 可收获" : "");
      }
      slot.innerHTML = `
        <div class="plant-visual">${visual}</div>
        <div class="pot-body"></div>
        <div class="pot-label">${label}</div>
      `;
      slot.addEventListener("click", () => {
        state.selectedPot = i;
        save();
        renderGarden();
      });
      sill.appendChild(slot);
    });

    // seeds
    const seedList = document.getElementById("seed-list");
    seedList.innerHTML = "";
    const plantable = Object.values(ITEMS).filter((it) => it.seed && hasItem(it.id));
    if (!plantable.length) {
      seedList.innerHTML = `<p class="muted">去小路捡些果子和草药吧，它们可以种下。</p>`;
    } else {
      plantable.forEach((it) => {
        const btn = document.createElement("button");
        btn.className = "seed-chip";
        btn.innerHTML = `${it.emoji} ${it.name} <small>×${state.bag[it.id]}</small>`;
        btn.addEventListener("click", () => plantSeed(it.id));
        seedList.appendChild(btn);
      });
    }

    renderPlantDetail();
  }

  function renderPlantDetail() {
    const pot = state.pots[state.selectedPot];
    const detail = document.getElementById("plant-detail");
    const actions = document.getElementById("plant-actions");
    const harvestBtn = document.getElementById("btn-harvest");

    if (!pot.plantId) {
      detail.innerHTML = `
        <h3>空花盆 #${state.selectedPot + 1}</h3>
        <p class="muted">从下方种子里选一样种下。散步捡到的野果、薄荷、茉莉都可以种。</p>
      `;
      actions.hidden = true;
      return;
    }

    const def = PLANTS[pot.plantId];
    const stage = growthStage(pot);
    const stageName = ["幼芽", "抽枝", "成熟"][stage];
    detail.innerHTML = `
      <h3>${def.emoji[stage]} ${def.name}</h3>
      <p class="muted">阶段：${stageName} · 生长 ${Math.min(pot.growth, def.days).toFixed(1)} / ${def.days}</p>
      <div class="stat-bars">
        <div class="stat"><span>水分</span><div class="bar"><i style="width:${pot.water}%"></i></div><span>${Math.round(pot.water)}</span></div>
        <div class="stat"><span>日照</span><div class="bar sun"><i style="width:${pot.sun}%"></i></div><span>${Math.round(pot.sun)}</span></div>
        <div class="stat"><span>心情</span><div class="bar mood"><i style="width:${pot.mood}%"></i></div><span>${Math.round(pot.mood)}</span></div>
      </div>
      <p class="muted" style="margin-top:10px">浇水、日照、说说话，都会让它慢慢长大。没有枯死，只有慢慢等。</p>
    `;
    actions.hidden = false;
    harvestBtn.hidden = !isReady(pot);
  }

  function plantSeed(itemId) {
    const pot = state.pots[state.selectedPot];
    if (pot.plantId) {
      toast("这盆已经有植物啦，换个空花盆吧");
      return;
    }
    const it = ITEMS[itemId];
    if (!it.seed || !takeItem(itemId, 1)) return;
    pot.plantId = it.seed;
    pot.water = 40;
    pot.sun = 40;
    pot.mood = 50;
    pot.growth = 0;
    pot.tendedAt = Date.now();
    save();
    toast(`${it.emoji} 种下了 ${PLANTS[it.seed].name}`);
    renderGarden();
  }

  function tend(act) {
    const pot = state.pots[state.selectedPot];
    if (!pot.plantId) return;

    if (act === "water") {
      pot.water = Math.min(100, pot.water + 28);
      toast("💧 浇了一小壶水");
    } else if (act === "sun") {
      pot.sun = Math.min(100, pot.sun + 28);
      toast("☀️ 把花盆挪到了阳光里");
    } else if (act === "talk") {
      pot.mood = Math.min(100, pot.mood + 22);
      toast("💬 「今天也慢慢长大吧」");
    } else if (act === "harvest") {
      if (!isReady(pot)) return;
      const def = PLANTS[pot.plantId];
      const n = 1 + (pot.mood > 70 ? 1 : 0);
      addItem(def.harvest, n);
      state.hearts += 1;
      state.coins += 3;
      if (!state.stats) state.stats = {};
      state.stats.plantsHarvested = (state.stats.plantsHarvested || 0) + 1;
      Core.appendJournal(state, "收获了 " + (ITEMS[def.harvest].name || def.name) + "。");
      toast(`🌼 收获 ${ITEMS[def.harvest].emoji} ${ITEMS[def.harvest].name} ×${n}`);
      // 植物回到抽枝，可继续养
      pot.growth = PLANTS[pot.plantId].days * 0.4;
      pot.water = 30;
      pot.sun = 30;
      pot.mood = 40;
      checkAchievements();
      save();
      refreshResources();
      renderGarden();
      return;
    }

    // 照料推进生长
    const care = (pot.water + pot.sun + pot.mood) / 300;
    pot.growth += 0.35 + care * 0.55;
    // 自然衰减一点点，鼓励再来
    pot.water = Math.max(0, pot.water - 6);
    pot.sun = Math.max(0, pot.sun - 5);
    pot.mood = Math.max(0, pot.mood - 4);
    pot.tendedAt = Date.now();
    save();
    renderGarden();
  }

  document.getElementById("plant-actions").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    tend(btn.dataset.act);
  });

  // ---------- 汽水铺 ----------
  function randomCustomer() {
    const c = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
    return { ...c, id: Date.now() };
  }

  function renderShop() {
    const c = state.customer;
    document.getElementById("customer-avatar").textContent = c.avatar;
    document.getElementById("customer-name").textContent = c.name;
    document.getElementById("customer-wish").textContent = c.wish;
    const tags = document.getElementById("customer-tags");
    tags.innerHTML = c.tags
      .map((t) => {
        const cls = ["果香", "甜蜜", "花香", "草本"].includes(t)
          ? "tag flavor"
          : ["清爽", "温柔", "田园"].includes(t)
            ? "tag vibe"
            : "tag";
        return `<span class="${cls}">${t}</span>`;
      })
      .join("");

    renderChoices("cups", CUPS, "cup", () => true);
    renderChoices("bases", BASES, "base", (b) => !b.need || hasItem(b.need));
    renderChoices("flavors", FLAVORS, "flavor", (f) => !f.need || hasItem(f.need));
    renderChoices("toppings", TOPPINGS, "topping", (t) => !t.need || hasItem(t.need));
    updateDrinkPreview();
  }

  function renderChoices(elId, list, key, canUse) {
    const box = document.getElementById(elId);
    box.innerHTML = "";
    list.forEach((opt) => {
      const ok = canUse(opt);
      const btn = document.createElement("button");
      btn.className = "choice" + (state.craft[key] === opt.id ? " selected" : "");
      btn.disabled = !ok;
      const needHtml = opt.need
        ? `<span class="need">${ok ? "×" + (state.bag[opt.need] || 0) : "缺少"}</span>`
        : "";
      btn.innerHTML = `<span>${opt.emoji}</span><span>${opt.name}</span>${needHtml}`;
      btn.addEventListener("click", () => {
        state.craft[key] = opt.id;
        save();
        renderShop();
      });
      box.appendChild(btn);
    });
  }

  function updateDrinkPreview() {
    const { cup, base, flavor, topping } = state.craft;
    const liquid = document.getElementById("drink-liquid");
    const bubbles = document.getElementById("drink-bubbles");
    const topEl = document.getElementById("drink-topping");
    const nameEl = document.getElementById("drink-name");
    const serveBtn = document.getElementById("btn-serve");

    const baseDef = BASES.find((b) => b.id === base);
    const flavorDef = FLAVORS.find((f) => f.id === flavor);
    const topDef = TOPPINGS.find((t) => t.id === topping);
    const cupDef = CUPS.find((c) => c.id === cup);

    if (baseDef) {
      liquid.style.height = "72%";
      let colors = baseDef.color;
      if (flavorDef && flavorDef.id === "berry") colors = ["#e8c0d8", "#c878a8"];
      if (flavorDef && flavorDef.id === "peach") colors = ["#f8d0b8", "#f0a888"];
      if (flavorDef && flavorDef.id === "mint") colors = ["#c8f0d8", "#78c8a0"];
      if (flavorDef && flavorDef.id === "honey") colors = ["#f8e8b0", "#e0c868"];
      if (flavorDef && flavorDef.id === "jasmine") colors = ["#f0f0d8", "#d8d8a8"];
      liquid.style.background = `linear-gradient(180deg, ${colors[0]}, ${colors[1]})`;
    } else {
      liquid.style.height = "0%";
    }

    bubbles.className = "bubbles" + (base === "soda" || base === "lemon" ? " on" : "");
    if (bubbles.classList.contains("on") && !bubbles.childElementCount) {
      bubbles.innerHTML = "";
      for (let i = 0; i < 8; i++) {
        const s = document.createElement("span");
        s.style.left = 12 + Math.random() * 70 + "%";
        s.style.animationDelay = Math.random() * 2 + "s";
        s.style.width = s.style.height = 4 + Math.random() * 5 + "px";
        bubbles.appendChild(s);
      }
    }

    topEl.textContent = topDef && topDef.id !== "none" ? topDef.emoji : "";

    if (cupDef && baseDef && flavorDef) {
      const parts = [flavorDef.name, baseDef.name.replace(/底|水/, "")];
      if (topDef && topDef.id !== "none") parts.push(topDef.name);
      nameEl.textContent = parts.join("·") + "汽水";
      serveBtn.disabled = false;
    } else {
      nameEl.textContent = "选齐杯型、基底和风味吧";
      serveBtn.disabled = true;
    }
  }

  function scoreDrink() {
    const c = state.customer;
    const cupDef = CUPS.find((x) => x.id === state.craft.cup);
    const baseDef = BASES.find((x) => x.id === state.craft.base);
    const flavorDef = FLAVORS.find((x) => x.id === state.craft.flavor);
    const topDef = TOPPINGS.find((x) => x.id === state.craft.topping);

    let score = 1; // 至少温柔接纳
    const notes = [];

    if (c.flavors.includes(flavorDef.id) || (flavorDef.id === "plain" && c.flavors.includes("plain"))) {
      score += 2;
      notes.push("风味很合心意");
    } else if (flavorDef.tags.some((t) => c.tags.includes(t))) {
      score += 1;
      notes.push("味道方向对了");
    }

    if (baseDef.vibe && c.tags.includes(baseDef.vibe)) {
      score += 1;
      notes.push("基底很搭");
    }
    if (cupDef.vibe && c.tags.includes(cupDef.vibe)) {
      score += 1;
      notes.push("杯子选得好");
    }
    if (c.wantTopping && topDef && topDef.id !== "none") {
      score += 1;
      notes.push("装饰很可爱");
    }
    if (topDef && topDef.id !== "none" && !c.wantTopping) {
      score += 0.5;
    }

    return { score: Math.min(5, score), notes };
  }

  document.getElementById("btn-serve").addEventListener("click", () => {
    const { cup, base, flavor, topping } = state.craft;
    const baseDef = BASES.find((b) => b.id === base);
    const flavorDef = FLAVORS.find((f) => f.id === flavor);
    const topDef = TOPPINGS.find((t) => t.id === topping);

    // 消耗材料
    if (baseDef.need && !takeItem(baseDef.need, 1)) {
      toast("材料不够了");
      renderShop();
      return;
    }
    if (flavorDef.need && !takeItem(flavorDef.need, 1)) {
      if (baseDef.need) addItem(baseDef.need, 1); // 回滚
      toast("风味材料不够");
      renderShop();
      return;
    }
    if (topDef && topDef.need && !takeItem(topDef.need, 1)) {
      if (baseDef.need) addItem(baseDef.need, 1);
      if (flavorDef.need) addItem(flavorDef.need, 1);
      toast("装饰材料不够");
      renderShop();
      return;
    }

    const { score, notes } = scoreDrink();
    const coins = 4 + Math.floor(score * 2);
    const hearts = score >= 3 ? 1 : 0;
    state.coins += coins;
    state.hearts += hearts;
    if (!state.stats) state.stats = {};
    state.stats.drinksServed = (state.stats.drinksServed || 0) + 1;
    Core.appendJournal(state, "为 " + (state.customer && state.customer.name ? state.customer.name : "客人") + " 调制了一杯汽水。");
    checkAchievements();

    const drinkKey = [cup, base, flavor, topping || "none"].join("-");
    state.drinksMade[drinkKey] = (state.drinksMade[drinkKey] || 0) + 1;

    const msgEl = document.getElementById("serve-msg");
    const reactions = [
      "轻轻笑了笑，接过杯子。",
      "「谢谢，正好想喝这个。」",
      "眼睛亮了一下。",
      "「好舒服的味道……」",
      "「像晚风一样。」",
    ];
    const reaction = reactions[Math.min(reactions.length - 1, Math.floor(score))];
    msgEl.textContent = `${reaction}  +${coins} 金币${hearts ? " · +1 好心情" : ""}${notes.length ? "（" + notes.join("，") + "）" : ""}`;
    toast(`🥂 客人很满意 · +${coins} 🪙`);

    // 重置部分配方，换客人
    state.craft = { cup: state.craft.cup, base: null, flavor: null, topping: null };
    state.customer = randomCustomer();
    save();
    refreshResources();
    setTimeout(() => {
      msgEl.textContent = "";
      renderShop();
    }, 1600);
  });

  document.getElementById("btn-skip-customer").addEventListener("click", () => {
    state.customer = randomCustomer();
    save();
    document.getElementById("serve-msg").textContent = "";
    renderShop();
    toast("下一位客人走来了");
  });

  // ---------- 图鉴 ----------
  let currentAlbumTab = "items";

  document.querySelectorAll(".album-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".album-tabs .tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentAlbumTab = tab.dataset.tab;
      renderAlbum(currentAlbumTab);
    });
  });

  function renderAlbum(tab) {
    const grid = document.getElementById("album-grid");
    grid.innerHTML = "";

    if (tab === "items") {
      Object.values(ITEMS).forEach((it) => {
        const known = state.discovered[it.id];
        const count = state.bag[it.id] || 0;
        const card = document.createElement("div");
        card.className = "album-card" + (known ? "" : " locked");
        card.innerHTML = known
          ? `<div class="emoji">${it.emoji}</div><div class="name">${it.name}</div><div class="meta">${it.kind} · 持有 ${count}${it.seed ? " · 可种植" : ""}</div>`
          : `<div class="emoji">❔</div><div class="name">？？？</div><div class="meta">还没遇见</div>`;
        grid.appendChild(card);
      });
    } else if (tab === "plants") {
      Object.values(PLANTS).forEach((p) => {
        const growing = state.pots.some((pot) => pot.plantId === p.id);
        const ever = growing || state.discovered[p.harvest];
        const card = document.createElement("div");
        card.className = "album-card" + (ever ? "" : " locked");
        card.innerHTML = ever
          ? `<div class="emoji">${p.emoji[2]}</div><div class="name">${p.name}</div><div class="meta">收获 ${ITEMS[p.harvest].emoji}${ITEMS[p.harvest].name}${growing ? " · 培育中" : ""}</div>`
          : `<div class="emoji">❔</div><div class="name">？？？</div><div class="meta">种下后解锁</div>`;
        grid.appendChild(card);
      });
    } else {
      // drinks: show made combos + templates
      const made = Object.entries(state.drinksMade);
      if (!made.length) {
        grid.innerHTML = `<div class="album-card"><div class="emoji">🍋</div><div class="name">还没有作品</div><div class="meta">去汽水铺做一杯吧</div></div>`;
        return;
      }
      made.forEach(([key, n]) => {
        const [cup, base, flavor, topping] = key.split("-");
        const cupDef = CUPS.find((c) => c.id === cup);
        const baseDef = BASES.find((b) => b.id === base);
        const flavorDef = FLAVORS.find((f) => f.id === flavor);
        const topDef = TOPPINGS.find((t) => t.id === topping);
        const card = document.createElement("div");
        card.className = "album-card";
        const title = `${flavorDef?.name || ""}${baseDef?.name || ""}`;
        card.innerHTML = `
          <div class="emoji">${flavorDef?.emoji || "🥂"}</div>
          <div class="name">${title}</div>
          <div class="meta">${cupDef?.emoji || ""} ${topDef && topDef.id !== "none" ? topDef.emoji : ""} · 做过 ${n} 次</div>
        `;
        grid.appendChild(card);
      });
    }
  }

  // 离线时盆栽缓慢变化（打开时结算）
  function settleOfflineGrowth() {
    const now = Date.now();
    state.pots.forEach((pot) => {
      if (!pot.plantId || !pot.tendedAt) return;
      const hours = Math.min(12, (now - pot.tendedAt) / 3600000);
      if (hours < 0.15) return;
      const care = (pot.water + pot.sun + pot.mood) / 300;
      pot.growth += hours * (0.15 + care * 0.2);
      pot.water = Math.max(0, pot.water - hours * 4);
      pot.sun = Math.max(0, pot.sun - hours * 3);
      pot.mood = Math.max(10, pot.mood - hours * 2);
      pot.tendedAt = now;
    });
    save();
  }

  // ---------- 启动 ----------
  settleOfflineGrowth();
  refreshResources();

  // soft ambient dialogue on home
  if (DIALOGUES.length) {
    const copy = document.querySelector(".home-copy p");
    if (copy) {
      const line = DIALOGUES[Math.floor(Math.random() * DIALOGUES.length)];
      copy.textContent = line + " 沿着小路散步收集灵感，在窗台照料小植物，再为路过的人调制一杯汽水吧。";
    }
  }

  // decorate garden with plant art if present
  const gardenBanner = document.querySelector('#screen-garden .scene-banner');
  if (gardenBanner) {
    gardenBanner.insertAdjacentHTML(
      "afterend",
      '<div class="art-row"><img src="assets/plants/mint-stages.jpg" alt="盆栽生长" class="art-thumb"/><img src="assets/ui/garden-actions.jpg" alt="照料动作" class="art-thumb"/></div>'
    );
  }
  const shopBanner = document.querySelector('#screen-shop .scene-banner');
  if (shopBanner) {
    shopBanner.insertAdjacentHTML(
      "afterend",
      '<div class="art-row"><img src="assets/shop/berry-soda.jpg" alt="野莓汽水" class="art-thumb"/><img src="assets/shop/customers-sheet.jpg" alt="客人" class="art-thumb"/><img src="assets/shop/cups-set.jpg" alt="杯型" class="art-thumb"/></div>'
    );
  }
})();
