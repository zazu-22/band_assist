import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/primitives/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/primitives/sheet';
import { useSidebar } from './SidebarProvider';
import { Sidebar } from './Sidebar';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface MobileNavProps {
  onLogout?: () => void;
  showLogout?: boolean;
  currentBandName?: string;
  userBands?: Array<{ id: string; name: string }>;
  onSelectBand?: (bandId: string) => void;
}

export function MobileNav({
  onLogout,
  showLogout = false,
  currentBandName,
  userBands = [],
  onSelectBand,
}: MobileNavProps) {
  const location = useLocation();
  const { mobileOpen, setMobileOpen } = useSidebar();

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
            />
          </SheetContent>
        </Sheet>

        {/* Band name in center */}
        {currentBandName && (
          <span className="text-sm font-medium text-foreground truncate max-w-[50%]">
            {currentBandName}
          </span>
        )}

        {/* Theme toggle on right */}
        <ThemeToggle />
      </div>
    </>
  );
}
