// api/inspire.js — Gemini-powered lyric suggestion proxy
// Vercel serverless function — API key stays server-side, never exposed to browser

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { emotion } = req.body;
  if (!emotion) {
    return res.status(400).json({ error: 'emotion is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const prompt = `You are a poetic writing assistant for a music-based social platform called Margo.
Users share short lyric-style lines (max 140 chars) that express how they feel.
Your job: suggest 3 original, evocative lines matching the requested emotion.
Rules:
- Never reproduce real song lyrics
- Each line must be original and poetic
- Max 100 characters per line
- No quotation marks around the lines
- Return ONLY a JSON array of 3 strings, nothing else
- Example format: ["line one here","line two here","line three here"]

Suggest 3 original poetic lines for the emotion: ${emotion}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 300,
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'Gemini error', detail: err });
    }

    const data = await response.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Strip markdown code fences if Gemini wraps the response
    const clean = raw.replace(/```json|```/g, '').trim();
    const suggestions = JSON.parse(clean);

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return res.status(502).json({ error: 'No suggestions returned' });
    }

    return res.status(200).json({ suggestions });

  } catch (err) {
    console.error('inspire error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
