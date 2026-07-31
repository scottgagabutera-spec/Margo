import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { url } = body
  if (!url) {
    return NextResponse.json({ success: false, error: 'Missing Linktree URL.' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
  } catch {
    return NextResponse.json({ success: false, error: 'Not a valid URL.' }, { status: 400 })
  }

  if (!/(^|\.)linktr\.ee$/.test(parsed.hostname)) {
    return NextResponse.json({ success: false, error: "That doesn't look like a Linktree URL." }, { status: 400 })
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MargoImportBot/1.0)' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Could not load that Linktree page (status ${res.status}).` })
    }
    const html = await res.text()

    // Linktree embeds a Next.js __NEXT_DATA__ JSON blob server-side —
    // no JS execution needed to read it.
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
    if (!match) {
      return NextResponse.json({ success: false, error: 'Could not read that Linktree page — it may have changed format.' })
    }

    let data: any
    try {
      data = JSON.parse(match[1])
    } catch {
      return NextResponse.json({ success: false, error: 'Could not parse that Linktree page.' })
    }

    // Path is a best-effort guess pending a live test — flag if this
    // comes back empty on a real profile that clearly has links set.
    const rawLinks: any[] =
      data?.props?.pageProps?.links ||
      data?.props?.pageProps?.account?.links ||
      []

    const links = rawLinks
      .filter((l: any) => l?.url)
      .map((l: any) => ({ url: String(l.url), title: String(l.title || '') }))

    if (links.length === 0) {
      return NextResponse.json({ success: false, error: 'No links found on that Linktree page.' })
    }

    return NextResponse.json({ success: true, links })
  } catch {
    return NextResponse.json({ success: false, error: 'Could not reach that Linktree page. Check the link and try again.' })
  }
}