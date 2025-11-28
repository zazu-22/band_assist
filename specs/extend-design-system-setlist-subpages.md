# Spec: Extend Design System to SetlistManager Subpages

## Overview

This specification extends the Band Assist design system (`docs/design-system.md`) to cover the SetlistManager subpages: **Song Editor**, **Chart Upload/Management**, **Part Assignment**, and **Music Upload**. The goal is to ensure visual consistency across all song-related interfaces while maintaining the "Backstage Warmth" aesthetic established in the dashboard redesign.

## Current State Assessment

### SetlistManager Components (Well-Aligned)

The `SetlistManager.tsx` and its sub-components (`SetlistHeader`, `SetlistStats`, `SetlistItem`, `SetlistActionBar`, `AddSongForm`) are **exemplary implementations** of the design system:

| Component        | File                                          | Status     |
| ---------------- | --------------------------------------------- | ---------- |
| SetlistHeader    | `src/components/setlist/SetlistHeader.tsx`    | ✅ Aligned |
| SetlistStats     | `src/components/setlist/SetlistStats.tsx`     | ✅ Aligned |
| SetlistItem      | `src/components/setlist/SetlistItem.tsx`      | ✅ Aligned |
| SetlistActionBar | `src/components/setlist/SetlistActionBar.tsx` | ✅ Aligned |
| AddSongForm      | `src/components/setlist/AddSongForm.tsx`      | ✅ Aligned |

### SongDetail Component (Requires Redesign)

The `SongDetail.tsx` component uses legacy zinc-based styling that predates the design system:

| Issue         | Current                       | Design System                              |
| ------------- | ----------------------------- | ------------------------------------------ |
| Background    | `bg-zinc-950`                 | `bg-background`                            |
| Cards         | `bg-zinc-900 border-zinc-800` | `bg-card border-border`                    |
| Text          | `text-white`, `text-zinc-300` | `text-foreground`, `text-muted-foreground` |
| Status badges | Inline conditional classes    | `StatusBadge` component                    |
| Typography    | No serif/mono distinction     | Brawler serif, JetBrains Mono              |

---

## Design System Extensions

### 1. Song Editor Patterns

#### Page Layout (Full-Screen Detail View)

```tsx
// Layout wrapper for song detail pages
<div className="h-screen flex flex-col lg:flex-row overflow-hidden bg-background">
  {/* Main content area */}
  <main className="flex-1 overflow-y-auto">
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">{/* Content sections */}</div>
  </main>

  {/* Optional sidebar (AI Assistant, etc.) */}
  <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border bg-card">
    {/* Sidebar content */}
  </aside>
</div>
```

#### Song Header Pattern

```tsx
// Song header with editable metadata
<header className="bg-card border-b border-border p-6">
  <div className="flex items-start justify-between gap-4">
    {/* Left: Title and Artist */}
    <div className="flex-1 min-w-0">
      <h1 className="text-2xl font-bold font-serif text-foreground truncate">{song.title}</h1>
      <p className="text-sm text-muted-foreground mt-1">{song.artist}</p>
    </div>

    {/* Right: Status + Actions */}
    <div className="flex items-center gap-3 shrink-0">
      <StatusBadge status={song.status} />
      <Button variant="ghost" size="sm" onClick={onEdit}>
        <Pencil size={16} />
      </Button>
    </div>
  </div>

  {/* Metadata row */}
  <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
    <MetadataItem icon={Music} label="Key" value={song.key} />
    <MetadataItem icon={Clock} label="BPM" value={song.bpm} mono />
    <MetadataItem icon={Timer} label="Duration" value={formatDuration(song.duration)} mono />
  </div>
</header>
```

#### Metadata Item Component

```tsx
// Reusable metadata display
interface MetadataItemProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  mono?: boolean;
}

const MetadataItem = ({ icon: Icon, label, value, mono }: MetadataItemProps) => (
  <div className="flex items-center gap-2 text-sm">
    <Icon size={14} className="text-muted-foreground" />
    <span className="text-muted-foreground">{label}:</span>
    <span className={cn('font-medium text-foreground', mono && 'font-mono tabular-nums')}>
      {value}
    </span>
  </div>
);
```

