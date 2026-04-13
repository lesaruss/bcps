import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let transcriptId: string | null = null;

  try {
    const body = await request.json();
    transcriptId = body.transcript_id;

    if (!transcriptId) {
      return NextResponse.json({ error: 'transcript_id is required' }, { status: 400 });
    }

    // Auth check
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin client
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch transcript
    const { data: transcript, error: fetchError } = await admin
      .from('transcripts')
      .select('*')
      .eq('id', transcriptId)
      .single();

    if (fetchError || !transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    if (transcript.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update status to processing
    await admin.from('transcripts').update({ status: 'processing' }).eq('id', transcriptId);

    // Get participant context
    const participantContext = transcript.participants?.length > 0
      ? `\nKnown participants: ${transcript.participants.join(', ')}`
      : '';

    // Call Claude API with retry logic for transient errors
    const RETRYABLE_STATUSES = [429, 503, 529];
    const MAX_RETRIES = 3;
    let claudeData: any = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
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
            content: `You are a professional meeting note taker for Broward County Public Schools (BCPS). Process this transcript into comprehensive meeting notes.${participantContext}

TRANSCRIPT:
${transcript.raw_text}

Return ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "participants": ["Name1", "Name2"],
  "summary": "Comprehensive executive summary of the meeting (2-4 sentences)",
  "discussion_points": [
    {
      "topic": "Topic title",
      "details": "Detailed description of what was discussed",
      "speakers": ["Name1"]
    }
  ],
  "key_decisions": ["Decision 1", "Decision 2"],
  "action_items": [
    {
      "task": "Description of action item",
      "assignee": "Person responsible",
      "deadline": "Due date if mentioned"
    }
  ]
}

Requirements:
- Extract ALL participant names from the transcript
- Write a comprehensive executive summary
- Include EVERY topic discussed, never leave out important details
- Attribute speakers when identifiable
- List ALL decisions made
- List ALL action items with assignees and deadlines where available
- Be thorough and professional`,
          }],
        }),
      });

      if (claudeResponse.ok) {
        claudeData = await claudeResponse.json();
        break;
      }

      if (RETRYABLE_STATUSES.includes(claudeResponse.status) && attempt < MAX_RETRIES) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      const errText = await claudeResponse.text();
      throw new Error(`Claude API error ${claudeResponse.status}: ${errText}`);
    }

    if (!claudeData) throw new Error('Claude API failed after all retries');
    const contentText = claudeData.content?.[0]?.text || '';

    if (!contentText) throw new Error('Empty response from Claude');

    // Parse JSON — handle potential markdown code fences
    const jsonStr = contentText.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const notesContent = JSON.parse(jsonStr);

    // Generate markdown
    const markdown = generateMarkdown(notesContent, transcript.title);

    // Save meeting notes
    const { data: meetingNote, error: insertError } = await admin
      .from('meeting_notes')
      .insert({
        transcript_id: transcriptId,
        user_id: user.id,
        content: notesContent,
        content_markdown: markdown,
        revision_count: 0,
        max_free_revisions: 10,
        extra_revisions_purchased: 0,
        is_public: false,
      })
      .select('id')
      .single();

    if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);

    // Mark transcript as completed
    await admin.from('transcripts').update({ status: 'completed' }).eq('id', transcriptId);

    return NextResponse.json({ success: true, meeting_note_id: meetingNote.id });

  } catch (error) {
    console.error('Process transcript error:', error);

    // Try to mark transcript as errored
    if (transcriptId) {
      try {
        const admin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await admin.from('transcripts')
          .update({ status: 'error', error_message: String(error) })
          .eq('id', transcriptId);
      } catch {}
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}

function generateMarkdown(content: any, title: string): string {
  let md = `# ${title}\n\n`;
  md += `## Participants\n`;
  (content.participants || []).forEach((p: string) => { md += `- ${p}\n`; });
  md += `\n## Executive Summary\n${content.summary || ''}\n\n`;
  md += `## Discussion Points\n`;
  (content.discussion_points || []).forEach((dp: any) => {
    md += `### ${dp.topic}\n${dp.details}\n`;
    if (dp.speakers?.length) md += `*Speakers: ${dp.speakers.join(', ')}*\n`;
    md += '\n';
  });
  md += `## Key Decisions\n`;
  (content.key_decisions || []).forEach((d: string) => { md += `- ${d}\n`; });
  md += `\n## Action Items\n`;
  (content.action_items || []).forEach((a: any) => {
    md += `- **${a.task}**`;
    if (a.assignee) md += `  —  ${a.assignee}`;
    if (a.deadline) md += ` (Due: ${a.deadline})`;
    md += '\n';
  });
  return md;
}
