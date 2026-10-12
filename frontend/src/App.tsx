import React, { useState, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { ChatWindow } from './components/ChatWindow';
import { AvatarPanel } from './components/AvatarPanel';
import { PrivacyPanel } from './components/PrivacyPanel';
import { EscalationBanner } from './components/EscalationBanner';
import { DemoButtons } from './components/DemoButtons';
import { Dashboard } from './components/Dashboard';
import { HumanAgentDesk } from './components/HumanAgentDesk';
import {
  MessageSquare,
  BarChart3,
  Bot,
  Sun,
  Moon,
  Headphones,
} from 'lucide-react';

export const App: React.FC = () => {
  // Read initial tab from URL query params (supports ?tab=agent for separate window/tab opening)
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'agent'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'agent') return 'agent';
      if (params.get('tab') === 'dashboard') return 'dashboard';
    } catch {
      // Fallback
    }
    return 'chat';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [typedDraft, setTypedDraft] = useState('');
  const [dismissEscalation, setDismissEscalation] = useState(false);

  const {
    messages,
    sessionId,
    loading,
    error,
    clearError,
    isHumanActive,
    humanAgentName,
    currentSentiment,
    currentAvatar,
    currentEscalation,
    latestPiiEntities,
    hasPrivacyWarning,
    sendMessage,
    connectHumanHandoff,
    returnToAiMode,
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
      theme === 'dark' ? 'dark bg-[#090b10] text-slate-100' : 'bg-[#f9f9fc] text-[#111827]'
    }`}>
      {/* Apple / Google Stitch Editorial Header */}
      <header className={`h-14 border-b px-6 flex items-center justify-between flex-shrink-0 z-30 transition-colors backdrop-blur-xl ${
        theme === 'dark'
          ? 'bg-[#0e121a]/90 border-white/8 text-white'
          : 'bg-white/90 border-[#eceef2] text-[#111827] shadow-xs'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
            theme === 'dark'
              ? 'bg-white/8 border border-white/10 text-indigo-400'
              : 'bg-indigo-50 border border-indigo-100 text-[#4648d4] shadow-xs'
          }`}>
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-headline font-bold text-sm tracking-tight ${theme === 'dark' ? 'text-white' : 'text-[#111827]'}`}>
                RetailSense
              </span>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                theme === 'dark'
                  ? 'bg-white/6 text-slate-300 border-white/8'
                  : 'bg-black/5 text-[#48484a] border-[#eceef2] font-medium'
              }`}>
                4-Agent Orchestrator
              </span>
              {isHumanActive && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  theme === 'dark'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Human Agent Active
                </span>
              )}
            </div>
            <p className={`text-[10px] hidden sm:block ${theme === 'dark' ? 'text-slate-400' : 'text-[#6b7280]'}`}>
              Privacy Vault &bull; Sentiment-Adaptive 3D Avatar &bull; Realtime Escalation & Human Specialist Handoff
            </p>
          </div>
        </div>

        {/* Center / Right Controls: Segmented View Switcher & Theme Controller */}
        <div className="flex items-center gap-3">
          <div className={`flex rounded-xl p-1 border shadow-xs transition-colors ${
            theme === 'dark'
              ? 'bg-[#151b26] border-white/8'
              : 'bg-[#eef1f6] border-[#eceef2]'
          }`}>
            {/* Tab 1: Customer Console */}
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'chat'
                  ? theme === 'dark'
                    ? 'bg-white/14 text-white shadow-sm'
                    : 'bg-white text-[#111827] shadow-xs'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-[#6b7280] hover:text-[#111827]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Customer Console</span>
            </button>

            {/* Tab 2: Human Agent Desk */}
            <button
              onClick={() => setActiveTab('agent')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'agent'
                  ? theme === 'dark'
                    ? 'bg-white/14 text-white shadow-sm'
                    : 'bg-white text-[#111827] shadow-xs'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-[#6b7280] hover:text-[#111827]'
              }`}
              title="Dedicated portal for the human support representative"
            >
              <Headphones className="w-3.5 h-3.5 text-indigo-500" />
              <span>Human Agent Desk</span>
              {isHumanActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
              )}
            </button>

            {/* Tab 3: Intelligence Analytics */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'dashboard'
                  ? theme === 'dark'
                    ? 'bg-white/14 text-white shadow-sm'
                    : 'bg-white text-[#111827] shadow-xs'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-[#6b7280] hover:text-[#111827]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${
              theme === 'dark'
                ? 'bg-white/6 border-white/10 text-amber-300 hover:bg-white/10'
                : 'bg-white border-[#eceef2] text-slate-700 hover:bg-black/5 shadow-xs'
            }`}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'White'} Mode`}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono transition-colors ${
            theme === 'dark'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-xs'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Local GPU: llama3.2:3b</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'dashboard' ? (
          <Dashboard theme={theme} />
        ) : activeTab === 'agent' ? (
          <HumanAgentDesk
            theme={theme}
            currentCustomerSessionId={sessionId}
          />
        ) : (
          <div className="flex-1 flex gap-3 p-3 max-w-[1920px] mx-auto w-full overflow-hidden">
            {/* Left Column: Command Dock & Scenario Launcher (270px-290px fixed) */}
            <div className="w-[270px] xl:w-[290px] flex-shrink-0 h-full overflow-hidden hidden md:flex flex-col">
              <DemoButtons
                onSelectScenario={handleSelectScenario}
                onConnectHuman={connectHumanHandoff}
                isHumanActive={isHumanActive}
                disabled={loading}
                theme={theme}
              />
            </div>

            {/* Center Column: Live Chat Console + Escalation Overlay (flex-1) */}
            <div className="flex-1 min-w-[360px] h-full flex flex-col gap-2.5 overflow-hidden">
              {/* Dynamic Escalation Alert Banner */}
              {!dismissEscalation && currentEscalation && currentEscalation.decision !== 'none' && !isHumanActive && (
                <div className="flex-shrink-0">
                  <EscalationBanner
                    escalation={currentEscalation}
                    onDismiss={() => setDismissEscalation(true)}
                    theme={theme}
                  />
                </div>
              )}

              {/* Connection error banner (e.g. failed human handoff) */}
              {error && (
                <div className="flex-shrink-0">
                  <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-xs font-medium ${
                    theme === 'dark'
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`} role="alert">
                    <span>Connection failed: {error}. Check the backend is running, then retry.</span>
                    <button
                      onClick={clearError}
                      className={`px-2 py-1 rounded-lg border flex-shrink-0 transition-all ${
                        theme === 'dark'
                          ? 'border-red-500/30 hover:bg-red-500/10'
                          : 'border-red-200 hover:bg-red-100'
                      }`}
                      title="Dismiss"
                    >
                      Dismiss
                    </button>
                  </div>
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
                  isHumanActive={isHumanActive}
                  humanAgentName={humanAgentName}
                  onConnectHuman={connectHumanHandoff}
                  onReturnToAi={returnToAiMode}
                />
              </div>
            </div>

            {/* Right Column: Avatar Canvas & Privacy Vault (Prominent 410px-470px layout) */}
            <div className="w-[410px] xl:w-[440px] 2xl:w-[470px] flex-shrink-0 h-full flex flex-col gap-2.5 overflow-y-auto">
              {/* Top: Sentiment & Realtime Voice Avatar */}
              <div className="flex-shrink-0">
                <AvatarPanel
                  avatar={currentAvatar}
                  sentiment={currentSentiment}
                  loading={loading}
                  latestReply={latestBotReply}
                  theme={theme}
                />
              </div>

              {/* Bottom: Privacy Vault & Anonymization Stream */}
              <div className="flex-1 min-h-[220px]">
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
