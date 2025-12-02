# Band Assist Specifications

This directory contains feature specifications, bug fixes, and infrastructure improvements for Band Assist.

## Directory Structure

```
specs/
├── *.md             # Active spec(s) currently being implemented
├── pending/         # Queued specs in sequence order
├── backlog/         # Planned but not yet prioritized
├── done/            # Completed specifications
├── STATUS.md        # Quick status tracker with sequencing
└── README.md        # This index
```

**Workflow:** Active spec at root -> Pending queue (sequenced) -> Backlog -> Done

---

## Current Focus

### Active Spec

| Spec | Type | Description |
|------|------|-------------|
| [feat-remove-ai-gemini-features](feat-remove-ai-gemini-features.md) | Cleanup | Remove unused AI/Gemini features to simplify codebase |

### Pending Queue (In Sequence Order)

| Seq | Spec | Type | Description |
|-----|------|------|-------------|
| 1 | [perf-auto-save-debouncing](pending/perf-auto-save-debouncing.md) | Performance | Debounce auto-save to reduce API calls |
| 2 | [perf-context-splitting](pending/perf-context-splitting.md) | Performance | Split AppContext to reduce cascade re-renders |
| 3 | [infra-automated-versioning](pending/infra-automated-versioning.md) | Infrastructure | Implement release-please for semantic versioning |
| 4 | [feat-user-member-linking-phase-1](pending/feat-user-member-linking-phase-1.md) | Feature | Foundation for linking user accounts to band members |

---

## Backlog

### High Priority

| Spec | Type | Description |
|------|------|-------------|
| [infra-service-layer-testing](backlog/infra-service-layer-testing.md) | Testing | Add test coverage for critical service layer (0% currently) |

### Medium Priority

| Spec | Type | Description |
|------|------|-------------|
| [feat-user-member-linking-phase-2](backlog/feat-user-member-linking-phase-2.md) | Feature | Personal practice tracking and progress logging |
| [feat-user-member-linking-phase-3](backlog/feat-user-member-linking-phase-3.md) | Feature | Personalized experience ("My Songs", preferences, notes) |
| [feat-collaborative-song-notes](backlog/feat-collaborative-song-notes.md) | Feature | Timestamped comments on song sections |
| [feat-practice-mode-track-presets](backlog/feat-practice-mode-track-presets.md) | Feature | Save practice presets for AlphaTab track configurations |
| [feat-setlist-analytics](backlog/feat-setlist-analytics.md) | Feature | Analyze setlist flow (tempo, energy, key changes) |
| [feat-pre-gig-checklist](backlog/feat-pre-gig-checklist.md) | Feature | Customizable gig preparation checklists |
| [feat-rehearsal-timer-mode](backlog/feat-rehearsal-timer-mode.md) | Feature | Time-boxed practice sessions with countdown |

### Lower Priority

| Spec | Type | Description |
|------|------|-------------|
| [feat-alphatab-dark-mode-theming](backlog/feat-alphatab-dark-mode-theming.md) | Feature | Integrate AlphaTab theming with design system for dark mode support |
| [feat-performance-mode-alphatab-metronome](backlog/feat-performance-mode-alphatab-metronome.md) | Feature | Enable metronome for AlphaTab charts in Performance Mode |
| [feat-performance-mode-pdf-viewer-improvements](backlog/feat-performance-mode-pdf-viewer-improvements.md) | Feature | Improve PDF display in Performance Mode |
| [fix-performance-mode-chart-switch-flicker](backlog/fix-performance-mode-chart-switch-flicker.md) | Bug Fix | Fix UI flicker when switching chart types |
| [infra-ci-test-suite](backlog/infra-ci-test-suite.md) | Infrastructure | Activate and configure CI/CD test suite |
| [infra-unit-testing-practice-mode](backlog/infra-unit-testing-practice-mode.md) | Testing | Unit tests for Practice Mode component |
| [infra-unit-testing-band-dashboard](backlog/infra-unit-testing-band-dashboard.md) | Testing | Unit tests for Band Dashboard component |

---

## Feature Roadmap

### User-Member Linking (Personalization)

The most requested feature direction. Enables personal features by linking Supabase auth users to band members.

```
Phase 1: Foundation          --> Phase 2: Practice Tracking  --> Phase 3: Personalized UX
- user_id on band_members       - practice_sessions table        - "My Songs" dashboard
- "Claim Member" UI             - Personal song status           - Auto-default tracks
- User preferences table        - Practice history view          - Personal notes
```

**Dependencies:** Phase 2 depends on Phase 1. Phase 3 depends on Phase 1 & 2.

### Performance Improvements

Quick wins that improve user experience immediately.

```
Auto-Save Debouncing (2h)  --> AlphaTab Lazy Loading (done) --> Context Splitting (4h)
- 70-90% fewer API calls       - 37% smaller bundle             - 80% fewer re-renders
- Better typing responsiveness - 42% faster initial load        - Better edit performance
```

---

## Completed Work

See [done/](done/) for completed specifications. Recent completions:

| Spec | Type | Completed |
|------|------|-----------|
| [AlphaTab Lazy Loading](done/perf-alphatab-lazy-loading.md) | Performance | Dec 2024 |
| Design System Phase 4 | Feature | Dec 2024 |
| Design System Phase 3 | Feature | Dec 2024 |
| Practice Room Unified Control Bar | Feature | Dec 2024 |
| AlphaTab Modernization | Infrastructure | Dec 2024 |
| iOS AlphaTab Audio Fix | Bug Fix | Dec 2024 |

---

## Specification Format

Each spec should include:

```markdown
# Title

| Field | Value |
| ----- | ----- |
| **Status** | Active / Pending / Backlog / Done |
| **Priority** | High / Medium / Low |
| **Type** | Feature / Bug Fix / Performance / Infrastructure |
| **Created** | YYYY-MM-DD |

---

## Summary
[2-3 sentences]

## Problem
[What's wrong or missing]

## Proposed Solution
[How to fix it]

## Files Likely Affected
[List of files]

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2
```

---

## Effort Estimates

| Effort | Time Range |
|--------|------------|
| **Small** | 1-3 hours |
| **Medium** | 1-2 days |
| **Large** | 1+ week |

---

*See [STATUS.md](STATUS.md) for detailed tracking and sequencing.*

*Last updated: 2025-12-02*
