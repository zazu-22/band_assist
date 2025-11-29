import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

interface SidebarContextValue {
  /** Whether the desktop sidebar is collapsed to icon-only mode */
  collapsed: boolean;
  /** Set the collapsed state */
  setCollapsed: (collapsed: boolean) => void;
  /** Whether the mobile drawer is open */
  mobileOpen: boolean;
  /** Set the mobile drawer open state */
  setMobileOpen: (open: boolean) => void;
  /** Toggle the sidebar collapsed state (desktop) */
  toggle: () => void;
  /** Toggle the mobile drawer */
  toggleMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

const STORAGE_KEY = 'band-assist-sidebar-collapsed';

interface SidebarProviderProps {
  children: ReactNode;
  defaultCollapsed?: boolean;
}

export function SidebarProvider({ children, defaultCollapsed = false }: SidebarProviderProps) {
  // Initialize from localStorage or default
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch {
      // localStorage not available
    }
    return defaultCollapsed;
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // localStorage not available
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const toggleMobile = useCallback(() => {
    setMobileOpen(prev => !prev);
  }, []);

  const value = useMemo<SidebarContextValue>(
    () => ({
      collapsed,
      setCollapsed,
      mobileOpen,
      setMobileOpen,
      toggle,
      toggleMobile,
    }),
    [collapsed, setCollapsed, mobileOpen, toggle, toggleMobile]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
