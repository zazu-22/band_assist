import React, { useState, useRef, useEffect } from 'react';
import { Song, BandMember, Annotation, SongChart } from '../types';
import { INSTRUMENT_ICONS } from '../constants';
import { getMusicAnalysis } from '../services/geminiService';
import { SmartTabEditor } from './SmartTabEditor';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { supabaseStorageService } from '../services/supabaseStorageService';
import { toast, ConfirmDialog } from './ui';
import {
  Music2,
  Users,
  FileText,
  Sparkles,
  Mic,
  UploadCloud,
  ChevronLeft,
  Trash2,
  Plus,
  Puzzle,
  Edit3,
  Save,
  ExternalLink,
  X,
  Download,
  Calendar,
  File,
  Guitar,
} from 'lucide-react';
import { AlphaTabRenderer } from './AlphaTabRenderer';

interface SongDetailProps {
  song: Song;
  members: BandMember[];
  availableRoles: string[];
  onBack: () => void;
  onUpdateSong: (updatedSong: Song) => void;
}

export const SongDetail: React.FC<SongDetailProps> = ({
  song,
  members,
  availableRoles,
  onBack,
  onUpdateSong,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CHARTS' | 'ASSIGNMENTS' | 'AUDIO'>(
    'OVERVIEW'
  );
  const [activeChartId, setActiveChartId] = useState<string | null>(
    song.charts.length > 0 ? song.charts[0].id : null
  );
  const [aiChat, setAiChat] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  // Metadata Edit State
  const [editForm, setEditForm] = useState({
    title: song.title,
    artist: song.artist,
    bpm: song.bpm,
    key: song.key,
    duration: song.duration,
    status: song.status,
    targetDate: song.targetDate || '',
  });

  // State for New Chart Modal
  const [isAddingChart, setIsAddingChart] = useState(false);
  const [newChartName, setNewChartName] = useState('');
  const [newChartInstrument, setNewChartInstrument] = useState('Lead Guitar');

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const closeConfirmDialog = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

  const activeChart = song.charts.find(c => c.id === activeChartId);

  useEffect(() => {
    // Audio Handling
    if (song.backingTrackUrl && song.backingTrackUrl.startsWith('data:audio')) {
      try {
        const mime = song.backingTrackUrl.split(';')[0].split(':')[1];
        const base64 = song.backingTrackUrl.split(',')[1];
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        const url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
        return () => URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Error processing audio', e);
      }
    }
  }, [song.backingTrackUrl]);

  // --- Assignment Handlers ---
  const handleAddRole = (memberId: string, role: string) => {
    const newAssignments = [...song.assignments, { memberId, role }];
    onUpdateSong({ ...song, assignments: newAssignments });
  };

  const handleRemoveRole = (memberId: string, role: string) => {
    const newAssignments = song.assignments.filter(
      a => !(a.memberId === memberId && a.role === role)
    );
    onUpdateSong({ ...song, assignments: newAssignments });
  };

  const handleAskAI = async (specificPrompt?: string) => {
    const promptToUse = specificPrompt || aiChat;
    if (!promptToUse.trim()) return;
    setLoadingAi(true);
    const context = `Song: ${song.title} by ${song.artist}. Key: ${song.key}, BPM: ${song.bpm}. Current status: ${song.status}.`;

    // Grab current chart context if available
    let mediaData = undefined;
    if (activeChart && activeChart.url) {
      const matches = activeChart.url.match(/^data:(.+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mediaData = { mimeType: matches[1], data: matches[2] };
      }
    }

    const response = await getMusicAnalysis(promptToUse, context, mediaData);
    setAiResponse(response || 'No response.');
    setLoadingAi(false);
    setAiChat('');
  };

  // --- Multi-Chart Handlers ---

  const handleCreateTextChart = () => {
    if (!newChartName) return;
    const newChart: SongChart = {
      id: crypto.randomUUID(),
      name: newChartName,
      instrument: newChartInstrument,
      type: 'TEXT',
      content: 'New empty chart...',
      annotations: [],
    };
    const updatedCharts = [...song.charts, newChart];
    onUpdateSong({ ...song, charts: updatedCharts });
    setActiveChartId(newChart.id);
    setIsAddingChart(false);
    setNewChartName('');
  };

  const handleUploadChart = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File is too large (Limit: 50MB). Please compress the file.');
      return;
    }

    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    const isGp = /\.(gp|gp3|gp4|gp5|gpx)$/i.test(file.name);

    // If Supabase is configured, upload to Storage
    if (isSupabaseConfigured() && (isPdf || isImage || isGp)) {
      try {
        const uploadResult = await supabaseStorageService.uploadChartFile(
          file,
          file.name,
          file.type,
          song.id
        );

        if (!uploadResult) {
          toast.error('Failed to upload file. Please try again.');
          return;
        }

        const newChart: SongChart = {
          id: crypto.randomUUID(),
          name: newChartName || file.name,
          instrument: newChartInstrument,
          type: isGp ? 'GP' : isPdf ? 'PDF' : 'IMAGE',
          url: uploadResult.url,
          storagePath: uploadResult.storagePath,
          storageBase64: uploadResult.storageBase64, // For GP files only
          annotations: [],
        };

        const updatedCharts = [...song.charts, newChart];
        onUpdateSong({ ...song, charts: updatedCharts });
        setActiveChartId(newChart.id);
        setIsAddingChart(false);
        setNewChartName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        console.error('Error uploading chart:', error);
        toast.error('Error uploading file. Please try again.');
      }
    } else {
      // Fallback for text files or when Supabase not configured
      const reader = new FileReader();
      reader.onload = event => {
        const result = event.target?.result as string;
        const newChart: SongChart = {
          id: crypto.randomUUID(),
          name: newChartName || file.name,
          instrument: newChartInstrument,
          type: isGp ? 'GP' : isPdf ? 'PDF' : isImage ? 'IMAGE' : 'TEXT',
          url: isPdf || isImage || isGp ? result : undefined,
          content: !isPdf && !isImage && !isGp ? result : undefined,
          annotations: [],
        };

        const updatedCharts = [...song.charts, newChart];
        onUpdateSong({ ...song, charts: updatedCharts });
        setActiveChartId(newChart.id);
        setIsAddingChart(false);
        setNewChartName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      };

      if (isPdf || isImage || isGp) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    }
  };

  const handleDeleteChart = (chartId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Chart',
      message: 'Are you sure you want to delete this chart? This action cannot be undone.',
      onConfirm: () => {
        const updatedCharts = song.charts.filter(c => c.id !== chartId);
        onUpdateSong({ ...song, charts: updatedCharts });
        if (activeChartId === chartId) {
          setActiveChartId(updatedCharts.length > 0 ? updatedCharts[0].id : null);
        }
        closeConfirmDialog();
      },
    });
  };

  const handleUpdateChartContent = (chartId: string, newContent: string) => {
    const updatedCharts = song.charts.map(c =>
      c.id === chartId ? { ...c, content: newContent } : c
    );
    onUpdateSong({ ...song, charts: updatedCharts });
  };

  const handleUpdateChartAnnotations = (chartId: string, newAnnotations: Annotation[]) => {
    const updatedCharts = song.charts.map(c =>
      c.id === chartId ? { ...c, annotations: newAnnotations } : c
    );
    onUpdateSong({ ...song, charts: updatedCharts });
  };

  // --- Audio & Metadata ---

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error(
        'Audio file is too large (Limit: 10MB). Please use a compressed MP3 or shorter clip.'
      );
      return;
    }

    // If Supabase is configured, upload to Storage
    if (isSupabaseConfigured()) {
      try {
        const uploadResult = await supabaseStorageService.uploadAudioFile(
          file,
          file.name,
          file.type,
          song.id
        );

        if (!uploadResult) {
          toast.error('Failed to upload audio file. Please try again.');
          return;
        }

        onUpdateSong({
          ...song,
          backingTrackUrl: uploadResult.url,
          backingTrackStoragePath: uploadResult.storagePath,
        });
        if (audioInputRef.current) audioInputRef.current.value = '';
      } catch (error) {
        console.error('Error uploading audio:', error);
        toast.error('Error uploading audio file. Please try again.');
      }
    } else {
      // Fallback to base64 if Supabase not configured
      const reader = new FileReader();
      reader.onload = event => {
        const result = event.target?.result as string;
        onUpdateSong({ ...song, backingTrackUrl: result });
        if (audioInputRef.current) audioInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const saveMetadata = () => {
    onUpdateSong({ ...song, ...editForm });
    setIsEditingMetadata(false);
  };

  const downloadFile = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden bg-zinc-950">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-zinc-900 border-b border-zinc-800 p-6 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="text-zinc-400" />
              </button>
              {isEditingMetadata ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    className="text-xl font-bold bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-white"
                    placeholder="Song Title"
                  />
                  <input
                    value={editForm.artist}
                    onChange={e => setEditForm({ ...editForm, artist: e.target.value })}
                    className="text-sm font-medium bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-amber-600"
                    placeholder="Artist"
                  />
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    {song.title}
                    <span
                      className={`text-xs font-normal font-mono px-2 py-1 rounded border ${
                        song.status === 'Performance Ready'
                          ? 'bg-green-900/30 text-green-500 border-green-800'
                          : song.status === 'In Progress'
                            ? 'bg-blue-900/30 text-blue-500 border-blue-800'
                            : 'bg-amber-900/30 text-amber-500 border-amber-800'
                      }`}
                    >
                      {song.status}
                    </span>
                  </h2>
                  <p className="text-amber-600 font-medium">{song.artist}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {isEditingMetadata ? (
                <button
                  onClick={saveMetadata}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <Save size={16} /> Save
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingMetadata(true)}
                  className="text-zinc-500 hover:text-white p-2"
                  aria-label="Edit song metadata"
                >
                  <Edit3 size={18} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(['OVERVIEW', 'CHARTS', 'ASSIGNMENTS', 'AUDIO'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  activeTab === tab
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          {/* OVERVIEW TAB */}
          {activeTab === 'OVERVIEW' && (
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                {/* Metadata Card */}
                <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                  <h3 className="text-lg font-bold text-white mb-4">Metadata</h3>
                  {isEditingMetadata ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-zinc-500">BPM</label>
                        <input
                          type="number"
                          value={editForm.bpm}
                          onChange={e =>
                            setEditForm({ ...editForm, bpm: parseInt(e.target.value) })
                          }
                          className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500">Key</label>
                        <input
                          type="text"
                          value={editForm.key}
                          onChange={e => setEditForm({ ...editForm, key: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500">Duration</label>
                        <input
                          type="text"
                          value={editForm.duration}
                          onChange={e => setEditForm({ ...editForm, duration: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500">Status</label>
                        <select
                          value={editForm.status}
                          onChange={e =>
                            setEditForm({
                              ...editForm,
                              status: e.target.value as
                                | 'To Learn'
                                | 'In Progress'
                                | 'Performance Ready',
                            })
                          }
                          className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white"
                        >
                          <option value="To Learn">To Learn</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Performance Ready">Performance Ready</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-zinc-500">Target Completion Date</label>
                        <input
                          type="date"
                          value={editForm.targetDate}
                          onChange={e => setEditForm({ ...editForm, targetDate: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                        <span className="text-xs text-zinc-500 uppercase">BPM</span>
                        <p className="text-xl font-mono text-white">{song.bpm}</p>
                      </div>
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                        <span className="text-xs text-zinc-500 uppercase">Duration</span>
                        <p className="text-xl font-mono text-white">{song.duration}</p>
                      </div>
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                        <span className="text-xs text-zinc-500 uppercase">Key</span>
                        <p className="text-xl font-mono text-white">{song.key}</p>
                      </div>
                      {song.targetDate && (
                        <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 border-l-4 border-l-amber-600">
                          <span className="text-xs text-zinc-500 uppercase flex items-center gap-1">
                            <Calendar size={12} /> Target Date
                          </span>
                          <p className="text-xl font-mono text-white">
                            {new Date(song.targetDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-500" />
                    AI Analysis
                  </h3>
                  <p className="text-zinc-400 leading-relaxed">
                    {song.aiAnalysis ||
                      'No analysis generated yet. Upload sheet music or ask the assistant for insights on tone, structure, or specific performance tips.'}
                  </p>
                </div>
              </div>

              {/* Quick Assignments View */}
              <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Users size={18} />
                  Lineup
                </h3>
                <div className="space-y-3">
                  {song.assignments.length > 0 ? (
                    song.assignments.map((assign, idx) => {
                      const memberName =
                        members.find(m => m.id === assign.memberId)?.name || 'Unknown';
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-lg">
                              {INSTRUMENT_ICONS[assign.role] || INSTRUMENT_ICONS['default']}
                            </div>
                            <div>
                              <p className="font-medium text-white">{memberName}</p>
                              <p className="text-xs text-zinc-500">{assign.role}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-zinc-500 italic">No assignments yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CHARTS TAB */}
          {activeTab === 'CHARTS' && (
            <div className="h-full flex flex-col gap-6">
              {/* Chart Selector & Actions */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide p-1">
                  {song.charts.map(chart => (
                    <button
                      key={chart.id}
                      onClick={() => setActiveChartId(chart.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
                        activeChartId === chart.id
                          ? 'bg-zinc-100 text-zinc-900 shadow-md'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      {chart.type === 'GP' ? (
                        <Guitar size={14} />
                      ) : chart.type === 'PDF' ? (
                        <FileText size={14} />
                      ) : chart.type === 'IMAGE' ? (
                        <File size={14} />
                      ) : (
                        <Music2 size={14} />
                      )}
                      {chart.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setIsAddingChart(true)}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 flex items-center gap-1 whitespace-nowrap"
                  >
                    <Plus size={14} /> Add Chart
                  </button>
                </div>

                {activeChart && (
                  <div className="flex items-center gap-2 pr-2">
                    {activeChart.type === 'TEXT' && (
                      <span className="text-xs text-zinc-500 font-mono uppercase">Text Editor</span>
                    )}
                    <button
                      onClick={() => handleDeleteChart(activeChart.id)}
                      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-colors"
                      aria-label="Delete chart"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Add Chart Modal */}
              {isAddingChart && (
                <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl animate-in fade-in zoom-in-95">
                  <h3 className="text-lg font-bold text-white mb-4">Add New Chart</h3>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      value={newChartName}
                      onChange={e => setNewChartName(e.target.value)}
                      placeholder="Chart Name (e.g. Bass Tab, Lyrics)"
                      className="bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white outline-none focus:border-amber-500"
                    />
                    <select
                      value={newChartInstrument}
                      onChange={e => setNewChartInstrument(e.target.value)}
                      className="bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white outline-none focus:border-amber-500"
                    >
                      {availableRoles.map(role => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg cursor-pointer border border-zinc-700 transition-colors">
                      <UploadCloud size={18} />
                      Upload (PDF/Img/GP)
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.txt,.gp,.gp3,.gp4,.gp5,.gpx"
                        className="hidden"
                        onChange={handleUploadChart}
                      />
                    </label>
                    <button
                      onClick={handleCreateTextChart}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors"
                    >
                      Create Text Tab
                    </button>
                  </div>
                  <button
                    onClick={() => setIsAddingChart(false)}
                    className="mt-4 text-zinc-500 hover:text-white text-sm w-full text-center"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Main Viewer Area */}
              <div className="flex-1 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden relative min-h-[600px] flex flex-col">
                {!activeChart ? (
                  <div className="flex items-center justify-center h-full flex-col gap-4 text-zinc-500">
                    <FileText size={48} className="opacity-20" />
                    <p>Select a chart above or add a new one.</p>
                  </div>
                ) : activeChart.type === 'TEXT' ? (
                  <SmartTabEditor
                    content={activeChart.content || ''}
                    onChange={newContent => handleUpdateChartContent(activeChart.id, newContent)}
                    annotations={activeChart.annotations || []}
                    onUpdateAnnotations={ann => handleUpdateChartAnnotations(activeChart.id, ann)}
                  />
                ) : activeChart.type === 'GP' ? (
                  <AlphaTabRenderer
                    fileData={activeChart.storageBase64 || activeChart.url!}
                    readOnly={true}
                  />
                ) : (
                  <div className="w-full h-full relative bg-zinc-200 pdf-viewer-container">
                    <div className="absolute top-2 right-2 z-10 flex gap-2">
                      <button
                        onClick={() =>
                          downloadFile(activeChart.url!, `${activeChart.name.replace(/\s+/g, '_')}`)
                        }
                        className="p-2 bg-zinc-900/80 text-zinc-300 rounded-lg hover:bg-zinc-800 hover:text-white border border-zinc-700 backdrop-blur-sm shadow-sm"
                        title="Download Original"
                      >
                        <Download size={16} />
                      </button>
                      {activeChart.type === 'PDF' && (
                        <a
                          href={activeChart.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-zinc-900/80 text-blue-400 rounded-lg hover:bg-blue-900/50 border border-zinc-700 backdrop-blur-sm shadow-sm"
                          title="Open in New Tab"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>

                    {activeChart.type === 'PDF' ? (
                      <iframe
                        src={activeChart.url}
                        className="w-full h-full border-0"
                        title="PDF Viewer"
                        onError={() => {
                          // Fallback if iframe fails
                          const parent = document.querySelector('.pdf-viewer-container');
                          if (parent) {
                            parent.innerHTML = `
                                                    <div class="flex items-center justify-center h-full flex-col gap-4 text-zinc-800 p-10">
                                                        <div class="text-6xl">📄</div>
                                                        <p class="font-bold text-lg">PDF Preview Not Available</p>
                                                        <p class="text-sm text-zinc-600">Your browser or environment doesn't support embedded PDFs.</p>
                                                        <a href="${activeChart.url}" target="_blank" rel="noreferrer" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                                                            Open PDF in New Tab
                                                        </a>
                                                        <button onclick="navigator.clipboard.writeText('${activeChart.url}')" class="text-blue-600 hover:underline text-sm">
                                                            Copy PDF Link
                                                        </button>
                                                    </div>
                                                `;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full overflow-auto bg-zinc-900 flex items-start justify-center">
                        <img src={activeChart.url} alt="Chart" className="max-w-full" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ASSIGNMENTS TAB */}
          {activeTab === 'ASSIGNMENTS' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800">
                <h3 className="text-xl font-bold text-white mb-6">Band Assignments</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {members.map(member => {
                    // Get roles for this member
                    const memberAssignments = song.assignments.filter(
                      a => a.memberId === member.id
                    );
                    // Get parts for this member
                    const memberParts = (song.parts || []).filter(
                      p => p.assignedToMemberId === member.id
                    );

                    return (
                      <div
                        key={member.id}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col h-full"
                      >
                        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-zinc-900">
                          <div
                            className={`w-12 h-12 rounded-full ${member.avatarColor || 'bg-zinc-700'} flex items-center justify-center font-bold text-white`}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-lg">{member.name}</h4>
                            <p className="text-zinc-500 text-xs">ID: {member.id}</p>
                          </div>
                        </div>

                        {/* Roles Section */}
                        <div className="mb-4 flex-1">
                          <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Roles</p>
                          <div className="flex flex-wrap gap-2">
                            {memberAssignments.map((a, idx) => (
                              <div
                                key={idx}
                                className="group bg-zinc-900 border border-zinc-800 text-amber-500 px-2 py-1 rounded-md text-sm font-bold flex items-center gap-2"
                              >
                                <span>
                                  {INSTRUMENT_ICONS[a.role] || INSTRUMENT_ICONS['default']} {a.role}
                                </span>
                                <button
                                  onClick={() => handleRemoveRole(member.id, a.role)}
                                  className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                            {memberAssignments.length === 0 && (
                              <p className="text-zinc-600 text-sm italic">No roles assigned.</p>
                            )}
                          </div>

                          {/* Add Role Dropdown */}
                          <div className="mt-2">
                            <select
                              className="bg-zinc-900 text-xs text-zinc-400 border border-zinc-800 rounded px-2 py-1 outline-none focus:border-amber-500 w-full"
                              onChange={e => {
                                if (e.target.value) {
                                  handleAddRole(member.id, e.target.value);
                                  e.target.value = ''; // reset
                                }
                              }}
                            >
                              <option value="">+ Add Role</option>
                              {availableRoles
                                .filter(r => !memberAssignments.some(ma => ma.role === r))
                                .map(r => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        {/* Parts Section */}
                        <div className="pt-4 border-t border-zinc-900">
                          <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Parts</p>
                          <div className="space-y-1">
                            {memberParts.map(p => (
                              <div
                                key={p.id}
                                className="text-sm text-zinc-300 flex items-center gap-2"
                              >
                                <Puzzle size={12} className="text-blue-500" />
                                {p.name}
                              </div>
                            ))}
                            {memberParts.length === 0 && (
                              <p className="text-zinc-600 text-sm italic">
                                No specific parts assigned.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* AUDIO TAB */}
          {activeTab === 'AUDIO' && (
            <div className="max-w-2xl mx-auto mt-10">
              <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-2xl shadow-black">
                {audioBlobUrl ? (
                  <>
                    <div className="aspect-video bg-zinc-950 rounded-2xl flex items-center justify-center mb-8 relative overflow-hidden border border-zinc-800">
                      <Music2 size={48} className="text-white relative z-10" />
                    </div>

                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-white">{song.title}</h3>
                      <p className="text-zinc-500">Backing Track</p>
                    </div>

                    <audio
                      ref={audioPlayerRef}
                      src={audioBlobUrl}
                      controls
                      className="w-full mb-6"
                    />

                    <div className="flex justify-center gap-4">
                      <button
                        onClick={() =>
                          downloadFile(song.backingTrackUrl!, `${song.title}_backing_track`)
                        }
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Download size={12} /> Download Track
                      </button>
                      <button
                        onClick={() => {
                          onUpdateSong({ ...song, backingTrackUrl: undefined });
                          setAudioBlobUrl(null);
                        }}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Remove Track
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10">
                    <div className="mb-6 flex justify-center">
                      <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center">
                        <UploadCloud size={32} className="text-zinc-500" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Upload Backing Track</h3>
                    <p className="text-zinc-500 text-sm mb-6 max-w-xs mx-auto">
                      Upload an MP3 or WAV file (max 4MB) to practice along with.
                    </p>
                    <label className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-bold cursor-pointer transition-colors">
                      Select Audio File
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={handleAudioUpload}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: AI Assistant */}
      <div className="w-full lg:w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0 h-1/2 lg:h-full">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900 z-10">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            Studio Assistant
          </h3>
          <p className="text-xs text-zinc-500">Ask about tone, gear, or tabs</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-900/50 flex items-center justify-center text-xs shrink-0">
              AI
            </div>
            <div className="bg-zinc-800/50 p-3 rounded-r-xl rounded-bl-xl text-sm text-zinc-300 border border-zinc-800">
              Ready to rock? I can help you analyze tablature, suggest guitar tones for {song.title}
              , or plan assignments.
            </div>
          </div>

          {aiResponse && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="w-8 h-8 rounded-full bg-amber-900/50 flex items-center justify-center text-xs shrink-0">
                AI
              </div>
              <div className="bg-zinc-800/50 p-3 rounded-r-xl rounded-bl-xl text-sm text-zinc-300 border border-zinc-800 prose prose-invert prose-sm max-w-none">
                {aiResponse.split('\n').map((line, i) => (
                  <p
                    key={i}
                    className={`mb-1 ${line.startsWith('#') ? 'font-bold text-white mt-2' : ''} ${line.startsWith('-') ? 'pl-4' : ''}`}
                  >
                    {line.replace(/^#+\s/, '').replace(/^-\s/, '• ')}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900">
          <div className="relative">
            <input
              type="text"
              value={aiChat}
              onChange={e => setAiChat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAskAI()}
              placeholder="Ask about this song..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:ring-1 focus:ring-amber-500 outline-none"
            />
            <button
              onClick={() => handleAskAI()}
              disabled={loadingAi}
              className="absolute right-2 top-2 p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loadingAi ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Mic size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirmDialog}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
};
