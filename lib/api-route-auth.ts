import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function requireSessionUserId(): Promise<
  | { ok: true; userId: string }
  | { ok: false; res: NextResponse }
> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user?.id) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { ok: true, userId: data.user.id }
}
