# 架构与产品决策

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-07-24 | 纯逻辑在 `Web004/js/core.js`，DOM 在 `game.js` | 可单测、可 file:// |
| 2026-07-24 | `data/*` 经 `sync-runtime-data.js` 生成 `content-extra.js` + `game-data.js` | 避免 JSON 与运行时脱节 |
| 2026-07-24 | 进度仅计 integrated 轮次（改 shipped 文件） | 对抗空转 commit |
| 2026-07-24 | 小清新莫兰迪 UI，中文文案 | 毕业设计展示气质 |

## 2026-07-23 会话决策
- 坚持 authentic-only 计数；spam 引擎保持 DISABLED
- 三大系统并行扩展：水壶/常客/速写/常走主题/图鉴筛选
- 晚间事件手写扩充至 250+，禁止 #N 模板
- 路径主题数据驱动至 16 种，各配天气粒子
- 植物/风味用唯一 id（honeysuckle, yuzu, sage…）而非 round 后缀垃圾条目
