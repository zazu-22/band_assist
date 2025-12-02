# Specification Status Tracker

> Quick reference for all specs with current status and priority.
>
> Last updated: 2025-12-02

---

## Status Overview

| Status | Count | Description |
|--------|-------|-------------|
| 🔴 Active | 1 | Currently being implemented |
| 🟢 Done | 13 | Completed and merged |
| 🟡 Pending | 5 | Queued for implementation (in sequence order) |
| ⚪ Backlog | 12 | Planned but not yet prioritized |

---

## 🔴 Active Spec

The spec currently being implemented:

| Spec | Type | Effort | Notes |
|------|------|--------|-------|
| [feat-remove-ai-gemini-features](feat-remove-ai-gemini-features.md) | Cleanup | Small | Remove unused AI/Gemini code, reclaim UI space |

---

## 🟡 Pending Queue (Sequenced)

Specs queued for implementation **in priority order**. Work through these sequentially.

| Seq | Spec | Type | Effort | Notes |
|-----|------|------|--------|-------|
| 1 | [perf-auto-save-debouncing](pending/perf-auto-save-debouncing.md) | Performance | Small | 70-90% fewer API calls, add save indicator |
| 2 | [perf-context-splitting](pending/perf-context-splitting.md) | Performance | Medium | 80% fewer re-renders during editing |
| 3 | [infra-automated-versioning](pending/infra-automated-versioning.md) | Infrastructure | Medium | Release-please for semantic versioning |
| 4 | [feat-user-member-linking-phase-1](pending/feat-user-member-linking-phase-1.md) | Feature | Large | Foundation for personalization features |

---

## 🟢 Done (13)

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

---

## ⚪ Backlog

### High Priority

| Spec | Type | Effort | Notes |
|------|------|--------|-------|
| [infra-service-layer-testing](backlog/infra-service-layer-testing.md) | Testing | Medium | Critical path has 0% coverage |

### Medium Priority

| Spec | Type | Effort | Notes |
|------|------|--------|-------|
| [feat-user-member-linking-phase-2](backlog/feat-user-member-linking-phase-2.md) | Feature | Large | Depends on Phase 1 |
| [feat-user-member-linking-phase-3](backlog/feat-user-member-linking-phase-3.md) | Feature | Large | Depends on Phase 1 & 2 |
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
| Dec 2024 | feat-remove-ai-gemini-features | 🔴 Moved to Active |
| Dec 2024 | perf-context-splitting | 🟡 Moved to Pending (seq #2) |
| Dec 2024 | infra-automated-versioning | 🟡 Moved to Pending (seq #3) |
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
