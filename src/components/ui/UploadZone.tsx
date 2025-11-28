import React, { memo, useState, useRef, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
  /** Called when file(s) are selected or dropped */
  onUpload: (files: FileList) => void;
  /** Accepted file types (e.g., "audio/*", "image/*,.pdf") */
  accept?: string;
  /** Primary text shown in the zone */
  title?: string;
  /** Secondary text with file type hints */
  subtitle?: string;
  /** Custom icon component (defaults to UploadCloud) */
  icon?: LucideIcon;
  /** Whether multiple files can be selected */
  multiple?: boolean;
  /** Whether the upload zone is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A reusable drag-and-drop upload zone component.
 * Follows the design system styling with dashed border pattern.
 */
export const UploadZone: React.FC<UploadZoneProps> = memo(function UploadZone({
  onUpload,
  accept,
  title = 'Upload file',
  subtitle,
  icon: Icon = UploadCloud,
  multiple = false,
  disabled = false,
  className,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onUpload(files);
      }
    },
    [disabled, onUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onUpload(files);
      }
      // Reset input to allow selecting the same file again
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [onUpload]
  );

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
        disabled
          ? 'opacity-50 cursor-not-allowed border-muted'
          : 'cursor-pointer',
        isDragging
          ? 'border-primary bg-primary/5'
          : !disabled && 'border-border hover:border-primary/50',
        className
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={title}
    >
      <Icon size={32} className="mx-auto text-muted-foreground mb-3" />
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
        aria-hidden="true"
      />
    </div>
  );
});

UploadZone.displayName = 'UploadZone';
