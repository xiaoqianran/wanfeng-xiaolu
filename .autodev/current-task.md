# A0083

## Goal
Plant soft "rest" action: when plant exists, rest recovers mood slightly without advancing growth much; unique rest lines; no death/combat.

## Files
- Web004/js/core.js (tend act "rest")
- Web004/game.js (button + toast)
- Web004/index.html if needed
- Web004/tests/run.js
- Web004/data/garden-config.json (restLines)

## Test
cd Web004 && node tests/run.js && node tools/quality-gate.js
