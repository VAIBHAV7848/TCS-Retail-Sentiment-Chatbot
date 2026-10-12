import React from 'react';
import {
  ArrowRight,
  Smile,
  HelpCircle,
  Clock,
  AlertTriangle,
  Lock,
  MessageSquareQuote,
  Headphones,
  UserCheck,
  Cpu,
  Shield,
  Activity,
} from 'lucide-react';

interface DemoScenario {
  id: string;
  num: string;
  title: string;
  category: string;
  expectedTone: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'happy',
    num: '01',
    title: 'Customer Delight',
    category: 'Praise & Positive',
    expectedTone: 'Joy & Smile Avatar',
    icon: Smile,
    prompt: 'I absolutely love this product! The quality is amazing and delivery was super fast. Best purchase ever!',
  },
  {
    id: 'neutral',
    num: '02',
    title: 'Policy Inquiry',
    category: 'Information Request',
    expectedTone: 'Attentive & Factual',
    icon: HelpCircle,
    prompt: 'What is your return policy for electronics? I bought a laptop last week.',
  },
  {
    id: 'frustrated',
    num: '03',
    title: 'Delivery Delay',
    category: 'Moderate Urgency',
    expectedTone: 'Concerned & Empathetic',
    icon: Clock,
    prompt: "My order #ORD-4521 hasn't arrived yet. It's been 10 days! This is unacceptable.",
  },
  {
    id: 'angry',
    num: '04',
    title: 'Hostile & Escalation',
    category: 'Urgent Human Handoff',
    expectedTone: 'Serious & De-escalating',
    icon: AlertTriangle,
    prompt: "This is the THIRD time I'm contacting you about order #ORD-8834. I want a FULL REFUND right now or I'm filing a consumer court complaint!",
  },
  {
    id: 'pii',
    num: '05',
    title: 'PII Interception',
    category: 'Aadhaar, Phone & Card',
    expectedTone: 'Auto-Masked & Vaulted',
    icon: Lock,
    prompt: 'Hi, I am Priya Sharma, my email is priya.sharma@gmail.com and my Aadhaar is 4832 9812 5467. My order #ORD-9921 is wrong. Call me at 9845012345.',
  },
  {
    id: 'sarcasm',
    num: '06',
    title: 'Sarcasm Detection',
    category: 'Tier-2 LLM Review',
    expectedTone: 'Second-Opinion Overrule',
    icon: MessageSquareQuote,
    prompt: 'Great, another delay. Exactly what I needed. Your delivery service is just wonderful.',
  },
  {
    id: 'human_optout',
    num: '07',
    title: 'Speak to Real Human',
    category: 'AI Opt-Out & Specialist',
    expectedTone: 'Direct Specialist Handoff',
    icon: Headphones,
    prompt: 'I do not want to talk with an AI chatbot at all. Please connect me immediately to a real human representative.',
  },
];

interface DemoButtonsProps {
  onSelectScenario: (prompt: string) => void;
  onConnectHuman?: () => void;
  isHumanActive?: boolean;
  disabled?: boolean;
  theme?: 'light' | 'dark';
}

