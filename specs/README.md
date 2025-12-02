# Band Assist Specifications

This directory contains feature specifications, bug fixes, and infrastructure improvements for Band Assist.

## Quick Links

| Resource | Purpose |
|----------|---------|
| **[STATUS.md](STATUS.md)** | Current status of all specs (single source of truth) |
| **[CLAUDE.md](CLAUDE.md)** | Instructions for managing specs |
| **[done/](done/)** | Completed specifications |

---

## Directory Structure

```
specs/
├── *.md             # Active spec(s) currently being implemented
├── pending/         # Queued specs in sequence order
├── backlog/         # Planned but not yet prioritized
├── done/            # Completed specifications
├── STATUS.md        # Operational tracker (counts, tables, activity log)
├── CLAUDE.md        # Spec management instructions
└── README.md        # This overview
```

**Workflow:** `backlog/` → `pending/` → `specs/*.md` (active) → `done/`

---

## Current Status

📊 **See [STATUS.md](STATUS.md) for:**
- Active spec being implemented
- Pending queue (sequenced)
- Complete backlog with effort estimates
- Done specs with completion dates
- Recent activity log

---

## Feature Roadmap

High-level planning for major feature directions.

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
Auto-Save Debouncing       --> AlphaTab Lazy Loading ✅  --> Context Splitting
- 70-90% fewer API calls       - 37% smaller bundle           - 80% fewer re-renders
- Better typing responsiveness - 42% faster initial load      - Better edit performance
```

---

## Creating New Specs

### Specification Format

Each spec should include this header:

```markdown
# Title

| Field       | Value                    |
| ----------- | ------------------------ |
| **Status**  | Backlog/Pending/Active/Done |
| **Authors** | Name                     |
| **Created** | YYYY-MM-DD               |
| **Updated** | YYYY-MM-DD               |
| **Priority**| High/Medium/Low          |
| **Type**    | Feature/Bug Fix/Performance/Infrastructure/Cleanup |

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

### Naming Convention

`{type}-{description}.md`

Examples:
- `feat-dark-mode.md`
- `fix-login-bug.md`
- `perf-caching.md`
- `infra-ci-pipeline.md`

---

## Effort Estimates

| Effort | Time Range |
|--------|------------|
| **Small** | 1-3 hours |
| **Medium** | 1-2 days |
| **Large** | 1+ week |

---

*See [STATUS.md](STATUS.md) for current spec status and [CLAUDE.md](CLAUDE.md) for management instructions.*
