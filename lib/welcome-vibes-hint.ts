/** Step 3 vibe picker hint below chips (before Next is pressed with too few). */
export function welcomeVibesHintMessage(count: number): string {
  if (count >= 3) return `${count} chosen`
  if (count === 2) return '1 more to go'
  if (count === 1) return '2 more to go'
  return 'Pick 3 to continue'
}
