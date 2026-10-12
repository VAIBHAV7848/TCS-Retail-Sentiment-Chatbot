import React, { useState } from 'react';
import type { SentimentData } from '../types';
import { Sparkles } from 'lucide-react';

interface SentimentBadgeProps {
  sentiment?: SentimentData;
  polarity?: 'positive' | 'neutral' | 'negative' | string;
  confidence?: number;
  emotion?: string;
  urgency?: string;
  tierUsed?: number;
  compact?: boolean;
  theme?: 'light' | 'dark';
}

export const SentimentBadge: React.FC<SentimentBadgeProps> = (props) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const isDark = props.theme === 'dark';

  const polarity = (props.polarity || props.sentiment?.polarity || 'neutral').toLowerCase();
  const confidencePct = Math.round(((props.confidence ?? props.sentiment?.confidence) || 0) * 100);
  const emotion = props.emotion || props.sentiment?.emotion || 'neutral';
  const urgency = props.urgency || props.sentiment?.urgency || 'low';
  const tierUsed = props.tierUsed || props.sentiment?.tier_used || 1;

  const config = isDark
    ? {
        positive: {
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/20',
          dot: 'bg-emerald-400',
          label: 'Positive',
        },
        neutral: {
          bg: 'bg-slate-500/10',
          text: 'text-slate-300',
          border: 'border-slate-500/20',
          dot: 'bg-slate-400',
          label: 'Neutral',
        },
        negative: {
          bg: 'bg-rose-500/10',
          text: 'text-rose-400',
          border: 'border-rose-500/20',
          dot: 'bg-rose-400',
          label: 'Negative',
        },
      }[polarity] || {
        bg: 'bg-slate-500/10',
        text: 'text-slate-300',
        border: 'border-slate-500/20',
        dot: 'bg-slate-400',
        label: polarity,
      }
    : {
        positive: {
          bg: 'bg-emerald-50',
          text: 'text-emerald-800',
          border: 'border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Positive',
        },
        neutral: {
          bg: 'bg-[#f5f5f7]',
          text: 'text-[#48484a]',
          border: 'border-black/8',
          dot: 'bg-[#86868b]',
          label: 'Neutral',
        },
        negative: {
          bg: 'bg-rose-50',
          text: 'text-rose-800',
          border: 'border-rose-200',
          dot: 'bg-rose-500',
          label: 'Negative',
        },
      }[polarity] || {
        bg: 'bg-[#f5f5f7]',
        text: 'text-[#48484a]',
        border: 'border-black/8',
        dot: 'bg-[#86868b]',
        label: polarity,
      };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium cursor-help transition-all shadow-xs ${config.bg} ${config.text} ${config.border}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        <span className="capitalize">{config.label}</span>
        <span className="opacity-75 font-mono text-[10px]">{confidencePct}%</span>
        {emotion && emotion !== 'neutral' && (
          <span className="opacity-75 text-[10px]">&bull; {emotion}</span>
        )}
      </div>

      {showTooltip && (
        <div className={`absolute bottom-full left-0 mb-2 w-64 p-3 rounded-xl shadow-xl border z-50 pointer-events-none backdrop-blur-md animate-in fade-in duration-150 ${
          isDark
            ? 'bg-[#141822] text-slate-200 border-white/10'
            : 'bg-white text-[#1d1d1f] border-black/10 shadow-lg'
        }`}>
          <div className={`flex items-center justify-between pb-2 border-b mb-2 ${
            isDark ? 'border-white/8' : 'border-black/8'
          }`}>
            <span className={`font-semibold flex items-center gap-1.5 text-xs ${
              isDark ? 'text-white' : 'text-[#1d1d1f]'
            }`}>
              <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
              RoBERTa Classifier
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
              isDark
                ? 'bg-white/6 text-slate-300 border-white/8'
                : 'bg-[#f5f5f7] text-[#48484a] border-black/8'
            }`}>
              Tier {tierUsed}
            </span>
          </div>

          <div className={`space-y-1.5 text-[11px] ${isDark ? 'text-slate-300' : 'text-[#48484a]'}`}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className={isDark ? 'text-slate-400' : 'text-[#86868b]'}>Emotion: </span>
                <span className={`font-semibold capitalize ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>{emotion}</span>
              </div>
              <div>
                <span className={isDark ? 'text-slate-400' : 'text-[#86868b]'}>Urgency: </span>
                <span className={`font-semibold capitalize ${
                  urgency === 'high' || urgency === 'critical' ? 'text-rose-600' : isDark ? 'text-slate-300' : 'text-[#48484a]'
                }`}>
                  {urgency}
                </span>
              </div>
            </div>

            {props.sentiment?.polarity_scores && (
              <div className={`pt-2 border-t ${isDark ? 'border-white/8' : 'border-black/8'}`}>
                <span className={`text-[10px] font-medium block mb-1 ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>Probability Distribution</span>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-mono">
                  <div className={isDark ? 'bg-emerald-500/10 text-emerald-400 p-1 rounded border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 p-1 rounded border border-emerald-200'}>
                    pos: {((props.sentiment.polarity_scores.positive || 0) * 100).toFixed(0)}%
                  </div>
                  <div className={isDark ? 'bg-slate-500/10 text-slate-300 p-1 rounded border border-slate-500/20' : 'bg-[#f5f5f7] text-[#48484a] p-1 rounded border border-black/8'}>
                    neu: {((props.sentiment.polarity_scores.neutral || 0) * 100).toFixed(0)}%
                  </div>
                  <div className={isDark ? 'bg-rose-500/10 text-rose-400 p-1 rounded border border-rose-500/20' : 'bg-rose-50 text-rose-700 p-1 rounded border border-rose-200'}>
                    neg: {((props.sentiment.polarity_scores.negative || 0) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
