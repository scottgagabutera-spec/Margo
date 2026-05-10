import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { audioUrl, songId } = await request.json()
    if (!audioUrl) return NextResponse.json({ error: 'audioUrl required' }, { status: 400 })
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 })

    // Fetch the audio file
    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) return NextResponse.json({ error: 'Could not fetch audio file' }, { status: 400 })
    const audioBuffer = await audioRes.arrayBuffer()
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' })

    // Send to Whisper
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.wav')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'srt')
    formData.append('language', 'fr') // trymargo songs are French/mixed — detect automatically if removed

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData,
    })

    if (!whisperRes.ok) {
      const err = await whisperRes.json()
      return NextResponse.json({ error: 'Whisper failed', detail: err }, { status: 500 })
    }

    const srt = await whisperRes.text()
    return NextResponse.json({ srt, songId })

  } catch (err: any) {
    return NextResponse.json({ error: 'Whisper failed', detail: err.message }, { status: 500 })
  }
}
