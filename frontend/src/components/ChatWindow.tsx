import React, { useState, useRef, useEffect } from 'react';
import type { MessageItem } from '../types';
import { SentimentBadge } from './SentimentBadge';
import {
  Send,
  Bot,
  Loader2,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  Headphones,
  UserCheck,
} from 'lucide-react';

interface ChatWindowProps {
  messages: MessageItem[];
  loading: boolean;
  onSendMessage: (text: string) => void;
  onResetChat?: () => void;
  onInputChange?: (text: string) => void;
  theme?: 'light' | 'dark';
  isHumanActive?: boolean;
  humanAgentName?: string;
  onConnectHuman?: () => void;
  onReturnToAi?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  loading,
  onSendMessage,
  onResetChat,
  onInputChange,
  theme = 'light',
  isHumanActive = false,
  humanAgentName = 'Sarah Jenkins',
  onConnectHuman,
  onReturnToAi,
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
            isHumanActive
              ? isDark
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : isDark
              ? 'bg-white/6 border border-white/10 text-slate-200'
              : 'bg-black/5 border border-black/8 text-[#1d1d1f]'
          }`}>
            {isHumanActive ? <UserCheck className="w-4 h-4 text-emerald-600" /> : <Bot className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-sm font-semibold tracking-tight ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                {isHumanActive ? 'Live Human Interaction Desk' : 'Live Interaction Console'}
              </h2>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                isHumanActive
                  ? isDark
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                  : isDark
                  ? 'bg-white/6 text-slate-300 border-white/8'
                  : 'bg-black/5 text-[#48484a] border-black/8'
              }`}>
                {isHumanActive ? 'Senior Specialist Active' : '4-Agent Orchestrator'}
              </span>
            </div>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
              {isHumanActive
                ? `Direct line with ${humanAgentName} · Encrypted PII vault active`
                : 'Real-time emotion classification · Encrypted PII vault · Grounded empathy'}
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Human Connection Toggle */}
          {isHumanActive ? (
            <div className="flex items-center gap-2">
              <span className={`hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border ${
                isDark
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live: {humanAgentName}
              </span>
              {onReturnToAi && (
                <button
                  onClick={onReturnToAi}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                    isDark
                      ? 'text-slate-300 hover:text-white border-white/10 hover:bg-white/5'
                      : 'text-[#48484a] hover:text-[#111827] border-black/8 hover:bg-black/5'
                  }`}
                  title="Switch back to AI Copilot"
                >
                  Return to AI
                </button>
              )}
            </div>
          ) : (
            onConnectHuman && (
              <button
                onClick={() => onConnectHuman()}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all ${
                  isDark
                    ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-[#4338ca] border-indigo-200 shadow-xs'
                }`}
                title="If you do not want to talk with AI, click here to connect seamlessly with a real human specialist"
              >
                <Headphones className="w-3.5 h-3.5 text-indigo-500" />
                <span>Talk to Real Human</span>
              </button>
            )
          )}

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
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-between py-2 space-y-4">
            {/* Top: Header & Pipeline Flow */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                    isDark
                      ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                      : 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                  }`}>
                    Interactive Test Console
                  </span>
                  <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
                    Ready for live turn evaluation
                  </span>
                </div>
                <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
                  GPU: llama3.2:3b · Latency: ~140ms
                </span>
              </div>


              {/* Quick-Start Prompt Matrix */}
              <div className="space-y-2">
                <span className={`text-[10px] font-mono uppercase tracking-wider block font-medium ${
                  isDark ? 'text-slate-400' : 'text-[#86868b]'
                }`}>
                  Select a live scenario starter to begin:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => onSendMessage("My order #ORD-4521 hasn't arrived yet. It's been 10 days! This is unacceptable.")}
                    className={`p-3 rounded-xl border text-left transition-all group ${
                      isDark
                        ? 'bg-[#151922] hover:bg-[#1c2230] border-white/6 hover:border-white/12'
                        : 'bg-[#f8f9fa] hover:bg-white border-black/6 hover:border-black/15 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold group-hover:text-[#0071e3] transition-colors">
                        📦 Delivery Delay
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        Urgency: High
                      </span>
                    </div>
                    <p className={`text-[11px] line-clamp-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-[#6b7280]'}`}>
                      "My order #ORD-4521 hasn't arrived yet. It's been 10 days! This is unacceptable."
                    </p>
                  </button>

                  <button
                    onClick={() => onSendMessage("Hi, my card 4532-1111-2222-3333 was charged twice for order ORD-9912. Call me at 9845012345.")}
                    className={`p-3 rounded-xl border text-left transition-all group ${
                      isDark
                        ? 'bg-[#151922] hover:bg-[#1c2230] border-white/6 hover:border-white/12'
                        : 'bg-[#f8f9fa] hover:bg-white border-black/6 hover:border-black/15 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold group-hover:text-[#0071e3] transition-colors">
                        💳 PII Interception
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                        Vault Masking
                      </span>
                    </div>
                    <p className={`text-[11px] line-clamp-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-[#6b7280]'}`}>
                      "My card 4532-1111-2222-3333 was charged twice for order ORD-9912. Call me at 9845012345."
                    </p>
                  </button>

                  <button
                    onClick={() => onSendMessage("This is the THIRD time I'm contacting you! I want a full refund right now or I'm filing a consumer court complaint!")}
                    className={`p-3 rounded-xl border text-left transition-all group ${
                      isDark
                        ? 'bg-[#151922] hover:bg-[#1c2230] border-white/6 hover:border-white/12'
                        : 'bg-[#f8f9fa] hover:bg-white border-black/6 hover:border-black/15 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold group-hover:text-[#0071e3] transition-colors">
                        🚨 Urgent Escalation
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20">
                        Legal Handoff
                      </span>
                    </div>
                    <p className={`text-[11px] line-clamp-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-[#6b7280]'}`}>
                      "This is the THIRD time! I want a full refund right now or I'm filing a complaint!"
                    </p>
                  </button>

                  <button
                    onClick={() => onSendMessage("I absolutely love this product! The quality is amazing and delivery was super fast. Best purchase ever!")}
                    className={`p-3 rounded-xl border text-left transition-all group ${
                      isDark
                        ? 'bg-[#151922] hover:bg-[#1c2230] border-white/6 hover:border-white/12'
                        : 'bg-[#f8f9fa] hover:bg-white border-black/6 hover:border-black/15 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold group-hover:text-[#0071e3] transition-colors">
                        ⭐ Customer Delight
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Joy & Praise
                      </span>
                    </div>
                    <p className={`text-[11px] line-clamp-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-[#6b7280]'}`}>
                      "I absolutely love this product! The quality is amazing and delivery was super fast!"
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom: Direct Human Representative Guarantee Banner */}
            {onConnectHuman && !isHumanActive && (
              <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                isDark
                  ? 'bg-indigo-950/25 border-indigo-500/25 text-indigo-200'
                  : 'bg-indigo-50/70 border-indigo-200 text-[#3730a3]'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <Headphones className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Prefer speaking to a human specialist?</p>
                    <p className="text-[11px] opacity-80">
                      Skip AI processing completely and hand off to Senior Specialist Sarah Jenkins.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onConnectHuman()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs flex-shrink-0 transition-all"
                >
                  Connect to Sarah
                </button>
              </div>
            )}
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
                ) : msg.isHuman ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        {msg.agentName || humanAgentName} (Human Specialist)
                      </span>
                    </div>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                ) : (
                  <>
                    <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-[#48484a]'}`}>RetailSense Agent (AI)</span>
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
                    : msg.isHuman
                    ? isDark
                      ? 'bg-[#131c29] text-emerald-100 border border-emerald-500/25 rounded-tl-sm ring-1 ring-emerald-500/10'
                      : 'bg-[#f0fdf4] text-[#14532d] border border-emerald-200 rounded-tl-sm shadow-xs'
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
              <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-[#48484a]'}`}>
                {isHumanActive ? `${humanAgentName} (Human Specialist)` : 'RetailSense Agent'}
              </span>
              <span>Processing turn</span>
            </div>
            <div className={`px-4 py-3 rounded-2xl rounded-tl-sm border flex items-center gap-3 ${
              isDark
                ? 'bg-[#121620] border-white/8 text-slate-300'
                : 'bg-[#f5f5f7] border-black/6 text-[#1d1d1f]'
            }`}>
              <Loader2 className="w-4 h-4 text-[#0071e3] animate-spin" />
              <div className="flex items-center gap-1.5 text-xs">
                <span>{isHumanActive ? 'Dispatching to representative queue...' : 'Executing multi-agent evaluation...'}</span>
                <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-[#6b7280]'}`}>
                  {isHumanActive ? '(Encrypted Vault · Realtime Sync)' : '(PII Mask → RoBERTa → Local llama3.2:3b GPU)'}
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
              placeholder={
                isHumanActive
                  ? `Message Senior Specialist ${humanAgentName} directly (PII automatically masked)...`
                  : 'Type customer message or review (e.g. paste phone, Aadhaar or order ID to verify PII masking)...'
              }
              className={`flex-1 bg-transparent px-4 py-3 text-xs resize-none focus:outline-none leading-relaxed transition-colors ${
                isDark ? 'text-slate-100 placeholder-slate-400' : 'text-[#1d1d1f] placeholder-[#86868b]'
              }`}
            />
            <div className="pr-3 pl-1 self-end pb-3">
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className={`w-8 h-8 rounded-lg text-white flex items-center justify-center transition-all shadow-xs ${
                  isHumanActive
                    ? 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30'
                    : 'bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-30'
                }`}
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
              <span>
                {isHumanActive
                  ? 'Active human session: All inputs are securely masked before representative viewing'
                  : 'Zero-knowledge pipeline: Sensitive PII encrypted in vault before inference'}
              </span>
            </div>
            <span className="hidden sm:inline">Press Enter to send</span>
          </div>
        </form>
      </div>
    </div>
  );
};
