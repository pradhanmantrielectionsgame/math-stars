/**
 * Shared game kit — input, storage, sound, share, lifecycle.
 *
 * This file is COPIED into each game, not imported from a package. Every game
 * owns its copy and may edit it freely; improvements travel by hand, on purpose.
 * ponytail: a shared npm package would buy versioning problems and a build step
 * for four small browser-native wrappers.
 */

const DIRS = {ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down',
              a:'left', d:'right', w:'up', s:'down'};

/**
 * Swipe + keyboard input as one callback.
 * @param {HTMLElement} el element that receives swipes (usually the board)
 * @param {(dir:'left'|'right'|'up'|'down'|'tap', event:Event) => void} cb
 * @param {{threshold?: number}} [opts] px of travel before a drag counts as a swipe
 */
export function onInput(el, cb, {threshold = 24} = {}) {
  el.style.touchAction = 'none';               // stop the browser from scrolling instead
  let x0 = 0, y0 = 0, id = null;
  el.addEventListener('pointerdown', e => { id = e.pointerId; x0 = e.clientX; y0 = e.clientY; });
  el.addEventListener('pointerup', e => {
    if (e.pointerId !== id) return;
    id = null;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return cb('tap', e);
    cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'), e);
  });
  addEventListener('keydown', e => {
    const dir = DIRS[e.key];
    if (dir) { e.preventDefault(); cb(dir, e); }
  });
}

/** Short vibration. No-op where unsupported (all of iOS Safari, today). */
export const haptic = (pattern = 8) => { try { navigator.vibrate?.(pattern); } catch {} };

/**
 * Namespaced localStorage that never throws (private mode, blocked site data).
 * @param {string} ns key prefix, normally the game id
 */
export function storage(ns) {
  const k = key => `${ns}:${key}`;
  return {
    get(key, fallback = null) {
      try { const v = localStorage.getItem(k(key)); return v == null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(k(key), JSON.stringify(value)); } catch {} },
    del(key) { try { localStorage.removeItem(k(key)); } catch {} },
  };
}

/**
 * WebAudio blips generated in code — no audio files to load, cache, or ship.
 * @param {ReturnType<storage>} [store] persists the mute setting when given
 */
export function audio(store) {
  let ctx, muted = store ? store.get('muted', false) : false;
  const beep = (freq, dur = .08, type = 'square', vol = .04) => {
    if (muted) return;
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume();                             // iOS starts suspended until a gesture
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + dur);
    } catch {}
  };
  return {
    beep,
    get muted() { return muted; },
    toggle() { muted = !muted; store?.set('muted', muted); return muted; },
  };
}

/**
 * Share a score, with an optional rendered card. Falls back to the clipboard.
 * @param {{title?: string, text: string, url?: string, canvas?: HTMLCanvasElement}} opts
 * @returns {Promise<'shared'|'copied'|'cancelled'|'failed'>}
 */
export async function share({title = document.title, text, url = location.href, canvas}) {
  try {
    if (canvas && navigator.canShare) {
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      const files = [new File([blob], 'score.png', {type: 'image/png'})];
      if (navigator.canShare({files})) { await navigator.share({title, text, files}); return 'shared'; }
    }
    if (navigator.share) { await navigator.share({title, text, url}); return 'shared'; }
  } catch (e) {
    if (e.name === 'AbortError') return 'cancelled';
  }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); return 'copied'; } catch { return 'failed'; }
}

/** Runs cb when the game is backgrounded — save state here, not on every move. */
export function onPause(cb) {
  document.addEventListener('visibilitychange', () => { if (document.hidden) cb(); });
  addEventListener('pagehide', cb);
}

/** Registers the service worker outside dev. Silent no-op on http:// and localhost. */
export function registerSW(path = './sw.js') {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (local || !('serviceWorker' in navigator)) return;
  addEventListener('load', () => navigator.serviceWorker.register(path).catch(() => {}));
}
