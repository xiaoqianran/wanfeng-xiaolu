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
