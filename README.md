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

Every wrong tap costs a heart, and there are only three — three wrong taps
demote you a level, whether they land on three sums or all on the same one.
Guessing your way through is therefore never a strategy: three taps of guessing
is the whole budget for a ten-sum set.

A demotion clears the set, refills the hearts and sits out a five-second
cooldown. **Two demotions end the run** — the card turns red and a tap starts
you again at the level you fell to. Moving up a level clears the demotion count.

The first level has nowhere to fall, so there the hearts just refill.

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
