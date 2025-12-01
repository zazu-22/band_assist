import React, { memo } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives';
import { useTheme } from '@/components/ui/ThemeProvider';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  collapsed?: boolean;
  /** Use icon-only mode (for mobile header) instead of sidebar button style */
  iconOnly?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = memo(function ThemeToggle({
  collapsed = false,
  iconOnly = false,
  className,
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={iconOnly ? 'icon' : undefined}
          className={cn(
            'text-muted-foreground hover:text-foreground',
            iconOnly
              ? 'justify-center'
              : cn(
                  'w-full gap-3',
                  collapsed ? 'justify-center px-2' : 'justify-start'
                ),
            className
          )}
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="h-5 w-5 shrink-0" />
          ) : (
            <Sun className="h-5 w-5 shrink-0" />
          )}
          {!collapsed && !iconOnly && (
            <span className="text-sm font-medium">
              {theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={collapsed || iconOnly ? 'center' : 'start'} side="top" className="space-y-1">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={theme === 'light' ? 'bg-primary/20 text-primary' : ''}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={theme === 'dark' ? 'bg-primary/20 text-primary' : ''}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={theme === 'system' ? 'bg-primary/20 text-primary' : ''}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

ThemeToggle.displayName = 'ThemeToggle';
