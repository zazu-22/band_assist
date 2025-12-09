import { memo } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { TooltipProvider } from '@/components/primitives/tooltip';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  onLogout?: () => void;
  showLogout?: boolean;
  currentBandName?: string;
  userBands?: Array<{ id: string; name: string }>;
  onSelectBand?: (bandId: string) => void;
  onCreateBand?: () => void;
}

/**
 * Skip link component for keyboard navigation accessibility.
 * Allows users to skip past the navigation directly to main content.
 * Hidden visually but focusable via keyboard.
 */
function SkipLink() {
  return (
    <a
      href="#main-content"
      className={cn(
        'sr-only focus:not-sr-only',
        'focus:fixed focus:top-4 focus:left-4 focus:z-50',
        'focus:px-4 focus:py-2 focus:rounded-md',
        'focus:bg-primary focus:text-primary-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
      )}
    >
      Skip to main content
    </a>
  );
}

/**
 * Render the application shell with responsive navigation and a main content area.
 *
 * Renders a TooltipProvider-wrapped layout that includes an accessible skip link, a
 * sidebar on desktop or a mobile navigation on smaller viewports, and a main content
 * region that hosts routed children inside an error boundary.
 *
 * @param onLogout - Optional callback invoked when the user triggers logout.
 * @param showLogout - Whether to show the logout control in navigation.
 * @param currentBandName - The name of the currently selected band (displayed in navigation).
 * @param userBands - Array of user bands (each with `id` and `name`) shown in band selector.
 * @param onSelectBand - Optional callback invoked with a band `id` when the user selects a band.
 * @param onCreateBand - Optional callback invoked to initiate creating a new band.
 * @returns A React element rendering the application shell with navigation and the main content region.
 */
export const AppShell = memo(function AppShell({
  onLogout,
  showLogout = false,
  currentBandName,
  userBands = [],
  onSelectBand,
  onCreateBand,
}: AppShellProps) {
  const isDesktop = useIsDesktop();

  return (
    <TooltipProvider>
      <SkipLink />
      <div className="flex h-dvh bg-background">
        {/* Desktop Sidebar */}
        {isDesktop && (
          <Sidebar
            onLogout={onLogout}
            showLogout={showLogout}
            currentBandName={currentBandName}
            userBands={userBands}
            onSelectBand={onSelectBand}
            onCreateBand={onCreateBand}
          />
        )}

        {/* Mobile Navigation */}
        {!isDesktop && (
          <MobileNav
            onLogout={onLogout}
            showLogout={showLogout}
            currentBandName={currentBandName}
            userBands={userBands}
            onSelectBand={onSelectBand}
            onCreateBand={onCreateBand}
          />
        )}

        {/* Main Content */}
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'flex-1 overflow-auto focus:outline-none',
            // Add padding on mobile to account for the floating menu button (h-14 = 56px)
            // and safe area at bottom for iOS Safari with viewport-fit=cover
            !isDesktop && 'pt-14 pb-safe'
          )}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </TooltipProvider>
  );
});

AppShell.displayName = 'AppShell';
