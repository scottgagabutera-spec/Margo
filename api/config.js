/* ============================================================
   MARGO — api/config.js
   Serves Firebase client config from environment variables.
   Keeps API keys out of the public GitHub repo.
   ============================================================ */

export default function handler(req, res) {
  const origin  = req.headers.origin || '';
  const allowed =
    origin.includes('trymargo.com') ||
    origin.includes('margo-silk.vercel.app') ||
    origin === '';

  res.setHeader('Access-Control-Allow-Origin',  allowed ? origin || '*' : 'https://trymargo.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const {
    FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_DATABASE_URL,
    FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID,
  } = process.env;

  if (!FIREBASE_API_KEY || !FIREBASE_DATABASE_URL) {
    return res.status(503).json({ error: 'Firebase not configured' });
  }

  return res.status(200).json({
    apiKey:            FIREBASE_API_KEY,
    authDomain:        FIREBASE_AUTH_DOMAIN,
    databaseURL:       FIREBASE_DATABASE_URL,
    projectId:         FIREBASE_PROJECT_ID,
    storageBucket:     FIREBASE_STORAGE_BUCKET,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
    appId:             FIREBASE_APP_ID,
  });
}
