import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ViewState } from '../types';
import {
  LayoutDashboard,
  Music,
  ListMusic,
  Mic2,
  Settings,
  Users,
  CalendarClock,
  Radio,
  LogOut,
} from 'lucide-react';
import { BandSelector } from './BandSelector';

interface NavigationProps {
  currentView: ViewState;
  onLogout?: () => void;
  showLogout?: boolean;
  currentBandName?: string;
  userBands?: Array<{ id: string; name: string }>;
  onSelectBand?: (bandId: string) => void;
}

// Map view IDs to URL paths
const viewToPath: Record<string, string> = {
  DASHBOARD: '/',
  PRACTICE_ROOM: '/practice',
  SETLIST: '/setlist',
  SCHEDULE: '/schedule',
  BAND_DASHBOARD: '/band',
  SETTINGS: '/settings',
  PERFORMANCE_MODE: '/performance',
};

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onLogout,
  showLogout = false,
  currentBandName,
  userBands = [],
  onSelectBand,
}) => {
  const navigate = useNavigate();

  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'PRACTICE_ROOM', label: 'Practice Room', icon: Mic2 },
    { id: 'SETLIST', label: 'Setlist Builder', icon: ListMusic },
    { id: 'SCHEDULE', label: 'Schedule', icon: CalendarClock },
    { id: 'BAND_DASHBOARD', label: 'Band Lineup', icon: Users },
  ];

  const handleNavigate = (viewId: string) => {
    const path = viewToPath[viewId] || '/';
    navigate(path);
  };

  return (
    <div className="w-20 lg:w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center justify-center lg:justify-start gap-3">
        <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-900/20">
          <Music className="text-white w-6 h-6" />
        </div>
        <h1 className="hidden lg:block text-xl font-bold tracking-tighter text-zinc-100">
          BAND
          <br />
          <span className="text-amber-600">ASSIST</span>
        </h1>
      </div>

      {/* Band Selector (only show if using Supabase) */}
      {currentBandName && userBands.length > 0 && onSelectBand && (
        <BandSelector
          currentBandName={currentBandName}
          bands={userBands}
          onSelectBand={onSelectBand}
        />
      )}

      <nav className="flex-1 px-3 py-6 space-y-2" aria-label="Main navigation">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${currentView === item.id
              ? 'bg-zinc-800 text-amber-500 shadow-inner'
              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
              }`}
            aria-label={item.label}
          >
            <item.icon
              className={`w-6 h-6 ${currentView === item.id ? 'stroke-amber-500' : 'group-hover:stroke-zinc-100'}`}
            />
            <span className="hidden lg:block font-medium">{item.label}</span>
          </button>
        ))}

        {/* Live Mode Separator */}
        <div className="pt-4 pb-2 px-3">
          <div className="h-px bg-zinc-800 mb-4"></div>
          <button
            onClick={() => handleNavigate('PERFORMANCE_MODE')}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${currentView === 'PERFORMANCE_MODE'
              ? 'bg-red-900/20 text-red-500 shadow-inner border border-red-900/50'
              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-red-400'
              }`}
            aria-label="Performance Mode"
          >
            <Radio
              className={`w-6 h-6 ${currentView === 'PERFORMANCE_MODE' ? 'stroke-red-500' : 'group-hover:stroke-red-400'}`}
            />
            <span className="hidden lg:block font-bold tracking-wide">Performance Mode</span>
          </button>
        </div>
      </nav>

      <div className="p-4 border-t border-zinc-800 space-y-2">
        <button
          onClick={() => handleNavigate('SETTINGS')}
          className={`w-full flex items-center gap-3 px-3 py-3 text-zinc-500 rounded-xl hover:bg-zinc-800 hover:text-zinc-100 transition-all ${currentView === 'SETTINGS' ? 'bg-zinc-800 text-white' : ''}`}
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
          <span className="hidden lg:block text-sm font-medium">Config</span>
        </button>

        {/* Logout Button (only shown when authenticated with Supabase) */}
        {showLogout && onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-3 text-zinc-500 rounded-xl hover:bg-red-900/20 hover:text-red-400 transition-all group"
            aria-label="Log out"
          >
            <LogOut className="w-5 h-5 group-hover:stroke-red-400" />
            <span className="hidden lg:block text-sm font-medium">Logout</span>
          </button>
        )}
      </div>
    </div>
  );
};
