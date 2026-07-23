# 技术架构

```
index.html
  ├─ styles.css + css/expansions.css
  ├─ js/core.js          # 纯逻辑 UMD（Node 可测）
  ├─ js/content-extra.js # data/content-extra.json 同步
  ├─ js/game-data.js     # walk/garden/shop/ui 等配置同步
  ├─ js/audio.js         # WebAudio 合成音
  └─ game.js             # DOM / Canvas
```

- 存档：`localStorage` + `Core.serialize/deserialize`  
- 同步：`node tools/sync-runtime-data.js`  
- 测试：`node tests/run.js`  
- 反刷轮：`tools/run-rounds.js` 已 DISABLED  
