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
}

export const SentimentBadge: React.FC<SentimentBadgeProps> = (props) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const polarity = (props.polarity || props.sentiment?.polarity || 'neutral').toLowerCase();
  const confidencePct = Math.round(((props.confidence ?? props.sentiment?.confidence) || 0) * 100);
  const emotion = props.emotion || props.sentiment?.emotion || 'neutral';
  const urgency = props.urgency || props.sentiment?.urgency || 'low';
  const tierUsed = props.tierUsed || props.sentiment?.tier_used || 1;

  const config = {
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
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium cursor-help transition-all ${config.bg} ${config.text} ${config.border}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        <span className="capitalize">{config.label}</span>
        <span className="opacity-70 font-mono text-[10px]">{confidencePct}%</span>
        {emotion && emotion !== 'neutral' && (
          <span className="opacity-70 text-[10px]">&bull; {emotion}</span>
        )}
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#141822] text-slate-200 text-xs rounded-xl shadow-2xl border border-white/10 z-50 pointer-events-none backdrop-blur-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-white/8 mb-2">
            <span className="font-medium text-white flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              RoBERTa Classifier
            </span>
            <span className="text-[10px] bg-white/6 px-1.5 py-0.5 rounded text-slate-300 font-mono">
              Tier {tierUsed}
            </span>
          </div>

          <div className="space-y-1.5 text-slate-300 text-[11px]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400">Emotion: </span>
                <span className="text-white font-medium capitalize">{emotion}</span>
              </div>
              <div>
                <span className="text-slate-400">Urgency: </span>
                <span className={`font-semibold capitalize ${
                  urgency === 'high' || urgency === 'critical' ? 'text-rose-400' : 'text-slate-300'
                }`}>
                  {urgency}
                </span>
              </div>
            </div>

            {props.sentiment?.polarity_scores && (
              <div className="pt-2 border-t border-white/8">
                <span className="text-[10px] text-slate-400 font-medium block mb-1">Probability Distribution</span>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-mono">
                  <div className="bg-emerald-500/10 text-emerald-400 p-1 rounded border border-emerald-500/20">
                    pos: {((props.sentiment.polarity_scores.positive || 0) * 100).toFixed(0)}%
                  </div>
                  <div className="bg-slate-500/10 text-slate-300 p-1 rounded border border-slate-500/20">
                    neu: {((props.sentiment.polarity_scores.neutral || 0) * 100).toFixed(0)}%
                  </div>
                  <div className="bg-rose-500/10 text-rose-400 p-1 rounded border border-rose-500/20">
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
