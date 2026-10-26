/**
 * Optimistic welcome step advance: navigate first, persist in background.
 * Unit-tested so step change never awaits save.
 */
export function welcomeAdvanceStepOptimistic(go: () => void, save?: () => Promise<unknown>): void {
  go()
  if (save) void save()
}
