import { describe, it, expect } from 'vitest';
import {
  sanitizeFilename,
  extractFileExtension,
  generateDownloadFilename,
} from './utils';

describe('sanitizeFilename', () => {
  it('removes invalid filesystem characters', () => {
    expect(sanitizeFilename('file/name')).toBe('file_name');
    expect(sanitizeFilename('file\\name')).toBe('file_name');
    expect(sanitizeFilename('file:name')).toBe('file_name');
    expect(sanitizeFilename('file*name')).toBe('file_name');
    expect(sanitizeFilename('file?name')).toBe('file_name');
    expect(sanitizeFilename('file"name')).toBe('file_name');
    expect(sanitizeFilename('file<name')).toBe('file_name');
    expect(sanitizeFilename('file>name')).toBe('file_name');
    expect(sanitizeFilename('file|name')).toBe('file_name');
  });

  it('handles multiple invalid characters', () => {
    expect(sanitizeFilename('Rock/Pop: Best Song!')).toBe('Rock_Pop_Best_Song!');
    expect(sanitizeFilename('file<>:"/\\|?*name')).toBe('file_name');
  });

  it('removes control characters', () => {
    expect(sanitizeFilename('file\x00name')).toBe('filename');
    expect(sanitizeFilename('file\x1fname')).toBe('filename');
    expect(sanitizeFilename('hello\nworld')).toBe('helloworld');
    expect(sanitizeFilename('hello\tworld')).toBe('helloworld');
  });

  it('collapses multiple underscores and spaces', () => {
    expect(sanitizeFilename('file___name')).toBe('file_name');
    expect(sanitizeFilename('file   name')).toBe('file_name');
    expect(sanitizeFilename('file _ _ name')).toBe('file_name');
  });

  it('trims leading and trailing underscores/spaces', () => {
    expect(sanitizeFilename('  file name  ')).toBe('file_name');
    expect(sanitizeFilename('___filename___')).toBe('filename');
    expect(sanitizeFilename(' _ file _ ')).toBe('file');
  });

  it('removes leading dots', () => {
    expect(sanitizeFilename('.hidden')).toBe('hidden');
    expect(sanitizeFilename('...dots')).toBe('dots');
    expect(sanitizeFilename('.file.txt')).toBe('file.txt');
  });

  it('returns "download" for empty or all-invalid input', () => {
    expect(sanitizeFilename('')).toBe('download');
    expect(sanitizeFilename('   ')).toBe('download');
    expect(sanitizeFilename(':::***')).toBe('download');
    expect(sanitizeFilename('...')).toBe('download');
  });

  it('truncates very long filenames', () => {
    const longName = 'a'.repeat(250);
    const result = sanitizeFilename(longName);
    expect(result.length).toBe(200);
  });

  it('preserves valid characters', () => {
    expect(sanitizeFilename('My Song (2023) [Live]')).toBe('My_Song_(2023)_[Live]');
    expect(sanitizeFilename("Rock'n'Roll")).toBe("Rock'n'Roll");
    expect(sanitizeFilename('Song - Artist feat. Guest')).toBe('Song_-_Artist_feat._Guest');
  });

  it('handles unicode characters', () => {
    expect(sanitizeFilename('Über Cool Song')).toBe('Über_Cool_Song');
    expect(sanitizeFilename('日本語ファイル')).toBe('日本語ファイル');
    expect(sanitizeFilename('Cañón')).toBe('Cañón');
  });
});

describe('extractFileExtension', () => {
  it('extracts extension from simple filenames', () => {
    expect(extractFileExtension('file.txt')).toBe('txt');
    expect(extractFileExtension('document.pdf')).toBe('pdf');
    expect(extractFileExtension('image.PNG')).toBe('png');
    expect(extractFileExtension('audio.MP3')).toBe('mp3');
  });

  it('handles multiple dots in filename', () => {
    expect(extractFileExtension('file.backup.txt')).toBe('txt');
    expect(extractFileExtension('my.song.name.mp3')).toBe('mp3');
  });

  it('extracts extension from URLs', () => {
    expect(extractFileExtension('https://example.com/files/doc.pdf')).toBe('pdf');
    expect(extractFileExtension('/path/to/file.jpg')).toBe('jpg');
  });

  it('handles query parameters in URLs', () => {
    expect(extractFileExtension('https://example.com/file.pdf?token=abc123')).toBe('pdf');
    expect(extractFileExtension('file.mp3?v=2&t=1234')).toBe('mp3');
  });

  it('handles hash fragments in URLs', () => {
    expect(extractFileExtension('https://example.com/file.pdf#page=5')).toBe('pdf');
  });

  it('handles URL-encoded characters', () => {
    expect(extractFileExtension('https://example.com/my%20file.pdf')).toBe('pdf');
  });

  it('returns undefined for files without extension', () => {
    expect(extractFileExtension('filename')).toBeUndefined();
    expect(extractFileExtension('no-extension')).toBeUndefined();
    expect(extractFileExtension('.hidden')).toBeUndefined();
  });

  it('returns undefined for invalid extensions', () => {
    expect(extractFileExtension('file.verylongextensionname')).toBeUndefined();
    expect(extractFileExtension('file.')).toBeUndefined();
  });

  it('validates extension format', () => {
    expect(extractFileExtension('file.mp3')).toBe('mp3');
    expect(extractFileExtension('file.jpeg')).toBe('jpeg');
    expect(extractFileExtension('file.gp5')).toBe('gp5');
  });
});

describe('generateDownloadFilename', () => {
  it('combines song title and item name', () => {
    expect(generateDownloadFilename('Sweet Child', 'Lead Guitar', 'pdf'))
      .toBe('Sweet_Child - Lead_Guitar.pdf');
  });

  it('sanitizes song title and item name', () => {
    expect(generateDownloadFilename('Rock/Pop: Hit', 'Lead Tab', 'pdf'))
      .toBe('Rock_Pop_Hit - Lead_Tab.pdf');
  });

  it('extracts extension from item name if not provided', () => {
    expect(generateDownloadFilename('My Song', 'chart.pdf'))
      .toBe('My_Song - chart.pdf');
    expect(generateDownloadFilename('My Song', 'audio.mp3'))
      .toBe('My_Song - audio.mp3');
  });

  it('uses provided extension over extracted one', () => {
    expect(generateDownloadFilename('Song', 'file.txt', 'pdf'))
      .toBe('Song - file.pdf');
  });

  it('lowercases extension', () => {
    expect(generateDownloadFilename('Song', 'Chart', 'PDF'))
      .toBe('Song - Chart.pdf');
    expect(generateDownloadFilename('Song', 'file.MP3'))
      .toBe('Song - file.mp3');
  });

  it('handles item name without extension', () => {
    expect(generateDownloadFilename('My Song', 'backing_track', 'mp3'))
      .toBe('My_Song - backing_track.mp3');
  });

  it('works without extension', () => {
    expect(generateDownloadFilename('Song Title', 'Chart Name'))
      .toBe('Song_Title - Chart_Name');
  });

  it('handles special characters in both parts', () => {
    expect(generateDownloadFilename("Rock'n'Roll", 'Live @ Concert', 'pdf'))
      .toBe("Rock'n'Roll - Live_@_Concert.pdf");
  });

  it('handles empty song title gracefully', () => {
    expect(generateDownloadFilename('', 'Chart', 'pdf'))
      .toBe('download - Chart.pdf');
  });

  it('handles empty item name gracefully', () => {
    expect(generateDownloadFilename('Song', '', 'pdf'))
      .toBe('Song - download.pdf');
  });
});
