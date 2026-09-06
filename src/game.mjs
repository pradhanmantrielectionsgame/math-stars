/** DOM glue for Math Stars. Rules live in logic.mjs. */
import {onInput, haptic, storage, audio, share, onPause, registerSW} from './kit.mjs';
import {tap} from './logic.mjs';

const store = storage('math-stars');
const sfx = audio(store);
const $ = s => document.querySelector(s);

let score = store.get('score', 0);
let best = store.get('best', 0);

function render() {
  $('#score').textContent = score;
  $('#best').textContent = best;
}

function save() {
  store.set('score', score);
  store.set('best', best);
}

onInput($('#board'), dir => {
  score = tap(score);
  best = Math.max(best, score);
  sfx.beep(dir === 'tap' ? 440 : 660);
  haptic();
  render();
});

$('#new').onclick = () => { score = 0; save(); render(); };
$('#share').onclick = () => share({text: `I scored ${score} in Math Stars!`});

onPause(save);
registerSW();
render();
