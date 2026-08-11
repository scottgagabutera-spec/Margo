/**
 * Client-visible experiment flags.
 * Kill the PostCard swipe-panel strip without a code revert:
 *   NEXT_PUBLIC_POST_CARD_PANELS=0
 * Unset (or any value other than "0") keeps the experiment ON.
 */
export const POST_CARD_PANELS_ENABLED =
  process.env.NEXT_PUBLIC_POST_CARD_PANELS !== '0'
