# 晚风小路（毕业设计展示版）

小清新日常网页游戏：**散步收集 · 窗台盆栽 · 青柠汽水铺 · 图鉴**。无战斗。

## 快速开始

浏览器直接打开：

```text
Web004/index.html
```

（相对路径资源，支持 `file://`）

## 测试

```bash
cd Web004 && npm test
# 或
cd Web004 && node tests/run.js
```

同步 data → 运行时 JS：

```bash
cd Web004 && node tools/sync-runtime-data.js
```

## 目录

| 路径 | 说明 |
|------|------|
| `Web004/` | 可运行游戏 |
| `Web004/js/core.js` | 纯逻辑（单测入口） |
| `Web004/js/game-data.js` | data/* 同步产物 |
| `docs/` | GDD / 路线图 / 假设 |
| `.autodev/` | 自治开发状态与 backlog |

## 许可与素材

原创代码与生成插画用于本毕业设计展示；勿使用未授权商业 IP。
