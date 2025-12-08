import { memo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/primitives/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/primitives/sheet';
import { useSidebar } from './SidebarProvider';
import { Sidebar } from './Sidebar';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getPageTitle } from '@/routes';

interface MobileNavProps {
  onLogout?: () => void;
  showLogout?: boolean;
  currentBandName?: string;
  userBands?: Array<{ id: string; name: string }>;
  onSelectBand?: (bandId: string) => void;
  onCreateBand?: () => void;
}

/**
 * Render a fixed mobile header with a slide-out navigation drawer, current band and page indicators, and a theme toggle.
 *
 * @param onLogout - Optional callback invoked when the user requests logout.
 * @param showLogout - Whether to show the logout option in the navigation.
 * @param currentBandName - Name of the currently selected band to display in the header.
 * @param userBands - Array of available bands (each with `id` and `name`) passed through to the sidebar.
 * @param onSelectBand - Optional callback called with a band ID when a band is selected from the sidebar.
 * @param onCreateBand - Optional callback invoked to create a new band from the sidebar.
 * @returns The mobile navigation header element containing the menu trigger, band/page labels, and theme toggle.
 */
export const MobileNav = memo(function MobileNav({
  onLogout,
  showLogout = false,
  currentBandName,
  userBands = [],
  onSelectBand,
  onCreateBand,
}: MobileNavProps) {
  const location = useLocation();
  const { mobileOpen, setMobileOpen } = useSidebar();

  // Get current page title for header display
  const pageTitle = getPageTitle(location.pathname);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, setMobileOpen]);

  return (
    <>
      {/* Fixed header bar with menu and theme toggle */}
      <div
        className={cn(
          'fixed top-0 left-0 right-0 z-40 lg:hidden',
          'h-14 px-4 flex items-center justify-between',
          'bg-card/80 backdrop-blur-sm border-b border-border'
        )}
      >
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-sidebar" hideCloseButton>
            <VisuallyHidden>
              <SheetTitle>Navigation Menu</SheetTitle>
            </VisuallyHidden>
            <Sidebar
              onLogout={onLogout}
              showLogout={showLogout}
              currentBandName={currentBandName}
              userBands={userBands}
              onSelectBand={onSelectBand}
              onCreateBand={onCreateBand}
              isMobileDrawer
            />
          </SheetContent>
        </Sheet>

        {/* Band name and page indicator in center */}
        <div className="flex-1 min-w-0 flex items-center justify-center gap-0 overflow-hidden">
          {currentBandName && (
            <span className="text-sm font-medium text-foreground truncate max-w-[45%]">
              {currentBandName}
            </span>
          )}
          {currentBandName && pageTitle && (
            <span className="mx-1.5 shrink-0 text-muted-foreground">·</span>
          )}
          {pageTitle && (
            <span className="text-sm font-medium text-muted-foreground truncate max-w-[45%]">
              {pageTitle}
            </span>
          )}
        </div>

        {/* Theme toggle on right */}
        <div className="shrink-0 flex items-center gap-2">
          <ThemeToggle iconOnly />
        </div>
      </div>
    </>
  );
});

MobileNav.displayName = 'MobileNav';
