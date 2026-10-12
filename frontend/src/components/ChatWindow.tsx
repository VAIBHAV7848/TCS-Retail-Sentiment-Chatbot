import React, { useState, useRef, useEffect } from 'react';
import type { MessageItem } from '../types';
import { SentimentBadge } from './SentimentBadge';
import { Send, Bot, Sparkles, Loader2, ShieldCheck, ArrowRight, RotateCcw } from 'lucide-react';

interface ChatWindowProps {
  messages: MessageItem[];
  loading: boolean;
  onSendMessage: (text: string) => void;
  onResetChat?: () => void;
  onInputChange?: (text: string) => void;
  theme?: 'light' | 'dark';
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  loading,
  onSendMessage,
  onResetChat,
  onInputChange,
  theme = 'light',
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input.trim());
    setInput('');
    if (onInputChange) onInputChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (onInputChange) {
      onInputChange(e.target.value);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex flex-col h-full rounded-2xl border transition-colors overflow-hidden relative ${
      isDark
        ? 'bg-[#0b0d12] border-white/8 shadow-2xl'
        : 'bg-white border-black/8 shadow-sm'
    }`}>
      {/* Editorial Header Bar */}
      <div className={`flex items-center justify-between px-6 py-3.5 border-b flex-shrink-0 transition-colors ${
        isDark
          ? 'bg-[#0e1117] border-white/6 text-white'
          : 'bg-[#fbfbfd] border-black/6 text-[#1d1d1f]'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
            isDark
              ? 'bg-white/6 border border-white/10 text-slate-200'
              : 'bg-black/5 border border-black/8 text-[#1d1d1f]'
          }`}>
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-sm font-semibold tracking-tight ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                Live Interaction Console
              </h2>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                isDark
                  ? 'bg-white/6 text-slate-300 border-white/8'
                  : 'bg-black/5 text-[#48484a] border-black/8'
              }`}>
                4-Agent Orchestrator
              </span>
            </div>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
              Real-time emotion classification &bull; Encrypted PII vault &bull; Grounded empathy
            </p>
          </div>
        </div>

        {onResetChat && (
          <button
            onClick={onResetChat}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
              isDark
                ? 'text-slate-400 hover:text-white border-transparent hover:border-white/10 hover:bg-white/4'
                : 'text-[#86868b] hover:text-[#1d1d1f] border-transparent hover:border-black/8 hover:bg-black/5'
            }`}
            title="Start new conversation session"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Session</span>
          </button>
        )}
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
              isDark
                ? 'bg-white/4 border border-white/8 text-slate-400'
                : 'bg-black/4 border border-black/8 text-[#86868b]'
            }`}>
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className={`text-base font-semibold mb-2 tracking-tight ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
              Customer Conversation Ready
            </h3>
            <p className={`text-xs leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
              Test real-world customer inquiries, delivery grievances, praise, or sensitive personal data. Every turn executes through Preprocessing, PII Masking, Sentiment RoBERTa, and Empathetic LLM Response.
            </p>
            <p className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border ${
              isDark
                ? 'text-slate-400 bg-white/4 border-white/6'
                : 'text-[#6e6e73] bg-[#f5f5f7] border-black/6'
            }`}>
              Select a curated scenario from the left panel or type below
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} transition-all`}
            >
              {/* Message Header (Sender & Timestamp) */}
              <div className={`flex items-center gap-2 mb-1.5 text-[11px] font-mono ${
                isDark ? 'text-slate-400' : 'text-[#86868b]'
              }`}>
                {msg.sender === 'user' ? (
                  <>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-[#48484a]'}`}>Customer</span>
                  </>
                ) : (
                  <>
                    <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-[#48484a]'}`}>RetailSense Agent</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                )}
              </div>

              {/* Message Bubble Body */}
              <div
                className={`max-w-[82%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed transition-colors shadow-xs ${
                  msg.sender === 'user'
                    ? isDark
                      ? 'bg-[#1a2130] text-slate-100 border border-white/10 rounded-tr-sm'
                      : 'bg-[#0071e3] text-white rounded-tr-sm shadow-xs'
                    : isDark
                    ? 'bg-[#121620] text-slate-200 border border-white/8 rounded-tl-sm'
                    : 'bg-[#f5f5f7] text-[#1d1d1f] border border-black/6 rounded-tl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Next steps suggested by Agent 4 */}
                {msg.response?.next_steps && msg.response.next_steps.length > 0 && (
                  <div className={`mt-3 pt-2.5 border-t ${
                    msg.sender === 'user'
                      ? 'border-white/20'
                      : isDark
                      ? 'border-white/8'
                      : 'border-black/8'
                  }`}>
                    <span className={`text-[10px] uppercase tracking-wider block mb-1.5 font-medium ${
                      msg.sender === 'user'
                        ? 'text-blue-100'
                        : isDark
                        ? 'text-slate-400'
                        : 'text-[#86868b]'
                    }`}>
                      Recommended Next Actions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.response.next_steps.map((step: string, idx: number) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border ${
                            msg.sender === 'user'
                              ? 'bg-white/15 text-white border-white/20'
                              : isDark
                              ? 'bg-white/6 text-slate-300 border-white/8'
                              : 'bg-white text-[#48484a] border-black/8 shadow-xs'
                          }`}
                        >
                          <ArrowRight className={`w-2.5 h-2.5 ${msg.sender === 'user' ? 'text-white' : 'text-[#0071e3]'}`} />
                          {step}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Inline Telemetry Tag */}
              {msg.sentiment && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SentimentBadge
                    polarity={msg.sentiment.polarity}
                    confidence={msg.sentiment.confidence}
                    emotion={msg.sentiment.emotion}
                    urgency={msg.sentiment.urgency}
                    tierUsed={msg.sentiment.tier_used}
                    theme={theme}
                  />

                  {msg.sentiment.urgency && msg.sentiment.urgency !== 'low' && (
                    <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                      isDark
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        : 'bg-amber-50 text-amber-800 border-amber-200 font-medium'
                    }`}>
                      Urgency: {msg.sentiment.urgency}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-start space-y-2">
            <div className={`flex items-center gap-2 text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
              <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-[#48484a]'}`}>RetailSense Agent</span>
              <span>Processing turn</span>
            </div>
            <div className={`px-4 py-3 rounded-2xl rounded-tl-sm border flex items-center gap-3 ${
              isDark
                ? 'bg-[#121620] border-white/8 text-slate-300'
                : 'bg-[#f5f5f7] border-black/6 text-[#1d1d1f]'
            }`}>
              <Loader2 className="w-4 h-4 text-[#0071e3] animate-spin" />
              <div className="flex items-center gap-1.5 text-xs">
                <span>Executing multi-agent evaluation...</span>
                <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
                  (PII Mask &rarr; RoBERTa &rarr; 120B LLM)
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`p-4 border-t flex-shrink-0 transition-colors ${
        isDark ? 'bg-[#0e1117] border-white/6' : 'bg-[#fbfbfd] border-black/6'
      }`}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className={`relative flex items-center rounded-xl border transition-all ${
            isDark
              ? 'bg-[#151922] border-white/10 focus-within:border-blue-500/50 shadow-inner'
              : 'bg-[#f5f5f7] border-black/8 focus-within:border-[#0071e3] focus-within:bg-white shadow-xs'
          }`}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Type customer message or review (e.g. paste phone, Aadhaar or order ID to verify PII masking)..."
              className={`flex-1 bg-transparent px-4 py-3 text-xs resize-none focus:outline-none leading-relaxed transition-colors ${
                isDark ? 'text-slate-100 placeholder-slate-400' : 'text-[#1d1d1f] placeholder-[#86868b]'
              }`}
            />
            <div className="pr-3 pl-1 self-end pb-3">
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-30 disabled:hover:bg-[#0071e3] text-white flex items-center justify-center transition-all shadow-xs"
                title="Send message (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className={`flex items-center justify-between text-[11px] px-1 font-mono ${
            isDark ? 'text-slate-400' : 'text-[#86868b]'
          }`}>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero-knowledge pipeline: Sensitive PII encrypted in vault before inference</span>
            </div>
            <span className="hidden sm:inline">Press Enter to send</span>
          </div>
        </form>
      </div>
    </div>
  );
};
