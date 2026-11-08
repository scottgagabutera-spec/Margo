import { isE2eShortsFixtureHostname } from '@/lib/e2e-shorts-fixture'
import type { EchoFeedBlockSnapshot } from '@/lib/echoes/types'

export function shouldUseE2eFeedReturnFixture(
  search: URLSearchParams,
  hostname: string,
): boolean {
  return search.get('e2eFeedReturn') === '1' && isE2eShortsFixtureHostname(hostname)
}

export const E2E_FEED_RETURN_ECHOES: EchoFeedBlockSnapshot = {
  setId: 'e2e-set',
  questionId: 'e2e-q',
  title: 'E2E return fixture',
  answerCount: 1,
  preview: [
    {
      answerId: 'e2e-a1',
      profileId: 'e2e-user',
      username: 'e2euser',
      displayName: 'E2E User',
      avatarUrl: null,
      isOwn: false,
      timeChoice: 'today',
      timeLabel: '1m',
      songLine: '',
      payload: {
        songs: [
          {
            songId: 'e2e-song-1',
            songTitle: 'Fixture Song',
            artistName: 'Fixture Artist',
            artworkUrl: null,
            audioUrl: null,
            isLyricOnly: false,
          },
        ],
      },
    },
  ],
}
