import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'

// One-time backfill: counts existing echoes for all posts and writes postStats.echoCount
// Hit GET /api/backfill-echo-counts once from the browser (admin only, delete after use)

function initAdmin() {
  if (getApps().length > 0) return
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  })
}

export async function GET() {
  try {
    initAdmin()
    const db = getDatabase()

    // Read all posts
    const postsSnap = await db.ref('posts').get()
    if (!postsSnap.exists()) {
      return NextResponse.json({ message: 'No posts found', updated: 0 })
    }

    const posts = postsSnap.val() as Record<string, any>
    const updates: Record<string, number> = {}

    for (const [postId, post] of Object.entries(posts)) {
      const echoCount = post.echoes ? Object.keys(post.echoes).length : 0
      if (echoCount > 0) {
        updates[postId] = echoCount
      }
    }

    // Write all echoCount values in one multi-path update
    if (Object.keys(updates).length > 0) {
      const multiPath: Record<string, number> = {}
      for (const [postId, count] of Object.entries(updates)) {
        multiPath[`postStats/${postId}/echoCount`] = count
      }
      await db.ref().update(multiPath)
    }

    return NextResponse.json({
      message: 'Backfill complete',
      updated: Object.keys(updates).length,
      counts: updates,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
