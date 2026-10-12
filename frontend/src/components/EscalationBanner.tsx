import React from 'react';
import type { EscalationDecision } from '../types';
import { X, UserCheck, ShieldAlert } from 'lucide-react';

interface EscalationBannerProps {
  escalation: EscalationDecision | null;
  onDismiss?: () => void;
}

export const EscalationBanner: React.FC<EscalationBannerProps> = ({ escalation, onDismiss }) => {
  if (!escalation || escalation.decision === 'none') {
    return null;
  }

  const { decision, priority, reason, triggers } = escalation;

  const isUrgent = decision === 'urgent_handoff';
  const isReview = decision === 'human_review';

  const accentColor = isUrgent
    ? 'border-rose-500/40 bg-[#160d12] text-rose-200'
    : isReview
    ? 'border-amber-500/40 bg-[#16120b] text-amber-200'
    : 'border-yellow-500/40 bg-[#16140b] text-yellow-200';

  const badgeColor = isUrgent
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    : isReview
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';

  return (
    <div
      className={`relative w-full rounded-xl p-3.5 border shadow-xl transition-all duration-300 ${accentColor} animate-in fade-in slide-in-from-top-2`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-black/40 border border-white/10 flex-shrink-0">
            {isUrgent ? (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            ) : (
              <UserCheck className="w-4 h-4 text-amber-400" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white tracking-tight">
                {isUrgent ? 'Urgent Human Handoff Triggered' : 'Human Review Escalation Flagged'}
              </span>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${badgeColor}`}>
                Priority: {priority || 'High'}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {reason || 'Customer trajectory requires immediate specialist handoff.'}
            </p>

            {/* Triggers Pills */}
            {triggers && triggers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Triggers:</span>
                {triggers.map((trig, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-white/10"
                  >
                    {trig}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
