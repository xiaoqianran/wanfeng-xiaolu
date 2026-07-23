# Current task

## Round
A0021

## Goal
小路主题选择：玩家可选枫径/河畔/竹影/星光，影响 canvas 天空色、拾取偏向与氛围文案。

## Files
- Web004/data/path-themes.json
- Web004/js/core.js (theme helpers + state)
- Web004/js/game-data.js (via sync)
- Web004/tools/sync-runtime-data.js
- Web004/game.js (UI + drawWalk)
- Web004/index.html
- Web004/styles.css
- Web004/tests/run.js

## Test
cd Web004 && node tests/run.js && node tools/quality-gate.js

## Rollback
git revert A0021 commit
