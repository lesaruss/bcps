'use client';

interface DiscussionPoint {
  topic: string;
  details: string;
  speakers?: string[];
}

interface ActionItem {
  task: string;
  assignee?: string;
  deadline?: string;
}

interface NotesContent {
  participants?: string[];
  summary?: string;
  discussion_points?: DiscussionPoint[];
  key_decisions?: string[];
  action_items?: ActionItem[];
}

interface NotesViewerProps {
  content: NotesContent;
  title: string;
}

export default function NotesViewer({ content, title }: NotesViewerProps) {
  if (!content || typeof content !== 'object') {
    return <p className="text-gray-400 text-center py-8">No notes available yet.</p>;
  }

  return (
    <div className="space-y-8">
      {/* Participants */}
      {content.participants && content.participants.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-3" style={{ color: '#1672A7' }}>Participants</h2>
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="flex flex-wrap gap-2">
              {content.participants.map((p, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: '#EBF4FA', color: '#1672A7' }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Executive Summary */}
      {content.summary && (
        <section>
          <h2 className="text-xl font-bold mb-3" style={{ color: '#1672A7' }}>Executive Summary</h2>
          <p className="text-base leading-relaxed" style={{ color: '#525252' }}>{content.summary}</p>
        </section>
      )}

      {/* Discussion Points */}
      {content.discussion_points && content.discussion_points.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-3" style={{ color: '#1672A7' }}>Discussion Points</h2>
          <div className="space-y-4">
            {content.discussion_points.map((point, i) => (
              <div key={i} className="p-4 rounded-lg border-l-4" style={{ backgroundColor: '#F8F9FA', borderLeftColor: '#1672A7' }}>
                <h3 className="font-semibold mb-2" style={{ color: '#262626' }}>{point.topic}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#525252' }}>{point.details}</p>
                {point.speakers && point.speakers.length > 0 && (
                  <p className="text-xs mt-2" style={{ color: '#8B8B8B' }}>Speakers: {point.speakers.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key Decisions */}
      {content.key_decisions && content.key_decisions.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-3" style={{ color: '#1672A7' }}>Key Decisions</h2>
          <ul className="space-y-2">
            {content.key_decisions.map((decision, i) => (
              <li key={i} className="flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="#F4C436" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm leading-relaxed" style={{ color: '#525252' }}>{decision}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Action Items */}
      {content.action_items && content.action_items.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-3" style={{ color: '#1672A7' }}>Action Items</h2>
          <div className="space-y-3">
            {content.action_items.map((item, i) => (
              <div key={i} className="p-4 rounded-lg border-l-4" style={{ backgroundColor: '#FFFBF0', borderLeftColor: '#F4C436' }}>
                <p className="font-semibold text-sm" style={{ color: '#262626' }}>{item.task}</p>
                <div className="flex flex-wrap gap-3 mt-2">
                  {item.assignee && (
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#EBF4FA', color: '#1672A7' }}>
                      Assigned: {item.assignee}
                    </span>
                  )}
                  {item.deadline && (
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                      Due: {item.deadline}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
