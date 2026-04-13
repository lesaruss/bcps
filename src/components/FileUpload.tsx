'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';

interface FileUploadProps {
  onUploadComplete: (transcriptId: string) => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && isValidFile(files[0])) {
      setSelectedFile(files[0]);
      setError('');
    } else {
      setError('Please upload a .srt, .txt, or .vtt file');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0 && isValidFile(files[0])) {
      setSelectedFile(files[0]);
      setError('');
    }
    e.currentTarget.value = '';
  };

  const isValidFile = (file: File): boolean => {
    const name = file.name.toLowerCase();
    return name.endsWith('.srt') || name.endsWith('.txt') || name.endsWith('.vtt');
  };

  const getFileType = (name: string): string => {
    if (name.endsWith('.srt')) return 'srt';
    if (name.endsWith('.vtt')) return 'vtt';
    return 'txt';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const userId = session.user.id;
      const fileType = getFileType(selectedFile.name);
      const filePath = `${userId}/${Date.now()}_${selectedFile.name}`;

      // Read file content
      const rawText = await selectedFile.text();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('transcripts')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Create transcript record
      const { data: transcript, error: dbError } = await supabase
        .from('transcripts')
        .insert({
          user_id: userId,
          title: selectedFile.name.replace(/\.(srt|txt|vtt)$/i, ''),
          file_name: selectedFile.name,
          file_type: fileType,
          file_path: filePath,
          raw_text: rawText,
          status: 'uploaded',
        })
        .select('id')
        .single();

      if (dbError) throw dbError;

      setSelectedFile(null);
      onUploadComplete(transcript.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!selectedFile ? () => fileInputRef.current?.click() : undefined}
        className="relative p-8 sm:p-12 rounded-lg border-2 border-dashed transition-all cursor-pointer"
        style={{
          borderColor: '#1672A7',
          backgroundColor: isDragOver ? '#EBF4FA' : selectedFile ? '#F9F9F9' : '#FFFFFF',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".srt,.txt,.vtt"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {!selectedFile ? (
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="#1672A7" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33A3 3 0 0116.5 19.5H6.75z" />
            </svg>
            <p className="text-lg font-semibold mb-1" style={{ color: '#1672A7' }}>
              Drag & drop your transcript file here
            </p>
            <p className="text-sm" style={{ color: '#525252' }}>or click to browse</p>
            <p className="text-xs mt-3" style={{ color: '#8B8B8B' }}>Accepts .srt, .txt, .vtt</p>
          </div>
        ) : (
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="#1672A7" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold" style={{ color: '#262626' }}>{selectedFile.name}</p>
            <p className="text-sm mb-4" style={{ color: '#525252' }}>{formatFileSize(selectedFile.size)}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                disabled={isUploading}
                className="px-5 py-2.5 rounded-full text-sm font-medium border-2"
                style={{ borderColor: '#1672A7', color: '#1672A7' }}
              >
                Change File
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                disabled={isUploading}
                className="px-6 py-2.5 rounded-full text-sm font-medium flex items-center gap-2"
                style={{ backgroundColor: '#F4C436', color: '#262626' }}
              >
                {isUploading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </>
                ) : 'Upload & Process'}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
