# 测试报告 · 晚风小路（真实运行）

- 时间：2026-07-23T22:03:49.954971+00:00
- 命令：`cd Web004 && node tests/run.js && node tools/quality-gate.js`
- 结果：**120 passed, 0 failed**
- quality-gate：**PASS**
- authentic-rounds.jsonl：**187** 行 authentic
- 模板刷轮引擎：DISABLED（`tools/run-rounds.js` 退出码 2）

## 覆盖要点
- 核心经济/种植/出杯/存档 migrate
- 季节评分、熟悉度、水壶、常客、速写、常走主题
- 路径主题唯一性、晚间事件唯一性（≥150，现 202+）
- 内容-extra 与 JSON 同步
- 反战斗文案、反 #N 模板标题

## 未覆盖 / 已知限制
- Playwright 浏览器自动化不稳定（见 known_failures）
- 图像生成 API 间歇不可用

数据为真实本机 Node 运行结果，非捏造。
