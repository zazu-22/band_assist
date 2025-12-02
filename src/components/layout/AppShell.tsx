import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { TooltipProvider } from '@/components/primitives/tooltip';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { SaveStatusIndicator } from '@/components/ui/SaveStatusIndicator';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  onLogout?: () => void;
  showLogout?: boolean;
  currentBandName?: string;
  userBands?: Array<{ id: string; name: string }>;
  onSelectBand?: (bandId: string) => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
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

export function AppShell({
  onLogout,
  showLogout = false,
  currentBandName,
  userBands = [],
  onSelectBand,
  isSaving = false,
  lastSaved = null,
}: AppShellProps) {
  const isDesktop = useIsDesktop();

  return (
    <TooltipProvider>
      <SkipLink />
      <div className="flex h-screen bg-background">
        {/* Desktop Sidebar */}
        {isDesktop && (
          <Sidebar
            onLogout={onLogout}
            showLogout={showLogout}
            currentBandName={currentBandName}
            userBands={userBands}
            onSelectBand={onSelectBand}
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
            isSaving={isSaving}
            lastSaved={lastSaved}
          />
        )}

        {/* Main Content */}
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'flex-1 overflow-auto focus:outline-none',
            // Add padding on mobile to account for the floating menu button
            !isDesktop && 'pt-16'
          )}
        >
          {/* Save Status Indicator - Desktop only (mobile shows in header) */}
          {isDesktop && (
            <div className="absolute top-4 right-4 z-10">
              <SaveStatusIndicator isSaving={isSaving} lastSaved={lastSaved} />
            </div>
          )}
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </TooltipProvider>
  );
}
