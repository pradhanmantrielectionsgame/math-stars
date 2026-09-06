# Math Stars

Shared rules for every game live one level up in `Samits-Games/CLAUDE.md` and are
inherited automatically. Only game-specific facts belong in this file.

Keep this file under ~100 lines. Long-form design notes go in `docs/`.

## What this game is

Pre-K to grade 5 math practice, one tap at a time.

## Rules that aren't obvious from the code

- Ten levels in `LEVELS` (logic.mjs), pre-K to grade 5. Promotion is 5 correct
  in a row; a wrong answer costs one star but never demotes a level.
- Division is generated backwards (`a*b ÷ b`) so answers are always whole.
- `×` and `÷` cap the right-hand operand at 12 even on the grade 5 level, whose
  range goes to 99 for `+ -`. Times tables stop at 12; addition doesn't.
- Wrong answers grey out and you keep guessing. There is no game over screen,
  no timer, no score — deliberate, the audience is a toddler.

## Gotchas

- The four answer buttons are fixed markup in `index.html`; `makeChoices`
  always returns exactly four values. Change one and change the other.
