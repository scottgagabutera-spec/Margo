import { resolveMomentLines, type PostLine, type PostLineSource } from '@/lib/post-lines'
import type { AtmosphereId } from '@/lib/atmosphere'
import { composeMoment } from '@/lib/moment/compose'
import { emotionToVibeLabel } from '@/lib/moment/vibe'
import { resolveMomentListen } from '@/lib/moment/listen'
import type {
  MargoMoment,
  MargoMomentAuthor,
  MargoMomentLine,
  MomentShapeId,
  MomentStatus,
  MomentThemeId,
  NormalizedMomentLine,
} from '@/lib/moment/types'
import {
  DEFAULT_MOMENT_SHAPE_ID,
  DEFAULT_MOMENT_THEME_ID,
} from '@/lib/moment/types'
import type { MomentComposition } from '@/lib/moment/compose'

export interface PostLikeForMoment {
  id?: string
  text?: string
  emotion?: string | null
  status?: string | null
  songId?: string | null
  audioUrl?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  knowledge?: { song?: string; artist?: string; artwork?: string | null }
  isAiGenerated?: boolean
  atmosphere?: AtmosphereId
  lines?: PostLine[]
  username?: string | null
  authorUid?: string | null
  authorAvatarUrl?: string | null
  authorDisplayName?: string | null
  youtubeMeta?: {
    youtubeUrl?: string | null
    thumbnail?: string | null
  } | null
  /** Catalog external URLs from joined song row */
  appleMusicUrl?: string | null
  spotifyUrl?: string | null
  youtubeUrlFromSong?: string | null
  /** Direct external listen URL stored on post (Apple trackViewUrl, etc.) */
  externalListenUrl?: string | null
}

export interface ComposeLineDraftLike {
  lyric: string
  songName: string
  artistName: string
  linkedSongId?: string | null
  linkedAudioUrl?: string | null
  artwork?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  source?: string | null
}

export interface StageMomentInput {
  lyric: string
  songName: string
  artistName: string
  artworkUrl?: string | null
  songId?: string | null
  audioUrl?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  vibeLabel?: string | null
  source?: PostLineSource
  /** iTunes trackViewUrl or other external listen URL from search */
  externalListenUrl?: string | null
}

export interface ResolveMargoMomentOptions {
  themeId?: MomentThemeId
  shapeId?: MomentShapeId
  vibeLabel?: string | null
  seedKey?: string
  status?: MomentStatus | null
  author?: MargoMomentAuthor | null
  postId?: string | null
}

function postLineToMomentLine(
  line: PostLine,
  songUrls?: { appleMusicUrl?: string | null; spotifyUrl?: string | null; youtubeUrl?: string | null },
): MargoMomentLine {
  return {
    lyric: line.text,
    songTitle: line.songTitle || '',
    artistName: line.artistName || '',
    artworkUrl: line.artworkUrl ?? null,
    songId: line.songId ?? null,
    audioUrl: line.audioUrl ?? null,
    snippetStart: line.snippetStart ?? null,
    snippetEnd: line.snippetEnd ?? null,
    source: line.source,
    isAiGenerated: line.isAiGenerated ?? false,
    atmosphere: line.atmosphere,
    position: line.position,
    appleMusicUrl: songUrls?.appleMusicUrl ?? null,
    spotifyUrl: songUrls?.spotifyUrl ?? null,
    youtubeUrl: songUrls?.youtubeUrl ?? null,
  }
}

function composeDraftSource(source: string | null | undefined, linkedSongId?: string | null): PostLineSource {
  if (linkedSongId) return 'catalog'
  if (source === 'margo') return 'catalog'
  if (source === 'genius' || source === 'apple') return 'external'
  return 'freeform'
}

function postStatusToMomentStatus(status: string | null | undefined): MomentStatus | null {
  if (status === 'private') return 'private'
  if (status === 'active') return 'active'
  return null
}

export type EphemeralSeedFormat = 'lyric-song' | 'lyric-song-artist'

