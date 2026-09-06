import test from 'node:test';
import assert from 'node:assert/strict';
import {tap} from './logic.mjs';

// One check per rule that could plausibly break. Not one per function.
test('tap increments the score', () => {
  assert.equal(tap(0), 1);
  assert.equal(tap(41), 42);
});
