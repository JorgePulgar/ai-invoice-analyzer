import { useRef, useState } from 'react';

interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function DropZone({ onFile, disabled = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  };

  const baseClasses =
    'flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-8 py-16 transition-colors';
  const stateClasses = disabled
    ? 'border-bn-hairline bg-bn-elevated cursor-not-allowed opacity-50'
    : isDragging
      ? 'border-bn-yellow bg-bn-yellow/5 cursor-copy'
      : 'border-bn-elevated bg-bn-card hover:border-bn-muted cursor-pointer';

  return (
    <div
      className={`${baseClasses} ${stateClasses}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      <div className="text-4xl select-none">📄</div>

      <div className="text-center">
        <p className="text-sm font-medium text-bn-body">
          {isDragging ? 'Drop the file here' : 'Drag your PDF invoice here'}
        </p>
        <p className="text-xs text-bn-muted mt-1">or</p>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
        className="text-sm font-semibold bg-bn-yellow text-bn-ink px-5 py-2 rounded hover:bg-bn-yellow-hover transition-colors disabled:bg-bn-yellow-dim disabled:text-bn-muted disabled:cursor-not-allowed"
      >
        Select file
      </button>

      <p className="text-xs text-bn-muted">PDF only · max 10 MB</p>
    </div>
  );
}
