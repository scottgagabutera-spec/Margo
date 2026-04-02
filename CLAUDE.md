# MARGO — Mobile Performance & Responsiveness Rules
> Version 1.0 — April 2026
> **Any AI assistant or developer working on Margo MUST follow these rules.**
> These are not suggestions. They are laws derived from real bugs found in production.

---

## 1. NEVER block the main thread during page transitions

**Rule:** Do not perform any DOM insertion, CSS injection, or `innerHTML` writes
during a page transition animation (e.g. landing → feed).

**Why it breaks:** DOM mutations during a CSS transition force a layout reflow.
The browser pauses the animation to recalculate geometry → visible "bump" jank.

**Correct pattern:**
```js
// ✅ DO: defer DOM work until after transition completes
function goToFeed() {
  feed.classList.add('active');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => renderFeed(), 60); // after transition paint
    });
  });
}

// ❌ DON'T: write to DOM immediately during transition
function goToFeed() {
  feed.classList.add('active');
  injectStyles();   // DOM write — causes reflow
  renderFeed();     // DOM write — causes reflow
}
```

---

## 2. NEVER use `backdrop-filter: blur()` values above 8px on mobile

**Rule:** On screens ≤768px, `backdrop-filter` blur must be 0px (none) or ≤4px.
Always provide a `@media (max-width: 768px)` override that removes blur
and compensates with a darker background color.

**Why it breaks:** `backdrop-filter: blur(16px)` forces the GPU to composite
every layer behind the element on every frame. On cheap Android phones this
causes 300–800ms freezes on sheet open and 10–20fps scroll.

**Correct pattern:**
```css
/* ✅ DO */
.modal {
  backdrop-filter: blur(16px); /* desktop — fine */
}
@media (max-width: 768px) {
  .modal {
    backdrop-filter: none;
    background: rgba(0, 0, 0, 0.94); /* compensate with opacity */
  }
}

/* ❌ DON'T */
.modal {
  backdrop-filter: blur(16px); /* no mobile override */
}
```

---

## 3. ALWAYS cancel in-flight renders before starting a new one

**Rule:** Every render function that uses `requestAnimationFrame` batching
MUST implement a generation counter to cancel stale batches.

**Why it breaks:** Filter tab → sort → another filter in quick succession
creates 3 overlapping rAF render loops all appending cards to the same
`#cardStack`. Result: mixed cards from multiple renders, broken swipe index.

**Correct pattern:**
```js
// ✅ DO: generation counter pattern
var _renderGen = 0;
function renderFeed() {
  var myGen = ++_renderGen;
  stack.innerHTML = '';
  function batch() {
    if (myGen !== _renderGen) return; // stale — stop
    // ... append cards
    if (more) requestAnimationFrame(batch);
  }
  requestAnimationFrame(batch);
}

// ❌ DON'T: naked rAF batch with no cancellation
function renderFeed() {
  stack.innerHTML = '';
  function batch() {
    // ... appends even if a newer render started
    if (more) requestAnimationFrame(batch);
  }
  requestAnimationFrame(batch);
}
```

---

## 4. ALWAYS reset swipe engine state before rebuilding card stack

**Rule:** Before calling `renderFeed()` from any filter, sort, or tab handler,
you MUST reset: `swipeIndex = 0`, `swipeAnim = false`, `swipeDragging = false`,
and `delete stack.dataset.swipeReady`.

**Why it breaks:** The swipe engine tracks `swipeIndex` and uses it to reference
cards by DOM position. After a rebuild, card positions change but `swipeIndex`
still points to the old position → swipe goes to wrong card or crashes.

**Correct pattern:**
```js
// ✅ DO
tab.onclick = () => {
  swipeIndex = 0;
  swipeAnim = false;
  delete stack.dataset.swipeReady;
  renderFeed();
};

// ❌ DON'T
tab.onclick = () => {
  delete stack.dataset.swipeReady;
  renderFeed(); // swipeIndex still at old position
};
```

---

## 5. NEVER attach global event listeners more than once

**Rule:** `document.addEventListener` calls for swipe/drag must use a
"already attached" guard flag. Stack-level listeners are safe to re-attach
because the stack element is recreated. Document-level ones are NOT.

**Why it breaks:** Each `renderFeed()` → `initSwipeEngine()` call re-attaches
`mousemove`/`mouseup` to `document`. After 5 filter changes: 5× listeners.
Each swipe fires the handler 5 times → stuttery, double-firing, wrong behavior.

**Correct pattern:**
```js
// ✅ DO
var _globalSwipeListenersAttached = false;
function initSwipeEngine() {
  // stack listeners: safe to re-attach (new element each render)
  stack.addEventListener('touchstart', onStart, { passive: true });

  // document listeners: attach only once
  if (!_globalSwipeListenersAttached) {
    _globalSwipeListenersAttached = true;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
  }
}
```

---

## 6. ALWAYS debounce rapid user interactions that trigger re-renders

**Rule:** Any UI interaction (tab click, sort click, search input) that calls
`renderFeed()` MUST be debounced by at least 50ms.

**Why it breaks:** Fast tapping between filter tabs triggers 3–5 simultaneous
renders. Combined with Rule 3 violation: catastrophic card stack corruption.

