# Specification Status Tracker

> Quick reference for all specs, GitHub issues, and current status.
>
> Last updated: 2025-12-08

---

## Quick Links

- **GitHub Issues:** [zazu-22/band_assist/issues](https://github.com/zazu-22/band_assist/issues)
- **Local CLI:** `gh issue list --state open` (requires GitHub CLI)

---

## Status Overview

| Status | Count | Description |
|--------|-------|-------------|
| 🔴 Active | 0 | Currently being implemented |
| 🟢 Done | 16 | Completed and merged |
| 🟡 Pending | 1 | Queued for implementation (in sequence order) |
| ⚪ Backlog | 16 | Planned but not yet prioritized |
| 🔵 GitHub Issues | 4 | Tracked in GitHub (bugs, smaller features) |

---

## 🔴 Active Spec

No specs currently active. Next up: [feat-user-member-linking-phase-3](pending/feat-user-member-linking-phase-3.md)

---

## 🟡 Pending Queue (Sequenced)

Specs queued for implementation **in priority order**. Work through these sequentially.

| Seq | Spec | Type | Effort | Notes |
|-----|------|------|--------|-------|
| 1 | [feat-user-member-linking-phase-3](pending/feat-user-member-linking-phase-3.md) | Feature | Large | Personalization + preferences (5-7 days) |

---

## 🔵 GitHub Issues (4 open)

Smaller features, bug fixes, and follow-up work tracked in GitHub rather than full specs.

> **Tip:** Use `gh issue list --state open` locally or visit [GitHub Issues](https://github.com/zazu-22/band_assist/issues)

### Bugs (Critical)

✅ No critical bugs open. ([#100](https://github.com/zazu-22/band_assist/issues/100) password reset fixed 2025-12-07)

### Practice Tracking Cluster

| # | Title | Effort | Dependencies |
|---|-------|--------|--------------|
| [#125](https://github.com/zazu-22/band_assist/issues/125) | Practice Logging: Date Selection & Edit | Medium | ✅ Closed |
| [#126](https://github.com/zazu-22/band_assist/issues/126) | Practice History Filtering & Sorting | Medium | ✅ Closed |
| [#121](https://github.com/zazu-22/band_assist/issues/121) | Virtualize PracticeHistory table | Medium | Ready (deps complete) |

### Band Management Cluster

| # | Title | Effort | Dependencies |
|---|-------|--------|--------------|
| [#124](https://github.com/zazu-22/band_assist/issues/124) | Band management UI (parent tracking) | - | Close after #128 |
| [#127](https://github.com/zazu-22/band_assist/issues/127) | Enhanced band selector with creation flow | Medium | ✅ Closed |
| [#141](https://github.com/zazu-22/band_assist/issues/141) | Fix band selection persistence & auto-save race condition | Medium | ✅ Closed |
| [#128](https://github.com/zazu-22/band_assist/issues/128) | Band settings/management UI | Medium | Ready (deps complete) |

### Standalone Enhancements

| # | Title | Effort | Notes |
|---|-------|--------|-------|
| [#107](https://github.com/zazu-22/band_assist/issues/107) | Add song naming to files (PDFs) | Small | ✅ Closed |
| [#101](https://github.com/zazu-22/band_assist/issues/101) | Mobile layout for iOS Safari | Large | Major refactor, needs device testing |

---

## 🟢 Done (16)

| Spec | Type | Priority | Completed |
|------|------|----------|-----------|
| [feat-user-member-linking-phase-2](done/feat-user-member-linking-phase-2.md) | Feature | High | 2025-12-07 |
| [feat-user-member-linking-phase-1](done/feat-user-member-linking-phase-1.md) | Feature | High | 2025-12-05 |
| [infra-automated-versioning](done/infra-automated-versioning.md) | Infrastructure | Medium | 2025-12-03 |
| [perf-context-splitting](done/perf-context-splitting.md) | Performance | Medium | 2025-12-02 |
| [perf-auto-save-debouncing](done/perf-auto-save-debouncing.md) | Performance | High | Dec 2025 |
| [feat-remove-ai-gemini-features](done/feat-remove-ai-gemini-features.md) | Cleanup | High | Dec 2025 |
| [perf-alphatab-lazy-loading](done/perf-alphatab-lazy-loading.md) | Performance | High | Dec 2025 |
| [feat-design-system-phase4-polish-qa](done/feat-design-system-phase4-polish-qa.md) | Feature | High | Dec 2025 |
| [feat-design-system-phase3-performance-mode](done/feat-design-system-phase3-performance-mode.md) | Feature | High | Dec 2025 |
| [feat-practice-room-unified-control-bar](done/feat-practice-room-unified-control-bar.md) | Feature | High | Dec 2025 |
| [infra-alphatab-modernization](done/infra-alphatab-modernization.md) | Infrastructure | High | Dec 2025 |
| [fix-ios-alphatab-audio-silent](done/fix-ios-alphatab-audio-silent.md) | Bug Fix | High | Dec 2025 |
| [fix-ios-audio](done/fix-ios-audio.md) | Bug Fix | High | Dec 2025 |
| [design-system-phase2-detail-pages](done/design-system-phase2-detail-pages.md) | Feature | Medium | Dec 2025 |
| [design-system-phase1-high-impact](done/design-system-phase1-high-impact.md) | Feature | High | Dec 2025 |
| [extend-design-system-setlist-subpages](done/extend-design-system-setlist-subpages.md) | Feature | Medium | Dec 2025 |

---

## ⚪ Backlog

### High Priority

| Spec | Type | Effort | Notes |
|------|------|--------|-------|
| [infra-test-environment-setup](backlog/infra-test-environment-setup.md) | Infrastructure | Small | Blocks service-layer-testing and ci-test-suite |
| [infra-service-layer-testing](backlog/infra-service-layer-testing.md) | Testing | Medium | Critical path has 0% coverage |

### Medium Priority

| Spec | Type | Effort | Notes |
|------|------|--------|-------|
| [feat-lead-sheet-generation](backlog/feat-lead-sheet-generation.md) | Feature | Large | Auto-generate from GP files |
| [feat-collaborative-song-notes](backlog/feat-collaborative-song-notes.md) | Feature | Medium | Timestamped comments |
| [feat-practice-mode-track-presets](backlog/feat-practice-mode-track-presets.md) | Feature | Medium | Save practice configurations |
| [feat-setlist-analytics](backlog/feat-setlist-analytics.md) | Feature | Medium | Analyze setlist flow |
| [feat-pre-gig-checklist](backlog/feat-pre-gig-checklist.md) | Feature | Medium | Customizable checklists |
| [feat-rehearsal-timer-mode](backlog/feat-rehearsal-timer-mode.md) | Feature | Medium | Time-boxed practice |

### Lower Priority

| Spec | Type | Effort | Notes |
|------|------|--------|-------|
| [feat-user-member-unlinking](backlog/feat-user-member-unlinking.md) | Feature | Small | Undo accidental member claim |
| [feat-alphatab-dark-mode-theming](backlog/feat-alphatab-dark-mode-theming.md) | Feature | Medium | Design system integration |
| [feat-performance-mode-alphatab-metronome](backlog/feat-performance-mode-alphatab-metronome.md) | Feature | Small | Enable metronome |
| [feat-performance-mode-pdf-viewer-improvements](backlog/feat-performance-mode-pdf-viewer-improvements.md) | Feature | Small | Better PDF display |
| [fix-performance-mode-chart-switch-flicker](backlog/fix-performance-mode-chart-switch-flicker.md) | Bug Fix | Small | UI flicker fix |
| [infra-ci-test-suite](backlog/infra-ci-test-suite.md) | Infrastructure | Medium | CI/CD configuration |
| [infra-unit-testing-practice-mode](backlog/infra-unit-testing-practice-mode.md) | Testing | Medium | Practice Mode tests |
| [infra-unit-testing-band-dashboard](backlog/infra-unit-testing-band-dashboard.md) | Testing | Medium | Dashboard tests |
| [feat-user-member-linking-phase-4-practice-history-design](backlog/feat-user-member-linking-phase-4-practice-history-design.md) | Feature | Low | Practice History design polish |

---

## Effort Estimates

| Effort | Time Range |
|--------|------------|
| **Small** | 1-3 hours |
| **Medium** | 1-2 days |
| **Large** | 1+ week |

---

## Recent Activity

| Date | Item | Change |
|------|------|--------|
| 2025-12-08 | [#141](https://github.com/zazu-22/band_assist/issues/141) Auto-save race condition | ✅ Fixed (three-layer protection: cancel pending saves, loading guard, band integrity check) |
| 2025-12-08 | PR #139 | ✅ Unblocked (ready for merge) |
| 2025-12-08 | [#141](https://github.com/zazu-22/band_assist/issues/141) Auto-save race condition | ➕ Created (blocks PR #139, #128 depends on it) |
| 2025-12-08 | PR #139 | ⚠️ Blocked pending #141 resolution (data corruption discovered) |
| 2025-12-08 | [#127](https://github.com/zazu-22/band_assist/issues/127) Enhanced band selector | ✅ Closed (merged in PR #139) |
| 2025-12-08 | [#125](https://github.com/zazu-22/band_assist/issues/125), [#126](https://github.com/zazu-22/band_assist/issues/126) | ✅ Closed (merged in PR #135) |
| 2025-12-07 | [#107](https://github.com/zazu-22/band_assist/issues/107) Song file naming | ✅ Closed (merged in PR #132) |
| 2025-12-07 | [#100](https://github.com/zazu-22/band_assist/issues/100) Password reset bug | ✅ Closed (merged in PR #130) |
| 2025-12-07 | GitHub Issues | 📋 Added 9 open issues to STATUS.md with dependency graph |
| 2025-12-07 | Proposed Sequence | 📋 Added recommended implementation order |
| 2025-12-07 | feat-user-member-linking-phase-4-practice-history-design | ➕ Added to backlog |
| 2025-12-07 | feat-user-member-linking-phase-2 | ✅ Completed (migration fix) |
| 2025-12-05 | feat-user-member-unlinking | ➕ Added to backlog (undo wrong member claim) |
| 2025-12-05 | infra-test-environment-setup | ➕ Added to backlog (blocks testing specs) |
| 2025-12-05 | feat-user-member-linking-phase-1 | ✅ Completed |
| 2025-12-05 | feat-user-member-linking-phase-1 | 🔴 Moved to active (specs/feat-user-member-linking-phase-1.md) |
| 2025-12-05 | feat-user-member-linking-phase-1 | 📝 Revised: removed user_preferences, auto-link; added error handling |
| 2025-12-05 | feat-user-member-linking-phase-2 | 📝 Revised: added service methods, error handling, state management |
| 2025-12-05 | feat-user-member-linking-phase-3 | 📝 Revised: added user_preferences from Phase 1 |
| 2025-12-05 | feat-user-member-linking-phase-1 | ➕ Added to pending |
| 2025-12-05 | feat-user-member-linking-phase-2 | ➕ Added to pending |
| 2025-12-05 | feat-user-member-linking-phase-3 | ➕ Added to pending |
| 2025-12-05 | infra-automated-versioning | ✅ Completed |
| 2025-12-03 | perf-context-splitting | ✅ Completed |
| Dec 2025 | feat-lead-sheet-generation | ➕ Added to backlog |
| Dec 2025 | perf-auto-save-debouncing | ✅ Completed |
| Dec 2025 | feat-remove-ai-gemini-features | ✅ Completed |
| Dec 2025 | infra-automated-versioning | ✅ Completed |
| Dec 2025 | perf-alphatab-lazy-loading | ✅ Completed |
| Dec 2025 | feat-alphatab-dark-mode-theming | ➕ Added to backlog |

---

## Dependencies Graph

### Specs

```
feat-user-member-linking-phase-1 ✅
    └── feat-user-member-linking-phase-2 ✅
            ├── feat-user-member-linking-phase-3 (pending)
            └── feat-user-member-linking-phase-4-practice-history-design (backlog)

perf-alphatab-lazy-loading ✅
    └── feat-alphatab-dark-mode-theming (backlog)

infra-test-environment-setup (backlog)
    └── infra-service-layer-testing (backlog)
            └── infra-ci-test-suite (backlog)
```

### GitHub Issues

```
#100 (password reset bug) ─── ✅ CLOSED
#107 (file naming) ─── ✅ CLOSED
#125 (practice edit) ─── ✅ CLOSED
#126 (filtering/sort) ─── ✅ CLOSED
#127 (band selector) ─── ✅ CLOSED
#141 (auto-save race condition) ─── ✅ CLOSED

#121 (virtualization) ─── ready (deps complete)

#128 (band settings) ──► #124 (close parent) ─── ready (deps complete)

#101 (mobile iOS) ─── standalone, large scope
```

---

## Proposed Sequence

Recommended order considering dependencies and effort:

### Phase 1: Critical & Quick Wins ✅ COMPLETE

| Order | Item | Type | Rationale |
|-------|------|------|-----------|
| 1 | [#100](https://github.com/zazu-22/band_assist/issues/100) Password reset bug | Bug | ✅ Resolved 2025-12-07 |
| 2 | [#107](https://github.com/zazu-22/band_assist/issues/107) Song naming for files | Issue | ✅ Implemented 2025-12-07 |

### Phase 2: Practice Tracking ✅ COMPLETE

| Order | Item | Type | Rationale |
|-------|------|------|-----------|
| 3 | [#125](https://github.com/zazu-22/band_assist/issues/125) Practice logging | Issue | ✅ Closed (PR #135) |
| 4 | [#126](https://github.com/zazu-22/band_assist/issues/126) Filtering & sorting | Issue | ✅ Closed (PR #135) |
| 5 | [#121](https://github.com/zazu-22/band_assist/issues/121) Virtualize table | Issue | Ready - deps complete |

### Phase 3: Band Management (In Progress)

| Order | Item | Type | Rationale |
|-------|------|------|-----------|
| 6 | [#127](https://github.com/zazu-22/band_assist/issues/127) Band selector | Issue | ✅ Closed |
| 6a | [#141](https://github.com/zazu-22/band_assist/issues/141) Fix auto-save race condition | Issue | ✅ Closed |
| 7 | [#128](https://github.com/zazu-22/band_assist/issues/128) Band settings | Issue | Ready (deps complete) |
| 8 | Close [#124](https://github.com/zazu-22/band_assist/issues/124) | Issue | Parent tracking issue done |

### Phase 4: Larger Efforts

| Order | Item | Type | Rationale |
|-------|------|------|-----------|
| 9 | [feat-user-member-linking-phase-3](pending/feat-user-member-linking-phase-3.md) | Spec | Large feature, personalization |
| 10 | [#101](https://github.com/zazu-22/band_assist/issues/101) Mobile iOS refactor | Issue | Large scope, device testing needed |

### Parallel Opportunities

These can run concurrently with minimal conflict:

- **#128** (band settings) — ready, dependencies complete
- **#101** (mobile) can run in parallel with Phase 3/4 if resources allow

> ✅ **Note:** #141 (auto-save race condition) has been resolved. PR #139 is unblocked.

---

*See [README.md](README.md) for full specification format and guidelines.*