#### Editable Field Pattern

```tsx
// Inline edit mode for metadata fields
{
  isEditing ? (
    <Input
      value={editForm.title}
      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
      className="text-xl font-bold font-serif"
      autoFocus
    />
  ) : (
    <h1
      className="text-2xl font-bold font-serif text-foreground cursor-pointer hover:text-primary transition-colors"
      onClick={() => setIsEditing(true)}
    >
      {song.title}
    </h1>
  );
}
```

#### Tab Navigation Pattern

```tsx
// Horizontal tab bar for song sections
<div className="border-b border-border">
  <nav className="flex gap-1 px-4" role="tablist">
    {['Overview', 'Charts', 'Assignments', 'Audio'].map(tab => (
      <button
        key={tab}
        role="tab"
        aria-selected={activeTab === tab}
        onClick={() => setActiveTab(tab)}
        className={cn(
          'px-4 py-2.5 text-sm font-medium transition-colors relative',
          'hover:text-foreground',
          activeTab === tab ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {tab}
        {activeTab === tab && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
        )}
      </button>
    ))}
  </nav>
</div>
```

---

### 2. Chart Upload/Management Patterns

#### Chart Selector Bar

```tsx
// Horizontal scrolling chart selector
<div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
  {charts.map((chart, index) => (
    <button
      key={chart.id}
      onClick={() => setActiveChartId(chart.id)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
        'border',
        activeChartId === chart.id
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
      )}
    >
      <ChartTypeIcon type={chart.type} size={14} />
      <span>{chart.name}</span>
    </button>
  ))}

  {/* Add chart button */}
  <Button variant="outline" size="sm" onClick={() => setIsAddingChart(true)} className="shrink-0">
    <Plus size={14} className="mr-1" />
    Add Chart
  </Button>
</div>
```

#### Chart Type Icons

```tsx
// Consistent icons per chart type
const CHART_TYPE_CONFIG = {
  TEXT: { icon: FileText, label: 'Text Chart' },
  PDF: { icon: FileType, label: 'PDF' },
  IMAGE: { icon: Image, label: 'Image' },
  GP: { icon: Guitar, label: 'Guitar Pro' },
} as const satisfies Record<ChartType, { icon: LucideIcon; label: string }>;
```

#### Add Chart Card (Inline Form)

```tsx
// Card-based inline form for adding charts
<Card className="overflow-hidden animate-slide-in-from-top animation-forwards">
  <CardHeader className="py-3 px-4">
    <h4 className="text-sm font-medium text-foreground">Add New Chart</h4>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Chart name input */}
    <div>
      <Label htmlFor="chart-name" className="text-sm text-muted-foreground">
        Chart Name
      </Label>
      <Input
        id="chart-name"
        value={newChartName}
        onChange={e => setNewChartName(e.target.value)}
        placeholder="e.g., Lead Guitar, Drums, Bass Tab"
        className="mt-1.5"
      />
    </div>

    {/* Instrument selector */}
    <div>
      <Label htmlFor="instrument" className="text-sm text-muted-foreground">
        Instrument
      </Label>
      <Select value={newChartInstrument} onValueChange={setNewChartInstrument}>
        <SelectTrigger id="instrument" className="mt-1.5">
          <SelectValue placeholder="Select instrument" />
        </SelectTrigger>
        <SelectContent>
          {instruments.map(inst => (
            <SelectItem key={inst} value={inst}>
              {inst}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Action buttons */}
    <div className="flex gap-2 pt-2">
      <Button onClick={handleUpload} className="flex-1">
        <Upload size={14} className="mr-1.5" />
        Upload File
      </Button>
      <Button variant="outline" onClick={handleCreateText} className="flex-1">
        <FileText size={14} className="mr-1.5" />
        Create Text Tab
      </Button>
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  </CardContent>
</Card>
```

#### File Upload Drop Zone

