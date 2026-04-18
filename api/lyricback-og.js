/* ============================================================
   MARGO — api/lyricback-og.js
   Dynamic Open Graph tags for Lyric Back share links.
   ============================================================ */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export default async function handler(req, res) {
  const rawSlug = req.query.slug || '';
  const slug    = decodeURIComponent(rawSlug.split('?')[0]);
  const parts   = slug.split('___');
  const id1     = parts[2];
  const id2     = parts[3];

  const DB  = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  const KEY = process.env.NEXT_PUBLIC_FIRE@�SE_API_KEY;

  let title       = 'A Lyric Back on MARGO';
  let description = 'Someone echoed a lyric. Hear it on MARGO.';
  let ogUrl       = `https://trymargo.com/lyricback/${slug}`;
  let dbError     = null;

  try {
    if (id1 && id2 && DB && KEY) {
      const [r1, r2] = await Promise.all([
        fetch(`${DB}/posts/${id1}.json?auth=${KEY}`),
        fetch(`${DB}/posts/${id2}.json?auth=${KEY}`)
      ]);
      const [p1, p2] = await Promise.all([r1.json(), r2.json()]);

      if (p1 && p2 && !p1.error && !p2.error) {
        const lyric1  = p1.text   || '';
        const lyric2  = p2.text   || '';
        const song1   = p1.song   || (p1.knowledge && p1.knowledge.song)   || '';
        const artist1 = p1.artist || (p1.knowledge && p1.knowledge.artist) || '';
        const song2   = p2.song   || (p2.knowledge && p2.knowledge.song)   || '';
        const artist2 = p2.artist || (p2.knowledge && p2.knowledge.artist) || '';
        const attr1 = [song1, artist1].filter(Boolean).join(' \u2014 ');
        const attr2 = [song2, artist2].filter(Boolean).join(' \u2014 ');
        title       = `\u201C${lyric1}\u201D \u00B7 lyric back \u00B7 \u201C${lyric2}\u201D`;
        description = `${attr1} \u2192 ${attr2} \u00B7 On MARGO`;
      } else {
        dbError = JSON.stringify({p1: p1.error, p2: p2.error});
      }
    } else {
      dbError = `missing: id1=${id1} id2=${id2} DB=${!!DB} KEY=${!!KEY}`;
    }
  } catch (e) {
    dbError = e.message;
  }

  // Try multiple paths to find index.html
  const candidates = [
    path.join(process.cwd(), 'index.html'),
    path.join(process.cwd(), '..', 'index.html'),
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html')
  ];

  let html = null;
  let tried = [];
  for (const p of candidates) {
    try {
      html = fs.readFileSync(p, 'utf8');
      break;
    } catch (e) {
      tried.push(`${p}: ${e.message}`);
    }
  }

  if (!html) {
    return res.status(500).send(`cwd: ${process.cwd()}\nTried:\n${tried.join('\n')}\ndbError: ${dbError}`);
  }

  const esc = s => String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html
    .replace(/(<meta property="og:title"[^>]*content=")[^"]*(")/,        `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description"[^>]*content=")[^"]*(")/,  `$1${esc(description)}$2`)
    .replace(/(<meta property="og:url"[^>]*content=")[^"]*(")/,          `$1${esc(ogUrl)}$2`)
    .replace(/(<meta name="twitter:title"[^>]*content=")[^"]*(")/,       `$1${esc(title)}$2`)
    .replace(/(<meta name="twitter:description"[^>]*content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<link rel="canonical"[^>]*href=")[^"]*(")/,               `$1${esc(ogUrl)}$2`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(html);
}