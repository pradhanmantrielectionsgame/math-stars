/**
 * Cuts a version: bumps package.json + sw.js, writes a CHANGELOG entry from the
 * commits since the last tag, commits, tags. Pushing is a separate flag because
 * pushing is what deploys.
 *
 *   node scripts/release.mjs patch|minor|major [--push]
 *
 * Semver for a game: major = rules change that invalidates old scores,
 * minor = new feature or mode, patch = fix or polish.
 */
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const git = (...a) => execFileSync('git', a, {cwd: ROOT, encoding: 'utf8'}).trim();
const level = process.argv[2];
const push = process.argv.includes('--push');

if (!['patch', 'minor', 'major'].includes(level)) {
  console.error('usage: node scripts/release.mjs patch|minor|major [--push]');
  process.exit(1);
}
if (git('status', '--porcelain')) {
  console.error('Working tree is dirty. Commit your work (or run /checkpoint) first — a release should\nonly ever contain the version bump.');
  process.exit(1);
}

const pkgPath = join(ROOT, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const [maj, min, pat] = pkg.version.split('.').map(Number);
const next = level === 'major' ? `${maj + 1}.0.0` : level === 'minor' ? `${maj}.${min + 1}.0` : `${maj}.${min}.${pat + 1}`;

let last = '';
try { last = git('describe', '--tags', '--abbrev=0'); } catch {}
const log = git('log', ...(last ? [`${last}..HEAD`] : []), '--format=- %s', '--no-merges') || '- (no commits since last release)';

pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// The service worker's cache name carries the version; this is the cache bust.
const swPath = join(ROOT, 'sw.js');
writeFileSync(swPath, readFileSync(swPath, 'utf8').replace(/const VERSION = '[^']*'/, `const VERSION = '${next}'`));

const clPath = join(ROOT, 'CHANGELOG.md');
const entry = `## [${next}] - ${new Date().toISOString().slice(0, 10)}\n\n${log}\n\n`;
const cl = existsSync(clPath) ? readFileSync(clPath, 'utf8') : '# Changelog\n\n';
const at = cl.indexOf('\n## ');
writeFileSync(clPath, at === -1 ? cl + '\n' + entry : cl.slice(0, at + 1) + entry + cl.slice(at + 1));

git('add', '-A');
git('commit', '-m', `release: v${next}`);
git('tag', `v${next}`);
console.log(`v${next} tagged.`);

if (push) {
  git('push');
  git('push', '--tags');
  console.log('Pushed — GitHub Actions is deploying. Live in ~1 min.');
} else {
  console.log('Not pushed. `git push && git push --tags` when you want it live.');
}
