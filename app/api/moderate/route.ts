import { NextRequest, NextResponse } from 'next/server'
import { getApps, initializeApp, cert, App } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'

function getAdminApp(): App {
  if (getApps().length) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { text, postId } = await request.json()  // ← added postId
    if (!text) return NextResponse.json({ flagged: false })
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ flagged: false })

    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: text }),
    })

    if (!res.ok) return NextResponse.json({ flagged: false })
    const data = await res.json()
    const result = data.results?.[0]
    const flagged = result?.flagged || false
    const categories = result?.categories || {}
    const scores = result?.category_scores || {}

    // ← added block: server-side write via admin SDK, bypasses rules correctly
    if (flagged && postId) {
      try {
        const db = getDatabase(getAdminApp())
        await db.ref(`posts/${postId}/flagCount`).set(10)
      } catch (e) {
        console.error('[moderate] Failed to write flagCount:', e)
      }
    }

    return NextResponse.json({ flagged, categories, scores })
  } catch (err: any) {
    return NextResponse.json({ flagged: false, detail: err.message })
  }
}