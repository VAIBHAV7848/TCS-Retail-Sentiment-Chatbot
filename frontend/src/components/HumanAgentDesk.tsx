import React, { useState, useEffect, useRef } from 'react';
import type { ActiveHumanSession, SessionMessageItem } from '../types';
import {
  getActiveHumanSessions,
  getSessionMessages,
  sendHumanMessage,
} from '../api';
import {
  Headphones,
  Send,
  RefreshCw,
  User,
  Bot,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Lock,
} from 'lucide-react';

interface HumanAgentDeskProps {
  theme?: 'light' | 'dark';
  currentCustomerSessionId?: string;
}

export const HumanAgentDesk: React.FC<HumanAgentDeskProps> = ({
  theme = 'light',
  currentCustomerSessionId,
}) => {
  const [sessions, setSessions] = useState<ActiveHumanSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(() => {
    if (currentCustomerSessionId) return currentCustomerSessionId;
    try {
      const urlSession = new URLSearchParams(window.location.search).get('session');
      if (urlSession) return urlSession;
      const stored = localStorage.getItem('retailsense_active_session');
      if (stored) return stored;
    } catch {}
    return null;
  });
  const [messages, setMessages] = useState<SessionMessageItem[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [agentName] = useState('Sarah Jenkins');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // Load active escalated sessions
  const fetchSessions = async () => {
    try {
      setRefreshing(true);
      const data = await getActiveHumanSessions();
      setSessions(data);
      if (!selectedSessionId && data.length > 0) {
        setSelectedSessionId(data[0].session_id);
      } else if (currentCustomerSessionId && !selectedSessionId) {
        setSelectedSessionId(currentCustomerSessionId);
      }
    } catch {
      // Background poll tolerance
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update selected if current customer session changes
  useEffect(() => {
    if (currentCustomerSessionId) {
      setSelectedSessionId(currentCustomerSessionId);
    }
  }, [currentCustomerSessionId]);

  // Load transcript for selected session
  const fetchMessages = async (sid: string) => {
    try {
      const msgs = await getSessionMessages(sid);
      setMessages(msgs);
    } catch {
      // Tolerance
    }
  };

  useEffect(() => {
    if (!selectedSessionId) return;
    fetchMessages(selectedSessionId);
    const interval = setInterval(() => fetchMessages(selectedSessionId), 1500);
    return () => clearInterval(interval);
  }, [selectedSessionId]);

  // Listen for customer messages across tabs to auto-refresh
  useEffect(() => {
    let bus: BroadcastChannel | null = null;
    try {
      bus = new BroadcastChannel('retailsense_chat_bus');
      bus.onmessage = (event) => {
        if (event.data?.type === 'CUSTOMER_MESSAGE') {
          fetchSessions();
          if (selectedSessionId && event.data.sessionId === selectedSessionId) {
            fetchMessages(selectedSessionId);
          }
        }
      };
    } catch {}
    return () => bus?.close();
  }, [selectedSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSessionId || !replyText.trim() || sending) return;

    setSending(true);
    const textToSend = replyText.trim();
    setReplyText('');

    try {
      await sendHumanMessage(selectedSessionId, 'human_agent', textToSend, agentName);

      // Instant Broadcast across tabs to Customer chat (0ms delay)
      try {
        const bus = new BroadcastChannel('retailsense_chat_bus');
        bus.postMessage({
          type: 'AGENT_REPLY',
          sessionId: selectedSessionId,
          text: textToSend,
          agentName: agentName,
          timestamp: new Date().toISOString(),
        });
        bus.close();
      } catch {}

      // Save as active session
      try {
        localStorage.setItem('retailsense_active_session', selectedSessionId);
      } catch {}

      // Optimistic local append for agent desk
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          session_id: selectedSessionId,
          turn_number: prev.length + 1,
          text: textToSend,
          is_bot: true,
          is_human: true,
          agent_name: agentName,
          timestamp: new Date().toISOString(),
        },
      ]);

      await fetchMessages(selectedSessionId);
    } catch {
      setReplyText(textToSend); // Restore on error
    } finally {
      setSending(false);
    }
  };

  const handleApplyMacro = (text: string) => {
    setReplyText(text);
  };

  const selectedSession = sessions.find((s) => s.session_id === selectedSessionId);

  return (
    <div className="flex-1 h-full grid grid-cols-12 gap-4 p-4 max-w-[1920px] mx-auto w-full overflow-hidden">
      {/* ── LEFT PANEL: Escalation Queue (Col 1-3) ─────────────────────────── */}
      <div className="col-span-12 lg:col-span-3 xl:col-span-3 h-full flex flex-col rounded-2xl border transition-colors overflow-hidden ${
        isDark ? 'bg-[#0b0d12] border-white/8 shadow-2xl' : 'bg-white border-black/8 shadow-sm'
      }">
        {/* Queue Header */}
        <div className={`p-4 border-b flex items-center justify-between transition-colors ${
          isDark ? 'bg-[#0e1117] border-white/6 text-white' : 'bg-[#fbfbfd] border-black/6 text-[#1d1d1f]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-[#4338ca]'
            }`}>
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold tracking-tight">Escalation Queue</h3>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
                {sessions.length} active customer {sessions.length === 1 ? 'ticket' : 'tickets'}
              </p>
            </div>
          </div>

          <button
            onClick={fetchSessions}
            disabled={refreshing}
            className={`p-1.5 rounded-lg border transition-all ${
              isDark
                ? 'border-white/10 hover:bg-white/5 text-slate-300'
                : 'border-black/8 hover:bg-black/5 text-[#48484a]'
            }`}
            title="Refresh queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sessions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                isDark ? 'bg-white/5 text-slate-400' : 'bg-black/5 text-[#86868b]'
              }`}>
                <UserCheck className="w-5 h-5" />
              </div>
              <p className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-[#1d1d1f]'}`}>
                No Pending Escalations
              </p>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
                Customers requesting a real human or flagged as urgent by RoBERTa will show up here instantly.
              </p>
            </div>
          ) : (
            sessions.map((s) => {
              const isSelected = s.session_id === selectedSessionId;
              const isUrgent = s.priority === 'urgent_handoff' || s.priority === 'critical' || s.priority === 'high';

              return (
                <div
                  key={s.case_id}
                  onClick={() => setSelectedSessionId(s.session_id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? isDark
                        ? 'bg-indigo-600/15 border-indigo-500/40 shadow-xs ring-1 ring-indigo-500/30'
                        : 'bg-indigo-50/70 border-indigo-200 shadow-xs ring-1 ring-indigo-300/40'
                      : isDark
                      ? 'bg-[#121620] hover:bg-[#161c28] border-white/6'
                      : 'bg-[#fbfbfd] hover:bg-[#f5f5f7] border-black/6'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-medium truncate max-w-[130px]">
                      {s.session_id}
                    </span>
                    <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                      isUrgent
                        ? isDark
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 font-semibold'
                          : 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                        : isDark
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {s.priority}
                    </span>
                  </div>

                  <p className={`text-[11px] line-clamp-2 mb-2 leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-[#48484a]'
                  }`}>
                    {s.latest_message || s.reason}
                  </p>

                  <div className={`flex items-center justify-between text-[10px] font-mono ${
                    isDark ? 'text-slate-400' : 'text-[#86868b]'
                  }`}>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {s.latest_sentiment && (
                      <span className={`uppercase font-medium ${
                        s.latest_sentiment.polarity === 'negative'
                          ? 'text-rose-500'
                          : s.latest_sentiment.polarity === 'positive'
                          ? 'text-emerald-500'
                          : 'text-amber-500'
                      }`}>
                        {s.latest_sentiment.emotion || s.latest_sentiment.polarity}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── CENTER PANEL: Live Representative Workspace (Col 4-8) ──────────── */}
      <div className={`col-span-12 lg:col-span-5 xl:col-span-5 h-full flex flex-col rounded-2xl border transition-colors overflow-hidden ${
        isDark ? 'bg-[#0b0d12] border-white/8 shadow-2xl' : 'bg-white border-black/8 shadow-sm'
      }`}>
        {/* Workspace Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between transition-colors ${
          isDark ? 'bg-[#0e1117] border-white/6 text-white' : 'bg-[#fbfbfd] border-black/6 text-[#1d1d1f]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
            }`}>
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight">
                  Representative Console
                </h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isDark
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                }`}>
                  Live as {agentName}
                </span>
              </div>
              <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
                {selectedSessionId ? `Session: ${selectedSessionId}` : 'Select a ticket to begin response'}
              </p>
            </div>
          </div>

          {selectedSessionId && (
            <button
              onClick={() => window.open(`/?tab=agent&session=${selectedSessionId}`, '_blank')}
              className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                isDark
                  ? 'border-white/10 hover:bg-white/5 text-slate-300'
                  : 'border-black/8 hover:bg-black/5 text-[#48484a]'
              }`}
              title="Pop out this chat in a brand new dedicated window"
            >
              <ExternalLink className="w-3 h-3" />
              <span>New Tab</span>
            </button>
          )}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!selectedSessionId ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className={`w-10 h-10 mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
              <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-[#1d1d1f]'}`}>
                No Customer Session Selected
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-[#86868b]'}`}>
                Pick an escalated case from the left queue to review full customer messages.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <Sparkles className={`w-8 h-8 mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
                Loading customer conversation history...
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isCustomer = !m.is_bot;
              const isHumanAgent = m.is_human;

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                >
                  <div className={`flex items-center gap-1.5 mb-1 text-[10px] font-mono ${
                    isDark ? 'text-slate-400' : 'text-[#86868b]'
                  }`}>
                    {isCustomer ? (
                      <>
                        <User className="w-3 h-3 text-blue-500" />
                        <span className="font-semibold text-blue-600 dark:text-blue-400">Customer (Vault-Masked)</span>
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </>
                    ) : isHumanAgent ? (
                      <>
                        <UserCheck className="w-3 h-3 text-emerald-500" />
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {m.agent_name || agentName} (You)
                        </span>
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-3 h-3 text-slate-400" />
                        <span>AI Assistant Copilot</span>
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </>
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      isCustomer
                        ? isDark
                          ? 'bg-[#182030] text-slate-200 border border-blue-500/20 rounded-tl-sm'
                          : 'bg-[#eff6ff] text-[#1e3a8a] border border-blue-200 rounded-tl-sm shadow-xs'
                        : isHumanAgent
                        ? isDark
                          ? 'bg-emerald-950/40 text-emerald-100 border border-emerald-500/30 rounded-tr-sm ring-1 ring-emerald-500/10'
                          : 'bg-[#f0fdf4] text-[#14532d] border border-emerald-200 rounded-tr-sm shadow-xs'
                        : isDark
                        ? 'bg-[#121620] text-slate-400 border border-white/6 rounded-tr-sm'
                        : 'bg-[#f5f5f7] text-[#6b7280] border border-black/6 rounded-tr-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Canned Macros */}
        <div className={`px-4 py-2 border-t flex items-center gap-1.5 overflow-x-auto transition-colors ${
          isDark ? 'bg-[#0e1117] border-white/6' : 'bg-[#fbfbfd] border-black/6'
        }`}>
          <span className={`text-[10px] uppercase font-mono tracking-wider flex-shrink-0 ${
            isDark ? 'text-slate-400' : 'text-[#86868b]'
          }`}>
            Quick Macros:
          </span>
          <button
            onClick={() => handleApplyMacro("I can help you review your order right away. Let me check the fulfillment status.")}
            className={`text-[11px] px-2.5 py-1 rounded-md border flex-shrink-0 transition-colors ${
              isDark
                ? 'bg-white/5 border-white/8 hover:bg-white/10 text-slate-300'
                : 'bg-white border-black/8 hover:bg-black/5 text-[#48484a] shadow-xs'
            }`}
          >
            Check Fulfillment
          </button>
          <button
            onClick={() => handleApplyMacro("I see the transaction discrepancy. I have authorized an immediate full refund to your original payment method.")}
            className={`text-[11px] px-2.5 py-1 rounded-md border flex-shrink-0 transition-colors ${
              isDark
                ? 'bg-white/5 border-white/8 hover:bg-white/10 text-slate-300'
                : 'bg-white border-black/8 hover:bg-black/5 text-[#48484a] shadow-xs'
            }`}
          >
            Authorize Refund
          </button>
          <button
            onClick={() => handleApplyMacro("I sincerely apologize for the delay. I have escalated this to our senior dispatch supervisor for priority express delivery.")}
            className={`text-[11px] px-2.5 py-1 rounded-md border flex-shrink-0 transition-colors ${
              isDark
                ? 'bg-white/5 border-white/8 hover:bg-white/10 text-slate-300'
                : 'bg-white border-black/8 hover:bg-black/5 text-[#48484a] shadow-xs'
            }`}
          >
            Express Escalation
          </button>
        </div>

        {/* Agent Reply Input Box */}
        <div className={`p-4 border-t flex-shrink-0 transition-colors ${
          isDark ? 'bg-[#0e1117] border-white/6' : 'bg-[#fbfbfd] border-black/6'
        }`}>
          <form onSubmit={handleSendReply} className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={!selectedSessionId || sending}
              placeholder={
                selectedSessionId
                  ? `Reply directly to customer as ${agentName}...`
                  : 'Select a customer ticket to respond'
              }
              className={`flex-1 px-4 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                isDark
                  ? 'bg-[#151922] border-white/10 text-slate-100 placeholder-slate-400 focus:border-emerald-500/50'
                  : 'bg-[#f5f5f7] border-black/8 text-[#1d1d1f] placeholder-[#86868b] focus:border-emerald-600 focus:bg-white'
              }`}
            />
            <button
              type="submit"
              disabled={!selectedSessionId || !replyText.trim() || sending}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Sending...' : 'Send'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* ── RIGHT PANEL: Customer Telemetry & Vault Context (Col 9-12) ────── */}
      <div className={`col-span-12 lg:col-span-4 xl:col-span-4 h-full flex flex-col gap-4 overflow-y-auto`}>
        {/* Card 1: Escalation Details */}
        <div className={`p-5 rounded-2xl border transition-colors ${
          isDark ? 'bg-[#0b0d12] border-white/8' : 'bg-white border-black/8 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-semibold tracking-tight uppercase">
              Escalation Telemetry
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-black/5 dark:border-white/5">
              <span className={isDark ? 'text-slate-400' : 'text-[#86868b]'}>Ticket ID</span>
              <span className="font-mono">{selectedSession?.case_id || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-black/5 dark:border-white/5">
              <span className={isDark ? 'text-slate-400' : 'text-[#86868b]'}>Priority</span>
              <span className="font-semibold text-rose-500 uppercase">{selectedSession?.priority || 'Standard'}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-black/5 dark:border-white/5">
              <span className={isDark ? 'text-slate-400' : 'text-[#86868b]'}>Handoff Trigger</span>
              <span className="font-medium text-right max-w-[200px] truncate">
                {selectedSession?.reason || 'Direct Customer Opt-Out'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Privacy Vault Protection Details */}
        <div className={`p-5 rounded-2xl border transition-colors ${
          isDark ? 'bg-[#0b0d12] border-white/8' : 'bg-white border-black/8 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-semibold tracking-tight uppercase">
              PII Vault Zero-Retention
            </h3>
          </div>
          <p className={`text-xs leading-relaxed mb-3 ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
            All incoming customer credit cards, Aadhaar, PAN, phone numbers, and addresses are automatically substituted with encrypted vault tokens before rendering.
          </p>
          <div className={`p-3 rounded-xl border text-[11px] font-mono ${
            isDark ? 'bg-white/4 border-white/8 text-slate-300' : 'bg-[#f5f5f7] border-black/6 text-[#48484a]'
          }`}>
            <span>Active Tokens: [CARD_1], [PHONE_1], [ORDER_ID_1]</span>
          </div>
        </div>

        {/* Card 3: Representative Workflow Guide */}
        <div className={`p-5 rounded-2xl border transition-colors flex-1 ${
          isDark ? 'bg-[#0b0d12] border-white/8' : 'bg-white border-black/8 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-semibold tracking-tight uppercase">
              Specialist Operating SOP
            </h3>
          </div>
          <ul className={`text-xs space-y-2 list-disc list-inside leading-relaxed ${
            isDark ? 'text-slate-400' : 'text-[#6b7280]'
          }`}>
            <li>Acknowledge customer emotions with high empathy immediately.</li>
            <li>Messages typed here deliver seamlessly to the customer's chat in real-time.</li>
            <li>Customer will see responses as Senior Retail Specialist Sarah Jenkins.</li>
            <li>Vault tokens prevent accidental PCI-DSS data breaches.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
