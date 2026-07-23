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
