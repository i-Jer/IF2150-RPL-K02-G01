// Packs dist/ into the OTA web bundle the Android app downloads (no APK re-download needed).
// Output: <out>/bundle-<version>.zip and <out>/bundle.json. Default out: ../server/release
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ZipArchive } from 'archiver';

const here = resolve(new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '..');
const dist = join(here, 'dist');
const out = resolve(process.argv[2] || join(here, '..', 'server', 'release'));
const { version } = JSON.parse(readFileSync(join(dist, 'version.json'), 'utf8'));
const safe = version.replace(/[^\w.-]/g, '_');
const file = `bundle-${safe}.zip`;

mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) if (/^bundle-.*\.zip$/.test(f) && f !== file) unlinkSync(join(out, f));

await new Promise((res, rej) => {
  const stream = createWriteStream(join(out, file));
  const zip = new ZipArchive({ zlib: { level: 9 } });
  stream.on('close', res);
  zip.on('error', rej);
  zip.pipe(stream);
  zip.directory(dist, false); // index.html at the zip root
  zip.finalize();
});

const sha256 = createHash('sha256').update(readFileSync(join(out, file))).digest('hex');
writeFileSync(join(out, 'bundle.json'), JSON.stringify({ version, file, sha256, dibuat: new Date().toISOString() }, null, 2));
console.log(`[bundle] ${file} (${version}) -> ${out}${existsSync(join(out, 'native.json')) ? '' : ' (no native.json yet)'}`);
