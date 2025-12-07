import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import { toast, LoadingScreen } from './components/ui';
import { Session } from '@supabase/supabase-js';
import {
  AppActionsContext,
  AppDataContext,
  AppStatusContext,
  type AppActionsContextValue,
  type AppDataContextValue,
  type AppStatusContextValue,
} from './contexts';

// Eagerly loaded - small, frequently used components
import { Dashboard } from './components/Dashboard';
import { SetlistManager } from './components/SetlistManager';
import { Settings } from './components/Settings';
import { BandDashboard } from './components/BandDashboard';
import { ScheduleManager } from './components/ScheduleManager';
import { PracticeHistory } from './components/PracticeHistory';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { PasswordReset } from './components/PasswordReset';
import { PasswordUpdate } from './components/PasswordUpdate';

// Lazy loaded - heavy components that use AlphaTab or have complex features
const SongDetail = lazy(() =>
  import('./components/SongDetail').then(module => ({ default: module.SongDetail }))
);
const PerformanceMode = lazy(() =>
  import('./components/PerformanceMode').then(module => ({ default: module.PerformanceMode }))
);
const PracticeRoom = lazy(() =>
  import('./components/PracticeRoom').then(module => ({ default: module.PracticeRoom }))
);
import { Song, BandMember, BandEvent } from './types';
import {
  INITIAL_SONGS,
  DEFAULT_MEMBERS,
  DEFAULT_ROLES,
  DEFAULT_EVENTS,
  withDefaults,
} from './constants';
import { StorageService } from './services/storageService';
import { getSupabaseClient, isSupabaseConfigured } from './services/supabaseClient';
import { ROUTES, getSongDetailRoute } from './routes';
import { useLayoutShortcuts } from './hooks/useLayoutShortcuts';
import { ThemeProvider } from './components/ui/ThemeProvider';
import { SidebarProvider, AppShell } from './components/layout';

// Re-export useAppContext from contexts for backwards compatibility
// Components importing from App.tsx will continue to work
export { useAppContext } from './contexts';

// Import hooks for internal use in route components
import { useAppActions, useAppData } from './contexts';

/**
 * Route wrapper component for SongDetail.
 * Extracts songId from URL params and connects to AppContext.
 * Handles missing songs with toast notification and redirect.
 */
