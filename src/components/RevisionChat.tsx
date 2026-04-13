'use client';

import { useState } from 'react';

interface RevisionChatProps {
  revisionCount: number;
  maxFree: number;
  extraPurchased: number;
  isProcessing: boolean;
  onSubmitRevision: (text: string) => void;
  onPurchaseClick: () => void;
}

export default function RevisionChat({
  revisionCount,
  maxFree,
  extraPurchased,
  isProcessing,
  onSubmitRevision,
  onPurchaseClick,
}: RevisionChatProps) {
  const [text, setText] = useState('');
  const maxTotal = maxFree + extraPurchased;
  const remaining = maxTotal - revisionCount;
  const needsPurchase = revisionCount >= maxFree && extraPurchased === 0;
  const maxedOut = remaining <= 0 && extraPurchased > 0;

  const handleSubmit = () => {
    if (text.trim() && remaining > 0) {
      onSubmitRevision(text.trim());
      setText('');
    }
  };

  return (
    <div>
      <h3 className="text-lg font-bold mb-4" style={{ color: '#1672A7' }}>Revisions</h3>

      {/* Counter */}
      <div className="p-3 rounded-lg mb-4 text-sm" style={{ backgroundColor: '#F8F9FA' }}>
        <p style={{ color: '#262626' }}>
          <span className="font-semibold">{revisionCount}</span> of {maxTotal} used
          <span className="text-xs ml-1" style={{ color: '#8B8B8B' }}>
            ({maxFree} free{extraPurchased > 0 ? ` + ${extraPurchased} purchased` : ''})
          </span>
        </p>
        {remaining > 0 && (
          <p className="text-xs mt-1" style={{ color: '#525252' }}>{remaining} remaining</p>
        )}
      </div>

      {/* Purchase prompt */}
      {needsPurchase && remaining <= 0 && (
        <div className="p-4 rounded-lg mb-4 border" style={{ borderColor: '#F4C436', backgroundColor: '#FFFBF0' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#262626' }}>
            You've used all 10 free revisions. Get 5 more for just $1.
          </p>
          <button
            onClick={onPurchaseClick}
            className="w-full px-4 py-2.5 rounded-full text-sm font-medium"
            style={{ backgroundColor: '#F4C436', color: '#262626' }}
          >
            Purchase 5 Revisions — $1
          </button>
        </div>
      )}

      {/* Maxed out */}
      {maxedOut && (
        <div className="p-4 rounded-lg mb-4 border border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-700">Maximum revisions reached.</p>
          <p className="text-xs text-red-600 mt-1">Your document is finalized and ready for download.</p>
        </div>
      )}

      {/* Input */}
      {remaining > 0 && (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder="What would you like to change?"
            rows={4}
            disabled={isProcessing}
            className="w-full px-3 py-2.5 rounded-lg border-2 text-sm focus:outline-none resize-none mb-3"
            style={{ borderColor: '#EFEFEF', color: '#262626' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#1672A7')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#EFEFEF')}
          />
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !text.trim()}
            className="w-full px-4 py-2.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#F4C436', color: '#262626' }}
          >
            {isProcessing 4 (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </>
            ) : 'Submit Revision'}
          </button>
          <p className="text-xs mt-2 text-center" style={{ color: '#8B8B8B' }}>Ctrl+Enter to submit</p>
        </div>
      )}
    </div>
  );
}
