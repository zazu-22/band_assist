import React, { useState, useRef } from 'react';
import { Song, BandMember, Annotation, SongChart } from '@/types';
import { INSTRUMENT_ICONS } from '@/constants';
import { getMusicAnalysis } from '@/services/geminiService';
import { getAvatarColor } from '@/lib/avatar';
import { useBlobUrl } from '@/hooks/useBlobUrl';
import { SmartTabEditor } from './SmartTabEditor';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { supabaseStorageService } from '@/services/supabaseStorageService';
import { toast, ConfirmDialog, ErrorBoundary, StatusBadge } from './ui';
import { Button } from '@/components/primitives/button';
import { Card, CardContent, CardHeader } from '@/components/primitives/card';
import { Input } from '@/components/primitives/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives/select';
import { cn } from '@/lib/utils';
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
  // Convert backing track data URI to blob URL for audio playback
  const audioBlobUrl = useBlobUrl(song.backingTrackUrl);
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
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden bg-background">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border p-6 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                aria-label="Go back"
                className="hover:bg-muted/30"
              >
                <ChevronLeft className="text-muted-foreground" />
              </Button>
              {isEditingMetadata ? (
                <div className="flex flex-col gap-2">
                  <Input
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    className="text-xl font-bold font-serif"
                    placeholder="Song Title"
                  />
                  <Input
                    value={editForm.artist}
                    onChange={e => setEditForm({ ...editForm, artist: e.target.value })}
                    className="text-sm font-medium text-primary"
                    placeholder="Artist"
                  />
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold font-serif text-foreground flex items-center gap-3">
                    {song.title}
                    <StatusBadge status={song.status} />
                  </h2>
                  <p className="text-primary font-medium">{song.artist}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {isEditingMetadata ? (
                <Button onClick={saveMetadata} className="gap-2">
                  <Save size={16} /> Save
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditingMetadata(true)}
                  aria-label="Edit song metadata"
                >
                  <Edit3 size={18} className="text-muted-foreground hover:text-foreground" />
                </Button>
              )}
            </div>
          </div>

          {/* Tab Navigation with primary indicator */}
          <div className="flex items-center gap-1">
            {(['OVERVIEW', 'CHARTS', 'ASSIGNMENTS', 'AUDIO'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'relative px-4 py-2 text-sm font-bold transition-colors',
                  activeTab === tab
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          {/* OVERVIEW TAB */}
          {activeTab === 'OVERVIEW' && (
            <div className="grid lg:grid-cols-2 gap-6 animate-slide-in-from-bottom animation-forwards opacity-0 stagger-1">
              <div className="space-y-6">
                {/* Metadata Card */}
                <Card>
                  <CardHeader className="pb-4">
                    <h3 className="text-lg font-serif text-foreground">Metadata</h3>
                  </CardHeader>
                  <CardContent>
                    {isEditingMetadata ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wide">
                            BPM
                          </label>
                          <Input
                            type="number"
                            value={editForm.bpm}
                            onChange={e =>
                              setEditForm({ ...editForm, bpm: parseInt(e.target.value) })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wide">
                            Key
                          </label>
                          <Input
                            type="text"
                            value={editForm.key}
                            onChange={e => setEditForm({ ...editForm, key: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wide">
                            Duration
                          </label>
                          <Input
                            type="text"
                            value={editForm.duration}
                            onChange={e => setEditForm({ ...editForm, duration: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wide">
                            Status
                          </label>
                          <Select
                            value={editForm.status}
                            onValueChange={value =>
                              setEditForm({
                                ...editForm,
                                status: value as 'To Learn' | 'In Progress' | 'Performance Ready',
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="To Learn">To Learn</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Performance Ready">Performance Ready</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground uppercase tracking-wide">
                            Target Completion Date
                          </label>
                          <Input
                            type="date"
                            value={editForm.targetDate}
                            onChange={e => setEditForm({ ...editForm, targetDate: e.target.value })}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/30 p-3 rounded-lg border border-border">
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">
                            BPM
                          </span>
                          <p className="text-xl font-mono tabular-nums text-foreground">
                            {song.bpm}
                          </p>
                        </div>
                        <div className="bg-muted/30 p-3 rounded-lg border border-border">
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">
                            Duration
                          </span>
                          <p className="text-xl font-mono tabular-nums text-foreground">
                            {song.duration}
                          </p>
                        </div>
                        <div className="bg-muted/30 p-3 rounded-lg border border-border">
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">
                            Key
                          </span>
                          <p className="text-xl font-medium text-foreground">{song.key}</p>
                        </div>
                        {song.targetDate && (
                          <div className="bg-muted/30 p-3 rounded-lg border border-border border-l-[3px] border-l-primary">
                            <span className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                              <Calendar size={12} /> Target Date
                            </span>
                            <p className="text-xl font-mono tabular-nums text-foreground">
                              {new Date(song.targetDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* AI Analysis Card */}
                <Card>
                  <CardHeader className="pb-4">
                    <h3 className="text-lg font-serif text-foreground flex items-center gap-2">
                      <Sparkles size={18} className="text-primary" />
                      AI Analysis
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {song.aiAnalysis ||
                        'No analysis generated yet. Upload sheet music or ask the assistant for insights on tone, structure, or specific performance tips.'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Assignments View */}
              <Card>
                <CardHeader className="pb-4">
                  <h3 className="text-lg font-serif text-foreground flex items-center gap-2">
                    <Users size={18} />
                    Lineup
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {song.assignments.length > 0 ? (
                      song.assignments.map((assign, idx) => {
                        const memberName =
                          members.find(m => m.id === assign.memberId)?.name || 'Unknown';
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-lg">
                                {INSTRUMENT_ICONS[assign.role] || INSTRUMENT_ICONS['default']}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{memberName}</p>
                                <p className="text-xs text-muted-foreground">{assign.role}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-muted-foreground italic">No assignments yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* CHARTS TAB */}
          {activeTab === 'CHARTS' && (
            <div className="h-full flex flex-col gap-6 animate-slide-in-from-bottom animation-forwards opacity-0 stagger-1">
              {/* Chart Selector & Actions */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-2 rounded-xl border border-border">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide p-1">
                  {song.charts.map(chart => (
                    <button
                      key={chart.id}
                      onClick={() => setActiveChartId(chart.id)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all',
                        activeChartId === chart.id
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                      )}
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
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsAddingChart(true)}
                    className="gap-1 whitespace-nowrap"
                  >
                    <Plus size={14} /> Add Chart
                  </Button>
                </div>

                {activeChart && (
                  <div className="flex items-center gap-2 pr-2">
                    {activeChart.type === 'TEXT' && (
                      <span className="text-xs text-muted-foreground font-mono uppercase">
                        Text Editor
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteChart(activeChart.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete chart"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
              </div>

              {/* Add Chart Form */}
              {isAddingChart && (
                <Card className="animate-slide-in-from-top animation-forwards">
                  <CardHeader>
                    <h3 className="text-lg font-serif text-foreground">Add New Chart</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        type="text"
                        value={newChartName}
                        onChange={e => setNewChartName(e.target.value)}
                        placeholder="Chart Name (e.g. Bass Tab, Lyrics)"
                      />
                      <Select value={newChartInstrument} onValueChange={setNewChartInstrument}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select instrument" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map(role => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-3">
                      <label className="flex-1 flex items-center justify-center gap-2 bg-muted/30 hover:bg-muted/50 text-foreground py-3 rounded-lg cursor-pointer border border-border transition-colors">
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
                      <Button onClick={handleCreateTextChart} className="flex-1">
                        Create Text Tab
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => setIsAddingChart(false)}
                      className="w-full text-muted-foreground"
                    >
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Main Viewer Area */}
              <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden relative min-h-[600px] flex flex-col">
                {!activeChart ? (
                  <div className="flex items-center justify-center h-full flex-col gap-4 text-muted-foreground">
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
                  <ErrorBoundary
                    fallback={
                      <div className="flex flex-col items-center justify-center h-full bg-card text-muted-foreground p-8">
                        <Guitar size={48} className="opacity-40 mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          Guitar Pro Render Error
                        </h3>
                        <p className="text-sm text-center max-w-md mb-4">
                          An unexpected error occurred while rendering this file. Try refreshing the
                          page or re-uploading the file in a different format.
                        </p>
                        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
                      </div>
                    }
                  >
                    <AlphaTabRenderer
                      fileData={activeChart.storageBase64 || activeChart.url!}
                      readOnly={true}
                    />
                  </ErrorBoundary>
                ) : (
                  <div className="w-full h-full relative bg-muted pdf-viewer-container">
                    <div className="absolute top-2 right-2 z-10 flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          downloadFile(activeChart.url!, `${activeChart.name.replace(/\s+/g, '_')}`)
                        }
                        className="bg-card/80 backdrop-blur-sm"
                        title="Download Original"
                      >
                        <Download size={16} />
                      </Button>
                      {activeChart.type === 'PDF' && (
                        <a
                          href={activeChart.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-card/80 text-info rounded-lg hover:bg-info/20 border border-border backdrop-blur-sm shadow-sm"
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
                                                    <div class="flex items-center justify-center h-full flex-col gap-4 text-foreground p-10">
                                                        <div class="text-6xl">📄</div>
                                                        <p class="font-bold text-lg">PDF Preview Not Available</p>
                                                        <p class="text-sm text-muted-foreground">Your browser or environment doesn't support embedded PDFs.</p>
                                                        <a href="${activeChart.url}" target="_blank" rel="noreferrer" class="bg-info hover:bg-info/80 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                                                            Open PDF in New Tab
                                                        </a>
                                                        <button onclick="navigator.clipboard.writeText('${activeChart.url}')" class="text-info hover:underline text-sm">
                                                            Copy PDF Link
                                                        </button>
                                                    </div>
                                                `;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full overflow-auto bg-card flex items-start justify-center">
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
            <div className="max-w-4xl mx-auto animate-slide-in-from-bottom animation-forwards opacity-0 stagger-1">
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-serif text-foreground">Band Assignments</h3>
                </CardHeader>
                <CardContent>
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
                          className="bg-muted/30 border border-border rounded-xl p-5 flex flex-col h-full"
                        >
                          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
                            <div
                              className={`w-12 h-12 rounded-full ${getAvatarColor(member.avatarColor)} flex items-center justify-center font-bold text-white`}
                            >
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-foreground text-lg">{member.name}</h4>
                              <p className="text-muted-foreground text-xs font-mono">
                                ID: {member.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>

                          {/* Roles Section */}
                          <div className="mb-4 flex-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                              Roles
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {memberAssignments.map((a, idx) => (
                                <div
                                  key={idx}
                                  className="group bg-card border border-border text-primary px-2 py-1 rounded-md text-sm font-bold flex items-center gap-2"
                                >
                                  <span>
                                    {INSTRUMENT_ICONS[a.role] || INSTRUMENT_ICONS['default']} {a.role}
                                  </span>
                                  <button
                                    onClick={() => handleRemoveRole(member.id, a.role)}
                                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                              {memberAssignments.length === 0 && (
                                <p className="text-muted-foreground text-sm italic">
                                  No roles assigned.
                                </p>
                              )}
                            </div>

                            {/* Add Role Dropdown */}
                            <div className="mt-2">
                              <Select
                                onValueChange={value => {
                                  if (value) {
                                    handleAddRole(member.id, value);
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="+ Add Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRoles
                                    .filter(r => !memberAssignments.some(ma => ma.role === r))
                                    .map(r => (
                                      <SelectItem key={r} value={r}>
                                        {r}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Parts Section */}
                          <div className="pt-4 border-t border-border">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                              Parts
                            </p>
                            <div className="space-y-1">
                              {memberParts.map(p => (
                                <div
                                  key={p.id}
                                  className="text-sm text-foreground flex items-center gap-2"
                                >
                                  <Puzzle size={12} className="text-info" />
                                  {p.name}
                                </div>
                              ))}
                              {memberParts.length === 0 && (
                                <p className="text-muted-foreground text-sm italic">
                                  No specific parts assigned.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* AUDIO TAB */}
          {activeTab === 'AUDIO' && (
            <div className="max-w-2xl mx-auto mt-10 animate-slide-in-from-bottom animation-forwards opacity-0 stagger-1">
              <Card className="shadow-2xl shadow-black/20">
                <CardContent className="p-8">
                  {audioBlobUrl ? (
                    <>
                      <div className="aspect-video bg-muted/30 rounded-2xl flex items-center justify-center mb-8 relative overflow-hidden border border-border">
                        <Music2 size={48} className="text-foreground relative z-10" />
                      </div>

                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold font-serif text-foreground">
                          {song.title}
                        </h3>
                        <p className="text-muted-foreground">Backing Track</p>
                      </div>

                      <audio
                        ref={audioPlayerRef}
                        src={audioBlobUrl}
                        controls
                        className="w-full mb-6"
                      />

                      <div className="flex justify-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            downloadFile(song.backingTrackUrl!, `${song.title}_backing_track`)
                          }
                          className="text-info gap-1"
                        >
                          <Download size={12} /> Download Track
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onUpdateSong({ ...song, backingTrackUrl: undefined });
                          }}
                          className="text-destructive gap-1"
                        >
                          <Trash2 size={12} /> Remove Track
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10">
                      <div className="mb-6 flex justify-center">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                          <UploadCloud size={32} className="text-muted-foreground" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold font-serif text-foreground mb-2">
                        Upload Backing Track
                      </h3>
                      <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                        Upload an MP3 or WAV file (max 10MB) to practice along with.
                      </p>
                      <label className="inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-bold cursor-pointer transition-colors">
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
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: AI Assistant */}
      <div className="w-full lg:w-96 bg-card border-l border-border flex flex-col shrink-0 h-1/2 lg:h-full">
        <div className="p-4 border-b border-border bg-card z-10">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            Studio Assistant
          </h3>
          <p className="text-xs text-muted-foreground">Ask about tone, gear, or tabs</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs shrink-0 text-primary font-bold">
              AI
            </div>
            <div className="bg-muted p-3 rounded-r-xl rounded-bl-xl text-sm text-foreground border border-border">
              Ready to rock? I can help you analyze tablature, suggest guitar tones for {song.title}
              , or plan assignments.
            </div>
          </div>

          {aiResponse && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs shrink-0 text-primary font-bold">
                AI
              </div>
              <div className="bg-muted p-3 rounded-r-xl rounded-bl-xl text-sm text-foreground border border-border prose prose-invert prose-sm max-w-none">
                {aiResponse.split('\n').map((line, i) => (
                  <p
                    key={i}
                    className={`mb-1 ${line.startsWith('#') ? 'font-bold text-foreground mt-2' : ''} ${line.startsWith('-') ? 'pl-4' : ''}`}
                  >
                    {line.replace(/^#+\s/, '').replace(/^-\s/, '• ')}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-card">
          <div className="relative">
            <Input
              type="text"
              value={aiChat}
              onChange={e => setAiChat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAskAI()}
              placeholder="Ask about this song..."
              className="pr-10"
            />
            <button
              onClick={() => handleAskAI()}
              disabled={loadingAi}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50"
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
