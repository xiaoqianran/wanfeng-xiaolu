/**
 * 晚风小路 · pure game logic (browser + Node)
 * Shipped unit: inventory, plants, craft scoring, discovery, persistence.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.WanfengCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SAVE_KEY = "wanfeng-xiaolu-v1";
  const VERSION = 3;
  var ECONOMY = {
    serveBase: 5,
    serveScoreMul: 2,
    harvestCoins: 4,
    pathBonus: 3,
    dailyRewardCoins: 10,
    dailyRewardHearts: 1,
    potUnlockCost: 25,
    affinityBonusThreshold: 3,
    wateringCanMax: 5,
    wateringCanBonus: 12,
  };

  const DEFAULT_ITEMS = {
    maple: { id: "maple", name: "枫叶", emoji: "🍁", kind: "装饰", seed: null },
    petal: { id: "petal", name: "花瓣", emoji: "🌸", kind: "装饰", seed: null },
    berry: { id: "berry", name: "野莓", emoji: "🫐", kind: "风味", seed: "berryBush" },
    lemon: { id: "lemon", name: "青柠", emoji: "🍋", kind: "基底", seed: "lemonTree" },
    mint: { id: "mint", name: "薄荷", emoji: "🌿", kind: "风味", seed: "mintPlant" },
    honey: { id: "honey", name: "野蜜", emoji: "🍯", kind: "风味", seed: null },
    stone: { id: "stone", name: "鹅卵石", emoji: "🪨", kind: "收藏", seed: null },
    clover: { id: "clover", name: "三叶草", emoji: "🍀", kind: "装饰", seed: "cloverPot" },
    peach: { id: "peach", name: "水蜜桃", emoji: "🍑", kind: "风味", seed: "peachSapling" },
    jasmine: { id: "jasmine", name: "茉莉", emoji: "🌼", kind: "风味", seed: "jasminePot" },
  };

  const DEFAULT_PLANTS = {
    berryBush: { id: "berryBush", name: "野莓丛", emoji: ["🌱", "🌿", "🫐"], harvest: "berry", days: 3 },
    lemonTree: { id: "lemonTree", name: "青柠苗", emoji: ["🌱", "🪴", "🍋"], harvest: "lemon", days: 4 },
    mintPlant: { id: "mintPlant", name: "薄荷苗", emoji: ["🌱", "🌿", "🌿"], harvest: "mint", days: 2 },
    cloverPot: { id: "cloverPot", name: "三叶草", emoji: ["🌱", "🍀", "🍀"], harvest: "clover", days: 2 },
    peachSapling: { id: "peachSapling", name: "桃树苗", emoji: ["🌱", "🌳", "🍑"], harvest: "peach", days: 5 },
    jasminePot: { id: "jasminePot", name: "茉莉", emoji: ["🌱", "🌿", "🌼"], harvest: "jasmine", days: 3 },
  };

  const DEFAULT_CUPS = [
    { id: "tall", name: "高脚杯", emoji: "🥂", vibe: "清爽" },
    { id: "mug", name: "暖暖杯", emoji: "🍵", vibe: "温柔" },
    { id: "jar", name: "玻璃罐", emoji: "🫙", vibe: "田园" },
  ];

  const DEFAULT_BASES = [
    { id: "soda", name: "气泡水", emoji: "🫧", need: null, color: ["#d8f0e8", "#9ed4c0"], vibe: "清爽" },
    { id: "tea", name: "凉茶底", emoji: "🍵", need: null, color: ["#e8dcc0", "#c8b888"], vibe: "温柔" },
    { id: "lemon", name: "青柠水", emoji: "🍋", need: "lemon", color: ["#f0f8c8", "#d0e060"], vibe: "清爽" },
  ];

  const DEFAULT_FLAVORS = [
    { id: "plain", name: "原味", emoji: "✨", need: null, tags: ["清爽"] },
    { id: "berry", name: "野莓", emoji: "🫐", need: "berry", tags: ["果香", "甜蜜"] },
    { id: "mint", name: "薄荷", emoji: "🌿", need: "mint", tags: ["清爽", "草本"] },
    { id: "honey", name: "野蜜", emoji: "🍯", need: "honey", tags: ["甜蜜", "温柔"] },
    { id: "peach", name: "水蜜桃", emoji: "🍑", need: "peach", tags: ["果香", "甜蜜"] },
    { id: "jasmine", name: "茉莉", emoji: "🌼", need: "jasmine", tags: ["花香", "温柔"] },
  ];

  const DEFAULT_TOPPINGS = [
    { id: "none", name: "不加", emoji: "—", need: null },
    { id: "petal", name: "花瓣", emoji: "🌸", need: "petal" },
    { id: "maple", name: "枫叶", emoji: "🍁", need: "maple" },
    { id: "clover", name: "三叶草", emoji: "🍀", need: "clover" },
  ];

  const DEFAULT_CUSTOMERS = [
    { name: "晚归的邮差", avatar: "📮", wish: "骑了一天车，想喝点提神又清爽的。", tags: ["清爽"], flavors: ["mint", "lemon", "plain"] },
    { name: "看书的女孩", avatar: "📖", wish: "来点温柔花香，最好不那么甜。", tags: ["温柔", "花香"], flavors: ["jasmine", "plain", "mint"] },
    { name: "散步的老爷爷", avatar: "🎩", wish: "田园一点的就好，甜的也行。", tags: ["田园", "甜蜜"], flavors: ["honey", "peach", "berry"] },
    { name: "画画的少年", avatar: "🎨", wish: "要果香满满，像夏天的颜色。", tags: ["果香", "清爽"], flavors: ["berry", "peach", "lemon"] },
    { name: "抱猫的邻居", avatar: "🐱", wish: "随便啦，甜蜜或草本我都喜欢。", tags: ["甜蜜", "草本"], flavors: ["honey", "mint", "berry"] },
    { name: "放风筝的孩子", avatar: "🪁", wish: "要气泡！要好看的装饰！", tags: ["清爽"], flavors: ["plain", "berry", "mint"], wantTopping: true },
    { name: "写生的旅人", avatar: "🎒", wish: "来杯有茉莉或青柠味道的，慢慢喝。", tags: ["花香", "清爽"], flavors: ["jasmine", "lemon", "mint"] },
    { name: "打伞的小姐", avatar: "☂️", wish: "温柔一点的茶底，加一点蜜就完美。", tags: ["温柔", "甜蜜"], flavors: ["honey", "jasmine", "plain"] },
  ];

  function emptyPot() {
    return { plantId: null, water: 0, sun: 0, mood: 0, growth: 0, tendedAt: 0 };
  }

  function defaultState(potCount) {
    const n = potCount || 4;
    const pots = [];
    for (let i = 0; i < n; i++) pots.push(emptyPot());
    return {
      version: VERSION,
      coins: 20,
      hearts: 0,
      bag: { lemon: 2, mint: 1, berry: 1 },
      discovered: { lemon: true, mint: true, berry: true },
      potSlots: n,
      pots: pots,
      drinksMade: {},
      pathsWalked: 0,
      selectedPot: 0,
      craft: { cup: null, base: null, flavor: null, topping: null },
      customer: null,
      season: "dusk",
      day: 1,
      journal: [],
      unlocked: { walk: true, garden: true, shop: true, album: true, seasons: true },
      stats: { itemsPicked: 0, drinksServed: 0, plantsHarvested: 0, seasonsSeen: 1 },
      achievements: {},
      seasonIndex: 0,
      settings: {
        sound: true,
        reduceMotion: false,
        showTips: true,
        tutorialDone: false,
        weatherFx: true,
        ambience: false,
        quietShop: false,
      },
      pathThemeId: "maple_lane",
      serveStreak: 0,
      _seasonsTouched: { dusk: true },
    };
  }

  var DEFAULT_PATH_THEMES = [
    {
      id: "maple_lane",
      name: "枫叶小径",
      emoji: "🍁",
      desc: "落叶柔软，晚霞偏暖。",
      sky: ["#3d4a6b", "#8b6a8a", "#e8a878", "#f0c898", "#c8b888"],
      ground: "#8faf6a",
      path: "#c4ae88",
      bias: { maple: 3.5, petal: 1.5, stone: 1.2 },
      ambient: ["枫叶打着旋落在鞋边。", "风里有干燥木头的味道。"],
    },
  ];

  function getPathTheme(state, themes) {
    themes = themes && themes.length ? themes : DEFAULT_PATH_THEMES;
    var id = (state && state.pathThemeId) || "maple_lane";
    for (var i = 0; i < themes.length; i++) {
      if (themes[i].id === id) return themes[i];
    }
    return themes[0];
  }

  function setPathTheme(state, themeId, themes) {
    themes = themes && themes.length ? themes : DEFAULT_PATH_THEMES;
    var ok = false;
    for (var i = 0; i < themes.length; i++) {
      if (themes[i].id === themeId) {
        ok = true;
        break;
      }
    }
    if (!ok) return { ok: false, reason: "unknown_theme" };
    var firstVisit = !(state._themesTouched && state._themesTouched[themeId]);
    state.pathThemeId = themeId;
    if (!state._themesTouched) state._themesTouched = {};
    state._themesTouched[themeId] = true;
    state.lastPathThemeId = themeId;
    if (firstVisit) {
      var name = themeId;
      for (var j = 0; j < themes.length; j++) {
        if (themes[j].id === themeId) {
          name = themes[j].name || themeId;
          break;
        }
      }
      appendJournal(state, "第一次走上「" + name + "」，风的味道不太一样。");
      if (!state.stats) state.stats = {};
      state.stats.firstThemeVisits = (state.stats.firstThemeVisits || 0) + 1;
    }
    return { ok: true, themeId: themeId, firstVisit: firstVisit };
  }

  /** Soft favorite path theme — one-tap return, no combat */
  function favoritePathTheme(state, themeId) {
    themeId = String(themeId || state.pathThemeId || "");
    if (!themeId) return { ok: false, reason: "empty" };
    state.favoritePathThemeId = themeId;
    appendJournal(state, "把小路「" + themeId + "」标成了常走的那条。");
    return { ok: true, themeId: themeId };
  }

  /** Build weighted spawn list from theme bias + base keys */
  function buildSpawnList(itemIds, bias, maxLen) {
    itemIds = itemIds || [];
    bias = bias || {};
    maxLen = maxLen || 80;
    var weighted = [];
    for (var i = 0; i < itemIds.length; i++) {
      var id = itemIds[i];
      var w = Math.max(1, Math.round((bias[id] != null ? bias[id] : 1) * 10));
      w = Math.min(w, 40);
      for (var j = 0; j < w; j++) weighted.push(id);
    }
    if (!weighted.length) return itemIds.slice(0, maxLen);
    return weighted.slice(0, maxLen);
  }

  function getSettings(state) {
    state.settings = state.settings || {
      sound: true,
      reduceMotion: false,
      showTips: true,
      tutorialDone: false,
      weatherFx: true,
      ambience: false,
      quietShop: false,
    };
    if (state.settings.ambience === undefined) state.settings.ambience = false;
    if (state.settings.weatherFx === undefined) state.settings.weatherFx = true;
    if (state.settings.quietShop === undefined) state.settings.quietShop = false;
    return state.settings;
  }

  function updateSettings(state, patch) {
    var s = getSettings(state);
    Object.keys(patch || {}).forEach(function (k) {
      s[k] = patch[k];
    });
    return s;
  }

  function exportSave(state) {
    return serialize(state);
  }

  function importSave(raw) {
    var data = deserialize(raw);
    if (!data) return { ok: false, reason: "invalid" };
    return { ok: true, state: data };
  }

  /** Soft daily goals — no punishment if incomplete */
  var DAILY_GOAL_DEFS = [
    { id: "walk_once", name: "沿小路走一段", desc: "完成一次「再走一段新路」", check: function (s, p) { return (s.pathsWalked || 0) > (p.pathsWalked || 0); } },
    { id: "pick_three", name: "拾取三件小物", desc: "今日累计拾取 3 件", check: function (s, p) { return ((s.stats && s.stats.itemsPicked) || 0) >= ((p.itemsPicked || 0) + 3); } },
    { id: "tend_plant", name: "照料一株植物", desc: "浇水、日照或说说话一次", check: function (s, p) { return (s._tendsToday || 0) >= 1; } },
    { id: "serve_one", name: "招待一位客人", desc: "成功端出一杯汽水", check: function (s, p) { return ((s.stats && s.stats.drinksServed) || 0) > (p.drinksServed || 0); } },
    { id: "journal_day", name: "留下一行手帐", desc: "任意行为写入手帐", check: function (s, p) { return (s.journal || []).length > (p.journalLen || 0); } },
    { id: "pot_note_day", name: "写一句花盆便签", desc: "给植物贴一张便签", check: function (s, p) { return ((s.stats && s.stats.potNotes) || 0) > (p.potNotes || 0); } },
    { id: "bench_once", name: "长椅歇脚一次", desc: "在小路长椅坐下歇歇", check: function (s, p) { return ((s.stats && s.stats.benchSits) || 0) > (p.benchSits || 0); } },
  ];

  function dayKey(ts) {
    var d = new Date(ts || Date.now());
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /**
   * Soft daily special — season + day-key pick one flavor suggestion.
   * Matching it on serve is a gentle tip, not a hard quest.
   */
  var DAILY_SPECIAL_BY_SEASON = {
    spring: [
      { flavor: "jasmine", label: "茉莉" },
      { flavor: "honeysuckle", label: "金银花" },
      { flavor: "chamomile", label: "洋甘菊" },
      { flavor: "lilac", label: "丁香" },
      { flavor: "cherry", label: "樱桃" },
      { flavor: "apricot", label: "杏" },
      { flavor: "vanilla", label: "香草" },
    ],
    summer: [
      { flavor: "mint", label: "薄荷" },
      { flavor: "perilla", label: "紫苏" },
      { flavor: "dill", label: "莳萝" },
      { flavor: "matcha", label: "抹茶" },
      { flavor: "lemongrass", label: "香茅" },
      { flavor: "passion_fruit", label: "百香果" },
      { flavor: "kiwi", label: "猕猴桃" },
      { flavor: "grapefruit", label: "西柚" },
      { flavor: "wax_apple", label: "莲雾" },
      { flavor: "sugarcane", label: "甘蔗" },
      { flavor: "lemon", label: "柠檬" },
      { flavor: "lime", label: "青柠" },
      { flavor: "cranberry", label: "蔓越莓" },
      { flavor: "elderberry", label: "接骨木果" },
      { flavor: "honeydew", label: "哈密瓜" },
      { flavor: "watermelon", label: "西瓜" },
      { flavor: "cantaloupe", label: "甜瓜" },
      { flavor: "papaya", label: "木瓜" },
      { flavor: "rambutan", label: "红毛丹" },
      { flavor: "jackfruit", label: "菠萝蜜" },
      { flavor: "oregano", label: "牛至" },
      { flavor: "chive", label: "细香葱" },
      { flavor: "parsley", label: "欧芹" },
      { flavor: "avocado", label: "牛油果" },
      { flavor: "chervil", label: "香芹" },
      { flavor: "sorrel", label: "酸模" },
      { flavor: "verbena", label: "马鞭草" },
      { flavor: "savory", label: "香薄荷" },
      { flavor: "celery_seed", label: "芹菜籽" },
      { flavor: "galangal", label: "高良姜" },
      { flavor: "pandan", label: "班兰" },
      { flavor: "kaffir_lime", label: "卡菲尔青柠" },
      { flavor: "juniper", label: "杜松子" },
      { flavor: "sumac", label: "盐肤木" },
      { flavor: "nigella", label: "黑种草" },
      { flavor: "mustard_seed", label: "芥末籽" },
      { flavor: "wasabi", label: "山葵" },
      { flavor: "dandelion", label: "蒲公英" },
      { flavor: "nettle", label: "荨麻" },
      { flavor: "borage", label: "琉璃苣" },
      { flavor: "hops", label: "啤酒花" },
      { flavor: "heather", label: "石楠" },
      { flavor: "arnica", label: "山金车" },
      { flavor: "echinacea", label: "紫锥菊" },
      { flavor: "feverfew", label: "小白菊" },
      { flavor: "lemon_verbena", label: "柠檬马鞭草" },
      { flavor: "mullein", label: "毛蕊花" },
      { flavor: "plantain_leaf", label: "车前草" },
      { flavor: "bee_balm", label: "美国薄荷" },
      { flavor: "marshmallow", label: "药蜀葵" },
      { flavor: "goldenrod", label: "一枝黄花" },
      { flavor: "red_clover", label: "红车轴草" },
      { flavor: "white_clover", label: "白车轴草" },
      { flavor: "catnip", label: "猫薄荷" },
      { flavor: "tansy", label: "艾菊" },
      { flavor: "agrimony", label: "龙芽草" },
      { flavor: "rue", label: "芸香" },
      { flavor: "costmary", label: "艾菊薄荷" },
      { flavor: "elecampane", label: "土木香" },
      { flavor: "meadow_clary", label: "草地鼠尾草" },
      { flavor: "soapwort", label: "皂草" },
      { flavor: "milfoil", label: "洋蓍草" },
      { flavor: "lady_mantle", label: "羽衣草" },
      { flavor: "speedwell", label: "婆婆纳" },
      { flavor: "stitchwort", label: "繁缕" },
      { flavor: "campion", label: "剪秋罗" },
      { flavor: "silverweed", label: "鹅绒委陵菜" },
      { flavor: "loosestrife", label: "千屈菜" },
      { flavor: "willowherb", label: "柳兰" },
      { flavor: "bedstraw", label: "猪殃殃" },
      { flavor: "cleavers", label: "拉拉藤" },
      { flavor: "bugle", label: "筋骨草" },
      { flavor: "primrose", label: "报春花" },
      { flavor: "cowslip", label: "黄花九轮草" },
      { flavor: "oxeye", label: "滨菊" },
      { flavor: "knapweed", label: "矢车菊" },
      { flavor: "scabious", label: "山萝卜" },
      { flavor: "nettle_seed", label: "荨麻籽" },
      { flavor: "rowan", label: "花楸果" },
      { flavor: "crabapple", label: "海棠果" },
      { flavor: "serviceberry", label: "唐棣" },
      { flavor: "elderflower_fresh", label: "接骨木花鲜" },
      { flavor: "meadowsweet_fresh", label: "绣线菊鲜" },
      { flavor: "wood_sorrel", label: "酢浆草" },
      { flavor: "wild_garlic", label: "熊葱" },
      { flavor: "ramsons", label: "熊蒜" },
      { flavor: "jack_by_hedge", label: "蒜芥" },
      { flavor: "hedge_mustard", label: "蒜芥菜" },
      { flavor: "watercress", label: "豆瓣菜" },
      { flavor: "brooklime", label: "有柄水苦荬" },
      { flavor: "cloudberry", label: "云莓" },
      { flavor: "lingonberry", label: "越橘" },
      { flavor: "bilberry", label: "欧洲越橘" },
      { flavor: "gooseberry", label: "醋栗" },
      { flavor: "currant_red", label: "红醋栗" },
      { flavor: "currant_black", label: "黑醋栗" },
      { flavor: "whitecurrant", label: "白醋栗" },
      { flavor: "sea_buckthorn", label: "沙棘" },
      { flavor: "damson", label: "西洋李" },
      { flavor: "greengage", label: "青李" },
      { flavor: "mirabelle", label: "黄香李" },
      { flavor: "saskatoon", label: "萨斯卡通莓" },
      { flavor: "chokeberry", label: "野樱莓" },
      { flavor: "yarrow_white", label: "白蓍" },
      { flavor: "achillea_pink", label: "粉蓍" },
      { flavor: "cornflower", label: "矢车菊蓝" },
      { flavor: "poppy_seed", label: "罂粟籽" },
      { flavor: "flax_flower", label: "亚麻花" },
      { flavor: "chia_seed", label: "奇亚籽" },
      { flavor: "sunflower_seed", label: "葵花籽" },
      { flavor: "fennel_pollen", label: "茴香花粉" },
      { flavor: "fennel_frond", label: "茴香叶" },
      { flavor: "dill_pollen", label: "莳萝花粉" },
      { flavor: "celery_leaf", label: "芹菜叶" },
      { flavor: "rooibos", label: "路易波士" },
      { flavor: "honeybush", label: "蜜树茶" },
      { flavor: "yerba_mate", label: "马黛茶" },
      { flavor: "guayusa", label: "瓜尤萨" },
      { flavor: "gardenia", label: "栀子花" },
      { flavor: "magnolia", label: "玉兰花" },
      { flavor: "frangipani", label: "鸡蛋花" },
      { flavor: "plumeria", label: "缅栀" },
      { flavor: "stephanotis", label: "马达加斯加茉莉" },
      { flavor: "garden_phlox", label: "福禄考" },
      { flavor: "osmanthus_fresh", label: "桂花鲜瓣" },
      { flavor: "galangal_fresh", label: "鲜高良姜" },
      { flavor: "ginger_flower", label: "姜花" },
      { flavor: "turmeric_fresh", label: "鲜姜黄" },
      { flavor: "cubeb", label: "毕澄茄" },
      { flavor: "makrut_leaf", label: "青柠叶" },
      { flavor: "curry_leaf", label: "咖喱叶" },
      { flavor: "holy_basil", label: "圣罗勒" },
      { flavor: "thai_basil", label: "泰罗勒" },
      { flavor: "lemon_basil", label: "柠檬罗勒" },

      { flavor: "rambutan_fresh", label: "鲜红毛丹" },
      { flavor: "lychee_fresh", label: "鲜荔枝" },
      { flavor: "mangosteen", label: "山竹" },
      { flavor: "durian_flower", label: "榴莲花" },
      { flavor: "tamarind", label: "罗望子" },
      { flavor: "calamansi", label: "四季桔" },
      { flavor: "fig_fresh", label: "无花果鲜" },
      { flavor: "pomegranate_seed", label: "石榴籽" },
      { flavor: "cactus_pear", label: "仙人掌果" },
      { flavor: "prickly_pear", label: "霸王树果" },
      { flavor: "sapodilla", label: "人心果" },
      { flavor: "soursop", label: "刺果番荔枝" },
      { flavor: "cherimoya", label: "毛叶番荔枝" },
      { flavor: "feijoa", label: "费约果" },
      { flavor: "loquat_fresh", label: "鲜枇杷" },
      { flavor: "jujube_fresh", label: "鲜枣" },
      { flavor: "mulberry_white", label: "白桑" },
      { flavor: "mulberry_black", label: "黑桑" },
      { flavor: "elderberry_fresh", label: "鲜接骨木果" },
      { flavor: "bergamot_fresh", label: "鲜佛手柑" },
      { flavor: "sudachi", label: "酢橘" },
      { flavor: "kabosu", label: "香酸柑" },
      { flavor: "amanatsu", label: "甘夏" },
      { flavor: "shiso_green", label: "青紫苏" },
      { flavor: "shiso_red", label: "赤紫苏" },
      { flavor: "mitsuba", label: "三叶" },
      { flavor: "myoga", label: "茗荷" },
      { flavor: "wasabi_leaf", label: "山葵叶" },
      { flavor: "sansho", label: "山椒" },
      { flavor: "kinome", label: "木芽" },
      { flavor: "gentian", label: "龙胆" },
      { flavor: "arnica_montana", label: "山地金车" },
      { flavor: "alpine_strawberry", label: "野草莓" },
      { flavor: "bilberry_leaf", label: "越橘叶" },
      { flavor: "spruce_tip", label: "云杉芽" },
      { flavor: "olive_leaf", label: "橄榄叶" },
      { flavor: "caper", label: "续随子花蕾" },
      { flavor: "zaatar", label: "扎塔香草" },
      { flavor: "sumac_berry", label: "盐肤木果" },
      { flavor: "orange_blossom", label: "橙花" },
      { flavor: "lavender_honey", label: "薰衣草蜜" },
      { flavor: "thyme_honey", label: "百里香蜜" },
      { flavor: "acacia_honey", label: "洋槐蜜" },
      { flavor: "manuka", label: "麦卢卡" },
      { flavor: "bee_pollen", label: "蜂花粉" },
      { flavor: "comb_honey", label: "巢蜜" },
      { flavor: "linden_honey", label: "椴树蜜" },
      { flavor: "heather_honey_wild", label: "石楠野蜜" },
      { flavor: "wildflower_honey", label: "野花蜜" },
      { flavor: "clover_honey", label: "车轴草蜜" },
      { flavor: "eucalyptus_honey", label: "桉树蜜" },
    ],
    autumn: [
      { flavor: "honey", label: "野蜜" },
      { flavor: "peach", label: "水蜜桃" },
      { flavor: "tea_leaf", label: "野茶" },
      { flavor: "thyme", label: "百里香" },
      { flavor: "pear", label: "梨" },
      { flavor: "guava", label: "番石榴" },
    ],
    winter: [
      { flavor: "tea_leaf", label: "野茶" },
      { flavor: "yuzu", label: "柚子" },
      { flavor: "honey", label: "野蜜" },
      { flavor: "rosemary", label: "迷迭香" },
      { flavor: "jujube", label: "红枣" },
      { flavor: "tangerine", label: "蜜橘" },
      { flavor: "kumquat", label: "金桔" },
      { flavor: "cocoa", label: "可可" },
      { flavor: "vanilla", label: "香草" },
      { flavor: "almond", label: "杏仁" },
      { flavor: "hazelnut", label: "榛子" },
      { flavor: "maple_syrup", label: "枫糖" },
      { flavor: "sesame", label: "芝麻" },
      { flavor: "saffron", label: "藏红花" },
      { flavor: "walnut", label: "核桃" },
      { flavor: "pistachio", label: "开心果" },
      { flavor: "chestnut", label: "板栗" },
      { flavor: "cinnamon", label: "肉桂" },
      { flavor: "clove", label: "丁香" },
      { flavor: "star_anise", label: "八角" },
      { flavor: "nutmeg", label: "肉豆蔻" },
      { flavor: "goji", label: "枸杞" },
      { flavor: "bay_leaf", label: "月桂" },
      { flavor: "tarragon", label: "龙蒿" },
      { flavor: "date_fruit", label: "椰枣" },
      { flavor: "hyssop", label: "神香草" },
      { flavor: "lovage", label: "独活" },
      { flavor: "anise_seed", label: "茴香籽" },
      { flavor: "turmeric", label: "姜黄" },
      { flavor: "allspice", label: "多香果" },
      { flavor: "mace", label: "肉豆蔻衣" },
      { flavor: "caraway", label: "葛缕子" },
      { flavor: "cumin", label: "孜然" },
      { flavor: "fenugreek", label: "胡芦巴" },
      { flavor: "ajwain", label: "香旱芹" },
      { flavor: "myrtle", label: "香桃木" },
      { flavor: "chicory", label: "菊苣" },
      { flavor: "yarrow", label: "蓍草" },
      { flavor: "nettle", label: "荨麻" },
      { flavor: "meadowsweet", label: "绣线菊" },
      { flavor: "woodruff", label: "车叶草" },
      { flavor: "valerian", label: "缬草" },
      { flavor: "angelica", label: "当归" },
      { flavor: "comfrey", label: "聚合草" },
      { flavor: "selfheal", label: "夏枯草" },
      { flavor: "skullcap", label: "黄芩" },
      { flavor: "linden", label: "椴树花" },
      { flavor: "horehound", label: "夏至草" },
      { flavor: "motherwort", label: "益母草" },
      { flavor: "betony", label: "水苏" },
      { flavor: "solomon_seal", label: "黄精" },
      { flavor: "wormwood", label: "苦艾" },
      { flavor: "valerian_root", label: "缬草根" },
      { flavor: "avens", label: "水杨梅" },
      { flavor: "tormentil", label: "直立委陵菜" },
      { flavor: "figwort", label: "玄参" },
      { flavor: "ground_ivy", label: "连钱草" },
      { flavor: "self_heal_spike", label: "夏枯穗" },
      { flavor: "teasel", label: "川续断" },
      { flavor: "burdock", label: "牛蒡" },
      { flavor: "hawthorn_berry", label: "山楂果" },
      { flavor: "rosehip", label: "玫瑰果" },
      { flavor: "sloe", label: "黑刺李" },
      { flavor: "wintercress", label: "山芥" },

      { flavor: "medlar", label: "欧楂" },
      { flavor: "quince", label: "榅桲" },
      { flavor: "aronia", label: "黑果腺肋花楸" },
      { flavor: "flax_seed", label: "亚麻籽" },
      { flavor: "hemp_seed", label: "火麻仁" },
      { flavor: "pumpkin_seed", label: "南瓜籽" },
      { flavor: "sesame_black", label: "黑芝麻" },
      { flavor: "sesame_white", label: "白芝麻" },
      { flavor: "lapacho", label: "拉帕乔" },
      { flavor: "sassafras", label: "檫树" },
      { flavor: "birch_bark", label: "白桦皮" },
      { flavor: "pine_resin", label: "松脂" },
      { flavor: "tuberose", label: "晚香玉" },
      { flavor: "cardamom_green", label: "绿豆蔻" },
      { flavor: "cardamom_black", label: "黑豆蔻" },
      { flavor: "long_pepper", label: "荜拨" },
      { flavor: "grains_of_paradise", label: "天堂椒" },
      { flavor: "cinnamon_leaf", label: "肉桂叶" },
      { flavor: "clove_bud", label: "丁香芽" },
      { flavor: "allspice_leaf", label: "多香果叶" },
      { flavor: "reindeer_moss", label: "驯鹿苔" },
      { flavor: "iceland_moss", label: "冰岛苔" },
      { flavor: "oak_moss", label: "橡苔" },
      { flavor: "usnea", label: "松萝" },
      { flavor: "chaga", label: "白桦茸" },
      { flavor: "reishi", label: "灵芝" },
      { flavor: "lion_mane", label: "猴头菇" },
      { flavor: "maitake", label: "舞茸" },
      { flavor: "jackfruit_seed", label: "波罗蜜籽" },

      { flavor: "rowan_jelly", label: "花楸果冻" },
      { flavor: "quince_paste", label: "榅桲膏" },
      { flavor: "yuzu_fresh", label: "鲜柚子" },
      { flavor: "ponkan", label: "椪柑" },
      { flavor: "dekopon", label: "不知火" },
      { flavor: "hassaku", label: "八朔" },
      { flavor: "yuzu_kosho", label: "柚子胡椒" },
      { flavor: "edelweiss", label: "雪绒花" },
      { flavor: "juniper_berry", label: "杜松果" },
      { flavor: "fir_needle", label: "冷杉针" },
      { flavor: "myrtle_berry", label: "香桃木果" },
      { flavor: "mastic", label: "乳香黄连木" },
      { flavor: "saffron_crocus", label: "番红花" },
      { flavor: "buckwheat_honey", label: "荞麦蜜" },
      { flavor: "chestnut_honey", label: "板栗蜜" },
      { flavor: "propolis", label: "蜂胶" },
      { flavor: "royal_jelly", label: "蜂王浆" },
      { flavor: "mead_herb", label: "蜜酒香草" },
    ],
    dusk: [
      { flavor: "lavender_bud", label: "薰衣草" },
      { flavor: "jasmine", label: "茉莉" },
      { flavor: "peach", label: "水蜜桃" },
      { flavor: "mint", label: "薄荷" },
      { flavor: "bergamot", label: "佛手柑" },
      { flavor: "dragonfruit", label: "火龙果" },
      { flavor: "cherry", label: "樱桃" },
    ],
  };

  function getDailySpecial(state, now) {
    now = now || Date.now();
    var key = dayKey(now);
    var season = (state && state.season) || "dusk";
    var pool = DAILY_SPECIAL_BY_SEASON[season] || DAILY_SPECIAL_BY_SEASON.dusk;
    var sum = 0;
    for (var i = 0; i < key.length; i++) sum = (sum * 33 + key.charCodeAt(i)) >>> 0;
    var pick = pool[sum % pool.length];
    return {
      key: key,
      season: season,
      flavor: pick.flavor,
      label: pick.label,
      hint: "今日小特调方向：" + pick.label,
    };
  }

  function ensureDailyGoals(state, now) {
    now = now || Date.now();
    var key = dayKey(now);
    if (!state.daily || state.daily.key !== key) {
      // pick 3 stable goals from defs using date hash
      var seed = 0;
      for (var i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
      var picks = [];
      var used = {};
      var n = 0;
      while (picks.length < 3 && n < 20) {
        var idx = (seed + n * 17) % DAILY_GOAL_DEFS.length;
        n++;
        if (used[idx]) continue;
        used[idx] = true;
        picks.push(DAILY_GOAL_DEFS[idx].id);
      }
      state.daily = {
        key: key,
        goalIds: picks,
        baseline: {
          pathsWalked: state.pathsWalked || 0,
          itemsPicked: (state.stats && state.stats.itemsPicked) || 0,
          drinksServed: (state.stats && state.stats.drinksServed) || 0,
          journalLen: (state.journal || []).length,
          potNotes: (state.stats && state.stats.potNotes) || 0,
          benchSits: (state.stats && state.stats.benchSits) || 0,
        },
        completed: {},
        claimed: false,
      };
      state._tendsToday = 0;
    }
    return state.daily;
  }

  function evaluateDailyGoals(state) {
    var daily = ensureDailyGoals(state);
    var newly = [];
    daily.goalIds.forEach(function (id) {
      if (daily.completed[id]) return;
      var def = DAILY_GOAL_DEFS.filter(function (d) { return d.id === id; })[0];
      if (!def) return;
      if (def.check(state, daily.baseline || {})) {
        daily.completed[id] = true;
        newly.push(def);
      }
    });
    return { daily: daily, newly: newly, allDone: daily.goalIds.every(function (id) { return daily.completed[id]; }) };
  }


  function softNewDay(state, now) {
    now = now || Date.now();
    state.day = (state.day || 1) + 1;
    // force daily refresh
    if (state.daily) state.daily.key = "";
    ensureDailyGoals(state, now);
    state._tendsToday = 0;
    appendJournal(state, "新的一天开始了。背包还在，风也还在。");
    return { ok: true, day: state.day, daily: state.daily };
  }

  var DAILY_GIFT_POOL = ["petal", "maple", "clover", "mint", "berry", "stone", "seashell", "pinecone", "rosemary", "lavender_bud", "honeysuckle", "sage", "yuzu", "matcha", "moss"];

  function claimDailyReward(state) {
    var ev = evaluateDailyGoals(state);
    if (!ev.allDone) return { ok: false, reason: "incomplete" };
    if (ev.daily.claimed) return { ok: false, reason: "claimed" };
    ev.daily.claimed = true;
    state.coins = (state.coins || 0) + ECONOMY.dailyRewardCoins;
    state.hearts = (state.hearts || 0) + ECONOMY.dailyRewardHearts;
    // soft day-end gift: deterministic from day key so not pure RNG spam
    var key = (ev.daily && ev.daily.key) || dayKey();
    var sum = 0;
    for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    var giftId = DAILY_GIFT_POOL[sum % DAILY_GIFT_POOL.length];
    addItem(state, giftId, 1);
    appendJournal(state, "完成了今日的温柔小目标，还收到一份小礼：" + giftId + "。");
    return {
      ok: true,
      coins: ECONOMY.dailyRewardCoins,
      hearts: ECONOMY.dailyRewardHearts,
      gift: giftId,
    };
  }

  /** Demo mode: seed a showcase state without combat */
  function unlockPotSlot(state, cost) {
    cost = cost == null ? (ECONOMY.potUnlockCost || 25) : cost;
    var slots = state.potSlots || (state.pots && state.pots.length) || 4;
    if (slots >= 6) return { ok: false, reason: "max" };
    if ((state.coins || 0) < cost) return { ok: false, reason: "coins" };
    state.coins -= cost;
    state.potSlots = slots + 1;
    if (!state.pots) state.pots = [];
    while (state.pots.length < state.potSlots) state.pots.push(emptyPot());
    appendJournal(state, "窗台多了一只空花盆。");
    return { ok: true, potSlots: state.potSlots, cost: cost };
  }

  function createDemoState() {
    var s = defaultState(5);
    s.potSlots = 5;
    s.coins = 48;
    s.hearts = 6;
    s.pathsWalked = 3;
    s.bag = { lemon: 4, mint: 3, berry: 3, petal: 2, maple: 2, honey: 2, peach: 1, jasmine: 1, clover: 1 };
    s.discovered = {};
    Object.keys(s.bag).forEach(function (k) { s.discovered[k] = true; });
    s.pots[0] = { plantId: "mintPlant", water: 70, sun: 65, mood: 80, growth: 2.2, tendedAt: Date.now() };
    s.pots[1] = { plantId: "lemonTree", water: 50, sun: 55, mood: 60, growth: 3.5, tendedAt: Date.now() };
    s.stats = { itemsPicked: 20, drinksServed: 5, plantsHarvested: 2, seasonsSeen: 3 };
    s.settings = { sound: true, reduceMotion: false, showTips: true, tutorialDone: true, weatherFx: true, ambience: false };
    s.demo = true;
    appendJournal(s, "演示存档：展示散步、盆栽与汽水的温柔日常。");
    ensureDailyGoals(s);
    return s;
  }

  var SEASON_ORDER = ["dusk", "spring", "summer", "autumn", "winter"];
  var SEASON_LABELS = {
    dusk: "黄昏",
    spring: "春日",
    summer: "盛夏",
    autumn: "秋晚",
    winter: "冬夜",
  };
  var SEASON_ART = {
    dusk: "assets/seasons/dusk.jpg",
    spring: "assets/seasons/spring.jpg",
    summer: "assets/seasons/summer.jpg",
    autumn: "assets/seasons/autumn.jpg",
    winter: "assets/seasons/winter.jpg",
  };

  var DEFAULT_ACHIEVEMENTS = [
    { id: "first_walk", name: "第一次散步", desc: "走完一段小路", check: function (s) { return (s.pathsWalked || 0) >= 1; } },
    { id: "picker_10", name: "拾荒小能手", desc: "累计拾取 10 件", check: function (s) { return (s.stats && s.stats.itemsPicked || 0) >= 10; } },
    { id: "green_thumb", name: "绿拇指", desc: "收获一次盆栽", check: function (s) { return (s.stats && s.stats.plantsHarvested || 0) >= 1; } },
    { id: "barista", name: "温柔店员", desc: "服务 3 位客人", check: function (s) { return (s.stats && s.stats.drinksServed || 0) >= 3; } },
    { id: "hearts_5", name: "好心情满满", desc: "好心情达到 5", check: function (s) { return (s.hearts || 0) >= 5; } },
    { id: "season_tour", name: "四季旅人", desc: "经历全部季节", check: function (s) { return (s.stats && s.stats.seasonsSeen || 0) >= 5; } },
    { id: "coins_50", name: "小金库", desc: "持有 50 金币", check: function (s) { return (s.coins || 0) >= 50; } },
    { id: "discover_8", name: "图鉴起步", desc: "发现 8 种收集物", check: function (s) { return Object.keys(s.discovered || {}).length >= 8; } },
    { id: "gentle_rest", name: "陪它歇歇", desc: "让植物休息 3 次", check: function (s) { return (s.stats && s.stats.rests || 0) >= 3; } },
    { id: "theme_walker", name: "多路旅人", desc: "切换过 3 种小路主题", check: function (s) { return Object.keys(s._themesTouched || {}).length >= 3; } },
    { id: "mail_reader", name: "拆信人", desc: "读过 3 封来信", check: function (s) { return Object.keys(s._readMail || {}).length >= 3; } },
    { id: "pot_scribe", name: "花盆便签", desc: "给植物写下 2 句便签", check: function (s) { return (s.stats && s.stats.potNotes || 0) >= 2; } },
    { id: "bench_sitter", name: "长椅旅人", desc: "在小路长椅歇脚 3 次", check: function (s) { return (s.stats && s.stats.benchSits || 0) >= 3; } },
    { id: "theme_collector", name: "十路旅人", desc: "切换过 5 种小路主题", check: function (s) { return Object.keys(s._themesTouched || {}).length >= 5; } },
    { id: "can_gardener", name: "小水壶园丁", desc: "用水壶浇灌 5 次", check: function (s) { return (s.stats && s.stats.canWaters || 0) >= 5; } },
    { id: "sill_photographer", name: "窗台速写", desc: "拍下 3 张盆栽速写", check: function (s) { return (s.stats && s.stats.potSnaps || 0) >= 3; } },
    { id: "discover_15", name: "图鉴半开", desc: "发现 15 种收集物", check: function (s) { return Object.keys(s.discovered || {}).length >= 15; } },
    { id: "pin_host", name: "记得你", desc: "标记过一位常客", check: function (s) { return !!(s.pinnedCustomer); } },
    { id: "snow_walker", name: "雪灯旅人", desc: "走过雪灯小径", check: function (s) { return !!(s._themesTouched && s._themesTouched.snow_lantern); } },
    { id: "fav_path", name: "有常走的路", desc: "标记一条常走小路", check: function (s) { return !!(s.favoritePathThemeId); } },
    { id: "root_memory", name: "熟土记忆", desc: "在同一花盆收获满 3 次（记忆加成）", check: function (s) { return (s.stats && s.stats.memoryHarvests || 0) >= 1; } },
    { id: "order_keeper", name: "记得口味", desc: "为常客复刻上次配方 1 次", check: function (s) { return (s.stats && s.stats.repeatOrders || 0) >= 1; } },
    { id: "early_walker", name: "今日第一脚", desc: "领取 3 次今日首次出门奖励", check: function (s) { return (s.stats && s.stats.firstWalks || 0) >= 3; } },
    { id: "sticker_collector", name: "贴纸收藏", desc: "获得 2 枚小路里程贴纸", check: function (s) { return Object.keys(s.pathStickers || {}).length >= 2; } },
    { id: "daily_specialist", name: "今日特调手", desc: "按今日小特调出杯 3 次", check: function (s) { return (s.stats && s.stats.dailySpecialHits || 0) >= 3; } },
    { id: "coastal_set", name: "潮湾三件套", desc: "发现贝壳、河光石与海盐晶", check: function (s) {
      var d = s.discovered || {};
      return !!(d.seashell && d.river_pebble && d.salt_crystal);
    } },
    { id: "herb_garden", name: "草本窗台", desc: "发现罗勒、香茅、莳萝与百里香", check: function (s) {
      var d = s.discovered || {};
      return !!(d.basil && d.lemongrass && d.dill && d.thyme);
    } },
    { id: "fennel_sill", name: "茴香窗台", desc: "发现茴香并可种植", check: function (s) {
      return !!(s.discovered && s.discovered.fennel);
    } },
    { id: "bergamot_sill", name: "佛手柑窗台", desc: "发现佛手柑并可种植", check: function (s) {
      return !!(s.discovered && s.discovered.bergamot);
    } },
    { id: "moss_walker", name: "青苔旅人", desc: "走过青苔石阶", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.moss_steps);
    } },
    { id: "memory_keeper", name: "回忆保管员", desc: "图鉴回忆页攒下 2 张速写", check: function (s) {
      return (s.stats && s.stats.potSnaps || 0) >= 2;
    } },
    { id: "coriander_sill", name: "香菜窗台", desc: "发现香菜", check: function (s) {
      return !!(s.discovered && s.discovered.coriander);
    } },
    { id: "ink_walker", name: "墨香旅人", desc: "走过墨香小院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ink_courtyard);
    } },
    { id: "regular_host", name: "常客东道", desc: "与同一位客人熟悉度达到 3", check: function (s) {
      var aff = s.customerAffinity || {};
      return Object.keys(aff).some(function (k) { return (aff[k] || 0) >= 3; });
    } },
    { id: "violet_sill", name: "紫花窗台", desc: "发现紫罗兰", check: function (s) {
      return !!(s.discovered && s.discovered.violet);
    } },
    { id: "lotus_walker", name: "荷塘旅人", desc: "走过荷塘浅步", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lotus_pond);
    } },
    { id: "sill_arranger", name: "窗台整理", desc: "对调花盆 2 次", check: function (s) {
      return (s.stats && s.stats.potSwaps || 0) >= 2;
    } },
    { id: "calendula_sill", name: "金盏窗台", desc: "发现金盏花", check: function (s) {
      return !!(s.discovered && s.discovered.calendula);
    } },
    { id: "chime_walker", name: "风铃旅人", desc: "走过风铃廊", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wind_chime);
    } },
    { id: "dew_keeper", name: "晨露看顾", desc: "收获 3 次隔夜晨露", check: function (s) {
      return (s.stats && s.stats.morningDews || 0) >= 3;
    } },
    { id: "lemon_balm_sill", name: "香蜂草窗台", desc: "发现香蜂草", check: function (s) {
      return !!(s.discovered && s.discovered.lemon_balm);
    } },
    { id: "tea_walker", name: "茶台旅人", desc: "走过茶台慢坡", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tea_terrace);
    } },
    { id: "ginger_sill", name: "姜香窗台", desc: "发现姜片", check: function (s) {
      return !!(s.discovered && s.discovered.ginger);
    } },
    { id: "rain_walker", name: "雨园旅人", desc: "走过雨园慢径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rain_garden);
    } },
    { id: "cardamom_sill", name: "豆蔻窗台", desc: "发现豆蔻", check: function (s) {
      return !!(s.discovered && s.discovered.cardamom);
    } },
    { id: "orchard_walker", name: "果园旅人", desc: "走过果园暮色", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orchard_dusk);
    } },
    { id: "rose_sill", name: "玫瑰窗台", desc: "发现玫瑰花瓣", check: function (s) {
      return !!(s.discovered && s.discovered.rose_petal);
    } },
    { id: "rose_walker", name: "玫瑰旅人", desc: "走过玫瑰短巷", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rose_lane);
    } },
    { id: "recipe_pinner", name: "配方钉选", desc: "钉住一份秘密配方", check: function (s) {
      return !!(s.pinnedRecipeId);
    } },
    { id: "marjoram_sill", name: "马郁兰窗台", desc: "发现马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.marjoram);
    } },
    { id: "cliff_walker", name: "崖边旅人", desc: "走过崖边慢径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cliff_path);
    } },
    { id: "companion_gardener", name: "邻盆园丁", desc: "在邻盆作伴时照料 5 次", check: function (s) {
      return (s.stats && s.stats.companionTends || 0) >= 5;
    } },
    { id: "elder_sill", name: "接骨木窗台", desc: "发现接骨木花", check: function (s) {
      return !!(s.discovered && s.discovered.elderflower);
    } },
    { id: "willow_walker", name: "柳岸旅人", desc: "走过柳岸轻步", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.willow_bank);
    } },
    { id: "open_calm_host", name: "清静店主", desc: "开店清静加成累计 5 次", check: function (s) {
      return (s.stats && s.stats.openCalmServes || 0) >= 5;
    } },
    { id: "hibiscus_sill", name: "洛神窗台", desc: "发现洛神花", check: function (s) {
      return !!(s.discovered && s.discovered.hibiscus);
    } },
    { id: "night_pond_walker", name: "夜荷旅人", desc: "走过夜荷池", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.night_pond);
    } },
    { id: "chrys_sill", name: "菊香窗台", desc: "发现菊花", check: function (s) {
      return !!(s.discovered && s.discovered.chrysanthemum);
    } },
    { id: "chrys_walker", name: "菊圃旅人", desc: "走过菊圃晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chrys_garden);
    } },
    { id: "jasmine_sill", name: "茉莉窗台", desc: "发现茉莉", check: function (s) {
      return !!(s.discovered && s.discovered.jasmine);
    } },
    { id: "osmanthus_walker", name: "桂院旅人", desc: "走过桂花小院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.osmanthus_court);
    } },
    { id: "shop_closer", name: "温柔收摊", desc: "收摊记录 3 次", check: function (s) {
      return (s.stats && s.stats.shopCloses || 0) >= 3;
    } },
    { id: "sea_lav_sill", name: "补血草窗台", desc: "发现补血草", check: function (s) {
      return !!(s.discovered && s.discovered.sea_lavender);
    } },
    { id: "seaside_walker", name: "海边旅人", desc: "走过海边暮色", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.seaside_dusk);
    } },
    { id: "path_atlas", name: "小路图鉴手", desc: "走过 15 种小路主题", check: function (s) {
      return Object.keys(s._themesTouched || {}).length >= 15;
    } },
    { id: "peach_sill", name: "蜜桃窗台", desc: "发现蜜桃瓣", check: function (s) {
      return !!(s.discovered && s.discovered.peach);
    } },
    { id: "lantern_bridge_walker", name: "灯桥旅人", desc: "走过灯桥夜步", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lantern_bridge);
    } },
    { id: "pine_sill", name: "松针窗台", desc: "发现松针", check: function (s) {
      return !!(s.discovered && s.discovered.pine_needle);
    } },
    { id: "pine_walker", name: "松脊旅人", desc: "走过松脊晚风", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pine_ridge);
    } },
    { id: "plum_sill", name: "李子窗台", desc: "发现李子", check: function (s) {
      return !!(s.discovered && s.discovered.plum);
    } },
    { id: "plum_walker", name: "李花旅人", desc: "走过李花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.plum_path);
    } },
    { id: "path_explorer", name: "四十路旅人", desc: "走过 20 种小路主题", check: function (s) {
      return Object.keys(s._themesTouched || {}).length >= 20;
    } },
    { id: "mulberry_sill", name: "桑葚窗台", desc: "发现桑葚", check: function (s) {
      return !!(s.discovered && s.discovered.mulberry);
    } },
    { id: "mulberry_walker", name: "桑荫旅人", desc: "走过桑荫小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mulberry_lane);
    } },
    { id: "variety_gardener", name: "多样园丁", desc: "多样窗台照料 5 次", check: function (s) {
      return (s.stats && s.stats.varietyTends || 0) >= 5;
    } },
    { id: "strawberry_sill", name: "草莓窗台", desc: "发现草莓", check: function (s) {
      return !!(s.discovered && s.discovered.strawberry);
    } },
    { id: "berry_walker", name: "莓田旅人", desc: "走过莓田慢步", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.berry_patch);
    } },
    { id: "blueberry_sill", name: "蓝莓窗台", desc: "发现蓝莓", check: function (s) {
      return !!(s.discovered && s.discovered.blueberry);
    } },
    { id: "fog_walker", name: "雾甸旅人", desc: "走过雾草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fog_meadow);
    } },
    { id: "grape_sill", name: "葡萄窗台", desc: "发现葡萄", check: function (s) {
      return !!(s.discovered && s.discovered.grape);
    } },
    { id: "vine_walker", name: "梯田旅人", desc: "走过葡萄梯田", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.vine_terrace);
    } },
    { id: "persimmon_sill", name: "柿子窗台", desc: "发现柿子", check: function (s) {
      return !!(s.discovered && s.discovered.persimmon);
    } },
    { id: "autumn_walker", name: "秋坡旅人", desc: "走过秋坡慢步", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.autumn_slope);
    } },
    { id: "fig_sill", name: "无花果窗台", desc: "发现无花果", check: function (s) {
      return !!(s.discovered && s.discovered.fig);
    } },
    { id: "fig_walker", name: "果台旅人", desc: "走过无花果台", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fig_terrace);
    } },
    { id: "pom_sill", name: "石榴窗台", desc: "发现石榴籽", check: function (s) {
      return !!(s.discovered && s.discovered.pomegranate);
    } },
    { id: "pom_walker", name: "石榴院旅人", desc: "走过石榴小院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pomegranate_court);
    } },
    { id: "plant_fav", name: "最想照料", desc: "标记一盆最想照料的植物", check: function (s) {
      return !!(s.favoritePlantId);
    } },
    { id: "yangmei_sill", name: "杨梅窗台", desc: "发现杨梅", check: function (s) {
      return !!(s.discovered && s.discovered.yangmei);
    } },
    { id: "pavilion_walker", name: "雨亭旅人", desc: "走过雨亭慢歇", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rain_pavilion);
    } },
    { id: "morning_gardener", name: "晨间园丁", desc: "完成 5 次晨间首次照料", check: function (s) {
      return (s.stats && s.stats.morningTends || 0) >= 5;
    } },
    { id: "longan_sill", name: "龙眼窗台", desc: "发现龙眼", check: function (s) {
      return !!(s.discovered && s.discovered.longan);
    } },
    { id: "dew_walker", name: "露径旅人", desc: "走过露径慢步", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dew_path);
    } },
    { id: "litchi_sill", name: "荔枝窗台", desc: "发现荔枝", check: function (s) {
      return !!(s.discovered && s.discovered.litchi);
    } },
    { id: "litchi_walker", name: "荔林旅人", desc: "走过荔枝林径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.litchi_grove);
    } },
    { id: "path_fifty", name: "五十路图鉴", desc: "切换过 25 种小路主题", check: function (s) {
      return Object.keys(s._themesTouched || {}).length >= 25;
    } },
    { id: "loquat_sill", name: "枇杷窗台", desc: "发现枇杷", check: function (s) {
      return !!(s.discovered && s.discovered.loquat);
    } },
    { id: "loquat_walker", name: "枇杷巷旅人", desc: "走过枇杷巷", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.loquat_lane);
    } },
    { id: "olive_sill", name: "橄榄窗台", desc: "发现橄榄", check: function (s) {
      return !!(s.discovered && s.discovered.olive);
    } },
    { id: "olive_walker", name: "橄榄坡旅人", desc: "走过橄榄坡", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.olive_grove);
    } },
    { id: "guest_scribe", name: "客人便签", desc: "为客人写下 2 条便签", check: function (s) {
      return (s.stats && s.stats.guestNotes || 0) >= 2;
    } },
    { id: "hawthorn_sill", name: "山楂窗台", desc: "发现山楂", check: function (s) {
      return !!(s.discovered && s.discovered.hawthorn);
    } },
    { id: "hawthorn_walker", name: "山楂径旅人", desc: "走过山楂短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hawthorn_path);
    } },
    { id: "mango_sill", name: "芒果窗台", desc: "发现芒果", check: function (s) {
      return !!(s.discovered && s.discovered.mango);
    } },
    { id: "mango_walker", name: "芒荫旅人", desc: "走过芒果树荫", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mango_shade);
    } },
    { id: "path_scribe", name: "换路手帐", desc: "首次踏上 5 条新小路并记入手帐", check: function (s) {
      return (s.stats && s.stats.firstThemeVisits || 0) >= 5;
    } },
    { id: "pineapple_sill", name: "菠萝窗台", desc: "发现菠萝", check: function (s) {
      return !!(s.discovered && s.discovered.pineapple);
    } },
    { id: "dune_walker", name: "沙丘旅人", desc: "走过沙丘晚风", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sand_dune);
    } },
    { id: "coconut_sill", name: "椰子窗台", desc: "发现椰子", check: function (s) {
      return !!(s.discovered && s.discovered.coconut);
    } },
    { id: "lagoon_walker", name: "潟湖旅人", desc: "走过潟湖浅径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lagoon_path);
    } },
    { id: "starfruit_sill", name: "杨桃窗台", desc: "发现杨桃", check: function (s) {
      return !!(s.discovered && s.discovered.starfruit);
    } },
    { id: "starfruit_walker", name: "杨桃径旅人", desc: "走过杨桃小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.starfruit_lane);
    } },
    { id: "kumquat_sill", name: "金桔窗台", desc: "发现金桔", check: function (s) {
      return !!(s.discovered && s.discovered.kumquat);
    } },
    { id: "kumquat_walker", name: "金桔篱旅人", desc: "走过金桔篱径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kumquat_hedge);
    } },
    { id: "passion_sill", name: "百香果窗台", desc: "发现百香果", check: function (s) {
      return !!(s.discovered && s.discovered.passion_fruit);
    } },
    { id: "passion_walker", name: "百香藤廊旅人", desc: "走过百香藤廊", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.passion_arch);
    } },
    { id: "kiwi_sill", name: "猕猴桃窗台", desc: "发现猕猴桃", check: function (s) {
      return !!(s.discovered && s.discovered.kiwi);
    } },
    { id: "kiwi_walker", name: "猕猴桃架径旅人", desc: "走过猕猴桃架径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kiwi_trellis);
    } },
    { id: "dragonfruit_sill", name: "火龙果窗台", desc: "发现火龙果", check: function (s) {
      return !!(s.discovered && s.discovered.dragonfruit);
    } },
    { id: "dragon_walker", name: "火龙仙人掌径旅人", desc: "走过火龙仙人掌径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dragon_cactus);
    } },
    { id: "guava_sill", name: "番石榴窗台", desc: "发现番石榴", check: function (s) {
      return !!(s.discovered && s.discovered.guava);
    } },
    { id: "guava_walker", name: "番石榴径旅人", desc: "走过番石榴小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.guava_grove);
    } },
    { id: "cherry_sill", name: "樱桃窗台", desc: "发现樱桃", check: function (s) {
      return !!(s.discovered && s.discovered.cherry);
    } },
    { id: "cherry_walker", name: "樱桃巷旅人", desc: "走过樱桃短巷", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cherry_lane);
    } },
    { id: "apricot_sill", name: "杏子窗台", desc: "发现杏", check: function (s) {
      return !!(s.discovered && s.discovered.apricot);
    } },
    { id: "apricot_walker", name: "杏径旅人", desc: "走过杏花小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.apricot_grove);
    } },
    { id: "pear_sill", name: "梨子窗台", desc: "发现梨", check: function (s) {
      return !!(s.discovered && s.discovered.pear);
    } },
    { id: "pear_walker", name: "梨园旅人", desc: "走过梨园慢径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pear_orchard);
    } },
    { id: "jujube_sill", name: "红枣窗台", desc: "发现红枣", check: function (s) {
      return !!(s.discovered && s.discovered.jujube);
    } },
    { id: "jujube_walker", name: "红枣径旅人", desc: "走过红枣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jujube_path);
    } },
    { id: "grapefruit_sill", name: "西柚窗台", desc: "发现西柚", check: function (s) {
      return !!(s.discovered && s.discovered.grapefruit);
    } },
    { id: "grapefruit_walker", name: "西柚露台旅人", desc: "走过西柚露台", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.grapefruit_terrace);
    } },
    { id: "tangerine_sill", name: "蜜橘窗台", desc: "发现蜜橘", check: function (s) {
      return !!(s.discovered && s.discovered.tangerine);
    } },
    { id: "tangerine_walker", name: "蜜橘石阶旅人", desc: "走过蜜橘石阶", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tangerine_steps);
    } },
    { id: "wax_apple_sill", name: "莲雾窗台", desc: "发现莲雾", check: function (s) {
      return !!(s.discovered && s.discovered.wax_apple);
    } },
    { id: "wax_apple_walker", name: "莲雾径旅人", desc: "走过莲雾短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wax_apple_lane);
    } },
    { id: "sugarcane_sill", name: "甘蔗窗台", desc: "发现甘蔗", check: function (s) {
      return !!(s.discovered && s.discovered.sugarcane);
    } },
    { id: "sugarcane_walker", name: "甘蔗田旅人", desc: "走过甘蔗田径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cane_field);
    } },
    { id: "lemon_sill", name: "柠檬窗台", desc: "发现柠檬", check: function (s) {
      return !!(s.discovered && s.discovered.lemon);
    } },
    { id: "lemon_walker", name: "柠檬树径旅人", desc: "走过柠檬树径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lemon_grove);
    } },
    { id: "lime_sill", name: "青柠窗台", desc: "发现青柠", check: function (s) {
      return !!(s.discovered && s.discovered.lime);
    } },
    { id: "lime_walker", name: "青柠径旅人", desc: "走过青柠小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lime_path);
    } },
    { id: "vanilla_sill", name: "香草窗台", desc: "发现香草", check: function (s) {
      return !!(s.discovered && s.discovered.vanilla);
    } },
    { id: "vanilla_walker", name: "香草径旅人", desc: "走过香草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.vanilla_lane);
    } },
    { id: "cocoa_sill", name: "可可窗台", desc: "发现可可", check: function (s) {
      return !!(s.discovered && s.discovered.cocoa);
    } },
    { id: "cocoa_walker", name: "可可院旅人", desc: "走过可可小院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cocoa_courtyard);
    } },
    { id: "almond_sill", name: "杏仁窗台", desc: "发现杏仁", check: function (s) {
      return !!(s.discovered && s.discovered.almond);
    } },
    { id: "almond_walker", name: "杏仁树径旅人", desc: "走过杏仁树径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.almond_grove);
    } },
    { id: "hazelnut_sill", name: "榛子窗台", desc: "发现榛子", check: function (s) {
      return !!(s.discovered && s.discovered.hazelnut);
    } },
    { id: "hazelnut_walker", name: "榛子径旅人", desc: "走过榛子短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hazel_path);
    } },
    { id: "maple_sill", name: "枫糖窗台", desc: "发现枫糖", check: function (s) {
      return !!(s.discovered && s.discovered.maple_syrup);
    } },
    { id: "maple_walker", name: "枫糖径旅人", desc: "走过枫糖慢径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.maple_sugar_path);
    } },
    { id: "sesame_sill", name: "芝麻窗台", desc: "发现芝麻", check: function (s) {
      return !!(s.discovered && s.discovered.sesame);
    } },
    { id: "sesame_walker", name: "芝麻田旅人", desc: "走过芝麻田径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sesame_field);
    } },
    { id: "saffron_sill", name: "藏红花窗台", desc: "发现藏红花", check: function (s) {
      return !!(s.discovered && s.discovered.saffron);
    } },
    { id: "saffron_walker", name: "藏红花露台旅人", desc: "走过藏红花露台", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.saffron_terrace);
    } },
    { id: "walnut_sill", name: "核桃窗台", desc: "发现核桃", check: function (s) {
      return !!(s.discovered && s.discovered.walnut);
    } },
    { id: "walnut_walker", name: "核桃树径旅人", desc: "走过核桃树径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.walnut_path);
    } },
    { id: "pistachio_sill", name: "开心果窗台", desc: "发现开心果", check: function (s) {
      return !!(s.discovered && s.discovered.pistachio);
    } },
    { id: "pistachio_walker", name: "开心果径旅人", desc: "走过开心果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pistachio_lane);
    } },
    { id: "chestnut_sill", name: "板栗窗台", desc: "发现板栗", check: function (s) {
      return !!(s.discovered && s.discovered.chestnut);
    } },
    { id: "chestnut_walker", name: "板栗林旅人", desc: "走过板栗林径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chestnut_grove);
    } },
    { id: "cinnamon_sill", name: "肉桂窗台", desc: "发现肉桂", check: function (s) {
      return !!(s.discovered && s.discovered.cinnamon);
    } },
    { id: "cinnamon_walker", name: "肉桂径旅人", desc: "走过肉桂短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cinnamon_path);
    } },
    { id: "clove_sill", name: "丁香窗台", desc: "发现丁香香料", check: function (s) {
      return !!(s.discovered && s.discovered.clove);
    } },
    { id: "clove_walker", name: "丁香院旅人", desc: "走过丁香香院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.clove_courtyard);
    } },
    { id: "cranberry_sill", name: "蔓越莓窗台", desc: "发现蔓越莓", check: function (s) {
      return !!(s.discovered && s.discovered.cranberry);
    } },
    { id: "cranberry_walker", name: "蔓越莓浅滩旅人", desc: "走过蔓越莓浅滩", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cranberry_bog);
    } },
    { id: "elderberry_sill", name: "接骨木果窗台", desc: "发现接骨木果", check: function (s) {
      return !!(s.discovered && s.discovered.elderberry);
    } },
    { id: "elderberry_walker", name: "接骨木果径旅人", desc: "走过接骨木果径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.elder_lane);
    } },
    { id: "anise_sill", name: "八角窗台", desc: "发现八角", check: function (s) {
      return !!(s.discovered && s.discovered.star_anise);
    } },
    { id: "anise_walker", name: "八角径旅人", desc: "走过八角短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.anise_path);
    } },
    { id: "nutmeg_sill", name: "肉豆蔻窗台", desc: "发现肉豆蔻", check: function (s) {
      return !!(s.discovered && s.discovered.nutmeg);
    } },
    { id: "nutmeg_walker", name: "肉豆蔻径旅人", desc: "走过肉豆蔻小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.nutmeg_lane);
    } },
    { id: "honeydew_sill", name: "哈密瓜窗台", desc: "发现哈密瓜", check: function (s) {
      return !!(s.discovered && s.discovered.honeydew);
    } },
    { id: "honeydew_walker", name: "哈密瓜田旅人", desc: "走过哈密瓜田径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.honeydew_field);
    } },
    { id: "watermelon_sill", name: "西瓜窗台", desc: "发现西瓜", check: function (s) {
      return !!(s.discovered && s.discovered.watermelon);
    } },
    { id: "watermelon_walker", name: "西瓜畦旅人", desc: "走过西瓜畦径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.watermelon_patch);
    } },
    { id: "cantaloupe_sill", name: "甜瓜窗台", desc: "发现甜瓜", check: function (s) {
      return !!(s.discovered && s.discovered.cantaloupe);
    } },
    { id: "cantaloupe_walker", name: "甜瓜径旅人", desc: "走过甜瓜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cantaloupe_lane);
    } },
    { id: "papaya_sill", name: "木瓜窗台", desc: "发现木瓜", check: function (s) {
      return !!(s.discovered && s.discovered.papaya);
    } },
    { id: "papaya_walker", name: "木瓜树径旅人", desc: "走过木瓜树径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.papaya_grove);
    } },
    { id: "rambutan_sill", name: "红毛丹窗台", desc: "发现红毛丹", check: function (s) {
      return !!(s.discovered && s.discovered.rambutan);
    } },
    { id: "rambutan_walker", name: "红毛丹径旅人", desc: "走过红毛丹小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rambutan_lane);
    } },
    { id: "jackfruit_sill", name: "菠萝蜜窗台", desc: "发现菠萝蜜", check: function (s) {
      return !!(s.discovered && s.discovered.jackfruit);
    } },
    { id: "jackfruit_walker", name: "菠萝蜜树径旅人", desc: "走过菠萝蜜树径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jackfruit_grove);
    } },
    { id: "goji_sill", name: "枸杞窗台", desc: "发现枸杞", check: function (s) {
      return !!(s.discovered && s.discovered.goji);
    } },
    { id: "goji_walker", name: "枸杞径旅人", desc: "走过枸杞短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.goji_path);
    } },
    { id: "bay_sill", name: "月桂窗台", desc: "发现月桂", check: function (s) {
      return !!(s.discovered && s.discovered.bay_leaf);
    } },
    { id: "bay_walker", name: "月桂院旅人", desc: "走过月桂小院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bay_courtyard);
    } },
    { id: "oregano_sill", name: "牛至窗台", desc: "发现牛至", check: function (s) {
      return !!(s.discovered && s.discovered.oregano);
    } },
    { id: "oregano_walker", name: "牛至径旅人", desc: "走过牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.oregano_path);
    } },
    { id: "chive_sill", name: "细香葱窗台", desc: "发现细香葱", check: function (s) {
      return !!(s.discovered && s.discovered.chive);
    } },
    { id: "chive_walker", name: "香葱畦旅人", desc: "走过香葱畦径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chive_patch);
    } },
    { id: "parsley_sill", name: "欧芹窗台", desc: "发现欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.parsley);
    } },
    { id: "parsley_walker", name: "欧芹径旅人", desc: "走过欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.parsley_path);
    } },
    { id: "tarragon_sill", name: "龙蒿窗台", desc: "发现龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.tarragon);
    } },
    { id: "tarragon_walker", name: "龙蒿径旅人", desc: "走过龙蒿小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tarragon_lane);
    } },
    { id: "avocado_sill", name: "牛油果窗台", desc: "发现牛油果", check: function (s) {
      return !!(s.discovered && s.discovered.avocado);
    } },
    { id: "avocado_walker", name: "牛油果树径旅人", desc: "走过牛油果树径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.avocado_grove);
    } },
    { id: "date_sill", name: "椰枣窗台", desc: "发现椰枣", check: function (s) {
      return !!(s.discovered && s.discovered.date_fruit);
    } },
    { id: "date_walker", name: "椰枣径旅人", desc: "走过椰枣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.date_path);
    } },
    { id: "hyssop_sill", name: "神香草窗台", desc: "发现神香草", check: function (s) {
      return !!(s.discovered && s.discovered.hyssop);
    } },
    { id: "hyssop_walker", name: "神香草径旅人", desc: "走过神香草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hyssop_path);
    } },
    { id: "chervil_sill", name: "香芹窗台", desc: "发现香芹", check: function (s) {
      return !!(s.discovered && s.discovered.chervil);
    } },
    { id: "chervil_walker", name: "香芹径旅人", desc: "走过香芹小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chervil_lane);
    } },
    { id: "sorrel_sill", name: "酸模窗台", desc: "发现酸模", check: function (s) {
      return !!(s.discovered && s.discovered.sorrel);
    } },
    { id: "sorrel_walker", name: "酸模径旅人", desc: "走过酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sorrel_path);
    } },
    { id: "lovage_sill", name: "独活窗台", desc: "发现独活", check: function (s) {
      return !!(s.discovered && s.discovered.lovage);
    } },
    { id: "lovage_walker", name: "独活院旅人", desc: "走过独活小院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lovage_courtyard);
    } },
    
    { id: "verbena_sill", name: "马鞭草窗台", desc: "发现马鞭草", check: function (s) {
      return !!(s.discovered && s.discovered.verbena);
    } },
    { id: "verbena_walker", name: "马鞭草径旅人", desc: "走过马鞭草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.verbena_path);
    } },
    { id: "savory_sill", name: "香薄荷窗台", desc: "发现香薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.savory);
    } },
    { id: "savory_walker", name: "香薄荷径旅人", desc: "走过香薄荷小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.savory_lane);
    } },
    { id: "celery_seed_sill", name: "芹菜籽窗台", desc: "发现芹菜籽", check: function (s) {
      return !!(s.discovered && s.discovered.celery_seed);
    } },
    { id: "celery_seed_walker", name: "芹菜籽径旅人", desc: "走过芹菜籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.celery_path);
    } },
    { id: "anise_seed_sill", name: "茴香籽窗台", desc: "发现茴香籽", check: function (s) {
      return !!(s.discovered && s.discovered.anise_seed);
    } },
    { id: "anise_seed_walker", name: "茴香籽径旅人", desc: "走过茴香籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.anise_seed_path);
    } },
    
    { id: "turmeric_sill", name: "姜黄窗台", desc: "发现姜黄", check: function (s) {
      return !!(s.discovered && s.discovered.turmeric);
    } },
    { id: "turmeric_walker", name: "姜黄径旅人", desc: "走过姜黄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.turmeric_path);
    } },
    { id: "galangal_sill", name: "高良姜窗台", desc: "发现高良姜", check: function (s) {
      return !!(s.discovered && s.discovered.galangal);
    } },
    { id: "galangal_walker", name: "高良姜径旅人", desc: "走过高良姜小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.galangal_lane);
    } },
    { id: "pandan_sill", name: "班兰窗台", desc: "发现班兰", check: function (s) {
      return !!(s.discovered && s.discovered.pandan);
    } },
    { id: "pandan_walker", name: "班兰叶径旅人", desc: "走过班兰叶径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pandan_grove);
    } },
    { id: "kaffir_sill", name: "卡菲尔窗台", desc: "发现卡菲尔青柠", check: function (s) {
      return !!(s.discovered && s.discovered.kaffir_lime);
    } },
    { id: "kaffir_walker", name: "卡菲尔叶径旅人", desc: "走过卡菲尔叶径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kaffir_path);
    } },
    
    { id: "juniper_sill", name: "杜松窗台", desc: "发现杜松子", check: function (s) {
      return !!(s.discovered && s.discovered.juniper);
    } },
    { id: "juniper_walker", name: "杜松脊旅人", desc: "走过杜松脊径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.juniper_ridge);
    } },
    { id: "allspice_sill", name: "多香果窗台", desc: "发现多香果", check: function (s) {
      return !!(s.discovered && s.discovered.allspice);
    } },
    { id: "allspice_walker", name: "多香果径旅人", desc: "走过多香果小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.allspice_lane);
    } },
    { id: "mace_sill", name: "肉豆蔻衣窗台", desc: "发现肉豆蔻衣", check: function (s) {
      return !!(s.discovered && s.discovered.mace);
    } },
    { id: "mace_walker", name: "肉豆蔻衣径旅人", desc: "走过肉豆蔻衣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mace_path);
    } },
    { id: "sumac_sill", name: "盐肤木窗台", desc: "发现盐肤木", check: function (s) {
      return !!(s.discovered && s.discovered.sumac);
    } },
    { id: "sumac_walker", name: "盐肤木径旅人", desc: "走过盐肤木短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sumac_path);
    } },
    
    { id: "caraway_sill", name: "葛缕子窗台", desc: "发现葛缕子", check: function (s) {
      return !!(s.discovered && s.discovered.caraway);
    } },
    { id: "caraway_walker", name: "葛缕子径旅人", desc: "走过葛缕子短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.caraway_path);
    } },
    { id: "cumin_sill", name: "孜然窗台", desc: "发现孜然", check: function (s) {
      return !!(s.discovered && s.discovered.cumin);
    } },
    { id: "cumin_walker", name: "孜然径旅人", desc: "走过孜然小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cumin_lane);
    } },
    { id: "fenugreek_sill", name: "胡芦巴窗台", desc: "发现胡芦巴", check: function (s) {
      return !!(s.discovered && s.discovered.fenugreek);
    } },
    { id: "fenugreek_walker", name: "胡芦巴径旅人", desc: "走过胡芦巴短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fenugreek_path);
    } },
    { id: "nigella_sill", name: "黑种草窗台", desc: "发现黑种草", check: function (s) {
      return !!(s.discovered && s.discovered.nigella);
    } },
    { id: "nigella_walker", name: "黑种草径旅人", desc: "走过黑种草小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.nigella_lane);
    } },
    
    { id: "mustard_sill", name: "芥末籽窗台", desc: "发现芥末籽", check: function (s) {
      return !!(s.discovered && s.discovered.mustard_seed);
    } },
    { id: "mustard_walker", name: "芥末籽径旅人", desc: "走过芥末籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mustard_path);
    } },
    { id: "ajwain_sill", name: "香旱芹窗台", desc: "发现香旱芹", check: function (s) {
      return !!(s.discovered && s.discovered.ajwain);
    } },
    { id: "ajwain_walker", name: "香旱芹径旅人", desc: "走过香旱芹小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ajwain_lane);
    } },
    { id: "wasabi_sill", name: "山葵窗台", desc: "发现山葵", check: function (s) {
      return !!(s.discovered && s.discovered.wasabi);
    } },
    { id: "wasabi_walker", name: "山葵溪旅人", desc: "走过山葵溪径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wasabi_path);
    } },
    { id: "myrtle_sill", name: "香桃木窗台", desc: "发现香桃木", check: function (s) {
      return !!(s.discovered && s.discovered.myrtle);
    } },
    { id: "myrtle_walker", name: "香桃木院旅人", desc: "走过香桃木小院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.myrtle_courtyard);
    } },
    
    { id: "chicory_sill", name: "菊苣窗台", desc: "发现菊苣", check: function (s) {
      return !!(s.discovered && s.discovered.chicory);
    } },
    { id: "chicory_walker", name: "菊苣径旅人", desc: "走过菊苣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chicory_path);
    } },
    { id: "dandelion_sill", name: "蒲公英窗台", desc: "发现蒲公英", check: function (s) {
      return !!(s.discovered && s.discovered.dandelion);
    } },
    { id: "dandelion_walker", name: "蒲公英田旅人", desc: "走过蒲公英田径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dandelion_field);
    } },
    { id: "nettle_sill", name: "荨麻窗台", desc: "发现荨麻", check: function (s) {
      return !!(s.discovered && s.discovered.nettle);
    } },
    { id: "nettle_walker", name: "荨麻径旅人", desc: "走过荨麻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.nettle_path);
    } },
    { id: "yarrow_sill", name: "蓍草窗台", desc: "发现蓍草", check: function (s) {
      return !!(s.discovered && s.discovered.yarrow);
    } },
    { id: "yarrow_walker", name: "蓍草甸旅人", desc: "走过蓍草草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yarrow_meadow);
    } },
    { id: "forage_brewer", name: "野草特调手", desc: "用野草风味出杯 5 次", check: function (s) {
      return (s.stats && s.stats.forageBrews || 0) >= 5;
    } },
    
    { id: "meadowsweet_sill", name: "绣线菊窗台", desc: "发现绣线菊", check: function (s) {
      return !!(s.discovered && s.discovered.meadowsweet);
    } },
    { id: "meadowsweet_walker", name: "绣线菊径旅人", desc: "走过绣线菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadowsweet_path);
    } },
    { id: "woodruff_sill", name: "车叶草窗台", desc: "发现车叶草", check: function (s) {
      return !!(s.discovered && s.discovered.woodruff);
    } },
    { id: "woodruff_walker", name: "车叶草径旅人", desc: "走过车叶草小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodruff_lane);
    } },
    { id: "borage_sill", name: "琉璃苣窗台", desc: "发现琉璃苣", check: function (s) {
      return !!(s.discovered && s.discovered.borage);
    } },
    { id: "borage_walker", name: "琉璃苣径旅人", desc: "走过琉璃苣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.borage_path);
    } },
    { id: "valerian_sill", name: "缬草窗台", desc: "发现缬草", check: function (s) {
      return !!(s.discovered && s.discovered.valerian);
    } },
    { id: "valerian_walker", name: "缬草晚径旅人", desc: "走过缬草晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.valerian_grove);
    } },
    { id: "hops_sill", name: "啤酒花窗台", desc: "发现啤酒花", check: function (s) {
      return !!(s.discovered && s.discovered.hops);
    } },
    { id: "hops_walker", name: "啤酒花架径旅人", desc: "走过啤酒花架径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hops_trellis);
    } },
    { id: "heather_sill", name: "石楠窗台", desc: "发现石楠", check: function (s) {
      return !!(s.discovered && s.discovered.heather);
    } },
    { id: "heather_walker", name: "石楠坡径旅人", desc: "走过石楠坡径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.heather_hill);
    } },
    { id: "angelica_sill", name: "当归窗台", desc: "发现当归", check: function (s) {
      return !!(s.discovered && s.discovered.angelica);
    } },
    { id: "angelica_walker", name: "当归径旅人", desc: "走过当归短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.angelica_path);
    } },
    { id: "arnica_sill", name: "山金车窗台", desc: "发现山金车", check: function (s) {
      return !!(s.discovered && s.discovered.arnica);
    } },
    { id: "arnica_walker", name: "山金车甸旅人", desc: "走过山金车草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.arnica_meadow);
    } },
    { id: "echinacea_sill", name: "紫锥菊窗台", desc: "发现紫锥菊", check: function (s) {
      return !!(s.discovered && s.discovered.echinacea);
    } },
    { id: "echinacea_walker", name: "紫锥菊甸旅人", desc: "走过紫锥菊草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.echinacea_meadow);
    } },
    { id: "comfrey_sill", name: "聚合草窗台", desc: "发现聚合草", check: function (s) {
      return !!(s.discovered && s.discovered.comfrey);
    } },
    { id: "comfrey_walker", name: "聚合草径旅人", desc: "走过聚合草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.comfrey_path);
    } },
    { id: "feverfew_sill", name: "小白菊窗台", desc: "发现小白菊", check: function (s) {
      return !!(s.discovered && s.discovered.feverfew);
    } },
    { id: "feverfew_walker", name: "小白菊径旅人", desc: "走过小白菊小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.feverfew_lane);
    } },
    { id: "lemon_verbena_sill", name: "柠檬马鞭草窗台", desc: "发现柠檬马鞭草", check: function (s) {
      return !!(s.discovered && s.discovered.lemon_verbena);
    } },
    { id: "lemon_verbena_walker", name: "柠檬马鞭草径旅人", desc: "走过柠檬马鞭草径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lemon_verbena_path);
    } },
    { id: "mullein_sill", name: "毛蕊花窗台", desc: "发现毛蕊花", check: function (s) {
      return !!(s.discovered && s.discovered.mullein);
    } },
    { id: "mullein_walker", name: "毛蕊花径旅人", desc: "走过毛蕊花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mullein_path);
    } },
    { id: "plantain_leaf_sill", name: "车前草窗台", desc: "发现车前草", check: function (s) {
      return !!(s.discovered && s.discovered.plantain_leaf);
    } },
    { id: "plantain_leaf_walker", name: "车前草径旅人", desc: "走过车前草小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.plantain_lane);
    } },
    { id: "selfheal_sill", name: "夏枯草窗台", desc: "发现夏枯草", check: function (s) {
      return !!(s.discovered && s.discovered.selfheal);
    } },
    { id: "selfheal_walker", name: "夏枯草径旅人", desc: "走过夏枯草晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.selfheal_grove);
    } },
    { id: "skullcap_sill", name: "黄芩窗台", desc: "发现黄芩", check: function (s) {
      return !!(s.discovered && s.discovered.skullcap);
    } },
    { id: "skullcap_walker", name: "黄芩径旅人", desc: "走过黄芩短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.skullcap_path);
    } },
    { id: "bee_balm_sill", name: "美国薄荷窗台", desc: "发现美国薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.bee_balm);
    } },
    { id: "bee_balm_walker", name: "美国薄荷径旅人", desc: "走过美国薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bee_balm_path);
    } },
    { id: "marshmallow_sill", name: "药蜀葵窗台", desc: "发现药蜀葵", check: function (s) {
      return !!(s.discovered && s.discovered.marshmallow);
    } },
    { id: "marshmallow_walker", name: "药蜀葵径旅人", desc: "走过药蜀葵小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.marshmallow_lane);
    } },
    { id: "linden_sill", name: "椴树花窗台", desc: "发现椴树花", check: function (s) {
      return !!(s.discovered && s.discovered.linden);
    } },
    { id: "linden_walker", name: "椴树花径旅人", desc: "走过椴树花晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.linden_grove);
    } },
    { id: "goldenrod_sill", name: "一枝黄花窗台", desc: "发现一枝黄花", check: function (s) {
      return !!(s.discovered && s.discovered.goldenrod);
    } },
    { id: "goldenrod_walker", name: "一枝黄花径旅人", desc: "走过一枝黄花草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.goldenrod_meadow);
    } },
        { id: "red_clover_sill", name: "红车轴草窗台", desc: "发现红车轴草", check: function (s) {
      return !!(s.discovered && s.discovered.red_clover);
    } },
    { id: "red_clover_walker", name: "红车轴草径旅人", desc: "走过红车轴草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_clover_path);
    } },
    { id: "white_clover_sill", name: "白车轴草窗台", desc: "发现白车轴草", check: function (s) {
      return !!(s.discovered && s.discovered.white_clover);
    } },
    { id: "white_clover_walker", name: "白车轴草径旅人", desc: "走过白车轴草小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_clover_lane);
    } },
    { id: "catnip_sill", name: "猫薄荷窗台", desc: "发现猫薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.catnip);
    } },
    { id: "catnip_walker", name: "猫薄荷径旅人", desc: "走过猫薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.catnip_path);
    } },
    { id: "horehound_sill", name: "夏至草窗台", desc: "发现夏至草", check: function (s) {
      return !!(s.discovered && s.discovered.horehound);
    } },
    { id: "horehound_walker", name: "夏至草径旅人", desc: "走过夏至草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.horehound_path);
    } },
    { id: "motherwort_sill", name: "益母草窗台", desc: "发现益母草", check: function (s) {
      return !!(s.discovered && s.discovered.motherwort);
    } },
    { id: "motherwort_walker", name: "益母草径旅人", desc: "走过益母草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.motherwort_path);
    } },
    { id: "tansy_sill", name: "艾菊窗台", desc: "发现艾菊", check: function (s) {
      return !!(s.discovered && s.discovered.tansy);
    } },
    { id: "tansy_walker", name: "艾菊径旅人", desc: "走过艾菊草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tansy_meadow);
    } },
    { id: "agrimony_sill", name: "龙芽草窗台", desc: "发现龙芽草", check: function (s) {
      return !!(s.discovered && s.discovered.agrimony);
    } },
    { id: "agrimony_walker", name: "龙芽草径旅人", desc: "走过龙芽草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.agrimony_path);
    } },
    { id: "betony_sill", name: "水苏窗台", desc: "发现水苏", check: function (s) {
      return !!(s.discovered && s.discovered.betony);
    } },
    { id: "betony_walker", name: "水苏径旅人", desc: "走过水苏晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.betony_grove);
    } },
    { id: "solomon_seal_sill", name: "黄精窗台", desc: "发现黄精", check: function (s) {
      return !!(s.discovered && s.discovered.solomon_seal);
    } },
    { id: "solomon_seal_walker", name: "黄精径旅人", desc: "走过黄精短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.solomon_seal_path);
    } },
    { id: "rue_sill", name: "芸香窗台", desc: "发现芸香", check: function (s) {
      return !!(s.discovered && s.discovered.rue);
    } },
    { id: "rue_walker", name: "芸香径旅人", desc: "走过芸香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rue_path);
    } },
    { id: "wormwood_sill", name: "苦艾窗台", desc: "发现苦艾", check: function (s) {
      return !!(s.discovered && s.discovered.wormwood);
    } },
    { id: "wormwood_walker", name: "苦艾径旅人", desc: "走过苦艾短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wormwood_path);
    } },
    { id: "costmary_sill", name: "艾菊薄荷窗台", desc: "发现艾菊薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.costmary);
    } },
    { id: "costmary_walker", name: "艾菊薄荷径旅人", desc: "走过艾菊薄荷小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.costmary_lane);
    } },
    { id: "elecampane_sill", name: "土木香窗台", desc: "发现土木香", check: function (s) {
      return !!(s.discovered && s.discovered.elecampane);
    } },
    { id: "elecampane_walker", name: "土木香径旅人", desc: "走过土木香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.elecampane_path);
    } },
    { id: "valerian_root_sill", name: "缬草根窗台", desc: "发现缬草根", check: function (s) {
      return !!(s.discovered && s.discovered.valerian_root);
    } },
    { id: "valerian_root_walker", name: "缬草根径旅人", desc: "走过缬草根晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.valerian_root_path);
    } },
    { id: "meadow_clary_sill", name: "草地鼠尾草窗台", desc: "发现草地鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_clary);
    } },
    { id: "meadow_clary_walker", name: "草地鼠尾草径旅人", desc: "走过草地鼠尾草径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_clary_path);
    } },
    { id: "soapwort_sill", name: "皂草窗台", desc: "发现皂草", check: function (s) {
      return !!(s.discovered && s.discovered.soapwort);
    } },
    { id: "soapwort_walker", name: "皂草径旅人", desc: "走过皂草小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.soapwort_lane);
    } },
    { id: "milfoil_sill", name: "洋蓍草窗台", desc: "发现洋蓍草", check: function (s) {
      return !!(s.discovered && s.discovered.milfoil);
    } },
    { id: "milfoil_walker", name: "洋蓍草径旅人", desc: "走过洋蓍草草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.milfoil_meadow);
    } },
    { id: "lady_mantle_sill", name: "羽衣草窗台", desc: "发现羽衣草", check: function (s) {
      return !!(s.discovered && s.discovered.lady_mantle);
    } },
    { id: "lady_mantle_walker", name: "羽衣草径旅人", desc: "走过羽衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lady_mantle_path);
    } },
    { id: "speedwell_sill", name: "婆婆纳窗台", desc: "发现婆婆纳", check: function (s) {
      return !!(s.discovered && s.discovered.speedwell);
    } },
    { id: "speedwell_walker", name: "婆婆纳径旅人", desc: "走过婆婆纳小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.speedwell_lane);
    } },
    { id: "stitchwort_sill", name: "繁缕窗台", desc: "发现繁缕", check: function (s) {
      return !!(s.discovered && s.discovered.stitchwort);
    } },
    { id: "stitchwort_walker", name: "繁缕径旅人", desc: "走过繁缕短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.stitchwort_path);
    } },
    { id: "campion_sill", name: "剪秋罗窗台", desc: "发现剪秋罗", check: function (s) {
      return !!(s.discovered && s.discovered.campion);
    } },
    { id: "campion_walker", name: "剪秋罗径旅人", desc: "走过剪秋罗短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.campion_path);
    } },
    { id: "avens_sill", name: "水杨梅窗台", desc: "发现水杨梅", check: function (s) {
      return !!(s.discovered && s.discovered.avens);
    } },
    { id: "avens_walker", name: "水杨梅径旅人", desc: "走过水杨梅短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.avens_path);
    } },
    { id: "tormentil_sill", name: "直立委陵菜窗台", desc: "发现直立委陵菜", check: function (s) {
      return !!(s.discovered && s.discovered.tormentil);
    } },
    { id: "tormentil_walker", name: "直立委陵菜径旅人", desc: "走过直立委陵菜径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tormentil_path);
    } },
    { id: "silverweed_sill", name: "鹅绒委陵菜窗台", desc: "发现鹅绒委陵菜", check: function (s) {
      return !!(s.discovered && s.discovered.silverweed);
    } },
    { id: "silverweed_walker", name: "鹅绒委陵菜径旅人", desc: "走过鹅绒委陵菜径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silverweed_path);
    } },
    { id: "figwort_sill", name: "玄参窗台", desc: "发现玄参", check: function (s) {
      return !!(s.discovered && s.discovered.figwort);
    } },
    { id: "figwort_walker", name: "玄参径旅人", desc: "走过玄参短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.figwort_path);
    } },
    { id: "loosestrife_sill", name: "千屈菜窗台", desc: "发现千屈菜", check: function (s) {
      return !!(s.discovered && s.discovered.loosestrife);
    } },
    { id: "loosestrife_walker", name: "千屈菜径旅人", desc: "走过千屈菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.loosestrife_path);
    } },
    { id: "willowherb_sill", name: "柳兰窗台", desc: "发现柳兰", check: function (s) {
      return !!(s.discovered && s.discovered.willowherb);
    } },
    { id: "willowherb_walker", name: "柳兰径旅人", desc: "走过柳兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.willowherb_path);
    } },
    { id: "bedstraw_sill", name: "猪殃殃窗台", desc: "发现猪殃殃", check: function (s) {
      return !!(s.discovered && s.discovered.bedstraw);
    } },
    { id: "bedstraw_walker", name: "猪殃殃径旅人", desc: "走过猪殃殃小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bedstraw_lane);
    } },
    { id: "cleavers_sill", name: "拉拉藤窗台", desc: "发现拉拉藤", check: function (s) {
      return !!(s.discovered && s.discovered.cleavers);
    } },
    { id: "cleavers_walker", name: "拉拉藤径旅人", desc: "走过拉拉藤短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cleavers_path);
    } },
    { id: "ground_ivy_sill", name: "连钱草窗台", desc: "发现连钱草", check: function (s) {
      return !!(s.discovered && s.discovered.ground_ivy);
    } },
    { id: "ground_ivy_walker", name: "连钱草径旅人", desc: "走过连钱草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ground_ivy_path);
    } },
    { id: "self_heal_spike_sill", name: "夏枯穗窗台", desc: "发现夏枯穗", check: function (s) {
      return !!(s.discovered && s.discovered.self_heal_spike);
    } },
    { id: "self_heal_spike_walker", name: "夏枯穗径旅人", desc: "走过夏枯穗晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.self_heal_spike_path);
    } },
    { id: "bugle_sill", name: "筋骨草窗台", desc: "发现筋骨草", check: function (s) {
      return !!(s.discovered && s.discovered.bugle);
    } },
    { id: "bugle_walker", name: "筋骨草径旅人", desc: "走过筋骨草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bugle_path);
    } },
    { id: "primrose_sill", name: "报春花窗台", desc: "发现报春花", check: function (s) {
      return !!(s.discovered && s.discovered.primrose);
    } },
    { id: "primrose_walker", name: "报春花径旅人", desc: "走过报春花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.primrose_path);
    } },
    { id: "cowslip_sill", name: "黄花九轮草窗台", desc: "发现黄花九轮草", check: function (s) {
      return !!(s.discovered && s.discovered.cowslip);
    } },
    { id: "cowslip_walker", name: "黄花九轮草径旅人", desc: "走过黄花九轮草径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cowslip_lane);
    } },
    { id: "oxeye_sill", name: "滨菊窗台", desc: "发现滨菊", check: function (s) {
      return !!(s.discovered && s.discovered.oxeye);
    } },
    { id: "oxeye_walker", name: "滨菊径旅人", desc: "走过滨菊草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.oxeye_meadow);
    } },
    { id: "knapweed_sill", name: "矢车菊窗台", desc: "发现矢车菊", check: function (s) {
      return !!(s.discovered && s.discovered.knapweed);
    } },
    { id: "knapweed_walker", name: "矢车菊径旅人", desc: "走过矢车菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.knapweed_path);
    } },
    { id: "scabious_sill", name: "山萝卜窗台", desc: "发现山萝卜", check: function (s) {
      return !!(s.discovered && s.discovered.scabious);
    } },
    { id: "scabious_walker", name: "山萝卜径旅人", desc: "走过山萝卜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.scabious_path);
    } },
    { id: "teasel_sill", name: "川续断窗台", desc: "发现川续断", check: function (s) {
      return !!(s.discovered && s.discovered.teasel);
    } },
    { id: "teasel_walker", name: "川续断径旅人", desc: "走过川续断短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.teasel_path);
    } },
    { id: "burdock_sill", name: "牛蒡窗台", desc: "发现牛蒡", check: function (s) {
      return !!(s.discovered && s.discovered.burdock);
    } },
    { id: "burdock_walker", name: "牛蒡径旅人", desc: "走过牛蒡短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.burdock_path);
    } },
    { id: "nettle_seed_sill", name: "荨麻籽窗台", desc: "发现荨麻籽", check: function (s) {
      return !!(s.discovered && s.discovered.nettle_seed);
    } },
    { id: "nettle_seed_walker", name: "荨麻籽径旅人", desc: "走过荨麻籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.nettle_seed_path);
    } },
    { id: "hawthorn_berry_sill", name: "山楂果窗台", desc: "发现山楂果", check: function (s) {
      return !!(s.discovered && s.discovered.hawthorn_berry);
    } },
    { id: "hawthorn_berry_walker", name: "山楂果径旅人", desc: "走过山楂果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hawthorn_berry_path);
    } },
    { id: "rosehip_sill", name: "玫瑰果窗台", desc: "发现玫瑰果", check: function (s) {
      return !!(s.discovered && s.discovered.rosehip);
    } },
    { id: "rosehip_walker", name: "玫瑰果径旅人", desc: "走过玫瑰果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rosehip_path);
    } },
    { id: "sloe_sill", name: "黑刺李窗台", desc: "发现黑刺李", check: function (s) {
      return !!(s.discovered && s.discovered.sloe);
    } },
    { id: "sloe_walker", name: "黑刺李径旅人", desc: "走过黑刺李短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sloe_path);
    } },
    { id: "rowan_sill", name: "花楸果窗台", desc: "发现花楸果", check: function (s) {
      return !!(s.discovered && s.discovered.rowan);
    } },
    { id: "rowan_walker", name: "花楸果径旅人", desc: "走过花楸果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rowan_path);
    } },
    { id: "crabapple_sill", name: "海棠果窗台", desc: "发现海棠果", check: function (s) {
      return !!(s.discovered && s.discovered.crabapple);
    } },
    { id: "crabapple_walker", name: "海棠果径旅人", desc: "走过海棠果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.crabapple_path);
    } },
    { id: "serviceberry_sill", name: "唐棣窗台", desc: "发现唐棣", check: function (s) {
      return !!(s.discovered && s.discovered.serviceberry);
    } },
    { id: "serviceberry_walker", name: "唐棣径旅人", desc: "走过唐棣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.serviceberry_path);
    } },
    { id: "elderflower_fresh_sill", name: "接骨木花鲜窗台", desc: "发现接骨木花鲜", check: function (s) {
      return !!(s.discovered && s.discovered.elderflower_fresh);
    } },
    { id: "elderflower_fresh_walker", name: "接骨木花鲜径旅人", desc: "走过接骨木花鲜径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.elderflower_fresh_path);
    } },
    { id: "meadowsweet_fresh_sill", name: "绣线菊鲜窗台", desc: "发现绣线菊鲜", check: function (s) {
      return !!(s.discovered && s.discovered.meadowsweet_fresh);
    } },
    { id: "meadowsweet_fresh_walker", name: "绣线菊鲜径旅人", desc: "走过绣线菊鲜径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadowsweet_fresh_path);
    } },
    { id: "wood_sorrel_sill", name: "酢浆草窗台", desc: "发现酢浆草", check: function (s) {
      return !!(s.discovered && s.discovered.wood_sorrel);
    } },
    { id: "wood_sorrel_walker", name: "酢浆草径旅人", desc: "走过酢浆草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wood_sorrel_path);
    } },
    { id: "wild_garlic_sill", name: "熊葱窗台", desc: "发现熊葱", check: function (s) {
      return !!(s.discovered && s.discovered.wild_garlic);
    } },
    { id: "wild_garlic_walker", name: "熊葱径旅人", desc: "走过熊葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_garlic_path);
    } },
    { id: "ramsons_sill", name: "熊蒜窗台", desc: "发现熊蒜", check: function (s) {
      return !!(s.discovered && s.discovered.ramsons);
    } },
    { id: "ramsons_walker", name: "熊蒜径旅人", desc: "走过熊蒜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ramsons_path);
    } },
    { id: "jack_by_hedge_sill", name: "蒜芥窗台", desc: "发现蒜芥", check: function (s) {
      return !!(s.discovered && s.discovered.jack_by_hedge);
    } },
    { id: "jack_by_hedge_walker", name: "蒜芥径旅人", desc: "走过蒜芥短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jack_by_hedge_path);
    } },
    { id: "hedge_mustard_sill", name: "蒜芥菜窗台", desc: "发现蒜芥菜", check: function (s) {
      return !!(s.discovered && s.discovered.hedge_mustard);
    } },
    { id: "hedge_mustard_walker", name: "蒜芥菜径旅人", desc: "走过蒜芥菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hedge_mustard_path);
    } },
    { id: "wintercress_sill", name: "山芥窗台", desc: "发现山芥", check: function (s) {
      return !!(s.discovered && s.discovered.wintercress);
    } },
    { id: "wintercress_walker", name: "山芥径旅人", desc: "走过山芥短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wintercress_path);
    } },
    { id: "watercress_sill", name: "豆瓣菜窗台", desc: "发现豆瓣菜", check: function (s) {
      return !!(s.discovered && s.discovered.watercress);
    } },
    { id: "watercress_walker", name: "豆瓣菜径旅人", desc: "走过豆瓣菜溪径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.watercress_path);
    } },
    { id: "brooklime_sill", name: "有柄水苦荬窗台", desc: "发现有柄水苦荬", check: function (s) {
      return !!(s.discovered && s.discovered.brooklime);
    } },
    { id: "brooklime_walker", name: "有柄水苦荬径旅人", desc: "走过水苦荬溪径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.brooklime_path);
    } },
    { id: "cloudberry_sill", name: "云莓窗台", desc: "发现云莓", check: function (s) {
      return !!(s.discovered && s.discovered.cloudberry);
    } },
    { id: "cloudberry_walker", name: "云莓径旅人", desc: "走过云莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cloudberry_path);
    } },
    { id: "lingonberry_sill", name: "越橘窗台", desc: "发现越橘", check: function (s) {
      return !!(s.discovered && s.discovered.lingonberry);
    } },
    { id: "lingonberry_walker", name: "越橘径旅人", desc: "走过越橘短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lingonberry_path);
    } },
    { id: "bilberry_sill", name: "欧洲越橘窗台", desc: "发现欧洲越橘", check: function (s) {
      return !!(s.discovered && s.discovered.bilberry);
    } },
    { id: "bilberry_walker", name: "欧洲越橘径旅人", desc: "走过欧洲越橘短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bilberry_path);
    } },
    { id: "gooseberry_sill", name: "醋栗窗台", desc: "发现醋栗", check: function (s) {
      return !!(s.discovered && s.discovered.gooseberry);
    } },
    { id: "gooseberry_walker", name: "醋栗径旅人", desc: "走过醋栗短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.gooseberry_path);
    } },
    { id: "currant_red_sill", name: "红醋栗窗台", desc: "发现红醋栗", check: function (s) {
      return !!(s.discovered && s.discovered.currant_red);
    } },
    { id: "currant_red_walker", name: "红醋栗径旅人", desc: "走过红醋栗短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.currant_red_path);
    } },
    { id: "currant_black_sill", name: "黑醋栗窗台", desc: "发现黑醋栗", check: function (s) {
      return !!(s.discovered && s.discovered.currant_black);
    } },
    { id: "currant_black_walker", name: "黑醋栗径旅人", desc: "走过黑醋栗短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.currant_black_path);
    } },
    { id: "whitecurrant_sill", name: "白醋栗窗台", desc: "发现白醋栗", check: function (s) {
      return !!(s.discovered && s.discovered.whitecurrant);
    } },
    { id: "whitecurrant_walker", name: "白醋栗径旅人", desc: "走过白醋栗短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.whitecurrant_path);
    } },
    { id: "sea_buckthorn_sill", name: "沙棘窗台", desc: "发现沙棘", check: function (s) {
      return !!(s.discovered && s.discovered.sea_buckthorn);
    } },
    { id: "sea_buckthorn_walker", name: "沙棘径旅人", desc: "走过沙棘短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sea_buckthorn_path);
    } },
    { id: "medlar_sill", name: "欧楂窗台", desc: "发现欧楂", check: function (s) {
      return !!(s.discovered && s.discovered.medlar);
    } },
    { id: "medlar_walker", name: "欧楂径旅人", desc: "走过欧楂短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.medlar_path);
    } },
    { id: "quince_sill", name: "榅桲窗台", desc: "发现榅桲", check: function (s) {
      return !!(s.discovered && s.discovered.quince);
    } },
    { id: "quince_walker", name: "榅桲径旅人", desc: "走过榅桲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.quince_path);
    } },
    { id: "damson_sill", name: "西洋李窗台", desc: "发现西洋李", check: function (s) {
      return !!(s.discovered && s.discovered.damson);
    } },
    { id: "damson_walker", name: "西洋李径旅人", desc: "走过西洋李短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.damson_path);
    } },
    { id: "greengage_sill", name: "青李窗台", desc: "发现青李", check: function (s) {
      return !!(s.discovered && s.discovered.greengage);
    } },
    { id: "greengage_walker", name: "青李径旅人", desc: "走过青李短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.greengage_path);
    } },
    { id: "mirabelle_sill", name: "黄香李窗台", desc: "发现黄香李", check: function (s) {
      return !!(s.discovered && s.discovered.mirabelle);
    } },
    { id: "mirabelle_walker", name: "黄香李径旅人", desc: "走过黄香李短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mirabelle_path);
    } },
    { id: "saskatoon_sill", name: "萨斯卡通莓窗台", desc: "发现萨斯卡通莓", check: function (s) {
      return !!(s.discovered && s.discovered.saskatoon);
    } },
    { id: "saskatoon_walker", name: "萨斯卡通莓径旅人", desc: "走过萨斯卡通莓径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.saskatoon_path);
    } },
    { id: "chokeberry_sill", name: "野樱莓窗台", desc: "发现野樱莓", check: function (s) {
      return !!(s.discovered && s.discovered.chokeberry);
    } },
    { id: "chokeberry_walker", name: "野樱莓径旅人", desc: "走过野樱莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chokeberry_path);
    } },
    { id: "aronia_sill", name: "黑果腺肋花楸窗台", desc: "发现黑果腺肋花楸", check: function (s) {
      return !!(s.discovered && s.discovered.aronia);
    } },
    { id: "aronia_walker", name: "黑果腺肋花楸径旅人", desc: "走过黑果腺肋花楸径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.aronia_path);
    } },
    { id: "yarrow_white_sill", name: "白蓍窗台", desc: "发现白蓍", check: function (s) {
      return !!(s.discovered && s.discovered.yarrow_white);
    } },
    { id: "yarrow_white_walker", name: "白蓍径旅人", desc: "走过白蓍短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yarrow_white_path);
    } },
    { id: "achillea_pink_sill", name: "粉蓍窗台", desc: "发现粉蓍", check: function (s) {
      return !!(s.discovered && s.discovered.achillea_pink);
    } },
    { id: "achillea_pink_walker", name: "粉蓍径旅人", desc: "走过粉蓍短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.achillea_pink_path);
    } },
    { id: "cornflower_sill", name: "矢车菊蓝窗台", desc: "发现矢车菊蓝", check: function (s) {
      return !!(s.discovered && s.discovered.cornflower);
    } },
    { id: "cornflower_walker", name: "矢车菊蓝径旅人", desc: "走过矢车菊蓝径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cornflower_path);
    } },
    { id: "poppy_seed_sill", name: "罂粟籽窗台", desc: "发现罂粟籽", check: function (s) {
      return !!(s.discovered && s.discovered.poppy_seed);
    } },
    { id: "poppy_seed_walker", name: "罂粟籽径旅人", desc: "走过罂粟籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.poppy_seed_path);
    } },
    { id: "flax_flower_sill", name: "亚麻花窗台", desc: "发现亚麻花", check: function (s) {
      return !!(s.discovered && s.discovered.flax_flower);
    } },
    { id: "flax_flower_walker", name: "亚麻花径旅人", desc: "走过亚麻花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.flax_flower_path);
    } },
    { id: "flax_seed_sill", name: "亚麻籽窗台", desc: "发现亚麻籽", check: function (s) {
      return !!(s.discovered && s.discovered.flax_seed);
    } },
    { id: "flax_seed_walker", name: "亚麻籽径旅人", desc: "走过亚麻籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.flax_seed_path);
    } },
    { id: "hemp_seed_sill", name: "火麻仁窗台", desc: "发现火麻仁", check: function (s) {
      return !!(s.discovered && s.discovered.hemp_seed);
    } },
    { id: "hemp_seed_walker", name: "火麻仁径旅人", desc: "走过火麻仁短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hemp_seed_path);
    } },
    { id: "chia_seed_sill", name: "奇亚籽窗台", desc: "发现奇亚籽", check: function (s) {
      return !!(s.discovered && s.discovered.chia_seed);
    } },
    { id: "chia_seed_walker", name: "奇亚籽径旅人", desc: "走过奇亚籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chia_seed_path);
    } },
    { id: "pumpkin_seed_sill", name: "南瓜籽窗台", desc: "发现南瓜籽", check: function (s) {
      return !!(s.discovered && s.discovered.pumpkin_seed);
    } },
    { id: "pumpkin_seed_walker", name: "南瓜籽径旅人", desc: "走过南瓜籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pumpkin_seed_path);
    } },
    { id: "sunflower_seed_sill", name: "葵花籽窗台", desc: "发现葵花籽", check: function (s) {
      return !!(s.discovered && s.discovered.sunflower_seed);
    } },
    { id: "sunflower_seed_walker", name: "葵花籽径旅人", desc: "走过葵花籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sunflower_seed_path);
    } },
    { id: "sesame_black_sill", name: "黑芝麻窗台", desc: "发现黑芝麻", check: function (s) {
      return !!(s.discovered && s.discovered.sesame_black);
    } },
    { id: "sesame_black_walker", name: "黑芝麻径旅人", desc: "走过黑芝麻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sesame_black_path);
    } },
    { id: "sesame_white_sill", name: "白芝麻窗台", desc: "发现白芝麻", check: function (s) {
      return !!(s.discovered && s.discovered.sesame_white);
    } },
    { id: "sesame_white_walker", name: "白芝麻径旅人", desc: "走过白芝麻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sesame_white_path);
    } },
    { id: "fennel_pollen_sill", name: "茴香花粉窗台", desc: "发现茴香花粉", check: function (s) {
      return !!(s.discovered && s.discovered.fennel_pollen);
    } },
    { id: "fennel_pollen_walker", name: "茴香花粉径旅人", desc: "走过茴香花粉径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fennel_pollen_path);
    } },
    { id: "fennel_frond_sill", name: "茴香叶窗台", desc: "发现茴香叶", check: function (s) {
      return !!(s.discovered && s.discovered.fennel_frond);
    } },
    { id: "fennel_frond_walker", name: "茴香叶径旅人", desc: "走过茴香叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fennel_frond_path);
    } },
    { id: "dill_pollen_sill", name: "莳萝花粉窗台", desc: "发现莳萝花粉", check: function (s) {
      return !!(s.discovered && s.discovered.dill_pollen);
    } },
    { id: "dill_pollen_walker", name: "莳萝花粉径旅人", desc: "走过莳萝花粉径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dill_pollen_path);
    } },
    { id: "celery_leaf_sill", name: "芹菜叶窗台", desc: "发现芹菜叶", check: function (s) {
      return !!(s.discovered && s.discovered.celery_leaf);
    } },
    { id: "celery_leaf_walker", name: "芹菜叶径旅人", desc: "走过芹菜叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.celery_leaf_path);
    } },
    { id: "rooibos_sill", name: "路易波士窗台", desc: "发现路易波士", check: function (s) {
      return !!(s.discovered && s.discovered.rooibos);
    } },
    { id: "rooibos_walker", name: "路易波士径旅人", desc: "走过路易波士短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rooibos_path);
    } },
    { id: "honeybush_sill", name: "蜜树茶窗台", desc: "发现蜜树茶", check: function (s) {
      return !!(s.discovered && s.discovered.honeybush);
    } },
    { id: "honeybush_walker", name: "蜜树茶径旅人", desc: "走过蜜树茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.honeybush_path);
    } },
    { id: "yerba_mate_sill", name: "马黛茶窗台", desc: "发现马黛茶", check: function (s) {
      return !!(s.discovered && s.discovered.yerba_mate);
    } },
    { id: "yerba_mate_walker", name: "马黛茶径旅人", desc: "走过马黛茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yerba_mate_path);
    } },
    { id: "guayusa_sill", name: "瓜尤萨窗台", desc: "发现瓜尤萨", check: function (s) {
      return !!(s.discovered && s.discovered.guayusa);
    } },
    { id: "guayusa_walker", name: "瓜尤萨径旅人", desc: "走过瓜尤萨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.guayusa_path);
    } },
    { id: "lapacho_sill", name: "拉帕乔窗台", desc: "发现拉帕乔", check: function (s) {
      return !!(s.discovered && s.discovered.lapacho);
    } },
    { id: "lapacho_walker", name: "拉帕乔径旅人", desc: "走过拉帕乔树径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lapacho_path);
    } },
    { id: "sassafras_sill", name: "檫树窗台", desc: "发现檫树", check: function (s) {
      return !!(s.discovered && s.discovered.sassafras);
    } },
    { id: "sassafras_walker", name: "檫树径旅人", desc: "走过檫树短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sassafras_path);
    } },
    { id: "birch_bark_sill", name: "白桦皮窗台", desc: "发现白桦皮", check: function (s) {
      return !!(s.discovered && s.discovered.birch_bark);
    } },
    { id: "birch_bark_walker", name: "白桦皮径旅人", desc: "走过白桦皮短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.birch_bark_path);
    } },
    { id: "pine_resin_sill", name: "松脂窗台", desc: "发现松脂", check: function (s) {
      return !!(s.discovered && s.discovered.pine_resin);
    } },
    { id: "pine_resin_walker", name: "松脂径旅人", desc: "走过松脂短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pine_resin_path);
    } },
    { id: "gardenia_sill", name: "栀子花窗台", desc: "发现栀子花", check: function (s) {
      return !!(s.discovered && s.discovered.gardenia);
    } },
    { id: "gardenia_walker", name: "栀子花径旅人", desc: "走过栀子花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.gardenia_path);
    } },
    { id: "magnolia_sill", name: "玉兰花窗台", desc: "发现玉兰花", check: function (s) {
      return !!(s.discovered && s.discovered.magnolia);
    } },
    { id: "magnolia_walker", name: "玉兰花径旅人", desc: "走过玉兰花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.magnolia_path);
    } },
    { id: "frangipani_sill", name: "鸡蛋花窗台", desc: "发现鸡蛋花", check: function (s) {
      return !!(s.discovered && s.discovered.frangipani);
    } },
    { id: "frangipani_walker", name: "鸡蛋花径旅人", desc: "走过鸡蛋花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.frangipani_path);
    } },
    { id: "plumeria_sill", name: "缅栀窗台", desc: "发现缅栀", check: function (s) {
      return !!(s.discovered && s.discovered.plumeria);
    } },
    { id: "plumeria_walker", name: "缅栀径旅人", desc: "走过缅栀短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.plumeria_path);
    } },
    { id: "tuberose_sill", name: "晚香玉窗台", desc: "发现晚香玉", check: function (s) {
      return !!(s.discovered && s.discovered.tuberose);
    } },
    { id: "tuberose_walker", name: "晚香玉径旅人", desc: "走过晚香玉晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tuberose_path);
    } },
    { id: "stephanotis_sill", name: "马达加斯加茉莉窗台", desc: "发现马达加斯加茉莉", check: function (s) {
      return !!(s.discovered && s.discovered.stephanotis);
    } },
    { id: "stephanotis_walker", name: "马达加斯加茉莉径旅人", desc: "走过马达加斯加茉莉径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.stephanotis_path);
    } },
    { id: "garden_phlox_sill", name: "福禄考窗台", desc: "发现福禄考", check: function (s) {
      return !!(s.discovered && s.discovered.garden_phlox);
    } },
    { id: "garden_phlox_walker", name: "福禄考径旅人", desc: "走过福禄考短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_phlox_path);
    } },
    { id: "osmanthus_fresh_sill", name: "桂花鲜瓣窗台", desc: "发现桂花鲜瓣", check: function (s) {
      return !!(s.discovered && s.discovered.osmanthus_fresh);
    } },
    { id: "osmanthus_fresh_walker", name: "桂花鲜瓣径旅人", desc: "走过桂花鲜瓣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.osmanthus_fresh_path);
    } },
    { id: "galangal_fresh_sill", name: "鲜高良姜窗台", desc: "发现鲜高良姜", check: function (s) {
      return !!(s.discovered && s.discovered.galangal_fresh);
    } },
    { id: "galangal_fresh_walker", name: "鲜高良姜径旅人", desc: "走过鲜高良姜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.galangal_fresh_path);
    } },
    { id: "ginger_flower_sill", name: "姜花窗台", desc: "发现姜花", check: function (s) {
      return !!(s.discovered && s.discovered.ginger_flower);
    } },
    { id: "ginger_flower_walker", name: "姜花径旅人", desc: "走过姜花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ginger_flower_path);
    } },
    { id: "turmeric_fresh_sill", name: "鲜姜黄窗台", desc: "发现鲜姜黄", check: function (s) {
      return !!(s.discovered && s.discovered.turmeric_fresh);
    } },
    { id: "turmeric_fresh_walker", name: "鲜姜黄径旅人", desc: "走过鲜姜黄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.turmeric_fresh_path);
    } },
    { id: "cardamom_green_sill", name: "绿豆蔻窗台", desc: "发现绿豆蔻", check: function (s) {
      return !!(s.discovered && s.discovered.cardamom_green);
    } },
    { id: "cardamom_green_walker", name: "绿豆蔻径旅人", desc: "走过绿豆蔻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cardamom_green_path);
    } },
    { id: "cardamom_black_sill", name: "黑豆蔻窗台", desc: "发现黑豆蔻", check: function (s) {
      return !!(s.discovered && s.discovered.cardamom_black);
    } },
    { id: "cardamom_black_walker", name: "黑豆蔻径旅人", desc: "走过黑豆蔻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cardamom_black_path);
    } },
    { id: "long_pepper_sill", name: "荜拨窗台", desc: "发现荜拨", check: function (s) {
      return !!(s.discovered && s.discovered.long_pepper);
    } },
    { id: "long_pepper_walker", name: "荜拨径旅人", desc: "走过荜拨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.long_pepper_path);
    } },
    { id: "grains_of_paradise_sill", name: "天堂椒窗台", desc: "发现天堂椒", check: function (s) {
      return !!(s.discovered && s.discovered.grains_of_paradise);
    } },
    { id: "grains_of_paradise_walker", name: "天堂椒径旅人", desc: "走过天堂椒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.grains_paradise_path);
    } },
    { id: "cubeb_sill", name: "毕澄茄窗台", desc: "发现毕澄茄", check: function (s) {
      return !!(s.discovered && s.discovered.cubeb);
    } },
    { id: "cubeb_walker", name: "毕澄茄径旅人", desc: "走过毕澄茄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cubeb_path);
    } },
    { id: "makrut_leaf_sill", name: "青柠叶窗台", desc: "发现青柠叶", check: function (s) {
      return !!(s.discovered && s.discovered.makrut_leaf);
    } },
    { id: "makrut_leaf_walker", name: "青柠叶径旅人", desc: "走过青柠叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.makrut_leaf_path);
    } },
    { id: "curry_leaf_sill", name: "咖喱叶窗台", desc: "发现咖喱叶", check: function (s) {
      return !!(s.discovered && s.discovered.curry_leaf);
    } },
    { id: "curry_leaf_walker", name: "咖喱叶径旅人", desc: "走过咖喱叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.curry_leaf_path);
    } },
    { id: "holy_basil_sill", name: "圣罗勒窗台", desc: "发现圣罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.holy_basil);
    } },
    { id: "holy_basil_walker", name: "圣罗勒径旅人", desc: "走过圣罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.holy_basil_path);
    } },
    { id: "thai_basil_sill", name: "泰罗勒窗台", desc: "发现泰罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.thai_basil);
    } },
    { id: "thai_basil_walker", name: "泰罗勒径旅人", desc: "走过泰罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.thai_basil_path);
    } },
    { id: "lemon_basil_sill", name: "柠檬罗勒窗台", desc: "发现柠檬罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.lemon_basil);
    } },
    { id: "lemon_basil_walker", name: "柠檬罗勒径旅人", desc: "走过柠檬罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lemon_basil_path);
    } },
    { id: "cinnamon_leaf_sill", name: "肉桂叶窗台", desc: "发现肉桂叶", check: function (s) {
      return !!(s.discovered && s.discovered.cinnamon_leaf);
    } },
    { id: "cinnamon_leaf_walker", name: "肉桂叶径旅人", desc: "走过肉桂叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cinnamon_leaf_path);
    } },
    { id: "clove_bud_sill", name: "丁香芽窗台", desc: "发现丁香芽", check: function (s) {
      return !!(s.discovered && s.discovered.clove_bud);
    } },
    { id: "clove_bud_walker", name: "丁香芽径旅人", desc: "走过丁香芽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.clove_bud_path);
    } },
    { id: "allspice_leaf_sill", name: "多香果叶窗台", desc: "发现多香果叶", check: function (s) {
      return !!(s.discovered && s.discovered.allspice_leaf);
    } },
    { id: "allspice_leaf_walker", name: "多香果叶径旅人", desc: "走过多香果叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.allspice_leaf_path);
    } },
    { id: "reindeer_moss_sill", name: "驯鹿苔窗台", desc: "发现驯鹿苔", check: function (s) {
      return !!(s.discovered && s.discovered.reindeer_moss);
    } },
    { id: "reindeer_moss_walker", name: "驯鹿苔径旅人", desc: "走过驯鹿苔短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.reindeer_moss_path);
    } },
    { id: "iceland_moss_sill", name: "冰岛苔窗台", desc: "发现冰岛苔", check: function (s) {
      return !!(s.discovered && s.discovered.iceland_moss);
    } },
    { id: "iceland_moss_walker", name: "冰岛苔径旅人", desc: "走过冰岛苔短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.iceland_moss_path);
    } },
    { id: "oak_moss_sill", name: "橡苔窗台", desc: "发现橡苔", check: function (s) {
      return !!(s.discovered && s.discovered.oak_moss);
    } },
    { id: "oak_moss_walker", name: "橡苔径旅人", desc: "走过橡苔短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.oak_moss_path);
    } },
    { id: "usnea_sill", name: "松萝窗台", desc: "发现松萝", check: function (s) {
      return !!(s.discovered && s.discovered.usnea);
    } },
    { id: "usnea_walker", name: "松萝径旅人", desc: "走过松萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.usnea_path);
    } },
    { id: "chaga_sill", name: "白桦茸窗台", desc: "发现白桦茸", check: function (s) {
      return !!(s.discovered && s.discovered.chaga);
    } },
    { id: "chaga_walker", name: "白桦茸径旅人", desc: "走过白桦茸短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chaga_path);
    } },
    { id: "reishi_sill", name: "灵芝窗台", desc: "发现灵芝", check: function (s) {
      return !!(s.discovered && s.discovered.reishi);
    } },
    { id: "reishi_walker", name: "灵芝径旅人", desc: "走过灵芝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.reishi_path);
    } },
    { id: "lion_mane_sill", name: "猴头菇窗台", desc: "发现猴头菇", check: function (s) {
      return !!(s.discovered && s.discovered.lion_mane);
    } },
    { id: "lion_mane_walker", name: "猴头菇径旅人", desc: "走过猴头菇短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lion_mane_path);
    } },
    { id: "maitake_sill", name: "舞茸窗台", desc: "发现舞茸", check: function (s) {
      return !!(s.discovered && s.discovered.maitake);
    } },
    { id: "maitake_walker", name: "舞茸径旅人", desc: "走过舞茸短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.maitake_path);
    } },
    { id: "rambutan_fresh_sill", name: "鲜红毛丹窗台", desc: "发现鲜红毛丹", check: function (s) {
      return !!(s.discovered && s.discovered.rambutan_fresh);
    } },
    { id: "rambutan_fresh_walker", name: "鲜红毛丹径旅人", desc: "走过鲜红毛丹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rambutan_fresh_path);
    } },
    { id: "lychee_fresh_sill", name: "鲜荔枝窗台", desc: "发现鲜荔枝", check: function (s) {
      return !!(s.discovered && s.discovered.lychee_fresh);
    } },
    { id: "lychee_fresh_walker", name: "鲜荔枝径旅人", desc: "走过鲜荔枝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lychee_fresh_path);
    } },
    { id: "mangosteen_sill", name: "山竹窗台", desc: "发现山竹", check: function (s) {
      return !!(s.discovered && s.discovered.mangosteen);
    } },
    { id: "mangosteen_walker", name: "山竹径旅人", desc: "走过山竹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mangosteen_path);
    } },
    { id: "durian_flower_sill", name: "榴莲花窗台", desc: "发现榴莲花", check: function (s) {
      return !!(s.discovered && s.discovered.durian_flower);
    } },
    { id: "durian_flower_walker", name: "榴莲花径旅人", desc: "走过榴莲花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.durian_flower_path);
    } },
    { id: "jackfruit_seed_sill", name: "波罗蜜籽窗台", desc: "发现波罗蜜籽", check: function (s) {
      return !!(s.discovered && s.discovered.jackfruit_seed);
    } },
    { id: "jackfruit_seed_walker", name: "波罗蜜籽径旅人", desc: "走过波罗蜜籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jackfruit_seed_path);
    } },
    { id: "tamarind_sill", name: "罗望子窗台", desc: "发现罗望子", check: function (s) {
      return !!(s.discovered && s.discovered.tamarind);
    } },
    { id: "tamarind_walker", name: "罗望子径旅人", desc: "走过罗望子短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tamarind_path);
    } },
    { id: "calamansi_sill", name: "四季桔窗台", desc: "发现四季桔", check: function (s) {
      return !!(s.discovered && s.discovered.calamansi);
    } },
    { id: "calamansi_walker", name: "四季桔径旅人", desc: "走过四季桔短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.calamansi_path);
    } },
    { id: "fig_fresh_sill", name: "无花果鲜窗台", desc: "发现无花果鲜", check: function (s) {
      return !!(s.discovered && s.discovered.fig_fresh);
    } },
    { id: "fig_fresh_walker", name: "无花果鲜径旅人", desc: "走过无花果鲜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fig_fresh_path);
    } },
    { id: "pomegranate_seed_sill", name: "石榴籽窗台", desc: "发现石榴籽", check: function (s) {
      return !!(s.discovered && s.discovered.pomegranate_seed);
    } },
    { id: "pomegranate_seed_walker", name: "石榴籽径旅人", desc: "走过石榴籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pomegranate_seed_path);
    } },
    { id: "cactus_pear_sill", name: "仙人掌果窗台", desc: "发现仙人掌果", check: function (s) {
      return !!(s.discovered && s.discovered.cactus_pear);
    } },
    { id: "cactus_pear_walker", name: "仙人掌果径旅人", desc: "走过仙人掌果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cactus_pear_path);
    } },
    { id: "prickly_pear_sill", name: "霸王树果窗台", desc: "发现霸王树果", check: function (s) {
      return !!(s.discovered && s.discovered.prickly_pear);
    } },
    { id: "prickly_pear_walker", name: "霸王树果径旅人", desc: "走过霸王树果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.prickly_pear_path);
    } },
    { id: "sapodilla_sill", name: "人心果窗台", desc: "发现人心果", check: function (s) {
      return !!(s.discovered && s.discovered.sapodilla);
    } },
    { id: "sapodilla_walker", name: "人心果径旅人", desc: "走过人心果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sapodilla_path);
    } },
    { id: "soursop_sill", name: "刺果番荔枝窗台", desc: "发现刺果番荔枝", check: function (s) {
      return !!(s.discovered && s.discovered.soursop);
    } },
    { id: "soursop_walker", name: "刺果番荔枝径旅人", desc: "走过刺果番荔枝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.soursop_path);
    } },
    { id: "cherimoya_sill", name: "毛叶番荔枝窗台", desc: "发现毛叶番荔枝", check: function (s) {
      return !!(s.discovered && s.discovered.cherimoya);
    } },
    { id: "cherimoya_walker", name: "毛叶番荔枝径旅人", desc: "走过毛叶番荔枝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cherimoya_path);
    } },
    { id: "feijoa_sill", name: "费约果窗台", desc: "发现费约果", check: function (s) {
      return !!(s.discovered && s.discovered.feijoa);
    } },
    { id: "feijoa_walker", name: "费约果径旅人", desc: "走过费约果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.feijoa_path);
    } },
    { id: "loquat_fresh_sill", name: "鲜枇杷窗台", desc: "发现鲜枇杷", check: function (s) {
      return !!(s.discovered && s.discovered.loquat_fresh);
    } },
    { id: "loquat_fresh_walker", name: "鲜枇杷径旅人", desc: "走过鲜枇杷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.loquat_fresh_path);
    } },
    { id: "jujube_fresh_sill", name: "鲜枣窗台", desc: "发现鲜枣", check: function (s) {
      return !!(s.discovered && s.discovered.jujube_fresh);
    } },
    { id: "jujube_fresh_walker", name: "鲜枣径旅人", desc: "走过鲜枣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jujube_fresh_path);
    } },
    { id: "mulberry_white_sill", name: "白桑窗台", desc: "发现白桑", check: function (s) {
      return !!(s.discovered && s.discovered.mulberry_white);
    } },
    { id: "mulberry_white_walker", name: "白桑径旅人", desc: "走过白桑短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mulberry_white_path);
    } },
    { id: "mulberry_black_sill", name: "黑桑窗台", desc: "发现黑桑", check: function (s) {
      return !!(s.discovered && s.discovered.mulberry_black);
    } },
    { id: "mulberry_black_walker", name: "黑桑径旅人", desc: "走过黑桑短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mulberry_black_path);
    } },
    { id: "elderberry_fresh_sill", name: "鲜接骨木果窗台", desc: "发现鲜接骨木果", check: function (s) {
      return !!(s.discovered && s.discovered.elderberry_fresh);
    } },
    { id: "elderberry_fresh_walker", name: "鲜接骨木果径旅人", desc: "走过鲜接骨木果径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.elderberry_fresh_path);
    } },
    { id: "rowan_jelly_sill", name: "花楸果冻窗台", desc: "发现花楸果冻", check: function (s) {
      return !!(s.discovered && s.discovered.rowan_jelly);
    } },
    { id: "rowan_jelly_walker", name: "花楸果冻径旅人", desc: "走过花楸果冻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rowan_jelly_path);
    } },
    { id: "quince_paste_sill", name: "榅桲膏窗台", desc: "发现榅桲膏", check: function (s) {
      return !!(s.discovered && s.discovered.quince_paste);
    } },
    { id: "quince_paste_walker", name: "榅桲膏径旅人", desc: "走过榅桲膏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.quince_paste_path);
    } },
    { id: "bergamot_fresh_sill", name: "鲜佛手柑窗台", desc: "发现鲜佛手柑", check: function (s) {
      return !!(s.discovered && s.discovered.bergamot_fresh);
    } },
    { id: "bergamot_fresh_walker", name: "鲜佛手柑径旅人", desc: "走过鲜佛手柑短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bergamot_fresh_path);
    } },
    { id: "yuzu_fresh_sill", name: "鲜柚子窗台", desc: "发现鲜柚子", check: function (s) {
      return !!(s.discovered && s.discovered.yuzu_fresh);
    } },
    { id: "yuzu_fresh_walker", name: "鲜柚子径旅人", desc: "走过鲜柚子短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yuzu_fresh_path);
    } },
    { id: "sudachi_sill", name: "酢橘窗台", desc: "发现酢橘", check: function (s) {
      return !!(s.discovered && s.discovered.sudachi);
    } },
    { id: "sudachi_walker", name: "酢橘径旅人", desc: "走过酢橘短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sudachi_path);
    } },
    { id: "kabosu_sill", name: "香酸柑窗台", desc: "发现香酸柑", check: function (s) {
      return !!(s.discovered && s.discovered.kabosu);
    } },
    { id: "kabosu_walker", name: "香酸柑径旅人", desc: "走过香酸柑短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kabosu_path);
    } },
    { id: "ponkan_sill", name: "椪柑窗台", desc: "发现椪柑", check: function (s) {
      return !!(s.discovered && s.discovered.ponkan);
    } },
    { id: "ponkan_walker", name: "椪柑径旅人", desc: "走过椪柑短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ponkan_path);
    } },
    { id: "dekopon_sill", name: "不知火窗台", desc: "发现不知火", check: function (s) {
      return !!(s.discovered && s.discovered.dekopon);
    } },
    { id: "dekopon_walker", name: "不知火径旅人", desc: "走过不知火短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dekopon_path);
    } },
    { id: "hassaku_sill", name: "八朔窗台", desc: "发现八朔", check: function (s) {
      return !!(s.discovered && s.discovered.hassaku);
    } },
    { id: "hassaku_walker", name: "八朔径旅人", desc: "走过八朔短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hassaku_path);
    } },
    { id: "amanatsu_sill", name: "甘夏窗台", desc: "发现甘夏", check: function (s) {
      return !!(s.discovered && s.discovered.amanatsu);
    } },
    { id: "amanatsu_walker", name: "甘夏径旅人", desc: "走过甘夏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.amanatsu_path);
    } },
    { id: "shiso_green_sill", name: "青紫苏窗台", desc: "发现青紫苏", check: function (s) {
      return !!(s.discovered && s.discovered.shiso_green);
    } },
    { id: "shiso_green_walker", name: "青紫苏径旅人", desc: "走过青紫苏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.shiso_green_path);
    } },
    { id: "shiso_red_sill", name: "赤紫苏窗台", desc: "发现赤紫苏", check: function (s) {
      return !!(s.discovered && s.discovered.shiso_red);
    } },
    { id: "shiso_red_walker", name: "赤紫苏径旅人", desc: "走过赤紫苏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.shiso_red_path);
    } },
    { id: "mitsuba_sill", name: "三叶窗台", desc: "发现三叶", check: function (s) {
      return !!(s.discovered && s.discovered.mitsuba);
    } },
    { id: "mitsuba_walker", name: "三叶径旅人", desc: "走过三叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mitsuba_path);
    } },
    { id: "myoga_sill", name: "茗荷窗台", desc: "发现茗荷", check: function (s) {
      return !!(s.discovered && s.discovered.myoga);
    } },
    { id: "myoga_walker", name: "茗荷径旅人", desc: "走过茗荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.myoga_path);
    } },
    { id: "wasabi_leaf_sill", name: "山葵叶窗台", desc: "发现山葵叶", check: function (s) {
      return !!(s.discovered && s.discovered.wasabi_leaf);
    } },
    { id: "wasabi_leaf_walker", name: "山葵叶径旅人", desc: "走过山葵叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wasabi_leaf_path);
    } },
    { id: "sansho_sill", name: "山椒窗台", desc: "发现山椒", check: function (s) {
      return !!(s.discovered && s.discovered.sansho);
    } },
    { id: "sansho_walker", name: "山椒径旅人", desc: "走过山椒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sansho_path);
    } },
    { id: "kinome_sill", name: "木芽窗台", desc: "发现木芽", check: function (s) {
      return !!(s.discovered && s.discovered.kinome);
    } },
    { id: "kinome_walker", name: "木芽径旅人", desc: "走过木芽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kinome_path);
    } },
    { id: "yuzu_kosho_sill", name: "柚子胡椒窗台", desc: "发现柚子胡椒", check: function (s) {
      return !!(s.discovered && s.discovered.yuzu_kosho);
    } },
    { id: "yuzu_kosho_walker", name: "柚子胡椒径旅人", desc: "走过柚子胡椒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yuzu_kosho_path);
    } },
    { id: "edelweiss_sill", name: "雪绒花窗台", desc: "发现雪绒花", check: function (s) {
      return !!(s.discovered && s.discovered.edelweiss);
    } },
    { id: "edelweiss_walker", name: "雪绒花径旅人", desc: "走过雪绒花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edelweiss_path);
    } },
    { id: "gentian_sill", name: "龙胆窗台", desc: "发现龙胆", check: function (s) {
      return !!(s.discovered && s.discovered.gentian);
    } },
    { id: "gentian_walker", name: "龙胆径旅人", desc: "走过龙胆短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.gentian_path);
    } },
    { id: "arnica_montana_sill", name: "山地金车窗台", desc: "发现山地金车", check: function (s) {
      return !!(s.discovered && s.discovered.arnica_montana);
    } },
    { id: "arnica_montana_walker", name: "山地金车径旅人", desc: "走过山地金车径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.arnica_montana_path);
    } },
    { id: "alpine_strawberry_sill", name: "野草莓窗台", desc: "发现野草莓", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_strawberry);
    } },
    { id: "alpine_strawberry_walker", name: "野草莓径旅人", desc: "走过野草莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_strawberry_path);
    } },
    { id: "bilberry_leaf_sill", name: "越橘叶窗台", desc: "发现越橘叶", check: function (s) {
      return !!(s.discovered && s.discovered.bilberry_leaf);
    } },
    { id: "bilberry_leaf_walker", name: "越橘叶径旅人", desc: "走过越橘叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bilberry_leaf_path);
    } },
    { id: "juniper_berry_sill", name: "杜松果窗台", desc: "发现杜松果", check: function (s) {
      return !!(s.discovered && s.discovered.juniper_berry);
    } },
    { id: "juniper_berry_walker", name: "杜松果径旅人", desc: "走过杜松果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.juniper_berry_path);
    } },
    { id: "fir_needle_sill", name: "冷杉针窗台", desc: "发现冷杉针", check: function (s) {
      return !!(s.discovered && s.discovered.fir_needle);
    } },
    { id: "fir_needle_walker", name: "冷杉针径旅人", desc: "走过冷杉针短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fir_needle_path);
    } },
    { id: "spruce_tip_sill", name: "云杉芽窗台", desc: "发现云杉芽", check: function (s) {
      return !!(s.discovered && s.discovered.spruce_tip);
    } },
    { id: "spruce_tip_walker", name: "云杉芽径旅人", desc: "走过云杉芽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.spruce_tip_path);
    } },
    { id: "olive_leaf_sill", name: "橄榄叶窗台", desc: "发现橄榄叶", check: function (s) {
      return !!(s.discovered && s.discovered.olive_leaf);
    } },
    { id: "olive_leaf_walker", name: "橄榄叶径旅人", desc: "走过橄榄叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.olive_leaf_path);
    } },
    { id: "myrtle_berry_sill", name: "香桃木果窗台", desc: "发现香桃木果", check: function (s) {
      return !!(s.discovered && s.discovered.myrtle_berry);
    } },
    { id: "myrtle_berry_walker", name: "香桃木果径旅人", desc: "走过香桃木果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.myrtle_berry_path);
    } },
    { id: "mastic_sill", name: "乳香黄连木窗台", desc: "发现乳香黄连木", check: function (s) {
      return !!(s.discovered && s.discovered.mastic);
    } },
    { id: "mastic_walker", name: "乳香黄连木径旅人", desc: "走过乳香黄连木径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mastic_path);
    } },
    { id: "caper_sill", name: "续随子花蕾窗台", desc: "发现续随子花蕾", check: function (s) {
      return !!(s.discovered && s.discovered.caper);
    } },
    { id: "caper_walker", name: "续随子花蕾径旅人", desc: "走过续随子花蕾径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.caper_path);
    } },
    { id: "zaatar_sill", name: "扎塔香草窗台", desc: "发现扎塔香草", check: function (s) {
      return !!(s.discovered && s.discovered.zaatar);
    } },
    { id: "zaatar_walker", name: "扎塔香草径旅人", desc: "走过扎塔香草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.zaatar_path);
    } },
    { id: "sumac_berry_sill", name: "盐肤木果窗台", desc: "发现盐肤木果", check: function (s) {
      return !!(s.discovered && s.discovered.sumac_berry);
    } },
    { id: "sumac_berry_walker", name: "盐肤木果径旅人", desc: "走过盐肤木果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sumac_berry_path);
    } },
    { id: "saffron_crocus_sill", name: "番红花窗台", desc: "发现番红花", check: function (s) {
      return !!(s.discovered && s.discovered.saffron_crocus);
    } },
    { id: "saffron_crocus_walker", name: "番红花径旅人", desc: "走过番红花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.saffron_crocus_path);
    } },
    { id: "orange_blossom_sill", name: "橙花窗台", desc: "发现橙花", check: function (s) {
      return !!(s.discovered && s.discovered.orange_blossom);
    } },
    { id: "orange_blossom_walker", name: "橙花径旅人", desc: "走过橙花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_blossom_path);
    } },
    { id: "lavender_honey_sill", name: "薰衣草蜜窗台", desc: "发现薰衣草蜜", check: function (s) {
      return !!(s.discovered && s.discovered.lavender_honey);
    } },
    { id: "lavender_honey_walker", name: "薰衣草蜜径旅人", desc: "走过薰衣草蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lavender_honey_path);
    } },
    { id: "thyme_honey_sill", name: "百里香蜜窗台", desc: "发现百里香蜜", check: function (s) {
      return !!(s.discovered && s.discovered.thyme_honey);
    } },
    { id: "thyme_honey_walker", name: "百里香蜜径旅人", desc: "走过百里香蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.thyme_honey_path);
    } },
    { id: "acacia_honey_sill", name: "洋槐蜜窗台", desc: "发现洋槐蜜", check: function (s) {
      return !!(s.discovered && s.discovered.acacia_honey);
    } },
    { id: "acacia_honey_walker", name: "洋槐蜜径旅人", desc: "走过洋槐蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.acacia_honey_path);
    } },
    { id: "buckwheat_honey_sill", name: "荞麦蜜窗台", desc: "发现荞麦蜜", check: function (s) {
      return !!(s.discovered && s.discovered.buckwheat_honey);
    } },
    { id: "buckwheat_honey_walker", name: "荞麦蜜径旅人", desc: "走过荞麦蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.buckwheat_honey_path);
    } },
    { id: "chestnut_honey_sill", name: "板栗蜜窗台", desc: "发现板栗蜜", check: function (s) {
      return !!(s.discovered && s.discovered.chestnut_honey);
    } },
    { id: "chestnut_honey_walker", name: "板栗蜜径旅人", desc: "走过板栗蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chestnut_honey_path);
    } },
    { id: "manuka_sill", name: "麦卢卡窗台", desc: "发现麦卢卡", check: function (s) {
      return !!(s.discovered && s.discovered.manuka);
    } },
    { id: "manuka_walker", name: "麦卢卡径旅人", desc: "走过麦卢卡短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.manuka_path);
    } },
    { id: "propolis_sill", name: "蜂胶窗台", desc: "发现蜂胶", check: function (s) {
      return !!(s.discovered && s.discovered.propolis);
    } },
    { id: "propolis_walker", name: "蜂胶径旅人", desc: "走过蜂胶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.propolis_path);
    } },
    { id: "bee_pollen_sill", name: "蜂花粉窗台", desc: "发现蜂花粉", check: function (s) {
      return !!(s.discovered && s.discovered.bee_pollen);
    } },
    { id: "bee_pollen_walker", name: "蜂花粉径旅人", desc: "走过蜂花粉短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bee_pollen_path);
    } },
    { id: "royal_jelly_sill", name: "蜂王浆窗台", desc: "发现蜂王浆", check: function (s) {
      return !!(s.discovered && s.discovered.royal_jelly);
    } },
    { id: "royal_jelly_walker", name: "蜂王浆径旅人", desc: "走过蜂王浆短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.royal_jelly_path);
    } },
    { id: "comb_honey_sill", name: "巢蜜窗台", desc: "发现巢蜜", check: function (s) {
      return !!(s.discovered && s.discovered.comb_honey);
    } },
    { id: "comb_honey_walker", name: "巢蜜径旅人", desc: "走过巢蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.comb_honey_path);
    } },
    { id: "mead_herb_sill", name: "蜜酒香草窗台", desc: "发现蜜酒香草", check: function (s) {
      return !!(s.discovered && s.discovered.mead_herb);
    } },
    { id: "mead_herb_walker", name: "蜜酒香草径旅人", desc: "走过蜜酒香草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mead_herb_path);
    } },
    { id: "linden_honey_sill", name: "椴树蜜窗台", desc: "发现椴树蜜", check: function (s) {
      return !!(s.discovered && s.discovered.linden_honey);
    } },
    { id: "linden_honey_walker", name: "椴树蜜径旅人", desc: "走过椴树蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.linden_honey_path);
    } },
    { id: "heather_honey_wild_sill", name: "石楠野蜜窗台", desc: "发现石楠野蜜", check: function (s) {
      return !!(s.discovered && s.discovered.heather_honey_wild);
    } },
    { id: "heather_honey_wild_walker", name: "石楠野蜜径旅人", desc: "走过石楠野蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.heather_honey_wild_path);
    } },
    { id: "wildflower_honey_sill", name: "野花蜜窗台", desc: "发现野花蜜", check: function (s) {
      return !!(s.discovered && s.discovered.wildflower_honey);
    } },
    { id: "wildflower_honey_walker", name: "野花蜜径旅人", desc: "走过野花蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wildflower_honey_path);
    } },
    { id: "clover_honey_sill", name: "车轴草蜜窗台", desc: "发现车轴草蜜", check: function (s) {
      return !!(s.discovered && s.discovered.clover_honey);
    } },
    { id: "clover_honey_walker", name: "车轴草蜜径旅人", desc: "走过车轴草蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.clover_honey_path);
    } },
    { id: "eucalyptus_honey_sill", name: "桉树蜜窗台", desc: "发现桉树蜜", check: function (s) {
      return !!(s.discovered && s.discovered.eucalyptus_honey);
    } },
    { id: "eucalyptus_honey_walker", name: "桉树蜜径旅人", desc: "走过桉树蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.eucalyptus_honey_path);
    } },
    { id: "path_catalog", name: "十路图鉴", desc: "切换过 10 种小路主题", check: function (s) { return Object.keys(s._themesTouched || {}).length >= 10; } },
    { id: "path_ninety", name: "九十路图鉴", desc: "切换过 90 种小路主题", check: function (s) { return Object.keys(s._themesTouched || {}).length >= 90; } },
    { id: "flavor_pin", name: "调味架钉子", desc: "钉过 1 次风味", check: function (s) { return (s.stats && s.stats.flavorPins || 0) >= 1; } },
    { id: "path_hundred", name: "百路图鉴", desc: "切换过 100 种小路主题", check: function (s) { return Object.keys(s._themesTouched || {}).length >= 100; } },
    { id: "path_eighty", name: "八十路图鉴", desc: "切换过 80 种小路主题", check: function (s) { return Object.keys(s._themesTouched || {}).length >= 80; } },
    { id: "path_sixty", name: "六十路图鉴", desc: "切换过 60 种小路主题", check: function (s) { return Object.keys(s._themesTouched || {}).length >= 60; } },
    { id: "fav_path", name: "最爱的小路", desc: "标记一条最爱小路", check: function (s) { return !!(s.favoritePathThemeId); } },
    { id: "specialist_hand", name: "特调熟手", desc: "今日小特调命中 8 次", check: function (s) { return (s.stats && s.stats.dailySpecialHits || 0) >= 8; } },
    { id: "tip_friend", name: "小费罐朋友", desc: "小费罐累计换得 3 点心情", check: function (s) { return (s.stats && s.stats.tipJarHearts || 0) >= 3; } },
  ];

  function advanceSeason(state) {
    var idx = typeof state.seasonIndex === "number" ? state.seasonIndex : SEASON_ORDER.indexOf(state.season || "dusk");
    if (idx < 0) idx = 0;
    idx = (idx + 1) % SEASON_ORDER.length;
    state.seasonIndex = idx;
    state.season = SEASON_ORDER[idx];
    state.day = (state.day || 1) + 1;
    if (!state.stats) state.stats = {};
    state.stats.seasonsSeen = Math.min(5, (state.stats.seasonsSeen || 1) + (idx === 0 ? 0 : 0));
    // count unique seasons via journal of seasons
    if (!state._seasonsTouched) state._seasonsTouched = {};
    state._seasonsTouched[state.season] = true;
    state.stats.seasonsSeen = Object.keys(state._seasonsTouched).length;
    appendJournal(state, "季节换成了" + (SEASON_LABELS[state.season] || state.season) + "。");
    return state.season;
  }

  function appendJournal(state, text) {
    if (!state.journal) state.journal = [];
    state.journal.push({
      day: state.day || 1,
      season: state.season || "dusk",
      text: String(text || ""),
      at: Date.now(),
    });
    if (state.journal.length > 80) state.journal = state.journal.slice(-80);
    return state.journal;
  }

  function evaluateAchievements(state, defs) {
    defs = defs || DEFAULT_ACHIEVEMENTS;
    if (!state.achievements) state.achievements = {};
    var newly = [];
    for (var i = 0; i < defs.length; i++) {
      var a = defs[i];
      if (state.achievements[a.id]) continue;
      var ok = false;
      try {
        ok = !!a.check(state);
      } catch (e) {
        ok = false;
      }
      if (ok) {
        state.achievements[a.id] = { at: Date.now(), name: a.name };
        newly.push(a);
        appendJournal(state, "解锁成就：" + a.name);
      }
    }
    return newly;
  }

  function bagCount(state) {
    return Object.values(state.bag || {}).reduce(function (a, b) {
      return a + b;
    }, 0);
  }

  function hasItem(state, id, n) {
    n = n == null ? 1 : n;
    return (state.bag[id] || 0) >= n;
  }

  function addItem(state, id, n) {
    n = n == null ? 1 : n;
    if (!state.bag) state.bag = {};
    if (!state.discovered) state.discovered = {};
    state.bag[id] = (state.bag[id] || 0) + n;
    state.discovered[id] = true;
    if (!state.stats) state.stats = {};
    state.stats.itemsPicked = (state.stats.itemsPicked || 0) + n;
    return state;
  }

  function takeItem(state, id, n) {
    n = n == null ? 1 : n;
    if (!hasItem(state, id, n)) return false;
    state.bag[id] -= n;
    if (state.bag[id] <= 0) delete state.bag[id];
    return true;
  }

  function growthStage(pot, plants) {
    plants = plants || DEFAULT_PLANTS;
    if (!pot || !pot.plantId) return 0;
    var def = plants[pot.plantId];
    if (!def) return 0;
    if (pot.growth >= def.days) return 2;
    if (pot.growth >= def.days * 0.45) return 1;
    return 0;
  }

  function isReady(pot, plants) {
    plants = plants || DEFAULT_PLANTS;
    if (!pot || !pot.plantId) return false;
    var def = plants[pot.plantId];
    return !!(def && pot.growth >= def.days);
  }

  function plantSeed(state, potIndex, itemId, catalog) {
    catalog = catalog || { items: DEFAULT_ITEMS, plants: DEFAULT_PLANTS };
    var pot = state.pots[potIndex];
    if (!pot) return { ok: false, reason: "bad_pot" };
    if (pot.plantId) return { ok: false, reason: "occupied" };
    var it = catalog.items[itemId];
    if (!it || !it.seed) return { ok: false, reason: "not_seed" };
    if (!catalog.plants[it.seed]) return { ok: false, reason: "unknown_plant" };
    if (!takeItem(state, itemId, 1)) return { ok: false, reason: "missing_item" };
    pot.plantId = it.seed;
    pot.water = 40;
    pot.sun = 40;
    pot.mood = 50;
    pot.growth = 0;
    pot.tendedAt = Date.now();
    return { ok: true, plantId: it.seed };
  }


  function renamePlant(state, potIndex, name) {
    var pot = state.pots && state.pots[potIndex];
    if (!pot || !pot.plantId) return { ok: false, reason: "empty" };
    name = String(name || "").trim().slice(0, 12);
    if (!name) return { ok: false, reason: "empty_name" };
    pot.nickname = name;
    appendJournal(state, "给植物取名：「" + name + "」。");
    return { ok: true, nickname: name };
  }

  /** Soft note on a pot — pure still-life journaling, no combat */
  function setPotNote(state, potIndex, note) {
    var pot = state.pots && state.pots[potIndex];
    if (!pot || !pot.plantId) return { ok: false, reason: "empty" };
    note = String(note || "").trim().slice(0, 40);
    if (!note) return { ok: false, reason: "empty_note" };
    pot.note = note;
    if (!state.stats) state.stats = {};
    state.stats.potNotes = (state.stats.potNotes || 0) + 1;
    appendJournal(state, "在花盆边写下一句：「" + note + "」。");
    return { ok: true, note: note };
  }

  /** Pathside bench rest: soft recovery, no combat, tiny heart chance via streak */
  function sitBench(state) {
    state = state || {};
    if (!state.stats) state.stats = {};
    state.stats.benchSits = (state.stats.benchSits || 0) + 1;
    var heartsGain = 0;
    if ((state.stats.benchSits % 3) === 0) {
      heartsGain = 1;
      state.hearts = (state.hearts || 0) + 1;
    }
    // walking/sitting also drips a bit into the watering can
    chargeWateringCan(state, 1);
    appendJournal(state, "在小路边的长椅上歇了歇脚。");
    return { ok: true, sits: state.stats.benchSits, hearts: heartsGain };
  }

  function getWateringCan(state) {
    if (!state.wateringCan || typeof state.wateringCan.charge !== "number") {
      state.wateringCan = { charge: 2, max: ECONOMY.wateringCanMax || 5 };
    }
    if (state.wateringCan.max == null) state.wateringCan.max = ECONOMY.wateringCanMax || 5;
    return state.wateringCan;
  }

  /** Soft charge from path walks / bench — no combat, no drain death */

  function upgradeWateringCan(state, cost) {
    cost = cost == null ? 20 : cost;
    var can = getWateringCan(state);
    if ((can.max || 5) >= 8) return { ok: false, reason: "max" };
    if ((state.coins || 0) < cost) return { ok: false, reason: "coins" };
    state.coins -= cost;
    can.max = (can.max || 5) + 1;
    can.charge = Math.min(can.max, (can.charge || 0) + 1);
    appendJournal(state, "水壶变大了一点，能多装一格水。");
    return { ok: true, max: can.max, cost: cost };
  }

  function chargeWateringCan(state, n) {
    n = n == null ? 1 : n;
    var can = getWateringCan(state);
    var before = can.charge;
    can.charge = Math.min(can.max, can.charge + n);
    return { ok: true, charge: can.charge, gained: can.charge - before, full: can.charge >= can.max };
  }

  /**
   * Soft first-walk-of-day bonus: first new path after daily key
   * grants tiny hearts/coins once — pure cozy, no combat.
   */
  function claimFirstWalkBonus(state, now) {
    now = now || Date.now();
    var key = dayKey(now);
    if (!state._firstWalk) state._firstWalk = {};
    if (state._firstWalk[key]) return { ok: false, reason: "claimed" };
    state._firstWalk[key] = true;
    state.coins = (state.coins || 0) + 2;
    state.hearts = (state.hearts || 0) + 1;
    chargeWateringCan(state, 1);
    if (!state.stats) state.stats = {};
    state.stats.firstWalks = (state.stats.firstWalks || 0) + 1;
    appendJournal(state, "今天第一次出门，晚风先送了一点小心意。");
    return { ok: true, coins: 2, hearts: 1 };
  }

  /** Soft path milestones — stickers at 5/15/30/50 walks, no combat */
  var PATH_MILESTONES = [
    { n: 5, id: "m5", name: "五段晚风", coins: 3, hearts: 1 },
    { n: 15, id: "m15", name: "十五段小路", coins: 5, hearts: 1 },
    { n: 30, id: "m30", name: "三十次出门", coins: 8, hearts: 2 },
    { n: 50, id: "m50", name: "五十段温柔", coins: 12, hearts: 2 },
  ];

  function checkPathMilestones(state) {
    if (!state.pathStickers) state.pathStickers = {};
    var walked = state.pathsWalked || 0;
    var newly = [];
    for (var i = 0; i < PATH_MILESTONES.length; i++) {
      var m = PATH_MILESTONES[i];
      if (walked >= m.n && !state.pathStickers[m.id]) {
        state.pathStickers[m.id] = { at: Date.now(), name: m.name };
        state.coins = (state.coins || 0) + m.coins;
        state.hearts = (state.hearts || 0) + m.hearts;
        appendJournal(state, "贴上小路贴纸：「" + m.name + "」。");
        newly.push(m);
      }
    }
    return { ok: true, newly: newly };
  }

  /**
   * Use watering can on a pot: spends 1 charge, extra water soft bonus.
   * Falls back to normal water if empty (still ok, just no bonus).
   */
  function useWateringCan(state, potIndex, plants) {
    plants = plants || DEFAULT_PLANTS;
    var pot = state.pots && state.pots[potIndex];
    if (!pot || !pot.plantId) return { ok: false, reason: "empty" };
    var can = getWateringCan(state);
    var bonus = 0;
    var used = false;
    if (can.charge >= 1) {
      can.charge -= 1;
      bonus = ECONOMY.wateringCanBonus || 12;
      used = true;
    }
    // apply base water via tend path fields
    pot.water = Math.min(100, pot.water + 28 + bonus);
    var season = state.season || "dusk";
    var seasonNote = null;
    if (season === "autumn") {
      pot.water = Math.min(100, pot.water + 6);
      pot.mood = Math.min(100, pot.mood + 4);
      seasonNote = "秋水温柔";
    }
    var care = (pot.water + pot.sun + pot.mood) / 300;
    pot.growth += 0.35 + care * 0.55 + (used ? 0.05 : 0);
    pot.water = Math.max(0, pot.water - 6);
    pot.sun = Math.max(0, pot.sun - 5);
    pot.mood = Math.max(0, pot.mood - 4);
    pot.tendedAt = Date.now();
    if (!state.stats) state.stats = {};
    state.stats.canWaters = (state.stats.canWaters || 0) + (used ? 1 : 0);
    state._tendsToday = (state._tendsToday || 0) + 1;
    return {
      ok: true,
      usedCan: used,
      bonus: bonus,
      charge: can.charge,
      growth: pot.growth,
      seasonNote: seasonNote,
    };
  }

  /** Soft hint: how many secret recipe slots match current craft */
  function recipeMatchHint(craft, recipes) {
    recipes = recipes || [];
    craft = craft || {};
    if (!craft.cup || !craft.base || !craft.flavor) {
      return { matches: 0, close: [], perfect: null };
    }
    var close = [];
    var perfect = null;
    for (var i = 0; i < recipes.length; i++) {
      var r = recipes[i];
      if (!r) continue;
      var score = 0;
      if (r.cup === craft.cup) score++;
      if (r.base === craft.base) score++;
      if (r.flavor === craft.flavor) score++;
      if ((r.topping || "none") === (craft.topping || "none")) score++;
      if (score === 4) {
        perfect = r;
      } else if (score >= 3) {
        close.push({ name: r.name, score: score });
      }
    }
    return { matches: close.length + (perfect ? 1 : 0), close: close, perfect: perfect };
  }

  function tend(state, potIndex, act, plants) {
    plants = plants || DEFAULT_PLANTS;
    var pot = state.pots[potIndex];
    if (!pot || !pot.plantId) return { ok: false, reason: "empty" };

    var season = state.season || "dusk";
    var seasonNote = null;

    if (act === "water") {
      pot.water = Math.min(100, pot.water + 28);
      // 秋晚多一点湿润关怀
      if (season === "autumn") {
        pot.water = Math.min(100, pot.water + 6);
        pot.mood = Math.min(100, pot.mood + 4);
        seasonNote = "秋水温柔";
      }
    } else if (act === "sun") {
      pot.sun = Math.min(100, pot.sun + 28);
      // 盛夏日照更足
      if (season === "summer") {
        pot.sun = Math.min(100, pot.sun + 8);
        pot.growth += 0.08;
        seasonNote = "夏日暖光";
      }
    } else if (act === "talk") {
      pot.mood = Math.min(100, pot.mood + 22);
      // 春日更爱聊天
      if (season === "spring") {
        pot.mood = Math.min(100, pot.mood + 8);
        pot.growth += 0.05;
        seasonNote = "春语轻声";
      }
    } else if (act === "rest") {
      // Soft rest: restore mood/water slightly, almost no growth push, no death
      pot.mood = Math.min(100, pot.mood + 18);
      pot.water = Math.min(100, pot.water + 8);
      pot.sun = Math.max(0, pot.sun - 3);
      pot.growth += 0.08;
      // 冬夜歇息格外舒服
      if (season === "winter") {
        pot.mood = Math.min(100, pot.mood + 10);
        pot.water = Math.min(100, pot.water + 4);
        seasonNote = "冬夜安歇";
      }
      pot.tendedAt = Date.now();
      if (!state.stats) state.stats = {};
      state.stats.rests = (state.stats.rests || 0) + 1;
      return { ok: true, rested: true, growth: pot.growth, mood: pot.mood, seasonNote: seasonNote };
    } else if (act === "harvest") {
      if (!isReady(pot, plants)) return { ok: false, reason: "not_ready" };
      var def = plants[pot.plantId];
      var n = 1 + (pot.mood > 70 ? 1 : 0);
      // Soft pot memory: same pot harvested many times feels "known"
      pot.harvestCount = (pot.harvestCount || 0) + 1;
      var memoryBonus = pot.harvestCount >= 3;
      if (memoryBonus) n += 1;
      addItem(state, def.harvest, n);
      state.hearts = (state.hearts || 0) + 1;
      state.coins = (state.coins || 0) + ECONOMY.harvestCoins + (memoryBonus ? 1 : 0);
      var gift = null;
      if (pot.mood > 85) {
        var extras = ["petal", "clover", "maple", "stone", "moss", "driftwood", "seashell"];
        gift = extras[Math.floor((pot.mood + (pot.water || 0)) % extras.length)];
        addItem(state, gift, 1);
      }
      if (!state.stats) state.stats = {};
      state.stats.plantsHarvested = (state.stats.plantsHarvested || 0) + 1;
      if (memoryBonus) state.stats.memoryHarvests = (state.stats.memoryHarvests || 0) + 1;
      pot.growth = def.days * 0.4;
      pot.water = 30;
      pot.sun = 30;
      // Known pots start a bit happier after harvest cycle
      pot.mood = memoryBonus ? 48 : 40;
      pot.tendedAt = Date.now();
      return {
        ok: true,
        harvested: def.harvest,
        count: n,
        gift: gift,
        harvestCount: pot.harvestCount,
        memoryBonus: memoryBonus,
      };
    } else {
      return { ok: false, reason: "bad_act" };
    }

    var care = (pot.water + pot.sun + pot.mood) / 300;
    pot.growth += 0.35 + care * 0.55;
    // Soft morning first-tend of the day: soil feels cooler, mood gentler
    if (!state.stats) state.stats = {};
    var dayK = dayKey(Date.now());
    if (state._tendDayKey !== dayK) {
      state._tendDayKey = dayK;
      state._tendsToday = 0;
    }
    state._tendsToday = (state._tendsToday || 0) + 1;
    if (state._tendsToday === 1) {
      pot.mood = Math.min(100, pot.mood + 4);
      pot.water = Math.min(100, pot.water + 3);
      if (!seasonNote) seasonNote = "晨间照料";
      state.stats.morningTends = (state.stats.morningTends || 0) + 1;
    }
    // 黄昏轻柔成长：几乎不催，只多一点心情
    if (season === "dusk" && !seasonNote) {
      pot.mood = Math.min(100, pot.mood + 3);
      seasonNote = "暮色静养";
    }
    // Soft companion sill: two+ planted pots feel a little less lonely
    var planted = 0;
    var kinds = {};
    for (var pi = 0; pi < (state.pots || []).length; pi++) {
      if (state.pots[pi] && state.pots[pi].plantId) {
        planted += 1;
        kinds[state.pots[pi].plantId] = true;
      }
    }
    var companion = false;
    if (planted >= 2) {
      pot.mood = Math.min(100, pot.mood + 3);
      companion = true;
      if (!seasonNote) seasonNote = "邻盆作伴";
      if (!state.stats) state.stats = {};
      state.stats.companionTends = (state.stats.companionTends || 0) + 1;
    }
    // Soft variety sill: 3+ different plant kinds — soft mood for diversity
    var variety = false;
    var kindCount = Object.keys(kinds).length;
    if (kindCount >= 3) {
      pot.mood = Math.min(100, pot.mood + 2);
      variety = true;
      if (!seasonNote || seasonNote === "邻盆作伴") seasonNote = "多样窗台";
      if (!state.stats) state.stats = {};
      state.stats.varietyTends = (state.stats.varietyTends || 0) + 1;
    }
    // Soft favorite plant: tending marked plant feels a little warmer
    if (state.favoritePlantId && pot.plantId === state.favoritePlantId) {
      pot.mood = Math.min(100, pot.mood + 2);
      if (!seasonNote) seasonNote = "最想照料";
    }
    pot.water = Math.max(0, pot.water - 6);
    pot.sun = Math.max(0, pot.sun - 5);
    pot.mood = Math.max(0, pot.mood - 4);
    pot.tendedAt = Date.now();
    return { ok: true, growth: pot.growth, seasonNote: seasonNote, companion: companion, variety: variety };
  }

  function settleOfflineGrowth(state, now, plants) {
    plants = plants || DEFAULT_PLANTS;
    now = now || Date.now();
    var dewCount = 0;
    (state.pots || []).forEach(function (pot) {
      if (!pot.plantId || !pot.tendedAt) return;
      var hours = Math.min(12, (now - pot.tendedAt) / 3600000);
      if (hours < 0.15) return;
      var care = (pot.water + pot.sun + pot.mood) / 300;
      pot.growth += hours * (0.15 + care * 0.2);
      pot.water = Math.max(0, pot.water - hours * 4);
      pot.sun = Math.max(0, pot.sun - hours * 3);
      pot.mood = Math.max(10, pot.mood - hours * 2);
      // Soft morning dew: after a long rest, leaves sip a little water/mood back
      if (hours >= 6) {
        pot.water = Math.min(100, pot.water + 8);
        pot.mood = Math.min(100, pot.mood + 6);
        dewCount += 1;
      }
      pot.tendedAt = now;
    });
    if (dewCount > 0) {
      if (!state.stats) state.stats = {};
      state.stats.morningDews = (state.stats.morningDews || 0) + dewCount;
    }
    return { state: state, dewCount: dewCount };
  }

  function scoreDrink(customer, craft, catalogs) {
    catalogs = catalogs || {};
    var cups = catalogs.cups || DEFAULT_CUPS;
    var bases = catalogs.bases || DEFAULT_BASES;
    var flavors = catalogs.flavors || DEFAULT_FLAVORS;
    var toppings = catalogs.toppings || DEFAULT_TOPPINGS;

    var cupDef = cups.find(function (x) {
      return x.id === craft.cup;
    });
    var baseDef = bases.find(function (x) {
      return x.id === craft.base;
    });
    var flavorDef = flavors.find(function (x) {
      return x.id === craft.flavor;
    });
    var topDef = toppings.find(function (x) {
      return x.id === craft.topping;
    });

    if (!cupDef || !baseDef || !flavorDef) {
      return { score: 0, notes: ["incomplete"], coins: 0, hearts: 0 };
    }

    var score = 1;
    var notes = [];

    if (customer.flavors && customer.flavors.indexOf(flavorDef.id) >= 0) {
      score += 2;
      notes.push("风味很合心意");
    } else if (
      flavorDef.tags &&
      flavorDef.tags.some(function (t) {
        return customer.tags && customer.tags.indexOf(t) >= 0;
      })
    ) {
      score += 1;
      notes.push("味道方向对了");
    }
    if (customer.favoriteFlavor && flavorDef.id === customer.favoriteFlavor) {
      score += 0.5;
      notes.push("记得你上次的味道");
    }

    if (baseDef.vibe && customer.tags && customer.tags.indexOf(baseDef.vibe) >= 0) {
      score += 1;
      notes.push("基底很搭");
    }
    if (cupDef.vibe && customer.tags && customer.tags.indexOf(cupDef.vibe) >= 0) {
      score += 1;
      notes.push("杯子选得好");
    }
    // soft seasonal affinity (optional catalogs.season)
    var season = catalogs.season || customer.season;
    if (season === "spring" && (flavorDef.id === "jasmine" || flavorDef.id === "lavender_bud" || flavorDef.id === "lilac" || flavorDef.id === "chamomile" || flavorDef.id === "honeysuckle" || flavorDef.id === "bergamot" || flavorDef.id === "violet" || flavorDef.id === "calendula" || flavorDef.id === "rose_petal" || flavorDef.id === "elderflower" || flavorDef.id === "loquat" || flavorDef.id === "vanilla" || flavorDef.id === "saffron" || flavorDef.id === "hyssop" || baseDef.id === "floral_tea")) {
      score += 0.5;
      notes.push("春日花香");
    }
    if (season === "summer" && (flavorDef.id === "mint" || flavorDef.id === "rosemary" || flavorDef.id === "bluebell" || flavorDef.id === "matcha" || flavorDef.id === "perilla" || flavorDef.id === "thyme" || flavorDef.id === "dill" || flavorDef.id === "basil" || flavorDef.id === "lemongrass" || flavorDef.id === "coriander" || flavorDef.id === "lemon_balm" || flavorDef.id === "marjoram" || flavorDef.id === "hibiscus" || flavorDef.id === "elderflower" || flavorDef.id === "sea_lavender" || flavorDef.id === "mulberry" || flavorDef.id === "strawberry" || flavorDef.id === "blueberry" || flavorDef.id === "pomegranate" || flavorDef.id === "yangmei" || flavorDef.id === "litchi" || flavorDef.id === "olive" || flavorDef.id === "mango" || flavorDef.id === "pineapple" || flavorDef.id === "coconut" || flavorDef.id === "starfruit" || flavorDef.id === "passion_fruit" || flavorDef.id === "kiwi" || flavorDef.id === "dragonfruit" || flavorDef.id === "guava" || flavorDef.id === "cherry" || flavorDef.id === "apricot" || flavorDef.id === "grapefruit" || flavorDef.id === "tangerine" || flavorDef.id === "wax_apple" || flavorDef.id === "sugarcane" || flavorDef.id === "lemon" || flavorDef.id === "lime" || flavorDef.id === "cranberry" || flavorDef.id === "elderberry" || flavorDef.id === "honeydew" || flavorDef.id === "watermelon" || flavorDef.id === "cantaloupe" || flavorDef.id === "papaya" || flavorDef.id === "rambutan" || flavorDef.id === "jackfruit" || flavorDef.id === "oregano" || flavorDef.id === "chive" || flavorDef.id === "parsley" || flavorDef.id === "avocado" || flavorDef.id === "chervil" || flavorDef.id === "sorrel" || flavorDef.id === "verbena" || flavorDef.id === "savory" || flavorDef.id === "celery_seed" || flavorDef.id === "galangal" || flavorDef.id === "kaffir_lime" || flavorDef.id === "pandan" || flavorDef.id === "juniper" || flavorDef.id === "sumac" || flavorDef.id === "nigella" || flavorDef.id === "mustard_seed" || flavorDef.id === "wasabi" || flavorDef.id === "dandelion" || flavorDef.id === "nettle" || flavorDef.id === "borage" || flavorDef.id === "hops" || flavorDef.id === "heather" || flavorDef.id === "arnica" || flavorDef.id === "echinacea" || flavorDef.id === "feverfew" || flavorDef.id === "lemon_verbena" || flavorDef.id === "mullein" || flavorDef.id === "plantain_leaf" || flavorDef.id === "bee_balm" || flavorDef.id === "marshmallow" || flavorDef.id === "goldenrod" || flavorDef.id === "red_clover" || flavorDef.id === "white_clover" || flavorDef.id === "catnip" || flavorDef.id === "tansy" || flavorDef.id === "agrimony" || flavorDef.id === "rue" || flavorDef.id === "costmary" || flavorDef.id === "elecampane" || flavorDef.id === "meadow_clary" || flavorDef.id === "soapwort" || flavorDef.id === "milfoil" || flavorDef.id === "lady_mantle" || flavorDef.id === "speedwell" || flavorDef.id === "stitchwort" || flavorDef.id === "campion" || flavorDef.id === "silverweed" || flavorDef.id === "loosestrife" || flavorDef.id === "willowherb" || flavorDef.id === "bedstraw" || flavorDef.id === "cleavers" || flavorDef.id === "bugle" || flavorDef.id === "primrose" || flavorDef.id === "cowslip" || flavorDef.id === "oxeye" || flavorDef.id === "knapweed" || flavorDef.id === "scabious" || flavorDef.id === "nettle_seed" || flavorDef.id === "rowan" || flavorDef.id === "crabapple" || flavorDef.id === "serviceberry" || flavorDef.id === "elderflower_fresh" || flavorDef.id === "meadowsweet_fresh" || flavorDef.id === "wood_sorrel" || flavorDef.id === "wild_garlic" || flavorDef.id === "ramsons" || flavorDef.id === "jack_by_hedge" || flavorDef.id === "hedge_mustard" || flavorDef.id === "watercress" || flavorDef.id === "brooklime" || flavorDef.id === "cloudberry" || flavorDef.id === "lingonberry" || flavorDef.id === "bilberry" || flavorDef.id === "gooseberry" || flavorDef.id === "currant_red" || flavorDef.id === "currant_black" || flavorDef.id === "whitecurrant" || flavorDef.id === "sea_buckthorn" || flavorDef.id === "damson" || flavorDef.id === "greengage" || flavorDef.id === "mirabelle" || flavorDef.id === "saskatoon" || flavorDef.id === "chokeberry" || flavorDef.id === "yarrow_white" || flavorDef.id === "achillea_pink" || flavorDef.id === "cornflower" || flavorDef.id === "poppy_seed" || flavorDef.id === "flax_flower" || flavorDef.id === "chia_seed" || flavorDef.id === "sunflower_seed" || flavorDef.id === "fennel_pollen" || flavorDef.id === "fennel_frond" || flavorDef.id === "dill_pollen" || flavorDef.id === "celery_leaf" || flavorDef.id === "rooibos" || flavorDef.id === "honeybush" || flavorDef.id === "yerba_mate" || flavorDef.id === "guayusa" || flavorDef.id === "gardenia" || flavorDef.id === "magnolia" || flavorDef.id === "frangipani" || flavorDef.id === "plumeria" || flavorDef.id === "stephanotis" || flavorDef.id === "garden_phlox" || flavorDef.id === "osmanthus_fresh" || flavorDef.id === "galangal_fresh" || flavorDef.id === "ginger_flower" || flavorDef.id === "turmeric_fresh" || flavorDef.id === "cubeb" || flavorDef.id === "makrut_leaf" || flavorDef.id === "curry_leaf" || flavorDef.id === "holy_basil" || flavorDef.id === "thai_basil" || flavorDef.id === "lemon_basil" || flavorDef.id === "rambutan_fresh" || flavorDef.id === "lychee_fresh" || flavorDef.id === "mangosteen" || flavorDef.id === "durian_flower" || flavorDef.id === "tamarind" || flavorDef.id === "calamansi" || flavorDef.id === "fig_fresh" || flavorDef.id === "pomegranate_seed" || flavorDef.id === "cactus_pear" || flavorDef.id === "prickly_pear" || flavorDef.id === "sapodilla" || flavorDef.id === "soursop" || flavorDef.id === "cherimoya" || flavorDef.id === "feijoa" || flavorDef.id === "loquat_fresh" || flavorDef.id === "jujube_fresh" || flavorDef.id === "mulberry_white" || flavorDef.id === "mulberry_black" || flavorDef.id === "elderberry_fresh" || flavorDef.id === "bergamot_fresh" || flavorDef.id === "sudachi" || flavorDef.id === "kabosu" || flavorDef.id === "amanatsu" || flavorDef.id === "shiso_green" || flavorDef.id === "shiso_red" || flavorDef.id === "mitsuba" || flavorDef.id === "myoga" || flavorDef.id === "wasabi_leaf" || flavorDef.id === "sansho" || flavorDef.id === "kinome" || flavorDef.id === "gentian" || flavorDef.id === "arnica_montana" || flavorDef.id === "alpine_strawberry" || flavorDef.id === "bilberry_leaf" || flavorDef.id === "spruce_tip" || flavorDef.id === "olive_leaf" || flavorDef.id === "caper" || flavorDef.id === "zaatar" || flavorDef.id === "sumac_berry" || flavorDef.id === "orange_blossom" || flavorDef.id === "lavender_honey" || flavorDef.id === "thyme_honey" || flavorDef.id === "acacia_honey" || flavorDef.id === "manuka" || flavorDef.id === "bee_pollen" || flavorDef.id === "comb_honey" || flavorDef.id === "linden_honey" || flavorDef.id === "heather_honey_wild" || flavorDef.id === "wildflower_honey" || flavorDef.id === "clover_honey" || flavorDef.id === "eucalyptus_honey" || baseDef.id === "soda" || baseDef.id === "berry_soda")) {
      score += 0.5;
      notes.push("夏日清爽");
    }
    if (season === "autumn" && (flavorDef.id === "honey" || flavorDef.id === "peach" || flavorDef.id === "tea_leaf" || flavorDef.id === "fennel" || flavorDef.id === "cardamom" || flavorDef.id === "ginger" || flavorDef.id === "calendula" || flavorDef.id === "chrysanthemum" || flavorDef.id === "hibiscus" || flavorDef.id === "plum" || flavorDef.id === "grape" || flavorDef.id === "mulberry" || flavorDef.id === "persimmon" || flavorDef.id === "fig" || flavorDef.id === "longan" || flavorDef.id === "hawthorn" || flavorDef.id === "pear" || flavorDef.id === "apricot" || flavorDef.id === "maple_syrup" || flavorDef.id === "sesame" || flavorDef.id === "chestnut" || flavorDef.id === "cinnamon" || flavorDef.id === "clove" || flavorDef.id === "pistachio")) {
      score += 0.5;
      notes.push("秋日温甜");
    }
    if (season === "winter" && (baseDef.id === "tea" || baseDef.id === "honey_water" || flavorDef.id === "tea_leaf" || flavorDef.id === "yuzu" || flavorDef.id === "ginger" || flavorDef.id === "honey" || flavorDef.id === "pine_needle" || flavorDef.id === "chrysanthemum" || flavorDef.id === "kumquat" || flavorDef.id === "jujube" || flavorDef.id === "cocoa" || flavorDef.id === "vanilla" || flavorDef.id === "almond" || flavorDef.id === "hazelnut" || flavorDef.id === "maple_syrup" || flavorDef.id === "sesame" || flavorDef.id === "walnut" || flavorDef.id === "saffron" || flavorDef.id === "pistachio" || flavorDef.id === "chestnut" || flavorDef.id === "cinnamon" || flavorDef.id === "clove" || flavorDef.id === "star_anise" || flavorDef.id === "nutmeg" || flavorDef.id === "goji" || flavorDef.id === "bay_leaf" || flavorDef.id === "tarragon" || flavorDef.id === "date_fruit" || flavorDef.id === "hyssop" || flavorDef.id === "lovage" || flavorDef.id === "anise_seed" || flavorDef.id === "turmeric" || flavorDef.id === "allspice" || flavorDef.id === "mace" || flavorDef.id === "caraway" || flavorDef.id === "cumin" || flavorDef.id === "fenugreek" || flavorDef.id === "ajwain" || flavorDef.id === "myrtle" || flavorDef.id === "chicory" || flavorDef.id === "nettle" || flavorDef.id === "yarrow" || flavorDef.id === "woodruff" || flavorDef.id === "valerian" || flavorDef.id === "meadowsweet" || flavorDef.id === "angelica" || flavorDef.id === "comfrey" || flavorDef.id === "selfheal" || flavorDef.id === "skullcap" || flavorDef.id === "linden" || flavorDef.id === "horehound" || flavorDef.id === "motherwort" || flavorDef.id === "betony" || flavorDef.id === "solomon_seal" || flavorDef.id === "wormwood" || flavorDef.id === "valerian_root" || flavorDef.id === "avens" || flavorDef.id === "tormentil" || flavorDef.id === "figwort" || flavorDef.id === "ground_ivy" || flavorDef.id === "self_heal_spike" || flavorDef.id === "teasel" || flavorDef.id === "burdock" || flavorDef.id === "hawthorn_berry" || flavorDef.id === "rosehip" || flavorDef.id === "sloe" || flavorDef.id === "wintercress" || flavorDef.id === "medlar" || flavorDef.id === "quince" || flavorDef.id === "aronia" || flavorDef.id === "flax_seed" || flavorDef.id === "hemp_seed" || flavorDef.id === "pumpkin_seed" || flavorDef.id === "sesame_black" || flavorDef.id === "sesame_white" || flavorDef.id === "lapacho" || flavorDef.id === "sassafras" || flavorDef.id === "birch_bark" || flavorDef.id === "pine_resin" || flavorDef.id === "tuberose" || flavorDef.id === "cardamom_green" || flavorDef.id === "cardamom_black" || flavorDef.id === "long_pepper" || flavorDef.id === "grains_of_paradise" || flavorDef.id === "cinnamon_leaf" || flavorDef.id === "clove_bud" || flavorDef.id === "allspice_leaf" || flavorDef.id === "reindeer_moss" || flavorDef.id === "iceland_moss" || flavorDef.id === "oak_moss" || flavorDef.id === "usnea" || flavorDef.id === "chaga" || flavorDef.id === "reishi" || flavorDef.id === "lion_mane" || flavorDef.id === "maitake" || flavorDef.id === "jackfruit_seed" || flavorDef.id === "rowan_jelly" || flavorDef.id === "quince_paste" || flavorDef.id === "yuzu_fresh" || flavorDef.id === "ponkan" || flavorDef.id === "dekopon" || flavorDef.id === "hassaku" || flavorDef.id === "yuzu_kosho" || flavorDef.id === "edelweiss" || flavorDef.id === "juniper_berry" || flavorDef.id === "fir_needle" || flavorDef.id === "myrtle_berry" || flavorDef.id === "mastic" || flavorDef.id === "saffron_crocus" || flavorDef.id === "buckwheat_honey" || flavorDef.id === "chestnut_honey" || flavorDef.id === "propolis" || flavorDef.id === "royal_jelly" || flavorDef.id === "mead_herb")) {
      score += 0.5;
      notes.push("冬日暖茶");
    }
    // soft dessert-corner: warm mug / honey base + nut/cocoa/vanilla
    if (
      (cupDef && (cupDef.id === "mug" || cupDef.id === "warm" || cupDef.vibe === "温柔" || cupDef.vibe === "温暖")) ||
      (baseDef && (baseDef.id === "honey_water" || baseDef.id === "tea"))
    ) {
      if (flavorDef.id === "cocoa" || flavorDef.id === "vanilla" || flavorDef.id === "almond" || flavorDef.id === "hazelnut" || flavorDef.id === "maple_syrup" || flavorDef.id === "sesame" || flavorDef.id === "walnut" || flavorDef.id === "saffron" || flavorDef.id === "pistachio" || flavorDef.id === "chestnut" || flavorDef.id === "cinnamon" || flavorDef.id === "clove" || flavorDef.id === "star_anise" || flavorDef.id === "nutmeg" || flavorDef.id === "date_fruit" || flavorDef.id === "goji" || flavorDef.id === "pandan" || flavorDef.id === "allspice" || flavorDef.id === "mace") {
        score += 0.25;
        notes.push("甜点一角");
      }
    }
    // soft forage brew: wild herb flavors feel field-fresh
    var FORAGE_FLAVORS = {
      chicory: true,
      dandelion: true,
      nettle: true,
      yarrow: true,
      sorrel: true,
      chervil: true,
      verbena: true,
      myrtle: true,
      meadowsweet: true,
      woodruff: true,
      borage: true,
      valerian: true,
      hops: true,
      heather: true,
      angelica: true,
      arnica: true,
      echinacea: true,
      comfrey: true,
      feverfew: true,
      lemon_verbena: true,
      mullein: true,
      plantain_leaf: true,
      selfheal: true,
      skullcap: true,
      bee_balm: true,
      marshmallow: true,
      linden: true,
      goldenrod: true,
      red_clover: true,
      white_clover: true,
      catnip: true,
      horehound: true,
      motherwort: true,
      tansy: true,
      agrimony: true,
      betony: true,
      solomon_seal: true,
      rue: true,
      wormwood: true,
      costmary: true,
      elecampane: true,
      valerian_root: true,
      meadow_clary: true,
      soapwort: true,
      milfoil: true,
      lady_mantle: true,
      speedwell: true,
      stitchwort: true,
      campion: true,
      avens: true,
      tormentil: true,
      silverweed: true,
      figwort: true,
      loosestrife: true,
      willowherb: true,
      bedstraw: true,
      cleavers: true,
      ground_ivy: true,
      self_heal_spike: true,
      bugle: true,
      primrose: true,
      cowslip: true,
      oxeye: true,
      knapweed: true,
      scabious: true,
      teasel: true,
      burdock: true,
      nettle_seed: true,
      hawthorn_berry: true,
      rosehip: true,
      sloe: true,
      rowan: true,
      crabapple: true,
      serviceberry: true,
      elderflower_fresh: true,
      meadowsweet_fresh: true,
      wood_sorrel: true,
      wild_garlic: true,
      ramsons: true,
      jack_by_hedge: true,
      hedge_mustard: true,
      wintercress: true,
      watercress: true,
      brooklime: true,
      cloudberry: true,
      lingonberry: true,
      bilberry: true,
      gooseberry: true,
      currant_red: true,
      currant_black: true,
      whitecurrant: true,
      sea_buckthorn: true,
      medlar: true,
      quince: true,
      damson: true,
      greengage: true,
      mirabelle: true,
      saskatoon: true,
      chokeberry: true,
      aronia: true,
      yarrow_white: true,
      achillea_pink: true,
      cornflower: true,
      poppy_seed: true,
      flax_flower: true,
      flax_seed: true,
      hemp_seed: true,
      chia_seed: true,
      pumpkin_seed: true,
      sunflower_seed: true,
      sesame_black: true,
      sesame_white: true,
      fennel_pollen: true,
      fennel_frond: true,
      dill_pollen: true,
      celery_leaf: true,
      rooibos: true,
      honeybush: true,
      yerba_mate: true,
      guayusa: true,
      lapacho: true,
      sassafras: true,
      birch_bark: true,
      pine_resin: true,
      gardenia: true,
      magnolia: true,
      frangipani: true,
      plumeria: true,
      tuberose: true,
      stephanotis: true,
      garden_phlox: true,
      osmanthus_fresh: true,
      galangal_fresh: true,
      ginger_flower: true,
      turmeric_fresh: true,
      cardamom_green: true,
      cardamom_black: true,
      long_pepper: true,
      grains_of_paradise: true,
      cubeb: true,
      makrut_leaf: true,
      curry_leaf: true,
      holy_basil: true,
      thai_basil: true,
      lemon_basil: true,
      cinnamon_leaf: true,
      clove_bud: true,
      allspice_leaf: true,
      reindeer_moss: true,
      iceland_moss: true,
      oak_moss: true,
      usnea: true,
      chaga: true,
      reishi: true,
      lion_mane: true,
      maitake: true,
      rambutan_fresh: true,
      lychee_fresh: true,
      mangosteen: true,
      durian_flower: true,
      jackfruit_seed: true,
      tamarind: true,
      calamansi: true,
      fig_fresh: true,
      pomegranate_seed: true,
      cactus_pear: true,
      prickly_pear: true,
      sapodilla: true,
      soursop: true,
      cherimoya: true,
      feijoa: true,
      loquat_fresh: true,
      jujube_fresh: true,
      mulberry_white: true,
      mulberry_black: true,
      elderberry_fresh: true,
      rowan_jelly: true,
      quince_paste: true,
      bergamot_fresh: true,
      yuzu_fresh: true,
      sudachi: true,
      kabosu: true,
      ponkan: true,
      dekopon: true,
      hassaku: true,
      amanatsu: true,
      shiso_green: true,
      shiso_red: true,
      mitsuba: true,
      myoga: true,
      wasabi_leaf: true,
      sansho: true,
      kinome: true,
      yuzu_kosho: true,
      edelweiss: true,
      gentian: true,
      arnica_montana: true,
      alpine_strawberry: true,
      bilberry_leaf: true,
      juniper_berry: true,
      fir_needle: true,
      spruce_tip: true,
      olive_leaf: true,
      myrtle_berry: true,
      mastic: true,
      caper: true,
      zaatar: true,
      sumac_berry: true,
      saffron_crocus: true,
      orange_blossom: true,
      lavender_honey: true,
      thyme_honey: true,
      acacia_honey: true,
      buckwheat_honey: true,
      chestnut_honey: true,
      manuka: true,
      propolis: true,
      bee_pollen: true,
      royal_jelly: true,
      comb_honey: true,
      mead_herb: true,
      linden_honey: true,
      heather_honey_wild: true,
      wildflower_honey: true,
      clover_honey: true,
      eucalyptus_honey: true
    };
    if (FORAGE_FLAVORS[flavorDef.id] && (baseDef.id === "tea" || baseDef.id === "honey_water" || baseDef.id === "soda" || baseDef.id === "floral_tea")) {
      score += 0.3;
      notes.push("野草特调");
    }
    // soft pin-shelf: using pinned flavor feels familiar
    if (catalogs.pinnedFlavorId && flavorDef.id === catalogs.pinnedFlavorId) {
      score += 0.35;
      notes.push("调味架熟手");
    }
    if (season === "dusk" && topDef && topDef.id !== "none") {
      score += 0.25;
      notes.push("黄昏点缀");
    }
    if (season === "dusk" && topDef && topDef.id === "camellia_top") {
      score += 0.25;
      notes.push("暮色山茶");
    }
    if (customer.wantTopping && topDef && topDef.id !== "none") {
      score += 1;
      notes.push("装饰很可爱");
    } else if (topDef && topDef.id !== "none") {
      score += 0.5;
    }

    // soft affinity: returning guest warmth (catalogs.affinity or customer.affinity)
    var aff = catalogs.affinity != null ? catalogs.affinity : (customer.affinity || 0);
    var affThreshold = ECONOMY.affinityBonusThreshold || 3;
    if (aff >= affThreshold) {
      score += 0.5;
      notes.push("老熟人默契");
    } else if (aff >= 1) {
      score += 0.25;
      notes.push("似曾相识");
    }

    // soft daily special (catalogs.dailySpecial.flavor)
    var special = catalogs.dailySpecial;
    if (special && special.flavor && flavorDef.id === special.flavor) {
      score += 0.5;
      notes.push("今日小特调");
    }

    score = Math.min(5, score);
    var coins = ECONOMY.serveBase + Math.floor(score * ECONOMY.serveScoreMul);
    if (aff >= affThreshold) {
      coins += 1;
    }
    if (special && special.flavor && flavorDef.id === special.flavor) {
      coins += 1;
    }
    var hearts = score >= 3 ? 1 : 0;
    return { score: score, notes: notes, coins: coins, hearts: hearts, affinity: aff, dailySpecial: !!(special && special.flavor && flavorDef.id === special.flavor) };
  }

  function serveDrink(state, customer, craft, catalogs) {
    catalogs = catalogs || {};
    var bases = catalogs.bases || DEFAULT_BASES;
    var flavors = catalogs.flavors || DEFAULT_FLAVORS;
    var toppings = catalogs.toppings || DEFAULT_TOPPINGS;
    var baseDef = bases.find(function (b) {
      return b.id === craft.base;
    });
    var flavorDef = flavors.find(function (f) {
      return f.id === craft.flavor;
    });
    var topDef = toppings.find(function (t) {
      return t.id === craft.topping;
    });
    if (!baseDef || !flavorDef) return { ok: false, reason: "incomplete" };

    if (baseDef.need && !takeItem(state, baseDef.need, 1)) {
      return { ok: false, reason: "missing_base" };
    }
    if (flavorDef.need && !takeItem(state, flavorDef.need, 1)) {
      if (baseDef.need) addItem(state, baseDef.need, 1);
      return { ok: false, reason: "missing_flavor" };
    }
    if (topDef && topDef.need && !takeItem(state, topDef.need, 1)) {
      if (baseDef.need) addItem(state, baseDef.need, 1);
      if (flavorDef.need) addItem(state, flavorDef.need, 1);
      return { ok: false, reason: "missing_topping" };
    }

    catalogs = Object.assign({}, catalogs);
    if (!catalogs.dailySpecial) catalogs.dailySpecial = getDailySpecial(state);
    if (!catalogs.season) catalogs.season = state.season;
    if (catalogs.pinnedFlavorId == null && state.pinnedFlavorId) catalogs.pinnedFlavorId = state.pinnedFlavorId;
    var result = scoreDrink(customer, craft, catalogs);
    if (result.notes && result.notes.indexOf("野草特调") >= 0) {
      if (!state.stats) state.stats = {};
      state.stats.forageBrews = (state.stats.forageBrews || 0) + 1;
    }
    // Soft repeat-order memory for known guests
    var cname = customer && customer.name ? customer.name : null;
    var drinkKey = [craft.cup, craft.base, craft.flavor, craft.topping || "none"].join("-");
    var repeated = false;
    if (cname && state.lastCraftByGuest && state.lastCraftByGuest[cname] === drinkKey) {
      repeated = true;
      result.score = Math.min(5, (result.score || 0) + 0.25);
      result.notes = (result.notes || []).concat(["还是老样子"]);
      result.coins = (result.coins || 0) + 1;
      if (!state.stats) state.stats = {};
      state.stats.repeatOrders = (state.stats.repeatOrders || 0) + 1;
    }
    if (result.dailySpecial) {
      if (!state.stats) state.stats = {};
      state.stats.dailySpecialHits = (state.stats.dailySpecialHits || 0) + 1;
    }
    state.coins = (state.coins || 0) + result.coins;
    state.hearts = (state.hearts || 0) + result.hearts;
    if (!state.drinksMade) state.drinksMade = {};
    state.drinksMade[drinkKey] = (state.drinksMade[drinkKey] || 0) + 1;
    if (cname) {
      if (!state.lastCraftByGuest) state.lastCraftByGuest = {};
      state.lastCraftByGuest[cname] = drinkKey;
    }
    if (!state.stats) state.stats = {};
    state.stats.drinksServed = (state.stats.drinksServed || 0) + 1;
    // Soft first cups of the day: opening calm, not a pressure system
    if (!state.stats) state.stats = {};
    var dayK = dayKey(Date.now());
    if (state._serveDayKey !== dayK) {
      state._serveDayKey = dayK;
      state._servesToday = 0;
    }
    state._servesToday = (state._servesToday || 0) + 1;
    var openCalm = false;
    if (state._servesToday <= 3 && result.score >= 2) {
      openCalm = true;
      result.coins = (result.coins || 0) + 1;
      result.notes = (result.notes || []).concat(["开店清静"]);
      state.stats.openCalmServes = (state.stats.openCalmServes || 0) + 1;
    }
    if (result.score >= 3) {
      state.serveStreak = (state.serveStreak || 0) + 1;
      addTipJar(state, 1);
    } else {
      state.serveStreak = 0;
    }
    var streakBonus = 0;
    if (state.serveStreak >= 3) {
      streakBonus = 2;
      state.coins = (state.coins || 0) + streakBonus;
      result.notes = (result.notes || []).concat(["连胜小奖励"]);
      result.coins = (result.coins || 0) + streakBonus;
    }
    return {
      ok: true,
      result: result,
      drinkKey: drinkKey,
      serveStreak: state.serveStreak || 0,
      repeated: repeated,
      openCalm: openCalm,
    };
  }

  /** Apply last remembered craft for a guest name into craft object */
  
  
  /** Soft tip jar: spare coins become hearts when jar fills (no combat) */
  
  function pinBagItem(state, itemId) {
    itemId = String(itemId || "").trim();
    if (!itemId) return { ok: false, reason: "empty" };
    state.pinnedBagItem = itemId;
    appendJournal(state, "把「" + itemId + "」钉在竹篮最上面。");
    return { ok: true, itemId: itemId };
  }

  /** Soft sticky note for a guest name (shop memory, no combat) */
  function setGuestNote(state, guestName, note) {
    guestName = String(guestName || "").trim();
    note = String(note || "").trim().slice(0, 40);
    if (!guestName) return { ok: false, reason: "empty_name" };
    if (!note) return { ok: false, reason: "empty_note" };
    if (!state.guestNotes) state.guestNotes = {};
    state.guestNotes[guestName] = note;
    if (!state.stats) state.stats = {};
    state.stats.guestNotes = (state.stats.guestNotes || 0) + 1;
    appendJournal(state, "给客人「" + guestName + "」贴了便签。");
    return { ok: true, guestName: guestName, note: note };
  }

  /** Soft favorite plant id for sill preference (still-life, no combat) */
  function setFavoritePlant(state, plantId) {
    plantId = String(plantId || "").trim();
    if (!plantId) return { ok: false, reason: "empty" };
    state.favoritePlantId = plantId;
    if (!state.stats) state.stats = {};
    state.stats.plantFavs = (state.stats.plantFavs || 0) + 1;
    appendJournal(state, "把「" + plantId + "」记成窗台最想照料的那盆。");
    return { ok: true, plantId: plantId };
  }

  /** Soft favorite path theme for walk preference (collection, no combat) */
  function setFavoritePathTheme(state, themeId) {
    themeId = String(themeId || "").trim();
    if (!themeId) return { ok: false, reason: "empty" };
    state.favoritePathThemeId = themeId;
    if (!state.stats) state.stats = {};
    state.stats.pathFavs = (state.stats.pathFavs || 0) + 1;
    appendJournal(state, "把「" + themeId + "」记成最想再走一遍的小路。");
    return { ok: true, themeId: themeId };
  }

  
  /** Soft pin a flavor id for shop craft recall (no combat) */
  function pinFlavor(state, flavorId) {
    flavorId = String(flavorId || "").trim();
    if (!flavorId) return { ok: false, reason: "empty" };
    state.pinnedFlavorId = flavorId;
    if (!state.stats) state.stats = {};
    state.stats.flavorPins = (state.stats.flavorPins || 0) + 1;
    appendJournal(state, "把「" + flavorId + "」钉在小店调味架上。");
    return { ok: true, flavorId: flavorId };
  }

  function getPinnedFlavor(state) {
    return state.pinnedFlavorId || null;
  }

  /** Soft end-of-day shop close: journal a calm summary (no fail state) */
  function closeShopDay(state, now) {
    now = now || Date.now();
    var dk = dayKey(now);
    if (state._closedShopDay === dk) return { ok: false, reason: "already" };
    state._closedShopDay = dk;
    var served = state._servesToday || 0;
    var tip = (state.tipJar && state.tipJar.coins) || 0;
    var line =
      "收摊了。今天出杯 " +
      served +
      "，小费罐 " +
      tip +
      "/10。灯先留一盏。";
    appendJournal(state, line);
    if (!state.stats) state.stats = {};
    state.stats.shopCloses = (state.stats.shopCloses || 0) + 1;
    return { ok: true, line: line, served: served };
  }

  /** Soft pin a secret recipe id for one-tap craft recall (no combat) */
  function pinRecipe(state, recipeId) {
    recipeId = String(recipeId || "").trim();
    if (!recipeId) return { ok: false, reason: "empty" };
    state.pinnedRecipeId = recipeId;
    if (!state.stats) state.stats = {};
    state.stats.recipePins = (state.stats.recipePins || 0) + 1;
    appendJournal(state, "把配方「" + recipeId + "」钉在柜台边。");
    return { ok: true, recipeId: recipeId };
  }

  function getPinnedRecipe(state, recipes) {
    recipes = recipes || [];
    var id = state && state.pinnedRecipeId;
    if (!id) return { ok: false, reason: "none" };
    for (var i = 0; i < recipes.length; i++) {
      if (recipes[i] && (recipes[i].id === id || recipes[i].name === id)) {
        return { ok: true, recipe: recipes[i] };
      }
    }
    return { ok: false, reason: "missing" };
  }

  /** Soft shop board: top guests by affinity warmth (no ranking pressure) */
  function getTopGuests(state, limit) {
    limit = limit == null ? 3 : limit;
    var aff = (state && state.customerAffinity) || {};
    return Object.keys(aff)
      .map(function (name) {
        return { name: name, affinity: aff[name] || 0 };
      })
      .filter(function (g) {
        return g.affinity > 0;
      })
      .sort(function (a, b) {
        return b.affinity - a.affinity;
      })
      .slice(0, Math.max(0, limit));
  }

