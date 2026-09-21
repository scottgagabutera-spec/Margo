export interface StoryRow {
  id: string
  authorProfileId: string
  postId: string
  expiresAt: string
  createdAt: string
}

export interface StoryRingAuthor {
  profileId: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  hasUnseen: boolean
  latestStoryAt: string
  isSelf: boolean
}

export const STORY_TTL_MS = 24 * 60 * 60 * 1000

export function storyExpiresAt(from = Date.now()): string {
  return new Date(from + STORY_TTL_MS).toISOString()
}
