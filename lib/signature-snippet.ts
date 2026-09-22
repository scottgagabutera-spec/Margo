import type { SupabaseClient } from '@supabase/supabase-js'
import { SNIPPET_MAX_DURATION_SEC } from '@/lib/audio-engine/types'
import { buildCatalogLyricUnits } from '@/lib/catalog-lyric-unit'
import {
  fallbackSnippetWindow,
  matchLyricLine,
  matchLyricWindowFromLines,
  type LyricLineWindow,
} from '@/lib/lyric-match'

export type SignatureSnippet = {
  lineIndex: number
  lineText: string
  startSec: number
  endSec: number
}

function capSnippet(window: { lineIndex: number; lineText: string; startSec: number; endSec: number }): SignatureSnippet {
  const startSec = Math.max(0, window.startSec)
  const rawEnd = window.endSec > startSec ? window.endSec : startSec + 1
  const endSec = Math.min(rawEnd, startSec + SNIPPET_MAX_DURATION_SEC)
  return {
    lineIndex: window.lineIndex,
    lineText: window.lineText,
    startSec,
    endSec,
  }
}

/**
 * Resolve the hosted Moment window for a signature lyric.
 * Never returns a full-song span — match → catalog unit, else an 8s fallback.
 */
export async function resolveSignatureMomentSnippet(
  supabase: SupabaseClient,
  songId: string,
  lyric: string | null | undefined,
): Promise<SignatureSnippet | null> {
  if (!songId) return null

  const { data, error } = await supabase
    .from('lyric_lines')
    .select('line_index, text, start_sec, end_sec')
    .eq('song_id', songId)
    .order('line_index', { ascending: true })

  if (error || !data || data.length === 0) {
    const fallback = fallbackSnippetWindow()
    return capSnippet({
      lineIndex: 0,
      lineText: lyric || '',
      startSec: fallback.startSec,
      endSec: fallback.endSec,
    })
  }

  const matchable = data.map((row) => ({
    line_index: row.line_index,
    text: row.text,
    start_sec: row.start_sec,
    end_sec: row.end_sec,
  }))

  let match: LyricLineWindow | null = lyric?.trim()
    ? matchLyricWindowFromLines(matchable, lyric)
    : null

  if (!match && lyric?.trim()) {
    const fuzzy = await matchLyricLine(supabase, songId, lyric)
    if (fuzzy) {
      const row = data.find((line) => line.line_index === fuzzy.lineId) || data[0]
      match = {
        lineId: fuzzy.lineId,
        lineText: row?.text || lyric,
        startSec: fuzzy.startSec,
        endSec: fuzzy.endSec,
      }
    }
  }

  if (match && match.endSec > match.startSec) {
    const atoms = data.map((row) => ({
      lineIndex: row.line_index,
      text: row.text || '',
      startSec: row.start_sec,
      endSec: row.end_sec,
    }))
    const units = buildCatalogLyricUnits(atoms, match.lineId)
    const unit = units?.window || units?.single
    if (unit && unit.endSec > unit.startSec) {
      return capSnippet({
        lineIndex: unit.centerLineIndex,
        lineText: lyric?.trim() || unit.text,
        startSec: unit.startSec,
        endSec: unit.endSec,
      })
    }
    return capSnippet({
      lineIndex: match.lineId,
      lineText: match.lineText,
      startSec: match.startSec,
      endSec: match.endSec,
    })
  }

  const fallback = fallbackSnippetWindow()
  return capSnippet({
    lineIndex: 0,
    lineText: lyric || data[0]?.text || '',
    startSec: fallback.startSec,
    endSec: fallback.endSec,
  })
}
