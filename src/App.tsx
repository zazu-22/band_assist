import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
  Outlet,
} from 'react-router-dom';
import { toast, LoadingScreen } from './components/ui';
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
import { Signup } from './components/Signup';
import { PasswordReset } from './components/PasswordReset';
import { PasswordUpdate } from './components/PasswordUpdate';
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
import { Menu, X } from 'lucide-react';
import { useLayoutShortcuts } from './hooks/useLayoutShortcuts';

/**
 * Context value interface for the AppContext.
 * Contains all shared application state and update functions.
 */
interface AppContextValue {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  members: BandMember[];
  setMembers: React.Dispatch<React.SetStateAction<BandMember[]>>;
  availableRoles: string[];
  setAvailableRoles: React.Dispatch<React.SetStateAction<string[]>>;
  events: BandEvent[];
  setEvents: React.Dispatch<React.SetStateAction<BandEvent[]>>;
  handleUpdateSong: (song: Song) => void;
  session: Session | null;
  currentBandId: string | null;
  isAdmin: boolean;
  // Layout state for collapsible sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  // Mobile drawer state
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

/**
 * React Context for sharing application state across route components.
 * Must be used within the App component tree (inside BrowserRouter).
 */
const AppContext = React.createContext<AppContextValue | null>(null);

/**
 * Hook to access the application context.
 * Provides access to songs, members, roles, events, and their update functions.
 * @throws Error if used outside of the App component tree
 * @returns The application context value
 */
export const useAppContext = (): AppContextValue => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error(
      'useAppContext must be used within App component (inside BrowserRouter and AppContext.Provider)'
    );
  }
  return context;
};

/**
 * Route wrapper component for SongDetail.
 * Extracts songId from URL params and connects to AppContext.
 * Handles missing songs with toast notification and redirect.
 */
const SongDetailRoute: React.FC = () => {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const { songs, members, availableRoles, handleUpdateSong } = useAppContext();

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
      onBack={() => navigate(ROUTES.DASHBOARD)}
      onUpdateSong={handleUpdateSong}
    />
  );
};

/**
 * Route wrapper component for PracticeRoom.
 * Provides song navigation callback using route constants.
 */
const PracticeRoomRoute: React.FC = () => {
  const navigate = useNavigate();
  const { songs } = useAppContext();

  return <PracticeRoom songs={songs} onNavigateToSong={id => navigate(getSongDetailRoute(id))} />;
};

/**
 * Layout wrapper for authenticated routes with navigation sidebar.
 * Uses React Router's Outlet for rendering nested route content.
 * Includes mobile drawer navigation with focus management.
 */
const AppLayout: React.FC<{
  onLogout: () => void;
  showLogout: boolean;
  currentBandName: string;
  userBands: Array<{ id: string; name: string }>;
  onSelectBand: (bandId: string) => void;
}> = ({ onLogout, showLogout, currentBandName, userBands, onSelectBand }) => {
  const { mobileNavOpen, setMobileNavOpen } = useAppContext();
  const location = useLocation();

  // Enable keyboard shortcuts for layout (Cmd/Ctrl+B to toggle sidebar)
  useLayoutShortcuts();

  // Refs for focus management
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close drawer on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, setMobileNavOpen]);

  // Focus management: focus close button when drawer opens, return focus when closed
  useEffect(() => {
    if (mobileNavOpen) {
      closeButtonRef.current?.focus();
    } else {
      menuButtonRef.current?.focus();
    }
  }, [mobileNavOpen]);

  // Handle Escape key to close drawer
  useEffect(() => {
    if (!mobileNavOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileNavOpen, setMobileNavOpen]);

  return (
    <div className="flex min-h-screen bg-zinc-950 font-sans text-zinc-100">
      {/* Mobile overlay - clicking closes drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - drawer on mobile, static on desktop */}
      <div
        className={`
          lg:relative lg:translate-x-0
          fixed top-0 left-0 h-full z-50
          transform transition-transform duration-300 ease-in-out motion-reduce:transition-none
          ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        role={mobileNavOpen ? 'dialog' : undefined}
        aria-modal={mobileNavOpen ? 'true' : undefined}
        aria-label={mobileNavOpen ? 'Navigation menu' : undefined}
      >
        {/* Close button inside drawer (mobile only) */}
        {mobileNavOpen && (
          <button
            type="button"
            ref={closeButtonRef}
            onClick={() => setMobileNavOpen(false)}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-100 z-10 lg:hidden"
            aria-label="Close navigation menu"
          >
            <X size={24} />
          </button>
        )}
        <Navigation
          onLogout={onLogout}
          showLogout={showLogout}
          currentBandName={currentBandName}
          userBands={userBands}
          onSelectBand={onSelectBand}
        />
      </div>

      {/* Mobile menu button */}
      <button
        type="button"
        ref={menuButtonRef}
        onClick={() => setMobileNavOpen(true)}
        className="fixed top-4 left-4 z-30 p-2 bg-zinc-900 rounded-lg shadow-lg lg:hidden"
        aria-label="Open navigation menu"
        aria-expanded={mobileNavOpen}
        aria-controls="mobile-nav"
      >
        <Menu size={24} />
      </button>

      <main className="flex-1 h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
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

  // -- Layout State --
  // Sidebar collapsed state with localStorage persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sdb_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Mobile drawer state
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  // Persist sidebar collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sdb_sidebar_collapsed', String(sidebarCollapsed));
    } catch {
      // localStorage may be unavailable
    }
  }, [sidebarCollapsed]);

  // Context value for child routes - memoized to prevent unnecessary re-renders
  const contextValue = useMemo<AppContextValue>(
    () => ({
      songs,
      setSongs,
      members,
      setMembers,
      availableRoles,
      setAvailableRoles,
      events,
      setEvents,
      handleUpdateSong,
      session,
      currentBandId,
      isAdmin,
      sidebarCollapsed,
      setSidebarCollapsed,
      mobileNavOpen,
      setMobileNavOpen,
    }),
    [
      songs,
      members,
      availableRoles,
      events,
      session,
      currentBandId,
      isAdmin,
      handleUpdateSong,
      sidebarCollapsed,
      mobileNavOpen,
    ]
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
    <AppContext.Provider value={contextValue}>
      <Routes>
        {/* Performance Mode - Full screen, no sidebar */}
        <Route
          path={ROUTES.PERFORMANCE}
          element={<PerformanceMode songs={songs} onExit={() => navigate(ROUTES.DASHBOARD)} />}
        />

        {/* Song Detail - Full screen, no sidebar */}
        <Route path={`${ROUTES.SONG_DETAIL}/:songId`} element={<SongDetailRoute />} />

        {/* Practice Room with specific song */}
        <Route path={`${ROUTES.SONG_DETAIL}/:songId/practice`} element={<PracticeRoomRoute />} />

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
              />
            }
          />
          <Route
            path={ROUTES.PRACTICE}
            element={
              <PracticeRoom
                songs={songs}
                onNavigateToSong={id => navigate(getSongDetailRoute(id))}
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
    </AppContext.Provider>
  );
};

export default App;