export function buildMomentSeedKey(
  postId: string | null | undefined,
  lines: MargoMomentLine[],
  options?: { ephemeralFormat?: EphemeralSeedFormat },
): string {
  if (postId) return postId
  const format = options?.ephemeralFormat ?? 'lyric-song-artist'
  const part = format === 'lyric-song'
    ? (l: MargoMomentLine) => `${l.lyric}|${l.songTitle}`
    : (l: MargoMomentLine) => `${l.lyric}|${l.songTitle}|${l.artistName}`
  return lines.map(part).join('~') || 'moment'
}

export interface ExportPropsMomentInput {
  lines: Array<{
    lyric: string
    songTitle: string
    artistName: string
    artworkUrl?: string | null
  }>
  postId?: string | null
  vibeLabel?: string | null
  themeId?: MomentThemeId
  shapeId?: MomentShapeId
}

/** Build a canonical Moment from CardExportModal-style props (legacy callers). */
export function buildMargoMomentFromExportProps(input: ExportPropsMomentInput): MargoMoment {
  const lines: MargoMomentLine[] = input.lines.map((l, index) => ({
    lyric: l.lyric,
    songTitle: l.songTitle,
    artistName: l.artistName,
    artworkUrl: l.artworkUrl ?? null,
    position: index,
  }))
  const seedKey = buildMomentSeedKey(input.postId, lines)
  return {
    lines,
    vibeLabel: input.vibeLabel ?? null,
    postId: input.postId ?? null,
    themeId: input.themeId ?? DEFAULT_MOMENT_THEME_ID,
    shapeId: input.shapeId ?? DEFAULT_MOMENT_SHAPE_ID,
    seedKey,
  }
}

export function margoMomentLineToNormalized(line: MargoMomentLine): NormalizedMomentLine {
  return {
    lyric: line.lyric,
    songTitle: line.songTitle,
    artistName: line.artistName,
    artworkUrl: line.artworkUrl ?? null,
  }
}

export function margoMomentToNormalizedLines(moment: MargoMoment): NormalizedMomentLine[] {
  return moment.lines
    .filter((l) => l.lyric.trim().length > 0)
    .map(margoMomentLineToNormalized)
}

/** Derive or return cached serializable composition for a Moment. */
export function resolveMomentComposition(moment: MargoMoment): MomentComposition {
  if (moment.composition) return moment.composition
  return composeMoment(
    moment.vibeLabel,
    margoMomentToNormalizedLines(moment),
    moment.seedKey,
  )
}

export function resolveMargoMomentFromPost(
  post: PostLikeForMoment,
  options: ResolveMargoMomentOptions = {},
): MargoMoment {
  const postLines = resolveMomentLines(post)
  const rootSongUrls = {
    appleMusicUrl: post.appleMusicUrl ?? null,
    spotifyUrl: post.spotifyUrl ?? null,
    youtubeUrl: post.youtubeUrlFromSong ?? null,
  }
  const postArtwork = post.knowledge?.artwork ?? null
  const lines = postLines.map((line) => {
    const mapped = postLineToMomentLine(line, rootSongUrls)
    return {
      ...mapped,
      artworkUrl: mapped.artworkUrl ?? postArtwork,
    }
  })
  const vibeFromEmotion = emotionToVibeLabel(post.emotion)
  const author: MargoMomentAuthor | null = post.authorUid || post.username
    ? {
        profileId: post.authorUid ?? null,
        username: post.username ?? null,
        displayName: post.authorDisplayName ?? null,
        avatarUrl: post.authorAvatarUrl ?? null,
      }
    : null

  const seedKey = options.seedKey ?? buildMomentSeedKey(post.id, lines)

  const moment: MargoMoment = {
    lines,
    vibeLabel: options.vibeLabel ?? vibeFromEmotion,
    emotion: post.emotion ?? null,
    author: options.author ?? author,
    postId: options.postId ?? post.id ?? null,
    themeId: options.themeId ?? DEFAULT_MOMENT_THEME_ID,
    shapeId: options.shapeId ?? DEFAULT_MOMENT_SHAPE_ID,
    seedKey,
    status: options.status ?? postStatusToMomentStatus(post.status),
  }

  moment.listen = resolveMomentListen(moment, {
    youtubeUrl: post.youtubeMeta?.youtubeUrl ?? null,
    appleMusicUrl: post.appleMusicUrl ?? null,
    spotifyUrl: post.spotifyUrl ?? null,
    youtubeUrlFromSong: post.youtubeUrlFromSong ?? null,
    itunesTrackUrl: post.externalListenUrl ?? null,
  })

  return moment
}

