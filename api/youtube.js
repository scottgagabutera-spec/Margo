/* ============================================================
   MARGO — api/youtube.js
   Vercel serverless function — YouTube API proxy
   Keeps API key server-side and safe.
   Endpoints:
     GET /api/youtube?song=X&artist=Y  → find official video
   ============================================================ */

export default async function handler(req, res) {
  // ── CORS headers ──
  res.setHeader('Access-Control-Allow-Origin', 'https://trymargo.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const { song, artist } = req.query;
  if (!song && !artist) return res.status(400).json({ error: 'song or artist required' });

  // NOTE: Add YOUTUBE_API_KEY to Vercel environment variables when ready
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) return res.status(503).json({ error: 'YouTube not configured yet' });

  try {
    const query    = encodeURIComponent(`${song || ''} ${artist || ''} official video`.trim());
    const ytRes    = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`
    );

    if (!ytRes.ok) throw new Error('YouTube search failed');
    const data  = await ytRes.json();
    const video = data.items?.[0];

    if (!video) return res.status(404).json({ error: 'No video found' });

    return res.status(200).json({
      videoId:   video.id.videoId,
      title:     video.snippet.title,
      thumbnail: video.snippet.thumbnails?.high?.url || null,
      channel:   video.snippet.channelTitle,
      youtubeUrl:`https://www.youtube.com/watch?v=${video.id.videoId}`,
      embedUrl:  `https://www.youtube.com/embed/${video.id.videoId}`,
    });

  } catch (err) {
    console.error('[YouTube API Error]', err.message);
    return res.status(500).json({ error: 'YouTube lookup failed' });
  }
}
