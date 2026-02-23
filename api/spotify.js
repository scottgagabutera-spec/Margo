/* ============================================================
   MARGO — api/spotify.js
   Vercel serverless function — Spotify API proxy
   Keeps client ID and secret server-side and safe.
   Endpoints:
     GET /api/spotify?song=X&artist=Y  → search for a track
   ============================================================ */

export default async function handler(req, res) {
  // ── CORS — allow production + all Vercel preview URLs ──
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

  const { song, artist } = req.query;
  if (!song && !artist) return res.status(400).json({ error: 'song or artist required' });

  // ── Check keys exist ──
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return res.status(503).json({ error: 'Spotify not configured — check Vercel environment variables' });
  }

  try {
    // ── Step 1: Get Spotify access token ──
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
        ).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[Spotify token error]', tokenRes.status, errText);
      throw new Error('Failed to get Spotify token');
    }
    const { access_token } = await tokenRes.json();

    // ── Step 2: Search Spotify ──
    // Use simple combined query — more reliable than field filters
    const queryParts = [];
    if (song)   queryParts.push(song);
    if (artist) queryParts.push(artist);
    const searchQ   = encodeURIComponent(queryParts.join(' '));

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${searchQ}&type=track&limit=1`,
      { headers: { 'Authorization': `Bearer ${access_token}` } }
    );

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error('[Spotify search error]', searchRes.status, errText);
      throw new Error('Spotify search failed');
    }

    const data  = await searchRes.json();
    const track = data.tracks?.items?.[0];

    if (!track) return res.status(404).json({ error: 'No track found' });

    // ── Step 3: Return only what Margo needs ──
    return res.status(200).json({
      song:        track.name,
      artist:      track.artists.map(a => a.name).join(', '),
      album:       track.album.name,
      albumArt:    track.album.images?.[0]?.url || null,
      albumArtSm:  track.album.images?.[2]?.url || null,
      previewUrl:  track.preview_url             || null,
      spotifyUrl:  track.external_urls?.spotify  || null,
      releaseYear: track.album.release_date?.slice(0, 4) || null,
      popularity:  track.popularity              || 0,
    });

  } catch (err) {
    console.error('[Spotify API Error]', err.message);
    return res.status(500).json({ error: 'Spotify lookup failed', detail: err.message });
  }
}
