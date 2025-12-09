import React, { useState, useRef, useCallback, memo } from 'react';
import {
  Trash2,
  Edit2,
  Check,
  X,
  Music2,
  Users,
  Database,
  Download,
  Upload,
  AlertTriangle,
  UserPlus,
  Shield,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
  AvatarFallback,
  Badge,
} from '@/components/primitives';
import { toast, ConfirmDialog, DangerousActionDialog } from '@/components/ui';
import { StorageService } from '@/services/storageService';
import { InvitationManager } from '@/components/InvitationManager';
import { LinkAccountSection } from '@/components/LinkAccountSection';
import { BandSettingsSection } from '@/components/BandSettingsSection';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { getAvatarColor, getNextAvatarColor } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import type { BandMember, Song, BandEvent } from '@/types';

type SettingsTab = 'ROSTER' | 'ROLES' | 'TEAM' | 'BAND' | 'DATA';

interface SettingsProps {
  members: BandMember[];
  setMembers: React.Dispatch<React.SetStateAction<BandMember[]>>;
  availableRoles: string[];
  setAvailableRoles: React.Dispatch<React.SetStateAction<string[]>>;
  songs?: Song[];
  setSongs?: React.Dispatch<React.SetStateAction<Song[]>>;
  events?: BandEvent[];
  setEvents?: React.Dispatch<React.SetStateAction<BandEvent[]>>;
  currentBandId?: string;
  currentUserId?: string;
  isAdmin?: boolean;
  /** Current band name for display and editing */
  currentBandName?: string;
  /** Callback when band name is updated */
  onBandNameUpdate?: (newName: string) => void;
  /** Callback when user leaves the band */
  onLeaveBand?: () => Promise<void>;
  /** Callback when band is deleted */
  onDeleteBand?: () => Promise<void>;
}

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  variant: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

/** No-op function for initial dialog state */
const NOOP = () => {};

const INITIAL_DIALOG_STATE: ConfirmDialogState = {
  isOpen: false,
  title: '',
  message: '',
  variant: 'danger',
  onConfirm: NOOP,
};