export const DemoButtons: React.FC<DemoButtonsProps> = ({
  onSelectScenario,
  onConnectHuman,
  isHumanActive = false,
  disabled,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  return (
    <div className={`flex flex-col h-full rounded-2xl border p-3.5 shadow-sm transition-colors overflow-hidden ${
      isDark
        ? 'bg-[#0b0d12] border-white/8 text-white'
        : 'bg-white border-black/8 text-[#1d1d1f]'
    }`}>
      {/* Header */}
      <div className={`pb-2.5 border-b flex items-center justify-between flex-shrink-0 ${
        isDark ? 'border-white/6' : 'border-black/6'
      }`}>
        <div>
          <h2 className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? 'text-slate-300' : 'text-[#1d1d1f]'
          }`}>
            Command Dock
          </h2>
          <p className={`text-[10px] mt-0.5 ${
            isDark ? 'text-slate-400' : 'text-[#86868b]'
          }`}>
            Multi-Agent Scenarios & Telemetry
          </p>
        </div>

        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono border ${
          isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>LOCAL GPU</span>
        </div>
      </div>

      {/* Mini System Telemetry HUD */}
      <div className={`my-2 p-2.5 rounded-xl border flex-shrink-0 text-[10px] font-mono transition-colors ${
        isDark ? 'bg-[#121620] border-white/6' : 'bg-[#fbfbfd] border-black/6 shadow-xs'
      }`}>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-indigo-500 flex-shrink-0" />
            <div className="truncate">
              <span className="opacity-60 block text-[9px]">ENGINE</span>
              <span className="font-semibold text-[10px]">llama3.2:3b</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            <div className="truncate">
              <span className="opacity-60 block text-[9px]">PII VAULT</span>
              <span className="font-semibold text-[10px]">AES-256 GCM</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <div className="truncate">
              <span className="opacity-60 block text-[9px]">CLASSIFIER</span>
              <span className="font-semibold text-[10px]">RoBERTa NLP</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <div className="truncate">
              <span className="opacity-60 block text-[9px]">LATENCY</span>
              <span className="font-semibold text-[10px]">~140ms (CUDA)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Human Specialist Direct Banner */}
      {onConnectHuman && (
        <div className="mb-2 flex-shrink-0">
          <button
            onClick={() => onConnectHuman()}
            disabled={disabled || isHumanActive}
            className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all ${
              isHumanActive
                ? isDark
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 opacity-90'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : isDark
                ? 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-200'
                : 'bg-indigo-50/70 hover:bg-indigo-100 border-indigo-200 text-[#4338ca] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                isHumanActive
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-indigo-500/20 text-indigo-400'
              }`}>
                {isHumanActive ? <UserCheck className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
              </div>
              <div>
                <p className="text-xs font-semibold">
                  {isHumanActive ? 'Live Human Desk Connected' : 'Talk with Real Human'}
                </p>
                <p className="text-[10px] opacity-75">
                  {isHumanActive ? 'Senior Specialist Sarah Jenkins' : 'Skip AI & handover seamlessly'}
                </p>
              </div>
            </div>
            {!isHumanActive && <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />}
          </button>
        </div>
      )}

      {/* Scenario List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 py-1 pr-1">
        {DEMO_SCENARIOS.map((sc) => {
          const Icon = sc.icon;
          return (
            <button
              key={sc.id}
              onClick={() => onSelectScenario(sc.prompt)}
              disabled={disabled}
              className={`w-full text-left p-2.5 rounded-xl border transition-all group disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark
                  ? 'bg-[#151922] hover:bg-[#1a2130] border-white/6 hover:border-white/12'
                  : 'bg-[#fbfbfd] hover:bg-[#f5f5f7] border-black/6 hover:border-black/12 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                    isDark
                      ? 'bg-white/4 border-white/8 text-slate-400'
                      : 'bg-black/4 border-black/8 text-[#86868b]'
                  }`}>
                    {sc.num}
                  </span>
                  <h3 className={`text-xs font-semibold tracking-tight transition-colors ${
                    isDark
                      ? 'text-slate-200 group-hover:text-white'
                      : 'text-[#1d1d1f] group-hover:text-[#0071e3]'
                  }`}>
                    {sc.title}
                  </h3>
                </div>
                <Icon className={`w-3.5 h-3.5 transition-colors ${
                  isDark
                    ? 'text-slate-400 group-hover:text-slate-300'
                    : 'text-[#86868b] group-hover:text-[#1d1d1f]'
                }`} />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className={isDark ? 'text-slate-400' : 'text-[#86868b]'}>
                  {sc.category}
                </span>
                <span className={`flex items-center gap-0.5 font-medium ${
                  isDark
                    ? 'text-blue-400/80 group-hover:text-blue-300'
                    : 'text-[#0071e3] group-hover:text-[#0077ed]'
                }`}>
                  Run <ArrowRight className="w-2.5 h-2.5 inline" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className={`pt-2.5 border-t text-[10px] flex-shrink-0 font-mono flex items-center justify-between ${
        isDark ? 'border-white/6 text-slate-400' : 'border-black/6 text-[#86868b]'
      }`}>
        <span>4-Agent State Graph</span>
        <span className="text-emerald-500 font-medium">● 0 Leaks</span>
      </div>
    </div>
  );
};
