import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/primitives/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/primitives/sheet';
import { useSidebar } from './SidebarProvider';
import { Sidebar } from './Sidebar';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';

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
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'fixed top-4 left-4 z-40 lg:hidden',
            'bg-card/80 backdrop-blur-sm border border-border shadow-md',
            'hover:bg-accent'
          )}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0 w-64 bg-sidebar"
        hideCloseButton
      >
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
  );
}
