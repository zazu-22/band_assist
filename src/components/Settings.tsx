import React, { useState, useRef } from 'react';
import { BandMember, Song, BandEvent } from '../types';
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
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { InvitationManager } from './InvitationManager';
import { isSupabaseConfigured } from '../services/supabaseClient';

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
}

export const Settings: React.FC<SettingsProps> = ({
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
}) => {
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'ROLES' | 'TEAM' | 'DATA'>('ROSTER');
  const showInvitations = isSupabaseConfigured() && currentBandId && currentUserId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Member State ---
  const [newMemberName, setNewMemberName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // --- Role State ---
  const [newRoleName, setNewRoleName] = useState('');

  // --- Member Handlers ---
  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const newMember: BandMember = {
      id: crypto.randomUUID(),
      name: newMemberName,
      roles: [], // No roles assigned by default on creation
      avatarColor: ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'][
        members.length % 5
      ],
    };
    setMembers([...members, newMember]);
    setNewMemberName('');
  };

  const handleRemoveMember = (id: string) => {
    if (
      window.confirm(
        'Are you sure? Assignments for this member in songs will remain but might look orphaned.'
      )
    ) {
      setMembers(members.filter(m => m.id !== id));
    }
  };

  const startEditing = (member: BandMember) => {
    setEditingId(member.id);
    setEditName(member.name);
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    setMembers(members.map(m => (m.id === editingId ? { ...m, name: editName } : m)));
    setEditingId(null);
    setEditName('');
  };

  // --- Role Handlers ---
  const handleAddRole = () => {
    if (!newRoleName.trim() || availableRoles.includes(newRoleName)) return;
    setAvailableRoles([...availableRoles, newRoleName]);
    setNewRoleName('');
  };

  const handleRemoveRole = (role: string) => {
    if (
      window.confirm(
        `Delete role "${role}"? It will still exist on old song assignments but won't be selectable for new ones.`
      )
    ) {
      setAvailableRoles(availableRoles.filter(r => r !== role));
    }
  };

  // --- Data Handlers ---
  const handleExport = () => {
    StorageService.exportData(songs, members, availableRoles, events);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !setSongs || !setEvents) return;

    if (window.confirm('Importing will OVERWRITE your current data. Are you sure?')) {
      StorageService.importData(file)
        .then(data => {
          setSongs(data.songs);
          setMembers(data.members);
          setAvailableRoles(data.roles);
          setEvents(data.events);
          alert('Data imported successfully!');
        })
        .catch(err => {
          console.error(err);
          alert('Failed to import data. File might be corrupt.');
        });
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <header className="mb-8 border-b border-zinc-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Configuration</h2>
          <p className="text-zinc-400 mt-1">Band roster, roles, and data backup</p>
        </div>

        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('ROSTER')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'ROSTER' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Users size={16} /> Roster
          </button>
          <button
            onClick={() => setActiveTab('ROLES')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'ROLES' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Music2 size={16} /> Roles
          </button>
          {showInvitations && (
            <button
              onClick={() => setActiveTab('TEAM')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'TEAM' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <UserPlus size={16} /> Team
            </button>
          )}
          <button
            onClick={() => setActiveTab('DATA')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'DATA' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Database size={16} /> Data
          </button>
        </div>
      </header>

      {activeTab === 'ROSTER' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Members</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Add everyone in the band. You will assign specific roles (Guitar, Bass, etc.) to them
              inside each song.
            </p>

            <div className="grid gap-4 mb-6">
              {members.map(member => (
                <div
                  key={member.id}
                  className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-center justify-between"
                >
                  {editingId === member.id ? (
                    <div className="flex items-center gap-4 w-full">
                      <div
                        className={`w-10 h-10 rounded-full ${member.avatarColor} flex items-center justify-center font-bold text-white opacity-50`}
                      >
                        {editName.charAt(0).toUpperCase() || '?'}
                      </div>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white outline-none focus:border-amber-500"
                        autoFocus
                      />
                      <button
                        onClick={saveEdit}
                        className="p-2 bg-green-900/30 text-green-500 rounded hover:bg-green-900/50"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 bg-zinc-800 text-zinc-400 rounded hover:text-white"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full ${member.avatarColor} flex items-center justify-center font-bold text-white shadow-inner`}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white">{member.name}</p>
                          <p className="text-xs text-zinc-500">ID: {member.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditing(member)}
                          className="p-2 text-zinc-600 hover:text-white"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-zinc-600 hover:text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <input
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                placeholder="New Member Name"
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-amber-500"
                onKeyDown={e => e.key === 'Enter' && handleAddMember()}
              />
              <button
                onClick={handleAddMember}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
              >
                Add Person
              </button>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'ROLES' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Available Roles & Instruments</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Define the list of instruments or roles that can be assigned in songs (e.g.,
              &quot;Lead Guitar&quot;, &quot;Cowbell&quot;, &quot;Manager&quot;).
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              {availableRoles.map(role => (
                <div
                  key={role}
                  className="group bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 flex items-center gap-2"
                >
                  <span className="text-zinc-300 font-medium">{role}</span>
                  <button
                    onClick={() => handleRemoveRole(role)}
                    className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 max-w-md">
              <input
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                placeholder="New Role (e.g. Saxophone)"
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-amber-500"
                onKeyDown={e => e.key === 'Enter' && handleAddRole()}
              />
              <button
                onClick={handleAddRole}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-bold transition-colors border border-zinc-700"
              >
                Add Role
              </button>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'TEAM' && showInvitations && currentBandId && currentUserId && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <InvitationManager
              bandId={currentBandId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          </section>
        </div>
      )}

      {activeTab === 'DATA' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Backup & Restore</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Export your band&apos;s data to a JSON file. You can email this file to your brothers
              so they can load it on their devices. This is the safest way to ensure everyone has
              the same setlist and assignments.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center">
                  <Download size={32} className="text-blue-500" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Export Project</h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    Save current songs, members, assignments, and schedule.
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
                >
                  Download Backup
                </button>
              </div>

              <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center">
                  <Upload size={32} className="text-amber-500" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Import Project</h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    Restore from a backup file.{' '}
                    <span className="text-red-400 font-bold">Overwrites current data.</span>
                  </p>
                </div>
                <label className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors cursor-pointer block">
                  Select File
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImport}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="bg-red-900/10 rounded-2xl border border-red-900/30 p-6 flex items-start gap-4">
            <AlertTriangle size={24} className="text-red-500 shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-red-400">Local Storage Warning</h4>
              <p className="text-sm text-red-300/70 mt-1">
                Browser storage is limited (usually around 5MB). If you upload too many large PDFs
                or Audio files, the app may stop saving automatically. We recommend using the
                &quot;Export Project&quot; feature frequently to keep your data safe.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
