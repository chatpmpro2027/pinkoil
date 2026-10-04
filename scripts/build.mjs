// Production build: bundles, tree-shakes & minifies JS/CSS with content-hashed
// filenames (cached forever), code-splits the 3D viewer, minifies HTML, and
// pre-renders the Arabic site at /ar/ (right-to-left) from src/i18n/ar.js.
import 'dotenv/config';
import { build } from 'esbuild';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import AR from '../src/i18n/ar.js';

const SRC = 'src';
const OUT = 'dist';
// Absolute URLs for canonical/OG tags (social networks require them). Set BASE_URL in .env for production builds.
const BASE_URL = (process.env.BASE_URL || '').replace(/\/$/, '');

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

const rel = (f) => `/${path.relative(OUT, f).split(path.sep).join('/')}`;
const outputs = Object.entries(result.metafile.outputs);
const entry = (name) => rel(outputs.find(([, o]) => o.entryPoint && path.basename(o.entryPoint).startsWith(name))[0]);
const cssHref = rel(outputs.find(([f]) => f.endsWith('.css'))[0]);
const bottleChunk = outputs.find(([, o]) => !o.entryPoint && o.inputs && Object.keys(o.inputs).some((i) => i.endsWith('bottle3d.js')));

const FONTS = {
  en: ['fraunces.woff2', 'manrope.woff2'],
  ar: ['amiri.woff2', 'plex-arabic.woff2'],
};
const fontPreloads = (lang) =>
  FONTS[lang].map((f) => `<link rel="preload" href="/assets/fonts/${f}" as="font" type="font/woff2" crossorigin>`).join('');

const seo = (page, lang) => {
  if (!BASE_URL || page !== 'index.html') return '';
  const en = `${BASE_URL}/`;
  const ar = `${BASE_URL}/ar/`;
  return [
    `<link rel="canonical" href="${lang === 'ar' ? ar : en}">`,
    `<link rel="alternate" hreflang="en" href="${en}">`,
    `<link rel="alternate" hreflang="ar" href="${ar}">`,
    `<link rel="alternate" hreflang="x-default" href="${en}">`,
    `<meta property="og:locale" content="${lang === 'ar' ? 'ar_AE' : 'en_AE'}">`,
  ].join('');
};

const pages = {
  'index.html': `<script type="module" src="${entry('main.js')}"></script>${
    bottleChunk ? `<link rel="modulepreload" href="${rel(bottleChunk[0])}" fetchpriority="low">` : ''
  }`,
  'success.html': `<script type="module" src="${entry('success.js')}"></script>`,
  '404.html': '',
};

/**
 * Applies a translation dictionary to marked-up HTML:
 *   data-i18n="key"                  → replaces the element's inner HTML
 *   data-i18n-attrs="attr=key;a2=k2" → replaces attribute values
 * Every key must exist; translated elements must not nest a same-named tag.
 */
function translate(html, dict, used) {
  const get = (key) => {
    if (!(key in dict)) throw new Error(`Missing Arabic translation for "${key}"`);
    used.add(key);
    return dict[key];
  };
  html = html.replace(/<([a-z0-9]+)\b([^>]*?)\sdata-i18n-attrs="([^"]+)"([^>]*)>/g, (m, tag, before, spec, after) => {
    let attrs = `${before}${after}`;
    for (const pair of spec.split(';')) {
      const [attr, key] = pair.split('=');
      const value = get(key).replace(/"/g, '&quot;');
      const re = new RegExp(`\\s${attr}="[^"]*"`);
      attrs = re.test(attrs) ? attrs.replace(re, ` ${attr}="${value}"`) : `${attrs} ${attr}="${value}"`;
    }
    return `<${tag}${attrs}>`;
  });
  html = html.replace(/<([a-z0-9]+)\b([^>]*?)\sdata-i18n="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g, (m, tag, before, key, after, inner) => {
    if (new RegExp(`<${tag}\\b`).test(inner)) throw new Error(`data-i18n="${key}" contains a nested <${tag}>`);
    return `<${tag}${before}${after}>${get(key)}</${tag}>`;
  });
  return html
    .replace('<html lang="en" dir="ltr">', '<html lang="ar" dir="rtl">')
    .replace(/<html lang="en">/, '<html lang="ar" dir="rtl">');
}

const stripI18n = (html) => html.replace(/\sdata-i18n(?:-attrs)?="[^"]*"/g, '');

const minifyHtml = (html) =>
  html
    .replace(/<!--(?!build:)[\s\S]*?-->/g, '')
    .replace(/>\s*\n\s*</g, '><')
    .replace(/\n\s+/g, ' ')
    .trim();

const usedKeys = new Set();
await mkdir(`${OUT}/ar`, { recursive: true });
for (const [file, js] of Object.entries(pages)) {
  const source = await readFile(`${SRC}/${file}`, 'utf8');
  const variants = file === '404.html' ? ['en'] : ['en', 'ar'];
  for (const lang of variants) {
    let html = lang === 'ar' ? translate(source, AR, usedKeys) : source;
    html = stripI18n(html)
      .replaceAll('%BASE_URL%', BASE_URL)
      .replace('<!--build:seo-->', seo(file, lang))
      .replace('<!--build:fonts-->', fontPreloads(lang))
      .replace('<!--build:css-->', `<link rel="stylesheet" href="${cssHref}">`)
      .replace('<!--build:js-->', js);
    await writeFile(`${OUT}/${lang === 'ar' ? 'ar/' : ''}${file}`, minifyHtml(html));
  }
}
const unused = Object.keys(AR).filter((k) => !usedKeys.has(k));
if (unused.length) throw new Error(`Unused Arabic keys (remove them or add data-i18n): ${unused.join(', ')}`);

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
