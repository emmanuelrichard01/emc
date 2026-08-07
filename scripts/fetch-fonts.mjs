import fs from 'fs';
import path from 'path';

/* ==========================================================================
   FONT VENDORING

   Downloads the web fonts from Google Fonts into the repo and generates the
   @font-face rules that point at them.

   Run with: npm run update-fonts

   Why vendored rather than linked. The stylesheet used to be loaded from
   fonts.googleapis.com via a preload swapped by an inline onload handler —
   which the production CSP (script-src 'self') blocked outright, so the CSS
   was fetched and never applied and every page silently rendered in system-ui.
   Self-hosting removes the failure mode entirely: no inline script, no
   third-party origin, no render-blocking cross-origin round trip, and the
   font files inherit the immutable cache header already configured for
   /assets/* in vercel.json.

   Every subset Google publishes is kept, not just latin. Each @font-face
   carries its unicode-range, so a browser downloads only the subsets it
   actually needs to paint — keeping them all costs nothing at runtime and
   means a stray Ω or é still renders in the right typeface.

   Licensing: both families are SIL Open Font License 1.1, which permits
   redistribution. OFL.txt is written alongside the files.
   ========================================================================== */

// A modern browser UA is required — Google serves ancient formats to
// unrecognised clients, and we want woff2.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FAMILIES = [
  { name: 'Inter', slug: 'inter', css: 'Inter:wght@300;400;500;700' },
  { name: 'JetBrains Mono', slug: 'jetbrains-mono', css: 'JetBrains+Mono:wght@400;500' },
];

const OUT_FONTS = path.join(process.cwd(), 'src', 'assets', 'fonts');
const OUT_CSS = path.join(process.cwd(), 'src', 'fonts.css');

/** Splits the Google CSS into blocks, keeping the /* subset *\/ label above each. */
function parseFaces(css) {
  const faces = [];
  const blockRe = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;
  let match;

  while ((match = blockRe.exec(css)) !== null) {
    const [, subset, body] = match;
    const pick = (prop) => (body.match(new RegExp(`${prop}:\\s*([^;]+);`)) || [])[1]?.trim();
    const url = (body.match(/url\((https:\/\/[^)]+\.woff2)\)/) || [])[1];
    if (!url) continue;

    faces.push({
      subset,
      url,
      style: pick('font-style') ?? 'normal',
      weight: pick('font-weight') ?? '400',
      unicodeRange: pick('unicode-range'),
    });
  }
  return faces;
}

async function run() {
  fs.rmSync(OUT_FONTS, { recursive: true, force: true });
  fs.mkdirSync(OUT_FONTS, { recursive: true });

  const blocks = [];

  /* url -> filename.
     Inter is served as a variable font, so Google returns the *same* woff2 for
     every requested weight. Downloading per weight wrote four byte-identical
     copies of each subset — 1.1 MB of files where 350 KB was needed. Keying on
     the URL downloads each distinct file once and lets the four @font-face
     rules share it, which is exactly what the Google-hosted CSS does. */
  const byUrl = new Map();
  const usedNames = new Map();

  for (const family of FAMILIES) {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family.css}&display=swap`;
    const res = await fetch(cssUrl, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${family.name}: CSS request failed (HTTP ${res.status})`);

    const faces = parseFaces(await res.text());
    const distinct = new Set(faces.map((f) => f.url)).size;
    console.log(`${family.name}: ${faces.length} faces, ${distinct} distinct files`);

    for (const face of faces) {
      let fileName = byUrl.get(face.url);

      if (!fileName) {
        // Weight is only part of the name when a subset genuinely ships more
        // than one file, so a variable family stays cleanly named by subset.
        const base = `${family.slug}-${face.subset}`;
        fileName = usedNames.has(base) ? `${base}-${face.weight}.woff2` : `${base}.woff2`;
        usedNames.set(base, true);

        const fontRes = await fetch(face.url, { headers: { 'User-Agent': UA } });
        if (!fontRes.ok) throw new Error(`${fileName}: HTTP ${fontRes.status}`);
        const buffer = Buffer.from(await fontRes.arrayBuffer());

        // woff2 files begin with the signature 'wOF2'.
        if (buffer.subarray(0, 4).toString('ascii') !== 'wOF2') {
          throw new Error(`${fileName}: not a woff2 file`);
        }

        fs.writeFileSync(path.join(OUT_FONTS, fileName), buffer);
        byUrl.set(face.url, fileName);
      }

      blocks.push(
        [
          '@font-face {',
          `  font-family: '${family.name}';`,
          `  font-style: ${face.style};`,
          `  font-weight: ${face.weight};`,
          // swap, so text paints immediately in the fallback and reflows once
          // the real face arrives rather than holding the first paint.
          '  font-display: swap;',
          `  src: url('./assets/fonts/${fileName}') format('woff2');`,
          ...(face.unicodeRange ? [`  unicode-range: ${face.unicodeRange};`] : []),
          '}',
        ].join('\n')
      );
    }
  }

  const header = [
    '/* GENERATED — do not edit by hand.',
    '   Regenerate with: npm run update-fonts  (scripts/fetch-fonts.mjs)',
    '',
    '   Inter and JetBrains Mono, vendored from Google Fonts and served from',
    '   this origin. Self-hosted so no inline script is needed to apply them',
    '   (the CSP forbids one) and no cross-origin round trip blocks the first',
    '   paint. Each face keeps its unicode-range, so browsers fetch only the',
    '   subsets they need.',
    '',
    '   Both families are licensed under the SIL Open Font License 1.1. */',
    '',
  ].join('\n');

  fs.writeFileSync(OUT_CSS, `${header}\n${blocks.join('\n\n')}\n`, 'utf8');

  fs.writeFileSync(
    path.join(OUT_FONTS, 'OFL.txt'),
    [
      'Inter — Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter)',
      'JetBrains Mono — Copyright (c) 2020 The JetBrains Mono Project Authors',
      '  (https://github.com/JetBrains/JetBrainsMono)',
      '',
      'Both families are licensed under the SIL Open Font License, Version 1.1.',
      'Full text: https://scripts.sil.org/OFL',
      '',
      'Regenerate these files with: npm run update-fonts',
    ].join('\n'),
    'utf8'
  );

  console.log(`\nWrote ${byUrl.size} woff2 files to src/assets/fonts/`);
  console.log(`Wrote ${path.relative(process.cwd(), OUT_CSS)} with ${blocks.length} @font-face rules`);
}

run().catch((error) => {
  console.error(`Font vendoring failed: ${error.message}`);
  process.exit(1);
});
