import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
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

    return NextResponse.json({ flagged, categories, scores })
  } catch (err: any) {
    return NextResponse.json({ flagged: false, detail: err.message })
  }
}
