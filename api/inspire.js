// api/inspire.js — Margo AI Inspire Proxy
// Deployed as a Vercel serverless function.
// Holds the Anthropic API key server-side — never exposed to the browser.
//
// SETUP:
// 1. Add this file to your repo at: /api/inspire.js
// 2. In Vercel dashboard → Settings → Environment Variables → add:
//    ANTHROPIC_API_KEY = sk-ant-...
// 3. Redeploy. Done.

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic CORS — restrict to your domain in production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { emotion } = req.body || {};

  if (!emotion || typeof emotion !== 'string') {
    return res.status(400).json({ error: 'Missing emotion field' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: `You are a poetic writing assistant for a music-based social platform called Margo.
Users share short lyric-style lines (max 140 chars) that express how they feel.
Your job: suggest 3 original, evocative lines matching the requested emotion.
Rules:
- Never reproduce real song lyrics
- Each line must be original and poetic
- Max 100 characters per line
- No quotation marks around the lines
- Return ONLY a JSON array of 3 strings, nothing else
- Example format: ["line one here","line two here","line three here"]`,
        messages: [{
          role: 'user',
          content: `Suggest 3 original poetic lines for the emotion: ${emotion}`
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return res.status(502).json({ error: 'Upstream API error' });
    }

    const data = await response.json();
    const raw  = data?.content?.[0]?.text || '[]';
    const clean = raw.replace(/```json|```/g, '').trim();

    // Validate it's a JSON array before forwarding
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) throw new Error('Unexpected format');

    return res.status(200).json({ suggestions: parsed });

  } catch (err) {
    console.error('Inspire handler error:', err);
    return res.status(500).json({ error: 'Failed to generate suggestions' });
  }
}
