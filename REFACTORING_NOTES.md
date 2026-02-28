# Video Player Refactoring Review

**Date:** February 27, 2026  
**Files Reviewed:** `src/features/player/VideoPlayer.svelte`, `src/shared/`, `src/App.svelte`, `src/main.ts`, config files

---

## 🚨 Issues (Must Fix)

### Bug Fixes Checklist

- [ ] **Fix Duplicate `formatTime` Implementation** (HIGH)
  - **Location:** `src/shared/lib/index.ts` (with hours: `H:MM:SS`) vs `src/features/player/VideoPlayer.svelte` lines 427-435 (no hours: `M:SS`)
  - **Problem:** Component ignores shared utility, creates inconsistency
  - **Impact:** Maintenance debt; if shared version updates, local copy won't follow
  - **Fix:** Import shared utility in component, delete inline version

- [ ] **Delete Unused `VideoMetadata` Type** (HIGH)
  - **Location:** `src/shared/types/index.ts`
  - **Problem:** Never imported or used anywhere
  - **Impact:** Dead code signals incomplete architecture planning
  - **Fix:** Remove from types/index.ts

- [ ] **Fix Mobile Touch Interaction** (MID)
  - **Location:** `src/features/player/VideoPlayer.svelte` line 169
  - **Problem:** `handleVideoDoubleClick(event: MouseEvent)` doesn't work on touch devices (no dblclick event)
  - **Impact:** Click detection broken on mobile/tablets
  - **Fix:** Change signature to `(event: PointerEvent)` and update touch-specific logic

- [ ] **Add Seek Input Debouncing** (MID)
  - **Location:** `handleSeekInput()` and `handleSeekPointerDown/Up()` around lines 365-378
  - **Problem:** `isSeeking` flag doesn't prevent rapid seek requests; can cause frame skips
  - **Impact:** Audio/video sync issues on slow machines
  - **Fix:** Add input validation/debouncing or queue seek requests

- [ ] **Replace Overlay Re-render Hack** (LOW)
  - **Location:** `showPlaybackOverlay()` lines 108-115 and `showSeekOverlay()` lines 120-127
  - **Problem:** Uses `setTimeout(..., 0)` to force reflow; fragile pattern
  - **Impact:** Unnecessary DOM churn; depends on timing assumptions
  - **Fix:** Use Svelte `tick()` or transition API instead

---

## 💡 Improvements (Better Practices)

### Code Quality Refactoring Checklist

- [ ] **Extract Magic Numbers to Constants**
  - **Priority:** MID | **Impact:** Maintainability, testability
  - **Hardcoded Values:**
    - `500` - Hold-to-2x threshold (line 175)
    - `300` - Click detection window (line 189)
    - `1000` - Overlay fade duration (lines 113, 126)
    - `5` - Seek amount in seconds (lines 212, 224)
    - `2` - 2x playback speed (line 177)
    - `1/3`, `2/3` - Seekbar click zones (lines 162-164)
  - **Action:** Create `src/features/player/config.ts` with `PLAYBACK_CONFIG` object

- [ ] **Group Related State Objects**
  - **Priority:** MID | **Impact:** Code clarity, easier refactoring
  - **Current Scattered State:**
    - Overlay: `showOverlay`, `overlaySymbol`, `overlaySide`, `overlayTimer`
    - Video: `isPlaying`, `duration`, `currentTime`
    - UI Interaction: `isDragging`, `isHolding`, `isSeeking`
    - Timers: `overlayTimer`, `clickTimer`, `holdTimer`
  - **Action:** Consolidate into state objects: `overlay`, `video`, `ui`, `timers`

- [ ] **Consolidate Timer Cleanup Function**
  - **Priority:** MID | **Impact:** DRY principle, bug prevention
  - **Current:** Repeated cleanup in `onDestroy()` lines 292-303
  - **Action:** Create `clearAllTimers()` helper function, call in `onDestroy()`

