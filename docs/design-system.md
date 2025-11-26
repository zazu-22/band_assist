# Band Assist Design System

This document captures the design philosophy, patterns, and guidelines established during the "Backstage Command Center" dashboard redesign. Use this as a reference when extending the design across other parts of the application.

## Design Philosophy

### Core Principles

1. **Backstage Warmth**: The app serves musicians preparing for performances. The aesthetic should feel like a well-organized backstage area—warm, professional, and focused on the task at hand.

2. **Information Hierarchy**: Lead with what matters most. Use visual weight (typography, color, spacing) to guide the eye to actionable information.

3. **Reduce Cognitive Load**: Consolidate related information rather than scattering it across multiple cards. Fewer, richer components beat many sparse ones.

4. **Encourage Action**: The UI should make it obvious what to do next. Primary actions should be prominent; secondary actions should be discoverable but not distracting.

5. **Consistent Status Communication**: Use the same visual language for status across all contexts—colors, badges, and progress indicators should mean the same thing everywhere.

## Typography

### Font Families

| Font | CSS Class | Usage |
|------|-----------|-------|
| **Brawler** (Serif) | `font-serif` | Headlines, section titles, emotional emphasis |
| **Barlow** (Sans-serif) | `font-sans` (default) | Body text, labels, UI elements |
| **JetBrains Mono** | `font-mono` | Numbers, countdowns, technical data |

### Typography Patterns

```tsx
// Page headline (e.g., "Band Overview")
<h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">

// Section title (e.g., "Band Readiness", "Practice Queue")
<h3 className="text-lg font-serif text-foreground">

// Stat/metric display
<span className="text-3xl font-bold font-mono text-foreground tabular-nums">

// Label/caption
<span className="text-xs text-muted-foreground uppercase tracking-wide">

// Subtle secondary text
<span className="text-sm text-muted-foreground">
```

## Color System

### Status Colors

These colors communicate song learning status consistently across the app:

| Status | CSS Variable | Background | Usage |
|--------|--------------|------------|-------|
| **Stage Ready** | `--success` | `bg-success` | Green - mastered songs ready to perform |
| **In Progress** | `--info` | `bg-info` | Blue - songs currently being learned |
| **To Learn** | `--warning` | `bg-warning` | Amber/Gold - songs not yet started |

### Semantic Colors

| Purpose | CSS Variable | Usage |
|---------|--------------|-------|
| Primary | `--primary` | Brand color (amber/gold), primary buttons, active states |
| Destructive | `--destructive` | Errors, overdue items, critical warnings |
| Muted | `--muted-foreground` | Secondary text, disabled states, subtle UI |

### Color Application Examples

```tsx
// Progress bar segments
<div className="bg-success" />  // Ready songs
<div className="bg-info" />     // In Progress songs
<div className="bg-warning" />  // To Learn songs

// Status indicators
<span className="text-destructive">Overdue</span>
<span className="text-warning">Due in 1d</span>

// Subtle backgrounds for warnings/success states
<div className="bg-warning/10">  // 10% opacity warning background
<div className="bg-success/10">  // 10% opacity success background
```

## Animation Patterns

### Entrance Animations

Use staggered reveals for groups of elements appearing together:

```css
/* Stagger delays for orchestrated reveals */
.stagger-1 { animation-delay: 50ms; }
.stagger-2 { animation-delay: 100ms; }
.stagger-3 { animation-delay: 150ms; }
.stagger-4 { animation-delay: 200ms; }
.stagger-5 { animation-delay: 250ms; }

/* Apply with slide-in animation */
.animate-slide-in-from-bottom.fill-forwards.opacity-0.stagger-1
```

### Progress Animations

```css
/* Progress bar fill */
@keyframes progress-fill {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.animate-progress-fill {
  animation: progress-fill 800ms ease-out forwards;
  transform-origin: left;
}
```

### Highlight Animations

