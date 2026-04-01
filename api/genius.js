/* ============================================================
   MARGO — api/genius.js
   Vercel serverless function — Genius API proxy
   Used for lyric-to-song identification.
   Endpoints:
     GET /api/genius?lyric=X  → identify song from lyric text
     GET /api/genius?song=X   → search by song title
   v2.0 — parallel Genius + iTunes search with deduplication
   ============================================================ */

// ── Server-side cache (per cold start) ──
const searchCache = {};

function normalize(str) {
  return (str || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function dedupe(results) {
  const seen = new Set();
  return results.filter(r => {
    const key = normalize(r.song) + '|' + normalize(r.artist);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchGenius(query, apiKey) {
  const q = encodeURIComponent(query.trim());
  const r = await fetch(
    `https://api.genius.com/search?q=${q}&per_page=5`,
    { headers: { 'Authorization': `Bearer ${apiKey}` } }
  );
  if (!r.ok) return [];
  const data = await r.json();
  const hits = data.response?.hits || [];
  return hits.slice(0, 2).map(h => {
    const s = h.result;
    return {
      song:        s.title,
      artist:      s.primary_artist?.name || 'Unknown Artist',
      artwork:     s.song_art_image_thumbnail_url || s.header_image_thumbnail_url || null,
      artworkFull: s.song_art_image_url || s.header_image_url || null,
      geniusUrl:   s.url || null,
      id:          s.id,
      source:      'genius',
    };
  });
}

async function searchItunes(query) {
  const q = encodeURIComponent(query.trim());
  const r = await fetch(
    `https://itunes.apple.com/search?term=${q}&entity=song&limit=8&version=2`
  );
  if (!r.ok) return [];
  const data = await r.json();
  const tracks = (data.results || []).filter(t => t.wrapperType === 'track');
  return tracks.slice(0, 3).map(t => ({
    song:        t.trackName,
    artist:      t.artistName || 'Unknown Artist',
    artwork:     t.artworkUrl100 || null,
    artworkFull: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '600x600bb') : null,
    geniusUrl:   null,
    id:          null,
    source:      'itunes',
  }));
}

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

  const { lyric, song, id } = req.query;

  // ── Song detail by Genius ID ──
  if (id) {
    try {
      const r = await fetch(
        `https://api.genius.com/songs/${id}?text_format=plain`,
        { headers: { 'Authorization': `Bearer ${process.env.GENIUS_API_KEY}` } }
      );
      if (!r.ok) return res.status(404).json({ error: 'Song not found' });
      const data = await r.json();
      const s = data.response?.song;
      if (!s) return res.status(404).json({ error: 'Song not found' });
      return res.status(200).json({
        song:            s.title,
        artist:          s.primary_artist?.name || null,
        album:           s.album?.name          || null,
        releaseDate:     s.release_date_for_display || null,
        featuredArtists: s.featured_artists?.map(a => a.name) || [],
        producers:       s.producer_artists?.map(a => a.name) || [],
        writers:         s.writer_artists?.map(a => a.name)   || [],
        artwork:         s.song_art_image_thumbnail_url        || null,
        artworkFull:     s.song_art_image_url                  || null,
        geniusUrl:       s.url                                 || null,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Song detail lookup failed' });
    }
  }

  const query = lyric || song;
  if (!query) return res.status(400).json({ error: 'lyric or song query required' });

  if (!process.env.GENIUS_API_KEY) {
    return res.status(503).json({ error: 'Genius not configured' });
  }

  // ── Check cache first ──
  const cacheKey = normalize(query);
  if (searchCache[cacheKey]) {
    return res.status(200).json({ results: searchCache[cacheKey], source: 'cache' });
  }

  try {
    // ── Fire Genius + iTunes in parallel ──
    const [geniusResult, itunesResult] = await Promise.allSettled([
      searchGenius(query, process.env.GENIUS_API_KEY),
      searchItunes(query),
    ]);

    const geniusResults = geniusResult.status === 'fulfilled' ? geniusResult.value : [];
    const itunesResults = itunesResult.status === 'fulfilled' ? itunesResult.value : [];

    // ── Merge: Genius first, iTunes fills gaps ──
    const merged = dedupe([...geniusResults, ...itunesResults]);
    const results = merged.slice(0, 5);

    if (!results.length) {
      return res.status(404).json({ error: 'No results found' });
    }

    // ── Cache the result ──
    searchCache[cacheKey] = results;

    return res.status(200).json({ results });

  } catch (err) {
    console.error('[Search Error]', err.message);
    return res.status(500).json({ error: 'Search failed', detail: err.message });
  }
}
