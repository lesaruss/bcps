import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transcriptId = body.transcript_id;
    if (!transcriptId) return NextResponse.json({ error: 'transcript_id is required' }, { status: 400 });
    const cookieStore = cookies();
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll() { return cookieStore.getAll(); }, setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => { try { cookieStore.set(name, value, options); } catch {} }); } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: transcript, error: fetchError } = await admin.from('transcripts').select('id, user_id, file_path').eq('id', transcriptId).single();
    if (fetchError || !transcript) return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    if (transcript.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { data: notes } = await admin.from('meeting_notes').select('id, pdf_path, docx_path').eq('transcript_id', transcriptId);
    if (notes && notes.length > 0) {
      const noteIds = notes.map(n => n.id);
      await admin.from('revisions').delete().in('meeting_note_id', noteIds);
      await admin.from('payments').delete().in('meeting_note_id', noteIds);
      const docPaths = notes.flatMap(n => [n.pdf_path, n.docx_path]).filter(Boolean) as string[];
      if (docPaths.length > 0) await admin.storage.from('documents').remove(docPaths);
      await admin.from('meeting_notes').delete().in('id', noteIds);
    }
    if (transcript.file_path) await admin.storage.from('transcripts').remove([transcript.file_path]);
    const { error: deleteError } = await admin.from('transcripts').delete().eq('id', transcriptId);
    if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Delete failed' }, { status: 500 });
  }
}
