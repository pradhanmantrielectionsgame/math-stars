/**
 * Dev server: serves the game, prints the LAN URL and a cloudflared tunnel URL,
 * with QR codes for both. `node scripts/dev.mjs [--port 8000] [--no-tunnel]`
 *
 * ponytail: no express, no vite, no live-reload. It is a static file server with
 * no-store headers — pull to refresh on the phone is the reload.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {networkInterfaces} from 'node:os';
import {spawn, execFile} from 'node:child_process';
import {extname, join, normalize} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const PORT = Number(args[args.indexOf('--port') + 1]) || 8000;
const TUNNEL = !args.includes('--no-tunnel');

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.txt': 'text/plain',
};

createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = join(ROOT, normalize(p).replace(/^(\.\.[\\/])+/, ''));  // no escaping ROOT
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',            // the phone must never hold a stale build
    });
    res.end(body);
  } catch {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end(`not found: ${p}`);
  }
}).listen(PORT, '0.0.0.0', () => start());

const lanIPs = () => Object.values(networkInterfaces()).flat()
  .filter(i => i && i.family === 'IPv4' && !i.internal && !i.address.startsWith('172.'))
  .map(i => i.address);

/** QR in the terminal if the hub's qrcode-terminal is resolvable; URL only if not. */
async function qr(url) {
  try {
    const {default: q} = await import('qrcode-terminal');
    q.generate(url, {small: true});
  } catch {}
}

/** Windows only: warn when the port has no inbound rule, which silently kills phone access. */
function checkFirewall() {
  if (process.platform !== 'win32') return;
  const ps = `(Get-NetFirewallRule -Direction Inbound -Enabled True -Action Allow |
    Where-Object { ($_ | Get-NetFirewallPortFilter).LocalPort -eq ${PORT} }).Count`;
  execFile('powershell', ['-NoProfile', '-Command', ps], {timeout: 8000}, (err, out) => {
    if (err || Number(out.trim()) > 0) return;
    console.log(`\n  Phone can't reach the LAN URL? No firewall rule for port ${PORT}.`);
    console.log(`  Run once in an ADMIN PowerShell:`);
    console.log(`  New-NetFirewallRule -DisplayName "Dev server ${PORT}" -Direction Inbound -Protocol TCP -LocalPort ${PORT} -Action Allow -Profile Private\n`);
  });
}

/** cloudflared from PATH, the hub bin folder, or $CLOUDFLARED. */
function cloudflaredPath() {
  return process.env.CLOUDFLARED
    || join(ROOT, '..', 'bin', process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared')
    || 'cloudflared';
}

async function start() {
  console.log(`\n  local    http://localhost:${PORT}`);
  for (const ip of lanIPs()) {
    const url = `http://${ip}:${PORT}`;
    console.log(`  lan      ${url}`);
    await qr(url);
  }
  checkFirewall();
  if (!TUNNEL) return;

  const cf = spawn(cloudflaredPath(), ['tunnel', '--url', `http://localhost:${PORT}`], {stdio: ['ignore', 'pipe', 'pipe']});
  cf.on('error', () => console.log('  tunnel   cloudflared not found — LAN only (see Samits-Games/CLAUDE.md)'));
  const watch = async chunk => {
    const m = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (!m) return;
    cf.stdout.off('data', watch); cf.stderr.off('data', watch);
    console.log(`\n  tunnel   ${m[0]}   (https — use this one for PWA install / device APIs)`);
    await qr(m[0]);
  };
  cf.stdout.on('data', watch);
  cf.stderr.on('data', watch);
  const bye = () => { cf.kill(); process.exit(0); };
  process.on('SIGINT', bye);
  process.on('exit', () => cf.kill());
}
