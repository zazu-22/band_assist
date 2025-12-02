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

| Font                    | CSS Class             | Usage                                         |
| ----------------------- | --------------------- | --------------------------------------------- |
| **Brawler** (Serif)     | `font-serif`          | Headlines, section titles, emotional emphasis |
| **Barlow** (Sans-serif) | `font-sans` (default) | Body text, labels, UI elements                |
| **JetBrains Mono**      | `font-mono`           | Numbers, countdowns, technical data           |

### Typography Patterns

```tsx
// Page headline (e.g., "Band Overview")
<h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">

// Section title (e.g., "Band Readiness", "Practice Queue")
<h3 className="text-lg font-bold font-serif text-foreground">

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

| Status          | CSS Variable | Background   | Usage                                   |
| --------------- | ------------ | ------------ | --------------------------------------- |
| **Stage Ready** | `--success`  | `bg-success` | Green - mastered songs ready to perform |
| **In Progress** | `--info`     | `bg-info`    | Blue - songs currently being learned    |
| **To Learn**    | `--warning`  | `bg-warning` | Amber/Gold - songs not yet started      |

### Semantic Colors

| Purpose     | CSS Variable         | Usage                                                    |
| ----------- | -------------------- | -------------------------------------------------------- |
| Primary     | `--primary`          | Brand color (amber/gold), primary buttons, active states |
| Destructive | `--destructive`      | Errors, overdue items, critical warnings                 |
| Muted       | `--muted-foreground` | Secondary text, disabled states, subtle UI               |

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

/* Animation fill mode - maintains final state after animation completes */
.animation-forwards { animation-fill-mode: forwards; }

/* Apply with slide-in animation */
.animate-slide-in-from-bottom.animation-forwards.opacity-0.stagger-1
```

### Animation Delay Guidelines

Choose the appropriate technique based on the number of elements:

| Scenario | Technique | Example |
| --- | --- | --- |
| Fixed-count elements (≤5 items) | `.stagger-1` through `.stagger-5` classes | Tab panels, stat cards |
| Dynamic lists (unknown count) | Inline `style={{ animationDelay: \`${index * 75}ms\` }}` | Member grids, song lists |

```tsx
// Fixed elements - use stagger classes
<Card className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-1">
<Card className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-2">

// Dynamic lists - use inline delay
{items.map((item, index) => (
  <Card
    key={item.id}
    className="animate-slide-in-from-bottom animation-forwards opacity-0"
    style={{ animationDelay: `${index * 75}ms` }}
  >
))}
```

### Progress Animations

```css
/* Progress bar fill */
@keyframes progress-fill {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
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
  0%,
  100% {
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
    <h3 className="text-lg font-bold font-serif text-foreground">Section Title</h3>
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
    <h3 className="text-lg font-bold font-serif text-foreground">Metric Name</h3>
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
    <p className="font-semibold text-foreground truncate text-sm">Item Title</p>
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

> **Note**: The tooltip primitive has been modified from shadcn/ui defaults to apply
> this styling globally. This is an approved design system decision to ensure visual
> consistency across all tooltips in the application. Per project guidelines, this
> modification is documented here as an exception to the "do not modify primitives" rule.

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
className = 'focus-visible:ring-2 focus-visible:ring-ring';
```

## Accessibility

- Use semantic HTML (`<header>`, `<nav>`, `<main>`, `<button>`)
- Provide `aria-label` for icon-only buttons
- Use `aria-hidden="true"` for decorative elements
- Ensure color is not the only indicator of status (use icons/text alongside)
- Support `prefers-reduced-motion` media query (defined in `index.css`)

## Song Editor Patterns

The Song Detail page (`/songs/:songId`) uses specific patterns for editing song metadata, managing charts, and handling audio.

### Tab Navigation

Horizontal tabs with primary underline indicator:

```tsx
<div className="flex gap-1 border-b border-border">
  {['OVERVIEW', 'CHARTS', 'ASSIGNMENTS', 'AUDIO'].map(tab => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={cn(
        'relative px-4 py-2 text-sm font-bold transition-colors',
        activeTab === tab
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {tab}
      {activeTab === tab && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}
    </button>
  ))}
</div>
```

### Metadata Display Cards

Grid-based metadata display with labeled values:

```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="bg-muted/30 p-3 rounded-lg border border-border">
    <span className="text-xs text-muted-foreground uppercase tracking-wide">
      BPM
    </span>
    <p className="text-xl font-mono tabular-nums text-foreground">
      {song.bpm}
    </p>
  </div>
</div>
```

## Chart Upload/Management

### Chart Selector Bar

Horizontal scrolling chart selector with active state:

```tsx
<div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
  {charts.map(chart => (
    <button
      key={chart.id}
      onClick={() => setActiveChartId(chart.id)}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors',
        activeChartId === chart.id
          ? 'bg-primary text-primary-foreground'
          : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-border'
      )}
    >
      <ChartIcon size={14} />
      {chart.name}
    </button>
  ))}
</div>
```

### Chart Type Icons

Consistent icon mapping for chart types:

| Chart Type | Icon         | Import from `lucide-react` |
| ---------- | ------------ | -------------------------- |
| GP         | `Guitar`     | Guitar Pro files           |
| PDF        | `FileText`   | PDF documents              |
| IMAGE      | `File`       | Image files                |
| TEXT       | `Music2`     | Text-based chord charts    |

### Download/External Link Buttons

File action buttons use ghost variant:

```tsx
<Button
  variant="ghost"
  size="icon"
  className="bg-card/80 backdrop-blur-sm hover:bg-muted"
  title="Download Original"
>
  <Download size={16} />
</Button>

<Button
  variant="ghost"
  size="icon"
  asChild
  className="bg-card/80 backdrop-blur-sm hover:bg-muted"
  title="Open in New Tab"
>
  <a href={url} target="_blank" rel="noreferrer">
    <ExternalLink size={16} />
  </a>
</Button>
```

