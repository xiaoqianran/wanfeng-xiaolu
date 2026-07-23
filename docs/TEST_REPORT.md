# 测试报告

- 时间：2026-07-23T20:49:25.295652+00:00
- 命令：`cd Web004 && node tests/run.js`
- 结果：真实运行输出如下

```
晚风小路 unit tests (shipped js/core.js)

  ✓ defaultState has bag, pots, no combat fields
  ✓ addItem/takeItem/hasItem/bagCount
  ✓ plantSeed and tend growth/harvest
  ✓ scoreDrink rewards matching customer prefs
  ✓ serveDrink consumes materials and records drinksMade
  ✓ serialize/deserialize roundtrip preserves bag
  ✓ settleOfflineGrowth advances plant growth
  ✓ mergeCatalog adds extra items
  ✓ assertNoCombat rejects combat copy
  ✓ discovery tracks first pickup
  ✓ index.html uses relative script/style and loads core
  ✓ extra craft fixtures from iteration rounds exercise scoreDrink
  ✓ extra bag ops mutate shipped state
  ✓ asset hero/garden/shop images exist on disk
  ✓ content-extra.js defines WanfengExtra for file:// merge
  ✓ advanceSeason cycles and journals
  ✓ evaluateAchievements unlocks first_walk
  ✓ season art paths exist for all seasons
  ✓ index wires season achievements journal screens
  ✓ game-data.js is loaded bundle matching data configs
  ✓ content-extra.js stays in sync with content-extra.json items
  ✓ game.js consumes WanfengGameData configs
  ✓ no 1x1 placeholder PNGs claimed as live stage art in manifest
  ✓ settings update and export/import save roundtrip
  ✓ audio module exports play without throwing when silent
  ✓ settings and tutorial markup ship in index
  ✓ daily goals evaluate and claim reward once
  ✓ createDemoState seeds showcase without combat fields
  ✓ no live_ duplicate art files remain
  ✓ unique UI icons exist with distinct byte sizes
  ✓ garden/walk/shop copy has no round-id spam pattern
  ✓ template spam engine is disabled
  ✓ evening events data is unique and loaded in game-data
  ✓ authentic ledger exists and is source of truth format

Result: 34 passed, 0 failed

```

未进行伪造的用户调研或帧率测试；浏览器截图若环境无 Playwright 则见 browser-unavailable 记录。
