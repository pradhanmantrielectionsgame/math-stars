# Math Stars

Pre-K to grade 5 math practice, one tap at a time.

**Play:** https://pradhanmantrielectionsgame.github.io/math-stars/

## How to play

One sum on screen, four big answers, tap the right one.

A **set** is ten sums at your level. Ten stars moves you up.

| Taps to get it right | You earn |
|---|---|
| 1 | a gold star |
| 2 | a silver star |
| 3 | a bronze star |

Every wrong tap costs a heart, and the five hearts are the budget for the
**whole set**, not for one sum — they carry from sum to sum. Run out and you
lose the set: the stars go, the board locks for five seconds, and you drop a
level. Guessing your way through is never a strategy, because the hearts run
out long before ten sums do.

**Two lost sets end the run.** The card turns red and a tap starts you again.
Moving up a level clears that count.

The first level has nowhere to fall, so there you lose the set and stay put.

Eleven levels, pre-K counting through grade 5 mixed operations and negative
answers. Right and wrong each have their own sound and buzz — rising notes and
a single tick for right, falling notes and a double buzz for wrong.
`‹ ›` set the level by hand for a parent who knows where the kid actually is.
Progress is saved on the device.

## Develop

```bash
npm run dev        # serve + LAN URL + cloudflared tunnel, both with QR codes
npm test           # run the logic self-checks
npm run release patch --push   # cut a version and deploy
```

No build step, no dependencies. `index.html` loads `src/game.mjs` directly.

- `src/logic.mjs` — pure rules, no DOM. Tested by `src/logic.test.mjs`.
- `src/game.mjs` — DOM glue.
- `src/kit.mjs` — shared input/storage/sound/share helpers (a copy, edit freely).