**Correct pattern:**
```js
// ✅ DO
var _tabTimer;
tab.onclick = () => {
  clearTimeout(_tabTimer);
  _tabTimer = setTimeout(() => renderFeed(), 50);
};

// ❌ DON'T
tab.onclick = () => renderFeed(); // fires immediately on every tap
```

---

## 7. ALWAYS use `will-change` correctly — promote before, demote after

**Rule:** Add `will-change: transform, opacity` to an element just before
animating it. Remove it (set to `auto`) after the animation ends.

**Why it matters:** `will-change` tells the browser to promote the element
to its own GPU compositor layer. Leaving it on permanently wastes VRAM,
which causes jank on other animations running at the same time.

**Correct pattern:**
```js
// ✅ DO
element.style.willChange = 'transform, opacity';
element.style.transition = 'transform 0.3s ease';
element.style.transform = 'translateY(0)';
setTimeout(() => {
  element.style.willChange = 'auto'; // free GPU memory
}, 350);

// ❌ DON'T — set in CSS permanently for every card
.swipe-card { will-change: transform; } /* every card = GPU memory bomb */
```

---

## 8. ALL touch targets must be minimum 44×44px and use `touch-action: manipulation`

**Rule:** Every button, tab, link, or interactive element must be at least
44×44 CSS pixels in hit area. All interactive elements must have
`touch-action: manipulation` to eliminate the 300ms tap delay.

**Correct pattern:**
```css
/* ✅ DO — in base.css globally */
button, a, [role="tab"], [role="button"] {
  touch-action: manipulation;
  min-height: 44px;
}

/* For visual elements smaller than 44px, use padding to extend hit area */
.small-icon-btn {
  padding: 12px; /* extends tap area without changing visual size */
  touch-action: manipulation;
}
```

---

## 9. ALWAYS hide the card stack while rebuilding, reveal after first card is painted

**Rule:** Set `stack.style.opacity = '0'` before clearing and rebuilding cards.
Reveal with a short `opacity` transition only after the first card is appended
and `initSwipeEngine()` has been called.

**Why it breaks:** Without this, users see a flash of empty dark space
followed by cards appearing piece by piece — the "shows in parts" bug.

**Correct pattern:**
```js
// ✅ DO
stack.style.opacity = '0';
stack.innerHTML = '';
const first = buildSwipeCard(filtered[0], 0);
stack.appendChild(first);
initSwipeEngine();
requestAnimationFrame(() => {
  stack.style.transition = 'opacity 0.18s ease';
  stack.style.opacity = '1';
});
```

---

## 10. NEVER use `display: none` → `display: block` for animated UI elements

**Rule:** For modals, sheets, or panels that animate in/out, use
`visibility + opacity + pointer-events` instead of `display` toggling.
`display: none` forces a full layout reflow on show. On mobile this creates
a visible freeze before the animation starts.

**Exception:** Static elements with no animation (e.g. `<script>`, `<style>`)
may use `display: none` safely.

**Correct pattern:**
```css
/* ✅ DO */
.sheet { visibility: hidden; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
.sheet.open { visibility: visible; opacity: 1; pointer-events: all; }

/* ❌ DON'T for animated elements */
.sheet { display: none; }
.sheet.open { display: flex; } /* no transition possible, forces reflow */
```

---

## 11. Screen size support targets

Margo must work flawlessly on all of these:

| Device class | Width | Notes |
|---|---|---|
| Tiny Android | 320px | Xiaomi Redmi, old Samsung Galaxy |
| Standard mobile | 375–390px | iPhone SE, iPhone 14 |
| Large mobile | 414–430px | iPhone Plus, Pixel |
| Small tablet | 600–768px | iPad mini, Android tablet |
| Desktop | 1024px+ | Full layout |

**Rules:**
- No horizontal scroll on any screen width ≥ 320px
- All text must be readable without zooming (min 14px rendered)
- All inputs must be `font-size: 16px` on mobile to prevent iOS zoom
- Tap targets minimum 44×44px
- No content hidden behind the iOS safe area (use `env(safe-area-inset-*)`)

---

## 12. CSS performance checklist for new features

Before shipping any new CSS, check:
- [ ] No `backdrop-filter` without mobile override removing it
- [ ] No `filter: blur()` on elements that scroll or animate
- [ ] No `box-shadow` with large spread on elements inside scroll containers
- [ ] `will-change` only set in JS before animation, removed after
- [ ] Animations use only `transform` and `opacity` (not `width`, `height`, `top`, `left`)
- [ ] New modals/sheets use `visibility + opacity` not `display`

---

## 13. JS performance checklist for new features

Before shipping any new JS, check:
- [ ] Any function calling `renderFeed()` has a debounce of ≥50ms
- [ ] Any rAF batch loop implements a generation counter (see Rule 3)
- [ ] No new `document.addEventListener` inside functions called more than once
- [ ] Swipe state (`swipeIndex`, `swipeAnim`, `swipeDragging`) reset before `renderFeed()`
- [ ] No synchronous `fetch()` or heavy computation on button click handlers
- [ ] New `<script>` tags in `index.html` must have `defer` attribute

---

*Last updated: April 2026. Update this file whenever a new performance pattern is established.*
