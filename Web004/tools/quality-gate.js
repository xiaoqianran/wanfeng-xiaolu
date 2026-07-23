#!/usr/bin/env node
/** Graduation quality gate — real checks, no fiction */
const fs=require('fs');const path=require('path');const {spawnSync}=require('child_process');
const root=path.join(__dirname,'..');
const fails=[];
function ok(c,m){ if(!c) fails.push(m); }
ok(fs.existsSync(path.join(root,'index.html')),'index missing');
ok(fs.existsSync(path.join(root,'js/core.js')),'core missing');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
ok(html.includes('js/core.js')&&html.includes('game.js'),'scripts');
ok(!html.includes('type="module"'),'modules break file://');
const t=spawnSync('node',[path.join(root,'tests/run.js')],{encoding:'utf8'});
ok(t.status===0,'unit tests failed');
const lives=[];
function walk(d){ for(const f of fs.readdirSync(d,{withFileTypes:true})){ const p=path.join(d,f.name); if(f.isDirectory()) walk(p); else if(/live_.*\.jpg$/i.test(f.name)) lives.push(p);} }
walk(path.join(root,'assets'));
ok(lives.length===0,'live_ copies present');
const rr=fs.readFileSync(path.join(root,'tools/run-rounds.js'),'utf8');
ok(/DISABLED/.test(rr),'spam engine not disabled');
const auth=fs.readFileSync(path.join(root,'progress/authentic-rounds.jsonl'),'utf8').trim().split('\n').filter(Boolean);
ok(auth.length>=1,'no authentic ledger');
console.log(t.stdout);
if(fails.length){ console.error('QUALITY GATE FAIL:\n- '+fails.join('\n- ')); process.exit(1);} 
console.log('QUALITY GATE PASS', {authenticRows:auth.length});
