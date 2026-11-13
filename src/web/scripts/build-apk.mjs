// Builds the signed release APK and publishes it to ../server/release with native.json.
// Needs JAVA_HOME (JDK 21) and ANDROID_HOME. Defaults to %LOCALAPPDATA%/seaguard-buildtools.
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const web = resolve(new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '..');
const release = join(web, '..', 'server', 'release');
const tools = join(process.env.LOCALAPPDATA || '', 'seaguard-buildtools');
const env = {
  ...process.env,
  JAVA_HOME: process.env.JAVA_HOME || join(tools, 'jdk'),
  ANDROID_HOME: process.env.ANDROID_HOME || join(tools, 'sdk'),
  ANDROID_SDK_ROOT: process.env.ANDROID_HOME || join(tools, 'sdk'),
};
env.PATH = `${join(env.JAVA_HOME, 'bin')}${process.platform === 'win32' ? ';' : ':'}${env.PATH}`;
const run = (cmd, cwd = web) => { console.log(`$ ${cmd}`); execSync(cmd, { cwd, env, stdio: 'inherit' }); };

run('npx vite build');
run('node scripts/make-bundle.mjs');
run('npx cap sync android');
run('node scripts/patch-android.mjs');
writeFileSync(join(web, 'android', 'local.properties'), `sdk.dir=${env.ANDROID_HOME.split('\\').join('/')}\n`);
const gradlew = process.platform === 'win32' ? `"${join(web, 'android', 'gradlew.bat')}"` : './gradlew';
run(`${gradlew} assembleRelease --no-daemon`, join(web, 'android'));

const pkg = JSON.parse(readFileSync(join(web, 'package.json'), 'utf8'));
const gradle = readFileSync(join(web, 'android/app/build.gradle'), 'utf8');
const versionCode = Number(/versionCode (\d+)/.exec(gradle)[1]);
const apk = join(web, 'android/app/build/outputs/apk/release/app-release.apk');
if (!existsSync(apk)) throw new Error('APK not found: ' + apk);
const file = `seaguard-${pkg.version}.apk`;
for (const f of readdirSync(release)) if (/^seaguard-.*\.apk$/.test(f) && f !== file) unlinkSync(join(release, f));
copyFileSync(apk, join(release, file));
const { version: bundle } = JSON.parse(readFileSync(join(web, 'dist', 'version.json'), 'utf8'));
writeFileSync(join(release, 'native.json'), JSON.stringify({
  versionCode, versionName: pkg.version, file, ukuranBytes: statSync(apk).size, bundleBawaan: bundle,
  wajib: false, catatan: 'SeaGuard Android', dibuat: new Date().toISOString(),
}, null, 2));
console.log(`[apk] ${file} (${(statSync(apk).size / 1048576).toFixed(1)} MB, versionCode ${versionCode}) published to ${release}`);
