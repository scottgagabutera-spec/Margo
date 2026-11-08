export type EchoAnswerType = 'song' | 'event' | 'text' | 'quiz'

export type EchoTimeChoice = 'today' | 'this_week' | 'last_week' | 'this_month' | 'this_year'

export type EchoSongPayloadItem = {
  songId: string | null
  songTitle: string
  artistName: string
  artworkUrl: string | null
  audioUrl: string | null
  isLyricOnly: boolean
  externalListenUrl?: string | null
}

export type EchoSongPayload = {
  songs: EchoSongPayloadItem[]
}

export type EchoQuestionSetPublic = {
  id: string
  slug: string
  title: string
  answerCount: number
  avatarUrls: string[]
}

export type EchoAnswerRow = {
  answerId: string
  profileId: string
  username: string
  displayName: string
  avatarUrl: string | null
  timeChoice: EchoTimeChoice
  timeLabel: string
  songLine: string
  payload: EchoSongPayload
  isOwn: boolean
}

export type EchoFeedBlockSnapshot = {
  setId: string
  questionId: string
  title: string
  answerCount: number
  preview: EchoAnswerRow[]
}
