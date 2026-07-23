# A0060

## Goal
每日小目标领取成功后，额外打开一封「日终小礼」邮件效果（从 mail 池抽一封未读，或给固定小奖励），增强日循环闭环。

## Files
- Web004/js/core.js (claimDailyReward optional gift hook or separate claimDailyGift)
- Web004/game.js (wire after claim)
- Web004/data/mail.json (optional day-end letters)
- Web004/tests/run.js

## Test
cd Web004 && node tests/run.js && node tools/quality-gate.js

## Rollback
git revert
