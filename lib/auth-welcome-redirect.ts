export {
  MARGO_WELCOME_ONBOARDING_AUTH_CUTOFF_ISO,
  isAuthUserCreatedOnOrAfterWelcomeCutoff,
  needsOnboarding,
  welcomeOnboardingPath,
  resolvePostAuthNavigation,
  isWelcomeOnboardingExemptPath,
  type WelcomeOnboardingProfileContext,
} from '@/lib/welcome-needs-onboarding'

export {
  resolvePostAuthDestination,
  loadWelcomeOnboardingContext,
  fetchAuthUserCreatedAt,
  completeAuthAfterProfileReady,
} from '@/lib/resolve-post-auth-destination'