function addTipJar(state, coins) {
    coins = coins == null ? 1 : coins;
    if (!state.tipJar) state.tipJar = { coins: 0 };
    state.tipJar.coins = (state.tipJar.coins || 0) + coins;
    var hearts = 0;
    while (state.tipJar.coins >= 10) {
      state.tipJar.coins -= 10;
      state.hearts = (state.hearts || 0) + 1;
      hearts += 1;
    }
    if (hearts && !state.stats) state.stats = {};
    if (hearts) state.stats.tipJarHearts = (state.stats.tipJarHearts || 0) + hearts;
    return { ok: true, jar: state.tipJar.coins, hearts: hearts };
  }

function setFavoriteCup(state, cupId) {
    cupId = String(cupId || "").trim();
    if (!cupId) return { ok: false, reason: "empty" };
    state.favoriteCupId = cupId;
    appendJournal(state, "记下常用杯型：「" + cupId + "」。");
    return { ok: true, cupId: cupId };
  }

function recallGuestCraft(state, guestName) {
    if (!guestName || !state.lastCraftByGuest || !state.lastCraftByGuest[guestName]) {
      return { ok: false, reason: "none" };
    }
    var key = state.lastCraftByGuest[guestName];
    var parts = String(key).split("-");
    if (parts.length < 3) return { ok: false, reason: "bad" };
    return {
      ok: true,
      craft: {
        cup: parts[0],
        base: parts[1],
        flavor: parts[2],
        topping: parts[3] || "none",
      },
      drinkKey: key,
    };
  }

  function serialize(state) {
    return JSON.stringify(state);
  }

  function migrateState(data) {
    if (!data || typeof data !== "object") return data;
    var v = data.version || 1;
    if (v < 2) {
      data.settings = data.settings || { sound: true, reduceMotion: false, showTips: true, tutorialDone: false };
      data.season = data.season || "dusk";
    }
    if (v < 3) {
      data.potSlots = data.potSlots || (data.pots && data.pots.length) || 4;
      data.pathThemeId = data.pathThemeId || "maple_lane";
      if (data.settings && data.settings.weatherFx === undefined) data.settings.weatherFx = true;
      if (data.settings && data.settings.ambience === undefined) data.settings.ambience = false;
      if (data.settings && data.settings.quietShop === undefined) data.settings.quietShop = false;
      data.daily = data.daily || null;
    }
    data.version = VERSION;
    return data;
  }

  function deserialize(raw) {
    if (!raw) return null;
    var data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || typeof data !== "object") return null;
    data = migrateState(data);
    var base = defaultState();
    Object.keys(base).forEach(function (k) {
      if (data[k] === undefined) data[k] = base[k];
    });
    if (!Array.isArray(data.pots) || !data.pots.length) data.pots = base.pots;
    while (data.pots.length < (data.potSlots || 4)) data.pots.push(emptyPot());
    data.version = VERSION;
    return data;
  }

  function mergeCatalog(extra) {
    extra = extra || {};
    return {
      items: Object.assign({}, DEFAULT_ITEMS, extra.items || {}),
      plants: Object.assign({}, DEFAULT_PLANTS, extra.plants || {}),
      cups: (DEFAULT_CUPS || []).concat(extra.cups || []),
      bases: (DEFAULT_BASES || []).concat(extra.bases || []),
      flavors: (DEFAULT_FLAVORS || []).concat(extra.flavors || []),
      toppings: (DEFAULT_TOPPINGS || []).concat(extra.toppings || []),
      customers: (DEFAULT_CUSTOMERS || []).concat(extra.customers || []),
    };
  }

  function pickRandomCustomer(customers, rng) {
    customers = customers || DEFAULT_CUSTOMERS;
    rng = rng || Math.random;
    var c = customers[Math.floor(rng() * customers.length)];
    return Object.assign({}, c, { id: Date.now() + Math.floor(rng() * 1000) });
  }

  /** Soft pin a favorite guest name — higher chance to reappear, no combat */
  function pinCustomer(state, name) {
    name = String(name || "").trim();
    if (!name) return { ok: false, reason: "empty" };
    state.pinnedCustomer = name;
    appendJournal(state, "记下常客：「" + name + "」。");
    return { ok: true, name: name };
  }

  function unpinCustomer(state) {
    var prev = state.pinnedCustomer || null;
    state.pinnedCustomer = null;
    return { ok: true, prev: prev };
  }

  /** Soft rearrange: swap two sill pots (still-life, no combat) */
  function swapPots(state, a, b) {
    if (!state.pots || !state.pots.length) return { ok: false, reason: "empty" };
    a = a | 0;
    b = b | 0;
    if (a === b) return { ok: false, reason: "same" };
    if (a < 0 || b < 0 || a >= state.pots.length || b >= state.pots.length) {
      return { ok: false, reason: "range" };
    }
    var tmp = state.pots[a];
    state.pots[a] = state.pots[b];
    state.pots[b] = tmp;
    if (!state.stats) state.stats = {};
    state.stats.potSwaps = (state.stats.potSwaps || 0) + 1;
    appendJournal(state, "把窗台花盆轻轻对调了一下。");
    return { ok: true, a: a, b: b };
  }

  /** Soft windowsill snapshot — still-life memory card, no combat */
  function snapshotPot(state, potIndex, plants) {
    plants = plants || DEFAULT_PLANTS;
    var pot = state.pots && state.pots[potIndex];
    if (!pot || !pot.plantId) return { ok: false, reason: "empty" };
    var def = plants[pot.plantId] || { name: pot.plantId, emoji: ["🪴"] };
    var stage = growthStage(pot, plants);
    var card = {
      at: Date.now(),
      day: state.day || 1,
      season: state.season || "dusk",
      plantId: pot.plantId,
      name: pot.nickname || def.name,
      emoji: (def.emoji && def.emoji[stage]) || "🪴",
      mood: Math.round(pot.mood || 0),
      note: pot.note || "",
    };
    if (!state.potSnaps) state.potSnaps = [];
    state.potSnaps.push(card);
    if (state.potSnaps.length > 12) state.potSnaps = state.potSnaps.slice(-12);
    if (!state.stats) state.stats = {};
    state.stats.potSnaps = (state.stats.potSnaps || 0) + 1;
    appendJournal(state, "给「" + card.name + "」拍了一张窗台速写。");
    return { ok: true, card: card };
  }

  function pickCustomerWithPin(state, customers, rng) {
    customers = customers || DEFAULT_CUSTOMERS;
    rng = rng || Math.random;
    var pin = state && state.pinnedCustomer;
    if (pin && rng() < 0.45) {
      for (var i = 0; i < customers.length; i++) {
        if (customers[i].name === pin) {
          return Object.assign({}, customers[i], { id: Date.now() + Math.floor(rng() * 1000), pinned: true });
        }
      }
    }
    return pickRandomCustomer(customers, rng);
  }

  function assertNoCombat(text) {
    var s = String(text || "");
    var banned = [
      ["d","amage"].join(""),
      ["H","P"].join(""),
      "攻击",
      "战斗",
      "击杀",
      ["blo","od"].join("")
    ];
    for (var i = 0; i < banned.length; i++) {
      if (s.toLowerCase().indexOf(banned[i].toLowerCase()) >= 0) return false;
    }
    return true;
  }

  return {
    SAVE_KEY: SAVE_KEY,
    VERSION: VERSION,
    DEFAULT_ITEMS: DEFAULT_ITEMS,
    DEFAULT_PLANTS: DEFAULT_PLANTS,
    DEFAULT_CUPS: DEFAULT_CUPS,
    DEFAULT_BASES: DEFAULT_BASES,
    DEFAULT_FLAVORS: DEFAULT_FLAVORS,
    DEFAULT_TOPPINGS: DEFAULT_TOPPINGS,
    DEFAULT_CUSTOMERS: DEFAULT_CUSTOMERS,
    SEASON_ORDER: SEASON_ORDER,
    SEASON_LABELS: SEASON_LABELS,
    SEASON_ART: SEASON_ART,
    DEFAULT_ACHIEVEMENTS: DEFAULT_ACHIEVEMENTS,
    emptyPot: emptyPot,
    defaultState: defaultState,
    bagCount: bagCount,
    hasItem: hasItem,
    addItem: addItem,
    takeItem: takeItem,
    growthStage: growthStage,
    isReady: isReady,
    plantSeed: plantSeed,
    renamePlant: renamePlant,
    setPotNote: setPotNote,
    sitBench: sitBench,
    getWateringCan: getWateringCan,
    chargeWateringCan: chargeWateringCan,
    useWateringCan: useWateringCan,
    recipeMatchHint: recipeMatchHint,
    tend: tend,
    settleOfflineGrowth: settleOfflineGrowth,
    scoreDrink: scoreDrink,
    serveDrink: serveDrink,
    serialize: serialize,
    deserialize: deserialize,
    migrateState: migrateState,
    mergeCatalog: mergeCatalog,
    pickRandomCustomer: pickRandomCustomer,
    pinCustomer: pinCustomer,
    unpinCustomer: unpinCustomer,
    pickCustomerWithPin: pickCustomerWithPin,
    snapshotPot: snapshotPot,
    swapPots: swapPots,
    assertNoCombat: assertNoCombat,
    advanceSeason: advanceSeason,
    appendJournal: appendJournal,
    evaluateAchievements: evaluateAchievements,
    getSettings: getSettings,
    updateSettings: updateSettings,
    exportSave: exportSave,
    importSave: importSave,
    DAILY_GOAL_DEFS: DAILY_GOAL_DEFS,
    dayKey: dayKey,
    getDailySpecial: getDailySpecial,
    DAILY_SPECIAL_BY_SEASON: DAILY_SPECIAL_BY_SEASON,
    ensureDailyGoals: ensureDailyGoals,
    evaluateDailyGoals: evaluateDailyGoals,
    claimDailyReward: claimDailyReward,
    DAILY_GIFT_POOL: DAILY_GIFT_POOL,
    softNewDay: softNewDay,
    createDemoState: createDemoState,
    unlockPotSlot: unlockPotSlot,
    ECONOMY: ECONOMY,
    DEFAULT_PATH_THEMES: DEFAULT_PATH_THEMES,
    getPathTheme: getPathTheme,
    setPathTheme: setPathTheme,
    favoritePathTheme: favoritePathTheme,
    buildSpawnList: buildSpawnList,
    recallGuestCraft: recallGuestCraft,
    setFavoriteCup: setFavoriteCup,
    addTipJar: addTipJar,
    pinBagItem: pinBagItem,
    getTopGuests: getTopGuests,
    pinRecipe: pinRecipe,
    getPinnedRecipe: getPinnedRecipe,
    closeShopDay: closeShopDay,
    setFavoritePlant: setFavoritePlant,
    setFavoritePathTheme: setFavoritePathTheme,
    pinFlavor: pinFlavor,
    getPinnedFlavor: getPinnedFlavor,
    setGuestNote: setGuestNote,
    claimFirstWalkBonus: claimFirstWalkBonus,
    upgradeWateringCan: upgradeWateringCan,
    checkPathMilestones: checkPathMilestones,
    PATH_MILESTONES: PATH_MILESTONES,
  };
});
