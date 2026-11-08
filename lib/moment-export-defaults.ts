import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { parseAtmosphere, type AtmosphereId } from '@/lib/atmosphere'
import type { MomentShapeId } from '@/lib/moment/types'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'
import { resolveMoodEffect } from '@/lib/promote/mood-effect-map'
import { vibeLabelToEmotion } from '@/lib/moment/vibe'

/** Margo catalog: song atmosphere, else vibe→effect map, else Slow Rise (never None-only default). */
export function resolveMargoCatalogDefaultAtmosphere(
  songAtmosphere: string | null | undefined,
  vibeLabel: string | null | undefined,
): AtmosphereId {
  if (songAtmosphere) {
    const parsed = parseAtmosphere(songAtmosphere)
    if (parsed !== 'still') return parsed
  }
  const emotion = vibeLabelToEmotion(vibeLabel)
  const mapped = resolveMoodEffect(emotion).atmosphereId
  if (mapped !== 'still') return mapped
  return 'breath'
}

export function useMomentSongExportDefaults(options: {
  linkedSongId: string | null
  songAtmosphere: string | null | undefined
  isMargoCatalog: boolean
  setExportAtmosphereId: Dispatch<SetStateAction<AtmosphereId>>
  setCardThemeId: Dispatch<SetStateAction<StageCardThemeId>>
  setShapeId?: Dispatch<SetStateAction<MomentShapeId>>
  vibeLabel?: string | null
  /** When set (e.g. saved post export prefs), skip auto atmosphere from catalog. */
  lockedAtmosphereId?: AtmosphereId | null
}) {
  const exportDefaultSongRef = useRef<string | null>(null)

  const applyCatalogSelectionExportDefaults = useCallback(
    (isMargoCatalog: boolean) => {
      options.setCardThemeId('gold')
      options.setShapeId?.('square')
      options.setExportAtmosphereId('still')
      exportDefaultSongRef.current = null
      if (!isMargoCatalog) return
    },
    [options.setCardThemeId, options.setExportAtmosphereId, options.setShapeId],
  )

  useEffect(() => {
    if (!options.linkedSongId || !options.isMargoCatalog) return
    if (options.lockedAtmosphereId) return
    if (exportDefaultSongRef.current === options.linkedSongId) return
    exportDefaultSongRef.current = options.linkedSongId
    options.setExportAtmosphereId(
      resolveMargoCatalogDefaultAtmosphere(options.songAtmosphere, options.vibeLabel),
    )
  }, [
    options.linkedSongId,
    options.songAtmosphere,
    options.isMargoCatalog,
    options.vibeLabel,
    options.lockedAtmosphereId,
    options.setExportAtmosphereId,
  ])

  const resetExportDefaultTracking = useCallback(() => {
    exportDefaultSongRef.current = null
  }, [])

  return { applyCatalogSelectionExportDefaults, resetExportDefaultTracking }
}
