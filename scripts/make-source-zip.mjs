#!/usr/bin/env node
/**
 * Builds the source archive AMO requires alongside a bundled submission.
 *
 *   node scripts/make-source-zip.mjs            # version comes from package.json
 *
 * Two rules here, both learned the hard way:
 *
 * 1. The file list comes from `git ls-files`, never from walking the directory. A walk is
 *    governed by whatever skip list you remembered to write rather than by .gitignore, and
 *    one such walk swept an untracked `.env.local` holding a live API key into an archive
 *    bound for Mozilla. Anything git does not track is not a build input.
 *
 * 2. Not PowerShell 5.1 `Compress-Archive`, which writes backslash path separators. That
 *    violates the ZIP spec and stores can reject the archive. This writes the entries by
 *    hand with forward slashes.
 *
 * The archive is refused if it contains anything that looks like a secret, or any entry with
 * a backslash in its name.
 */

import { execFileSync } from 'node:child_process';
import { createWriteStream, existsSync, readFileSync, statSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).version;
const OUT = resolve(ROOT, `releases/hivepulse-${version}-source.zip`);

// Anything matching these must never reach a store reviewer.
const FORBIDDEN = [/(^|\/)\.env/i, /\.pem$/i, /\.key$/i, /id_rsa/i, /secret/i, /credentials/i];

/**
 * Tracked, but not a build input. The archive exists so a reviewer can rebuild dist-firefox;
 * contest campaign packs and store screenshots cannot affect that build and are most of the
 * repository's weight — 18.5 MB of cover art and charts at 1.14.1. Excluding them is safe
 * precisely because the reproducibility check below rebuilds from this archive alone.
 */
const NOT_A_BUILD_INPUT = [
  /^enhancements\//,   // weekly contest posts, X threads, generated cover images
  /^screenshots\//,    // store listing screenshots
  /^documentation\//,  // release notes and announcements
];

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0').filter(Boolean)
  .filter(f => !NOT_A_BUILD_INPUT.some(re => re.test(f)));

const leaks = tracked.filter(f => FORBIDDEN.some(re => re.test(f)));
if (leaks.length) {
  console.error('Refusing to build — these tracked files look like secrets:\n  ' + leaks.join('\n  '));
  process.exit(1);
}

const missing = tracked.filter(f => !existsSync(resolve(ROOT, f)));
if (missing.length) {
  console.error('Refusing to build — tracked but absent from the worktree:\n  ' + missing.join('\n  '));
  process.exit(1);
}

// ── minimal zip writer (stored path separators are always '/') ────────────────
const dosTime = (d) => ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() / 2)) & 0xffff;
const dosDate = (d) => (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

mkdirSync(dirname(OUT), { recursive: true });
const chunks = [];
const central = [];
let offset = 0;

for (const name of tracked) {
  if (name.includes('\\')) { console.error('Backslash in tracked path:', name); process.exit(1); }
  const abs = resolve(ROOT, name);
  const data = readFileSync(abs);
  const mtime = statSync(abs).mtime;
  const deflated = deflateRawSync(data, { level: 9 });
  // Store uncompressed when deflate does not help, as any conforming writer does.
  const useDeflate = deflated.length < data.length;
  const body = useDeflate ? deflated : data;
  const method = useDeflate ? 8 : 0;
  const crc = crc32(data);
  const nameBuf = Buffer.from(name, 'utf8');

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);            // version needed
  local.writeUInt16LE(0x0800, 6);        // UTF-8 names
  local.writeUInt16LE(method, 8);
  local.writeUInt16LE(dosTime(mtime), 10);
  local.writeUInt16LE(dosDate(mtime), 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  chunks.push(local, nameBuf, body);

  const dir = Buffer.alloc(46);
  dir.writeUInt32LE(0x02014b50, 0);
  dir.writeUInt16LE(20, 4);              // version made by
  dir.writeUInt16LE(20, 6);              // version needed
  dir.writeUInt16LE(0x0800, 8);
  dir.writeUInt16LE(method, 10);
  dir.writeUInt16LE(dosTime(mtime), 12);
  dir.writeUInt16LE(dosDate(mtime), 14);
  dir.writeUInt32LE(crc, 16);
  dir.writeUInt32LE(body.length, 20);
  dir.writeUInt32LE(data.length, 24);
  dir.writeUInt16LE(nameBuf.length, 28);
  dir.writeUInt32LE(offset, 42);
  central.push(Buffer.concat([dir, nameBuf]));

  offset += local.length + nameBuf.length + body.length;
}

const dirBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(tracked.length, 8);
end.writeUInt16LE(tracked.length, 10);
end.writeUInt32LE(dirBuf.length, 12);
end.writeUInt32LE(offset, 16);

const zip = Buffer.concat([...chunks, dirBuf, end]);
const stream = createWriteStream(OUT);
stream.end(zip);
stream.on('close', () => {
  const sha = createHash('sha256').update(zip).digest('hex');
  console.log(`${OUT}`);
  console.log(`  ${tracked.length} files · ${(zip.length / 1048576).toFixed(1)} MB`);
  console.log(`  sha256 ${sha}`);
});
