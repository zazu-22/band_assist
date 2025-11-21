# Execute Band Assist Ticket: $ARGUMENTS

You are working on implementing features and fixes for the **Band Assist** project, a browser-based React SPA for band management.

## Your Task

Execute ticket **$ARGUMENTS** following the implementation plan documented in the ticket file.

## Key Documentation

**Read these files in order**:

1. **Ticket file** (your primary instructions):
   ```text
   docs/ai_docs/$ARGUMENTS*.md
   ```

2. **Project documentation** (for architectural context):
   ```text
   CLAUDE.md
   ```

3. **Related component files** (identified in the ticket's "Files to Modify" or "Current State" sections)

## Execution Guidelines

### Before You Start

- [ ] Read the ticket file completely
- [ ] Understand the current state and technical context
- [ ] Review the implementation plan steps
- [ ] Identify all files that will be modified
- [ ] Check the ticket's dependencies (if any prerequisite work is mentioned)

### Implementation Steps

Follow the ticket's **Implementation Plan** section exactly. Typical workflow:

1. Review the current implementation (if modifying existing code)
2. Follow each step in the plan sequentially
3. Make incremental changes following the step-by-step instructions
4. Test each change before moving to the next step
5. Verify the implementation matches the expected behavior

### Testing Requirements

**Minimum tests** (from ticket's Testing Plan section):

- [ ] All items in the ticket's testing checklist pass
- [ ] Visual inspection confirms expected UI/UX changes
- [ ] No console errors or warnings
- [ ] Cross-browser compatibility (if applicable)
- [ ] Performance is acceptable (no lag or degradation)

**Component-specific testing**:

- For AlphaTab changes: Test in Practice Room, Song Detail, and Performance Mode
- For state changes: Verify localStorage persistence and data integrity
- For UI changes: Test responsive behavior at different screen sizes
- For AI features: Test with and without API key configured

## After Completion

### 1. Update Ticket Status

**File**: `docs/ai_docs/$ARGUMENTS*.md` (the ticket you just completed)

**Step 1**: Verify all implementation tasks are complete

Review the Implementation Plan checklist and ensure every step was executed successfully.

**Step 2**: Update ticket metadata

Change the Status field at the top of the file:

```markdown
**Status**: COMPLETE
```

If partially complete or blocked:

```markdown
**Status**: IN PROGRESS
```

or

```markdown
**Status**: BLOCKED - <reason>
```

**Step 3**: Add completion notes

If the ticket doesn't have a **Completion Notes** or **Implementation Notes** section at the end, add one:

```markdown
## Completion Notes

**Implemented**: YYYY-MM-DD
**Testing Results**: <summary of test results>
**Changes Made**:
- <file_path>:<line_range> - <description of changes>
- <file_path>:<line_range> - <description of changes>

**Verification**:
- All testing checklist items pass
- No console errors
- <any specific metrics or measurements>

**Notes**:
- <any notable findings, deviations from plan, or future considerations>
```

### 2. Document Results

**In your final response to the user**, provide:

1. **Summary**: What was implemented (feature/fix description)
2. **Files Modified**: List of changed files with line number references
3. **Testing**: Summary of test results showing success
4. **Visual Changes**: Screenshots or descriptions of UI/UX changes (if applicable)
5. **Next Steps**: Recommendations for related work or follow-up tickets

### 3. Commit Changes

Create a commit with this format:

```text
<type>(<scope>): <ticket-id> - <short description>

<detailed description of changes>

Testing:
- <test category>: PASS
- <test category>: PASS

Implements: docs/ai_docs/$ARGUMENTS*.md
```

**Commit type options**:
- `feat`: New feature or enhancement
- `fix`: Bug fix
- `style`: Visual/CSS changes
- `refactor`: Code restructuring without behavior change
- `perf`: Performance improvement
- `docs`: Documentation only
- `test`: Test additions or modifications

**Scope options**:
- `alphatab`: AlphaTab player/renderer
- `ui`: General UI components
- `state`: State management
- `ai`: Gemini AI integration
- `storage`: Data persistence
- `perf`: Performance mode
- `practice`: Practice room

**Example commit**:

```text
feat(alphatab): T-001 - Add transport controls and visual feedback

- Implement stop button with api.stop()
- Add progress bar with click-to-seek functionality
- Add section loop with Shift+Click selection
- Add visual metronome with beat indicators
- Register playerPositionChanged, playerFinished, beatMouseDown events
- Add CSS styling for cursor highlighting and loop selection

Testing:
- Transport controls: PASS
- Visual feedback: PASS
- Event handlers: PASS
- Integration (Practice Room, Song Detail, Performance Mode): PASS

Implements: docs/ai_docs/T-001-alphatab-player-enhancements.md
```

## Important Notes

- **Do not skip testing** — Each ticket has specific verification steps that must be completed
- **Follow the plan exactly** — The implementation plan is detailed for a reason; don't deviate without good cause
- **Check for side effects** — Changes to shared components (AlphaTabRenderer, App.tsx) affect multiple views
- **Verify localStorage** — Many changes persist data; test save/load cycles
- **Ask questions** — If the ticket is unclear, has missing information, or you encounter blockers, ask the user before proceeding
- **Maintain code style** — Follow existing patterns in the codebase (see CLAUDE.md)
- **Update documentation** — If the change affects CLAUDE.md or other docs, update them

## Common Patterns in Band Assist

### State Updates

Always use callback props from App.tsx:
- `onUpdateSong(updatedSong)` - For song modifications
- `setSongs(newSongs)` - For bulk song operations
- `setMembers(newMembers)` - For band roster updates
- Never mutate state directly; always create new objects/arrays

### File Uploads

All files are converted to Base64 data URIs:
```typescript
const dataUri = `data:${mimeType};base64,${base64String}`;
```

### AlphaTab API Usage

Always check for API availability:
```typescript
if (apiRef.current) {
  apiRef.current.methodName();
}
```

Always check if mounted in event handlers:
```typescript
api.eventName.on((e: any) => {
  if (!isMounted) return;
  // Handle event
});
```

### Component Props

Read-only mode pattern for viewers:
```typescript
readOnly?: boolean;  // Disables interactive features
```

### Error Handling

Check for API key in AI features:
```typescript
if (!process.env.API_KEY) {
  return "Error: API key not configured";
}
```

## Debugging Tips

If something doesn't work:

1. **Check browser console** - AlphaTab logs with `[AlphaTab]` prefix
2. **Verify AlphaTab loaded** - Check `window.alphaTab` is defined
3. **Check localStorage quota** - Large files can exceed limits
4. **Test in isolation** - Use Practice Room for player testing
5. **Check event handlers** - Add console.logs to verify events fire
6. **Verify file format** - Ensure Base64 data URIs are properly formatted

## Known Project Limitations

- AlphaTab loads from CDN (external dependency)
- localStorage has size limits (~5-10MB depending on browser)
- Large files (audio, PDFs, GP files) can cause quota issues
- AI features require GEMINI_API_KEY environment variable
- No backend - all data is client-side

## Resources

- **AlphaTab Documentation**: https://alphatab.net/docs
- **React 19 Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **Lucide Icons**: https://lucide.dev/icons
- **TypeScript Handbook**: https://www.typescriptlang.org/docs

---

**Ready to implement ticket $ARGUMENTS!**
