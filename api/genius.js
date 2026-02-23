/* ============================================================
   MARGO — api/genius.js
   Vercel serverless function — Genius API proxy
   Used for lyric-to-song identification.
   Endpoints:
     GET /api/genius?lyric=X  → identify song from lyric text
     GET /api/genius?song=X   → search by song title
   ============================================================ */

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed =
    origin.includes('trymargo.com') ||
    origin.includes('vercel.app')   ||
    origin === '';

  res.setHeader('Access-Control-Allow-Origin', allowed ? origin || '*' : 'https://trymargo.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const { lyric, song } = req.query;
  const query = lyric || song;
  if (!query) return res.status(400).json({ error: 'lyric or song query required' });

  if (!process.env.GENIUS_API_KEY) {
    return res.status(503).json({ error: 'Genius not configured' });
  }

  try {
    const q   = encodeURIComponent(query.trim());
    const r   = await fetch(
      `https://api.genius.com/search?q=${q}&per_page=5`,
      { headers: { 'Authorization': `Bearer ${process.env.GENIUS_API_KEY}` } }
    );

    if (!r.ok) {
      const errText = await r.text();
      console.error('[Genius search error]', r.status, errText);
      throw new Error('Genius search failed');
    }

    const data = await r.json();
    const hits = data.response?.hits || [];

    if (!hits.length) return res.status(404).json({ error: 'No results found' });

    // Return top 3 results for autocomplete
    const results = hits.slice(0, 3).map(h => {
      const s = h.result;
      return {
        song:        s.title,
        artist:      s.primary_artist?.name || 'Unknown Artist',
        artwork:     s.song_art_image_thumbnail_url || s.header_image_thumbnail_url || null,
        artworkFull: s.song_art_image_url            || s.header_image_url           || null,
        geniusUrl:   s.url                           || null,
        id:          s.id,
      };
    });

    return res.status(200).json({ results });

  } catch (err) {
    console.error('[Genius API Error]', err.message);
    return res.status(500).json({ error: 'Genius lookup failed', detail: err.message });
  }
}
