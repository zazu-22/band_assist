import React, { useState } from 'react';
import { Edit3, Eye, MessageSquare, X, ArrowUp, ArrowDown } from 'lucide-react';
import { Annotation } from '../types';

interface SmartTabEditorProps {
  content: string;
  onChange: (content: string) => void;
  annotations: Annotation[];
  onUpdateAnnotations: (annotations: Annotation[]) => void;
  readOnly?: boolean;
}

type LineType = 'CHORD' | 'TAB' | 'HEADER' | 'LYRIC' | 'EMPTY';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const SmartTabEditor: React.FC<SmartTabEditorProps> = ({
  content,
  onChange,
  annotations = [],
  onUpdateAnnotations,
  readOnly = false,
}) => {
  const [mode, setMode] = useState<'EDIT' | 'VIEW'>(readOnly ? 'VIEW' : 'VIEW');
  const [activeAnnotationLine, setActiveAnnotationLine] = useState<number | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [transposeLevel, setTransposeLevel] = useState(0);

  // --- Transposition Logic ---
  const transposeChord = (chord: string, semitones: number) => {
    if (semitones === 0) return chord;

    // Split chord into root and suffix (e.g. "C#m7" -> "C#", "m7")
    // Logic: Match A-G followed by optional # or b
    const match = chord.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return chord;

    const root = match[1];
    const suffix = match[2];

    let index = NOTES.indexOf(root);
    if (index === -1) index = NOTES_FLAT.indexOf(root);
    if (index === -1) return chord; // Unrecognized root

    let newIndex = (index + semitones) % 12;
    if (newIndex < 0) newIndex += 12;

    // Prefer sharps for simplicity unless we add sophisticated key logic later
    return NOTES[newIndex] + suffix;
  };

  const transposeLine = (line: string, amount: number): string => {
    if (amount === 0) return line;

    // Tokenize by preserving whitespace
    // We split by spaces but keep them in the array to reconstruct string with correct spacing
    // However, simple split/join destroys spacing alignment often needed for chords over lyrics
    // Better approach: Find all chords and replace them in place

    // Regex matches standard chord formats including slashes e.g. G/B
    const chordRegex = /([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M)?[0-9]*(?:\/[A-G][#b]?)?)/g;

    return line.replace(chordRegex, match => transposeChord(match, amount));
  };

  // --- Parsing Logic ---
  const analyzeLine = (line: string): LineType => {
    const trimmed = line.trim();
    if (!trimmed) return 'EMPTY';

    // Tab detection: contains many dashes or pipes
    if (/[-|]{3,}/.test(line)) return 'TAB';

    // Header detection: [Chorus], Verse 1:, etc.
    if (/^\[.*\]$/.test(trimmed) || trimmed.endsWith(':')) return 'HEADER';

    // Improved Chord Detection
    // 1. Filter out common words that look like chords (A, I, Am - tricky)
    // 2. Chords often have lots of spacing.
    // 3. Check if line contains mostly valid chord patterns and spaces

    // Remove pure whitespace to check content
    const noSpace = line.replace(/\s+/g, '');
    if (noSpace.length === 0) return 'EMPTY';

    const tokens = trimmed.split(/\s+/);
    // Exclude common lyrics words that look like chords if they appear in isolation
    const commonWords = ['I', 'A', 'AM', 'SO', 'DO', 'GO', 'TO', 'BE', 'AT', 'ON', 'IN'];

    const validChordPattern = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|M)?[0-9]*(?:\/[A-G][#b]?)?$/;

    const chordCount = tokens.filter(
      t => validChordPattern.test(t) && !commonWords.includes(t.toUpperCase())
    ).length;
    const tokenCount = tokens.length;

    // Heuristic: If > 50% of tokens are chords, or if it's just spaces and valid chords
    if (tokenCount > 0 && chordCount / tokenCount > 0.5) return 'CHORD';

    // Edge case: "A D E" (All chords)
    if (tokenCount > 0 && chordCount === tokenCount) return 'CHORD';

    return 'LYRIC';
  };

  const handleAddAnnotation = () => {
    if (activeAnnotationLine === null || !newNoteText.trim()) return;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      lineIndex: activeAnnotationLine,
      text: newNoteText,
      color: 'yellow',
    };

    // Remove existing annotation on this line if any, then add new
    const filtered = annotations.filter(a => a.lineIndex !== activeAnnotationLine);
    onUpdateAnnotations([...filtered, newAnnotation]);
    setActiveAnnotationLine(null);
    setNewNoteText('');
  };

  const handleDeleteAnnotation = (id: string) => {
    onUpdateAnnotations(annotations.filter(a => a.id !== id));
  };

  const renderViewMode = () => {
    const lines = (content || '').split('\n');

    return (
      <div className="font-mono text-sm relative min-h-[400px] bg-zinc-900 rounded-xl p-4 overflow-x-auto">
        {lines.map((originalLine, idx) => {
          const type = analyzeLine(originalLine);

          // Apply transposition ONLY to chord lines
          const lineToRender =
            type === 'CHORD' && transposeLevel !== 0
              ? transposeLine(originalLine, transposeLevel)
              : originalLine;

          const annotation = annotations.find(a => a.lineIndex === idx);

          let className = 'whitespace-pre min-h-[1.5em] px-2 rounded relative ';
          if (type === 'CHORD') className += 'text-amber-500 font-bold mt-2';
          else if (type === 'TAB')
            className += 'text-cyan-400 leading-none tracking-tighter opacity-90';
          else if (type === 'HEADER')
            className +=
              'text-white font-bold text-lg mt-4 mb-2 bg-zinc-800/50 inline-block px-3 py-1 rounded-lg border border-zinc-700';
          else if (type === 'LYRIC') className += 'text-zinc-300 font-sans text-base tracking-wide';

          return (
            <div key={idx} className="group relative hover:bg-zinc-800/30 transition-colors flex">
              {/* Line Number / Action Gutter */}
              {!readOnly && (
                <div
                  className="w-8 shrink-0 text-zinc-700 text-[10px] select-none flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                  onClick={() => {
                    setActiveAnnotationLine(idx);
                    setNewNoteText(annotation?.text || '');
                  }}
                >
                  <MessageSquare size={12} />
                </div>
              )}

              {/* Content */}
              <div className={`flex-1 ${className}`}>{lineToRender}</div>

              {/* Annotation Note */}
              {annotation && (
                <div className="absolute right-4 top-0 z-10">
                  <div className="bg-yellow-200/10 backdrop-blur-md border border-yellow-500/50 text-yellow-200 text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 max-w-xs">
                    <span>{annotation.text}</span>
                    {!readOnly && (
                      <button
                        onClick={() => handleDeleteAnnotation(annotation.id)}
                        className="hover:text-white"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Annotation Input Modal/Popup */}
        {activeAnnotationLine !== null && (
          <div
            className="absolute left-12 z-20 bg-zinc-800 border border-zinc-700 shadow-xl rounded-lg p-3 w-64 animate-in fade-in zoom-in-95"
            style={{ top: `${activeAnnotationLine * 1.5}em` }}
          >
            <h4 className="text-xs font-bold text-zinc-400 mb-2">Add Performance Note</h4>
            <textarea
              autoFocus
              className="w-full bg-zinc-900 text-white text-sm p-2 rounded border border-zinc-700 outline-none mb-2"
              rows={2}
              value={newNoteText}
              onChange={e => setNewNoteText(e.target.value)}
              placeholder="e.g. Watch the tempo..."
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddAnnotation();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActiveAnnotationLine(null)}
                className="px-2 py-1 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAnnotation}
                className="px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col ${readOnly ? 'min-h-0' : 'h-full'}`}>
      {!readOnly && (
        <div className="flex items-center justify-between bg-zinc-950 border-b border-zinc-800 p-2 rounded-t-xl flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-2 hidden md:inline">
              {mode === 'VIEW' ? 'Smart View' : 'Raw Editor'}
            </span>

            {mode === 'VIEW' && (
              <div className="flex items-center bg-zinc-900 rounded-lg border border-zinc-800 p-0.5">
                <button
                  onClick={() => setTransposeLevel(prev => prev - 1)}
                  className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
                  title="Transpose Down"
                >
                  <ArrowDown size={14} />
                </button>
                <div className="px-2 text-xs font-mono text-amber-500 font-bold w-8 text-center">
                  {transposeLevel > 0 ? `+${transposeLevel}` : transposeLevel}
                </div>
                <button
                  onClick={() => setTransposeLevel(prev => prev + 1)}
                  className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
                  title="Transpose Up"
                >
                  <ArrowUp size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            <button
              onClick={() => setMode('VIEW')}
              className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all ${mode === 'VIEW' ? 'bg-zinc-800 text-amber-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Eye size={14} /> Read
            </button>
            <button
              onClick={() => setMode('EDIT')}
              className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all ${mode === 'EDIT' ? 'bg-zinc-800 text-amber-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Edit3 size={14} /> Edit
            </button>
          </div>
        </div>
      )}

      <div
        className={`flex-1 bg-zinc-900 border border-zinc-800 ${readOnly ? 'rounded-xl border-none overflow-visible' : 'rounded-b-xl overflow-auto'}`}
      >
        {mode === 'EDIT' ? (
          <textarea
            className="w-full h-full bg-zinc-900 text-zinc-300 font-mono text-sm p-4 outline-none resize-none leading-relaxed"
            value={content}
            onChange={e => onChange(e.target.value)}
            spellCheck={false}
            placeholder="Paste tabs here..."
          />
        ) : (
          renderViewMode()
        )}
      </div>
    </div>
  );
};
