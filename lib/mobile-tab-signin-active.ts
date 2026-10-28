/** Sign In tab is gold on /signin unless Hub or a primary tab tap owns the bar. */
export function signInTabActiveOnSigninRoute(
  isOnSignInRoute: boolean,
  hubOpen: boolean,
  primaryBarSelection: boolean,
): boolean {
  return isOnSignInRoute && !hubOpen && !primaryBarSelection
}
