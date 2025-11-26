import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { TooltipProvider } from '@/components/primitives/tooltip';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  onLogout?: () => void;
  showLogout?: boolean;
  currentBandName?: string;
  userBands?: Array<{ id: string; name: string }>;
  onSelectBand?: (bandId: string) => void;
}

export function AppShell({
  onLogout,
  showLogout = false,
  currentBandName,
  userBands = [],
  onSelectBand,
}: AppShellProps) {
  const isDesktop = useIsDesktop();

  return (
    <TooltipProvider>
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
          />
        )}

        {/* Main Content */}
        <main
          className={cn(
            'flex-1 overflow-auto',
            // Add padding on mobile to account for the floating menu button
            !isDesktop && 'pt-16'
          )}
        >
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  );
}
