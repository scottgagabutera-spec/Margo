/* ============================================================
   MARGO — api/youtube.js
   Vercel serverless function — YouTube API proxy
   Keeps API key server-side and safe.
   Endpoints:
     GET /api/youtube?song=X&artist=Y  → find official video
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

  // ── Check key exists ──
  if (!process.env.YOUTUBE_API_KEY) {
    return res.status(503).json({ error: 'YouTube not configured — check Vercel environment variables' });
  }

  try {
    // Search YouTube for official video
    const query  = encodeURIComponent(`${song || ''} ${artist || ''} official video`.trim());
    const ytRes  = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=3&key=${process.env.YOUTUBE_API_KEY}`
    );

    if (!ytRes.ok) {
      const errText = await ytRes.text();
      console.error('[YouTube search error]', ytRes.status, errText);
      throw new Error('YouTube search failed');
    }

    const data = await ytRes.json();

    // Pick best result — prefer official VEVO or artist channel
    const items = data.items || [];
    if (!items.length) return res.status(404).json({ error: 'No video found' });

    // Try to find official/VEVO video first
    const official = items.find(v =>
      v.snippet.channelTitle.toLowerCase().includes('vevo') ||
      v.snippet.channelTitle.toLowerCase().includes('official') ||
      v.snippet.title.toLowerCase().includes('official video') ||
      v.snippet.title.toLowerCase().includes('official music video')
    ) || items[0]; // fallback to first result

    const videoId = official.id.videoId;

    return res.status(200).json({
      videoId,
      title:      official.snippet.title,
      thumbnail:  official.snippet.thumbnails?.high?.url   || null,
      thumbnailSm:official.snippet.thumbnails?.default?.url|| null,
      channel:    official.snippet.channelTitle,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl:   `https://www.youtube.com/embed/${videoId}?autoplay=0`,
    });

  } catch (err) {
    console.error('[YouTube API Error]', err.message);
    return res.status(500).json({ error: 'YouTube lookup failed', detail: err.message });
  }
}
