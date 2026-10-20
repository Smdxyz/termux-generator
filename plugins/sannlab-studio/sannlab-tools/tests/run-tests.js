#!/usr/bin/env node
'use strict';
/*
 * run-tests.js — test suite sannlab-tools (Fase 8, bagian yang bisa dieksekusi
 * tanpa perangkat Android). Membuat sandbox HOME + "shared storage" palsu,
 * lalu menjalankan CLI sannlab.js sebagai proses anak persis seperti pemakaian
 * nyata. Setiap test mencetak PASS/FAIL; exit code != 0 bila ada yang gagal.
 *
 * Jalankan: node tests/run-tests.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const CLI = path.join(__dirname, '..', 'src', 'sannlab.js');
const SANDBOX = fs.mkdtempSync(path.join(os.tmpdir(), 'sannlab-test-'));
const FAKE_HOME = path.join(SANDBOX, 'home');
const SHARED = path.join(SANDBOX, 'shared');
const DOWNLOADS = path.join(SHARED, 'Download');
fs.mkdirSync(FAKE_HOME, { recursive: true });
fs.mkdirSync(DOWNLOADS, { recursive: true });

const ENV = Object.assign({}, process.env, {
  HOME: FAKE_HOME,
  SANNLAB_HOME: path.join(FAKE_HOME, '.sannlab'),
  npm_config_audit: 'false',
  npm_config_fund: 'false',
  npm_config_update_notifier: 'false',
});

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? ' — ' + extra : '')); }
}
function run(args, cwd) {
  return spawnSync('node', [CLI].concat(args), { cwd: cwd || FAKE_HOME, env: ENV, encoding: 'utf8' });
}
function write(p, content) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); }
function workspaceOf(name) {
  const reg = JSON.parse(fs.readFileSync(path.join(FAKE_HOME, '.sannlab', 'registry.json'), 'utf8'));
  const p = reg.projects.find(x => x.name === name);
  return p ? p.workspace : null;
}

/* ---------- fixture project 1: CommonJS + file: dependency (symlink!) ---- */
const P1 = path.join(DOWNLOADS, 'MyProject');
write(path.join(P1, 'package.json'), JSON.stringify({
  name: 'myproject', version: '1.0.0',
  dependencies: { mymod: 'file:./vendor/mymod' },
}, null, 2));
write(path.join(P1, 'index.js'), "console.log('P1:' + require('mymod')());\n");
write(path.join(P1, '.env'), 'API_TOKEN=source-secret-111\n');
write(path.join(P1, 'vendor/mymod/package.json'), JSON.stringify({
  name: 'mymod', version: '1.0.0', main: 'index.js',
  bin: { mymod: './bin/cli.js' },
  exports: { '.': './index.js' },
}, null, 2));
write(path.join(P1, 'vendor/mymod/index.js'), "module.exports = () => 'mymod-v1';\n");
write(path.join(P1, 'vendor/mymod/bin/cli.js'), "#!/usr/bin/env node\nconsole.log('mymod cli v1');\n");

/* ---------- fixture project 2: ESM + versi mymod berbeda (isolasi) ------- */
const P2 = path.join(DOWNLOADS, 'MyApp2');
write(path.join(P2, 'package.json'), JSON.stringify({
  name: 'myapp2', version: '1.0.0', type: 'module',
  dependencies: { mymod: 'file:./vendor/mymod' },
}, null, 2));
write(path.join(P2, 'index.js'), "import v from 'mymod';\nconsole.log('P2:' + v());\n");
write(path.join(P2, 'vendor/mymod/package.json'), JSON.stringify({
  name: 'mymod', version: '2.0.0', type: 'module', main: 'index.js',
  exports: { '.': './index.js' },
}, null, 2));
write(path.join(P2, 'vendor/mymod/index.js'), "export default () => 'mymod-v2-esm';\n");

/* --------------------------------- tests --------------------------------- */