## Part Assignment Section

### Member Assignment Cards

Cards showing band member assignments with role badges:

```tsx
<Card>
  <div className="p-3 bg-muted/30 flex items-center gap-3">
    <Avatar>
      <AvatarFallback className={member.avatarColor}>
        {member.name.charAt(0)}
      </AvatarFallback>
    </Avatar>
    <span className="font-medium text-foreground">{member.name}</span>
  </div>
  <CardContent className="pt-3">
    <span className="text-xs text-muted-foreground uppercase tracking-wide">
      Roles
    </span>
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {memberRoles.map(role => (
        <Badge key={role} variant="secondary" className="group">
          {role}
          <button className="ml-1 opacity-0 group-hover:opacity-100">
            <X size={12} />
          </button>
        </Badge>
      ))}
    </div>
  </CardContent>
</Card>
```

### Assignment Grid Layout

Responsive grid for member cards:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {members.map(member => (
    <MemberCard key={member.id} member={member} />
  ))}
</div>
```

## Audio Upload Section

### Upload Zone

Dashed border drop zone pattern:

```tsx
<div
  className={cn(
    'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
    isDragging
      ? 'border-primary/50 bg-primary/5'
      : 'border-border hover:border-primary/30'
  )}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
>
  <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
  <p className="text-muted-foreground mb-2">
    Drag and drop your audio file here
  </p>
  <Button variant="outline">Select Audio File</Button>
</div>
```

### Audio Player Card

When track is present, display player in Card:

```tsx
<Card>
  <CardContent className="p-4">
    <audio
      ref={audioRef}
      src={trackUrl}
      controls
      className="w-full"
    />
    <div className="flex gap-2 mt-3">
      <Button variant="ghost" size="sm">
        <Download size={12} /> Download Track
      </Button>
      <Button variant="ghost" size="sm" className="text-destructive">
        <Trash2 size={12} /> Remove Track
      </Button>
    </div>
  </CardContent>
</Card>
```

## Component Compliance

All major components have been audited for design system compliance:

| Component       | Serif Headlines | Ambient Glow   | Animations | List Accents | Monospace Numbers |
| --------------- | --------------- | -------------- | ---------- | ------------ | ----------------- |
| Dashboard       | ✓               | ✓ (top-left)   | ✓          | ✓            | ✓                 |
| PracticeRoom    | N/A (control bar) | N/A          | ✓          | ✓            | ✓                 |
| SetlistManager  | ✓               | ✓ (top-left)   | ✓          | ✓            | ✓                 |
| ScheduleManager | ✓               | ✓ (top-right)  | ✓          | Timeline     | ✓                 |
| BandDashboard   | ✓               | ✓ (top-left)   | ✓          | ✓            | ✓                 |
| Settings        | ✓               | N/A            | ✓          | ✓            | N/A               |
| SongDetail      | ✓ (text-3xl)    | N/A            | ✓          | ✓            | ✓                 |
| PerformanceMode | ✓               | N/A            | N/A        | N/A          | ✓                 |

**Notes:**

- **PracticeRoom**: Uses control bar pattern instead of traditional headline
- **ScheduleManager**: Uses timeline pattern with vertical border (intentional variation)
- **SongDetail**: Uses `text-3xl` headline due to layout constraints
- **PerformanceMode**: No animations (intentional for instant render during live performance)

## Ambient Glow Pattern

Pages with ambient glow use this consistent pattern:

```tsx
<div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
  <div
    className="absolute -top-1/4 -{position}-1/4 w-1/2 h-1/2 rounded-full opacity-[0.03]"
    style={{
      background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
    }}
  />
</div>
```

| Page            | Position    |
| --------------- | ----------- |
| Dashboard       | `-left-1/4` |
| SetlistManager  | `-left-1/4` |
| ScheduleManager | `-right-1/4`|
| BandDashboard   | `-left-1/4` |

## Numeric Display Pattern

All numeric values use monospace tabular figures for consistent width and layout stability:

```tsx
<span className="font-mono tabular-nums">{count}</span>
```

This pattern is applied to:

- Countdowns and timers
- BPM displays
- Statistics and percentages
- Dates and time displays
- Scroll speed indicators

## List Item Accent Pattern

List items use a left border accent for visual hierarchy:

```tsx
// Default state
className="border-l-[3px] border-l-primary/60"

// Selected state
className={cn(
  'border-l-[3px]',
  isSelected ? 'border-l-primary' : 'border-l-primary/60'
)}
```

**Exception**: ScheduleManager uses a vertical timeline pattern with dots instead of the standard left-border accent.

## Animation Timing Reference

| Animation Class               | Duration | Easing   |
| ----------------------------- | -------- | -------- |
| animate-fade-in               | 200ms    | ease-out |
| animate-slide-in-from-bottom  | 300ms    | ease-out |
| animate-slide-in-from-left    | 200ms    | ease-out |
| animate-slide-in-from-top     | 300ms    | ease-out |
| animate-scale-in              | 200ms    | ease-out |
| transition-colors             | 150ms    | default  |

## Future Considerations

When extending this design system to other pages:

1. **Practice Room**: Apply the same card patterns, use progress indicators for session tracking
2. **Setlist Builder**: Use list item patterns, consider drag handle styling
3. **Schedule**: Timeline patterns from Coming Up, calendar integration
4. **Settings**: Form patterns with consistent spacing and typography

---

_Last updated: December 2024 (Phase 4 updates)_
_Reference implementation: `src/components/Dashboard.tsx`, `src/components/SongDetail.tsx`_
