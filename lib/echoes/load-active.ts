import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { enrichEchoSongPayload, persistEnrichedEchoAnswer } from './enrich-song-payload.ts'
import { echoSongLineFromPayload } from './song-line.ts'
import { echoTimeChoiceLabel } from './time-choice.ts'
import type { EchoAnswerRow, EchoFeedBlockSnapshot, EchoSongPayload } from './types.ts'

type ProfileLite = { id: string; username: string; display_name: string; avatar_url: string | null }

async function normalizeAnswerPayload(
  answerId: string,
  payload: EchoSongPayload,
): Promise<EchoSongPayload> {
  const base = payload?.songs?.length ? payload : { songs: [] }
  const needsEnrich = base.songs.some((s) => !s.artistName?.trim() || !s.artworkUrl?.trim())
  if (!needsEnrich) return base
  const enriched = await enrichEchoSongPayload(base)
  void persistEnrichedEchoAnswer(answerId, enriched)
  return enriched
}

async function mapAnswerRow(
  row: {
    id: string
    profile_id: string
    time_choice: string
    payload: EchoSongPayload
  },
  profile: ProfileLite,
  viewerId: string | null,
): Promise<EchoAnswerRow> {
  const payload = await normalizeAnswerPayload(row.id, row.payload)
  return {
    answerId: row.id,
    profileId: row.profile_id,
    username: profile.username,
    displayName: profile.display_name || profile.username,
    avatarUrl: profile.avatar_url,
    timeChoice: row.time_choice as EchoAnswerRow['timeChoice'],
    timeLabel: echoTimeChoiceLabel(row.time_choice as EchoAnswerRow['timeChoice']),
    songLine: echoSongLineFromPayload(payload),
    payload,
    isOwn: viewerId === row.profile_id,
  }
}

export async function loadActiveEchoQuestion(): Promise<{
  setId: string
  questionId: string
  title: string
  answerType: string
} | null> {
  const admin = getSupabaseAdmin()
  const { data: active, error } = await admin
    .from('echo_questions')
    .select('id, title, answer_type, set_id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (error || !active) return null
  const { data: setRow } = await admin
    .from('echo_question_sets')
    .select('id, slug, title')
    .eq('id', active.set_id)
    .maybeSingle()
  if (!setRow) return null
  return {
    setId: setRow.id,
    questionId: active.id,
    title: active.title,
    answerType: active.answer_type,
  }
}

export async function loadEchoFeedBlock(viewerId: string | null): Promise<EchoFeedBlockSnapshot | null> {
  const active = await loadActiveEchoQuestion()
  if (!active) return null
  const admin = getSupabaseAdmin()

  const { count } = await admin
    .from('echo_answers')
    .select('id', { count: 'exact', head: true })
    .eq('question_id', active.questionId)

  const { data: answers } = await admin
    .from('echo_answers')
    .select('id, profile_id, time_choice, payload, created_at')
    .eq('question_id', active.questionId)
    .order('created_at', { ascending: false })
    .limit(40)

  const profileIds = [...new Set((answers ?? []).map((a) => a.profile_id))]
  const { data: profiles } = profileIds.length
    ? await admin.from('profiles').select('id, username, display_name, avatar_url').in('id', profileIds)
    : { data: [] as ProfileLite[] }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as ProfileLite]))
  const rows: EchoAnswerRow[] = []
  for (const a of answers ?? []) {
    const p = profileMap.get(a.profile_id)
    if (!p) continue
    rows.push(
      await mapAnswerRow(
        {
          id: a.id,
          profile_id: a.profile_id,
          time_choice: a.time_choice,
          payload: a.payload as EchoSongPayload,
        },
        p,
        viewerId,
      ),
    )
    if (rows.length >= 2) break
  }

  return {
    setId: active.setId,
    questionId: active.questionId,
    title: active.title,
    answerCount: count ?? 0,
    preview: rows,
  }
}

export async function loadEchoSetAnswers(
  setId: string,
  viewerId: string | null,
  filter: 'following' | 'everyone',
  followingIds: string[],
  limit = 120,
): Promise<{
  title: string
  questionId: string
  answerCount: number
  rows: EchoAnswerRow[]
} | null> {
  const admin = getSupabaseAdmin()
  const { data: setRow } = await admin.from('echo_question_sets').select('id, title').eq('id', setId).maybeSingle()
  if (!setRow) return null

  const { data: question } = await admin
    .from('echo_questions')
    .select('id, title, is_active')
    .eq('set_id', setId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!question) return null

  const { count } = await admin
    .from('echo_answers')
    .select('id', { count: 'exact', head: true })
    .eq('question_id', question.id)

  let query = admin
    .from('echo_answers')
    .select('id, profile_id, time_choice, payload, created_at')
    .eq('question_id', question.id)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 24), 480))

  const { data: answers } = await query

  let filtered = answers ?? []
  if (filter === 'following' && viewerId) {
    const allow = new Set([viewerId, ...followingIds])
    filtered = filtered.filter((a) => allow.has(a.profile_id))
  }

  const profileIds = [...new Set(filtered.map((a) => a.profile_id))]
  const { data: profiles } = profileIds.length
    ? await admin.from('profiles').select('id, username, display_name, avatar_url').in('id', profileIds)
    : { data: [] as ProfileLite[] }
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as ProfileLite]))

  const rows: EchoAnswerRow[] = []
  for (const a of filtered) {
    const p = profileMap.get(a.profile_id)
    if (!p) continue
    rows.push(
      await mapAnswerRow(
        {
          id: a.id,
          profile_id: a.profile_id,
          time_choice: a.time_choice,
          payload: a.payload as EchoSongPayload,
        },
        p,
        viewerId,
      ),
    )
  }

  return {
    title: question.title,
    questionId: question.id,
    answerCount: count ?? 0,
    rows,
  }
}

export async function loadEchoPersonAnswer(
  setId: string,
  profileId: string,
  viewerId: string | null,
): Promise<{ title: string; row: EchoAnswerRow | null } | null> {
  const admin = getSupabaseAdmin()
  const { data: question } = await admin
    .from('echo_questions')
    .select('id, title')
    .eq('set_id', setId)
    .eq('is_active', true)
    .maybeSingle()

  if (!question) {
    const { data: fallbackQ } = await admin
      .from('echo_questions')
      .select('id, title')
      .eq('set_id', setId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!fallbackQ) return null
    return loadEchoPersonAnswerForQuestion(fallbackQ.id, fallbackQ.title, profileId, viewerId)
  }

  return loadEchoPersonAnswerForQuestion(question.id, question.title, profileId, viewerId)
}

async function loadEchoPersonAnswerForQuestion(
  questionId: string,
  title: string,
  profileId: string,
  viewerId: string | null,
): Promise<{ title: string; row: EchoAnswerRow | null }> {
  const admin = getSupabaseAdmin()
  const { data: answer } = await admin
    .from('echo_answers')
    .select('id, profile_id, time_choice, payload')
    .eq('question_id', questionId)
    .eq('profile_id', profileId)
    .maybeSingle()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('id', profileId)
    .maybeSingle()

  if (!profile) return { title, row: null }

  const row = answer
    ? await mapAnswerRow(
        {
          id: answer.id,
          profile_id: answer.profile_id,
          time_choice: answer.time_choice,
          payload: answer.payload as EchoSongPayload,
        },
        profile as ProfileLite,
        viewerId,
      )
    : null

  return { title, row }
}
