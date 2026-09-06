# Math Stars

Pre-K to grade 5 math practice, one tap at a time.

**Play:** https://pradhanmantrielectionsgame.github.io/math-stars/

## How to play

One sum on screen, four big answers, tap the right one.

A **set** is ten sums at your level.

- Right on the first tap → a gold star. Ten stars moves you up a level.
- Wrong tap → the button greys out and you lose a heart, but you keep tapping
  until you find the answer. Getting there by elimination earns no star.
- Three missed sums in a set → drop back a level and start the set over. On the
  first level there is nowhere to fall, so the hearts just refill.

Eleven levels, pre-K counting through grade 5 mixed operations and negative
answers. `‹ ›` set the level by hand for a parent who knows where the kid
actually is. Progress is saved on the device.

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
