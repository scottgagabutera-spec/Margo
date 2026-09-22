import { bufferGraphql } from '@/lib/promote/buffer/client'
import { buildBufferPromoteText } from '@/lib/promote/buffer/copy'

export interface BufferPublishInput {
  accessToken: string
  channelId: string
  videoPublicUrl: string
  songTitle: string
  lyricText: string
  artistName: string
}

export interface BufferPublishResult {
  postId: string
  postUrl: string
  dueAt: string | null
}

interface CreatePostResult {
  createPost:
    | { post: { id: string; dueAt?: string | null } }
    | { message: string }
}

export async function publishVideoViaBuffer(input: BufferPublishInput): Promise<BufferPublishResult> {
  const text = buildBufferPromoteText({
    songTitle: input.songTitle,
    lyricText: input.lyricText,
    artistName: input.artistName,
  })

  const data = await bufferGraphql<CreatePostResult>(
    input.accessToken,
    `mutation CreateVideoPost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post { id dueAt }
        }
        ... on MutationError {
          message
        }
      }
    }`,
    {
      input: {
        text,
        channelId: input.channelId,
        schedulingType: 'automatic',
        mode: 'addToQueue',
        assets: [{
          video: { url: input.videoPublicUrl },
        }],
      },
    },
  )

  const result = data.createPost
  if (!result || 'message' in result) {
    throw new Error(('message' in (result || {}) ? result.message : null) || 'Buffer publish failed')
  }

  const postId = result.post.id
  return {
    postId,
    postUrl: `https://publish.buffer.com/all-channels`,
    dueAt: result.post.dueAt ?? null,
  }
}
