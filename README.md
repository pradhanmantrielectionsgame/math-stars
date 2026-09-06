# Math Stars

Pre-K to grade 5 math practice, one tap at a time.

**Play:** https://pradhanmantrielectionsgame.github.io/math-stars/

## How to play

One sum on screen, four big answers. Tap the right one. Five in a row fills the
stars and moves up a level — pre-K counting through grade 5 mixed operations,
ten levels in all. A wrong tap greys that button out and costs a star; nothing
else happens, there is no losing. `‹ ›` set the level by hand for a parent who
knows where the kid actually is. Progress is saved on the device.

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
