import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { meeting_note_id, request_text } = await request.json();

    if (!meeting_note_id || !request_text) {
      return NextResponse.json({ error: 'meeting_note_id and request_text are required' }, { status: 400 });
    }

    // Auth
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try { cookieStore.set(name, value, options); } catch {}
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch note
    const { data: note, error: fetchErr } = await admin
      .from('meeting_notes')
      .select('id, user_id, content, revision_count, max_free_revisions, extra_revisions_purchased')
      .eq('id', meeting_note_id)
      .single();

    if (fetchErr || !note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (note.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Check limits
    const maxTotal = (note.max_free_revisions || 10) + (note.extra_revisions_purchased || 0);
    if (note.revision_count >= maxTotal) {
      return NextResponse.json({ error: 'Revision limit reached', code: 'REVISION_LIMIT_EXCEEDED' }, { status: 402 });
    }

    const newRevisionNumber = (note.revision_count || 0) + 1;

    // Create revision record
    const { data: revision } = await admin
      .from('revisions')
      .insert({
        meeting_note_id,
        user_id: user.id,
        request_text,
        revision_number: newRevisionNumber,
        is_paid: newRevisionNumber > (note.max_free_revisions || 10),
        status: 'processing',
      })
      .select('id')
      .single();

    // Call Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: `You are editing meeting notes for Broward County Public Schools. Apply the user's revision request to these notes.

CURRENT NOTES:
${JSON.stringify(note.content, null, 2)}

USER'S REVISION REQUEST:
${request_text}

Return the UPDATED notes as valid JSON only (no markdown fences). Keep the same structure:
{
  "participants": [...],
  "summary": "...",
  "discussion_points": [{"topic": "...", "details": "...", "speakers": [...]}],
  "key_decisions": [...],
  "action_items": [{"task": "...", "assignee": "...", "deadline": "..."}]
}

Preserve everything the user didn't ask to change. Only modify what was requested.`,
        }],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Claude API error: ${claudeRes.status}`);

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.[0]?.text || '';
    const jsonStr = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const updatedContent = JSON.parse(jsonStr);

    // Update note
    await admin.from('meeting_notes').update({
      content: updatedContent,
      revision_count: newRevisionNumber,
      updated_at: new Date().toISOString(),
    }).eq('id', meeting_note_id);

    // Update revision record
    if (revision) {
      await admin.from('revisions').update({ status: 'completed' }).eq('id', revision.id);
    }

    return NextResponse.json({ success: true, content: updatedContent });
  } catch (error) {
    console.error('Revise error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Revision failed' }, { status: 500 });
  }
}
