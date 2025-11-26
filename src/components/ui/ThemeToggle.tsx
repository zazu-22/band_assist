import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  collapsed?: boolean;
  className?: string;
}

export function ThemeToggle({ collapsed = false, className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className={cn(
            'w-full text-muted-foreground hover:text-foreground',
            collapsed ? 'justify-center' : 'justify-start gap-3',
            className
          )}
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="h-5 w-5 shrink-0" />
          ) : (
            <Sun className="h-5 w-5 shrink-0" />
          )}
          {!collapsed && (
            <span className="text-sm font-medium">
              {theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={collapsed ? 'center' : 'start'} side="top">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