// 1. activate P1
let r = run(['activate'], P1);
check('activate P1 exit 0', r.status === 0, r.stderr);
const WS1 = workspaceOf('MyProject');
check('workspace P1 dibuat di private HOME', !!WS1 && fs.existsSync(WS1));
check('.nomedia dibuat di folder project', fs.existsSync(path.join(P1, '.nomedia')));
check('.nomedia TIDAK dibuat di root Downloads', !fs.existsSync(path.join(DOWNLOADS, '.nomedia')));
check('source tersalin ke workspace', fs.existsSync(path.join(WS1, 'index.js')));
check('.env tersalin masuk sekali', fs.readFileSync(path.join(WS1, '.env'), 'utf8').includes('source-secret-111'));

// 2. guard root Downloads
r = run(['activate'], DOWNLOADS);
check('activate di root Downloads ditolak', r.status !== 0);

// 3. install P1 — node_modules HARUS di workspace saja, mymod berupa symlink
r = run(['install'], P1);
check('install P1 exit 0', r.status === 0, (r.stderr || '').slice(0, 300));
check('node_modules ada di workspace', fs.existsSync(path.join(WS1, 'node_modules')));
check('node_modules TIDAK ada di source (Downloads)', !fs.existsSync(path.join(P1, 'node_modules')));
const linkPath = path.join(WS1, 'node_modules', 'mymod');
check('node_modules/mymod adalah SYMLINK (mustahil di shared storage)', fs.lstatSync(linkPath).isSymbolicLink());

// 4. jalankan CJS lewat workspace
r = run(['node', 'index.js'], P1);
check('CJS jalan: require file: dep', r.status === 0 && r.stdout.includes('P1:mymod-v1'), r.stdout + r.stderr);

// 5-6. activate + install + jalankan ESM P2, dan isolasi antar project
r = run(['activate'], P2);
check('activate P2 exit 0', r.status === 0, r.stderr);
const WS2 = workspaceOf('MyApp2');
check('workspace P2 berbeda dari P1 (isolasi)', !!WS2 && WS2 !== WS1);
r = run(['install'], P2);
check('install P2 exit 0', r.status === 0, (r.stderr || '').slice(0, 300));
r = run(['node', 'index.js'], P2);
check('ESM jalan: import + package exports', r.status === 0 && r.stdout.includes('P2:mymod-v2-esm'), r.stdout + r.stderr);
r = run(['node', 'index.js'], P1);
check('P1 tetap v1 setelah P2 terinstall (tidak tertimpa)', r.status === 0 && r.stdout.includes('P1:mymod-v1'));

// 7. file baru dari runtime di workspace tersalin balik ke source
write(path.join(WS1, 'output-hasil.txt'), 'hasil runtime\n');
r = run(['sync'], P1);
check('file runtime tersalin balik ke source', fs.existsSync(path.join(P1, 'output-hasil.txt')));

// 8. proteksi .env: ubah di workspace, sync, source tidak berubah
write(path.join(WS1, '.env'), 'API_TOKEN=workspace-secret-222\n');
r = run(['sync'], P1);
check('.env source TIDAK ditimpa oleh sync', fs.readFileSync(path.join(P1, '.env'), 'utf8').includes('source-secret-111'));
check('.env workspace TIDAK ditimpa oleh sync', fs.readFileSync(path.join(WS1, '.env'), 'utf8').includes('workspace-secret-222'));

