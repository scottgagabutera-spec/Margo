/* ============================================================
   MARGO — api/lyricback-og.js
   Minimal OG-tag shell - no filesystem read needed.
   Social scrapers get dynamic OG tags.
   Real users get redirected to the SPA immediately.
   ============================================================ */

export default async function handler(req, res) {
  const rawSlug = req.query.slug || '';
  const slug    = decodeURIComponent(rawSlug.split('?')[0]);
  const parts   = slug.split('___');
  const id1     = parts[2];
  const id2     = parts[3];

  const DB  = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  const KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  let title       = 'A Lyric Back on MARGO';
  let description = 'Someone echoed a lyric. Hear it on MARGO.';
  const ogUrl     = `https://trymargo.com/lyricback/${slug}`;
  const ogImage   = 'https://trymargo.com/og-image.png';

  try {
    if (id1 && id2 && DB && KEY) {
      const [r1, r2] = await Promise.all([
        fetch(`${DB}/posts/${id1}.json`),
        fetch(`${DB}/posts/${id2}.json`)
      ]);
      const [p1, p2] = await Promise.all([r1.json(), r2.json()]);
      if (p1 && p2 && !p1.error && !p2.error) {
        const l1 = p1.text || '';
        const l2 = p2.text || '';
        const s1 = p1.song   || (p1.knowledge && p1.knowledge.song)   || '';
        const a1 = p1.artist || (p1.knowledge && p1.knowledge.artist) || '';
        const s2 = p2.song   || (p2.knowledge && p2.knowledge.song)   || '';
        const a2 = p2.artist || (p2.knowledge && p2.knowledge.artist) || '';
        const attr1 = [s1, a1].filter(Boolean).join(' \u2014 ');
        const attr2 = [s2, a2].filter(Boolean).join(' \u2014 ');
        title       = `\u201C${l1}\u201D \u00B7 lyric back \u00B7 \u201C${l2}\u201D`;
        description = `${attr1} \u2192 ${attr2} \u00B7 On MARGO`;
      }
    }
  } catch (e) {
    // fall back silently
  }

  const esc = s => String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${esc(title)}</title>
  <meta property="og:type"         content="website"/>
  <meta property="og:site_name"    content="MARGO"/>
  <meta property="og:title"        content="${esc(title)}"/>
  <meta property="og:description"  content="${esc(description)}"/>
  <meta property="og:url"          content="${esc(ogUrl)}"/>
  <meta property="og:image"        content="${esc(ogImage)}"/>
  <meta property="og:image:width"  content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta name="twitter:card"        content="summary_large_image"/>
  <meta name="twitter:title"       content="${esc(title)}"/>
  <meta name="twitter:description" content="${esc(description)}"/>
  <meta name="twitter:image"       content="${esc(ogImage)}"/>
  <link rel="canonical"            href="${esc(ogUrl)}"/>
  <script>window.location.replace('${ogUrl.replace(/\\'/g, '\\\\\'')}');</script>
</head>
<body>
  <p>Opening MARGO...</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(html);
}