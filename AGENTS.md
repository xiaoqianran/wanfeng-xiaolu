# Agent 接手说明

1. 游戏根：`Web004/`，入口 `index.html`。
2. 改内容请改 `Web004/data/*` 后运行 `node tools/sync-runtime-data.js`。
3. 纯逻辑改 `js/core.js` 并跑 `node tests/run.js`。
4. 进度：`Web004/progress/rounds.jsonl` 仅记录 **integrated** 轮次；控制面见 `.autodev/state.json`。
5. 禁止战斗系统；保持 file:// 可用。
6. 本地提交用阿里规范：`type(scope): R#### 说明`。
7. 勿 push 远端除非用户明确授权。