```tsx
// Drag-and-drop file upload area
<div
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  className={cn(
    'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
    isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
  )}
>
  <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
  <p className="text-sm font-medium text-foreground mb-1">Drop file here or click to upload</p>
  <p className="text-xs text-muted-foreground">Supports PDF, PNG, JPG, TXT, GP/GPX (max 50MB)</p>
  <input
    ref={fileInputRef}
    type="file"
    accept=".pdf,.png,.jpg,.jpeg,.txt,.gp,.gp3,.gp4,.gp5,.gpx"
    onChange={handleFileSelect}
    className="hidden"
  />
</div>
```

#### Chart Viewer Container

```tsx
// Container for chart content with toolbar
<Card className="flex-1 overflow-hidden">
  {/* Chart toolbar */}
  <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
    <div className="flex items-center gap-2">
      <ChartTypeIcon type={activeChart.type} size={16} className="text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">{activeChart.name}</span>
      {activeChart.instrument && (
        <Badge variant="secondary" className="text-xs">
          {activeChart.instrument}
        </Badge>
      )}
    </div>

    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={handleDownload}>
        <Download size={14} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 size={14} />
      </Button>
    </div>
  </div>

  {/* Chart content */}
  <div className="flex-1 overflow-auto p-4">{renderChartContent(activeChart)}</div>
</Card>
```

---

### 3. Part Assignment Patterns

#### Member Assignment Card

```tsx
// Card showing a band member with their song assignments
<Card className="overflow-hidden">
  <CardHeader className="py-3 px-4 bg-muted/30">
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10">
        <AvatarFallback className={getAvatarColor(member.id)}>
          {getInitials(member.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground truncate">{member.name}</h4>
        <p className="text-xs text-muted-foreground">{member.roles.join(' • ')}</p>
      </div>
    </div>
  </CardHeader>

  <CardContent className="p-4 space-y-3">
    {/* Assigned roles for this song */}
    <div>
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">
        Roles on this song
      </Label>
      <div className="flex flex-wrap gap-2 mt-2">
        {memberAssignments.map(assignment => (
          <Badge key={assignment.role} variant="secondary" className="flex items-center gap-1">
            {assignment.role}
            <button
              onClick={() => handleRemoveRole(member.id, assignment.role)}
              className="ml-1 hover:text-destructive"
            >
              <X size={12} />
            </button>
          </Badge>
        ))}

        {/* Add role dropdown */}
        <Select onValueChange={role => handleAddRole(member.id, role)}>
          <SelectTrigger className="h-6 w-auto px-2 text-xs border-dashed">
            <Plus size={12} className="mr-1" />
            Add
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map(role => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    {/* Assigned parts */}
    {memberParts.length > 0 && (
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Song Parts</Label>
        <div className="mt-2 space-y-1">
          {memberParts.map(part => (
            <div
              key={part.id}
              className="flex items-center gap-2 text-sm px-2 py-1.5 rounded bg-muted/50"
            >
              <span className="font-medium text-foreground">{part.name}</span>
              <span className="text-muted-foreground">({part.instrument})</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </CardContent>
</Card>
```

#### Assignment Grid Layout

```tsx
// Responsive grid for member cards
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {members.map(member => (
    <MemberAssignmentCard
      key={member.id}
      member={member}
      assignments={getAssignmentsForMember(member.id)}
      parts={getPartsForMember(member.id)}
      onAddRole={handleAddRole}
      onRemoveRole={handleRemoveRole}
    />
  ))}
</div>
```

#### Part Editor Modal

