# Components Guidelines

## Directory Structure

```
components/
├── primitives/   # Base shadcn/ui components (minimal modifications)
├── ui/           # Composed, reusable components
├── layout/       # App shell and navigation
├── practice/     # Practice mode components
├── setlist/      # Setlist management components
└── *.tsx         # Feature/page components
```

## Primitives Policy

Do not modify primitives except for:
- Adding `displayName` for DevTools
- Touch target fixes (`h-11 sm:h-9` for 44px mobile)
- Focus style updates (`focus-visible:` over `focus:`)

When in doubt, wrap the primitive in a new `ui/` component instead.

## Component Patterns

### Memoization

```typescript
export const MyComponent = memo(function MyComponent({ ... }) {
  // ...
});
MyComponent.displayName = 'MyComponent';
```

Use `useCallback` for handlers passed to children. Use `useMemo` for expensive computations.

### Import Order

1. React
2. Third-party (`lucide-react`, etc.)
3. Local components (`@/components/*`)
4. Types (`@/types`)
5. Utils (`@/lib/utils`)

## Theme

Located in `src/index.css`. Key variables:

| Variable | Usage |
|----------|-------|
| `--primary` | Amber/gold brand color |
| `--destructive` | Red, danger actions |
| `--success` | Green, positive status |
| `--warning` | Amber, caution |
| `--info` | Blue, informational |

## Touch Targets

Mobile-first sizing: `h-11 sm:h-9` (44px mobile, 36px desktop) for buttons, inputs, selects.
