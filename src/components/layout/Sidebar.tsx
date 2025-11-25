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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/primitives/tooltip';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
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

export function Sidebar({
  onLogout,
  showLogout = false,
  currentBandName,
  userBands = [],
  onSelectBand,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, setCollapsed } = useSidebar();

  const isActive = (path: string): boolean => {
    return matchRoute(location.pathname, path);
  };

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

            const button = (
              <Button
                key={item.id}
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
            );

            // Wrap in tooltip when collapsed
            if (collapsed) {
              return (
                <Tooltip key={item.id} delayDuration={0}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}

          {/* Performance Mode - Special styling */}
          <div className={cn('pt-4 pb-2', collapsed ? 'px-0' : 'px-0')}>
            <Separator className="mb-4 bg-sidebar-border" />
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => navigate(ROUTES.PERFORMANCE)}
                    className={cn(
                      'w-full justify-center px-2',
                      isActive(ROUTES.PERFORMANCE)
                        ? 'bg-destructive/20 text-destructive'
                        : 'text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive'
                    )}
                    title="Performance Mode"
                    aria-label="Performance Mode"
                    aria-current={
                      isActive(ROUTES.PERFORMANCE) ? 'page' : undefined
                    }
                  >
                    <Radio className="w-5 h-5 shrink-0" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Performance Mode</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                onClick={() => navigate(ROUTES.PERFORMANCE)}
                className={cn(
                  'w-full justify-start gap-3',
                  isActive(ROUTES.PERFORMANCE)
                    ? 'bg-destructive/20 text-destructive border border-destructive/50'
                    : 'text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive'
                )}
                title="Performance Mode"
                aria-label="Performance Mode"
                aria-current={
                  isActive(ROUTES.PERFORMANCE) ? 'page' : undefined
                }
              >
                <Radio className="w-5 h-5 shrink-0" />
                <span className="hidden lg:block font-bold tracking-wide">
                  Performance Mode
                </span>
              </Button>
            )}
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
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => navigate(ROUTES.SETTINGS)}
                className={cn(
                  'w-full justify-center text-muted-foreground hover:text-foreground',
                  isActive(ROUTES.SETTINGS) && 'bg-accent text-accent-foreground'
                )}
                title="Settings"
                aria-label="Settings"
                aria-current={isActive(ROUTES.SETTINGS) ? 'page' : undefined}
              >
                <Settings className="w-5 h-5 shrink-0" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            onClick={() => navigate(ROUTES.SETTINGS)}
            className={cn(
              'w-full justify-start gap-3 text-muted-foreground hover:text-foreground',
              isActive(ROUTES.SETTINGS) && 'bg-accent text-accent-foreground'
            )}
            title="Settings"
            aria-label="Settings"
            aria-current={isActive(ROUTES.SETTINGS) ? 'page' : undefined}
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span className="hidden lg:block text-sm font-medium">Config</span>
          </Button>
        )}

        {/* Logout Button (only shown when authenticated with Supabase) */}
        {showLogout && onLogout && (
          collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={onLogout}
                  className="w-full justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Log out</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={onLogout}
              className="w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block text-sm font-medium">
                Logout
              </span>
            </Button>
          )
        )}
      </div>
    </div>
  );
}
