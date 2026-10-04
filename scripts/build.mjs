// Production build: bundles, tree-shakes & minifies JS/CSS with content-hashed
// filenames (cached forever), code-splits the 3D viewer, and minifies HTML.
import 'dotenv/config';
import { build } from 'esbuild';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const SRC = 'src';
// Absolute URLs for canonical/OG tags (social networks require them). Set BASE_URL in .env for production builds.
const BASE_URL = (process.env.BASE_URL || '').replace(/\/$/, '');
const OUT = 'dist';

await rm(OUT, { recursive: true, force: true });
await mkdir(`${OUT}/assets`, { recursive: true });

const result = await build({
  entryPoints: { main: `${SRC}/js/main.js`, success: `${SRC}/js/success.js`, styles: `${SRC}/css/styles.css` },
  outdir: `${OUT}/assets`,
  bundle: true,
  splitting: true,
  format: 'esm',
  minify: true,
  target: ['es2020', 'chrome100', 'safari15', 'firefox100'],
  entryNames: '[name]-[hash]',
  chunkNames: '[name]-[hash]',
  legalComments: 'none',
  sourcemap: 'linked',
  metafile: true,
  external: ['/assets/fonts/*'],
  logLevel: 'warning',
});

const outputs = Object.entries(result.metafile.outputs);
const entry = (name) => {
  const hit = outputs.find(([, o]) => o.entryPoint && path.basename(o.entryPoint).startsWith(name));
  return `/${path.relative(OUT, hit[0]).split(path.sep).join('/')}`;
};
const css = outputs.find(([f]) => f.endsWith('.css'))[0];
const cssHref = `/${path.relative(OUT, css).split(path.sep).join('/')}`;
const bottleChunk = outputs.find(([, o]) => o.inputs && Object.keys(o.inputs).some((i) => i.endsWith('bottle3d.js')) && !o.entryPoint);

const pages = {
  'index.html': {
    js: `<script type="module" src="${entry('main.js')}"></script>` +
      (bottleChunk ? `<link rel="modulepreload" href="/${path.relative(OUT, bottleChunk[0]).split(path.sep).join('/')}" fetchpriority="low">` : ''),
  },
  'success.html': { js: `<script type="module" src="${entry('success.js')}"></script>` },
  '404.html': { js: '' },
};

const minifyHtml = (html) =>
  html
    .replace(/<!--(?!build:)[\s\S]*?-->/g, '')
    .replace(/>\s*\n\s*</g, '><')
    .replace(/\n\s+/g, ' ')
    .trim();

for (const [file, { js }] of Object.entries(pages)) {
  let html = await readFile(`${SRC}/${file}`, 'utf8');
  html = html
    .replaceAll('%BASE_URL%', BASE_URL)
    .replace('<!--build:canonical-->', BASE_URL ? `<link rel="canonical" href="${BASE_URL}/">` : '')
    .replace('<!--build:css-->', `<link rel="stylesheet" href="${cssHref}">`).replace('<!--build:js-->', js);
  await writeFile(`${OUT}/${file}`, minifyHtml(html));
}

await cp(`${SRC}/static`, OUT, { recursive: true });

// Size report
const rows = [];
for (const f of await readdir(OUT, { recursive: true })) {
  if (!/\.(js|css|html)$/.test(f)) continue;
  const buf = await readFile(path.join(OUT, f));
  rows.push([f, (buf.length / 1024).toFixed(1), (gzipSync(buf).length / 1024).toFixed(1)]);
}
console.log('\nBuilt dist/ (KB raw / gzip)');
for (const [f, raw, gz] of rows.sort()) console.log(`  ${f.padEnd(40)} ${raw.padStart(7)} ${gz.padStart(7)}`);
