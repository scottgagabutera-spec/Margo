import { createClient } from '@/lib/supabase/client'

export type LyricLine = { id: number; line: string; start: number; end: number }

const supabase = createClient()

export async function fetchLyricLines(songId: string): Promise<LyricLine[]> {
  const { data, error } = await supabase
    .from('lyric_lines')
    .select('line_index, text, start_sec, end_sec')
    .eq('song_id', songId)
    .order('line_index', { ascending: true })
  if (error || !data) return []
  return data.map((l) => ({
    id: l.line_index,
    line: l.text,
    start: l.start_sec,
    end: l.end_sec,
  }))
}
