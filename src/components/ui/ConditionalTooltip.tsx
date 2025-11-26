import React, { memo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/primitives/tooltip';

interface ConditionalTooltipProps {
  /** When true, wraps children in a Tooltip. When false, renders children directly. */
  showTooltip: boolean;
  /** The tooltip content to display */
  content: React.ReactNode;
  /** The side of the trigger to display the tooltip */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Delay before showing tooltip in milliseconds */
  delayDuration?: number;
  /** The element to wrap */
  children: React.ReactElement;
}

/**
 * Conditionally wraps children in a Tooltip based on showTooltip prop.
 * Useful for collapsed sidebar states where tooltips should only appear when collapsed.
 *
 * @example
 * <ConditionalTooltip showTooltip={collapsed} content="Settings" side="right">
 *   <Button>
 *     <Settings />
 *   </Button>
 * </ConditionalTooltip>
 */
export const ConditionalTooltip = memo(function ConditionalTooltip({
  showTooltip,
  content,
  side = 'right',
  delayDuration = 0,
  children,
}: ConditionalTooltipProps) {
  if (!showTooltip) {
    return children;
  }

  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  );
});

ConditionalTooltip.displayName = 'ConditionalTooltip';
