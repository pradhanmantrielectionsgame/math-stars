import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS, STARS_PER_LEVEL, HEARTS_PER_SET, DEMOTIONS_ALLOWED, GRADES,
        makeQuestion, makeChoices, advance, newRun} from './logic.mjs';

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

const tap = (state, ...outcomes) => outcomes.reduce((st, o) => advance(st, o), state);

test('ten right answers promote and start a fresh set', () => {
  const s = tap(newRun(0), ...Array(STARS_PER_LEVEL).fill('right'));
  assert.equal(s.level, 1);
  assert.deepEqual(s.stars, []);
  assert.equal(s.hearts, HEARTS_PER_SET);
  assert.equal(s.change, 1);
});

test('hearts carry from one sum to the next, never resetting per sum', () => {
  let s = newRun(4);
  s = advance(s, 'wrong');                 // one bad tap on the first sum
  s = advance(s, 'right', 2);              // then get it, silver
  assert.equal(s.hearts, HEARTS_PER_SET - 1, 'the heart stays spent into the next sum');
  s = advance(s, 'right');                 // a clean sum does not hand it back
  assert.equal(s.hearts, HEARTS_PER_SET - 1);
});

test('a star remembers how many taps it took, capped at bronze', () => {
  let s = newRun(3);
  for (const tries of [1, 2, 3, 9]) s = advance(s, 'right', tries);
  assert.deepEqual(s.stars, [1, 2, 3, GRADES]);
});

// game.mjs emits one 'wrong' per tap, so a run of wrong taps on a single sum
// and the same run spread over several sums are one sequence — that's the point.
test('a full set of wrong taps demotes, however they are spread', () => {
  const wrongs = Array(HEARTS_PER_SET).fill('wrong');
  const s = tap({level: 4, stars: [1, 1, 2], hearts: HEARTS_PER_SET, demotions: 0}, ...wrongs);
  assert.equal(s.level, 3, 'should have dropped a level');
  assert.deepEqual(s.stars, [], 'the set restarts');
  assert.equal(s.hearts, HEARTS_PER_SET);
  assert.equal(s.change, -1);
});

test('brute forcing cannot reach the tenth star', () => {
  // One guess per sum runs the heart budget out before the set can finish.
  let s = {level: 4, stars: [], hearts: HEARTS_PER_SET, demotions: 0};
  for (let sum = 0; sum < STARS_PER_LEVEL; sum++) {
    s = tap(s, 'wrong');                 // one wrong guess per sum, then the answer
    if (s.change === -1) break;
    s = advance(s, 'right', 2);
  }
  assert.equal(s.change, -1, 'guessing once per sum still demotes before the set ends');
});

test('two demotions end the run', () => {
  const wrongs = Array(HEARTS_PER_SET * DEMOTIONS_ALLOWED).fill('wrong');
  const s = tap({level: 5, stars: [1, 1], hearts: HEARTS_PER_SET, demotions: 0}, ...wrongs);
  assert.equal(s.level, 3);
  assert.equal(s.demotions, DEMOTIONS_ALLOWED);
  assert.equal(s.over, true);
});

test('moving back up clears the demotion count', () => {
  let s = tap(newRun(5), ...Array(HEARTS_PER_SET).fill('wrong'));
  assert.equal(s.demotions, 1);
  s = tap(s, ...Array(STARS_PER_LEVEL).fill('right'));
  assert.equal(s.level, 5);
  assert.equal(s.demotions, 0);
  assert.equal(s.over, false);
});

test('the first level loses the set too — the refill is never free', () => {
  const s = tap(newRun(0), ...Array(HEARTS_PER_SET).fill('wrong'));
  assert.equal(s.level, 0, 'there is nowhere below the first level');
  assert.deepEqual(s.stars, [], 'but the set is still lost');
  assert.equal(s.demotions, 1, 'and it still counts against the run');
  assert.equal(s.change, -1, 'so the board locks and the cooldown runs');
});

test('running the hearts out never hands back a star on the next tap', () => {
  // The hole this closes: tap every wrong button, get the refill, then collect
  // a bronze star on the only button left.
  let s = {level: 0, stars: [1, 1], hearts: 1, demotions: 0};
  s = advance(s, 'wrong');
  assert.equal(s.change, -1, 'the set ends on that tap, it does not carry on');
  assert.deepEqual(s.stars, []);
});

test('the last level does not promote past the end', () => {
  const last = LEVELS.length - 1;
  const nearly = Array(STARS_PER_LEVEL - 1).fill(1);
  const s = advance({level: last, stars: nearly, hearts: HEARTS_PER_SET, demotions: 0}, 'right');
  assert.equal(s.level, last);
  assert.equal(s.stars.length, STARS_PER_LEVEL, 'the last level just keeps filling');
  assert.equal(s.change, 0);
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
