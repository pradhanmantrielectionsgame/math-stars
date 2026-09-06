/**
 * Pure rules for Math Stars — no DOM, no timers, randomness passed in as rnd().
 *
 * A level is a set of number ranges plus the operators it may use. Division is
 * built backwards (a*b ÷ b) so every answer is a whole number.
 */

/** @typedef {{name:string, ops:string, a:[number,number], b:[number,number]}} Level */

/** Ten levels, pre-K to grade 5, in the order a kid meets them at school. */
export const LEVELS = /** @type {Level[]} */ ([
  {name: 'Pre-K · Add to 5',      ops: '+',    a: [1, 3],  b: [1, 2]},
  {name: 'Kinder · Add to 10',    ops: '+',    a: [1, 5],  b: [1, 5]},
  {name: 'Kinder · Take away',    ops: '-',    a: [1, 10], b: [1, 5]},
  {name: 'Grade 1 · Add to 20',   ops: '+-',   a: [1, 10], b: [1, 10]},
  {name: 'Grade 2 · Two digits',  ops: '+-',   a: [10, 50], b: [10, 49]},
  {name: 'Grade 3 · Times 1-5',   ops: '*',    a: [1, 5],  b: [1, 10]},
  {name: 'Grade 3 · Times 1-10',  ops: '*',    a: [2, 10], b: [2, 10]},
  {name: 'Grade 4 · Sharing',     ops: '/',    a: [2, 10], b: [2, 10]},
  {name: 'Grade 4 · Mixed',       ops: '*/',   a: [2, 12], b: [2, 12]},
  {name: 'Grade 5 · Everything',  ops: '+-*/', a: [2, 12], b: [2, 99]},
]);

export const STARS_PER_LEVEL = 5;
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
  if (op === '-' && b > a) [a, b] = [b, a];

  const left = op === '/' ? a * b : a;
  const answer = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a;
  return {text: `${left} ${SYM[op]} ${b}`, answer};
}

/**
 * Four tappable answers: the right one plus three near misses, shuffled.
 * @param {number} answer the correct value
 * @param {() => number} rnd returns [0,1)
 * @returns {number[]} four distinct non-negative numbers, one of them `answer`
 */
export function makeChoices(answer, rnd) {
  const offsets = answer > 20 ? [1, -1, 2, -2, 10, -10] : [1, -1, 2, -2, 3, -3];
  const wrong = [...new Set(offsets.map(d => answer + d))].filter(n => n >= 0 && n !== answer);
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
 * Score one answer. Five stars promotes; a wrong answer costs one star but
 * never a level — nobody gets demoted for guessing.
 * @param {{level:number, stars:number}} state
 * @param {boolean} correct
 * @returns {{level:number, stars:number, promoted:boolean}}
 */
export function advance({level, stars}, correct) {
  if (!correct) return {level, stars: Math.max(0, stars - 1), promoted: false};
  stars += 1;
  if (stars >= STARS_PER_LEVEL && level < LEVELS.length - 1) return {level: level + 1, stars: 0, promoted: true};
  return {level, stars: Math.min(stars, STARS_PER_LEVEL), promoted: false};
}
