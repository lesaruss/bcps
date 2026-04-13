'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';
import NotesViewer from '@/components/NotesViewer';
import RevisionChat from '@/components/RevisionChat';

interface MeetingNote {
  id: string;
  transcript_id: string;
  content: any;
  content_markdown: string | null;
  is_public: boolean;
  share_token: string;
  pdf_path: string | null;
  docx_path: string | null;
  revision_count: number;
  max_free_revisions: number;
  extra_revisions_purchased: number;
  created_at: string;
  user_id: string;
  transcripts: { title: string } | null;
}

export default function NotesPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const noteId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [note, setNote] = useState<MeetingNote | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Handle payment success
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      // Refresh note data to get updated revision count
      setTimeout(() => fetchNote(), 1000);
    }
  }, [searchParams]);

  // Auth check + fetch note
  const fetchNote = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data, error } = await supabase
        .from('meeting_notes')
        .select('*, transcripts(title)')
        .eq('id', noteId)
        .eq('user_id', session.user.id)
        .single();

      if (error || !data) { router.push('/dashboard'); return; }
      setNote(data as MeetingNote);

      if (data.is_public && data.share_token) {
        setShareUrl(`${window.location.origin}/shared/${data.share_token}`);
      } else {
        setShareUrl(null);
      }
    } catch {
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, noteId, router]);

  useEffect(() => { fetchNote(); }, [fetchNote]);

  const title = note?.transcripts?.title || 'Meeting Notes';

  const handleRevision = async (requestText: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_note_id: noteId, request_text: requestText }),
      });
      if (res.status === 402) {
        alert('You\'ve used all available revisions. Purchase more to continue.');
        return;
      }
      if (!res.ok) throw new Error('Revision failed');
      await fetchNote();
    } catch (err) {
      console.error(err);
      alert('Revision failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchase = async () => {
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_note_id: noteId }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = async () => {
    if (!note) return;
    const newPublic = !note.is_public;
    await supabase.from('meeting_notes').update({ is_public: newPublic }).eq('id', noteId);
    if (newPublic) {
      const url = `${window.location.origin}/shared/${note.share_token}`;
      await navigator.clipboard.writeText(url);
      setShareUrl(url);
      alert('Share link copied to clipboard!');
    } else {
      setShareUrl(null);
    }
    setNote({ ...note, is_public: newPublic });
  };

  const handleDownload = (type: 'pdf' | 'docx') => {
    const path = type === 'pdf' ? note?.pdf_path : note?.docx_path;
    if (!path) {
      alert(`${type.toUpperCase()} document is being generated. Please check back shortly.`);
      return;
    }
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${path}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#EFEFEF' }}>
        <div className="animate-spin w-8 h-8 border-4 rounded-full" style={{ borderColor: '#EFEFEF', borderTopColor: '#1672A7' }} />
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EFEFEF' }}>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header bar */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <button onClick={() => router.push('/dashboard')} className="text-sm mb-2 inline-flex items-center gap-1" style={{ color: '#1672A7' }}>
                &larr; Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold" style={{ color: '#1672A7' }}>{title}</h1>
              <p className="text-xs mt-1" style={{ color: '#8B8B8B' }}>{new Date(note.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleDownload('pdf')} className="px-4 py-2 rounded-full text-xs font-medium text-white" style={{ backgroundColor: '#1672A7' }}>
                Download PDF
              </button>
              <button onClick={() => handleDownload('docx')} className="px-4 py-2 rounded-full text-xs font-medium text-white" style={{ backgroundColor: '#1672A7' }}>
                Download Word
              </button>
              <button onClick={handleShare} className="px-4 py-2 rounded-full text-xs font-medium border-2" style={{ borderColor: '#1672A7', color: '#1672A7' }}>
                {note.is_public ? 'Unshare' : 'Share Link'}
              </button>
            </div>
          </div>
          {shareUrl && (
            <div className="mt-4 p-3 rounded-lg text-xs flex items-center gap-2" style={{ backgroundColor: '#EBF4FA' }}>
              <span style={{ color: '#1672A7' }}>Public link:</span>
              <code className="flex-1 truncate" style={{ color: '#525252' }}>{shareUrl}</code>
              <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="text-xs font-medium" style={{ color: '#1672A7' }}>Copy</button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <NotesViewer content={note.content} title={title} />
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <RevisionChat
                revisionCount={note.revision_count}
                maxFree={note.max_free_revisions}
                extraPurchased={note.extra_revisions_purchased}
                isProcessing={isProcessing}
                onSubmitRevision={handleRevision}
                onPurchaseClick={handlePurchase}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