const SongDetailRoute: React.FC = () => {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const { songs, members, availableRoles } = useAppData();
  const { handleUpdateSong } = useAppActions();

  const song = songs.find(s => s.id === songId);

  // Handle missing song with useEffect to avoid toast on every render
  useEffect(() => {
    if (!song) {
      toast.error('Song not found');
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [song, navigate]);

  if (!song) {
    return null;
  }

  return (
    <SongDetail
      song={song}
      members={members}
      availableRoles={availableRoles}
      onBack={() => navigate(ROUTES.SETLIST)}
      onUpdateSong={handleUpdateSong}
    />
  );
};

/**
 * Route wrapper component for PracticeRoom with song-specific routing.
 * Extracts songId from URL params (for /songs/:songId/practice route)
 * and provides song navigation callback.
 */
const PracticeRoomRoute: React.FC = () => {
  const navigate = useNavigate();
  const { songId } = useParams<{ songId: string }>();
  const { songs } = useAppData();

  return (
    <PracticeRoom
      songs={songs}
      onNavigateToSong={id => navigate(getSongDetailRoute(id))}
      initialSongId={songId}
    />
  );
};

/**
 * Route wrapper component for PracticeRoom with query parameter support.
 * Extracts songId from query params (for /practice?songId=xxx route)
 * and provides song navigation callback.
 */
const PracticeRoomWithQueryParam: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { songs } = useAppData();
  const initialSongId = searchParams.get('songId');

  return (
    <PracticeRoom
      songs={songs}
      onNavigateToSong={id => navigate(getSongDetailRoute(id))}
      initialSongId={initialSongId}
    />
  );
};

/**
 * Layout wrapper for authenticated routes with navigation sidebar.
 * Uses the new AppShell component with SidebarProvider for state management.
 */
const AppLayout: React.FC<{
  onLogout: () => void;
  showLogout: boolean;
  currentBandName: string;
  userBands: Array<{ id: string; name: string }>;
  onSelectBand: (bandId: string) => void;
}> = ({ onLogout, showLogout, currentBandName, userBands, onSelectBand }) => {
  // Enable keyboard shortcuts for layout (Cmd/Ctrl+B to toggle sidebar)
  useLayoutShortcuts();

  return (
    <AppShell
      onLogout={onLogout}
      showLogout={showLogout}
      currentBandName={currentBandName}
      userBands={userBands}
      onSelectBand={onSelectBand}
    />
  );
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  // -- Auto-Save Configuration --
  const AUTOSAVE_DEBOUNCE_MS = 1000;

  /** Data structure for pending saves */
  type SaveData = {
    songs: Song[];
    members: BandMember[];
    roles: string[];
    events: BandEvent[];
  };

  // -- Save Status State --
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<SaveData | null>(null);
  /** Ref to track in-progress saves, preventing concurrent save operations */
  const isSavingRef = useRef(false);

  // Keep ref in sync with currentBandId state
  useEffect(() => {
    currentBandIdRef.current = currentBandId;
  }, [currentBandId]);

  // Check for password reset hash in URL
  // Only process after session check is complete to avoid race conditions
  useEffect(() => {
    // Wait for session check to complete
    if (isCheckingAuth) return;

    const hash = window.location.hash;

    // Check for our custom redirect (#password-update)
    if (hash === '#password-update') {
      navigate(ROUTES.PASSWORD_UPDATE, { replace: true });
      return;
    }

    // Check for Supabase recovery token in hash
    // Format: #access_token=...&type=recovery&...
    if (hash.includes('type=recovery')) {
      navigate(ROUTES.PASSWORD_UPDATE, { replace: true });
    }
  }, [isCheckingAuth, navigate]);

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
          error: sessionError,
        } = await supabase.auth.getSession();

        // Handle invalid/expired refresh tokens by signing out
        // This clears stale tokens and redirects to login
        if (sessionError) {
          console.warn('Session error, signing out:', sessionError.message);
          await supabase.auth.signOut();
          if (mounted) {
            setSession(null);
          }
        } else if (mounted) {
          setSession(existingSession);
        }

        // Listen for auth changes (SIGNED_OUT on token refresh failure sets newSession to null)
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (mounted) {
            setSession(newSession);
          }
        });

        // Store unsubscribe function in ref immediately to prevent memory leaks
        // if component unmounts while async auth check is in progress
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

  // -- Debounced Auto-Save Effect --
  /**
   * Save function that can be called immediately (for beforeunload) or debounced.
   * Empty dependency array is intentional: this callback only uses setState functions
   * and refs which are stable across renders. StorageService.save and toast.error
   * are module-level imports that don't change.
   */
  const performSave = useCallback(async (data: SaveData, showToast = true) => {
    // Prevent concurrent saves
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);

    // Show loading toast (only for user-visible saves, not cleanup saves)
    const toastId = showToast ? toast.loading('Saving...') : undefined;

    try {
      await StorageService.save(data.songs, data.members, data.roles, data.events);
      setLastSaved(new Date());
      pendingSaveRef.current = null;

      // Update toast to success and auto-dismiss
      if (toastId) {
        toast.success('Saved', { id: toastId, duration: 2000 });
      }
    } catch (error) {
      console.error('Error saving data:', error);
      if (toastId) {
        toast.error('Failed to save changes', { id: toastId });
      } else {
        toast.error('Failed to save changes');
      }
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, []);

  // Debounced auto-save effect
  useEffect(() => {
    if (isLoading) return; // Don't save during initial load

    // Store pending data for beforeunload handler
    pendingSaveRef.current = {
      songs,
      members,
      roles: availableRoles,
      events,
    };

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout with configurable debounce
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        performSave(pendingSaveRef.current);
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    // Cleanup: clear timeout and save pending data on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Save pending data immediately on cleanup (e.g., auth expiration, unmount)
      // Skip if a save is already in progress to prevent concurrent saves
      if (!isSavingRef.current && pendingSaveRef.current) {
        // Fire and forget - attempt to save before component unmounts
        StorageService.save(
          pendingSaveRef.current.songs,
          pendingSaveRef.current.members,
          pendingSaveRef.current.roles,
          pendingSaveRef.current.events
        ).catch(error => console.error('Error saving on cleanup:', error));
      }
    };
  }, [songs, members, availableRoles, events, isLoading, performSave]);

  /**
   * Beforeunload Handler - Last-resort save attempt
   *
   * LIMITATION: StorageService.save() is async (uses Supabase), so this save
   * may not complete before page unload. This is a known browser limitation -
   * async operations in beforeunload handlers are not guaranteed to finish.
   *
   * For reliable saves, we rely on:
   * 1. visibilitychange handler (below) - fires when tab becomes hidden, more
   *    reliable for async saves as the page isn't immediately destroyed
   * 2. Effect cleanup (above) - fires on component unmount for in-app navigation
   *
   * This handler serves as a best-effort fallback for hard page closes/refreshes.
   * navigator.sendBeacon() would be more reliable but requires a dedicated
   * server endpoint to receive the data.
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Skip if a save is already in progress to prevent concurrent saves
      if (!isSavingRef.current && pendingSaveRef.current) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        // Best-effort async save - may not complete before page unload
        StorageService.save(
          pendingSaveRef.current.songs,
          pendingSaveRef.current.members,
          pendingSaveRef.current.roles,
          pendingSaveRef.current.events
        ).catch(error => console.error('Error saving on unload:', error));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // -- Visibility Change Handler --
  // Save when tab becomes hidden (more reliable than beforeunload for async saves)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && pendingSaveRef.current) {
        // Clear debounce and save immediately when tab becomes hidden
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        // Fire and forget - better chance of completing than beforeunload
        // Don't show toast for background saves (user won't see it anyway)
        performSave(pendingSaveRef.current, false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [performSave]);

  const handleUpdateSong = useCallback((updatedSong: Song) => {
    setSongs(prevSongs => prevSongs.map(s => (s.id === updatedSong.id ? updatedSong : s)));
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      await supabase.auth.signOut();
      setSession(null);
      navigate(ROUTES.LOGIN);
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

  // Memoize actions context - only changes when action-related values change
  // This prevents re-renders of components that only consume actions when data changes
  const actionsContextValue = useMemo<AppActionsContextValue>(
    () => ({
      handleUpdateSong,
      session,
      currentBandId,
      isAdmin,
    }),
    [handleUpdateSong, session, currentBandId, isAdmin]
  );

  // Memoize data context - only changes when data values change
  // This prevents re-renders of components that only consume data when actions change
  const dataContextValue = useMemo<AppDataContextValue>(
    () => ({
      songs,
      setSongs,
      members,
      setMembers,
      availableRoles,
      setAvailableRoles,
      events,
      setEvents,
    }),
    [songs, members, availableRoles, events]
  );

  // Memoize status context - changes frequently on auto-save
  // Separated from actions to prevent cascade re-renders of components that don't need save status
  const statusContextValue = useMemo<AppStatusContextValue>(
    () => ({
      isSaving,
      lastSaved,
    }),
    [isSaving, lastSaved]
  );

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Show auth screens if Supabase is configured but user is not authenticated
  if (isSupabaseConfigured() && !session) {
    // Check if we're on the password-update route
    if (location.pathname === ROUTES.PASSWORD_UPDATE) {
      return (
        <PasswordUpdate
          onSuccess={() => {
            // Clear the hash and redirect to login
            window.location.hash = '';
            navigate(ROUTES.LOGIN);
          }}
          onNavigate={(view: string) => {
            if (view === 'LOGIN') navigate(ROUTES.LOGIN);
            else if (view === 'SIGNUP') navigate(ROUTES.SIGNUP);
          }}
        />
      );
    }

    return (
      <Routes>
        <Route
          path={ROUTES.SIGNUP}
          element={
            <Signup
              onSignupSuccess={() => navigate(ROUTES.DASHBOARD)}
              onNavigate={(view: string) => {
                if (view === 'LOGIN') navigate(ROUTES.LOGIN);
              }}
            />
          }
        />
        <Route
          path={ROUTES.PASSWORD_RESET}
          element={
            <PasswordReset
              onNavigate={(view: string) => {
                if (view === 'LOGIN') navigate(ROUTES.LOGIN);
              }}
            />
          }
        />
        <Route
          path="*"
          element={
            <Login
              onLoginSuccess={() => navigate(ROUTES.DASHBOARD)}
              onNavigate={(view: string) => {
                if (view === 'SIGNUP') navigate(ROUTES.SIGNUP);
                else if (view === 'PASSWORD_RESET') navigate(ROUTES.PASSWORD_RESET);
              }}
            />
          }
        />
      </Routes>
    );
  }

  // Show loading screen while data is loading
  if (isLoading) {
    return <LoadingScreen message="Loading Band Assist..." />;
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="band-assist-theme">
      <SidebarProvider>
        <AppActionsContext.Provider value={actionsContextValue}>
          <AppDataContext.Provider value={dataContextValue}>
            <AppStatusContext.Provider value={statusContextValue}>
              <Routes>
              {/* Performance Mode - Full screen, no sidebar (lazy loaded) */}
              <Route
                path={ROUTES.PERFORMANCE}
                element={
                  <Suspense fallback={<LoadingScreen message="Loading Performance Mode..." />}>
                    <PerformanceMode
                      songs={songs}
                      onExit={() => navigate(ROUTES.DASHBOARD)}
                      currentUserId={session?.user?.id}
                      currentBandId={currentBandId}
                    />
                  </Suspense>
                }
              />

              {/* Song Detail - Full screen, no sidebar (lazy loaded) */}
              <Route
                path={`${ROUTES.SONG_DETAIL}/:songId`}
                element={
                  <Suspense fallback={<LoadingScreen message="Loading Song Details..." />}>
                    <SongDetailRoute />
                  </Suspense>
                }
              />

              {/* Practice Room with specific song (lazy loaded) */}
              <Route
                path={`${ROUTES.SONG_DETAIL}/:songId/practice`}
                element={
                  <Suspense fallback={<LoadingScreen message="Loading Practice Room..." />}>
                    <PracticeRoomRoute />
                  </Suspense>
                }
              />

              {/* Layout route for sidebar pages */}
              <Route
                element={
                  <AppLayout
                    onLogout={handleLogout}
                    showLogout={isSupabaseConfigured() && !!session}
                    currentBandName={currentBandName}
                    userBands={userBands}
                    onSelectBand={handleSelectBand}
                  />
                }
              >
                <Route
                  index
                  element={
                    <Dashboard
                      songs={songs}
                      members={members}
                      onNavigateToSong={id => navigate(getSongDetailRoute(id))}
                      events={events}
                    />
                  }
                />
                <Route
                  path={ROUTES.SETLIST}
                  element={
                    <SetlistManager
                      songs={songs}
                      setSongs={setSongs}
                      onSelectSong={id => navigate(getSongDetailRoute(id))}
                      events={events}
                      isAdmin={isAdmin}
                      currentUserId={session?.user?.id || null}
                      currentBandId={currentBandId}
                    />
                  }
                />
                <Route
                  path={ROUTES.PRACTICE}
                  element={
                    <Suspense fallback={<LoadingScreen message="Loading Practice Room..." />}>
                      <PracticeRoomWithQueryParam />
                    </Suspense>
                  }
                />
                <Route
                  path={ROUTES.PRACTICE_HISTORY}
                  element={
                    <PracticeHistory
                      songs={songs}
                      currentUserId={session?.user?.id || null}
                      currentBandId={currentBandId}
                    />
                  }
                />
                <Route
                  path={ROUTES.SCHEDULE}
                  element={
                    <ScheduleManager
                      events={events}
                      setEvents={setEvents}
                      songs={songs}
                      onNavigateToSong={id => navigate(getSongDetailRoute(id))}
                    />
                  }
                />
                <Route
                  path={ROUTES.BAND}
                  element={
                    <BandDashboard
                      members={members}
                      songs={songs}
                      onNavigateToSong={id => navigate(getSongDetailRoute(id))}
                    />
                  }
                />
                <Route
                  path={ROUTES.SETTINGS}
                  element={
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
                  }
                />
                {/* Redirect any unknown routes to dashboard */}
                <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
              </Route>
              </Routes>
            </AppStatusContext.Provider>
          </AppDataContext.Provider>
        </AppActionsContext.Provider>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default App;
