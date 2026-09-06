import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS, STARS_PER_LEVEL, makeQuestion, makeChoices, advance} from './logic.mjs';

// Deterministic-ish sweep: 2000 questions per level, every one must be sane.
test('every question a kid can meet is whole, non-negative and answerable', () => {
  for (let lvl = 0; lvl < LEVELS.length; lvl++) {
    for (let i = 0; i < 2000; i++) {
      const {text, answer} = makeQuestion(lvl, Math.random);
      assert.ok(Number.isInteger(answer), `${text} = ${answer}`);
      assert.ok(answer >= 0, `${text} = ${answer} is negative`);
      const [l, sym, r] = text.split(' ');
      const eval_ = {'+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => a / b}[sym];
      assert.equal(eval_(Number(l), Number(r)), answer, `${text} should be ${answer}`);
    }
  }
});

test('choices always offer the answer plus three distinct wrong ones', () => {
  for (const answer of [0, 1, 5, 12, 100]) {
    const c = makeChoices(answer, Math.random);
    assert.equal(c.length, 4);
    assert.equal(new Set(c).size, 4);
    assert.ok(c.includes(answer));
    assert.ok(c.every(n => n >= 0));
  }
});

test('five right answers promote, wrong ones only cost a star', () => {
  let s = {level: 0, stars: 0};
  for (let i = 0; i < STARS_PER_LEVEL; i++) s = advance(s, true);
  assert.deepEqual({level: s.level, stars: s.stars}, {level: 1, stars: 0});
  s = advance({level: 3, stars: 2}, false);
  assert.deepEqual(s, {level: 3, stars: 1, promoted: false});
  assert.deepEqual(advance({level: 3, stars: 0}, false), {level: 3, stars: 0, promoted: false});
});

test('the last level does not promote past the end', () => {
  const last = LEVELS.length - 1;
  const s = advance({level: last, stars: STARS_PER_LEVEL - 1}, true);
  assert.deepEqual(s, {level: last, stars: STARS_PER_LEVEL, promoted: false});
});
