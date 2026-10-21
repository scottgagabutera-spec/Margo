import type { Echo } from '@/hooks/useEchoes'
import type { Post } from '@/hooks/usePosts'

/** Map a Lyric Back (echo) row to feed Post shape for export / replay hooks. */
export function echoToPost(lb: Echo): Post {
  return {
    id: lb.id,
    text: lb.lyric,
    emotion: lb.emotion,
    status: lb.status,
    knowledge: (lb.song || lb.artist || lb.artwork)
      ? { song: lb.song || undefined, artist: lb.artist || undefined, artwork: lb.artwork ?? null }
      : undefined,
    username: lb.username,
    authorUid: lb.authorUid ?? null,
    authorAvatarUrl: lb.authorAvatarUrl ?? null,
    authorDisplayName: lb.displayName ?? null,
    timestamp: lb.timestamp,
    resonates: lb.resonateCount ?? 0,
    replies: lb.echoCount ?? 0,
    songId: lb.songId ?? null,
    audioUrl: lb.audioUrl ?? null,
    snippetStart: lb.snippetStart ?? null,
    snippetEnd: lb.snippetEnd ?? null,
  }
}
