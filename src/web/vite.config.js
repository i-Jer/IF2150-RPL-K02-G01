import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

/** Bundle version = package version + hash of the client sources. Same sources -> same version,
 *  so the APK's built-in bundle and the server's OTA bundle only differ when the code differs. */
function sourceHash() {
  const h = createHash('sha256');
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else { h.update(name); h.update(readFileSync(p)); }
    }
  };
  walk(join(root, 'src'));
  walk(join(root, 'public'));
  h.update(readFileSync(join(root, 'index.html')));
  h.update(pkg.version);
  return h.digest('hex').slice(0, 10);
}
const BUNDLE_VERSION = process.env.BUNDLE_VERSION || `${pkg.version}+${sourceHash()}`;
process.env.SG_BUNDLE_VERSION = BUNDLE_VERSION;

export default defineConfig({
  plugins: [react(), {
    name: 'sg-version-file',
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: BUNDLE_VERSION }) }); },
  }],
  define: {
    __BUNDLE_VERSION__: JSON.stringify(BUNDLE_VERSION),
    __API_ORIGIN__: JSON.stringify(process.env.API_ORIGIN || 'https://seaguard-app-production.up.railway.app'),
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true }, '/release': 'http://localhost:8080', '/download': 'http://localhost:8080' },
  },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 1500 },
});
