/* ============================================================
   MARGO — api/youtube.js
   Vercel serverless function — YouTube API proxy
   Endpoints:
     GET /api/youtube?song=X&artist=Y  → find official video
     GET /api/youtube?suggest=X        → song title autocomplete
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

  if (!process.env.YOUTUBE_API_KEY) {
    return res.status(503).json({ error: 'YouTube not configured' });
  }

  const { song, artist, suggest } = req.query;

  // ── Suggest mode: autocomplete song titles ──
  if (suggest) {
    try {
      const q      = encodeURIComponent(`${suggest} official music video`);
      const ytRes  = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&maxResults=5&videoCategoryId=10&key=${process.env.YOUTUBE_API_KEY}`
      );
      if (!ytRes.ok) throw new Error('YouTube suggest failed');
      const data = await ytRes.json();

      const suggestions = (data.items || []).map(v => {
        // Parse "Artist - Song Title" format common in YouTube music
        const title   = v.snippet.title;
        const channel = v.snippet.channelTitle.replace('VEVO', '').replace('- Topic', '').trim();
        // Try to extract song title from "Artist - Song" pattern
        const dashIdx = title.indexOf(' - ');
        const songTitle = dashIdx > -1 ? title.slice(dashIdx + 3).replace(/\(.*?\)/g, '').trim() : title;
        const artist    = dashIdx > -1 ? title.slice(0, dashIdx).trim() : channel;

        return {
          videoId:   v.id.videoId,
          raw:       title,
          song:      songTitle,
          artist,
          thumbnail: v.snippet.thumbnails?.default?.url || null,
          channel:   v.snippet.channelTitle,
        };
      });

      return res.status(200).json({ suggestions });
    } catch (err) {
      console.error('[YouTube suggest error]', err.message);
      return res.status(500).json({ error: 'Suggest failed', detail: err.message });
    }
  }

  // ── Main mode: fetch video for confirmed song + artist ──
  if (!song && !artist) return res.status(400).json({ error: 'song or artist required' });

  try {
    const query  = encodeURIComponent(`${song || ''} ${artist || ''} official video`.trim());
    const ytRes  = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=3&key=${process.env.YOUTUBE_API_KEY}`
    );

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