```tsx
// Modal for editing song parts/sections
<Dialog open={isEditingPart} onOpenChange={setIsEditingPart}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="font-serif">Edit Part</DialogTitle>
      <DialogDescription>Configure the song section and assign to a band member</DialogDescription>
    </DialogHeader>

    <div className="space-y-4 py-4">
      <div>
        <Label htmlFor="part-name">Part Name</Label>
        <Input
          id="part-name"
          value={editPart.name}
          onChange={e => setEditPart({ ...editPart, name: e.target.value })}
          placeholder="e.g., Intro, Verse 1, Guitar Solo"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="part-instrument">Instrument</Label>
        <Select
          value={editPart.instrument}
          onValueChange={v => setEditPart({ ...editPart, instrument: v })}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Select instrument" />
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map(role => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="assigned-member">Assign To</Label>
        <Select
          value={editPart.assignedToMemberId || ''}
          onValueChange={v => setEditPart({ ...editPart, assignedToMemberId: v || undefined })}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Unassigned</SelectItem>
            {members.map(member => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setIsEditingPart(false)}>
        Cancel
      </Button>
      <Button onClick={handleSavePart}>Save Part</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### 4. Music/Audio Upload Patterns

#### Audio Upload Card

```tsx
// Card for backing track management
<Card>
  <CardHeader className="py-3 px-4">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-serif text-foreground">Backing Track</h3>
      {song.backingTrackUrl && (
        <Button variant="ghost" size="sm" onClick={handleRemoveTrack} className="text-destructive">
          <Trash2 size={14} className="mr-1" />
          Remove
        </Button>
      )}
    </div>
  </CardHeader>

  <CardContent className="p-4">
    {song.backingTrackUrl ? (
      <div className="space-y-4">
        {/* Audio player */}
        <div className="bg-muted/50 rounded-lg p-4">
          <audio ref={audioPlayerRef} src={audioBlobUrl} controls className="w-full" />
        </div>

        {/* Download button */}
        <Button variant="outline" size="sm" onClick={handleDownloadTrack}>
          <Download size={14} className="mr-1.5" />
          Download Track
        </Button>
      </div>
    ) : (
      <AudioUploadZone onUpload={handleAudioUpload} />
    )}
  </CardContent>
</Card>
```

#### Audio Upload Zone

```tsx
// Upload area for audio files
<div
  onClick={() => audioInputRef.current?.click()}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleAudioDrop}
  className={cn(
    'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
    isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
  )}
>
  <Music size={32} className="mx-auto text-muted-foreground mb-3" />
  <p className="text-sm font-medium text-foreground mb-1">Upload backing track</p>
  <p className="text-xs text-muted-foreground">MP3 or WAV (max 10MB)</p>
  <input
    ref={audioInputRef}
    type="file"
    accept="audio/*"
    onChange={handleAudioSelect}
    className="hidden"
  />
</div>
```

#### Audio Player Wrapper (Enhanced)

```tsx
// Custom audio player with design system styling
<div className="bg-card border border-border rounded-xl overflow-hidden">
  <div className="flex items-center gap-4 p-4">
    {/* Play/Pause button */}
    <Button
      variant="default"
      size="icon"
      onClick={togglePlayPause}
      className="h-12 w-12 rounded-full shrink-0"
    >
      {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
    </Button>

    {/* Progress bar */}
    <div className="flex-1">
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-muted-foreground font-mono tabular-nums">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>

    {/* Volume control */}
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={toggleMute}>
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </Button>
    </div>
  </div>
</div>
```

---

### 5. AI Assistant Sidebar Pattern

```tsx
// Right sidebar for AI assistant
<aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col">
  {/* Header */}
  <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
    <Sparkles size={18} className="text-primary" />
    <h3 className="font-semibold text-foreground">Studio Assistant</h3>
  </div>

  {/* Messages area */}
  <div className="flex-1 overflow-y-auto p-4 space-y-4">
    {messages.map((message, i) => (
      <div
        key={i}
        className={cn(
          'rounded-xl p-3 text-sm',
          message.role === 'user'
            ? 'bg-primary text-primary-foreground ml-8'
            : 'bg-muted text-foreground mr-8'
        )}
      >
        {message.content}
      </div>
    ))}

    {isLoading && (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 size={14} className="animate-spin" />
        Thinking...
      </div>
    )}
  </div>

  {/* Input area */}
  <div className="p-4 border-t border-border">
    <div className="flex gap-2">
      <Input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSend()}
        placeholder="Ask about this song..."
        className="flex-1"
      />
      <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
        <Send size={16} />
      </Button>
    </div>
  </div>
