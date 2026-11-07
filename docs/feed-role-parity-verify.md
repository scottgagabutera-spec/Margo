# Feed and profile role parity (verification)

Code audit on `main` + parity fixes in this PR. Live account matrix should be re-checked on preview.

## Code conditions (no role gate on discovery)

| Surface | Shown when | Role check? |
|---------|------------|-------------|
| Create memory nudge | Signed in, `ownMemoryCount === 0`, not dismissed | **No** (`app/feed/page.tsx`) |
| Memories carousel | `memories.length > 0` from `/api/memories/feed` | **No** |
| Who to follow | `buildFeedLyricsRows` + non-empty `peoplePool` | **No** |
| Live update pill | Signed in, `feedLive`, pending counts | **No** (artist only: Promote on Card export) |
| Profile Add memory | `isOwnProfile` | **No** |
| Profile Songs / Studio | `profile.isArtist` | **Yes (intentional)** |

## Observed parity gaps (before fix)

1. **Empty feed hid nudge psychologically**: "Quiet for now" showed with 0 posts even when nudge was in the list. Fixed: empty hero hidden when nudge is present.
2. **Short feeds never hit lyric 14**: Who to follow did not show for feeds under 14 posts. Fixed: slot at lyric **5** when total under 14.
3. **Thin people pool**: Pool was only post authors in the current feed. Fixed: merge recent public profiles (same for all signed-in users).
4. **Perceived artist advantage**: Artists often have more lyrics in feed → more carousels and strips by count, not by role.

## Account matrix (expected after fix)

| Control | New listener (0 memories) | Older listener | Approved artist |
|---------|---------------------------|----------------|-----------------|
| Memory nudge | Yes if 0 memories | No if has memories | Same rule |
| Memories carousel | If public memories exist | Same | Same |
| Who to follow | At 5th lyric if short feed | 5, 14, 29… | Same |
| Live pill | If signed in + updates | Same | Same |
| Profile Add memory tile | Own profile | Same | Same |
| Profile Songs block | No | No | Yes |
