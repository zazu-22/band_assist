import React from 'react';
import { Users } from 'lucide-react';

interface BandSelectorProps {
  currentBandName: string;
  // Future: Add these props when implementing multi-band switching
  // bands: Array<{ id: string; name: string }>;
  // onSelectBand: (bandId: string) => void;
}

/**
 * BandSelector Component
 *
 * Displays the current band name. Designed for future extensibility to support
 * switching between multiple bands.
 *
 * Future enhancements:
 * - Dropdown to switch between bands (when user is in multiple bands)
 * - Quick access to band settings
 * - Band invitation management
 */
export const BandSelector: React.FC<BandSelectorProps> = ({
  currentBandName
}) => {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
      <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full">
        <Users className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-100 truncate">
          {currentBandName}
        </p>
        <p className="text-xs text-zinc-500">
          Current Band
        </p>
      </div>
      {/* Future: Add dropdown button here for band switching */}
    </div>
  );
};
