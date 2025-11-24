import React, { useState } from 'react';
import { Users, ChevronDown, Check } from 'lucide-react';

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
export const BandSelector: React.FC<BandSelectorProps> = ({
  currentBandName,
  bands,
  onSelectBand,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentBand = bands.find(b => b.name === currentBandName);
  const showDropdown = bands.length > 1;

  const handleBandClick = (bandId: string) => {
    onSelectBand(bandId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => showDropdown && setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 px-4 py-3 bg-zinc-900 border-b border-zinc-800 ${
          showDropdown ? 'hover:bg-zinc-800/50 cursor-pointer' : 'cursor-default'
        } transition-colors`}
        disabled={!showDropdown}
      >
        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full flex-shrink-0">
          <Users className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-zinc-100 truncate">{currentBandName}</p>
          <p className="text-xs text-zinc-500">
            {showDropdown ? `${bands.length} bands` : 'Current Band'}
          </p>
        </div>
        {showDropdown && (
          <ChevronDown
            className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {showDropdown && isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div className="absolute top-full left-0 right-0 z-20 bg-zinc-800 border-x border-b border-zinc-700 shadow-lg max-h-64 overflow-y-auto">
            {bands.map(band => (
              <button
                key={band.id}
                onClick={() => handleBandClick(band.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-700/50 transition-colors text-left"
              >
                <div className="flex items-center justify-center w-6 h-6 bg-blue-600 rounded-full flex-shrink-0">
                  <Users className="w-3 h-3 text-white" />
                </div>
                <span className="flex-1 text-sm text-zinc-100 truncate">{band.name}</span>
                {band.id === currentBand?.id && (
                  <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
