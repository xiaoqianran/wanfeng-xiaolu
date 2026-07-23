# 架构与产品决策

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-07-24 | 纯逻辑在 `Web004/js/core.js`，DOM 在 `game.js` | 可单测、可 file:// |
| 2026-07-24 | `data/*` 经 `sync-runtime-data.js` 生成 `content-extra.js` + `game-data.js` | 避免 JSON 与运行时脱节 |
| 2026-07-24 | 进度仅计 integrated 轮次（改 shipped 文件） | 对抗空转 commit |
| 2026-07-24 | 小清新莫兰迪 UI，中文文案 | 毕业设计展示气质 |
