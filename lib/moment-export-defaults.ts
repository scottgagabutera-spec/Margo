import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { parseAtmosphere, type AtmosphereId } from '@/lib/atmosphere'
import type { MomentShapeId } from '@/lib/moment/types'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'

export function useMomentSongExportDefaults(options: {
  linkedSongId: string | null
  songAtmosphere: string | null | undefined
  isMargoCatalog: boolean
  setExportAtmosphereId: Dispatch<SetStateAction<AtmosphereId>>
  setCardThemeId: Dispatch<SetStateAction<StageCardThemeId>>
  setShapeId?: Dispatch<SetStateAction<MomentShapeId>>
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
    if (exportDefaultSongRef.current === options.linkedSongId) return
    exportDefaultSongRef.current = options.linkedSongId
    if (options.songAtmosphere) {
      options.setExportAtmosphereId(parseAtmosphere(options.songAtmosphere))
    } else {
      options.setExportAtmosphereId('still')
    }
  }, [
    options.linkedSongId,
    options.songAtmosphere,
    options.isMargoCatalog,
    options.setExportAtmosphereId,
  ])

  const resetExportDefaultTracking = useCallback(() => {
    exportDefaultSongRef.current = null
  }, [])

  return { applyCatalogSelectionExportDefaults, resetExportDefaultTracking }
}
