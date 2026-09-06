import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS, STARS_PER_LEVEL, HEARTS_PER_SET, makeQuestion, makeChoices, advance} from './logic.mjs';

// Deterministic-ish sweep: 2000 questions per level, every one must be sane.
test('every question a kid can meet is whole, non-negative and answerable', () => {
  for (let lvl = 0; lvl < LEVELS.length; lvl++) {
    for (let i = 0; i < 2000; i++) {
      const {text, answer} = makeQuestion(lvl, Math.random);
      assert.ok(Number.isInteger(answer), `${text} = ${answer}`);
      if (!LEVELS[lvl].neg) assert.ok(answer >= 0, `${text} = ${answer} is negative`);
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
    assert.ok(c.every(n => n >= 0), `${c} went negative on a level that forbids it`);
  }
  for (const answer of [-7, -1, 0, 3]) {          // grade 5, negatives allowed
    const c = makeChoices(answer, Math.random, true);
    assert.equal(new Set(c).size, 4);
    assert.ok(c.includes(answer));
  }
});

test('only the grade 5 levels ever go below zero', () => {
  let sawNegative = false;
  const last = LEVELS.length - 1;
  for (let i = 0; i < 5000; i++) if (makeQuestion(last, Math.random).answer < 0) sawNegative = true;
  assert.ok(sawNegative, 'the last level never produced a negative answer');
});

test('ten first-try answers promote and start a fresh set', () => {
  let s = {level: 0, stars: 0, hearts: HEARTS_PER_SET};
  for (let i = 0; i < STARS_PER_LEVEL - 1; i++) s = advance(s, 'right');
  assert.deepEqual(s, {level: 0, stars: 9, hearts: 3, change: 0});
  s = advance(s, 'right');
  assert.deepEqual(s, {level: 1, stars: 0, hearts: HEARTS_PER_SET, change: 1});
});

test('three missed sums in a set demote and start a fresh set', () => {
  let s = {level: 4, stars: 7, hearts: HEARTS_PER_SET};
  s = advance(s, 'wrong');
  assert.deepEqual(s, {level: 4, stars: 7, hearts: 2, change: 0});
  s = advance(s, 'wrong');
  assert.equal(s.hearts, 1);
  s = advance(s, 'wrong');
  assert.deepEqual(s, {level: 3, stars: 0, hearts: HEARTS_PER_SET, change: -1});
});

test('the first level refills hearts instead of demoting below itself', () => {
  let s = {level: 0, stars: 4, hearts: 1};
  s = advance(s, 'wrong');
  assert.deepEqual(s, {level: 0, stars: 4, hearts: HEARTS_PER_SET, change: 0});
});

test('an answer found by elimination pays nothing', () => {
  const s = {level: 2, stars: 6, hearts: 2};
  assert.deepEqual(advance(s, 'late'), {...s, change: 0});
});

test('the last level does not promote past the end', () => {
  const last = LEVELS.length - 1;
  const s = advance({level: last, stars: STARS_PER_LEVEL - 1, hearts: 3}, 'right');
  assert.deepEqual(s, {level: last, stars: STARS_PER_LEVEL, hearts: 3, change: 0});
});

test('addition levels honour their name — no sum over the cap', () => {
  for (let lvl = 0; lvl < LEVELS.length; lvl++) {
    const {cap} = LEVELS[lvl];
    if (!cap) continue;
    for (let i = 0; i < 3000; i++) {
      const {text, answer} = makeQuestion(lvl, Math.random);
      if (text.includes('+')) assert.ok(answer <= cap, `${text} = ${answer} > ${cap}`);
    }
  }
});
