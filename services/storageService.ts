
import { Song, BandMember, BandEvent } from '../types';

const STORAGE_KEYS = {
  SONGS: 'sdb_songs',
  MEMBERS: 'sdb_members',
  ROLES: 'sdb_roles',
  EVENTS: 'sdb_events'
};

export const StorageService = {
  // Save current state to LocalStorage
  save: (songs: Song[], members: BandMember[], roles: string[], events: BandEvent[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
      localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles));
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    } catch (e) {
      console.error("Storage Quota Exceeded or Error", e);
      // In a real app, we'd want a toast notification here
      alert("Warning: Browser storage is full. Large files (PDFs/Audio) might not be saved locally. Try deleting unused songs or using the Export Backup feature.");
    }
  },

  // Load state from LocalStorage
  load: () => {
    try {
      const s = localStorage.getItem(STORAGE_KEYS.SONGS);
      const m = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      const r = localStorage.getItem(STORAGE_KEYS.ROLES);
      const e = localStorage.getItem(STORAGE_KEYS.EVENTS);
      
      let songs: Song[] | null = s ? JSON.parse(s) : null;
      const members = m ? JSON.parse(m) : null;
      const roles = r ? JSON.parse(r) : null;
      const events = e ? JSON.parse(e) : null;

      // Data Migration: Convert legacy tabs to charts
      if (songs) {
        songs = songs.map(song => {
          const migratedCharts = song.charts || [];
          
          // If legacy content exists but hasn't been migrated to charts yet
          if (migratedCharts.length === 0) {
             if (song.tabContent) {
                migratedCharts.push({
                    id: `legacy-text-${song.id}`,
                    name: 'Master Tab',
                    instrument: 'Lead Guitar',
                    type: 'TEXT',
                    content: song.tabContent,
                    annotations: song.annotations || []
                });
             }
             if (song.tabUrl) {
                 const isPdf = song.tabUrl.includes('application/pdf');
                 migratedCharts.push({
                     id: `legacy-file-${song.id}`,
                     name: isPdf ? 'Sheet Music (PDF)' : 'Chart Image',
                     instrument: 'Lead Guitar',
                     type: isPdf ? 'PDF' : 'IMAGE',
                     url: song.tabUrl
                 });
             }
          }
          return { ...song, charts: migratedCharts };
        });
      }

      return {
        songs,
        members,
        roles,
        events
      };
    } catch (e) {
      console.error("Error loading data from storage", e);
      return { songs: null, members: null, roles: null, events: null };
    }
  },

  // Export all data to a JSON file
  exportData: (songs: Song[], members: BandMember[], roles: string[], events: BandEvent[]) => {
    const data = {
      version: 3,
      appName: "SharpDressedBand",
      timestamp: new Date().toISOString(),
      songs,
      members,
      roles,
      events
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `sdb_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Import data from a JSON file
  importData: (file: File): Promise<{ songs: Song[], members: BandMember[], roles: string[], events: BandEvent[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const data = JSON.parse(text);
          
          // Basic validation
          if (!data.songs || !Array.isArray(data.songs) || !data.members) {
            throw new Error("Invalid backup file format");
          }

          resolve({
            songs: data.songs,
            members: data.members,
            roles: data.roles || [],
            events: data.events || []
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }
};
