import type { SupabaseClient } from '@supabase/supabase-js'
import type { AtmosphereId } from '@/lib/atmosphere'
import { isLivingAtmosphere, parseAtmosphere } from '@/lib/atmosphere'
import type { MomentShapeId, MomentThemeId } from '@/lib/moment/types'
import type { PostExportPrefs } from '@/lib/promote/types'

export type PersistExportPrefsInput = PostExportPrefs & {
  postId: string
  authorId: string
}

export async function persistPostExportPrefs(
  supabase: SupabaseClient,
  input: PersistExportPrefsInput,
): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({
      export_shape_id: input.exportShapeId,
      export_theme_id: input.exportThemeId,
      export_atmosphere_id: input.exportAtmosphereId,
    })
    .eq('id', input.postId)
    .eq('author_profile_id', input.authorId)

  if (error) throw error
}

export function exportPrefsFromPostRow(row: {
  export_shape_id?: string | null
  export_theme_id?: string | null
  export_atmosphere_id?: string | null
  songs?: { atmosphere?: string | null } | Array<{ atmosphere?: string | null }> | null
}): PostExportPrefs {
  const song = Array.isArray(row.songs) ? row.songs[0] : row.songs
  let atmosphere = parseAtmosphere(row.export_atmosphere_id ?? null)
  if (atmosphere === 'still' && song?.atmosphere && isLivingAtmosphere(parseAtmosphere(song.atmosphere))) {
    atmosphere = parseAtmosphere(song.atmosphere)
  }
  return {
    exportShapeId: (row.export_shape_id as MomentShapeId) || 'square',
    exportThemeId: (row.export_theme_id as MomentThemeId) || 'gold',
    exportAtmosphereId: atmosphere as AtmosphereId,
  }
}
