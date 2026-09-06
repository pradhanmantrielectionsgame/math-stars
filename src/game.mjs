/** DOM glue for Math Stars. Rules live in logic.mjs. */
import {haptic, storage, audio, onPause, registerSW} from './kit.mjs';
import {LEVELS, STARS_PER_LEVEL, HEARTS_PER_SET, makeQuestion, makeChoices, advance} from './logic.mjs';

const store = storage('math-stars');
const sfx = audio(store);
const $ = s => document.querySelector(s);
const buttons = [...document.querySelectorAll('#choices button')];

let state = {
  level: store.get('level', 0),
  stars: store.get('stars', 0),
  hearts: store.get('hearts', HEARTS_PER_SET),
};
let q = null, locked = false, missed = false;

/** Negative answers print with a real minus sign, matching the sum above. */
const fmt = n => String(n).replace('-', '−');

const row = (n, filled, mark, pop) => Array.from({length: n}, (_, i) =>
  `<i class="${i < filled ? 'on' : ''}${pop && i === filled - 1 ? ' pop' : ''}">${mark}</i>`).join('');

/**
 * Redraw the meters. `count` is passed explicitly because the tenth star is
 * shown lit for a moment after promotion has already reset it to zero.
 */
function meters(count = state.stars, pop = false) {
  $('#stars').innerHTML = row(STARS_PER_LEVEL, count, '★', pop);
  $('#hearts').innerHTML = row(HEARTS_PER_SET, state.hearts, '♥', false);
}

function render() {
  $('#level').textContent = LEVELS[state.level].name;
  meters();
  $('#mute').textContent = sfx.muted ? '🔇' : '🔊';
  $('#q').textContent = q.text;
  $('#q').className = '';
  const choices = makeChoices(q.answer, Math.random, LEVELS[state.level].neg);
  buttons.forEach((b, i) => {
    b.dataset.value = choices[i];        // textContent is prettified, this is the number
    b.textContent = fmt(choices[i]);
    b.className = ''; b.disabled = false;
  });
}

function ask() {
  q = makeQuestion(state.level, Math.random);
  missed = false;
  render();
}

// ponytail: a wrong tap greys out and you keep going — no game over, no "the
// answer was 7". A toddler quitting in tears is the only real failure. The
// brake on tapping all four is that a recovered answer earns nothing.
function answer(btn) {
  if (locked) return;
  const correct = Number(btn.dataset.value) === q.answer;
  haptic(correct ? 8 : [8, 40, 8]);
  if (!correct) {
    btn.className = 'wrong'; btn.disabled = true;
    sfx.beep(180, .12, 'sine');
    if (!missed) {                         // a sum costs at most one heart
      missed = true;
      const before = state.level;
      state = advance(state, 'wrong');
      save();
      meters();
      if (state.level !== before) { locked = true; demote(); }
    }
    return;
  }
  locked = true;
  btn.className = 'right';
  const before = state.level;
  const filled = state.stars + 1;
  state = advance(state, missed ? 'late' : 'right');
  save();
  if (missed) {                            // right in the end, but no star for it
    $('#q').className = 'late';
    sfx.beep(440, .12, 'sine');
    setTimeout(() => { locked = false; ask(); }, 550);
    return;
  }
  $('#q').className = 'right';
  meters(filled, true);
  [660, 880].forEach((f, i) => setTimeout(() => sfx.beep(f, .1, 'sine'), i * 90));
  if (state.level !== before) {
    setTimeout(() => sfx.beep(1320, .18, 'sine'), 260);
    $('#q').className = 'party';
    $('#q').textContent = '🎉 Level up! 🎉';
  }
  setTimeout(() => { locked = false; ask(); }, state.level !== before ? 900 : 550);
}

/** Three missed sums in a set: drop a level, say so gently, start over. */
function demote() {
  $('#q').className = 'easier';
  $('#q').textContent = 'Let’s try easier';
  $('#level').textContent = LEVELS[state.level].name;
  [400, 300].forEach((f, i) => setTimeout(() => sfx.beep(f, .14, 'sine'), i * 140));
  setTimeout(() => { locked = false; ask(); }, 1100);
}

const save = () => {
  store.set('level', state.level); store.set('stars', state.stars); store.set('hearts', state.hearts);
};

const setLevel = d => {
  state = {level: Math.max(0, Math.min(LEVELS.length - 1, state.level + d)), stars: 0, hearts: HEARTS_PER_SET};
  save(); ask();
};

buttons.forEach(b => b.addEventListener('click', () => answer(b)));
$('#prev').onclick = () => setLevel(-1);
$('#next').onclick = () => setLevel(+1);
$('#mute').onclick = () => { sfx.toggle(); $('#mute').textContent = sfx.muted ? '🔇' : '🔊'; };

onPause(save);
registerSW();
ask();
