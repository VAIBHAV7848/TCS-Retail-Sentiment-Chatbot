import React from 'react';
import type { EscalationDecision } from '../types';
import { X, UserCheck, ShieldAlert } from 'lucide-react';

interface EscalationBannerProps {
  escalation: EscalationDecision | null;
  onDismiss?: () => void;
  theme?: 'light' | 'dark';
}

export const EscalationBanner: React.FC<EscalationBannerProps> = ({ escalation, onDismiss, theme = 'light' }) => {
  if (!escalation || escalation.decision === 'none') {
    return null;
  }

  const { decision, priority, reason, triggers } = escalation;
  const isDark = theme === 'dark';

  const isUrgent = decision === 'urgent_handoff';
  const isReview = decision === 'human_review';

  const accentColor = isDark
    ? isUrgent
      ? 'border-rose-500/40 bg-[#160d12] text-rose-200'
      : isReview
      ? 'border-amber-500/40 bg-[#16120b] text-amber-200'
      : 'border-yellow-500/40 bg-[#16140b] text-yellow-200'
    : isUrgent
    ? 'border-rose-300 bg-rose-50 text-rose-950 shadow-xs'
    : isReview
    ? 'border-amber-300 bg-amber-50 text-amber-950 shadow-xs'
    : 'border-yellow-300 bg-yellow-50 text-yellow-950 shadow-xs';

  const badgeColor = isDark
    ? isUrgent
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
      : isReview
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    : isUrgent
    ? 'bg-rose-100 text-rose-800 border-rose-300'
    : isReview
    ? 'bg-amber-100 text-amber-800 border-amber-300'
    : 'bg-yellow-100 text-yellow-800 border-yellow-300';

  return (
    <div
      className={`relative w-full rounded-2xl p-3.5 border transition-all duration-300 ${accentColor} animate-in fade-in slide-in-from-top-2`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl border flex-shrink-0 ${
            isDark
              ? 'bg-black/40 border-white/10'
              : isUrgent
              ? 'bg-rose-100 border-rose-200'
              : 'bg-amber-100 border-amber-200'
          }`}>
            {isUrgent ? (
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            ) : (
              <UserCheck className="w-4 h-4 text-amber-600" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold tracking-tight ${
                isDark ? 'text-white' : isUrgent ? 'text-rose-950' : 'text-amber-950'
              }`}>
                {isUrgent ? 'Urgent Human Handoff Triggered' : 'Human Review Escalation Flagged'}
              </span>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${badgeColor}`}>
                Priority: {priority || 'High'}
              </span>
            </div>

            <p className={`text-xs mt-1 leading-relaxed ${
              isDark ? 'text-slate-300' : isUrgent ? 'text-rose-800' : 'text-amber-800'
            }`}>
              {reason || 'Customer trajectory requires immediate specialist handoff.'}
            </p>

            {/* Triggers Pills */}
            {triggers && triggers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className={`text-[10px] font-mono uppercase ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>Triggers:</span>
                {triggers.map((trig, idx) => (
                  <span
                    key={idx}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isDark
                        ? 'bg-black/40 text-slate-300 border-white/10'
                        : 'bg-white/80 text-slate-700 border-black/10'
                    }`}
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
            className={`p-1 rounded-lg transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/10'
                : 'text-slate-500 hover:text-black hover:bg-black/5'
            }`}
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
