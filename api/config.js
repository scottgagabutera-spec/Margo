/* ============================================================
   MARGO — api/config.js
   Serves Firebase client config from environment variables.
   Keeps API keys out of the public GitHub repo.
   ============================================================ */

export default function handler(req, res) {
  const origin  = req.headers.origin || '';
  const allowed =
    origin.includes('trymargo.com') ||
    origin.includes('vercel.app')   ||
    origin === '';

  res.setHeader('Access-Control-Allow-Origin',  allowed ? origin || '*' : 'https://trymargo.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const {
    NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID,
  } = process.env;

  if (!NEXT_PUBLIC_FIREBASE_API_KEY || !NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
    return res.status(503).json({ error: 'Firebase not configured' });
  }

  return res.status(200).json({
    apiKey:            NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL:       NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId:         NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}