- [ ] **Add Accessibility Enhancements**
  - **Priority:** MID | **Impact:** Screen reader & keyboard nav support
  - **Tasks:**
    - Add `aria-live="polite"` to overlay div
    - Update seekbar input label dynamically during scrub
    - Add `aria-modal="true"` and focus trap to help dialog
    - Add keyboard navigation: Tab + Arrow keys + Delete in bookmark list
  - **WCAG Violations:** Missing region announcements, focus management

- [ ] **Remove Redundant `isMuted` State**
  - **Priority:** LOW | **Impact:** State consistency
  - **Problem:** Tracked separately from `videoEl.muted`; can get out of sync
  - **Action:** Replace with derived/computed state from video element

- [ ] **Deduplicate Tailwind Classes**
  - **Priority:** LOW | **Impact:** Bundle size, consistency
  - **Repeated:** `border border-slate-800 bg-slate-950/80` appears 3+ times
  - **Action:** Extract to `.card` class in CSS module

---

## ⭐ Architecture Refactoring Wishes (I Wish It Were)

### HIGH PRIORITY - Code Architecture

- [ ] **Extract UI Components** (MED effort)
  - `<PlaybackControls>` — Extract play button, volume, mute
  - `<SeekBar>` — Seek input, time display, bookmarks overlay
  - `<BookmarkPanel>` — Bookmark list, add/delete
  - `<HelpDialog>` — Keyboard shortcuts modal
  - `<VideoContainer>` — Video element + drag-drop overlay
  - **Benefit:** Reduced component size (currently ~500 lines), easier testing

- [ ] **Extract State Management** (MID effort)
  - Create `src/features/player/state.ts` with:
    - `createPlayerState()` — Initialize all state objects
    - `createTimerManager()` — Handle all setTimeout/clearTimeout
    - `createEventHandlers()` — Bind all event functions
  - **Benefit:** Cleaner component, reusable state logic, easier to test

- [ ] **Extract Event Handlers to Utilities** (MID effort)
  - `src/features/player/handlers/` — Separate files for:
    - `playback.ts` — play/pause/seek logic
    - `interaction.ts` — click/pointer/drag events
    - `keyboard.ts` — keyboard shortcuts
    - `file.ts` — file loading & drag-drop
  - **Benefit:** Single Responsibility Principle, easier to debug event flows

### MID PRIORITY - Type Safety & Documentation

- [ ] **Create Proper TypeScript Interfaces** (LOW effort)
  - Formalize `Bookmark` interface (export to types/)
  - Create `OverlayState`, `VideoState`, `UIState`, `PlayerConfig` interfaces
  - Add JSDoc comments to exported functions
  - **Benefit:** Self-documenting code, IDE autocompletion, fewer bugs

- [ ] **Extract Keyboard Handler Patterns** (MID effort)
  - Create `src/shared/lib/keyboard.ts`:
    - `createKeyboardMap(shortcuts: Record<string, () => void>)` helper
    - Reusable key detection + preventDefault logic
  - **Benefit:** Reduce keyboard handler boilerplate, consistency

- [ ] **Create Timer/Cleanup Utilities** (LOW effort)
  - `src/shared/lib/timers.ts`:
    - `useTimeout()` — wrapper with auto-cleanup
    - `useInterval()` — wrapper with auto-cleanup
    - `createTimerManager()` — batch clear multiple timers
  - **Benefit:** Less boilerplate, automatic cleanup on destroy

### LOW PRIORITY - Performance & Maintainability

- [ ] **Add Performance Monitoring** (MID effort)
  - Browser Performance API integration
  - Log frame dropping, seek latency, memory usage
  - Dev console warnings for slow operations
  - **Benefit:** Data-driven optimization decisions

