
import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { SetlistManager } from './components/SetlistManager';
import { SongDetail } from './components/SongDetail';
import { Settings } from './components/Settings';
import { BandDashboard } from './components/BandDashboard';
import { PerformanceMode } from './components/PerformanceMode';
import { ScheduleManager } from './components/ScheduleManager';
import { PracticeRoom } from './components/PracticeRoom';
import { Song, ViewState, BandMember, BandEvent } from './types';
import { INITIAL_SONGS } from './constants';
import { StorageService } from './services/storageService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  
  // -- State Initialization --
  // We use lazy initialization to try loading from storage first, falling back to defaults
  const [songs, setSongs] = useState<Song[]>(() => {
     const data = StorageService.load();
     return data.songs || INITIAL_SONGS;
  });

  const [members, setMembers] = useState<BandMember[]>(() => {
     const data = StorageService.load();
     return data.members || [
        { id: '1', name: 'Brother 1', roles: ['Lead Guitar', 'Lead Vocals'], avatarColor: 'bg-blue-500' },
        { id: '2', name: 'Brother 2', roles: ['Rhythm Guitar'], avatarColor: 'bg-red-500' },
        { id: '3', name: 'Brother 3', roles: ['Bass Guitar'], avatarColor: 'bg-green-500' },
        { id: '4', name: 'Brother 4', roles: ['Drums'], avatarColor: 'bg-yellow-500' },
     ];
  });

  const [availableRoles, setAvailableRoles] = useState<string[]>(() => {
      const data = StorageService.load();
      return data.roles || [
        'Lead Guitar', 'Rhythm Guitar', 'Bass Guitar', 'Drums', 'Synthesizer', 'Lead Vocals', 'Backing Vocals'
      ];
  });

  const [events, setEvents] = useState<BandEvent[]>(() => {
      const data = StorageService.load();
      // Default placeholder event if none exist
      return data.events || [
          { id: '1', title: 'Weekly Practice', date: new Date().toISOString().split('T')[0], type: 'PRACTICE', time: '19:00' }
      ];
  });

  // -- Auto-Save Effect --
  // Whenever core data changes, save to local storage
  useEffect(() => {
      StorageService.save(songs, members, availableRoles, events);
  }, [songs, members, availableRoles, events]);

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
    setSelectedSongId(null);
  };

  const handleSelectSong = (songId: string) => {
    setSelectedSongId(songId);
    setCurrentView('SONG_DETAIL');
  };

  const handleUpdateSong = (updatedSong: Song) => {
    setSongs(songs.map(s => s.id === updatedSong.id ? updatedSong : s));
  };

  const renderContent = () => {
    if (currentView === 'SONG_DETAIL' && selectedSongId) {
      const song = songs.find(s => s.id === selectedSongId);
      if (song) {
        return (
          <SongDetail 
            song={song} 
            members={members}
            availableRoles={availableRoles}
            onBack={() => setCurrentView('DASHBOARD')} 
            onUpdateSong={handleUpdateSong}
          />
        );
      }
    }

    if (currentView === 'PERFORMANCE_MODE') {
        return (
            <PerformanceMode 
                songs={songs} 
                onExit={() => setCurrentView('DASHBOARD')} 
            />
        );
    }

    switch (currentView) {
      case 'DASHBOARD':
        return <Dashboard songs={songs} onNavigateToSong={handleSelectSong} events={events} />;
      case 'SCHEDULE':
        return <ScheduleManager events={events} setEvents={setEvents} songs={songs} onNavigateToSong={handleSelectSong} />;
      case 'BAND_DASHBOARD':
        return <BandDashboard members={members} songs={songs} onNavigateToSong={handleSelectSong} />;
      case 'SETLIST':
        return <SetlistManager songs={songs} setSongs={setSongs} onSelectSong={handleSelectSong} />;
      case 'SETTINGS':
        return (
            <Settings 
                members={members} 
                setMembers={setMembers} 
                availableRoles={availableRoles}
                setAvailableRoles={setAvailableRoles}
                songs={songs}
                setSongs={setSongs}
                events={events}
                setEvents={setEvents}
            />
        );
      case 'PRACTICE_ROOM':
        return (
            <PracticeRoom 
                songs={songs}
                onNavigateToSong={handleSelectSong}
            />
        );
      default:
        return <Dashboard songs={songs} onNavigateToSong={handleSelectSong} events={events} />;
    }
  };

  if (currentView === 'PERFORMANCE_MODE') {
      return renderContent();
  }

  if (currentView === 'SONG_DETAIL') {
    return renderContent();
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 font-sans text-zinc-100">
      <Navigation currentView={currentView} onNavigate={handleNavigate} />
      <main className="flex-1 h-screen overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
