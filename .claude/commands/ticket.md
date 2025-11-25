# Execute Task: $ARGUMENTS

Execute the task specified in **$ARGUMENTS**, which may be a ticket, implementation project, or other documented work item.

## Step 1: Locate and Read the Task Document

Find the task document matching `$ARGUMENTS`:

```text
docs/ai_docs/$ARGUMENTS*.md
```

If no exact match is found, search for partial matches or ask the user for clarification.

**Read the document completely** to understand:

- The goal or objective
- Current state (if applicable)
- Implementation steps or instructions
- Testing requirements (if specified)
- Any dependencies or prerequisites

## Step 2: Gather Context

1. **Read `CLAUDE.md`** for architectural patterns, code conventions, and project-specific guidance
2. **Read files mentioned** in the task document (e.g., "Files to Modify", "Current State", or referenced components)
3. **Explore related code** if the task document references areas you need to understand

The task document should contain implementation-specific details. CLAUDE.md contains project-wide patterns and conventions.

## Step 3: Execute the Task

Follow the task document's instructions. General workflow:

1. Review existing code before modifying it
2. Follow implementation steps sequentially (if provided)
3. Make incremental changes
4. Test as you go
5. Verify behavior matches expectations

**If the task lacks detailed steps**: Use your judgment based on the stated goal and CLAUDE.md guidance. Ask the user if you're uncertain about approach.

## Step 4: Testing

Complete any testing specified in the task document. General verification:

- [ ] Implementation meets the stated objective
- [ ] No console errors or warnings introduced
- [ ] Existing functionality still works (no regressions)
- [ ] Code follows project conventions (see CLAUDE.md)

## Step 5: Update the Task Document

After completing the work, update the task document:

**Update status** (if a status field exists):

```markdown
**Status**: COMPLETE
```

Or if partially complete:

```markdown
**Status**: IN PROGRESS
```

**Add completion notes** (if not already present):

```markdown
## Completion Notes

**Date**: YYYY-MM-DD

**Changes Made**:
- <file_path>:<line_range> - <description>

**Testing Results**:
- <summary of verification>

**Notes**:
- <any deviations, findings, or follow-up considerations>
```

## Step 6: Commit Changes

Create a commit using conventional commit format:

```text
<type>(<scope>): <short description>

<detailed description of changes>

Testing:
- <test category>: PASS

Implements: docs/ai_docs/<task-file>.md
```

**Types**: `feat`, `fix`, `style`, `refactor`, `perf`, `docs`, `test`, `chore`

**Scope**: Use a relevant area of the codebase (e.g., component name, feature area)

## Step 7: Report Results

Provide the user with:

1. **Summary**: What was accomplished
2. **Files Modified**: List with line number references
3. **Testing**: Verification summary
4. **Next Steps**: Follow-up work or recommendations (if any)

---

## Guidelines

- **Follow the task document** — It contains the specific instructions for this work
- **Consult CLAUDE.md** — For project patterns, conventions, and architectural guidance
- **Ask questions** — If the task is unclear or you encounter blockers
- **Update documentation** — If changes affect CLAUDE.md or other docs
- **Don't skip testing** — Verify your changes work as expected

---

**Ready to execute: $ARGUMENTS**
