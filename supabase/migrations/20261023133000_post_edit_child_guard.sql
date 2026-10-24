-- Atomic child check + optional song/line block for owner edits (service role callers).

CREATE OR REPLACE FUNCTION public.post_has_active_lyric_back_children(p_post_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM posts c
    WHERE c.parent_post_id = p_post_id
      AND c.content_removed_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.post_has_active_lyric_back_children(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_has_active_lyric_back_children(uuid) TO service_role;
