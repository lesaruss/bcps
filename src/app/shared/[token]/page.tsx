'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import NotesViewer from '@/components/NotesViewer';

export default function SharedNotesPage() {
  const params = useParams();
  const supabase = createClient();
  const token = params.token as string;
  const [isLoading, setIsLoading] = useState(true);
  const [note, setNote] = useState<any>(null);
  const [title, setTitle] = useState('Meeting Notes');
  useEffect(() => {
    const fetchNote = async () => {
      try {
        const { data, error } = await supabase.from('meeting_notes').select('id, content, pdf_path, docx_path, created_at, is_public, transcript_id, transcripts(title)').eq('share_token', token).eq('is_public', true).single();
        if (error || !data) return;
        setNote(data);
        setTitle((data as any).transcripts?.title || 'Meeting Notes');
      } catch {} finally { setIsLoading(false); }
    };
    fetchNote();
  }, [supabase, token]);
  if (isLoading) return (<div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#EFEFEF' }}><div className="animate-spin w-8 h-8 border-4 rounded-full" style={{ borderColor: '#EFEFEF', borderTopColor: '#1672A7' }} /></div></div>);
  if (!note) return (<div className="flex items-center justify-center min-h-screen"><div className="text-center"><h1 className="text-2xl font-bold mb-2">Document Not Found</h1><p style={{ color: '#525252' }}>This document is not available.</p></div></div>);
  const handleDownload = (type: 'pdf' | 'docx') => {
    const path = type === 'pdf' ? note.pdf_path : note.docx_path;
    if (!path) { alert(`${type.toUpperCase()} not yet available.`); return; }
    window.open(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${path}`, '_blank');
  };
  return (<div className="min-h-screen flex flex-col" style={{ backgroundColor: '#EFEFEF' }}><header className="bg-white border-b border-gray-200 shadow-sm"><div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3"><div className="relative w-10 h-10"><Image src="/bcps-logo.png" alt="BCPS" fill className="object-contain" /></div><span className="text-lg font-semibold" style={{ color: '#1672A7' }}>BCPS Minutes</span></div></header><main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8"><div className="bg-white rounded-xl shadow-sm p-6 mb-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold" style={{ color: '#1672A7' }}>{title}</h1><p className="text-xs mt-1" style={{ color: '#8B8B8B' }}>{new Date(note.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div><div className="flex gap-2"><button onClick={() => handleDownload('pdf')} className="px-4 py-2 rounded-full text-xs font-medium text-white" style={{ backgroundColor: '#1672A7' }}>Download PDF</button><button onClick={() => handleDownload('docx')} className="px-4 py-2 rounded-full text-xs font-medium text-white" style={{ backgroundColor: '#1672A7' }}>Download Word</button></div></div></div><div className="bg-white rounded-xl shadow-sm p-6"><NotesViewer content={note.content} title={title} /></div></main><footer className="bg-white border-t border-gray-200 py-4 mt-auto"><div className="text-center text-xs" style={{ color: '#8B8B8B' }}>Powered by BCPS Minutes</div></footer></div>);
}
