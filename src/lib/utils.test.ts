import { describe, it, expect } from 'vitest';
import {
  sanitizeFilename,
  extractFileExtension,
  extractExtensionFromDataUrl,
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

  it('strips trailing dots for Windows compatibility', () => {
    expect(sanitizeFilename('filename.')).toBe('filename');
    expect(sanitizeFilename('filename...')).toBe('filename');
    expect(sanitizeFilename('file.name.')).toBe('file.name');
    expect(sanitizeFilename('..file..')).toBe('file');
  });

  it('handles Windows reserved filenames', () => {
    // Reserved names get prefixed with underscore
    expect(sanitizeFilename('CON')).toBe('_CON');
    expect(sanitizeFilename('con')).toBe('_con');
    expect(sanitizeFilename('PRN')).toBe('_PRN');
    expect(sanitizeFilename('AUX')).toBe('_AUX');
    expect(sanitizeFilename('NUL')).toBe('_NUL');
    expect(sanitizeFilename('COM1')).toBe('_COM1');
    expect(sanitizeFilename('COM9')).toBe('_COM9');
    expect(sanitizeFilename('LPT1')).toBe('_LPT1');
    expect(sanitizeFilename('LPT9')).toBe('_LPT9');
  });

  it('does not modify non-reserved names that contain reserved strings', () => {
    // These contain reserved strings but are not reserved names themselves
    expect(sanitizeFilename('CONCERT')).toBe('CONCERT');
    expect(sanitizeFilename('icon')).toBe('icon');
    expect(sanitizeFilename('auxiliary')).toBe('auxiliary');
    expect(sanitizeFilename('COM10')).toBe('COM10');
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

  it('extracts extension from data URLs', () => {
    expect(extractFileExtension('data:audio/wav;base64,UklGR...')).toBe('wav');
    expect(extractFileExtension('data:audio/mpeg;base64,//uQ...')).toBe('mp3');
    expect(extractFileExtension('data:image/png;base64,iVBOR...')).toBe('png');
    expect(extractFileExtension('data:image/jpeg;base64,/9j/4...')).toBe('jpg');
    expect(extractFileExtension('data:application/pdf;base64,JVB...')).toBe('pdf');
  });

  it('handles data URLs without base64 encoding', () => {
    expect(extractFileExtension('data:text/plain,Hello')).toBeUndefined();
    expect(extractFileExtension('data:audio/ogg,rawdata')).toBe('ogg');
  });

  it('returns undefined for unknown MIME types in data URLs', () => {
    expect(extractFileExtension('data:application/octet-stream;base64,...')).toBeUndefined();
    expect(extractFileExtension('data:video/mp4;base64,...')).toBeUndefined();
  });
});

describe('extractExtensionFromDataUrl', () => {
  it('extracts audio extensions from data URLs', () => {
    expect(extractExtensionFromDataUrl('data:audio/wav;base64,UklGR...')).toBe('wav');
    expect(extractExtensionFromDataUrl('data:audio/mpeg;base64,//uQ...')).toBe('mp3');
    expect(extractExtensionFromDataUrl('data:audio/mp3;base64,//uQ...')).toBe('mp3');
    expect(extractExtensionFromDataUrl('data:audio/ogg;base64,...')).toBe('ogg');
    expect(extractExtensionFromDataUrl('data:audio/flac;base64,...')).toBe('flac');
    expect(extractExtensionFromDataUrl('data:audio/aac;base64,...')).toBe('aac');
    expect(extractExtensionFromDataUrl('data:audio/mp4;base64,...')).toBe('m4a');
    expect(extractExtensionFromDataUrl('data:audio/x-m4a;base64,...')).toBe('m4a');
    expect(extractExtensionFromDataUrl('data:audio/webm;base64,...')).toBe('webm');
  });

  it('extracts image extensions from data URLs', () => {
    expect(extractExtensionFromDataUrl('data:image/png;base64,iVBOR...')).toBe('png');
    expect(extractExtensionFromDataUrl('data:image/jpeg;base64,/9j/4...')).toBe('jpg');
    expect(extractExtensionFromDataUrl('data:image/gif;base64,...')).toBe('gif');
    expect(extractExtensionFromDataUrl('data:image/webp;base64,...')).toBe('webp');
  });

  it('extracts document extensions from data URLs', () => {
    expect(extractExtensionFromDataUrl('data:application/pdf;base64,JVB...')).toBe('pdf');
  });

  it('handles various WAV MIME type variants', () => {
    expect(extractExtensionFromDataUrl('data:audio/wav;base64,...')).toBe('wav');
    expect(extractExtensionFromDataUrl('data:audio/wave;base64,...')).toBe('wav');
    expect(extractExtensionFromDataUrl('data:audio/x-wav;base64,...')).toBe('wav');
  });

  it('returns undefined for non-data URLs', () => {
    expect(extractExtensionFromDataUrl('https://example.com/file.mp3')).toBeUndefined();
    expect(extractExtensionFromDataUrl('/path/to/file.wav')).toBeUndefined();
    expect(extractExtensionFromDataUrl('file.mp3')).toBeUndefined();
  });

  it('returns undefined for unknown MIME types', () => {
    expect(extractExtensionFromDataUrl('data:application/octet-stream;base64,...')).toBeUndefined();
    expect(extractExtensionFromDataUrl('data:text/html;base64,...')).toBeUndefined();
  });

  it('handles case insensitivity', () => {
    expect(extractExtensionFromDataUrl('data:AUDIO/WAV;base64,...')).toBe('wav');
    expect(extractExtensionFromDataUrl('data:Audio/MPEG;base64,...')).toBe('mp3');
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

  it('truncates very long combined filenames to 200 chars total', () => {
    const longTitle = 'A'.repeat(150);
    const longItem = 'B'.repeat(100);
    const result = generateDownloadFilename(longTitle, longItem, 'pdf');
    // Should be truncated to 200 chars including extension
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result.endsWith('.pdf')).toBe(true);
  });

  it('cleans up trailing dashes and spaces after truncation', () => {
    // Create a title that will cause truncation right after a dash/space
    const title = 'A'.repeat(190) + ' - ';
    const item = 'B'.repeat(50);
    const result = generateDownloadFilename(title, item, 'pdf');
    // Should not end with " - .pdf" or similar
    expect(result).not.toMatch(/[\s-]+\.pdf$/);
    expect(result.endsWith('.pdf')).toBe(true);
  });

  it('normalizes extension with whitespace', () => {
    expect(generateDownloadFilename('Song', 'Chart', '  PDF  '))
      .toBe('Song - Chart.pdf');
  });

  it('handles Windows reserved names in song titles', () => {
    expect(generateDownloadFilename('CON', 'Chart', 'pdf'))
      .toBe('_CON - Chart.pdf');
    expect(generateDownloadFilename('aux', 'Tab', 'pdf'))
      .toBe('_aux - Tab.pdf');
  });

  it('ignores excessively long extensions', () => {
    const longExt = 'a'.repeat(15);
    // Extensions > 10 chars should be ignored for safety
    expect(generateDownloadFilename('Song', 'Chart', longExt))
      .toBe('Song - Chart');
  });
});
