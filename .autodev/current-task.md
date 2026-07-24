# A0472+ 香草 / 可可 · 三大系统

## 问题
真实轮次 464/1000；需继续 authentic 养成+散步+小店增量。

## 计划
1. content-extra: vanilla, cocoa plantables + flavors + customers
2. path-themes: vanilla_lane, cocoa_courtyard
3. recipes/mail/evening-events
4. core achievements + season bonuses
5. game.js weather FX
6. tests + USER_MANUAL + sync + QG + Alibaba commits + ledger

## 验收
- plantSeed vanilla/cocoa ok
- themes ≥74 unique
- tests pass, quality-gate PASS, spam DISABLED
- authentic-rounds.jsonl append

## 测试
`node Web004/tests/run.js && node Web004/tools/quality-gate.js`
