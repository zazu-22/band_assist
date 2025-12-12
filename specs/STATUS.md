# Specification Status Tracker

> Quick reference for all specs, GitHub issues, and current status.
>
> Last updated: 2025-12-12

---

## Quick Links

- **GitHub Issues:** [zazu-22/band_assist/issues](https://github.com/zazu-22/band_assist/issues)
- **Milestones:** [zazu-22/band_assist/milestones](https://github.com/zazu-22/band_assist/milestones)
- **Local CLI:** `gh issue list --state open` (requires GitHub CLI)

---

## Status Overview

| Status | Count | Description |
|--------|-------|-------------|
| 🔴 Active | 0 | Currently being implemented |
| 🟢 Done | 19 | Completed and merged |
| 🟡 Pending | 0 | Queued for implementation (in sequence order) |
| ⚪ Backlog | 18 | Planned but not yet prioritized |
| 🔵 GitHub Issues | 17 | Tracked in GitHub (bugs, smaller features) |

---

## 🔴 Active Spec

No active spec. Next spec will be selected from backlog.

---

## 🟡 Pending Queue (Sequenced)

No pending specs.

---

## 🔵 GitHub Issues (17 open)

Smaller features, bug fixes, and follow-up work tracked in GitHub rather than full specs.

> **Tip:** Use `gh issue list --state open` locally or visit [GitHub Issues](https://github.com/zazu-22/band_assist/issues)

### Milestone: Song Collaboration & Annotations (#3) 🆕

| # | Title | Type | Notes |
|---|-------|------|-------|
| [#196](https://github.com/zazu-22/band_assist/issues/196) | epic: Song Collaboration & Annotations Architecture | Epic | Master plan for sections, assignments, annotations |
| [#197](https://github.com/zazu-22/band_assist/issues/197) | infra: Upgrade AlphaTab to 1.7.1 | Infrastructure | Phase 0 prerequisite, blocks all collaboration phases |

### Milestone: Improve 'My Songs' View (#1)

| # | Title | Type | Notes |
|---|-------|------|-------|
| [#184](https://github.com/zazu-22/band_assist/issues/184) | epic: Improve 'My Songs' View | Epic | Parent tracking issue |
| [#186](https://github.com/zazu-22/band_assist/issues/186) | feat(my-songs): Display total practice time per song | Enhancement | |
| [#187](https://github.com/zazu-22/band_assist/issues/187) | feat(my-songs): add sortable columns and table-based layout | Enhancement | |
| [#188](https://github.com/zazu-22/band_assist/issues/188) | feat(my-songs): Clarify user status vs band status badges | Enhancement | |
| [#191](https://github.com/zazu-22/band_assist/issues/191) | feat(my-songs): add practice priority setting | Enhancement | |
| [#192](https://github.com/zazu-22/band_assist/issues/192) | feat(my-songs): add infographic stat cards | Enhancement | |
| [#193](https://github.com/zazu-22/band_assist/issues/193) | feat(my-songs): ensure song names are clickable links | Enhancement | |
| [#194](https://github.com/zazu-22/band_assist/issues/194) | feat(my-songs): add edit menu for learning status changes | Enhancement | |

### Milestone: Improve Schedule Dialogue (#2)

| # | Title | Type | Notes |
|---|-------|------|-------|
| [#181](https://github.com/zazu-22/band_assist/issues/181) | refactor(schedule): use Textarea primitive for notes field | Enhancement | |
| [#182](https://github.com/zazu-22/band_assist/issues/182) | feat(schedule): convert event editor to modal dialog | Enhancement | Mobile-friendly |

### Infrastructure / Dependencies

| # | Title | Effort | Notes |
|---|-------|--------|-------|
| [#154](https://github.com/zazu-22/band_assist/issues/154) | Upgrade to latest stable ESLint version | Medium | Dependency update |
| [#153](https://github.com/zazu-22/band_assist/issues/153) | Identify replacements for deprecated dependencies | Small | Documentation |
| [#142](https://github.com/zazu-22/band_assist/issues/142) | Weekly Dependency Review - 2025-12-08 | Small | Documentation |

### Standalone / Mobile

| # | Title | Effort | Notes |
|---|-------|--------|-------|
| [#195](https://github.com/zazu-22/band_assist/issues/195) | Add volume control | Small | Audio enhancement |
| [#101](https://github.com/zazu-22/band_assist/issues/101) | Mobile layout for iOS Safari | Large | Major refactor, needs device testing |

### Recently Closed ✅

| # | Title | Closed |
|---|-------|--------|
| [#152](https://github.com/zazu-22/band_assist/issues/152) | Evaluate AlphaTab 1.7 | 2025-12-11 (promoted to #197) |
| [#172](https://github.com/zazu-22/band_assist/issues/172) | My Songs design aesthetic refinements | 2025-12-10 (PR #177) |
| [#173](https://github.com/zazu-22/band_assist/issues/173) | Log Practice Modal UX fixes | 2025-12-10 (PR #175) |
| [#178](https://github.com/zazu-22/band_assist/issues/178) | Practice modal mobile scroll | 2025-12-10 (PR #179) |
| [#171](https://github.com/zazu-22/band_assist/issues/171) | Failed to save toast bug | 2025-12-10 |

### Practice Tracking Cluster ✅ COMPLETE

| # | Title | Status |
|---|-------|--------|
| [#125](https://github.com/zazu-22/band_assist/issues/125) | Practice Logging: Date Selection & Edit | ✅ Closed |
| [#126](https://github.com/zazu-22/band_assist/issues/126) | Practice History Filtering & Sorting | ✅ Closed |
| [#145](https://github.com/zazu-22/band_assist/issues/145) | Add "status" field to Practice Session logger | ✅ Closed |
| [#121](https://github.com/zazu-22/band_assist/issues/121) | Virtualize PracticeHistory table | ✅ Closed |

### Band Management Cluster ✅ COMPLETE

| # | Title | Status |
|---|-------|--------|
| [#124](https://github.com/zazu-22/band_assist/issues/124) | Band management UI (parent tracking) | ✅ Closed |
| [#127](https://github.com/zazu-22/band_assist/issues/127) | Enhanced band selector with creation flow | ✅ Closed |
| [#141](https://github.com/zazu-22/band_assist/issues/141) | Fix band selection persistence & auto-save race condition | ✅ Closed |
| [#128](https://github.com/zazu-22/band_assist/issues/128) | Band settings/management UI | ✅ Closed |

---

## 🟢 Done (18)

| Spec | Type | Priority | Completed |
|------|------|----------|-----------|
| [feat-user-member-unlinking](completed/feat-user-member-unlinking.md) | Feature | Small | 2025-12-12 |
| [feat-user-member-linking-phase-4-practice-history-design](done/feat-user-member-linking-phase-4-practice-history-design.md) | Feature | Low | 2025-12-10 |
| [feat-user-member-linking-phase-3](done/feat-user-member-linking-phase-3.md) | Feature | High | 2025-12-10 |
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
| [infra-alphatab-1.7-upgrade](backlog/infra-alphatab-1.7-upgrade.md) | Infrastructure | Small | **Phase 0** - [#197](https://github.com/zazu-22/band_assist/issues/197) |
| [feat-song-collaboration-architecture](backlog/feat-song-collaboration-architecture.md) | Architecture | Large | Master plan - [#196](https://github.com/zazu-22/band_assist/issues/196) |
| [infra-test-environment-setup](backlog/infra-test-environment-setup.md) | Infrastructure | Small | Blocks service-layer-testing and ci-test-suite |
| [infra-service-layer-testing](backlog/infra-service-layer-testing.md) | Testing | Medium | Critical path has 0% coverage |

### Medium Priority

| Spec | Type | Effort | Notes |
|------|------|--------|-------|
| [feat-whats-new-changelog-popup](backlog/feat-whats-new-changelog-popup.md) | Feature | Medium | Auto-generated release announcements |
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

| Date | Item | Change |
|------|------|--------|
| 2025-12-12 | feat-user-member-unlinking | 🟢 Moved to completed (PR #207) |
| 2025-12-11 | Milestone #3 "Song Collaboration & Annotations" | ➕ Created |
| 2025-12-11 | [#196](https://github.com/zazu-22/band_assist/issues/196) | ➕ Created epic: Song Collaboration & Annotations Architecture |
| 2025-12-11 | [#197](https://github.com/zazu-22/band_assist/issues/197) | ➕ Created infra: Upgrade AlphaTab to 1.7.1 |
| 2025-12-11 | [#152](https://github.com/zazu-22/band_assist/issues/152) | ✅ Closed (promoted to #197 with spec) |
| 2025-12-11 | [#195](https://github.com/zazu-22/band_assist/issues/195) | ➕ Created (volume control) |
| 2025-12-11 | [#172](https://github.com/zazu-22/band_assist/issues/172) | ✅ Closed (PR #177) |
| 2025-12-11 | [#173](https://github.com/zazu-22/band_assist/issues/173) | ✅ Closed (PR #175) |
| 2025-12-11 | [#178](https://github.com/zazu-22/band_assist/issues/178) | ✅ Closed (PR #179) |
| 2025-12-10 | feat-song-collaboration-architecture | ➕ Added to backlog (master plan: sections, assignments, annotations) |
| 2025-12-10 | infra-alphatab-1.7-upgrade | ➕ Added to backlog (Phase 0 prerequisite for collaboration) |
| 2025-12-10 | feat-whats-new-changelog-popup | ➕ Added to backlog (auto-generated release announcements) |
| 2025-12-10 | feat-user-member-linking-phase-3 | 🟢 Moved to done |
| 2025-12-10 | Milestone #1 "Improve My Songs View", #2 "Improve Schedule Dialogue" | ➕ Created with issues #181-194 |
| 2025-12-10 | feat-user-member-linking-phase-4-practice-history-design | 🟢 Moved to done (merged PR #170) |
| 2025-12-10 | [#121](https://github.com/zazu-22/band_assist/issues/121) Virtualize PracticeHistory | ✅ Closed (merged in PR #167) |
| 2025-12-10 | [#164](https://github.com/zazu-22/band_assist/issues/164) Fix release please action | ✅ Closed (merged in PR #166) |
| 2025-12-09 | [#128](https://github.com/zazu-22/band_assist/issues/128) Band settings/management UI | ✅ Closed (merged in PR #157) |
| 2025-12-09 | [#124](https://github.com/zazu-22/band_assist/issues/124) Band management UI (parent) | ✅ Closed (all child issues complete) |
| 2025-12-09 | [#145](https://github.com/zazu-22/band_assist/issues/145) Practice Session status field | ✅ Closed (merged in PR #155) |
| 2025-12-09 | [#144](https://github.com/zazu-22/band_assist/issues/144) Supabase migrations & types | ✅ Closed |
| 2025-12-09 | Band Management Cluster | ✅ All issues complete (#124, #127, #128, #141) |
| 2025-12-09 | [#164](https://github.com/zazu-22/band_assist/issues/164) Fix release please action | ➕ Created (CI/CD bug) |
| 2025-12-09 | [#154](https://github.com/zazu-22/band_assist/issues/154), [#153](https://github.com/zazu-22/band_assist/issues/153), [#152](https://github.com/zazu-22/band_assist/issues/152) | ➕ Created (dependency management) |
| 2025-12-08 | [#141](https://github.com/zazu-22/band_assist/issues/141) Auto-save race condition | ✅ Fixed (three-layer protection: cancel pending saves, loading guard, band integrity check) |
| 2025-12-08 | PR #139 | ✅ Unblocked (ready for merge) |
| 2025-12-08 | [#127](https://github.com/zazu-22/band_assist/issues/127) Enhanced band selector | ✅ Closed (merged in PR #139) |
| 2025-12-08 | [#125](https://github.com/zazu-22/band_assist/issues/125), [#126](https://github.com/zazu-22/band_assist/issues/126) | ✅ Closed (merged in PR #135) |
| 2025-12-07 | [#107](https://github.com/zazu-22/band_assist/issues/107) Song file naming | ✅ Closed (merged in PR #132) |
| 2025-12-07 | [#100](https://github.com/zazu-22/band_assist/issues/100) Password reset bug | ✅ Closed (merged in PR #130) |
| 2025-12-07 | GitHub Issues | 📋 Added 9 open issues to STATUS.md with dependency graph |
| 2025-12-07 | Proposed Sequence | 📋 Added recommended implementation order |
| 2025-12-07 | feat-user-member-linking-phase-4-practice-history-design | ➕ Added to pending |
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
            ├── feat-user-member-linking-phase-3 ✅
            └── feat-user-member-linking-phase-4-practice-history-design ✅

perf-alphatab-lazy-loading ✅
    └── feat-alphatab-dark-mode-theming (backlog)

infra-test-environment-setup (backlog)
    └── infra-service-layer-testing (backlog)
            └── infra-ci-test-suite (backlog)

#197 infra-alphatab-1.7-upgrade (backlog) ← Phase 0
    └── #196 feat-song-collaboration-architecture (backlog) ← Master Plan
            ├── Phase 1: Song Sections (feat-lead-sheet-generation)
            ├── Phase 2: Section Assignments (new spec needed)
            ├── Phase 3: Annotations (feat-collaborative-song-notes)
            ├── Phase 4: Practice Integration (new spec needed)
            └── Phase 5: AlphaTex Editing (future)
```

### GitHub Issues

```
Milestones:
├── #3 Song Collaboration & Annotations 🆕
│   ├── #196 (epic: architecture) ─── master plan
│   └── #197 (alphatab 1.7 upgrade) ─── phase 0 prerequisite
│
├── #1 Improve 'My Songs' View
│   ├── #184 (epic) ─── parent tracking
│   ├── #186 (practice time per song)
│   ├── #187 (sortable columns)
│   ├── #188 (status badges clarity)
│   ├── #191 (practice priority)
│   ├── #192 (stat cards)
│   ├── #193 (clickable song names)
│   └── #194 (edit menu for status)
│
└── #2 Improve Schedule Dialogue
    ├── #181 (textarea primitive)
    └── #182 (modal dialog)

Completed Clusters:
├── Practice Tracking ✅
│   ├── #100 (password reset bug) ─── ✅ CLOSED
│   ├── #125 (practice edit) ─── ✅ CLOSED
│   ├── #126 (filtering/sort) ─── ✅ CLOSED
│   ├── #145 (status field) ─── ✅ CLOSED
│   └── #121 (virtualization) ─── ✅ CLOSED
│
└── Band Management ✅
    ├── #127 (band selector) ─── ✅ CLOSED
    ├── #141 (auto-save race condition) ─── ✅ CLOSED
    ├── #128 (band settings) ─── ✅ CLOSED
    └── #124 (parent tracking) ─── ✅ CLOSED

Standalone Open Issues:
├── #195 (volume control) ─── small
├── #154 (ESLint upgrade) ─── enhancement
├── #153 (deprecated deps) ─── documentation
├── #142 (weekly dep review) ─── documentation
└── #101 (mobile iOS) ─── large scope
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
| 5 | [#121](https://github.com/zazu-22/band_assist/issues/121) Virtualize table | Issue | ✅ Closed (PR #167) |

### Phase 3: Band Management ✅ COMPLETE

| Order | Item | Type | Rationale |
|-------|------|------|-----------|
| 6 | [#127](https://github.com/zazu-22/band_assist/issues/127) Band selector | Issue | ✅ Closed |
| 6a | [#141](https://github.com/zazu-22/band_assist/issues/141) Fix auto-save race condition | Issue | ✅ Closed |
| 7 | [#128](https://github.com/zazu-22/band_assist/issues/128) Band settings | Issue | ✅ Closed (PR #157) |
| 8 | [#124](https://github.com/zazu-22/band_assist/issues/124) Parent tracking issue | Issue | ✅ Closed |

### Phase 4: User-Member Linking ✅ COMPLETE

| Order | Item | Type | Rationale |
|-------|------|------|-----------|
| 9 | [feat-user-member-linking-phase-1](done/feat-user-member-linking-phase-1.md) | Spec | ✅ Completed 2025-12-05 |
| 10 | [feat-user-member-linking-phase-2](done/feat-user-member-linking-phase-2.md) | Spec | ✅ Completed 2025-12-07 |
| 11 | [feat-user-member-linking-phase-3](done/feat-user-member-linking-phase-3.md) | Spec | ✅ Completed 2025-12-10 |
| 12 | [feat-user-member-unlinking](completed/feat-user-member-unlinking.md) | Feature | Small | 2025-12-12 |
| [feat-user-member-linking-phase-4-practice-history-design](done/feat-user-member-linking-phase-4-practice-history-design.md) | Spec | ✅ Completed 2025-12-10 |

### Phase 5: Larger Efforts

| Order | Item | Type | Rationale |
|-------|------|------|-----------|
| 13 | [#101](https://github.com/zazu-22/band_assist/issues/101) Mobile iOS refactor | Issue | Large scope, device testing needed |

### Parallel Opportunities

These can run concurrently with minimal conflict:

- **#101** (mobile) can run in parallel with other work if resources allow
- **Infrastructure issues** (#154, #153, #152, #142) — independent, can be tackled anytime

> ✅ **Note:** Practice Tracking, Band Management, and User-Member Linking phases are progressing well.

---

*See [README.md](README.md) for full specification format and guidelines.*
