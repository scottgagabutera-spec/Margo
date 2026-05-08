import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { audioUrl, lyrics } = await request.json()
    if (!audioUrl) return NextResponse.json({ error: 'audioUrl required' }, { status: 400 })
    if (!lyrics) return NextResponse.json({ error: 'lyrics required' }, { status: 400 })
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 })

    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) return NextResponse.json({ error: 'Could not fetch audio from R2' }, { status: 400 })
    const audioBuffer = await audioRes.arrayBuffer()
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' })

    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.wav')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'segment')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData,
    })

    if (!whisperRes.ok) {
      const err = await whisperRes.json()
      return NextResponse.json({ error: 'Whisper failed', detail: err }, { status: 500 })
    }

    const whisperData = await whisperRes.json()
    const segments = whisperData.segments || []
    const lyricLines = lyrics.split('\n').map((l: string) => l.trim()).filter(Boolean)

    const fmt = (s: number) => {
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = Math.floor(s % 60)
      const ms = Math.round((s % 1) * 1000)
      return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0') + ',' + String(ms).padStart(3,'0')
    }

    let srt = ''
    let segIndex = 0
    lyricLines.forEach((line: string, i: number) => {
      while (segIndex < segments.length - 1 && segments[segIndex].text.trim().length < 3) segIndex++
      const seg = segments[Math.min(segIndex, segments.length - 1)]
      const start = seg?.start ?? i * 3
      const end = seg?.end ?? start + 3
      srt += (i + 1) + '\n' + fmt(start) + ' --> ' + fmt(end) + '\n' + line + '\n\n'
      segIndex++
    })

    return NextResponse.json({ srt: srt.trim() })
  } catch (err: any) {
    return NextResponse.json({ error: 'Sync failed', detail: err.message }, { status: 500 })
  }
}
