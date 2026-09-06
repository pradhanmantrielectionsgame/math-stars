/**
 * Pure game rules for Math Stars — no DOM, no timers, no randomness that
 * isn't passed in. Everything here is testable from node (see logic.test.mjs).
 *
 * This split is the point: DOM glue lives in game.mjs and is checked by eye,
 * rules live here and are checked by assertions.
 */

/**
 * Example rule. Replace with the real game.
 * @param {number} n current score
 * @returns {number} score after one tap
 */
export function tap(n) {
  return n + 1;
}
