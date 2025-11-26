import React, { memo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Music,
  ListMusic,
  Mic2,
  Settings,
  Users,
  CalendarClock,
  Radio,
  LogOut,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/primitives/button';
import { Separator } from '@/components/primitives/separator';
import { ScrollArea } from '@/components/primitives/scroll-area';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ConditionalTooltip } from '@/components/ui/ConditionalTooltip';
import { BandSelector } from '@/components/BandSelector';
import { useSidebar } from './SidebarProvider';
import { ROUTES, NAV_ITEMS, matchRoute } from '@/routes';

/** Map nav item IDs to their icons */
type NavItemId = (typeof NAV_ITEMS)[number]['id'];
const iconMap: Record<NavItemId, LucideIcon> = {
  DASHBOARD: LayoutDashboard,
  PRACTICE: Mic2,
  SETLIST: ListMusic,
  SCHEDULE: CalendarClock,
  BAND: Users,
};

interface SidebarProps {
  onLogout?: () => void;
  showLogout?: boolean;
  currentBandName?: string;
  userBands?: Array<{ id: string; name: string }>;
  onSelectBand?: (bandId: string) => void;
}

export const Sidebar = memo(function Sidebar({
  onLogout,
  showLogout = false,
  currentBandName,
  userBands = [],
  onSelectBand,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, setCollapsed } = useSidebar();

  const isActive = useCallback(
    (path: string): boolean => {
      return matchRoute(location.pathname, path);
    },
    [location.pathname]
  );

  const performanceActive = isActive(ROUTES.PERFORMANCE);
  const settingsActive = isActive(ROUTES.SETTINGS);

  return (
    <div
      className={cn(
        'bg-sidebar border-r border-sidebar-border flex flex-col h-screen sticky top-0',
        'transition-[width] duration-300 ease-in-out motion-reduce:transition-none',
        collapsed ? 'w-16' : 'w-20 lg:w-64'
      )}
    >
      {/* Header */}
      <div className="p-4 lg:p-6 flex items-center justify-center lg:justify-start">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center shadow-lg">
              <Music className="text-sidebar-primary-foreground w-6 h-6" />
            </div>
            <h1 className="hidden lg:block text-xl font-bold tracking-tighter text-sidebar-foreground">
              BAND
              <br />
              <span className="text-sidebar-primary">ASSIST</span>
            </h1>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center shadow-lg">
            <Music className="text-sidebar-primary-foreground w-6 h-6" />
          </div>
        )}
      </div>

      {/* Band Selector (only show if using Supabase and not collapsed) */}
      {!collapsed && currentBandName && userBands.length > 0 && onSelectBand && (
        <BandSelector
          currentBandName={currentBandName}
          bands={userBands}
          onSelectBand={onSelectBand}
        />
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="px-3 py-6 space-y-2" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.id] ?? LayoutDashboard;
            const active = isActive(item.path);

            return (
              <ConditionalTooltip
                key={item.id}
                showTooltip={collapsed}
                content={item.label}
                side="right"
              >
                <Button
                  variant="ghost"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'w-full gap-3 transition-colors duration-200 motion-reduce:transition-none',
                    collapsed ? 'justify-center px-2' : 'justify-start',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 shrink-0',
                      active && 'text-sidebar-primary'
                    )}
                  />
                  {!collapsed && (
                    <span className="hidden lg:block font-medium">
                      {item.label}
                    </span>
                  )}
                </Button>
              </ConditionalTooltip>
            );
          })}

          {/* Performance Mode - Special styling */}
          <div className={cn('pt-4 pb-2', collapsed ? 'px-0' : 'px-0')}>
            <Separator className="mb-4 bg-sidebar-border" />
            <ConditionalTooltip
              showTooltip={collapsed}
              content="Performance Mode"
              side="right"
            >
              <Button
                variant="ghost"
                onClick={() => navigate(ROUTES.PERFORMANCE)}
                className={cn(
                  'w-full',
                  collapsed ? 'justify-center px-2' : 'justify-start gap-3',
                  performanceActive
                    ? collapsed
                      ? 'bg-destructive/20 text-destructive'
                      : 'bg-destructive/20 text-destructive border border-destructive/50'
                    : 'text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive'
                )}
                title="Performance Mode"
                aria-label="Performance Mode"
                aria-current={performanceActive ? 'page' : undefined}
              >
                <Radio className="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <span className="hidden lg:block font-bold tracking-wide">
                    Performance Mode
                  </span>
                )}
              </Button>
            </ConditionalTooltip>
          </div>
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        {/* Collapse toggle - desktop only */}
        <Button
          variant="ghost"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'hidden lg:flex w-full text-muted-foreground hover:text-foreground',
            collapsed ? 'justify-center' : 'justify-start gap-3'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle collapsed={collapsed} />

        {/* Settings */}
        <ConditionalTooltip
          showTooltip={collapsed}
          content="Settings"
          side="right"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(ROUTES.SETTINGS)}
            className={cn(
              'w-full text-muted-foreground hover:text-foreground',
              collapsed ? 'justify-center' : 'justify-start gap-3',
              settingsActive && 'bg-accent text-accent-foreground'
            )}
            title="Settings"
            aria-label="Settings"
            aria-current={settingsActive ? 'page' : undefined}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <span className="hidden lg:block text-sm font-medium">Config</span>
            )}
          </Button>
        </ConditionalTooltip>

        {/* Logout Button (only shown when authenticated with Supabase) */}
        {showLogout && onLogout && (
          <ConditionalTooltip
            showTooltip={collapsed}
            content="Log out"
            side="right"
          >
            <Button
              variant="ghost"
              onClick={onLogout}
              className={cn(
                'w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                collapsed ? 'justify-center' : 'justify-start gap-3'
              )}
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="hidden lg:block text-sm font-medium">
                  Logout
                </span>
              )}
            </Button>
          </ConditionalTooltip>
        )}
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';
