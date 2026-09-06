/** DOM glue for Math Stars. Rules live in logic.mjs. */
import {haptic, storage, audio, onPause, registerSW} from './kit.mjs';
import {LEVELS, STARS_PER_LEVEL, makeQuestion, makeChoices, advance} from './logic.mjs';

const store = storage('math-stars');
const sfx = audio(store);
const $ = s => document.querySelector(s);
const buttons = [...document.querySelectorAll('#choices button')];

let state = {level: store.get('level', 0), stars: store.get('stars', 0)};
let q = null, locked = false;

/**
 * Redraw the star row. `count` is passed explicitly because the fifth star is
 * shown lit for a moment after promotion has already reset it to zero.
 */
function stars(count = state.stars, pop = false) {
  $('#stars').innerHTML = Array.from({length: STARS_PER_LEVEL}, (_, i) =>
    `<i class="${i < count ? 'on' : ''}${pop && i === count - 1 ? ' pop' : ''}">★</i>`).join('');
}

function render() {
  $('#level').textContent = LEVELS[state.level].name;
  stars();
  $('#mute').textContent = sfx.muted ? '🔇' : '🔊';
  $('#q').textContent = q.text;
  $('#q').className = '';
  const choices = makeChoices(q.answer, Math.random);
  buttons.forEach((b, i) => { b.textContent = choices[i]; b.className = ''; b.disabled = false; });
}

function ask() {
  q = makeQuestion(state.level, Math.random);
  render();
}

// ponytail: a wrong tap just greys out and you keep going — no game over, no
// "the answer was 7". A toddler quitting in tears is the only real failure.
function answer(btn) {
  if (locked) return;
  const correct = Number(btn.textContent) === q.answer;
  haptic(correct ? 8 : [8, 40, 8]);
  if (!correct) {
    btn.className = 'wrong'; btn.disabled = true;
    sfx.beep(180, .12, 'sine');
    state = advance(state, false);
    stars();
    return;
  }
  locked = true;
  btn.className = 'right';
  $('#q').className = 'right';
  const before = state.level;
  const filled = state.stars + 1;
  state = advance(state, true);
  save();
  stars(filled, true);
  [660, 880].forEach((f, i) => setTimeout(() => sfx.beep(f, .1, 'sine'), i * 90));
  if (state.level !== before) {
    setTimeout(() => sfx.beep(1320, .18, 'sine'), 260);
    $('#q').className = 'party';
    $('#q').textContent = '🎉 Level up! 🎉';
  }
  setTimeout(() => { locked = false; ask(); }, state.level !== before ? 900 : 550);
}

const save = () => { store.set('level', state.level); store.set('stars', state.stars); };
const setLevel = d => {
  state = {level: Math.max(0, Math.min(LEVELS.length - 1, state.level + d)), stars: 0};
  save(); ask();
};

buttons.forEach(b => b.addEventListener('click', () => answer(b)));
$('#prev').onclick = () => setLevel(-1);
$('#next').onclick = () => setLevel(+1);
$('#mute').onclick = () => { sfx.toggle(); $('#mute').textContent = sfx.muted ? '🔇' : '🔊'; };

onPause(save);
registerSW();
ask();
