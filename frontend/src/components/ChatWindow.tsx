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
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  loading,
  onSendMessage,
  onResetChat,
  onInputChange,
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

  return (
    <div className="flex flex-col h-full bg-[#0b0d12] rounded-2xl border border-white/8 shadow-2xl overflow-hidden relative">
      {/* Editorial Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 bg-[#0e1117] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/6 border border-white/10 flex items-center justify-center text-slate-200">
            <Bot className="w-4 h-4 text-slate-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Live Interaction Console
              </h2>
              <span className="text-[10px] font-mono uppercase bg-white/6 text-slate-300 px-2 py-0.5 rounded-full border border-white/8">
                4-Agent Orchestrator
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Real-time emotion classification &bull; Encrypted PII vault &bull; Grounded empathy
            </p>
          </div>
        </div>

        {onResetChat && (
          <button
            onClick={onResetChat}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/4 transition-all"
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
            <div className="w-12 h-12 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mb-4 text-slate-400">
              <Sparkles className="w-6 h-6 text-slate-300" />
            </div>
            <h3 className="text-base font-medium text-white mb-2">
              Customer Conversation Ready
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Test real-world customer inquiries, delivery grievances, praise, or sensitive personal data. Every turn executes through Preprocessing, PII Masking, Sentiment RoBERTa, and Empathetic LLM Response.
            </p>
            <p className="text-[11px] text-slate-400 font-mono bg-white/4 px-3 py-1.5 rounded-lg border border-white/6">
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
              <div className="flex items-center gap-2 mb-1.5 text-[11px] text-slate-400 font-mono">
                {msg.sender === 'user' ? (
                  <>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-slate-300 font-medium">Customer</span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-300 font-medium">RetailSense Agent</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                )}
              </div>

              {/* Message Bubble Body */}
              <div
                className={`max-w-[82%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-[#1a2130] text-slate-100 border border-white/10 rounded-tr-sm'
                    : 'bg-[#121620] text-slate-200 border border-white/8 rounded-tl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Next steps suggested by Agent 4 */}
                {msg.response?.next_steps && msg.response.next_steps.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/8">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1.5 font-medium">
                      Recommended Next Actions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.response.next_steps.map((step: string, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-white/6 text-slate-300 border border-white/8"
                        >
                          <ArrowRight className="w-2.5 h-2.5 text-blue-400" />
                          {step}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Inline Telemetry Tag (For Bot responses with sentiment evaluation) */}
              {msg.sentiment && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SentimentBadge
                    polarity={msg.sentiment.polarity}
                    confidence={msg.sentiment.confidence}
                    emotion={msg.sentiment.emotion}
                    urgency={msg.sentiment.urgency}
                    tierUsed={msg.sentiment.tier_used}
                  />

                  {msg.sentiment.urgency && msg.sentiment.urgency !== 'low' && (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
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
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span className="text-slate-300 font-medium">RetailSense Agent</span>
              <span>Processing turn</span>
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[#121620] border border-white/8 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span>Executing multi-agent evaluation...</span>
                <span className="text-[10px] font-mono text-slate-400">(PII Mask &rarr; RoBERTa &rarr; LLM)</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#0e1117] border-t border-white/6 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="relative flex items-center bg-[#151922] rounded-xl border border-white/10 focus-within:border-blue-500/50 transition-all shadow-inner">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Type customer message or review (e.g. paste phone, Aadhaar or order ID to verify PII masking)..."
              className="flex-1 bg-transparent px-4 py-3 text-xs text-slate-100 placeholder-slate-400 resize-none focus:outline-none leading-relaxed"
            />
            <div className="pr-3 pl-1 self-end pb-3">
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white flex items-center justify-center transition-all shadow-sm"
                title="Send message (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/90" />
              <span>Zero-knowledge pipeline: Raw sensitive data is encrypted before model inference</span>
            </div>
            <span className="hidden sm:inline">Press Enter to send</span>
          </div>
        </form>
      </div>
    </div>
  );
};
