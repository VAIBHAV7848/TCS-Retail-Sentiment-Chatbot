import React, { useState } from 'react';
import { useChat } from './hooks/useChat';
import { ChatWindow } from './components/ChatWindow';
import { AvatarPanel } from './components/AvatarPanel';
import { PrivacyPanel } from './components/PrivacyPanel';
import { EscalationBanner } from './components/EscalationBanner';
import { DemoButtons } from './components/DemoButtons';
import { Dashboard } from './components/Dashboard';
import {
  MessageSquare,
  BarChart3,
  Bot,
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard'>('chat');
  const [typedDraft, setTypedDraft] = useState('');
  const [dismissEscalation, setDismissEscalation] = useState(false);

  const {
    messages,
    loading,
    currentSentiment,
    currentAvatar,
    currentEscalation,
    latestPiiEntities,
    hasPrivacyWarning,
    sendMessage,
    resetChat,
  } = useChat();

  const latestUserMessage =
    [...messages].reverse().find((m) => m.sender === 'user')?.text || typedDraft;
  const latestBotReply =
    [...messages].reverse().find((m) => m.sender === 'bot')?.text || '';

  const handleSelectScenario = (promptText: string) => {
    setDismissEscalation(false);
    sendMessage(promptText);
  };

  const handleSendMessage = (text: string) => {
    setDismissEscalation(false);
    sendMessage(text);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#08090c] text-slate-100 font-sans antialiased overflow-hidden selection:bg-blue-500/30 selection:text-white">
      {/* Editorial Header inspired by Apple & Google Antigravity */}
      <header className="h-14 border-b border-white/8 bg-[#0b0d12]/90 backdrop-blur-xl px-6 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/6 border border-white/10 flex items-center justify-center text-slate-200">
            <Bot className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white">RetailSense</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/6 text-slate-300 border border-white/8">
                4-Agent Orchestrator
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Privacy-by-Design &bull; Sentiment-Adaptive Avatar &bull; Realtime Escalation
            </p>
          </div>
        </div>

        {/* Apple-style Segmented View Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-[#141822] p-1 border border-white/8 shadow-inner">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-3.5 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-white/12 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Console</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white/12 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Intelligence Analytics</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/4 border border-white/6 text-[10px] font-mono text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>CUDA GPU Active</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'dashboard' ? (
          <Dashboard />
        ) : (
          <div className="flex-1 grid grid-cols-12 gap-4 p-4 max-w-[1920px] mx-auto w-full overflow-hidden">
            {/* Left Column: Curated Scenarios Launcher (Col 1-3) */}
            <div className="col-span-12 lg:col-span-3 xl:col-span-3 h-full overflow-hidden hidden lg:block">
              <DemoButtons
                onSelectScenario={handleSelectScenario}
                disabled={loading}
              />
            </div>

            {/* Center Column: Live Chat Console + Escalation Overlay (Col 4-8) */}
            <div className="col-span-12 lg:col-span-5 xl:col-span-5 h-full flex flex-col gap-3 overflow-hidden">
              {/* Dynamic Escalation Alert Banner */}
              {!dismissEscalation && currentEscalation && currentEscalation.decision !== 'none' && (
                <div className="flex-shrink-0">
                  <EscalationBanner
                    escalation={currentEscalation}
                    onDismiss={() => setDismissEscalation(true)}
                  />
                </div>
              )}

              <div className="flex-1 min-h-0">
                <ChatWindow
                  messages={messages}
                  loading={loading}
                  onSendMessage={handleSendMessage}
                  onResetChat={resetChat}
                  onInputChange={setTypedDraft}
                />
              </div>
            </div>

            {/* Right Column: Avatar Canvas & Privacy Vault (Col 9-12) */}
            <div className="col-span-12 lg:col-span-4 xl:col-span-4 h-full flex flex-col gap-4 overflow-hidden">
              {/* Top: Sentiment & Realtime Voice Avatar */}
              <div className="h-[56%] flex-shrink-0">
                <AvatarPanel
                  avatar={currentAvatar}
                  sentiment={currentSentiment}
                  loading={loading}
                  latestReply={latestBotReply}
                />
              </div>

              {/* Bottom: Privacy Vault & Anonymization Stream */}
              <div className="flex-1 min-h-0">
                <PrivacyPanel
                  latestOriginalText={latestUserMessage}
                  piiEntities={latestPiiEntities}
                  hasPrivacyWarning={hasPrivacyWarning}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
