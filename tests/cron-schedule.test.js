'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../vercel.json');
test('race discovery cron runs every day at 09:00 KST (00:00 UTC)',()=>{
  assert.equal(config.crons.length,1);
  assert.deepEqual(config.crons[0],{path:'/api/cron-races',schedule:'0 0 * * *'});
});
