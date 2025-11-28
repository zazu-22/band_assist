# Specification Review: Setlist Builder Design System Extension

**Spec File:** `feat-setlist-builder-design-system-extension.md`
**Review Date:** 2025-01-28
**Reviewer:** AI Assistant

---

## 1. UNDERSTANDING SUMMARY

This specification describes a visual refactoring of the Setlist Builder component (`SetlistManager.tsx`) in a React-based band management application called "Band Assist." The core goal is to align the Setlist Builder with the established "Backstage Command Center" design system that has already been implemented in the Dashboard and Practice Room components. This is purely a UI/UX modernization effort—no new features are being added, and all existing functionality must remain intact.

The target users are band members who use the application to manage their setlists for performances. They interact with this component to add songs, reorder them via drag-and-drop, view song metadata (key, BPM, status), get AI suggestions, and prepare for upcoming gigs. The refactored interface will provide better visual hierarchy, readiness metrics at a glance, countdown context for upcoming performances, and a more polished, professional appearance consistent with the rest of the application.

The technology stack is React 19 with TypeScript, Vite, Tailwind CSS 4, and shadcn/ui components. The refactoring involves extracting the monolithic `SetlistManager.tsx` into several focused sub-components (`SetlistHeader`, `SetlistStats`, `SetlistItem`, `SetlistActionBar`, `AddSongForm`) within a new `src/components/setlist/` directory. Key design system elements include Brawler serif font for headlines, JetBrains Mono for numbers, staggered entrance animations, segmented progress bars for readiness visualization, and ambient background effects.

---

## 2. SCOPE ASSESSMENT

- **Approximate number of features/components to implement:** 6-8
  - SetlistHeader component
  - SetlistStats component
  - SetlistItem component
  - SetlistActionBar component
  - AddSongForm component
  - DropIndicator (inline component)
  - Refactored SetlistManager (integration)
  - Test files for each component

- **Complexity level:** **Medium**
  - The spec is extremely detailed with nearly complete TypeScript code
  - No new business logic—purely presentational changes
  - Well-defined patterns from existing Dashboard implementation
  - Clear acceptance criteria per phase

- **Estimated sessions to complete:** 2-3 sessions
  - Phase 1-2: Component extraction + Header/Stats (1 session)
  - Phase 3-4: Action bar, form, integration (1 session)
  - Phase 5: Testing and documentation (0.5-1 session)

---

## 3. ASSUMPTIONS

1. **Design system CSS already exists:** The spec references animations like `animate-slide-in-from-bottom`, `animate-progress-fill`, `animate-pulse-glow`, and utility classes like `stagger-1`, `stagger-2`. I assume these are already defined in `src/index.css` from the Dashboard implementation.

2. **Events prop will be passed from parent:** The spec recommends receiving `events` as a prop rather than fetching internally. I'll assume the parent component (likely `App.tsx`) already has access to events and can pass them down.

3. **SetlistManager currently receives `songs` and `setSongs` props:** Based on the spec's interface, the existing component already follows this pattern.

4. **No breaking changes to component API:** The only new prop is `events?: BandEvent[]`, which is optional, maintaining backward compatibility.

5. **StatusBadge component already exists and works:** The spec mentions it's already present but "lacks supporting visual context."

6. **EmptyState component exists in `@/components/ui`:** Referenced in the spec for the empty song list state.

7. **Toast notifications are already set up:** The spec uses `toast` for success/error messages without explaining setup.

8. **Test utilities (vitest, testing-library, axe-core) are already configured:** Based on CLAUDE.md mentioning existing test infrastructure.

---

## 4. AMBIGUITIES & QUESTIONS

### [CLARIFICATION] Animation keyframes existence
The spec uses several animation classes (`animate-slide-in-from-bottom`, `animate-slide-in-from-top`, `animate-progress-fill`, `animate-pulse-glow`, `animate-fade-in`). Are all of these already defined in `index.css` from the Dashboard work, or do some need to be created?

### [CLARIFICATION] `animation-forwards` utility class
The spec uses `animation-forwards` as a Tailwind class. This isn't standard Tailwind. Is this a custom utility already defined, or should it be `fill-mode-forwards`?

### [CLARIFICATION] Stagger utilities (`stagger-1`, `stagger-2`)
The spec uses stagger classes for animation delays. Are these already defined as custom utilities?

