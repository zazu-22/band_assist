/**
 * Dropdown Menu UI Components
 *
 * Wraps the primitive dropdown-menu components with application-specific styling.
 * Adds cursor-pointer for better UX on interactive items.
 */

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem as PrimitiveDropdownMenuItem,
  DropdownMenuCheckboxItem as PrimitiveDropdownMenuCheckboxItem,
  DropdownMenuRadioItem as PrimitiveDropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger as PrimitiveDropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from '@/components/primitives/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Enhanced DropdownMenuItem with cursor-pointer styling.
 * Disabled items show default cursor.
 */
const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof PrimitiveDropdownMenuItem>,
  React.ComponentPropsWithoutRef<typeof PrimitiveDropdownMenuItem>
>(({ className, ...props }, ref) => (
  <PrimitiveDropdownMenuItem
    ref={ref}
    className={cn('cursor-pointer data-[disabled]:cursor-default', className)}
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

/**
 * Enhanced DropdownMenuCheckboxItem with cursor-pointer styling.
 * Disabled items show default cursor.
 */
const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof PrimitiveDropdownMenuCheckboxItem>,
  React.ComponentPropsWithoutRef<typeof PrimitiveDropdownMenuCheckboxItem>
>(({ className, ...props }, ref) => (
  <PrimitiveDropdownMenuCheckboxItem
    ref={ref}
    className={cn('cursor-pointer data-[disabled]:cursor-default', className)}
    {...props}
  />
));
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

/**
 * Enhanced DropdownMenuRadioItem with cursor-pointer styling.
 * Disabled items show default cursor.
 */
const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof PrimitiveDropdownMenuRadioItem>,
  React.ComponentPropsWithoutRef<typeof PrimitiveDropdownMenuRadioItem>
>(({ className, ...props }, ref) => (
  <PrimitiveDropdownMenuRadioItem
    ref={ref}
    className={cn('cursor-pointer data-[disabled]:cursor-default', className)}
    {...props}
  />
));
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

/**
 * Enhanced DropdownMenuSubTrigger with cursor-pointer styling.
 */
const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof PrimitiveDropdownMenuSubTrigger>,
  React.ComponentPropsWithoutRef<typeof PrimitiveDropdownMenuSubTrigger>
>(({ className, ...props }, ref) => (
  <PrimitiveDropdownMenuSubTrigger
    ref={ref}
    className={cn('cursor-pointer', className)}
    {...props}
  />
));
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

// Re-export primitives that don't need modification
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
