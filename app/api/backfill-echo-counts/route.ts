import { NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getDatabase, ref, get, update } from 'firebase/database'

// One-time backfill: counts existing echoes for all posts and writes postStats.echoCount
// Hit GET /api/backfill-echo-counts once from the browser, then delete this file.

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export async function GET() {
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    const db = getDatabase(app)

    const postsSnap = await get(ref(db, 'posts'))
    if (!postsSnap.exists()) {
      return NextResponse.json({ message: 'No posts found', updated: 0 })
    }

    const posts = postsSnap.val() as Record<string, any>
    const multiPath: Record<string, number> = {}

    for (const [postId, post] of Object.entries(posts)) {
      const echoCount = post.echoes ? Object.keys(post.echoes).length : 0
      if (echoCount > 0) {
        multiPath[`postStats/${postId}/echoCount`] = echoCount
      }
    }

    if (Object.keys(multiPath).length > 0) {
      await update(ref(db), multiPath)
    }

    return NextResponse.json({
      message: 'Backfill complete',
      updated: Object.keys(multiPath).length,
      counts: multiPath,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
