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
- Every wrong tap costs a heart. `HEARTS_PER_SET` (5) is the budget for the
  whole **set**, not for a sum — hearts carry from one sum to the next and come
  back only on a demotion, a promotion or a level change. Running out clears
  the set, costs a 5s cooldown, and counts a demotion; `DEMOTIONS_ALLOWED` (2)
  ends the run.
- Five is the smallest budget that lets both grades and demotions exist: a
  bronze star costs two hearts by itself, so at three there was no room to earn
  one and still be at risk. Change it and check both still work.
- Level 0 loses the set exactly like any other level, it just doesn't drop.
  The old "refill instead of demoting" branch was a hole: tap all three wrong
  buttons, get full hearts back, then collect a bronze on the only one left.
  game.mjs keys off `state.change`, never `state.level !== before`, because at
  level 0 a lost set doesn't change the level number.
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
- `scripts/make-icons.mjs` has diverged from the template on purpose: it paints
  a gold star with a plus knocked out, on blue, rather than a flat tile. Its
  colours are constants in that file now, not the manifest's `theme_color` —
  the icon is deliberately the answer-button blue, not the orange chrome. Grid
  of operators was the first try and read as a calculator. Nothing regenerates
  the icons automatically; re-run it by hand after editing.
- Icon URLs carry a `?v=N` in `index.html` and the manifest. iOS caches the
  home-screen icon by URL and re-adding the app does not refetch it, so a
  redrawn icon at the same path never reaches a phone that already installed
  it. Bump `N` in both files whenever the art changes.
- The star's outer radius is capped at `.41` because the manifest declares a
  maskable icon and Android crops that to a centred circle of radius `.4`.
  Grow the star past that and the points get clipped on Android.