</aside>
```

---

## Animation Guidelines for Subpages

### Entrance Animations

```tsx
// Page-level staggered entrance
const sections = ['header', 'tabs', 'content', 'sidebar'];

// Apply stagger classes
<header className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-1" />
<TabNav className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-2" />
<MainContent className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-3" />
<Sidebar className="animate-slide-in-from-bottom animation-forwards opacity-0 stagger-4" />
```

### Transition Animations

```tsx
// Tab content transitions
<div className={cn(
  "animate-fade-in",
  isChangingTab && "opacity-0"
)}>
  {tabContent}
</div>

// Modal/dialog entrance
<DialogContent className="animate-in fade-in-0 zoom-in-95 duration-200" />

// Inline form reveal
<Card className="animate-slide-in-from-top animation-forwards" />
```

### Loading States

```tsx
// Skeleton loading for charts
<div className="animate-pulse space-y-4">
  <div className="h-8 bg-muted rounded w-1/3" />
  <div className="h-64 bg-muted rounded" />
</div>

// Spinner for actions
<Button disabled={isLoading}>
  {isLoading ? (
    <Loader2 className="animate-spin mr-2" size={16} />
  ) : (
    <Upload className="mr-2" size={16} />
  )}
  Upload
</Button>
```

---

## Implementation Checklist

### Phase 1: SongDetail Typography & Colors

- [ ] Replace all `zinc-*` classes with design system tokens
- [ ] Update status badges to use `StatusBadge` component
- [ ] Apply serif font to section headers
- [ ] Apply mono font to numeric values (BPM, duration)
- [ ] Update text colors: `text-foreground`, `text-muted-foreground`

### Phase 2: Card & Layout Structure

- [ ] Wrap sections in `Card`/`CardHeader`/`CardContent` components
- [ ] Apply consistent padding (`p-4 sm:p-6 lg:p-8`)
- [ ] Update tab navigation to design system pattern
- [ ] Add proper spacing between sections (`space-y-6`)

### Phase 3: Form Patterns

- [ ] Update all inputs to use primitive `Input` component
- [ ] Update dropdowns to use `Select` primitives
- [ ] Apply consistent label styling
- [ ] Add proper form spacing

### Phase 4: Chart Management

- [ ] Implement chart selector bar pattern
- [ ] Add chart type icons consistently
- [ ] Update add chart form to card-based pattern
- [ ] Implement file upload drop zone

### Phase 5: Animations

- [ ] Add staggered entrance animations
- [ ] Add tab transition animations
- [ ] Add loading state skeletons
- [ ] Verify motion-reduce support

### Phase 6: Audio Features

- [ ] Style audio upload zone
- [ ] Create custom audio player wrapper (optional)
- [ ] Add download/remove actions

---

## File Changes Required

| File                                 | Change Type              | Priority |
| ------------------------------------ | ------------------------ | -------- |
| `src/components/SongDetail.tsx`      | Major refactor           | High     |
| `docs/design-system.md`              | Add new sections         | Medium   |
| `src/components/ui/MetadataItem.tsx` | New component            | Medium   |
| `src/components/ui/AudioPlayer.tsx`  | New component (optional) | Low      |
| `src/components/ui/UploadZone.tsx`   | New component            | Medium   |

---

## Testing Considerations

1. **Visual Regression**: Screenshot tests before/after for SongDetail
2. **Theme Support**: Verify light/dark mode compatibility
3. **Responsive**: Test layouts at mobile, tablet, desktop breakpoints
4. **Accessibility**: Verify ARIA labels, keyboard navigation, screen reader support
5. **Animation**: Test with `prefers-reduced-motion` enabled

---

## Success Criteria

1. All SongDetail subpages use design system color tokens
2. Typography hierarchy matches design system (serif headlines, mono numbers)
3. Card patterns consistent with SetlistManager
4. Animations align with established patterns (stagger, slide-in)
5. StatusBadge component used for all status displays
6. Forms use primitive Input/Select components
7. Light/dark mode works correctly throughout

---

_Author: Claude Code_
_Created: 2025-11-28_
_Status: Draft_
