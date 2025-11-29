import React, { memo, useState, useCallback, useMemo } from 'react';
import { Users, ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Avatar,
  AvatarFallback,
} from '@/components/primitives';

interface Band {
  id: string;
  name: string;
}

interface BandSelectorProps {
  currentBandName: string;
  bands: Band[];
  onSelectBand: (bandId: string) => void;
}

/**
 * BandSelector Component
 *
 * Displays the current band name and allows switching between multiple bands.
 * Shows a dropdown when user is a member of multiple bands.
 */
export const BandSelector: React.FC<BandSelectorProps> = memo(function BandSelector({
  currentBandName,
  bands,
  onSelectBand,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const currentBand = useMemo(
    () => bands.find(b => b.name === currentBandName),
    [bands, currentBandName]
  );

  const showDropdown = bands.length > 1;

  const handleBandClick = useCallback(
    (bandId: string) => {
      onSelectBand(bandId);
      setIsOpen(false);
    },
    [onSelectBand]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (showDropdown) {
        setIsOpen(open);
      }
    },
    [showDropdown]
  );

  // Single band - no dropdown needed
  if (!showDropdown) {
    return (
      <div className="w-full flex items-center gap-2 px-4 py-3 bg-sidebar border-b border-sidebar-border">
        <Avatar className="w-8 h-8 bg-primary">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Users className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-sidebar-foreground truncate">{currentBandName}</p>
          <p className="text-xs text-sidebar-foreground/60">Current Band</p>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="w-full flex items-center gap-2 px-4 py-3 bg-sidebar border-b border-sidebar-border hover:bg-sidebar-accent/50 transition-colors"
          aria-label="Select band"
        >
          <Avatar className="w-8 h-8 bg-primary">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Users className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {currentBandName}
            </p>
            <p className="text-xs text-sidebar-foreground/60">{bands.length} bands</p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-sidebar-foreground/60 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-64 overflow-y-auto"
      >
        {bands.map(band => (
          <DropdownMenuItem
            key={band.id}
            onClick={() => handleBandClick(band.id)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <Avatar className="w-6 h-6 bg-primary">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                <Users className="w-3 h-3" />
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate">{band.name}</span>
            {band.id === currentBand?.id && (
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

BandSelector.displayName = 'BandSelector';