```css
/* Pulse glow for countdown badges */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 15px oklch(0.7686 0.1647 70.0804 / 0.3);
  }
  50% {
    box-shadow: 0 0 25px oklch(0.7686 0.1647 70.0804 / 0.5);
  }
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

## Component Patterns

### Card Headers

Consistent header pattern for cards with actions:

```tsx
<CardHeader className="py-2.5 px-4">
  <div className="flex items-center justify-between">
    <h3 className="text-lg font-serif text-foreground">Section Title</h3>
    <Button variant="ghost" size="sm" className="h-7 text-xs">
      Action
    </Button>
  </div>
</CardHeader>
```

### Stat Display

Pattern for displaying metrics with context:

```tsx
<div className="flex items-start justify-between">
  <div>
    <h3 className="text-lg font-serif text-foreground">Metric Name</h3>
    <p className="text-sm text-muted-foreground">Supporting context</p>
  </div>
  <div className="text-right">
    <span className="text-3xl font-bold font-mono tabular-nums">
      42<span className="text-sm text-muted-foreground">%</span>
    </span>
    <p className="text-xs text-muted-foreground">unit label</p>
  </div>
</div>
```

### List Items with Actions

Pattern for actionable list rows:

```tsx
<div className="flex items-center gap-4 px-4 py-2.5 border-l-[3px] border-l-primary/60 hover:bg-muted/30 transition-colors">
  {/* Left: Primary content + secondary action */}
  <div className="flex-1 min-w-0 flex items-center gap-2">
    <p className="font-semibold text-foreground truncate text-sm">
      Item Title
    </p>
    <button className="text-[11px] text-muted-foreground/60 hover:text-primary">
      Edit <ArrowRight size={10} />
    </button>
  </div>

  {/* Right: Status + primary action */}
  <div className="flex items-center gap-2 shrink-0">
    <StatusBadge status={status} />
    <Button size="sm" className="h-7 px-2.5 text-xs">
      Action
    </Button>
  </div>
</div>
```

### Tooltips

Subtle, informative tooltips:

```tsx
<TooltipProvider delayDuration={100}>
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="cursor-help">Hover target</span>
    </TooltipTrigger>
    <TooltipContent>
      <p>Helpful explanation text</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

Tooltip styling (in `primitives/tooltip.tsx`):
- Background: `bg-popover/95 backdrop-blur-sm`
- Border: `border border-border/50`
- Shadow: `shadow-md`
- Animation: `fade-in-50 duration-200`

## Layout Principles

### Grid Patterns

```tsx
// Two cards side-by-side (2:1 ratio)
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  <Card className="lg:col-span-2">Primary content</Card>
  <Card>Secondary content</Card>
</div>

// Full-width section
<Card className="overflow-hidden">
  Full-width content
</Card>
```

### Spacing

- Page padding: `p-4 sm:p-6 lg:p-10`
- Section spacing: `space-y-8`
- Card content padding: `p-5` (standard), `p-4` (compact)
- List item padding: `px-4 py-2.5`
- Gap between cards: `gap-4` or `gap-6`

## Interactive States

### Hover States

```tsx
// Subtle background on hover
className="hover:bg-muted/30 transition-colors"

// Text color change on hover
className="text-muted-foreground/60 hover:text-primary transition-colors"

// Group hover for child elements
<button className="group">
  <ArrowRight className="text-muted-foreground group-hover:text-foreground transition-colors" />
</button>
```

### Focus States

Rely on the theme's ring utilities for focus indication:
```tsx
className="focus-visible:ring-2 focus-visible:ring-ring"
```

## Accessibility

- Use semantic HTML (`<header>`, `<nav>`, `<main>`, `<button>`)
- Provide `aria-label` for icon-only buttons
- Use `aria-hidden="true"` for decorative elements
- Ensure color is not the only indicator of status (use icons/text alongside)
- Support `prefers-reduced-motion` media query (defined in `index.css`)

## Future Considerations

When extending this design system to other pages:

1. **Practice Room**: Apply the same card patterns, use progress indicators for session tracking
2. **Setlist Builder**: Use list item patterns, consider drag handle styling
3. **Schedule**: Timeline patterns from Coming Up, calendar integration
4. **Settings**: Form patterns with consistent spacing and typography

---

*Last updated: November 2024*
*Reference implementation: `src/components/Dashboard.tsx`*
