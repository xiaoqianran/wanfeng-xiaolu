# Authentic development rounds (source of truth for acceptance)

Only rounds with **authentic:true** count. Template spam archived under `archive/`.

| Round | Status | Type | Goal | Outcome | Commit |
|------:|--------|------|------|---------|--------|
| A0001 | completed | fix | 废弃模板刷轮并删除复制 live 艺术 | archived spam; deleted live_ dups; CSS tokens lasting | `fix(progress): A0001 废弃模板刷轮并删除复制 live 艺术` |
| A0002 | completed | feat | 今日小目标系统与演示模式 | ensureDailyGoals/claimDailyReward/createDemoState + UI | `feat(daily): A0002 今日小目标系统与演示模式存档` |
| A0003 | completed | content | 独特文案库同步运行时 | unique garden/walk/shop/dialogue banks | `content(world): A0003 去模板化独特文案库并同步运行时` |
| A0004 | completed | test | 反刷轮与日目标回归测试 | 32 tests including authenticity guards | `test(core): A0004 日目标演示去重与反刷轮回归测试` |
| A0006 | completed | feat | 晚间随机事件系统 | 8 unique evening events applied on new path | `feat(walk): A0006 晚间随机事件系统与独特文案` |
| A0007 | completed | docs | 答辩演示与架构文档 | ART_DIRECTION ASSET_MANIFEST DEMO_SCRIPT TECH_ARCHITECTURE | `docs(thesis): A0007 美术方向技术架构与答辩演示脚本` |
| A0010 | completed | feat | 小竹篮背包界面 | screen-bag lists bag contents | `feat(bag): A0010 小竹篮背包界面展示持有物` |
| A0011 | completed | content | 扩充独特晚间事件 | 14 unique events no #N spam | `content(events): A0011 扩充独特晚间事件至十四则` |
| A0012 | completed | docs | 玩家手册与真实测试报告 | USER_MANUAL + TEST_REPORT from real run | `docs(manual): A0012 玩家手册与真实测试报告` |
| A0014 | completed | chore | 同步状态 | sync-status | `chore(data): A0014 同步状态文件` |
| A0015 | completed | balance | 统一经济常数 | ECONOMY object drives serve/harvest/path/daily | `balance(economy): A0015 统一经济常数并调整散步收获奖励` |
| A0016 | completed | content | 晚间事件至22则 | 22 unique narrative events | `content(events): A0016 晚间事件扩充至二十二则独特叙事` |
| A0017 | completed | test | 质量门禁脚本 | tools/quality-gate.js real checks | `test(quality): A0017 毕业质量门禁脚本 quality-gate` |
| A0019 | completed | content | 52则独特晚间 vignette | 52 unique titles/bodies loaded via game-data | `content(events): A0019 晚间 vignette 扩充至五十二则独特标题` |
| A0021 | completed | feat | 小路主题选择系统 | 4 themes; setPathTheme/buildSpawnList; UI picker; sky/spawn bias | `feat(walk): A0021 小路主题选择影响天空生成与氛围` |
| A0022 | completed | feat | 秘密配方图鉴页 | recipes tab reveals secret recipes when made | `feat(album): A0022 秘密配方图鉴页与解锁展示` |
| A0023 | completed | feat | 花盆位扩展解锁 | unlockPotSlot to 6 pots for coins | `feat(album): A0022 秘密配方图鉴页与解锁展示` |
| A0024 | completed | feat | 客人风味记忆与性能拾取上限 | favoriteFlavor soft bonus; ITEM_CAP on low-end | `feat(shop): A0024 客人风味记忆软加成与低配拾取上限` |
| A0025 | completed | fix | 修复风味记忆加成逻辑 | favoriteFlavor additive not exclusive of tag match | `fix(shop): A0025 修复风味记忆加成与标签判定互斥` |
| A0026 | completed | feat | 跳转主内容无障碍 | skip-link + main tabindex | `feat(a11y): A0026 跳转主内容链接与焦点样式` |
| A0027 | completed | docs | 创新点与限制文档 | INNOVATION + KNOWN_LIMITS | `docs(thesis): A0027 创新点与已知限制说明` |
| A0028 | completed | feat | 存档版本迁移 | migrateState v1-v3 pathTheme potSlots settings | `feat(save): A0028 存档 migrateState 兼容旧版本字段` |
| A0029 | completed | feat | 新汽水基底与装饰 | honey_water berry_soda floral_tea + toppings | `feat(shop): A0029 新增蜜水莓果花香基底与装饰选项` |
| A0030 | completed | feat | 主题天气视觉特效 | drawWeather rain stars bamboo silhouettes | `feat(walk): A0030 主题天气粒子与星光竹影河畔特效` |
| A0031 | completed | fix | 同步新基底运行时 | content-extra.js includes honey_water | `fix(shop): A0031 确保新基底写入 content-extra 运行时` |
| A0032 | completed | feat | 客人熟悉度 | customerAffinity increments on good serves | `feat(shop): A0032 客人熟悉度随好评累积展示` |
| A0033 | completed | feat | 植物小名 | renamePlant + garden UI prompt | `feat(garden): A0033 植物小名与手帐记录` |
| A0034 | completed | content | 六位独特新客人 | hand-authored customers e.g. 折纸的少年 | `content(shop): A0034 六位独特新客人写入运行时` |
| A0035 | completed | feat | 游戏内帮助页与手册 | screen-help + USER_MANUAL tables | `feat(help): A0035 游戏内帮助页与玩家手册对齐` |
| A0036 | completed | balance | potUnlockCost 经济常数 | ECONOMY.potUnlockCost + unit test | `balance(economy): A0036 potUnlockCost 纳入 ECONOMY 并补测试` |
| A0037 | completed | content | 独特手帐范文 | 8 unique journal templates no #N | `content(journal): A0037 去模板化手帐范文八则` |
| A0038 | completed | audio | 扩展音效与音频设计 | harvest/unlock/theme/achieve sfx + AUDIO_DESIGN.md | `audio(feedback): A0038 收获解锁主题成就音效与音频设计文档` |
| A0039 | completed | feat | 温柔信箱 | mail.json + openOneMail + screen-mail | `feat(mail): A0039 温柔信箱系统与独特来信` |
| A0040 | completed | feat | 温柔足迹统计页 | renderStats paths picks harvests affinity mail | `feat(stats): A0040 温柔足迹统计页` |
| A0041 | completed | feat | 季节汽水软加成 | spring jasmine / summer mint / etc in scoreDrink | `feat(shop): A0041 季节软加成影响汽水评分` |
| A0042 | completed | content | 十封独特来信 | 10 unique mail letters in runtime | `content(mail): A0042 信箱扩充至十封独特来信` |
| A0043 | completed | feat | 软刷新新的一天 | softNewDay keeps bag resets daily goals | `feat(meta): A0043 迎来新的一天刷新日目标并保留背包` |
| A0044 | completed | feat | 草甸慢坡主题 | 5th path theme meadow with unique sky/bias | `feat(walk): A0044 新增草甸慢坡小路主题` |
| A0045 | completed | docs | 最终发布检查清单 | FINAL_RELEASE_CHECKLIST in progress | `docs(release): A0045 最终发布检查清单（进行中）` |
| A0046 | completed | feat | 帮助快捷键 | ?/H open help screen | `feat(input): A0046 问号与 H 键打开怎么玩` |
| A0047 | completed | content | 67则晚间事件 | 67 unique titles; body length fixed | `content(events): A0047 晚间事件扩充至六十七则并修文案长度` |
| A0048 | completed | feat | 天气特效开关 | weatherFx setting gates drawWeather | `feat(settings): A0048 小路天气特效开关与减少动效联动` |
| A0049 | completed | content | 八则独特秘密配方 | hand-authored recipe names | `content(shop): A0049 八则独特秘密配方写入运行时` |
| A0050 | completed | feat | 高心情收获礼物 | mood>85 gift item on harvest | `feat(garden): A0050 高心情收获附赠小礼物` |
| A0051 | completed | feat | 六种独特收集物 | seashell pinecone ribbon tea_leaf star_sand river_pebble | `feat(content): A0051 六种独特收集物与野茶芽风味` |
| A0052 | completed | feat | 说话专属文案 | talkLines pool for talk action | `feat(garden): A0052 说话专属文案库 talkLines` |
| A0053 | completed | feat | 设置页版本元信息 | build-meta VERSION + theme | `feat(settings): A0053 设置页显示存档版本与主题元信息` |
| A0054 | completed | feat | 演示模式操作提示 | toast 1-4 nav after demo load | `feat(demo): A0054 演示模式快捷键提示与导航指引` |
| A0055 | completed | fix | 过滤模板客人名 | drop names matching ·digits spam | `feat(demo): A0054 演示模式快捷键提示与导航指引` |
| A0056 | completed | content | 独特小店提示 | 10 unique tipMessages | `content(shop): A0056 十则独特小店提示替换刷轮文案` |
| A0057 | completed | feat | 草甸花粉特效 | drawWeather meadow pollen ellipses | `feat(walk): A0057 草甸主题花粉飘落天气特效` |
| A0058 | completed | docs | CLAUDE.md 接手说明 | agent recovery guide at repo root | `docs(agents): A0058 添加 CLAUDE.md 接手说明` |
| A0059 | completed | fix | 清除模板客人 | purged ·N names; 5 unique customers; 11 total | `fix(content): A0059 清除模板客人并加入五位独特新客人` |
| A0060 | completed | feat | 日目标领取附赠小礼 | deterministic DAILY_GIFT_POOL gift on claim | `feat(daily): A0060 完成日目标后赠送确定性小礼` |
| A0061 | completed | feat | 野茶丛种植与新杯型 | teaBush plant + bowl/flute cups | `feat(garden): A0061 野茶丛可种植与新杯型选项` |
| A0062 | completed | perf | 减少动效关闭拾取浮动 | bob=0 when reduceMotion | `perf(walk): A0062 减少动效时关闭拾取物浮动` |
| A0063 | completed | feat | 码头薄暮主题 | harbor theme + wave weather FX | `feat(walk): A0063 码头薄暮主题与潮波特效` |
| A0064 | completed | docs | README 功能与进度说明 | feature list + authentic progress pointer | `docs(readme): A0064 更新功能列表与诚实进度说明` |
| A0065 | completed | feat | 花盆显示小名 | pot label includes nickname | `feat(garden): A0065 花盆标签显示植物小名` |
| A0066 | completed | feat | 剪贴板复制存档 | btn-copy-save clipboard API | `feat(settings): A0066 存档一键复制到剪贴板` |
| A0067 | completed | docs | GDD 扩展系统 | document themes mail daily etc | `docs(gdd): A0067 补充扩展系统说明` |
| A0068 | completed | content | 三则新秘密配方 | 陶碗野茶 细长星砂 蜜水丝带 | `content(shop): A0068 陶碗野茶等三则新秘密配方` |
| A0069 | completed | docs | meta 系统清单 | meta.json systems + saveVersion 3 | `docs(meta): A0069 更新 meta 系统清单与存档版本` |
| A0070 | completed | feat | 背包分类排序 | kindOrder sort in renderBag | `feat(bag): A0070 背包按物品种类排序展示` |
| A0071 | completed | audio | 环境底噪开关 | WebAudio pad + settings.ambience | `audio(ambience): A0071 可选 WebAudio 环境底噪与设置开关` |
| A0072 | completed | feat | 季节专属小店提示 | season-tips.json per season | `feat(shop): A0072 季节专属小店提示文案` |
| A0073 | completed | feat | 连胜招待奖励 | serveStreak >=3 small coin bonus | `feat(shop): A0073 连胜招待小奖励 serveStreak` |
| A0074 | completed | feat | 盆栽照料提示 | low water/sun/mood hints in plant detail | `feat(garden): A0074 盆栽缺水缺日照心情提示` |
| A0075 | completed | content | 十五封独特来信 | 15 unique mail letters | `content(mail): A0075 信箱扩充至十五封独特来信` |
| A0076 | completed | feat | Escape与快捷键 | Escape home; b bag; m mail | `feat(input): A0076 Escape 回主页与背包信箱快捷键` |
| A0077 | completed | feat | HUD 主题名 | canvas HUD shows path theme name | `feat(walk): A0077 小路 HUD 显示当前主题名` |
| A0078 | completed | docs | 底噪设计文档 | AUDIO_DESIGN ambience section | `docs(audio): A0078 补充环境底噪设计说明` |
| A0079 | completed | content | 手帐范文至13则 | unique titles including 码头笔记 | `content(journal): A0079 手帐范文扩充至十三则` |
| A0080 | completed | fix | 演示存档设置字段 | createDemoState weatherFx+ambience | `fix(demo): A0080 演示存档补齐 weatherFx 与 ambience 设置字段` |
| A0081 | completed | feat | 灯笼小巷主题 | 7th path theme + lantern glow FX | `feat(walk): A0081 灯笼小巷主题与暖光特效` |
| A0082 | completed | content | 四位独特新客人 | 卖灯笼的阿婆等 15 customers total | `content(shop): A0082 四位独特新客人写入运行时` |
| A0083 | completed | feat | 植物歇一歇 | tend rest + restLines | `feat(garden): A0083 植物歇一歇恢复心情几乎不催长` |
| A0084 | completed | feat | 安静模式 | quietShop simplifies wish | `feat(shop): A0084 汽水铺安静模式简化客人需求` |
| A0085 | completed | content | 77则晚间事件 | 77 unique vignettes | `content(events): A0085 晚间事件扩充至七十七则独特 vignette` |
| A0086 | completed | feat | 安静模式单标签 | single tag when quietShop | `feat(shop): A0086 安静模式只显示单一需求标签` |
| A0087 | completed | feat | 薰衣草种植 | lavender_bud + lavenderPot | `feat(garden): A0087 薰衣草蕾可拾取种植与花香风味` |
| A0088 | completed | feat | 屋檐听雨主题 | rain_eaves 8th theme + rain FX | `feat(walk): A0088 屋檐听雨主题与细雨特效` |
| A0089 | completed | feat | 出杯星级反馈 | scoreStars toast | `feat(shop): A0089 出杯结果星级软反馈` |
| A0090 | completed | feat | 新成就与主题足迹 | gentle_rest theme_walker mail_reader + _themesTouched | `feat(meta): A0090 休息主题拆信新成就与主题足迹` |
| A0091 | completed | feat | 山茶种植 | camellia item+plant+topping | `feat(garden): A0091 山茶花瓣可拾取种植与装饰` |
| A0092 | completed | docs | 手册同步新功能 | USER_MANUAL rest keys settings | `docs(manual): A0092 玩家手册同步休息快捷键与新设置` |
| A0093 | completed | feat | 足迹显示主题数 | themesN in renderStats | `feat(stats): A0093 足迹页显示主题切换数量` |
| A0094 | completed | content | 山茶蜜语配方 | 山茶蜜语 雨檐野茶 recipes | `content(shop): A0094 山茶蜜语与雨檐野茶秘密配方` |
| A0095 | completed | art | 信箱休息帮助图标 | 3 unique procedural PNGs wired | `art(ui): A0095 信箱休息帮助独特程序化图标` |
| A0096 | completed | feat | 季节风味与熟悉度软加成 | season flavors + affinity tip; favoriteFlavor in UI | `feat(shop): A0096 季节风味熟悉度软加成与季节照料` |
| A0097 | completed | content | 信箱扩充至23封 | 8 unique hand-authored mails | `content(mail): A0097 温柔信箱扩充至二十三封独特来信` |
| A0098 | completed | feat | 花市巷尾主题 | 9th theme flower_alley + petal FX | `feat(walk): A0098 花市巷尾小路主题` |
| A0099 | completed | feat | 季节照料软加成 | spring talk / summer sun / autumn water / winter rest | `feat(shop): A0096 季节风味熟悉度软加成与季节照料` |
| A0100 | completed | feat | 迷迭香养成与风味 | rosemary item+plant+flavor | `feat(garden): A0100 迷迭香可拾取种植与草本风味` |
| A0101 | completed | content | 配方事件季节提示 | 巷尾迷迭 花市蜜语; 82 events; season tips | `content(world): A0101 巷尾配方晚间事件与季节提示` |
| A0103 | completed | chore | 同步运行时 | game-data sync flower_alley recipes mail events | `chore(data): A0103 同步运行时 game-data 与 sync-status` |
| A0104 | completed | test | 回归测试 | 90 tests pass season affinity rosemary flower_alley | `test(core): A0104 季节熟悉度迷迭香与花市主题回归` |
| A0105 | completed | feat | 花盆便签 | setPotNote + pot_scribe achievement + UI | `feat(garden): A0105 花盆便签与小路长椅歇脚` |
| A0106 | completed | feat | 长椅歇脚 | sitBench every 3rd sit +heart; bench_sitter | `feat(garden): A0105 花盆便签与小路长椅歇脚` |
| A0107 | completed | content | 新客人与桂花 | 20 customers; osmanthus; bamboo/paper cups | `content(shop): A0106 五位新客人与桂花橙皮竹节杯` |
| A0108 | completed | feat | 旧书庭院主题 | book_yard 10th theme + paper FX | `feat(walk): A0107 旧书庭院主题与桂花配方手帐` |
| A0109 | completed | content | 桂花配方 | 桂花竹节晚风 橙皮迷迭气泡 | `feat(walk): A0107 旧书庭院主题与桂花配方手帐` |
| A0110 | completed | feat | 足迹熟悉客人榜 | top affinity + bench/note counts in stats | `feat(garden): A0105 花盆便签与小路长椅歇脚` |
| A0111 | completed | test | 便签庭院回归 | 93 tests pass | `test(core): A0108 便签长椅桂花庭院回归测试` |
| A0112 | completed | content | 晚间事件至90则 | 90 unique vignettes + shop tips dialogues | `content(world): A0112 晚间事件至九十则与小店对话提示` |
| A0113 | completed | art | 三大系统导航图标 | unique shop/garden/bag PNGs wired | `art(ui): A0113 汽水铺盆栽竹篮独特程序化图标` |
| A0114 | completed | test | 事件与图标回归 | 94 tests pass | `test(content): A0114 事件唯一性与导航图标回归` |
| A0115 | completed | feat | 收集物种类筛选 | kind chips + spam id filter | `feat(album): A0115 收集物种类筛选与展示架季节色` |
| A0116 | completed | feat | 今日展示架 | shelfDrinks last 3 cups UI | `feat(album): A0115 收集物种类筛选与展示架季节色` |
| A0117 | completed | feat | 花盆季节色调 | season-* class on pot slots | `feat(album): A0115 收集物种类筛选与展示架季节色` |
| A0118 | completed | feat | 便签长椅日目标 | pot_note_day bench_once goals | `feat(daily): A0116 日目标支持便签与长椅歇脚` |
| A0119 | completed | feat | 丁香养成 | lilac plant flavor recipe mail | `feat(garden): A0117 丁香可种植与丁香暮色配方` |
| A0120 | completed | test | 筛选展示架回归 | 97 tests pass | `test(album): A0118 图鉴筛选展示架丁香回归` |
| A0121 | completed | feat | 小水壶蓄水浇灌 | charge on walk/bench; useWateringCan bonus | `feat(garden): A0121 散步蓄水小水壶与浇灌加成` |
| A0122 | completed | feat | 秘密配方接近提示 | recipeMatchHint soft title when 3/4 match | `feat(garden): A0121 散步蓄水小水壶与浇灌加成` |
| A0123 | completed | feat | 梅影短径主题 | plum_grove 11th theme + petal FX | `feat(walk): A0122 梅影短径主题与新客人配方` |
| A0124 | completed | content | 新客人与梅径配方 | 24 customers; 梅径丁香 | `feat(walk): A0122 梅影短径主题与新客人配方` |
| A0125 | completed | test | 水壶梅径回归 | 99 tests pass | `test(garden): A0124 水壶配方提示与梅径回归` |
| A0126 | completed | docs | 手册同步新系统 | USER_MANUAL watering themes album shelf | `docs(manual): A0126 手册同步水壶主题筛选与展示架` |
| A0127 | completed | content | 事件至96则 | 96 unique evening events + journal | `content(events): A0127 晚间事件至九十六则与水壶手帐` |
| A0128 | completed | test | 手册事件回归 | 100 tests pass | `test(docs): A0128 手册与晚间事件回归` |
| A0129 | completed | feat | 顶栏水壶格 | res-can charge/max in topbar | `feat(hud): A0129 顶栏显示水壶蓄水格` |
| A0130 | completed | feat | 风铃草与麦穗 | bluebell+wheat+麦田风铃 recipe | `feat(garden): A0130 风铃草麦穗与麦田风铃配方` |
| A0131 | completed | test | 风铃草回归 | 101 tests pass | `test(garden): A0131 风铃草水壶顶栏回归` |
| A0132 | completed | feat | 雾桥轻步主题 | mist_bridge 12th theme + fog FX | `feat(walk): A0132 雾桥轻步主题与三位新客人` |
| A0133 | completed | content | 新客人与雾桥配方 | 27 customers; 雾桥薄荷罐 | `feat(walk): A0132 雾桥轻步主题与三位新客人` |
| A0134 | completed | content | 事件至99则 | 99 unique evening events | `feat(walk): A0132 雾桥轻步主题与三位新客人` |
| A0135 | completed | test | 雾桥回归 | 102 tests pass | `feat(walk): A0132 雾桥轻步主题与三位新客人` |
| A0136 | completed | feat | 汽水按次数排序 | drinksMade sorted desc in album | `feat(shop): A0136 汽水图鉴按次数排序与水壶浇灌文案` |
| A0137 | completed | content | 水壶浇灌文案 | canLines 4 unique lines | `feat(shop): A0136 汽水图鉴按次数排序与水壶浇灌文案` |
| A0138 | completed | content | 信箱配方对话扩充 | mail 33; recipes 24; walk ambient 22 | `feat(shop): A0136 汽水图鉴按次数排序与水壶浇灌文案` |
| A0139 | completed | test | canLines回归 | 103 tests pass | `feat(shop): A0136 汽水图鉴按次数排序与水壶浇灌文案` |
| A0140 | completed | feat | 常客标记 | pinCustomer 45% reappear | `feat(shop): A0140 常客标记与盆栽心情表情` |
| A0141 | completed | feat | 盆栽心情表情 | mood-face emoji on pots | `feat(shop): A0140 常客标记与盆栽心情表情` |
| A0142 | completed | content | 事件破百 | 107 unique evening events | `feat(shop): A0140 常客标记与盆栽心情表情` |
| A0143 | completed | test | 常客心情回归 | 104 tests pass | `feat(shop): A0140 常客标记与盆栽心情表情` |
| A0144 | completed | feat | 萤火浅坡主题 | firefly_field 13th + glow FX | `feat(walk): A0144 萤火浅坡主题与星砂苏打` |
| A0145 | completed | content | 星砂配方与客人 | 萤坡星砂苏打; 追萤火的少年 | `feat(walk): A0144 萤火浅坡主题与星砂苏打` |
| A0146 | completed | test | 萤火主题回归 | 105 tests pass | `feat(walk): A0144 萤火浅坡主题与星砂苏打` |
| A0147 | completed | content | 事件至122则 | 122 unique hand-authored vignettes | `content(events): A0147 晚间 vignette 至一二二则` |
| A0148 | completed | content | 手帐三则 | 萤火/常客/心情脸 templates | `content(events): A0147 晚间 vignette 至一二二则` |
| A0149 | completed | test | 反模板事件测试 | 106 tests; ban #N spam titles | `content(events): A0147 晚间 vignette 至一二二则` |
| A0150 | completed | art | 水壶常客图标 | icon-can pin firefly unique PNGs | `art(ui): A0150 水壶常客萤火独特程序化图标` |
| A0151 | completed | test | 图标唯一尺寸 | 107 tests pass | `art(ui): A0150 水壶常客萤火独特程序化图标` |
| A0152 | completed | chore | 同步运行时 | sync refresh | `chore(data): A0152 同步运行时时间戳` |
| A0153 | completed | feat | 洋甘菊养成 | chamomile plant+flavor+recipe+mail | `feat(garden): A0153 洋甘菊可种植与甘菊暖夜配方` |
| A0154 | completed | test | 洋甘菊回归 | 108 tests pass | `feat(garden): A0153 洋甘菊可种植与甘菊暖夜配方` |
| A0155 | completed | feat | 窗台速写 | snapshotPot + sill_photographer + stats | `feat(garden): A0155 窗台速写静物记忆` |
| A0156 | completed | content | 信箱扩充 | mail 37 + shop tips | `feat(garden): A0155 窗台速写静物记忆` |
| A0157 | completed | test | 速写回归 | 109 tests pass | `feat(garden): A0155 窗台速写静物记忆` |
| A0158 | completed | feat | 夜市尾声主题 | night_market 14th + stall glow | `feat(walk): A0158 夜市尾声主题与手册同步` |
| A0159 | completed | docs | 手册速写常客 | USER_MANUAL snap+pin | `feat(walk): A0158 夜市尾声主题与手册同步` |
| A0160 | completed | test | 夜市手册回归 | 110 tests pass | `feat(walk): A0158 夜市尾声主题与手册同步` |
| A0161 | completed | content | 事件至134则 | 134 unique evening events | `content(world): A0161 夜市糖纸纸鹤与事件一三四则` |
| A0162 | completed | content | 糖纸纸鹤收集 | candy_wrap paper_crane + recipe | `content(world): A0161 夜市糖纸纸鹤与事件一三四则` |
| A0163 | completed | test | 糖纸事件回归 | 111 tests pass | `content(world): A0161 夜市糖纸纸鹤与事件一三四则` |
| A0164 | completed | feat | 小珍藏标签 | rare collectible tag in bag UI | `feat(bag): A0164 小珍藏标签与散步氛围扩充` |
| A0165 | completed | content | 氛围手帐扩充 | ambient 27 + journal night market | `feat(bag): A0164 小珍藏标签与散步氛围扩充` |
| A0166 | completed | test | 珍藏标签回归 | 112 tests pass | `feat(bag): A0164 小珍藏标签与散步氛围扩充` |
| A0167 | completed | content | 客人至32 | 32 unique customers + recipes | `content(shop): A0167 三位新客人与夜班配方` |
| A0168 | completed | content | 事件137则 | 137 unique evening events | `content(shop): A0167 三位新客人与夜班配方` |
| A0169 | completed | test | 客人唯一回归 | 113 tests pass | `content(shop): A0167 三位新客人与夜班配方` |
| A0170 | completed | feat | 石庭慢转主题 | stone_garden 15th + rake FX | `feat(walk): A0170 石庭慢转主题与新成就` |
| A0171 | completed | feat | 新成就 | discover_15 pin_host achievements | `feat(walk): A0170 石庭慢转主题与新成就` |
| A0172 | completed | test | 石庭成就回归 | 114 tests pass | `feat(walk): A0170 石庭慢转主题与新成就` |
| A0173 | completed | content | 事件至157则 | 157 unique hand-authored events | `content(events): A0173 晚间 vignette 至一五七则` |
| A0174 | completed | test | 150+事件回归 | 115 tests pass | `content(events): A0173 晚间 vignette 至一五七则` |
| A0175 | completed | feat | 抹茶风味 | matcha item+flavor+recipe+customer | `feat(shop): A0175 抹茶风味与竹影抹茶配方` |
| A0176 | completed | test | 抹茶回归 | 116 tests pass | `feat(shop): A0175 抹茶风味与竹影抹茶配方` |
| A0177 | completed | docs | 假设GDD同步 | ASSUMPTIONS A8-10 + GDD systems | `docs(gdd): A0177 假设与 GDD 同步水壶常客速写` |
| A0178 | completed | content | 抹茶石庭信 | mail 40 unique letters | `docs(gdd): A0177 假设与 GDD 同步水壶常客速写` |
| A0179 | completed | content | 事件至167则 | 167 unique evening events | `content(world): A0179 事件一六七则与店内花园文案` |
| A0180 | completed | content | 店内花园文案 | shop tips 24; canLines 7; journal 27 | `content(world): A0179 事件一六七则与店内花园文案` |
| A0181 | completed | audio | 水壶常客速写音效 | can/pin/snap WebAudio kinds | `audio(feedback): A0181 水壶常客速写音效` |
| A0182 | completed | test | 新音效回归 | 117 tests pass | `audio(feedback): A0181 水壶常客速写音效` |
| A0183 | completed | docs | 音效设计同步 | AUDIO_DESIGN can/pin/snap | `docs(audio): A0183 记录水壶常客速写合成音效` |
| A0184 | completed | feat | 鼠尾草养成 | sage plant+flavor+recipe+customer | `feat(garden): A0184 鼠尾草可种植与药草田园罐` |
| A0185 | completed | test | 鼠尾草回归 | 118 tests pass | `feat(garden): A0184 鼠尾草可种植与药草田园罐` |
| A0186 | completed | content | 事件至182则 | 182 unique evening events | `content(events): A0186 晚间 vignette 至一八二则` |
| A0187 | completed | feat | 常走小路标记 | favoritePathTheme UI + core | `feat(walk): A0187 常走小路标记与石庭青苔` |
| A0188 | completed | content | 青苔收藏 | moss collectible stone_garden bias | `feat(walk): A0187 常走小路标记与石庭青苔` |
| A0189 | completed | test | 常走青苔回归 | 119 tests pass | `feat(walk): A0187 常走小路标记与石庭青苔` |
| A0190 | completed | docs | 手册常走小路 | USER_MANUAL favorite theme | `docs(manual): A0190 手册同步常走小路与新来信` |
| A0191 | completed | content | 信箱43封 | mail moss/sage/fav_path | `docs(manual): A0190 手册同步常走小路与新来信` |
| A0192 | completed | content | 事件至202则 | 202 unique evening events | `content(events): A0192 晚间 vignette 至二零二则` |
| A0193 | completed | content | 季节提示与客人 | season tips 6/season; 36 customers | `content(world): A0193 季节提示与两位新客人` |
| A0194 | completed | test | 季节客人回归 | 120 tests pass | `content(world): A0193 季节提示与两位新客人` |
| A0195 | completed | docs | 真实测试报告 | TEST_REPORT 120 pass | `docs(test): A0195 真实 120 测与质量门禁报告` |
| A0196 | completed | feat | 柚子风味 | yuzu+柚子雨檐+撑伞的诗人 | `feat(shop): A0196 柚子风味与柚子雨檐配方` |
| A0197 | completed | test | 柚子回归 | 121 tests pass | `feat(shop): A0196 柚子风味与柚子雨檐配方` |
| A0198 | completed | content | 事件至212则 | 212 unique evening events | `content(events): A0198 事件至二一二则与 GDD 风味表` |
| A0199 | completed | docs | GDD风味扩展 | GDD lists extended flavors | `content(events): A0198 事件至二一二则与 GDD 风味表` |
| A0200 | completed | feat | 足迹配方进度 | favorite theme + recipes | `feat(stats): A0200 足迹显示常走主题与秘密配方进度` |
| A0201 | completed | content | 文案同步新系统 | journal/dialogue/tips | `content(copy): A0201 柚子雨常走配方文案扩充` |
| A0202 | completed | feat | 雪灯小径主题 | snow_lantern 16th + snow/lantern FX | `feat(walk): A0202 雪灯小径主题与雪花灯笼特效` |
| A0203 | completed | test | 雪灯回归 | 122 tests pass | `feat(walk): A0202 雪灯小径主题与雪花灯笼特效` |
| A0204 | completed | docs | 手册十六主题 | USER_MANUAL all 16 themes listed | `docs(manual): A0204 手册补全十六主题与雪灯事件` |
| A0205 | completed | content | 雪灯事件 | 217 evening events | `docs(manual): A0204 手册补全十六主题与雪灯事件` |
| A0206 | completed | feat | 雪灯与常走成就 | snow_walker fav_path achievements | `feat(meta): A0206 雪灯旅人与常走小路成就` |
| A0207 | completed | test | 新成就回归 | 123 tests pass | `feat(meta): A0206 雪灯旅人与常走小路成就` |
| A0208 | completed | content | 事件至232则 | 232 unique evening events | `content(world): A0208 事件二三二则与堆雪人客人` |
| A0209 | completed | content | 堆雪人客人 | 堆小雪人的孩子 customer | `content(world): A0208 事件二三二则与堆雪人客人` |
| A0210 | completed | docs | 续作状态卡 | resume at 202 | `docs(autodev): A0210 续作说明 authentic 202` |
| A0211 | completed | feat | 金银花养成 | honeysuckle plant+flavor+recipe | `feat(garden): A0211 金银花可种植与金银花雪灯配方` |
| A0212 | completed | test | 金银花回归 | 124 tests pass | `feat(garden): A0211 金银花可种植与金银花雪灯配方` |
| A0213 | completed | content | 事件至252则 | 252 unique events | `content(events): A0213 晚间 vignette 至二五二则` |
| A0214 | completed | docs | 决策记录 | DECISIONS strategy | `docs(decisions): A0214 记录 authentic 扩展策略` |
| A0215 | completed | balance | 日礼池扩充 | gift pool + rare bag | `balance(daily): A0215 日礼池与小珍藏纳入新收集物` |
| A0216 | completed | docs | 路线图锚点 | ROADMAP 208 | `docs(roadmap): A0216 更新执行锚点 authentic 208` |
| A0217 | completed | content | 金银花雪灯信 | mail 45 | `content(mail): A0217 金银花与雪灯来信` |
| A0218 | completed | feat | 粗陶搪瓷杯 | clay+enamel cups + 2 recipes | `feat(shop): A0218 粗陶杯搪瓷杯与两道新配方` |
| A0219 | completed | art | 雪灯常走图标 | icon-snow star-path unique PNGs | `art(ui): A0219 雪灯与常走小路独特图标` |
| A0220 | completed | test | 图标回归 | 125 tests pass | `art(ui): A0219 雪灯与常走小路独特图标` |
| A0221 | completed | docs | 续作卡213 | resume 213 | `docs(autodev): A0221 续作卡 authentic 213` |
| A0222 | completed | content | 事件至267则 | 267 unique events | `content(events): A0222 晚间 vignette 至二六七则` |
| A0223 | completed | feat | 熟土记忆收获 | harvestCount memoryBonus + root_memory | `feat(garden): A0223 熟土记忆收获加成与常客老样子` |
| A0224 | completed | feat | 常客老样子复刻 | lastCraftByGuest + recall UI + order_keeper | `feat(garden): A0223 熟土记忆收获加成与常客老样子` |
| A0225 | completed | feat | 晨桥薄雾主题 | dawn_bridge 17th theme + mist FX | `feat(walk): A0224 晨桥薄雾主题与枇杷叶` |
| A0226 | completed | content | 枇杷叶与配方 | loquat_leaf + 晨桥柚茶 熟土蜜桃罐 | `feat(walk): A0224 晨桥薄雾主题与枇杷叶` |
| A0227 | completed | content | 熟土老样子事件 | 275 events + memory mail | `feat(walk): A0224 晨桥薄雾主题与枇杷叶` |
| A0228 | completed | test | 记忆复刻回归 | 127 tests pass | `test(core): A0225 熟土记忆与复刻配方回归` |
| A0229 | completed | feat | 紫苏养成 | perilla plant+flavor+recipe+customer | `feat(garden): A0229 紫苏可种植与手册同步熟土老样子` |
| A0230 | completed | docs | 手册熟土老样子 | USER_MANUAL memory+recall+dawn | `feat(garden): A0229 紫苏可种植与手册同步熟土老样子` |
| A0231 | completed | test | 紫苏手册回归 | 128 tests pass | `feat(garden): A0229 紫苏可种植与手册同步熟土老样子` |
| A0232 | completed | feat | 云台慢坡主题 | cloud_pass 18th + cloud FX | `feat(walk): A0232 云台慢坡主题与云影特效` |
| A0233 | completed | content | 事件至283则 | 283 unique evening events | `feat(walk): A0232 云台慢坡主题与云影特效` |
| A0234 | completed | test | 云台主题回归 | 129 tests pass | `feat(walk): A0232 云台慢坡主题与云影特效` |
| A0235 | completed | content | 文案信箱扩充 | tips 32 mail 49 dialogues 28 | `content(world): A0235 文案信箱与手册同步云台` |
| A0236 | completed | docs | 手册云台 | USER_MANUAL cloud_pass | `content(world): A0235 文案信箱与手册同步云台` |
| A0237 | completed | feat | 今日第一脚奖励 | claimFirstWalkBonus once/day + early_walker | `feat(walk): A0237 今日第一脚出门奖励与砚台石` |
| A0238 | completed | content | 小砚台石 | ink_stone collectible book_yard bias | `feat(walk): A0237 今日第一脚出门奖励与砚台石` |
| A0239 | completed | test | 第一脚回归 | 130 tests pass | `feat(walk): A0237 今日第一脚出门奖励与砚台石` |
| A0240 | completed | docs | 手册第一脚 | USER_MANUAL first walk bonus | `docs(manual): A0240 手册同步今日第一脚与相关文案` |
| A0241 | completed | content | 事件至291则 | 291 unique evening events | `docs(manual): A0240 手册同步今日第一脚与相关文案` |
| A0242 | completed | content | 新客人与配方 | 41 customers; 云台花香罐 | `content(shop): A0242 两位新客人与云台花香罐` |
| A0243 | completed | feat | 小名对话手帐 | talk with nickname appends journal | `content(shop): A0242 两位新客人与云台花香罐` |
| A0244 | completed | test | 客人配方回归 | 131 tests pass | `content(shop): A0242 两位新客人与云台花香罐` |
| A0245 | completed | feat | 百里香养成 | thyme plant+flavor+recipe | `feat(garden): A0245 百里香可种植与田园罐配方` |
| A0246 | completed | test | 百里香回归 | 132 tests pass | `feat(garden): A0245 百里香可种植与田园罐配方` |
| A0247 | completed | content | 事件至301则 | 301 unique evening events | `content(events): A0247 事件至三零一则与百里香来信` |
| A0248 | completed | content | 信箱50封 | mail 50 including thyme | `content(events): A0247 事件至三零一则与百里香来信` |
| A0249 | completed | audio | 第一脚音效 | first walk unlock sfx | `docs(test): A0249 真实测试报告与第一脚音效` |
| A0250 | completed | docs | 测试报告241 | TEST_REPORT 132 pass authentic 241 | `docs(test): A0249 真实测试报告与第一脚音效` |
| A0251 | completed | feat | 潮间小湾主题 | tide_pool 19th + ripple FX | `feat(walk): A0251 潮间小湾主题与涟漪特效` |
| A0252 | completed | test | 潮间主题回归 | 133 tests pass | `feat(walk): A0251 潮间小湾主题与涟漪特效` |
| A0253 | completed | fix | 事件标题去重 | dedupe 继续走; 306 unique titles | `fix(events): A0253 去重晚间标题并同步潮间手册` |
| A0254 | completed | docs | 手册潮间 | USER_MANUAL tide_pool | `fix(events): A0253 去重晚间标题并同步潮间手册` |
| A0255 | completed | feat | 海盐晶装饰 | salt_crystal topping + 潮湾盐汽水 | `feat(shop): A0255 海盐晶装饰与潮湾盐汽水` |
| A0256 | completed | test | 海盐配方回归 | 134 tests pass | `feat(shop): A0255 海盐晶装饰与潮湾盐汽水` |
| A0257 | completed | content | 海盐事件 | 309 unique evening events | `content(events): A0257 海盐 vignette 与路线图锚点` |
| A0258 | completed | docs | 路线图锚点249 | ROADMAP A0257 anchor | `content(events): A0257 海盐 vignette 与路线图锚点` |
| A0259 | completed | feat | 小路里程贴纸 | PATH_MILESTONES 5/15/30/50 stickers | `feat(walk): A0259 小路里程贴纸 5/15/30/50` |
| A0260 | completed | test | 贴纸回归 | 135 tests pass | `feat(walk): A0259 小路里程贴纸 5/15/30/50` |
| A0261 | completed | docs | 手册贴纸 | USER_MANUAL stickers | `docs(manual): A0261 手册同步小路贴纸与续作卡` |
| A0262 | completed | feat | 莳萝养成 | dill plant+flavor+recipe+customer | `feat(garden): A0262 莳萝可种植与田园陶配方` |
| A0263 | completed | test | 莳萝回归 | 136 tests pass | `feat(garden): A0262 莳萝可种植与田园陶配方` |
| A0264 | completed | content | 事件至319则 | 319 unique evening events | `content(events): A0264 事件三一九则与莳萝贴纸来信` |
| A0265 | completed | content | 莳萝贴纸信 | mail 52 | `content(events): A0264 事件三一九则与莳萝贴纸来信` |
| A0266 | completed | feat | 水壶扩容 | upgradeWateringCan max 8 | `feat(garden): A0266 水壶扩容升级至八格` |
| A0267 | completed | test | 扩容回归 | 137 tests pass | `feat(garden): A0266 水壶扩容升级至八格` |
