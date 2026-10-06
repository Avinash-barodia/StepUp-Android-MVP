import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clock, pace, cadence, speed } from '../src/metrics.ts';
test('30 minute, 2.5 km walk has coherent units',()=>{assert.equal(clock(1800000),'30:00');assert.equal(pace(1800000,2.5),'12:00');assert.equal(speed(1800000,2.5),'5.0');assert.equal(cadence(1800000,3470),'116');});
test('pace remains unavailable with insufficient distance and rounds minute carry',()=>{assert.equal(pace(0,0),'—');assert.equal(pace(60000,0.01),'—');assert.equal(pace(599600,1),'10:00');});
test('long sessions retain hours',()=>{assert.equal(clock(3661000),'1:01:01');assert.equal(clock(-1),'00:00');assert.equal(cadence(0,0),'—');});
