export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transcript {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_type: 'srt' | 'txt' | 'vtt';
  file_path: string;
  raw_text: string;
  participants: string[];
  participants_confirmed: boolean;
  status: 'uploaded' | 'awaiting_participants' | 'processing' | 'completed' | 'error';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentJSON {
  participants: string[];
  summary: string;
  discussion_points: string[];
  action_items: Array<{
    task: string;
    owner: string;
    due_date?: string;
  }>;
  key_decisions: string[];
}

export interface MeetingNotes {
  id: string;
  transcript_id: string;
  user_id: string;
  content: ContentJSON;
  content_html: string;
  content_markdown: string;
  pdf_path: string | null;
  docx_path: string | null;
  share_token: string | null;
  is_public: boolean;
  revision_count: number;
  max_free_revisions: number;
  extra_revisions_purchased: number;
  created_at: string;
  updated_at: string;
}

export interface Revision {
  id: string;
  meeting_note_id: string;
  user_id: string;
  request_text: string;
  revision_number: number;
  is_paid: boolean;
  status: string;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  meeting_note_id: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  revisions_granted: number;
  created_at: string;
}
