/* ============================================================
   MARGO — api/youtube.js
   v3.0 — Waterfall metadata engine
   
   Priority order:
     1. YouTube  — best (official video, watch link)
                   but 100 units/search, 10,000/day quota
     2. Deezer   — free, no key, no quota, album art 1000px
     3. iTunes   — free, no key, no quota, artwork 600px
   
   Each source tried in order. First good result wins.
   If all fail → 404 (backfill will retry later).

   Endpoints:
     GET /api/youtube?song=X&artist=Y  → metadata + art
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
     SUGGEST MODE — unchanged, zero quota
  ══════════════════════════════════════════════════════════ */
  if (suggest) {
    try {
      const q   = encodeURIComponent(suggest.trim());
      const url = `https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&ds=yt&q=${q}&callback=cb`;
      const r   = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Margo/1.0)',
          'Accept':     'text/javascript',
        }
      });
      if (!r.ok) throw new Error('Suggest fetch failed');
      const text    = await r.text();
      const jsonStr = text.replace(/^[^(]+\(/, '').replace(/\)[^)]*$/, '');
      const parsed  = JSON.parse(jsonStr);
      const rawTerms = parsed[1] || [];
      const suggestions = rawTerms.slice(0, 6).map(item => {
        const raw   = Array.isArray(item) ? item[0] : item;
        const clean = String(raw).replace(/<[^>]+>/g, '').trim();
        const dashIdx   = clean.indexOf(' - ');
        const songTitle = dashIdx > -1 ? clean.slice(dashIdx + 3).replace(/\(.*?\)/g, '').trim() : clean;
        const artistName = dashIdx > -1 ? clean.slice(0, dashIdx).trim() : '';
        return { raw: clean, song: songTitle, artist: artistName, thumbnail: null };
      }).filter(s => s.raw.length > 2);
      return res.status(200).json({ suggestions });
    } catch (err) {
      console.error('[suggest error]', err.message);
      return res.status(200).json({ suggestions: [] });
    }
  }

  /* ══════════════════════════════════════════════════════════
     MAIN MODE — waterfall
  ══════════════════════════════════════════════════════════ */
  if (!song && !artist) return res.status(400).json({ error: 'song or artist required' });

  const cleanSong   = (song   || '').trim();
  const cleanArtist = (artist || '').trim();

  // ── 1. YouTube ────────────────────────────────────────────
  if (process.env.YOUTUBE_API_KEY) {
    try {
      const query  = encodeURIComponent(`${cleanSong} ${cleanArtist} official video`.trim());
      const ytRes  = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=3&key=${process.env.YOUTUBE_API_KEY}`
      );

      if (ytRes.status === 403) {
        const errBody = await ytRes.json().catch(() => ({}));
        const reason  = errBody?.error?.errors?.[0]?.reason || '';
        if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
          console.warn('[YouTube] Quota exhausted — falling through to Deezer');
          // Don't return 429 — just fall through to next source
        } else {
          throw new Error(`YouTube 403: ${reason}`);
        }
      } else if (ytRes.ok) {
        const data  = await ytRes.json();
        const items = data.items || [];
        if (items.length) {
          const official = items.find(v =>
            v.snippet.channelTitle.toLowerCase().includes('vevo') ||
            v.snippet.channelTitle.toLowerCase().includes('official') ||
            v.snippet.title.toLowerCase().includes('official video') ||
            v.snippet.title.toLowerCase().includes('official music video')
          ) || items[0];

          const videoId = official.id.videoId;
          console.log(`[YouTube] ✓ ${cleanSong} — ${cleanArtist}`);
          return res.status(200).json({
            source:      'youtube',
            videoId,
            title:       official.snippet.title,
            thumbnail:   official.snippet.thumbnails?.high?.url    || null,
            thumbnailSm: official.snippet.thumbnails?.default?.url || null,
            channel:     official.snippet.channelTitle,
            youtubeUrl:  `https://www.youtube.com/watch?v=${videoId}`,
            embedUrl:    `https://www.youtube.com/embed/${videoId}?autoplay=0`,
          });
        }
      }
    } catch (err) {
      console.warn('[YouTube] error, falling through:', err.message);
    }
  }

  // ── 2. Deezer ─────────────────────────────────────────────
  // Completely free, no API key, no signup, no quota.
  // Returns album art up to 1000×1000px.
  try {
    const q       = encodeURIComponent(`"${cleanSong}" "${cleanArtist}"`);
    const dzRes   = await fetch(
      `https://api.deezer.com/search?q=${q}&limit=5&output=json`,
      { headers: { 'User-Agent': 'Margo/1.0' } }
    );

    if (dzRes.ok) {
      const dzData = await dzRes.json();
      const tracks = dzData.data || [];

      // Score results: prefer title + artist match
      const scored = tracks.map(t => {
        const titleMatch  = t.title?.toLowerCase().includes(cleanSong.toLowerCase())   ? 2 : 0;
        const artistMatch = t.artist?.name?.toLowerCase().includes(cleanArtist.toLowerCase()) ? 2 : 0;
        return { t, score: titleMatch + artistMatch };
      }).sort((a, b) => b.score - a.score);

      const best = scored[0]?.t;

      if (best && scored[0].score >= 2) {
        // Deezer album art: replace /image with size suffix
        const thumbLg = best.album?.cover_xl  || best.album?.cover_big  || best.album?.cover || null;
        const thumbSm = best.album?.cover_medium || best.album?.cover   || null;
        const ytQuery = encodeURIComponent(`${best.title} ${best.artist?.name} official video`);

        console.log(`[Deezer] ✓ ${cleanSong} — ${cleanArtist}`);
        return res.status(200).json({
          source:      'deezer',
          videoId:     null,
          title:       best.title,
          thumbnail:   thumbLg,
          thumbnailSm: thumbSm,
          channel:     best.artist?.name || cleanArtist,
          // No embed but give a YouTube search link as fallback
          youtubeUrl:  `https://www.youtube.com/results?search_query=${ytQuery}`,
          embedUrl:    null,
          previewUrl:  best.preview || null, // 30s free preview MP3
          deezerId:    best.id      || null,
          deezerUrl:   best.link    || null,
        });
      }
    }
  } catch (err) {
    console.warn('[Deezer] error, falling through:', err.message);
  }

  // ── 3. iTunes / Apple Music ───────────────────────────────
  // Completely free, no API key, no quota.
  // Returns artwork up to 600×600px (swap 100x100 → 600x600 in URL).
  try {
    const q       = encodeURIComponent(`${cleanSong} ${cleanArtist}`);
    const itRes   = await fetch(
      `https://itunes.apple.com/search?term=${q}&entity=song&limit=5&media=music`,
      { headers: { 'User-Agent': 'Margo/1.0' } }
    );

    if (itRes.ok) {
      const itData = await itRes.json();
      const tracks = itData.results || [];

      const scored = tracks.map(t => {
        const titleMatch  = t.trackName?.toLowerCase().includes(cleanSong.toLowerCase())   ? 2 : 0;
        const artistMatch = t.artistName?.toLowerCase().includes(cleanArtist.toLowerCase()) ? 2 : 0;
        return { t, score: titleMatch + artistMatch };
      }).sort((a, b) => b.score - a.score);

      const best = scored[0]?.t;

      if (best && scored[0].score >= 2) {
        // iTunes artwork URL: replace 100x100 with 600x600 for high res
        const artworkHi = best.artworkUrl100?.replace('100x100', '600x600') || null;
        const artworkSm = best.artworkUrl100 || null;
        const ytQuery   = encodeURIComponent(`${best.trackName} ${best.artistName} official video`);

        console.log(`[iTunes] ✓ ${cleanSong} — ${cleanArtist}`);
        return res.status(200).json({
          source:      'itunes',
          videoId:     null,
          title:       best.trackName,
          thumbnail:   artworkHi,
          thumbnailSm: artworkSm,
          channel:     best.artistName,
          youtubeUrl:  `https://www.youtube.com/results?search_query=${ytQuery}`,
          embedUrl:    null,
          previewUrl:  best.previewUrl  || null, // 30s preview
          itunesUrl:   best.trackViewUrl || null,
          collectionName: best.collectionName || null,
        });
      }
    }
  } catch (err) {
    console.warn('[iTunes] error:', err.message);
  }

  // ── All sources failed ─────────────────────────────────────
  console.warn(`[Metadata] all sources failed: ${cleanSong} — ${cleanArtist}`);
  return res.status(404).json({ error: 'No metadata found' });
}
