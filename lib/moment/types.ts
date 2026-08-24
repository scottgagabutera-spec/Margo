import type { PostLineSource } from '@/lib/post-lines'
import type { MomentComposition } from '@/lib/moment/compose'

/** Visual theme ids — matches THEMES in render-moment.ts */
export type MomentThemeId = 'gold' | 'dark'

/** Export aspect ratio ids — matches SHAPES in render-moment.ts */
export type MomentShapeId = 'square' | 'vertical' | 'wide'

/** Publication / lifecycle state for a Moment */
export type MomentStatus = 'active' | 'private' | 'ephemeral'

/**
 * One lyric segment inside a canonical Margo Moment.
 * Mirrors PostLine fields but uses export-friendly naming where helpful.
 */
export interface MargoMomentLine {
  lyric: string
  songTitle: string
  artistName: string
  artworkUrl?: string | null
  songId?: string | null
  audioUrl?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  source?: PostLineSource
  isAiGenerated?: boolean
  position?: number
}

export interface MargoMomentAuthor {
  profileId?: string | null
  username?: string | null
  displayName?: string | null
  avatarUrl?: string | null
}

/**
 * Canonical Margo Moment — renderer-agnostic representation of one shareable
 * object. PNG, web page, clipboard, and native share all consume this.
 */
export interface MargoMoment {
  lines: MargoMomentLine[]
  /** Human-readable vibe label (e.g. "Heartbreak") for export + UI */
  vibeLabel?: string | null
  /** Raw stored emotion enum when available (e.g. "heartbreak") */
  emotion?: string | null
  author?: MargoMomentAuthor | null
  postId?: string | null
  themeId: MomentThemeId
  shapeId: MomentShapeId
  /** Deterministic identity for composition + future render caches */
  seedKey: string
  status?: MomentStatus | null
  /**
   * Serializable composition decision — archetype + motif.
   * When omitted, resolveMomentComposition() derives it from lines + vibe + seed.
   */
  composition?: MomentComposition | null
}

/** Normalized line shape used by the canvas renderer */
export interface NormalizedMomentLine {
  lyric: string
  songTitle: string
  artistName: string
  artworkUrl?: string | null
}

export const DEFAULT_MOMENT_THEME_ID: MomentThemeId = 'gold'
export const DEFAULT_MOMENT_SHAPE_ID: MomentShapeId = 'square'
