#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const jsonl = path.join(__dirname, "..", "progress", "rounds.jsonl");
const lines = fs.existsSync(jsonl)
  ? fs.readFileSync(jsonl, "utf8").trim().split("\n").filter(Boolean)
  : [];
const rounds = lines.map((l) => JSON.parse(l));
const completed = rounds.filter((r) => r.status === "completed");
const ids = completed.map((r) => r.round);
const unique = new Set(ids);
const emptyOutcome = completed.filter((r) => !r.outcome || !String(r.outcome).trim());
console.log(
  JSON.stringify(
    {
      totalLines: lines.length,
      completed: completed.length,
      uniqueIds: unique.size,
      maxRound: ids.length ? Math.max(...ids) : 0,
      emptyOutcomes: emptyOutcome.length,
      sample: completed.slice(0, 5).map((r) => r.round),
    },
    null,
    2
  )
);
if (completed.length < 1000) process.exitCode = 2;
