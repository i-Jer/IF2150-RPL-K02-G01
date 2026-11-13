// Idempotent tweaks to the generated Capacitor Android project:
// permissions (GPS, camera, photos), app version, release signing from a local keystore, and icons.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const web = resolve(new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '..');
const android = join(web, 'android');
const pkg = JSON.parse(readFileSync(join(web, 'package.json'), 'utf8'));
const versionName = pkg.version;
const [maj, min, pat] = versionName.split('.').map(Number);
const versionCode = Number(process.env.VERSION_CODE || maj * 10000 + min * 100 + pat);

// Permissions
const mf = join(android, 'app/src/main/AndroidManifest.xml');
let m = readFileSync(mf, 'utf8');
const perms = [
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
  '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
  '<uses-feature android:name="android.hardware.location.gps" android:required="false" />',
  '<uses-feature android:name="android.hardware.camera" android:required="false" />',
];
for (const p of perms) if (!m.includes(p)) m = m.replace('<uses-permission android:name="android.permission.INTERNET" />', `<uses-permission android:name="android.permission.INTERNET" />\n    ${p}`);
writeFileSync(mf, m);

// Version + signing
const gf = join(android, 'app/build.gradle');
let g = readFileSync(gf, 'utf8');
g = g.replace(/versionCode \d+/, `versionCode ${versionCode}`).replace(/versionName "[^"]*"/, `versionName "${versionName}"`);
if (!g.includes('signingConfigs {')) {
  g = g.replace(/buildTypes \{/, `signingConfigs {
        release {
            def props = new Properties()
            def f = rootProject.file('keystore.properties')
            if (f.exists()) {
                f.withInputStream { props.load(it) }
                storeFile file(props['storeFile'])
                storePassword props['storePassword']
                keyAlias props['keyAlias']
                keyPassword props['keyPassword']
            }
        }
    }
    buildTypes {`);
  g = g.replace(/release \{\n(\s+)minifyEnabled false/, 'release {\n$1signingConfig signingConfigs.release\n$1minifyEnabled false');
}
writeFileSync(gf, g);

// Strings: app name stays "SeaGuard"
const sf = join(android, 'app/src/main/res/values/strings.xml');
if (existsSync(sf)) {
  let s = readFileSync(sf, 'utf8');
  s = s.replace(/<string name="app_name">[^<]*<\/string>/, '<string name="app_name">SeaGuard</string>')
    .replace(/<string name="title_activity_main">[^<]*<\/string>/, '<string name="title_activity_main">SeaGuard</string>');
  writeFileSync(sf, s);
}
mkdirSync(join(android, 'app/src/main/res/values'), { recursive: true });
console.log(`[android] versionName ${versionName}, versionCode ${versionCode}, permissions and signing patched`);
