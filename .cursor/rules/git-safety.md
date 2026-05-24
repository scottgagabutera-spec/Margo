# Margo — Core Rules for Every Decision

## Git Safety
CRITICAL: trymargo.com is live with real users on the main branch.

Before making ANY code change:
1. Always check current branch with git branch
2. NEVER make changes if on main branch
3. If on main, stop and create a feature branch first
4. All work happens on feature branches only
5. Only merge to main after:
   - npx tsc --noEmit passes with zero errors
   - npx next build passes with zero errors
   - Alexa has reviewed the Vercel preview URL

Branch naming:
- feature/musixmatch-compose
- feature/deezer-preview
- feature/user-profiles
- feature/artist-pages
- feature/lyric-capture
- feature/dmca-page

## The Margo Design Statement
Every single proposal, change, component, layout, interaction, and line of code must be evaluated against this statement before implementation:

GIANTS WAY — MODERN — PREMIUM — UNIQUE FOR MARGO — LONG TERM — USER EXPERIENCE — CONSISTENCY — VERY LOGICAL — MOBILE FIRST — APP READY

These are not decorative words. Each one has a specific meaning and a specific test:

### GIANTS WAY
Think and build the way Spotify, Apple, Instagram, and Notion build.
Not the way a startup builds to ship fast and fix later.
Ask: would a senior engineer at Spotify approve this decision?
If the answer is no or maybe — rethink it.
Every architectural decision must be scalable from day one.
No shortcuts that create technical debt that blocks growth later.

### MODERN
Not just current — cutting edge.
Use the latest stable patterns in Next.js App Router, TypeScript, React.
If there is a newer, cleaner, more performant way to do something — use it.
No legacy patterns, no outdated approaches, no deprecated APIs.
The codebase should look like it was written today by a world class team.
Ask: is this how the best engineers in the world would write this in 2026?

### PREMIUM
Every pixel, every interaction, every transition must feel expensive.
Margo competes with Spotify and Apple Music in terms of feel — not features, feel.
No rough edges, no jarring transitions, no cheap-looking components.
Typography is Lora serif — it must be consistent everywhere.
Colors, spacing, and hierarchy must be intentional and refined.
Ask: does this feel like a ten dollar per month product or a free side project?

### UNIQUE FOR MARGO
Do not copy patterns from other platforms blindly.
Margo is a lyric-first communication platform — not a social media clone, not a streaming app.
Every feature must be designed around the core loop: lyric ? vibe ? post ? lyric back ? card.
If a pattern exists on Twitter or Instagram, ask whether it fits Margo's identity before using it.
Margo has its own visual language — the gold and black palette, the Lora typeface, the MARGO ORIGINAL badge system.
Ask: does this feel like Margo or does it feel like a generic app?

### LONG TERM
Never build something that works today but blocks tomorrow.
Every decision must be evaluated for how it scales to 1 million users.
Firebase structure, component architecture, API integrations — all must be designed for scale.
Do not hardcode things that will need to change.
Do not create tight coupling between components that should be independent.
Ask: will this decision create problems at 10x the current scale?

### USER EXPERIENCE
This means the real, full experience — not just whether something works.
Scan every user flow for friction. Every extra tap, every loading state, every empty state, every error state must be handled.
The compose flow must feel effortless. The feed must feel alive. The player must feel native.
Loading states must be meaningful — not just spinners.
Empty states must be helpful — not just blank.
Error states must be clear and recoverable — not just red text.
Mobile experience is as important as desktop — test every change on mobile viewport.
Ask: is there any moment in this flow where a user could feel confused, stuck, or frustrated?

### CONSISTENCY
Every component that looks the same must behave the same.
Every component that behaves the same must look the same.
Button styles, card styles, badge styles, spacing, font sizes — all must follow the same system.
If you change something in one place, check every other place it appears.
The MARGO ORIGINAL badge, the vibe tags, the player controls — all must be visually and behaviourally consistent across every page.
Ask: if a user sees this on the feed and then sees it on the music page, will it feel like the same product?

### VERY LOGICAL
Every element on screen must have a clear reason to exist.
Every interaction must produce a predictable and sensible result.
Navigation must be intuitive — users should never wonder where they are or how to get back.
Data flow must be clean — no prop drilling through five components, no redundant state, no Firebase reads that could be cached.
If something requires explanation it is probably not logical enough.
Actively look for things that are illogical — features that are hard to find, actions that produce unexpected results, layouts that create confusion.
Ask: would a first-time user understand what to do here without any instructions?

### MOBILE FIRST
Every component, every layout, every interaction is designed for mobile screen first.
Mobile is not an afterthought — it is the primary experience.
The minimum supported width is 375px (iPhone SE). Every layout must work perfectly at this width.
Touch targets must be at least 44x44px — nothing smaller.
No hover-only interactions — every interaction must work with touch.
Tap areas must be generous — users should never miss a button on mobile.
Text must be readable without zooming — minimum 16px for body text.
Scroll behavior must feel native — momentum scrolling, no scroll-jacking.
The global mini player at the bottom must never overlap important content on any screen size.
Ask: does this work perfectly on a 375px wide screen before considering desktop?

### APP READY
This is the most forward-looking standard.
Every component built for the web must be designed so it translates directly to a React Native app without conceptual redesign.
This means:
- Use design tokens for all colors, spacing, typography — never hardcode hex values or pixel values inline
- Keep component logic completely separate from component presentation
- Never rely on browser-only APIs without an abstraction layer
- Navigation structure must mirror what a native app would use — tab bar at bottom, stack navigation for detail views
- The bottom tab bar pattern (Feed, Music, Compose, Profile) must be established now on web so it is identical on native
- Avoid CSS-only animations where possible — prefer values that can be replicated in React Native Animated or Reanimated
- State management via the existing player-store pattern is correct — keep all global state in stores, never in component local state if it needs to be shared
- Firebase is already cross-platform — the same Firebase calls work on web and React Native
- Cloudflare R2 audio URLs work identically on web and native
- Component naming, prop interfaces, and data shapes must be identical between web and future app
Ask: if a React Native developer opened this component today, could they port it to native in under an hour without redesigning the concept?

## Design Tokens — Use These Everywhere
Never hardcode colors, spacing, or typography values.
Always use CSS variables or a tokens file so that when the app is built the same values are referenced.
Current Margo tokens:
- Primary gold: var(--color-gold) or #EF9F27
- Background dark: var(--color-bg) or #0A0A09
- Text primary: var(--color-text) or #F0EEE6
- Font: Lora serif — always, everywhere, no exceptions
- Border radius large: 12px
- Border radius small: 6px
- Mini player height: 64px — always account for this in bottom padding on scrollable pages

## What To Do With This Statement
When analysing the codebase or proposing any change:
- Apply every one of these ten standards actively
- Flag anything that violates any of them — no matter how small
- Never propose a solution that passes one standard but fails another
- If two standards conflict, flag it and let Alexa decide
- The goal is a product that passes all ten simultaneously
- When flagging issues, categorise each one by which standard it violates
- Prioritise fixes that violate multiple standards simultaneously
