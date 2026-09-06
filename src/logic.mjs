/**
 * Pure rules for Math Stars — no DOM, no timers, randomness passed in as rnd().
 *
 * A level is a set of number ranges plus the operators it may use. Division is
 * built backwards (a*b ÷ b) so every answer is a whole number.
 */

/** @typedef {{name:string, ops:string, a:[number,number], b:[number,number], cap?:number, neg?:boolean}} Level */

/**
 * Ten levels, pre-K to grade 5, in the order a kid meets them at school.
 * `cap` limits the total of an addition so a level named "add to 10" means it.
 * `neg` lets subtraction run past zero — grade 5 only, everywhere else the
 * smaller number is subtracted from the larger one.
 * Ranges are wide on purpose — a kid should not meet the same sum twice in a
 * row. The narrowest level (pre-K) still holds ten distinct questions.
 */
export const LEVELS = /** @type {Level[]} */ ([
  {name: 'Pre-K · Add to 5',      ops: '+',    a: [1, 4],   b: [1, 4],   cap: 5},
  {name: 'Kinder · Add to 10',    ops: '+',    a: [1, 9],   b: [1, 9],   cap: 10},
  {name: 'Kinder · Take away',    ops: '-',    a: [2, 12],  b: [1, 10]},
  {name: 'Grade 1 · Add to 20',   ops: '+-',   a: [1, 15],  b: [1, 12],  cap: 20},
  {name: 'Grade 2 · Two digits',  ops: '+-',   a: [10, 90], b: [10, 89]},
  {name: 'Grade 3 · Times 1-5',   ops: '*',    a: [1, 5],   b: [1, 10]},
  {name: 'Grade 3 · Times 1-10',  ops: '*',    a: [2, 10],  b: [2, 10]},
  {name: 'Grade 4 · Sharing',     ops: '/',    a: [2, 10],  b: [2, 10]},
  {name: 'Grade 4 · Mixed',       ops: '*/',   a: [2, 12],  b: [2, 12]},
  {name: 'Grade 5 · Below zero',  ops: '+-',   a: [1, 30],  b: [1, 30],  neg: true},
  {name: 'Grade 5 · Everything',  ops: '+-*/', a: [2, 12],  b: [2, 99],  neg: true},
]);

/** A set is ten sums: fill the stars to move up, lose the hearts to move down. */
export const STARS_PER_LEVEL = 10;
export const HEARTS_PER_SET = 3;
const SYM = {'+': '+', '-': '−', '*': '×', '/': '÷'};

const pick = (rnd, [lo, hi]) => lo + Math.floor(rnd() * (hi - lo + 1));

/**
 * Build one question for a level.
 * @param {number} level index into LEVELS (clamped)
 * @param {() => number} rnd returns [0,1)
 * @returns {{text: string, answer: number}}
 */
export function makeQuestion(level, rnd) {
  const L = LEVELS[Math.max(0, Math.min(level, LEVELS.length - 1))];
  const op = L.ops[Math.floor(rnd() * L.ops.length)];
  let a = pick(rnd, L.a), b = pick(rnd, L.b);

  // ponytail: × and ÷ get the small range whatever the level says — 12 × 99 is
  // not the same skill as 12 + 99, and a toddler shouldn't meet it.
  if (op === '*' || op === '/') b = Math.min(b, 12);
  if (op === '+' && L.cap) b = Math.min(b, Math.max(1, L.cap - a));
  if (op === '-' && b > a && !L.neg) [a, b] = [b, a];

  const left = op === '/' ? a * b : a;
  const answer = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a;
  return {text: `${left} ${SYM[op]} ${b}`, answer};
}

/**
 * Four tappable answers: the right one plus three near misses, shuffled.
 * @param {number} answer the correct value
 * @param {() => number} rnd returns [0,1)
 * @param {boolean} [neg] allow negative wrong answers (grade 5 levels only)
 * @returns {number[]} four distinct numbers, one of them `answer`
 */
export function makeChoices(answer, rnd, neg = false) {
  const offsets = Math.abs(answer) > 20 ? [1, -1, 2, -2, 10, -10] : [1, -1, 2, -2, 3, -3];
  const wrong = [...new Set(offsets.map(d => answer + d))].filter(n => (neg || n >= 0) && n !== answer);
  for (let i = wrong.length - 1; i > 0; i--) {          // Fisher-Yates
    const j = Math.floor(rnd() * (i + 1));
    [wrong[i], wrong[j]] = [wrong[j], wrong[i]];
  }
  const out = [answer, ...wrong.slice(0, 3)];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Score one answer and return the new state.
 *
 * A set is ten sums at the current level. Each sum is worth one star if it is
 * right on the first tap, and costs one heart if it is not — however many wrong
 * buttons get tapped afterwards, a sum can only ever cost one heart.
 *
 * - `'right'` — first tap correct: +1 star. Ten stars promotes and starts a new set.
 * - `'late'`  — correct only after a wrong tap: nothing at all. The heart is
 *   already gone, and getting there by elimination never pays.
 * - `'wrong'` — the first wrong tap on a sum: −1 heart. Three demotes and
 *   starts a new set, except on the first level, where the hearts just refill.
 *
 * @param {{level:number, stars:number, hearts:number}} state
 * @param {'right'|'late'|'wrong'} outcome
 * @returns {{level:number, stars:number, hearts:number, change:-1|0|1}}
 */
export function advance({level, stars, hearts}, outcome) {
  if (outcome === 'wrong') {
    if (hearts > 1) return {level, stars, hearts: hearts - 1, change: 0};
    if (level === 0) return {level, stars, hearts: HEARTS_PER_SET, change: 0};  // nowhere down to go
    return {level: level - 1, stars: 0, hearts: HEARTS_PER_SET, change: -1};
  }
  if (outcome !== 'right') return {level, stars, hearts, change: 0};
  if (stars + 1 >= STARS_PER_LEVEL && level < LEVELS.length - 1)
    return {level: level + 1, stars: 0, hearts: HEARTS_PER_SET, change: 1};
  return {level, stars: Math.min(stars + 1, STARS_PER_LEVEL), hearts, change: 0};
}
