/** DOM glue for Math Stars. Rules live in logic.mjs. */
import {haptic, storage, audio, onPause, registerSW} from './kit.mjs';
import {LEVELS, STARS_PER_LEVEL, HEARTS_PER_SET, GRADES,
        makeQuestion, makeChoices, advance, newRun} from './logic.mjs';

const COOLDOWN = 5;                        // seconds of nothing after a demotion
const store = storage('math-stars');
const sfx = audio(store);
const $ = s => document.querySelector(s);
const buttons = [...document.querySelectorAll('#choices button')];

const saved = store.get('stars', []);
let state = {
  level: store.get('level', 0),
  stars: Array.isArray(saved) ? saved : [],   // older saves held a plain count
  hearts: store.get('hearts', HEARTS_PER_SET),
  demotions: store.get('demotions', 0),
};
let q = null, tries = 0, locked = false, over = false, timer = null;

/** Negative answers print with a real minus sign, matching the sum above. */
const fmt = n => String(n).replace('-', '\u2212');

/**
 * Play a short sequence of notes. Rising = good, falling = not.
 * @param {[number, number][]} notes pairs of [hertz, seconds]
 * @param {string} [type] oscillator shape — 'sine' sings, 'square' buzzes
 */
const tune = (notes, type = 'sine') => notes.reduce((at, [hz, dur]) => {
  setTimeout(() => sfx.beep(hz, dur, type, type === 'square' ? .05 : .045), at * 1000);
  return at + dur * .8;
}, 0);

// Rising majors for right, falling for wrong. The shape carries the meaning to
// a toddler who is not reading the card yet.
const SOUND = {
  gold:     () => tune([[523, .1], [659, .1], [784, .17]]),
  silver:   () => tune([[494, .1], [587, .15]]),
  bronze:   () => tune([[440, .16]]),
  wrong:    () => tune([[233, .1], [175, .17]], 'square'),
  levelUp:  () => tune([[523, .1], [659, .1], [784, .1], [1047, .26]]),
  demoted:  () => tune([[330, .14], [262, .14], [196, .24]], 'square'),
  gameOver: () => tune([[392, .2], [330, .2], [262, .2], [175, .4]], 'square'),
};

/** Buzz patterns: one tick for right, a double for wrong, a roll for worse. */
const BUZZ = {
  gold: 10, silver: 10, bronze: 10, wrong: [14, 60, 14],
  levelUp: [10, 50, 10, 50, 14], demoted: [30, 70, 30, 70, 30], gameOver: [40, 90, 40, 90, 120],
};

/** One call for the pair — they always fire together and always agree. */
function feedback(kind) {
  SOUND[kind]();
  haptic(BUZZ[kind]);
}

const save = () => {
  store.set('level', state.level); store.set('stars', state.stars);
  store.set('hearts', state.hearts); store.set('demotions', state.demotions);
};

/**
 * Redraw both meters. `won` is passed explicitly because the tenth star is
 * shown for a moment after promotion has already emptied the row.
 */
function meters(won = state.stars, pop = false) {
  $('#stars').innerHTML = Array.from({length: STARS_PER_LEVEL}, (_, i) =>
    `<i class="${won[i] ? `on g${won[i]}` : ''}${pop && i === won.length - 1 ? ' pop' : ''}">\u2605</i>`).join('');
  $('#hearts').innerHTML = Array.from({length: HEARTS_PER_SET}, (_, i) =>
    `<i class="${i < state.hearts ? 'on' : ''}">\u2665</i>`).join('');
}

function card(text, cls = '') {
  $('#q').textContent = text;
  $('#q').className = cls;
}

function render() {
  $('#level').textContent = LEVELS[state.level].name;
  $('#mute').textContent = sfx.muted ? '\ud83d\udd07' : '\ud83d\udd0a';
  meters();
  card(q.text);
  const choices = makeChoices(q.answer, Math.random, LEVELS[state.level].neg);
  buttons.forEach((b, i) => {
    b.dataset.value = choices[i];          // textContent is prettified, this is the number
    b.textContent = fmt(choices[i]);
    b.className = ''; b.disabled = false;
  });
}

function ask() {
  q = makeQuestion(state.level, Math.random);
  tries = 0;
  render();
}

// ponytail: no timer and no clock on a sum — the only pressure is the hearts.
function answer(btn) {
  if (locked || over) return;
  tries += 1;
  const correct = Number(btn.dataset.value) === q.answer;

  if (!correct) {
    btn.className = 'wrong'; btn.disabled = true;
    feedback('wrong');
    const before = state.level;
    state = advance(state, 'wrong');
    save();
    meters();
    if (state.level !== before) { locked = true; demoted(); }
    return;
  }

  locked = true;
  btn.className = 'right';
  const before = state.level;
  const grade = Math.min(tries, GRADES);
  const won = [...state.stars, grade];
  state = advance(state, 'right', tries);
  save();
  card(q.text, ['right', 'silver', 'bronze'][grade - 1]);
  meters(won, true);
  feedback(['gold', 'silver', 'bronze'][grade - 1]);

  if (state.level !== before) {
    setTimeout(() => feedback('levelUp'), 300);
    card('\ud83c\udf89 Level up! \ud83c\udf89', 'party');
    $('#level').textContent = LEVELS[state.level].name;
  }
  setTimeout(() => { locked = false; ask(); }, state.level !== before ? 900 : 550);
}

/** Three wrong taps: drop a level, sit out the cooldown, then carry on — or stop. */
function demoted() {
  buttons.forEach(b => { b.disabled = true; b.className = 'off'; });
  $('#level').textContent = LEVELS[state.level].name;
  meters();
  if (state.over) return gameOver();
  feedback('demoted');

  let left = COOLDOWN;
  const tick = () => card(`Let\u2019s try easier\n${left}`, 'easier');
  tick();
  timer = setInterval(() => {
    if (--left > 0) return tick();
    clearInterval(timer);
    locked = false;
    ask();
  }, 1000);
}

function gameOver() {
  over = true;
  feedback('gameOver');
  card('Game over\nTap to play again', 'over');
}

$('#q').onclick = () => {
  if (!over) return;
  over = false;
  state = newRun(state.level);
  save();
  ask();
};

buttons.forEach(b => b.addEventListener('click', () => answer(b)));
$('#prev').onclick = () => setLevel(-1);
$('#next').onclick = () => setLevel(+1);
$('#mute').onclick = () => { sfx.toggle(); $('#mute').textContent = sfx.muted ? '\ud83d\udd07' : '\ud83d\udd0a'; };

/** The parent's override: jump a level, which also starts a clean run. */
function setLevel(d) {
  clearInterval(timer);
  locked = false; over = false;
  state = newRun(Math.max(0, Math.min(LEVELS.length - 1, state.level + d)));
  save();
  ask();
}

onPause(save);
registerSW();
ask();
