# CLAUDE.md - Specs Directory

Instructions for managing specifications and GitHub issues.

---

## GitHub Issues vs Specs

We use **two tracking systems** for different scopes of work:

| Use | When | Examples |
|-----|------|----------|
| **GitHub Issues** | Bugs, small features, follow-up work, quick fixes | Password reset bug, UI tweaks, file naming improvements |
| **Spec Files** | Large planned features, multi-phase work, architectural changes | User-member linking (3 phases), design system overhaul |

### When to Check GitHub Issues

**Before creating a new spec**, check if the work is already tracked as a GitHub issue:

```bash
# List open issues
gh issue list --state open

# Search for specific topic
gh issue list --search "practice"

# View issue details
gh issue view 125
```

If an issue exists and is small enough, implement directly from the issue rather than creating a spec.

### GitHub CLI Commands

```bash
# List all open issues
gh issue list --state open

# View issue with full description
gh issue view <number>

# Create new issue
gh issue create --title "Title" --body "Description"

# Close issue when done
gh issue close <number>

# Add comment to issue
gh issue comment <number> --body "Comment text"

# Link PR to issue (auto-closes on merge)
gh pr create --title "fix: description" --body "Fixes #123"
```

### Updating GitHub Issues

Update issues when:
- Starting work → add comment noting you're working on it
- Making progress → add comments with updates
- Blocked → add comment explaining the blocker
- Completing → close with `gh issue close <number>` or via PR

### Issue Labels

| Label | Meaning |
|-------|---------|
| `bug` | Something is broken |
| `enhancement` | New feature or improvement |
| `ui` | User interface related |
| `mobile` | Mobile-specific |

### Promoting an Issue to a Spec

If an issue grows in scope, promote it to a full spec:

1. Create spec file in `backlog/` referencing the issue
2. Add issue link in spec metadata or description
3. Close the issue with comment: "Promoted to spec: `specs/backlog/feat-name.md`"
4. Update STATUS.md accordingly

---

## ⚠️ REQUIRED: Post-Implementation Checklist

**Before marking ANY spec as complete, you MUST complete ALL of these steps:**

- [ ] Move spec file: `mv specs/spec-name.md specs/done/spec-name.md`
- [ ] Update spec metadata: Set `Status: Done`, add `Completed` date
- [ ] Update `specs/STATUS.md` (single source of truth for status):
  - Update counts in "Status Overview"
  - Remove from "Active Spec" section (set next pending as active)
  - Add to "Done" table with completion date
  - Update "Pending Queue" sequence numbers
  - Add entry to "Recent Activity"
- [ ] Commit all documentation changes with the implementation PR

**Note:** `specs/README.md` links to STATUS.md and does not contain duplicated tables.

**Failure to complete these steps will result in documentation drift.**

---

## Directory Structure

```
specs/
├── *.md          # Active spec(s) - currently being implemented
├── pending/      # Queued for implementation (sequenced)
├── backlog/      # Planned but not prioritized
├── done/         # Completed
├── STATUS.md     # Tracking document
└── README.md     # Public index
```

## Spec Lifecycle

```
backlog/ → pending/ → specs/*.md (active) → done/
```

| Location | Status Field | When |
|----------|--------------|------|
| `backlog/` | Backlog | New specs, not yet prioritized |
| `pending/` | Pending | Approved for near-term implementation |
| `specs/*.md` | Active | Currently being implemented |
| `done/` | Done | Implementation complete and merged |

## Spec Metadata Format

Every spec must have this header:

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
```

## Pre-Implementation Steps

Before starting implementation:

1. **Move spec to root**: `mv specs/pending/spec-name.md specs/spec-name.md`
2. **Update spec metadata**: Set `Status` to `Active`, update `Updated` date
3. **Update STATUS.md**:
   - Add spec to "Active Spec" section
   - Remove from "Pending Queue"
   - Add entry to "Recent Activity" table
4. **Commit docs changes** before starting code changes

## Post-Implementation Steps

After implementation is complete and tested:

1. **Move spec to done**: `mv specs/spec-name.md specs/done/spec-name.md`
2. **Update spec metadata**: Set `Status` to `Done`, update `Updated` date
3. **Update STATUS.md**:
   - Remove from "Active Spec" section
   - Add to "Done" table with completion date
   - Update counts in "Status Overview"
   - Add entry to "Recent Activity" table
4. **Commit docs changes** as part of the implementation PR

## Updating STATUS.md

Update STATUS.md when:
- Moving a spec between directories
- Changing a spec's sequence position
- Completing a spec
- Adding a new spec to backlog
- **GitHub issue count changes** (new issues opened, issues closed)
- **Issue dependencies change** (update dependency graph)

Always update:
- Status Overview counts (including GitHub Issues count)
- Relevant section tables
- Recent Activity log
- GitHub Issues section (if issues changed)
- Dependency graph (if dependencies changed)

### Syncing GitHub Issues with STATUS.md

The GitHub Issues section in STATUS.md is a **snapshot** for planning purposes. Keep it updated:

```bash
# Check current open issues
gh issue list --state open

# Update STATUS.md issue count in Status Overview
# Update the GitHub Issues tables if issues were opened/closed
# Update dependency graph if new dependencies identified
```

**When completing a GitHub issue:**
1. Close the issue: `gh issue close <number>` or via PR with "Fixes #123"
2. Remove from STATUS.md GitHub Issues section
3. Update the issue count in Status Overview
4. Add to Recent Activity: `✅ Closed #123 - description`

## Creating New Specs

1. Create file in `backlog/` with naming convention: `{type}-{description}.md`
   - Examples: `feat-dark-mode.md`, `fix-login-bug.md`, `perf-caching.md`
2. Use the metadata format above with `Status: Backlog`
3. Add to STATUS.md backlog section
4. Add to Recent Activity: `➕ Added to backlog`

## Sequencing Pending Specs

The pending queue has a `Seq` column indicating implementation order. When adding to pending:
1. Assign next sequence number
2. Update STATUS.md pending table

## PR Checklist

A PR is not complete until:

- [ ] Pre-implementation docs committed (spec moved to active, STATUS.md updated)
- [ ] Implementation complete and tested
- [ ] Post-implementation docs committed (spec moved to done, STATUS.md updated)

## Quick Reference

| Action | Spec Location | Status Field | STATUS.md Section |
|--------|---------------|--------------|-------------------|
| Create new | `backlog/` | Backlog | Backlog tables |
| Prioritize | `pending/` | Pending | Pending Queue |
| Start work | `specs/*.md` | Active | Active Spec |
| Complete | `done/` | Done | Done table |
