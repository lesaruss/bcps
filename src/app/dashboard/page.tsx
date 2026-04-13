'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';
import FileUpload from '@/components/FileUpload';
import ParticipantForm from '@/components/ParticipantForm';

interface TranscriptWithNote {
  id: string;
  title: string;
  status: string;
  created_at: string;
  meeting_notes: { id: string; share_token: string; is_public: boolean }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [transcripts, setTranscripts] = useState<TranscriptWithNote[]>([]);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [currentTranscriptId, setCurrentTranscriptId] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      setIsAuthenticated(true);
      setIsLoading(false);
    };
    checkAuth();
  }, [supabase, router]);

  const fetchTranscripts = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from('transcripts')
      .select('id, title, status, created_at, meeting_notes(id, share_token, is_public)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (data) setTranscripts(data as TranscriptWithNote[]);
  }, [supabase]);

  useEffect(() => {
    if (isAuthenticated) fetchTranscripts();
  }, [isAuthenticated, fetchTranscripts]);

  // Poll for processing transcripts
  useEffect(() => {
    if (processingIds.size === 0) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('transcripts')
        .select('id, status, meeting_notes(id)')
        .in('id', Array.from(processingIds));
      if (data) {
        const done = data.filter((t: any) => t.status === 'completed' || t.status === 'error');
        if (done.length > 0) {
          setProcessingIds(prev => {
            const next = new Set(prev);
            done.forEach((d: any) => next.delete(d.id));
            return next;
          });
          fetchTranscripts();
          const completed = done.find((d: any) => d.status === 'completed' && d.meeting_notes?.length > 0);
          if (completed) {
            router.push(`/notes/${completed.meeting_notes[0].id}`);
          }
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [processingIds, supabase, fetchTranscripts, router]);

  const handleUploadComplete = async (transcriptId: string) => {
    setCurrentTranscriptId(transcriptId);
    setShowParticipantForm(true);
  };

  const startProcessing = async (transcriptId: string) => {
    setProcessingIds(prev => new Set(prev).add(transcriptId));
    fetchTranscripts();
    try {
      await fetch('/api/process-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript_id: transcriptId }),
      });
    } catch (err) {
      console.error('Processing error:', err);
      fetchTranscripts();
    }
  };

  const handleRetry = async (transcriptId: string) => {
    startProcessing(transcriptId);
  };

  const handleDelete = async (transcriptId: string) => {
    setDeletingId(transcriptId);
    try {
      const res = await fetch('/api/delete-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript_id: transcriptId }),
      });
      if (!res.ok) throw new Error('Delete failed');
      setTranscripts(prev => prev.filter(t => t.id !== transcriptId));
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      uploaded: 'bg-gray-200 text-gray-700',
      processing: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
    };
    return styles[status] || styles.uploaded;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#EFEFEF' }}>
        <div className="animate-spin w-8 h-8 border-4 rounded-full" style={{ borderColor: '#EFEFEF', borderTopColor: '#1672A7' }} />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EFEFEF' }}>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4" style={{ color: '#1672A7' }}>Upload Transcript</h2>
              <FileUpload onUploadComplete={handleUploadComplete} />
            </div>
          </div>

          {/* Past Transcripts */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold mb-6" style={{ color: '#1672A7' }}>Your Documents</h2>
              {transcripts.length === 0 ? (
                <p className="text-center py-12 text-gray-400">No transcripts yet. Upload one to get started!</p>
              ) : (
                <div className="space-y-3">
                  {transcripts.map((t) => (
                    <div key={t.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{t.title}</h3>
                          <p className="text-xs text-gray-500">{new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadge(t.status)}`}>
                          {t.status === 'processing' && processingIds.has(t.id) ? 'Processing...' : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {t.status === 'completed' && t.meeting_notes?.length > 0 && (
                          <button
                            onClick={() => router.push(`/notes/${t.meeting_notes[0].id}`)}
                            className="px-4 py-1.5 text-white rounded-md text-xs font-medium"
                            style={{ backgroundColor: '#1672A7' }}
                          >
                            View Notes
                          </button>
                        )}
                        {t.status === 'error' && (
                          <button
                            onClick={() => handleRetry(t.id)}
                            disabled={processingIds.has(t.id)}
                            className="px-4 py-1.5 text-white rounded-md text-xs font-medium"
                            style={{ backgroundColor: '#F4C436', color: '#262626' }}
                          >
                            Retry
                          </button>
                        )}
                        {confirmDeleteId === t.id ? (
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Delete this?</span>
                            <button
                              onClick={() => handleDelete(t.id)}
                              disabled={deletingId === t.id}
                              className="px-3 py-1 rounded-md text-xs font-medium text-white bg-red-600 hover:bg-red-700"
                            >
                              {deletingId === t.id ? 'Deleting...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1 rounded-md text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(t.id)}
                            className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete transcript"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showParticipantForm && currentTranscriptId && (
        <ParticipantForm
          transcriptId={currentTranscriptId}
          onClose={() => { setShowParticipantForm(false); }}
          onSubmit={() => {
            setShowParticipantForm(false);
            if (currentTranscriptId) startProcessing(currentTranscriptId);
          }}
        />
      )}
    </div>
  );
}
