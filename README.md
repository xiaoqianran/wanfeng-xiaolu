# 晚风小路（毕业设计展示版）

小清新日常网页游戏：**散步收集 · 窗台盆栽 · 青柠汽水铺 · 图鉴**。无战斗。

## 快速开始

浏览器直接打开：

```text
Web004/index.html
```

（相对路径资源，支持 `file://`）

在线试玩（GitHub Pages）：

https://xiaoqianran.github.io/wanfeng-xiaolu/


## 主要功能
- 小路主题：枫径 / 河畔 / 竹影 / 星光 / 草甸 / 码头
- 今日小目标（可领奖与日礼）、演示模式、信箱、足迹统计
- 设置：音效、减少动效、天气特效、存档导入导出、新的一天
- 植物小名、花盆扩展、秘密配方图鉴、季节评分加成

## 测试

```bash
cd Web004 && npm test
# 或
cd Web004 && node tests/run.js
node tools/quality-gate.js
```

同步 data → 运行时 JS：

```bash
cd Web004 && node tools/sync-runtime-data.js
```

## 进度（诚实）
仅 `Web004/progress/authentic-rounds.jsonl` 计入 authentic 轮次。  
模板刷轮已归档禁用。见 `.autodev/state.json`。

## 目录

| 路径 | 说明 |
|------|------|
| `Web004/` | 可运行游戏 |
| `Web004/js/core.js` | 纯逻辑（单测入口） |
| `docs/` | GDD / 手册 / 答辩材料 |
| `.autodev/` | 自治开发状态 |

## 许可与素材
原创代码与生成/程序化插画用于本毕业设计展示；勿使用未授权商业 IP。
