import { useEffect } from 'react';
import { useSidebar } from '@/components/layout/SidebarProvider';

/**
 * Hook to enable keyboard shortcuts for layout controls.
 * - Cmd/Ctrl + B: Toggle sidebar collapse
 */
export const useLayoutShortcuts = () => {
  const { toggle } = useSidebar();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + B = toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);
};
