# Specification Status Tracker

> Quick reference for all specs with current status and priority.
>
> Last updated: 2025-12-02

---

## Status Overview

| Status | Count | Description |
|--------|-------|-------------|
| 🟢 Done | 13 | Completed and merged |
| 🟡 Pending | 3 | In progress or ready to start |
| ⚪ Backlog | 14 | Planned but not started |

---

## All Specs by Status

### 🟢 Done (13)

| Spec | Type | Priority | Completed |
|------|------|----------|-----------|
| [perf-alphatab-lazy-loading](done/perf-alphatab-lazy-loading.md) | Performance | High | Dec 2024 |
| [feat-design-system-phase4-polish-qa](done/feat-design-system-phase4-polish-qa.md) | Feature | High | Dec 2024 |
| [feat-design-system-phase3-performance-mode](done/feat-design-system-phase3-performance-mode.md) | Feature | High | Dec 2024 |
| [feat-practice-room-unified-control-bar](done/feat-practice-room-unified-control-bar.md) | Feature | High | Dec 2024 |
| [infra-alphatab-modernization](done/infra-alphatab-modernization.md) | Infrastructure | High | Dec 2024 |
| [fix-ios-alphatab-audio-silent](done/fix-ios-alphatab-audio-silent.md) | Bug Fix | High | Dec 2024 |
| [fix-ios-audio](done/fix-ios-audio.md) | Bug Fix | High | Dec 2024 |
| [design-system-phase2-detail-pages](done/design-system-phase2-detail-pages.md) | Feature | Medium | Dec 2024 |
| [design-system-phase1-high-impact](done/design-system-phase1-high-impact.md) | Feature | High | Dec 2024 |
| [extend-design-system-setlist-subpages](done/extend-design-system-setlist-subpages.md) | Feature | Medium | Dec 2024 |

### 🟡 Pending (3)

| Spec | Type | Priority | Notes |
|------|------|----------|-------|
| [perf-auto-save-debouncing](pending/perf-auto-save-debouncing.md) | Performance | High | Quick win - 70-90% fewer API calls |
| [feat-user-member-linking-phase-1](pending/feat-user-member-linking-phase-1.md) | Feature | High | Foundation for personalization |
| [feat-remove-ai-gemini-features](pending/feat-remove-ai-gemini-features.md) | Cleanup | High | Remove unused code |

### ⚪ Backlog - High Priority (2)

| Spec | Type | Effort | Notes |
|------|------|--------|-------|
| [infra-service-layer-testing](backlog/infra-service-layer-testing.md) | Testing | Medium | Critical path has 0% coverage |
| [infra-automated-versioning](backlog/infra-automated-versioning.md) | Infrastructure | Medium | Release-please setup |

### ⚪ Backlog - Medium Priority (6)

| Spec | Type | Effort | Notes |
|------|------|--------|-------|
| [feat-user-member-linking-phase-2](backlog/feat-user-member-linking-phase-2.md) | Feature | Large | Depends on Phase 1 |
| [feat-user-member-linking-phase-3](backlog/feat-user-member-linking-phase-3.md) | Feature | Large | Depends on Phase 1 & 2 |
| [perf-context-splitting](backlog/perf-context-splitting.md) | Performance | Medium | 80% fewer re-renders |
| [feat-collaborative-song-notes](backlog/feat-collaborative-song-notes.md) | Feature | Medium | Timestamped comments |
| [feat-practice-mode-track-presets](backlog/feat-practice-mode-track-presets.md) | Feature | Medium | Save practice configurations |
| [feat-setlist-analytics](backlog/feat-setlist-analytics.md) | Feature | Medium | Analyze setlist flow |
| [feat-pre-gig-checklist](backlog/feat-pre-gig-checklist.md) | Feature | Medium | Customizable checklists |
| [feat-rehearsal-timer-mode](backlog/feat-rehearsal-timer-mode.md) | Feature | Medium | Time-boxed practice |

### ⚪ Backlog - Lower Priority (7)

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

## Priority Definitions

| Priority | Criteria |
|----------|----------|
| **High** | Blocking issues, critical bugs, or high-impact quick wins |
| **Medium** | Important features, performance improvements, foundational work |
| **Lower** | Nice-to-have features, minor improvements, future enhancements |

## Effort Estimates

| Effort | Time Range |
|--------|------------|
| **Small** | 1-3 hours |
| **Medium** | 1-2 days |
| **Large** | 1+ week |

---

## Recommended Next Actions

Based on priority and dependencies:

1. **perf-auto-save-debouncing** - Quick win, high impact, no dependencies
2. **feat-remove-ai-gemini-features** - Cleanup, well-documented, no dependencies
3. **infra-automated-versioning** - Better release process
4. **feat-user-member-linking-phase-1** - Foundation for personalization features
5. **perf-context-splitting** - Performance improvement for editing

---

## Recent Activity

| Date | Spec | Change |
|------|------|--------|
| Dec 2024 | perf-alphatab-lazy-loading | ✅ Completed |
| Dec 2024 | feat-alphatab-dark-mode-theming | ➕ Added to backlog |

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