### [CLARIFICATION] Current SetlistManager interface
The spec shows the updated interface with `events?: BandEvent[]`, but I should verify the current props interface to ensure I understand what's changing.

### [CLARIFICATION] Drag-and-drop implementation details
The spec shows handler signatures (`onDragStart`, `onDragOver`, etc.) but doesn't show the actual implementation logic. Should I preserve the existing drag-and-drop logic exactly, or is there room for improvement?

### [BLOCKING] Testing scope for existing functionality
The spec says "All existing features (add, delete, reorder, AI suggestions) work unchanged." Should I write regression tests for existing functionality, or focus only on testing the new visual components?

### [CLARIFICATION] AI suggestions button behavior
The spec shows an "AI Suggestions" button but doesn't detail what happens when clicked. Is this existing functionality that should remain unchanged?

### [CLARIFICATION] `formatTotalTime` utility
The spec references `formatTotalTime(totalDurationSeconds)` but doesn't show where this comes from. Is it an existing utility in the component?

---

## 5. POTENTIAL ISSUES

### Technical Challenges

1. **Drag-and-drop during refactor:** Extracting `SetlistItem` as a separate component while preserving drag-and-drop state management (draggedIndex, dragOverIndex) requires careful prop drilling. The parent must maintain state while children handle events.

2. **Animation timing coordination:** Staggered animations with the drop indicator during drag-and-drop could create visual conflicts. May need to disable entrance animations during active drag operations.

3. **Test isolation:** Testing drag-and-drop interactions with React Testing Library can be tricky. The spec's test examples use `fireEvent.dragStart/dragOver/drop` but these may need additional setup.

### Scope Creep Risks

1. **"Polish" is subjective:** Phase 4 includes "final styling adjustments" which could expand indefinitely without clear criteria.

2. **Accessibility improvements:** The spec mentions keyboard drag-and-drop as a future enhancement, but implementing accessible reordering properly is complex. Clear boundary needed.

3. **Mobile UX:** The spec acknowledges touch drag-and-drop issues but defers them. Testers may flag this as a bug rather than a known limitation.

### Missing Prerequisites

1. **Need to verify animation keyframes exist:** If missing, need to add them to `index.css` first.

2. **Need to verify `events` are accessible:** If the parent component doesn't currently receive events from context, plumbing may be needed.

### Potential Conflicts

1. **Component naming:** `SetlistItem` vs potential conflicts with any existing `ListItem` or similar components in the codebase.

2. **Test file location:** Spec shows tests alongside components (`SetlistItem.test.tsx` in `setlist/` folder) but existing tests appear to be in the same folder as components. Need to confirm convention.

---

## 6. RECOMMENDATIONS

### Before Proceeding

1. **Verify animation keyframes:** Read `src/index.css` to confirm which animations already exist and which need to be added. This should be Phase 0.

2. **Read current SetlistManager:** Understand the existing implementation before refactoring. The spec provides the "after" but not the "before."

3. **Confirm test file convention:** Check where existing tests live to maintain consistency.

### Spec Improvements

1. **Add "Phase 0: Prerequisites"** that explicitly lists CSS utilities to verify/add before component work begins.

2. **Include current SetlistManager interface:** Would help understand the delta between current and proposed implementation.

3. **Clarify test expectations:** "≥80% coverage for new components" is good, but clarify if regression tests for existing functionality are in scope.

4. **Add visual mockups or screenshots:** The spec is text-heavy. Even rough wireframes would help validate understanding.

### Simplifications

1. **Consider deferring SetlistStats to Phase 2.5:** This component adds the most new visual information (readiness metrics). If time is tight, the core typography and animation updates (SetlistItem, SetlistHeader) deliver most of the design system alignment.

2. **Batch similar tests:** Rather than individual test files per component, consider a single `setlist.test.tsx` file initially, then split if it grows large.

---

## 7. RECOMMENDED NEXT STEPS

Before proceeding to implementation, I recommend:

1. **Read the current `SetlistManager.tsx`** to understand the baseline
2. **Check `src/index.css`** for existing animation definitions
3. **Verify `events` data flow** from App.tsx/context
4. **User confirmation** on the [BLOCKING] question about test scope

Once these are confirmed, implementation can proceed with the phased approach outlined in the spec.

---

*This review is ready for user feedback. Please confirm assumptions, answer blocking questions, or approve to proceed with implementation.*
