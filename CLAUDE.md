# Math Stars

Shared rules for every game live one level up in `Samits-Games/CLAUDE.md` and are
inherited automatically. Only game-specific facts belong in this file.

Keep this file under ~100 lines. Long-form design notes go in `docs/`.

## What this game is

Pre-K to grade 5 math practice, one tap at a time.

## Rules that aren't obvious from the code

- Eleven levels in `LEVELS` (logic.mjs), pre-K to grade 5.
- A **set** is `STARS_PER_LEVEL` (10) sums. First-try correct earns a star; ten
  stars promotes. A missed sum costs one heart; `HEARTS_PER_SET` (3) gone
  demotes and restarts the set. Level 0 refills the hearts instead.
- A sum costs at most one heart however many wrong buttons get tapped — the
  `missed` flag in game.mjs enforces that, `advance` only ever sees the first
  wrong tap of a sum. This is what makes brute-forcing a pure loss: the
  recovered answer scores `'late'`, which is worth nothing.
- Division is generated backwards (`a*b ÷ b`) so answers are always whole.
- `cap` on a level limits an addition's total, so "Add to 10" means it.
  `neg` (grade 5 only) lets subtraction run past zero.
- `×` and `÷` cap the right-hand operand at 12 even on the last level, whose
  range goes to 99 for `+ -`. Times tables stop at 12; addition doesn't.
- No game over, no timer, no score. The audience is a toddler.

## Gotchas

- Answer buttons carry the number in `dataset.value`; `textContent` is
  prettified (real minus sign), so never parse the label.
- The four buttons are fixed markup in `index.html` and `makeChoices` always
  returns exactly four values. Change one and change the other.
- `onPause` saves on `pagehide`, so clearing localStorage and reloading in the
  same breath writes the old state straight back. Change the level with
  `‹ ›` instead.
