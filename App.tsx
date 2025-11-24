import React, { useState, useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { SetlistManager } from './components/SetlistManager';
import { SongDetail } from './components/SongDetail';
import { Settings } from './components/Settings';
import { BandDashboard } from './components/BandDashboard';
import { PerformanceMode } from './components/PerformanceMode';
import { ScheduleManager } from './components/ScheduleManager';
import { PracticeRoom } from './components/PracticeRoom';
import { Login } from './components/Login';
import { Song, ViewState, BandMember, BandEvent } from './types';
import { INITIAL_SONGS, DEFAULT_MEMBERS, DEFAULT_ROLES, DEFAULT_EVENTS, withDefaults } from './constants';
import { StorageService } from './services/storageService';
import { getSupabaseClient, isSupabaseConfigured } from './services/supabaseClient';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentBandId, setCurrentBandId] = useState<string | null>(null);
  const [currentBandName, setCurrentBandName] = useState<string>('');
  const [userBands, setUserBands] = useState<Array<{ id: string; name: string }>>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Ref to track current band ID for race condition prevention
  const currentBandIdRef = useRef<string | null>(null);

  // Ref to store auth subscription unsubscribe function
  const authUnsubscribeRef = useRef<(() => void) | null>(null);

  // -- State Initialization --
  const [songs, setSongs] = useState<Song[]>([]);
  const [members, setMembers] = useState<BandMember[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [events, setEvents] = useState<BandEvent[]>([]);

  // Keep ref in sync with currentBandId state
  useEffect(() => {
    currentBandIdRef.current = currentBandId;
  }, [currentBandId]);

  // -- Authentication Check --
  // Check if Supabase is configured and user is authenticated
  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      // If Supabase is not configured, skip auth check
      if (!isSupabaseConfigured()) {
        if (mounted) {
          setIsCheckingAuth(false);
          setSession(null);
        }
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        if (mounted) {
          setIsCheckingAuth(false);
        }
        return;
      }

      try {
        // Check for existing session
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(existingSession);
        }

        // Listen for auth changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (mounted) {
            setSession(newSession);
          }
        });

        // Store unsubscribe function in ref immediately
        authUnsubscribeRef.current = () => subscription.unsubscribe();
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        if (mounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    checkAuth();

    // Return cleanup function that directly calls unsubscribe from ref
    return () => {
      mounted = false;
      authUnsubscribeRef.current?.();
      authUnsubscribeRef.current = null;
    };
  }, []);

  // -- Fetch/Create Band for User --
  // After authentication, fetch user's bands or create a new one
  useEffect(() => {
    let cancelled = false;

    const setupBand = async () => {
      // Skip if not using Supabase or no session
      if (!isSupabaseConfigured() || !session) {
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      try {
        // Fetch user's bands with role information
        type UserBandWithBand = {
          band_id: string;
          role: string;
          bands: {
            id: string;
            name: string;
          } | null;
        };

        const { data, error: fetchError } = await supabase
          .from('user_bands')
          .select('band_id, role, bands(id, name)')
          .eq('user_id', session.user.id);

        const userBandsData = data as UserBandWithBand[] | null;

        if (cancelled) return;

        if (fetchError) {
          console.error('Error fetching bands:', fetchError);
          setIsLoading(false);
          return;
        }

        // If user has bands, use the first one
        if (userBandsData && userBandsData.length > 0) {
          const bands = userBandsData
            .filter(ub => ub.bands !== null)
            .map(ub => ({
              id: ub.bands!.id,
              name: ub.bands!.name,
            }));

          if (bands.length === 0) {
            if (!cancelled) {
              setIsLoading(false);
            }
            return;
          }

          if (cancelled) return;

          setUserBands(bands);
          setCurrentBandId(bands[0].id);
          setCurrentBandName(bands[0].name);

          // Fetch user's role in this band
          const firstBandData = userBandsData[0];
          const userRole = firstBandData.role || 'member';
          setIsAdmin(userRole === 'admin');

          // Set band context in storage service
          StorageService.setCurrentBand?.(bands[0].id);
        } else {
          // No bands found - create a new one for this user
          const { data: newBand, error: createError } = await supabase
            .from('bands')
            .insert({
              name: 'My Band',
              created_by: session.user.id,
            })
            .select()
            .single();

          if (cancelled) return;

          if (createError || !newBand) {
            console.error('Error creating band:', createError);
            setIsLoading(false);
            return;
          }

          // Add user to the band as admin
          const userBandData = {
            user_id: session.user.id,
            band_id: newBand.id,
            role: 'admin',
          };
          const { error: joinError } = await supabase
            .from('user_bands')
            .insert(userBandData as never);

          if (cancelled) return;

          if (joinError) {
            console.error('Error joining band:', joinError);
            setIsLoading(false);
            return;
          }

          setUserBands([{ id: newBand.id, name: newBand.name }]);
          setCurrentBandId(newBand.id);
          setCurrentBandName(newBand.name);
          setIsAdmin(true); // Creator is always admin

          // Set band context in storage service
          StorageService.setCurrentBand?.(newBand.id);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error setting up band:', error);
          setIsLoading(false);
        }
      }
    };

    if (!isCheckingAuth) {
      setupBand();
    }

    return () => {
      cancelled = true;
    };
  }, [session, isCheckingAuth]);

  // -- Load Data on Mount --
  // Async loading to support both localStorage and Supabase
  // Only load data after auth check and band setup is complete
  useEffect(() => {
    // Wait for auth check to complete
    if (isCheckingAuth) return;

    // If using Supabase, wait for band to be set
    if (isSupabaseConfigured() && session && !currentBandId) return;

    // Cancellation flag to prevent race conditions
    let isCancelled = false;

    const loadData = async () => {
      try {
        const data = await StorageService.load();

        // Check if this effect was cancelled before updating state
        if (isCancelled) return;

        const appData = withDefaults(data);
        setSongs(appData.songs);
        setMembers(appData.members);
        setAvailableRoles(appData.roles);
        setEvents(appData.events);
      } catch (error) {
        if (isCancelled) return;

        console.error('Error loading data:', error);
        // Fall back to defaults on error
        setSongs(INITIAL_SONGS);
        setMembers(DEFAULT_MEMBERS);
        setAvailableRoles(DEFAULT_ROLES);
        setEvents(DEFAULT_EVENTS);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    // Cleanup function to cancel stale loads
    return () => {
      isCancelled = true;
    };
  }, [isCheckingAuth, currentBandId, session]);

  // -- Auto-Save Effect --
  // Whenever core data changes, save to storage (debounced to avoid excessive saves)
  useEffect(() => {
    if (isLoading) return; // Don't save during initial load

    const saveData = async () => {
      try {
        await StorageService.save(songs, members, availableRoles, events);
      } catch (error) {
        console.error('Error saving data:', error);
      }
    };

    saveData();
  }, [songs, members, availableRoles, events, isLoading]);

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
    setSelectedSongId(null);
  };

  const handleSelectSong = (songId: string) => {
    setSelectedSongId(songId);
    setCurrentView('SONG_DETAIL');
  };

  const handleUpdateSong = (updatedSong: Song) => {
    setSongs(songs.map(s => (s.id === updatedSong.id ? updatedSong : s)));
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      await supabase.auth.signOut();
      setSession(null);
      // Data will be cleared when user logs back in
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSelectBand = async (bandId: string) => {
    const selectedBand = userBands.find(b => b.id === bandId);
    if (!selectedBand) return;

    // Update ref BEFORE state to prevent race conditions
    currentBandIdRef.current = bandId;
    setCurrentBandId(bandId);
    setCurrentBandName(selectedBand.name);

    // Update storage service context
    StorageService.setCurrentBand?.(bandId);

    // Reload data for the new band
    setIsLoading(true);
    try {
      const data = await StorageService.load();

      // Check if band changed while loading (race condition prevention)
      if (currentBandIdRef.current !== bandId) {
        return;
      }

      const appData = withDefaults(data);
      setSongs(appData.songs);
      setMembers(appData.members);
      setAvailableRoles(appData.roles);
      setEvents(appData.events);

      // Fetch user's role in this band
      const supabase = getSupabaseClient();
      if (supabase && session) {
        // Check again before making the role query
        if (currentBandIdRef.current !== bandId) return;

        const { data: userBandData } = await supabase
          .from('user_bands')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('band_id', bandId)
          .single();

        // Final check before updating admin status
        if (currentBandIdRef.current === bandId) {
          setIsAdmin(userBandData?.role === 'admin');
        }
      }
    } catch (error) {
      // Only show error if this is still the current band
      if (currentBandIdRef.current === bandId) {
        console.error('Error loading band data:', error);
      }
    } finally {
      // Only clear loading if this is still the current band
      if (currentBandIdRef.current === bandId) {
        setIsLoading(false);
      }
    }
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
      return <PerformanceMode songs={songs} onExit={() => setCurrentView('DASHBOARD')} />;
    }

    switch (currentView) {
      case 'DASHBOARD':
        return <Dashboard songs={songs} onNavigateToSong={handleSelectSong} events={events} />;
      case 'SCHEDULE':
        return (
          <ScheduleManager
            events={events}
            setEvents={setEvents}
            songs={songs}
            onNavigateToSong={handleSelectSong}
          />
        );
      case 'BAND_DASHBOARD':
        return (
          <BandDashboard members={members} songs={songs} onNavigateToSong={handleSelectSong} />
        );
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
            currentBandId={currentBandId || undefined}
            currentUserId={session?.user?.id}
            isAdmin={isAdmin}
          />
        );
      case 'PRACTICE_ROOM':
        return <PracticeRoom songs={songs} onNavigateToSong={handleSelectSong} />;
      default:
        return <Dashboard songs={songs} onNavigateToSong={handleSelectSong} events={events} />;
    }
  };

  if (currentView === 'PERFORMANCE_MODE') {
    return renderContent();
  }

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-100">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login screen if Supabase is configured but user is not authenticated
  if (isSupabaseConfigured() && !session) {
    return (
      <Login
        onLoginSuccess={() => {
          // Session will be set by the auth state change listener
          // Just need to trigger re-render
        }}
      />
    );
  }

  // Show loading screen while data is loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-100">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-lg">Loading Band Assist...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'SONG_DETAIL') {
    return renderContent();
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 font-sans text-zinc-100">
      <Navigation
        currentView={currentView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        showLogout={isSupabaseConfigured() && !!session}
        currentBandName={currentBandName}
        userBands={userBands}
        onSelectBand={handleSelectBand}
      />
      <main className="flex-1 h-screen overflow-y-auto">{renderContent()}</main>
    </div>
  );
};

export default App;
