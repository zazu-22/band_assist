# Specification Status Tracker

> Quick reference for all specs, GitHub issues, and current status.
>
> Last updated: 2025-12-21

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
| 🟢 Done | 20 | Completed and merged |
| 🟡 Pending | 0 | Queued for implementation (in sequence order) |
| ⚪ Backlog | 17 | Planned but not yet prioritized |
| 🔵 GitHub Issues | 5 | Tracked in GitHub (bugs, smaller features) |

---

## 🔴 Active Spec

No active spec. Next spec will be selected from backlog.

---

## 🟡 Pending Queue (Sequenced)

No pending specs.

---

## 🔵 GitHub Issues (5 open)

Smaller features, bug fixes, and follow-up work tracked in GitHub rather than full specs.

> **Tip:** Use `gh issue list --state open` locally or visit [GitHub Issues](https://github.com/zazu-22/band_assist/issues)

### Milestone: Song Collaboration & Annotations (#3)

| # | Title | Type | Notes |
|---|-------|------|-------|
| [#196](https://github.com/zazu-22/band_assist/issues/196) | epic: Song Collaboration & Annotations Architecture | Epic | Master plan for sections, assignments, annotations |

### Infrastructure / Dependencies

| # | Title | Effort | Notes |
|---|-------|--------|-------|
| [#154](https://github.com/zazu-22/band_assist/issues/154) | Upgrade to latest stable ESLint version | Medium | Dependency update |
| [#153](https://github.com/zazu-22/band_assist/issues/153) | Identify replacements for deprecated dependencies | Small | Documentation |
| [#142](https://github.com/zazu-22/band_assist/issues/142) | Weekly Dependency Review - 2025-12-08 | Small | Documentation |

### Standalone / Mobile

| # | Title | Effort | Notes |
|---|-------|--------|-------|
| [#101](https://github.com/zazu-22/band_assist/issues/101) | Mobile layout for iOS Safari | Large | Major refactor, needs device testing |

### Milestone: Improve 'My Songs' View (#1) ✅ COMPLETE

| # | Title | Closed | PR |
|---|-------|--------|-----|
| [#184](https://github.com/zazu-22/band_assist/issues/184) | epic: Improve 'My Songs' View | 2025-12-15 | - |
| [#186](https://github.com/zazu-22/band_assist/issues/186) | feat(my-songs): Display total practice time per song | 2025-12-15 | #227 |
| [#187](https://github.com/zazu-22/band_assist/issues/187) | feat(my-songs): add sortable columns and table-based layout | 2025-12-13 | #215 |
| [#188](https://github.com/zazu-22/band_assist/issues/188) | feat(my-songs): Clarify user status vs band status badges | 2025-12-12 | #209 |
| [#191](https://github.com/zazu-22/band_assist/issues/191) | feat(my-songs): add practice priority setting | 2025-12-14 | #220 |
| [#192](https://github.com/zazu-22/band_assist/issues/192) | feat(my-songs): add infographic stat cards | 2025-12-15 | #225, #227 |
| [#193](https://github.com/zazu-22/band_assist/issues/193) | feat(my-songs): ensure song names are clickable links | 2025-12-12 | #210 |
| [#194](https://github.com/zazu-22/band_assist/issues/194) | feat(my-songs): add edit menu for learning status changes | 2025-12-12 | #213 |
| [#222](https://github.com/zazu-22/band_assist/issues/222) | feat(my-songs): add priority column sorting and type improvements | 2025-12-14 | #223 |

### Milestone: Improve Schedule Dialogue (#2) ✅ COMPLETE

| # | Title | Closed | PR |
|---|-------|--------|-----|
| [#181](https://github.com/zazu-22/band_assist/issues/181) | refactor(schedule): use Textarea primitive for notes field | 2025-12-11 | #201 |
| [#182](https://github.com/zazu-22/band_assist/issues/182) | feat(schedule): convert event editor to modal dialog | 2025-12-12 | #205 |

### Recently Closed ✅

| # | Title | Closed | PR |
|---|-------|--------|-----|
| [#197](https://github.com/zazu-22/band_assist/issues/197) | infra: Upgrade AlphaTab to 1.7.1 | 2025-12-12 | #211 |
| [#195](https://github.com/zazu-22/band_assist/issues/195) | Add volume control | 2025-12-11 | #198 |
| [#202](https://github.com/zazu-22/band_assist/issues/202) | Fix critical bug in Team Config | 2025-12-11 | #204 |
| [#200](https://github.com/zazu-22/band_assist/issues/200) | Fix broken audio player (critical) | 2025-12-11 | #203 |
| [#172](https://github.com/zazu-22/band_assist/issues/172) | My Songs design aesthetic refinements | 2025-12-10 | #177 |
| [#173](https://github.com/zazu-22/band_assist/issues/173) | Log Practice Modal UX fixes | 2025-12-10 | #175 |
| [#178](https://github.com/zazu-22/band_assist/issues/178) | Practice modal mobile scroll | 2025-12-10 | #179 |
| [#171](https://github.com/zazu-22/band_assist/issues/171) | Failed to save toast bug | 2025-12-10 | - |

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

## 🟢 Done (20)

| Spec | Type | Priority | Completed |
|------|------|----------|-----------|
| [feat-song-collaboration-architecture](done/feat-song-collaboration-architecture.md) | Architecture | Large | 2025-12-21 |
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
| 2025-12-21 | feat-song-collaboration-architecture | 🟢 Moved to done (PR #246) |
| 2025-12-15 | Milestone #1 "Improve 'My Songs' View" | ✅ All issues complete |
| 2025-12-15 | [#192](https://github.com/zazu-22/band_assist/issues/192) | ✅ Closed (PR #225, #227) |
| 2025-12-15 | [#186](https://github.com/zazu-22/band_assist/issues/186) | ✅ Closed (PR #227) |
| 2025-12-15 | [#184](https://github.com/zazu-22/band_assist/issues/184) | ✅ Closed (epic complete) |
| 2025-12-15 | Release 0.1.18 | ✅ Released |
| 2025-12-14 | [#222](https://github.com/zazu-22/band_assist/issues/222) | ✅ Closed (PR #223) |
| 2025-12-14 | [#191](https://github.com/zazu-22/band_assist/issues/191) | ✅ Closed (PR #220) |
| 2025-12-14 | Release 0.1.17 | ✅ Released |
| 2025-12-13 | [#187](https://github.com/zazu-22/band_assist/issues/187) | ✅ Closed (PR #215) |
| 2025-12-13 | Release 0.1.16 | ✅ Released |
| 2025-12-12 | Milestone #2 "Improve Schedule Dialogue" | ✅ All issues complete |
| 2025-12-12 | [#197](https://github.com/zazu-22/band_assist/issues/197) | ✅ Closed (PR #211) - AlphaTab 1.7.1 upgrade |
| 2025-12-12 | [#194](https://github.com/zazu-22/band_assist/issues/194) | ✅ Closed (PR #213) |
| 2025-12-12 | [#193](https://github.com/zazu-22/band_assist/issues/193) | ✅ Closed (PR #210) |
| 2025-12-12 | [#188](https://github.com/zazu-22/band_assist/issues/188) | ✅ Closed (PR #209) |
| 2025-12-12 | [#182](https://github.com/zazu-22/band_assist/issues/182) | ✅ Closed (PR #205) |
| 2025-12-12 | feat-user-member-unlinking | 🟢 Moved to completed (PR #207) |
| 2025-12-11 | [#195](https://github.com/zazu-22/band_assist/issues/195) | ✅ Closed (PR #198) - volume control |
| 2025-12-11 | [#202](https://github.com/zazu-22/band_assist/issues/202) | ✅ Closed (PR #204) - Team Config bug |
| 2025-12-11 | [#200](https://github.com/zazu-22/band_assist/issues/200) | ✅ Closed (PR #203) - audio player fix |
| 2025-12-11 | [#181](https://github.com/zazu-22/band_assist/issues/181) | ✅ Closed (PR #201) |
| 2025-12-11 | Milestone #3 "Song Collaboration & Annotations" | ➕ Created |
| 2025-12-11 | [#196](https://github.com/zazu-22/band_assist/issues/196) | ➕ Created epic: Song Collaboration & Annotations Architecture |
| 2025-12-11 | [#197](https://github.com/zazu-22/band_assist/issues/197) | ➕ Created infra: Upgrade AlphaTab to 1.7.1 |
| 2025-12-11 | [#152](https://github.com/zazu-22/band_assist/issues/152) | ✅ Closed (promoted to #197 with spec) |
| 2025-12-11 | [#172](https://github.com/zazu-22/band_assist/issues/172) | ✅ Closed (PR #177) |
| 2025-12-11 | [#173](https://github.com/zazu-22/band_assist/issues/173) | ✅ Closed (PR #175) |
| 2025-12-11 | [#178](https://github.com/zazu-22/band_assist/issues/178) | ✅ Closed (PR #179) |
| 2025-12-10 | feat-song-collaboration-architecture | ➕ Added to backlog (master plan: sections, assignments, annotations) |
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

#197 infra-alphatab-1.7-upgrade ✅ (2025-12-12)
    └── #196 feat-song-collaboration-architecture ✅ (2025-12-21)
            ├── Phase 1: Song Sections (feat-lead-sheet-generation)
            ├── Phase 2: Section Assignments (new spec needed)
            ├── Phase 3: Annotations (feat-collaborative-song-notes)
            ├── Phase 4: Practice Integration (new spec needed)
            └── Phase 5: AlphaTex Editing (future)
```

### GitHub Issues

```
Milestones:
├── #3 Song Collaboration & Annotations
│   └── #196 (epic: architecture) ─── ✅ COMPLETED (2025-12-21)
│
├── #1 Improve 'My Songs' View ✅ COMPLETE
│   ├── #184 (epic) ─── ✅ CLOSED 2025-12-15
│   ├── #186 (practice time per song) ─── ✅ CLOSED 2025-12-15
│   ├── #187 (sortable columns) ─── ✅ CLOSED 2025-12-13
│   ├── #188 (status badges clarity) ─── ✅ CLOSED 2025-12-12
│   ├── #191 (practice priority) ─── ✅ CLOSED 2025-12-14
│   ├── #192 (stat cards) ─── ✅ CLOSED 2025-12-15
│   ├── #193 (clickable song names) ─── ✅ CLOSED 2025-12-12
│   ├── #194 (edit menu for status) ─── ✅ CLOSED 2025-12-12
│   └── #222 (priority column sorting) ─── ✅ CLOSED 2025-12-14
│
└── #2 Improve Schedule Dialogue ✅ COMPLETE
    ├── #181 (textarea primitive) ─── ✅ CLOSED 2025-12-11
    └── #182 (modal dialog) ─── ✅ CLOSED 2025-12-12

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
| 12 | [feat-user-member-unlinking](completed/feat-user-member-unlinking.md) | Spec | ✅ Completed 2025-12-12 |
| 13 | [feat-user-member-linking-phase-4-practice-history-design](done/feat-user-member-linking-phase-4-practice-history-design.md) | Spec | ✅ Completed 2025-12-10 |

### Phase 5: My Songs & Schedule Improvements ✅ COMPLETE

| Order | Item | Type | Rationale |
|-------|------|------|-----------|
| 14 | Milestone #1 - Improve 'My Songs' View | Milestone | ✅ All 9 issues closed (2025-12-15) |
| 15 | Milestone #2 - Improve Schedule Dialogue | Milestone | ✅ All 2 issues closed (2025-12-12) |
| 16 | AlphaTab 1.7.1 Upgrade | Issue | ✅ Closed (PR #211, 2025-12-12) |

### Phase 6: Architecture & Next Steps ✅ COMPLETE (Phase 6a)

| Order | Item | Type | Rationale |
|-------|------|------|-----------|
| 17 | [feat-song-collaboration-architecture](done/feat-song-collaboration-architecture.md) | Spec | ✅ Completed 2025-12-21 - Master plan for collaboration features |
| 18 | [#196](https://github.com/zazu-22/band_assist/issues/196) Song Collaboration Epic | Epic | ✅ COMPLETED (2025-12-21) |

### Phase 7: Upcoming

| Order | Item | Type | Rationale |
|-------|------|------|-----------|
| 19 | [#101](https://github.com/zazu-22/band_assist/issues/101) Mobile iOS refactor | Issue | Large scope, device testing needed |

### Parallel Opportunities

These can run concurrently with minimal conflict:

- **#101** (mobile) can run in parallel with other work if resources allow
- **Infrastructure issues** (#154, #153, #142) — independent, can be tackled anytime

> ✅ **Note:** Phases 1-6 are complete! Ready to move to Phase 7.

---

*See [README.md](README.md) for full specification format and guidelines.*
