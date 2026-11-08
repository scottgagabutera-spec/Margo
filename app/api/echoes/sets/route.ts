import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { loadActiveEchoQuestion } from '@/lib/echoes/load-active'

export async function GET() {
  try {
    const admin = getSupabaseAdmin()
    const { data: sets } = await admin.from('echo_question_sets').select('id, slug, title').order('created_at')
    const active = await loadActiveEchoQuestion()

    const cards = []
    for (const set of sets ?? []) {
      const isActive = active?.setId === set.id
      let answerCount = 0
      let avatarUrls: string[] = []
      if (isActive && active) {
        const { count } = await admin
          .from('echo_answers')
          .select('id', { count: 'exact', head: true })
          .eq('question_id', active.questionId)
        answerCount = count ?? 0
        const { data: answers } = await admin
          .from('echo_answers')
          .select('profile_id')
          .eq('question_id', active.questionId)
          .limit(8)
        const ids = [...new Set((answers ?? []).map((a) => a.profile_id))]
        if (ids.length) {
          const { data: profiles } = await admin.from('profiles').select('avatar_url').in('id', ids)
          avatarUrls = (profiles ?? []).map((p) => p.avatar_url).filter(Boolean) as string[]
        }
      }
      cards.push({
        id: set.id,
        slug: set.slug,
        title: isActive ? active!.title : set.title,
        isActive,
        answerCount,
        avatarUrls,
        questionId: isActive ? active!.questionId : null,
      })
    }

    return NextResponse.json({ sets: cards })
  } catch (e) {
    console.error('[echoes/sets]', e)
    return NextResponse.json({ sets: [] })
  }
}