export function resolveMargoMomentFromComposeDrafts(
  drafts: ComposeLineDraftLike[],
  options: ResolveMargoMomentOptions & { emotion?: string | null } = {},
): MargoMoment {
  const lines: MargoMomentLine[] = drafts
    .filter((d) => d.lyric.trim() && d.songName.trim() && d.artistName.trim())
    .map((d, index) => ({
      lyric: d.lyric.trim(),
      songTitle: d.songName.trim(),
      artistName: d.artistName.trim(),
      artworkUrl: d.artwork ?? null,
      songId: d.linkedSongId ?? null,
      audioUrl: d.linkedAudioUrl ?? null,
      snippetStart: d.snippetStart ?? null,
      snippetEnd: d.snippetEnd ?? null,
      source: composeDraftSource(d.source ?? null, d.linkedSongId),
      position: index,
    }))

  const vibeFromEmotion = options.emotion ? emotionToVibeLabel(options.emotion) : null
  const seedKey = options.seedKey ?? buildMomentSeedKey(options.postId, lines)

  return {
    lines,
    vibeLabel: options.vibeLabel ?? vibeFromEmotion,
    emotion: options.emotion ?? null,
    author: options.author ?? null,
    postId: options.postId ?? null,
    themeId: options.themeId ?? DEFAULT_MOMENT_THEME_ID,
    shapeId: options.shapeId ?? DEFAULT_MOMENT_SHAPE_ID,
    seedKey,
    status: options.status ?? (options.postId ? null : 'ephemeral'),
  }
}

export function resolveMargoMomentFromStage(
  input: StageMomentInput,
  options: ResolveMargoMomentOptions = {},
): MargoMoment {
  const lines: MargoMomentLine[] = [{
    lyric: input.lyric.trim(),
    songTitle: input.songName.trim(),
    artistName: input.artistName.trim(),
    artworkUrl: input.artworkUrl ?? null,
    songId: input.songId ?? null,
    audioUrl: input.audioUrl ?? null,
    snippetStart: input.snippetStart ?? null,
    snippetEnd: input.snippetEnd ?? null,
    source: input.source ?? (input.songId ? 'catalog' : 'external'),
    position: 0,
  }]

  // Stage Save historically keyed composition on lyric|songTitle only
  // (render-moment default before seedKey was passed explicitly).
  const seedKey = options.seedKey ?? buildMomentSeedKey(options.postId ?? null, lines, { ephemeralFormat: 'lyric-song' })

  const moment: MargoMoment = {
    lines,
    vibeLabel: options.vibeLabel ?? input.vibeLabel ?? null,
    author: options.author ?? null,
    postId: options.postId ?? null,
    themeId: options.themeId ?? DEFAULT_MOMENT_THEME_ID,
    shapeId: options.shapeId ?? DEFAULT_MOMENT_SHAPE_ID,
    seedKey,
    status: options.status ?? (options.postId ? 'active' : 'ephemeral'),
  }

  moment.listen = resolveMomentListen(moment, {
    itunesTrackUrl: input.externalListenUrl ?? null,
  })

  return moment
}

/** Map canonical lines back to PostLine shape for existing export components. */
export function margoMomentToPostLines(moment: MargoMoment): PostLine[] {
  return moment.lines.map((line, index) => ({
    position: line.position ?? index,
    text: line.lyric,
    songId: line.songId ?? null,
    songTitle: line.songTitle || null,
    artistName: line.artistName || null,
    artworkUrl: line.artworkUrl ?? null,
    audioUrl: line.audioUrl ?? null,
    snippetStart: line.snippetStart ?? null,
    snippetEnd: line.snippetEnd ?? null,
    source: line.source,
    isAiGenerated: line.isAiGenerated ?? false,
    atmosphere: line.atmosphere,
  }))
}
