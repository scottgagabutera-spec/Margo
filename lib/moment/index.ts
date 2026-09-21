export type {
  MargoMoment,
  MargoMomentLine,
  MargoMomentAuthor,
  MomentThemeId,
  MomentShapeId,
  MomentStatus,
  NormalizedMomentLine,
} from '@/lib/moment/types'
export {
  DEFAULT_MOMENT_THEME_ID,
  DEFAULT_MOMENT_SHAPE_ID,
} from '@/lib/moment/types'

export type { StageCardThemeId, StageCardTheme } from '@/lib/moment/stage-theme'
export {
  STAGE_CARD_THEMES,
  getStageCardTheme,
  cycleStageCardTheme,
} from '@/lib/moment/stage-theme'

export type { MomentComposition, MomentArchetype, MomentMotif, Composition } from '@/lib/moment/compose'
export { composeMoment } from '@/lib/moment/compose'

export {
  normalizeEmotionKey,
  emotionToVibeLabel,
  vibeLabelToEmotion,
  MOMENT_VIBE_PICKER_OPTIONS,
} from '@/lib/moment/vibe'

export type { MomentPersistLine, PersistMomentPostInput } from '@/lib/moment/persist'
export { persistMomentPost } from '@/lib/moment/persist'

export type {
  PostLikeForMoment,
  ComposeLineDraftLike,
  StageMomentInput,
  ResolveMargoMomentOptions,
  ExportPropsMomentInput,
  EphemeralSeedFormat,
} from '@/lib/moment/resolve'
export {
  resolveMargoMomentFromPost,
  resolveMargoMomentFromComposeDrafts,
  resolveMargoMomentFromStage,
  buildMomentSeedKey,
  buildMargoMomentFromExportProps,
  margoMomentToPostLines,
} from '@/lib/moment/resolve'

export type {
  MomentListenContext,
  MomentListenResolution,
  MomentListenMode,
} from '@/lib/moment/listen'
export {
  resolveMomentListen,
  resolveExternalListenUrl,
  externalListenAriaLabel,
  appleMusicSearchUrl,
} from '@/lib/moment/listen'

export {
  canShareImageFiles,
} from '@/lib/moment/share'