// 9. konflik dua sisi: tidak ada overwrite, salinan konflik disimpan, resolve bekerja
write(path.join(P1, 'index.js'), "console.log('P1:versi-source');\n");
write(path.join(WS1, 'index.js'), "console.log('P1:versi-workspace');\n");
r = run(['sync'], P1);
check('konflik terdeteksi & dilaporkan', r.stdout.includes('KONFLIK'), r.stdout);
check('konflik: source tidak ditimpa', fs.readFileSync(path.join(P1, 'index.js'), 'utf8').includes('versi-source'));
check('konflik: workspace tidak ditimpa', fs.readFileSync(path.join(WS1, 'index.js'), 'utf8').includes('versi-workspace'));
check('konflik: salinan konflik disimpan', fs.readdirSync(WS1).some(f => f.startsWith('index.js.conflict-')));
r = run(['resolve', 'index.js', '--keep-source'], P1);
check('resolve --keep-source exit 0', r.status === 0, r.stderr);
check('setelah resolve kedua sisi sama (versi source)', fs.readFileSync(path.join(WS1, 'index.js'), 'utf8').includes('versi-source'));

// 10. supervised exec + log terpisah + ekspor teredaksi
r = run(['exec', '--', 'node', '-e', "console.log('token=supersecretvalue123'); console.error('halo stderr');"], P1);
check('exec exit 0', r.status === 0, r.stderr);
const sessionsDir = path.join(WS1, '.sannlab', 'logs');
const sessions = fs.existsSync(sessionsDir) ? fs.readdirSync(sessionsDir) : [];
check('sesi log dibuat', sessions.length >= 1);
const sdir = path.join(sessionsDir, sessions[sessions.length - 1]);
check('out.log dan err.log terpisah', fs.existsSync(path.join(sdir, 'out.log')) && fs.existsSync(path.join(sdir, 'err.log')));
check('stderr masuk err.log', fs.readFileSync(path.join(sdir, 'err.log'), 'utf8').includes('halo stderr'));
r = run(['logs', '--export'], P1);
check('logs --export exit 0', r.status === 0, r.stderr);
const exported = fs.readdirSync(P1).find(f => f.startsWith('sannlab-log-'));
check('file ekspor dibuat di folder project', !!exported);
if (exported) {
  const content = fs.readFileSync(path.join(P1, exported), 'utf8');
  check('ekspor log TEREDAKSI (nilai token hilang)', !content.includes('supersecretvalue123') && content.includes('[REDACTED]'), content.slice(0, 200));
}

// 11. doctor: deteksi glibc pada ELF asli sistem + klasifikasi bionic negatif
const lib = require(CLI);
const lsInfo = lib.elfInfo(process.execPath);
check('doctor: elfInfo membaca ELF node', lsInfo.machine !== null);
check('doctor: node VM terdeteksi glibc-linked (kasus positif)', lib.isGlibcLinked(lsInfo) === true, JSON.stringify(lsInfo));
check('doctor: ELF bionic TIDAK ditandai glibc (kasus negatif)',
  lib.isGlibcLinked({ interp: '/system/bin/linker64', needed: ['libc.so', 'libdl.so', 'libm.so'] }) === false);
r = run(['doctor'], P1);
check('doctor CLI jalan & menulis log', r.status === 0 && r.stdout.includes('SannLab Doctor') && r.stdout.includes('Log diagnosis'), (r.stdout + r.stderr).slice(0, 300));

// 12. monitor --json
r = run(['monitor', '--json'], P1);
let mon = null; try { mon = JSON.parse(r.stdout); } catch { /* gagal parse */ }
check('monitor --json valid & punya data storage/cpu', !!mon && Array.isArray(mon.listening_ports) && mon.storage.length >= 1);

// 13. suggest dari riwayat
write(path.join(FAKE_HOME, '.bash_history'), 'npm install\nnpm install\nnpm run dev\ngit status\n');
r = run(['suggest', 'npm in'], P1);
check('suggest menemukan dari riwayat', r.status === 0 && r.stdout.includes('npm install'), r.stdout);

// 14. status mencantumkan kedua project
r = run(['status'], FAKE_HOME);
check('status mencantumkan MyProject & MyApp2', r.stdout.includes('MyProject') && r.stdout.includes('MyApp2'));

console.log('');
console.log('HASIL: ' + pass + ' PASS, ' + fail + ' FAIL  (sandbox: ' + SANDBOX + ')');
process.exit(fail ? 1 : 0);
