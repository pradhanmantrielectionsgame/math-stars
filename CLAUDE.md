# Math Stars

Shared rules for every game live one level up in `Samits-Games/CLAUDE.md` and are
inherited automatically. Only game-specific facts belong in this file.

Keep this file under ~100 lines. Long-form design notes go in `docs/`.

## What this game is

Pre-K to grade 5 math practice, one tap at a time.

## Rules that aren't obvious from the code

- Eleven levels in `LEVELS` (logic.mjs), pre-K to grade 5.
- A **set** is `STARS_PER_LEVEL` (10) sums. `state.stars` is not a count but a
  list of how many taps each won sum took: 1 gold, 2 silver, 3 bronze. Ten
  entries promotes and clears the demotion count.
- Every wrong tap costs a heart. `HEARTS_PER_SET` (3) gone demotes, clears the
  set, and costs a 5s cooldown; `DEMOTIONS_ALLOWED` (2) ends the run. Level 0
  refills the hearts instead of demoting.
- Because hearts are per-set and not per-sum, a bronze star is only reachable
  at the start of a set — two wrong taps leave one heart, and the next wrong
  tap anywhere demotes. That is intended: guessing is not a strategy.
- Division is generated backwards (`a*b ÷ b`) so answers are always whole.
- `cap` on a level limits an addition's total, so "Add to 10" means it.
  `neg` (grade 5 only) lets subtraction run past zero.
- `×` and `÷` cap the right-hand operand at 12 even on the last level, whose
  range goes to 99 for `+ -`. Times tables stop at 12; addition doesn't.
- No timer and no clock on a sum. The only pressure is the hearts.

## Gotchas

- Answer buttons carry the number in `dataset.value`; `textContent` is
  prettified (real minus sign), so never parse the label.
- The four buttons are fixed markup in `index.html` and `makeChoices` always
  returns exactly four values. Change one and change the other.
- `haptic` in kit.mjs is edited from the template: iOS Safari ignores
  `navigator.vibrate`, so it falls back to clicking a hidden `switch` input,
  which Safari 17.4+ answers with a taptic tick. It only works inside the user
  gesture, which is why `feedback()` is called straight from the tap handler.
- `onPause` saves on `pagehide`, so clearing localStorage and reloading in the
  same breath writes the old state straight back. Change the level with
  `‹ ›` instead.
- Saves from before graded stars held a number in `stars`; game.mjs falls back
  to `[]` when it isn't an array.