export const Settings: React.FC<SettingsProps> = memo(function Settings({
  members,
  setMembers,
  availableRoles,
  setAvailableRoles,
  songs = [],
  setSongs,
  events = [],
  setEvents,
  currentBandId,
  currentUserId,
  isAdmin = false,
  currentBandName = '',
  onBandNameUpdate,
  onLeaveBand,
  onDeleteBand,
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ROSTER');
  const showInvitations = isSupabaseConfigured() && currentBandId && currentUserId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Member State ---
  const [newMemberName, setNewMemberName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // --- Role State ---
  const [newRoleName, setNewRoleName] = useState('');

  // --- Confirm Dialog State ---
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(INITIAL_DIALOG_STATE);

  const closeDialog = useCallback(() => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  // --- Dangerous Action Dialog State (Delete All Data) ---
  const [dangerDialogOpen, setDangerDialogOpen] = useState(false);

  const openDangerDialog = useCallback(() => {
    setDangerDialogOpen(true);
  }, []);

  const closeDangerDialog = useCallback(() => {
    setDangerDialogOpen(false);
  }, []);

  const handleDeleteAllData = useCallback(() => {
    setSongs?.([]);
    setMembers([]);
    setAvailableRoles([]);
    setEvents?.([]);
    setDangerDialogOpen(false);
    toast.success('All data has been deleted');
  }, [setSongs, setMembers, setAvailableRoles, setEvents]);

  // --- Member Handlers ---
  const handleAddMember = useCallback(() => {
    if (!newMemberName.trim()) return;
    setMembers(prev => {
      const newMember: BandMember = {
        id: crypto.randomUUID(),
        name: newMemberName,
        roles: [],
        // Compute color based on prev.length to avoid race condition
        avatarColor: getNextAvatarColor(prev.length),
      };
      return [...prev, newMember];
    });
    setNewMemberName('');
  }, [newMemberName, setMembers]);

  const handleRemoveMember = useCallback(
    (id: string) => {
      setConfirmDialog({
        isOpen: true,
        title: 'Remove Member',
        message:
          'Are you sure? Assignments for this member in songs will remain but might look orphaned.',
        variant: 'danger',
        onConfirm: async () => {
          closeDialog();
          try {
            await StorageService.deleteMember(id);
            setMembers(prev => prev.filter(m => m.id !== id));
            toast.success('Member removed successfully');
          } catch (error) {
            console.error('Error removing member:', error);
            toast.error('Failed to remove member. Please try again.');
          }
        },
      });
    },
    [setMembers, closeDialog]
  );

  const startEditing = useCallback((member: BandMember) => {
    setEditingId(member.id);
    setEditName(member.name);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editName.trim()) return;
    setMembers(prev => prev.map(m => (m.id === editingId ? { ...m, name: editName } : m)));
    setEditingId(null);
    setEditName('');
  }, [editName, editingId, setMembers]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditName('');
  }, []);

  // --- Role Handlers ---
  const handleAddRole = useCallback(() => {
    if (!newRoleName.trim() || availableRoles.includes(newRoleName)) return;
    setAvailableRoles(prev => [...prev, newRoleName]);
    setNewRoleName('');
  }, [newRoleName, availableRoles, setAvailableRoles]);

  const handleRemoveRole = useCallback(
    (role: string) => {
      setConfirmDialog({
        isOpen: true,
        title: 'Delete Role',
        message: `Delete role "${role}"? It will still exist on old song assignments but won't be selectable for new ones.`,
        variant: 'warning',
        onConfirm: () => {
          setAvailableRoles(prev => prev.filter(r => r !== role));
          closeDialog();
        },
      });
    },
    [setAvailableRoles, closeDialog]
  );

  // --- Data Handlers ---
  const handleExport = useCallback(() => {
    StorageService.exportData(songs, members, availableRoles, events);
  }, [songs, members, availableRoles, events]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !setSongs || !setEvents) return;

      setConfirmDialog({
        isOpen: true,
        title: 'Import Data',
        message: 'Importing will OVERWRITE your current data. Are you sure?',
        variant: 'danger',
        onConfirm: () => {
          StorageService.importData(file)
            .then(data => {
              setSongs(data.songs);
              setMembers(data.members);
              setAvailableRoles(data.roles);
              setEvents(data.events);
              toast.success('Data imported successfully!');
            })
            .catch(err => {
              console.error(err);
              toast.error('Failed to import data. File might be corrupt.');
            })
            .finally(() => {
              // Reset input after processing to allow re-selecting the same file
              if (fileInputRef.current) fileInputRef.current.value = '';
              closeDialog();
            });
        },
      });
    },
    [setSongs, setEvents, setMembers, setAvailableRoles, closeDialog]
  );

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as SettingsTab);
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-4xl mx-auto">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <header className="mb-8 border-b border-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl font-bold font-serif text-foreground tracking-tight">Configuration</h2>
            <p className="text-muted-foreground mt-1">Band roster, roles, and data backup</p>
          </div>

          <TabsList>
            <TabsTrigger value="ROSTER" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Roster</span>
            </TabsTrigger>
            <TabsTrigger value="ROLES" className="gap-2">
              <Music2 className="h-4 w-4" />
              <span className="hidden sm:inline">Roles</span>
            </TabsTrigger>
            {showInvitations && (
              <TabsTrigger value="TEAM" className="gap-2">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Team</span>
              </TabsTrigger>
            )}
            {showInvitations && (
              <TabsTrigger value="BAND" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Band</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="DATA" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Data</span>
            </TabsTrigger>
          </TabsList>
        </header>

        {/* Roster Tab */}
        <TabsContent value="ROSTER" className="space-y-6 animate-slide-in-from-bottom animation-forwards">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Members</CardTitle>
              <CardDescription>
                Add everyone in the band. You will assign specific roles (Guitar, Bass, etc.) to
                them inside each song.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3">
                {members.map(member => (
                  <div
                    key={member.id}
                    className={cn(
                      'p-4 rounded-lg border border-border flex items-center justify-between',
                      'border-l-[3px] border-l-primary/60 hover:bg-muted/30 transition-colors'
                    )}
                  >
                    {editingId === member.id ? (
                      <div className="flex items-center gap-4 w-full">
                        <Avatar className="opacity-50">
                          <AvatarFallback className={getAvatarColor(member.avatarColor)}>
                            {editName.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="flex-1"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={saveEdit}
                          className="text-success hover:text-success hover:bg-success/10"
                          aria-label="Save edit"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelEdit}
                          aria-label="Cancel edit"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback className={getAvatarColor(member.avatarColor)}>
                              {member.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{member.name}</p>
                            <p className="text-xs text-muted-foreground">ID: {member.id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(member)}
                            aria-label="Edit member"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Remove member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Input
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  placeholder="New Member Name"
                  className="flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                />
                <Button onClick={handleAddMember}>Add Person</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="ROLES" className="space-y-6 animate-slide-in-from-bottom animation-forwards">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Available Roles &amp; Instruments</CardTitle>
              <CardDescription>
                Define the list of instruments or roles that can be assigned in songs (e.g.,
                &quot;Lead Guitar&quot;, &quot;Cowbell&quot;, &quot;Manager&quot;).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {availableRoles.map(role => (
                  <Badge key={role} variant="secondary" className="group pl-3 pr-2 py-1.5 gap-2">
                    {role}
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(role)}
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Remove ${role} role`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex gap-3 max-w-md">
                <Input
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder="New Role (e.g. Saxophone)"
                  className="flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleAddRole()}
                />
                <Button variant="secondary" onClick={handleAddRole}>
                  Add Role
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab - Only rendered when Supabase is configured */}
        {showInvitations && currentBandId && currentUserId && (
          <TabsContent value="TEAM" className="space-y-6 animate-slide-in-from-bottom animation-forwards">
            <LinkAccountSection currentBandId={currentBandId} currentUserId={currentUserId} />

            <Card>
              <CardContent className="p-6">
                <InvitationManager
                  bandId={currentBandId}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Band Tab - Only rendered when Supabase is configured */}
        {showInvitations && currentBandId && currentUserId && onBandNameUpdate && onLeaveBand && onDeleteBand && (
          <TabsContent value="BAND" className="space-y-6 animate-slide-in-from-bottom animation-forwards">
            <BandSettingsSection
              bandId={currentBandId}
              bandName={currentBandName}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onBandNameUpdate={onBandNameUpdate}
              onLeaveBand={onLeaveBand}
              onDeleteBand={onDeleteBand}
            />
          </TabsContent>
        )}

        {/* Data Tab */}
        <TabsContent value="DATA" className="space-y-6 animate-slide-in-from-bottom animation-forwards">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Backup &amp; Restore</CardTitle>
              <CardDescription>
                Export your band&apos;s data to a JSON file. You can email this file to your
                brothers so they can load it on their devices. This is the safest way to ensure
                everyone has the same setlist and assignments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Export Card */}
                <Card className="bg-muted/50">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 bg-info/20 rounded-full flex items-center justify-center">
                      <Download className="h-8 w-8 text-info" />
                    </div>
                    <div>
                      <h4 className="font-bold font-serif text-foreground">Export Project</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Save current songs, members, assignments, and schedule.
                      </p>
                    </div>
                    <Button
                      onClick={handleExport}
                      className="w-full bg-info text-info-foreground hover:bg-info/90"
                    >
                      Download Backup
                    </Button>
                  </CardContent>
                </Card>

                {/* Import Card */}
                <Card className="bg-muted/50">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center">
                      <Upload className="h-8 w-8 text-warning" />
                    </div>
                    <div>
                      <h4 className="font-bold font-serif text-foreground">Import Project</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Restore from a backup file.{' '}
                        <span className="text-destructive font-bold">Overwrites current data.</span>
                      </p>
                    </div>
                    <Button asChild className="w-full">
                      <label className="cursor-pointer">
                        Select File
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={handleImport}
                        />
                      </label>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Warning Section */}
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold font-serif text-destructive">Local Storage Warning</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Browser storage is limited (usually around 5MB). If you upload too many large PDFs
                  or Audio files, the app may stop saving automatically. We recommend using the
                  &quot;Export Project&quot; feature frequently to keep your data safe.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone - Admin Only */}
          {isAdmin && (
            <Card className="border-destructive bg-destructive/5">
              <CardHeader>
                <CardTitle className="font-serif text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Permanently delete all band data including songs, members, roles, and events. This
                  action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={openDangerDialog} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete All Data
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Version Footer */}
      <div className="mt-8 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center font-mono">
          Band Assist v{__APP_VERSION__}
        </p>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeDialog}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
      />

      {/* Dangerous Action Dialog (Delete All Data) */}
      <DangerousActionDialog
        isOpen={dangerDialogOpen}
        title="Delete All Data"
        message="This will permanently delete all songs, members, roles, and events. This action cannot be undone."
        confirmPhrase="DELETE ALL DATA"
        confirmLabel="Delete Everything"
        onConfirm={handleDeleteAllData}
        onCancel={closeDangerDialog}
      />
    </div>
  );
});

Settings.displayName = 'Settings';
