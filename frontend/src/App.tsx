import React, { useState, useEffect } from 'react';
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
  Sun,
  Moon,
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard'>('chat');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
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

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

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

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className={`flex flex-col h-screen w-screen font-sans antialiased overflow-hidden transition-colors duration-200 ${
      theme === 'dark' ? 'dark bg-[#08090c] text-slate-100' : 'bg-[#f5f5f7] text-[#1d1d1f]'
    }`}>
      {/* Apple / Google Antigravity Editorial Header */}
      <header className={`h-14 border-b px-6 flex items-center justify-between flex-shrink-0 z-30 transition-colors backdrop-blur-xl ${
        theme === 'dark'
          ? 'bg-[#0b0d12]/90 border-white/8 text-white'
          : 'bg-white/85 border-black/8 text-[#1d1d1f] shadow-xs'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
            theme === 'dark'
              ? 'bg-white/8 border border-white/10 text-blue-400'
              : 'bg-black/5 border border-black/8 text-blue-600 shadow-xs'
          }`}>
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-sm tracking-tight ${theme === 'dark' ? 'text-white' : 'text-[#1d1d1f]'}`}>
                RetailSense
              </span>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                theme === 'dark'
                  ? 'bg-white/6 text-slate-300 border-white/8'
                  : 'bg-black/5 text-[#48484a] border-black/8 font-medium'
              }`}>
                4-Agent Orchestrator
              </span>
            </div>
            <p className={`text-[10px] hidden sm:block ${theme === 'dark' ? 'text-slate-400' : 'text-[#86868b]'}`}>
              Privacy-by-Design &bull; Sentiment-Adaptive Avatar &bull; Realtime Escalation
            </p>
          </div>
        </div>

        {/* Center / Right Controls: Segmented View Switcher & Theme Controller */}
        <div className="flex items-center gap-3">
          <div className={`flex rounded-xl p-1 border shadow-xs transition-colors ${
            theme === 'dark'
              ? 'bg-[#141822] border-white/8'
              : 'bg-[#e5e5ea] border-black/6'
          }`}>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-3.5 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'chat'
                  ? theme === 'dark'
                    ? 'bg-white/14 text-white shadow-sm'
                    : 'bg-white text-[#1d1d1f] shadow-xs'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Console</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'dashboard'
                  ? theme === 'dark'
                    ? 'bg-white/14 text-white shadow-sm'
                    : 'bg-white text-[#1d1d1f] shadow-xs'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Intelligence Analytics</span>
            </button>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${
              theme === 'dark'
                ? 'bg-white/6 border-white/10 text-amber-300 hover:bg-white/10'
                : 'bg-white border-black/8 text-slate-700 hover:bg-black/5 shadow-xs'
            }`}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'White'} Mode`}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono transition-colors ${
            theme === 'dark'
              ? 'bg-white/4 border-white/6 text-slate-300'
              : 'bg-white border-black/8 text-[#48484a] shadow-xs'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>CUDA GPU Active</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'dashboard' ? (
          <Dashboard theme={theme} />
        ) : (
          <div className="flex-1 grid grid-cols-12 gap-4 p-4 max-w-[1920px] mx-auto w-full overflow-hidden">
            {/* Left Column: Curated Scenarios Launcher (Col 1-3) */}
            <div className="col-span-12 lg:col-span-3 xl:col-span-3 h-full overflow-hidden hidden lg:block">
              <DemoButtons
                onSelectScenario={handleSelectScenario}
                disabled={loading}
                theme={theme}
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
                    theme={theme}
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
                  theme={theme}
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
                  theme={theme}
                />
              </div>

              {/* Bottom: Privacy Vault & Anonymization Stream */}
              <div className="flex-1 min-h-0">
                <PrivacyPanel
                  latestOriginalText={latestUserMessage}
                  piiEntities={latestPiiEntities}
                  hasPrivacyWarning={hasPrivacyWarning}
                  theme={theme}
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
