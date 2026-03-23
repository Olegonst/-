import React, { useCallback, useState } from 'react';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';

interface FileUploadProps {
  label: string;
  accept: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  icon: React.ElementType;
}

export function FileUpload({ label, accept, file, onFileSelect, icon: Icon }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFileSelect(e.dataTransfer.files[0]);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFileSelect(e.target.files[0]);
      }
    },
    [onFileSelect]
  );

  if (file) {
    return (
      <div className="relative flex items-center p-4 border rounded-xl bg-neutral-900 border-neutral-800 shadow-sm">
        <div className="flex items-center justify-center w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-lg mr-4">
          <FileIcon size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-200 truncate">{file.name}</p>
          <p className="text-xs text-neutral-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        <button
          onClick={() => onFileSelect(null)}
          className="p-2 text-neutral-500 hover:text-red-400 transition-colors"
          title="Remove file"
        >
          <X size={20} />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
        isDragging
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-neutral-800 bg-neutral-950 hover:bg-neutral-900'
      }`}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="flex items-center justify-center w-16 h-16 bg-neutral-900 rounded-full shadow-sm mb-4 text-indigo-400">
        <Icon size={32} />
      </div>
      <p className="text-sm font-medium text-neutral-200 mb-1">{label}</p>
      <p className="text-xs text-neutral-400 text-center max-w-xs">
        Drag and drop or click to browse
      </p>
    </div>
  );
}
