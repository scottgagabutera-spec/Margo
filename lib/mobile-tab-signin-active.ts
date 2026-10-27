/** Sign In tab is gold on /signin unless Hub overlay owns the highlight. */
export function signInTabActiveOnSigninRoute(isOnSignInRoute: boolean, hubOpen: boolean): boolean {
  return isOnSignInRoute && !hubOpen
}
