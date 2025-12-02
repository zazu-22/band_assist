# Feature: Performance Mode PDF Viewer Improvements

Created: 2025-12-02
Status: Backlog

## Summary

The PDF viewer in Performance Mode has several UX issues that reduce its effectiveness for stage use.

## Problems

### 1. Redundant "Next Up" Header
- Large header with song title and key info sits above PDF viewport
- Duplicates information already shown in the main toolbar
- Takes up valuable vertical space needed for chart viewing

### 2. Auto-Scroll Not Working
- Auto-scroll toggle exists in toolbar but has no effect on PDF charts
- PDF uses native iframe rendering which doesn't respond to scroll controls
- Creates inconsistent experience between PDF and text charts

### 3. Distracting Native PDF Toolbar
- Browser's native PDF toolbar is always visible (pages, zoom, download, print)
- Distracts from chart content during performance
- Should be hidden by default with hover-to-reveal interaction

## Proposed Solutions

1. **Remove redundant header** for PDF charts (keep for text charts where it adds value)
2. **Implement custom PDF rendering** using pdf.js or similar to enable:
   - Programmatic scroll control
   - Auto-scroll functionality
   - Hidden native toolbar
3. **Add hover interaction** to show PDF controls when needed

## Files Likely Affected

- `src/components/PerformanceMode.tsx`
- Possibly new PDF renderer component

## Dependencies

- May require pdf.js or react-pdf library

## Acceptance Criteria

- [ ] PDF charts don't show redundant "Next Up" header
- [ ] Auto-scroll works for PDF charts
- [ ] Native PDF toolbar hidden by default
- [ ] PDF controls accessible via hover or dedicated UI
