# Specification Status Tracker

> Quick reference for all specs with current status and priority.
>
> Last updated: 2025-12-05

---

## Status Overview

| Status | Count | Description |
|--------|-------|-------------|
| 🔴 Active | 0 | Currently being implemented |
| 🟢 Done | 15 | Completed and merged |
| 🟡 Pending | 2 | Queued for implementation (in sequence order) |
| ⚪ Backlog | 14 | Planned but not yet prioritized |

---

## 🔴 Active Spec

No specs currently active. Next up: [feat-user-member-linking-phase-2](pending/feat-user-member-linking-phase-2.md)

---

## 🟡 Pending Queue (Sequenced)

Specs queued for implementation **in priority order**. Work through these sequentially.

| Seq | Spec | Type | Effort | Notes |
|-----|------|------|--------|-------|
| 1 | [feat-user-member-linking-phase-2](pending/feat-user-member-linking-phase-2.md) | Feature | Medium | Practice tracking (3-4 days) |
| 2 | [feat-user-member-linking-phase-3](pending/feat-user-member-linking-phase-3.md) | Feature | Large | Personalization + preferences (5-7 days) |

---

## 🟢 Done (15)

| Spec | Type | Priority | Completed |
|------|------|----------|-----------|
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
| [feat-alphatab-dark-mode-theming](backlog/feat-alphatab-dark-mode-theming.md) | Feature | Medium | Design system integration |
| [feat-performance-mode-alphatab-metronome](backlog/feat-performance-mode-alphatab-metronome.md) | Feature | Small | Enable metronome |
| [feat-performance-mode-pdf-viewer-improvements](backlog/feat-performance-mode-pdf-viewer-improvements.md) | Feature | Small | Better PDF display |
| [fix-performance-mode-chart-switch-flicker](backlog/fix-performance-mode-chart-switch-flicker.md) | Bug Fix | Small | UI flicker fix |
| [infra-ci-test-suite](backlog/infra-ci-test-suite.md) | Infrastructure | Medium | CI/CD configuration |
| [infra-unit-testing-practice-mode](backlog/infra-unit-testing-practice-mode.md) | Testing | Medium | Practice Mode tests |
| [infra-unit-testing-band-dashboard](backlog/infra-unit-testing-band-dashboard.md) | Testing | Medium | Dashboard tests |

---

## Effort Estimates

| Effort | Time Range |
|--------|------------|
| **Small** | 1-3 hours |
| **Medium** | 1-2 days |
| **Large** | 1+ week |

---

## Recent Activity

| Date | Spec | Change |
|------|------|--------|
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

```
feat-user-member-linking-phase-1
    └── feat-user-member-linking-phase-2
            └── feat-user-member-linking-phase-3

perf-alphatab-lazy-loading ✅
    └── feat-alphatab-dark-mode-theming (optional enhancement)
```

---

*See [README.md](README.md) for full specification format and guidelines.*