- [ ] **Extract CSS to Proper Stylesheet** (LOW effort)
  - Move inline Tailwind classes to `.card`, `.button`, `.overlay` in `style.css`
  - Create CSS variable system for colors (amber-400, slate-950, etc.)
  - **Benefit:** Smaller component, consistent styling, easier themes

- [ ] **Add Input Validation/Sanitization Layer** (LOW effort)
  - `src/shared/lib/validation.ts`:
    - `validateFile(file: File)` — check size, type
    - `validateTime(seconds: number)` — clamp to video duration
  - **Benefit:** Reliable boundaries, easier debugging

---

## 📊 Risk Assessment

| Category | Risk Level | Reason |
|----------|-----------|--------|
| **Code Duplication** | 🔴 HIGH | `formatTime` mismatch will cause bugs and maintenance issues |
| **Mobile Compatibility** | 🔴 HIGH | Touch click detection completely broken |
| **Accessibility** | 🟠 MID | WCAG violations; screen reader users blocked |
| **Performance** | 🟡 LOW | Re-render hack works but inefficient; minor FPS impact |
| **Architecture** | 🟡 LOW | Dead code signals incomplete planning; not blocking |

---

## 🎯 Refactoring Priority Order & Implementation Phases

### Phase 1: Bug Fixes (Blockers) — Must Complete First
- [ ] Deduplicate `formatTime` 
- [ ] Delete unused `VideoMetadata` type
- [ ] Fix mobile `PointerEvent` typing in double-click handler
- [ ] Add seek input debouncing/validation
- [ ] Replace overlay re-render hack with `tick()` or transitions

### Phase 2: Code Quality (Architecture) — Improves Maintainability
- [ ] Extract magic numbers to `src/features/player/config.ts`
- [ ] Group related state into objects (`overlay`, `video`, `ui`, `timers`)
- [ ] Create `clearAllTimers()` helper function
- [ ] Remove redundant `isMuted` state (use derived state)
- [ ] Consolidate Tailwind classes to `.card` CSS class

### Phase 3: Accessibility (Compliance) — WCAG Violations
- [ ] Add `aria-live="polite"` to overlay announcements
- [ ] Add keyboard navigation to bookmark list (Tab, Arrow keys, Delete)
- [ ] Add `aria-modal="true"` and focus trap to help dialog
- [ ] Update seekbar input label dynamically during scrub

### Phase 4: Architecture Refactoring — Code Organization & Scalability
- [ ] Extract UI components (PlaybackControls, SeekBar, BookmarkPanel, etc.)
- [ ] Extract state management to dedicated file
- [ ] Extract event handlers to utilities
- [ ] Create proper TypeScript interfaces for state objects
- [ ] Extract keyboard handler patterns to reusable utilities
- [ ] Create timer/cleanup utilities
- [ ] Add performance monitoring
- [ ] Extract CSS to stylesheet with proper organization
- [ ] Add input validation/sanitization layer

---

## 📝 Notes for Implementation

- **Test Matrix:** Ensure fixes test on desktop (Chrome, Firefox) and mobile (iOS Safari, Android Chrome)
- **Browser Compatibility:** Validate `PointerEvent` support (IE 11 needed? → Check project requirements)
- **Performance:** Monitor re-renders after state grouping refactor
- **Accessibility:** Use axe DevTools or Lighthouse to validate ARIA changes
- **TypeScript:** Keep strict mode enabled; all event handlers fully typed

---

**Status:** ✅ Task list updated → Focused on refactoring & architecture only

---

## 📊 Progress Tracking

**Total Tasks:** ~23
- **Bug Fixes (Phase 1):** 5 tasks
- **Code Quality (Phase 2):** 5 tasks
- **Accessibility (Phase 3):** 4 tasks
- **Architecture Refactoring (Phase 4):** 9 tasks

**Phases Completed:** 0/4
**Tasks Completed:** 0/23

_Update task checkboxes above as work progresses
Scope: Code refactoring & architecture improvements only (no new features)_
