/* ============================================================
   MARGO — api/youtube.js
   Vercel serverless function — YouTube API proxy
   v2.1 — Zero-quota suggest via suggestqueries endpoint
           Quota guard: returns 429 when API is exhausted
           so backfill runner can back off gracefully
   Endpoints:
     GET /api/youtube?song=X&artist=Y  → find official video
     GET /api/youtube?suggest=X        → zero-quota autocomplete
   ============================================================ */

export default async function handler(req, res) {
  const origin  = req.headers.origin || '';
  const allowed =
    origin.includes('trymargo.com') ||
    origin.includes('vercel.app')   ||
    origin === '';

  res.setHeader('Access-Control-Allow-Origin',  allowed ? origin || '*' : 'https://trymargo.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const { song, artist, suggest } = req.query;

  /* ══════════════════════════════════════════════════════════
     SUGGEST MODE — YouTube's internal autocomplete API
     Zero quota cost. No API key needed.
     Returns up to 5 song title suggestions.
  ══════════════════════════════════════════════════════════ */
  if (suggest) {
    try {
      const q   = encodeURIComponent(suggest.trim());
      // YouTube's own suggest endpoint — same one the search bar uses
      const url = `https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&ds=yt&q=${q}&callback=cb`;
      const r   = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Margo/1.0)',
          'Accept':     'text/javascript',
        }
      });

      if (!r.ok) throw new Error('Suggest fetch failed');

      const text = await r.text();

      // Response is JSONP: cb(["query", ["suggestion1", "suggestion2", ...], ...])
      const jsonStr  = text.replace(/^[^(]+\(/, '').replace(/\)[^)]*$/, '');
      const parsed   = JSON.parse(jsonStr);
      const rawTerms = parsed[1] || [];

      const suggestions = rawTerms.slice(0, 6).map(item => {
        const raw   = Array.isArray(item) ? item[0] : item;
        const clean = String(raw).replace(/<[^>]+>/g, '').trim();

        // Parse "Artist - Song" pattern common in music searches
        const dashIdx    = clean.indexOf(' - ');
        const songTitle  = dashIdx > -1
          ? clean.slice(dashIdx + 3).replace(/\(.*?\)/g, '').trim()
          : clean;
        const artistName = dashIdx > -1 ? clean.slice(0, dashIdx).trim() : '';

        return { raw: clean, song: songTitle, artist: artistName, thumbnail: null };
      }).filter(s => s.raw.length > 2);

      return res.status(200).json({ suggestions });
    } catch (err) {
      console.error('[YouTube suggest error]', err.message);
      // Graceful fallback — empty list, composer still works fine
      return res.status(200).json({ suggestions: [] });
    }
  }

  /* ══════════════════════════════════════════════════════════
     MAIN MODE — find official video for confirmed song+artist
     Uses YouTube Data API v3 (costs quota units).
     Returns 429 on quota exhaustion so backfill backs off.
  ══════════════════════════════════════════════════════════ */
  if (!song && !artist) return res.status(400).json({ error: 'song or artist required' });

  if (!process.env.YOUTUBE_API_KEY) {
    return res.status(503).json({ error: 'YouTube not configured' });
  }

  try {
    const query = encodeURIComponent(`${song || ''} ${artist || ''} official video`.trim());
    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=3&key=${process.env.YOUTUBE_API_KEY}`
    );

    // ── Quota exhausted — tell caller to back off cleanly ──
    if (ytRes.status === 403) {
      const errBody = await ytRes.json().catch(() => ({}));
      const reason  = errBody?.error?.errors?.[0]?.reason || '';
      if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
        console.error('[YouTube] Quota exhausted for today');
        return res.status(429).json({ error: 'quotaExceeded' });
      }
      throw new Error(`YouTube 403: ${reason}`);
    }

    if (!ytRes.ok) {
      const errText = await ytRes.text();
      console.error('[YouTube search error]', ytRes.status, errText);
      throw new Error('YouTube search failed');
    }

    const data  = await ytRes.json();
    const items = data.items || [];
    if (!items.length) return res.status(404).json({ error: 'No video found' });

    const official = items.find(v =>
      v.snippet.channelTitle.toLowerCase().includes('vevo') ||
      v.snippet.channelTitle.toLowerCase().includes('official') ||
      v.snippet.title.toLowerCase().includes('official video') ||
      v.snippet.title.toLowerCase().includes('official music video')
    ) || items[0];

    const videoId = official.id.videoId;
    return res.status(200).json({
      videoId,
      title:       official.snippet.title,
      thumbnail:   official.snippet.thumbnails?.high?.url    || null,
      thumbnailSm: official.snippet.thumbnails?.default?.url || null,
      channel:     official.snippet.channelTitle,
      youtubeUrl:  `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl:    `https://www.youtube.com/embed/${videoId}?autoplay=0`,
    });

  } catch (err) {
    console.error('[YouTube API Error]', err.message);
    return res.status(500).json({ error: 'YouTube lookup failed', detail: err.message });
  }
}
