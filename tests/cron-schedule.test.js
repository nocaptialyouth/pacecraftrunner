'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vercel=require('../vercel.json');
const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/daily-marathon-online.yml'),'utf8');
test('race schedule importer runs daily at 09:00 KST via GitHub Actions',()=>{
 assert.match(workflow,/cron:\s*'0 0 \* \* \*'/);
 assert.match(workflow,/node scripts\/sync-marathon-online\.js/);
 assert.equal(vercel.crons,undefined);
});
