# A0048

## Goal
设置中增加「主题天气特效」开关，控制 drawWeather 显示；写入 settings 与 reduceMotion 联动。

## Files
- Web004/js/core.js (settings default)
- Web004/game.js (drawWeather gate + settings UI wire)
- Web004/index.html (checkbox)
- Web004/tests/run.js

## Test
cd Web004 && node tests/run.js && node tools/quality-gate.js
