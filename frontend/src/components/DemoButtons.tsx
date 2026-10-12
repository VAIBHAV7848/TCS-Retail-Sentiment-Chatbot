import React from 'react';
import {
  ArrowRight,
  Smile,
  HelpCircle,
  Clock,
  AlertTriangle,
  Lock,
  MessageSquareQuote,
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
];

interface DemoButtonsProps {
  onSelectScenario: (prompt: string) => void;
  disabled?: boolean;
}

export const DemoButtons: React.FC<DemoButtonsProps> = ({ onSelectScenario, disabled }) => {
  return (
    <div className="flex flex-col h-full bg-[#0d0f14] border border-white/8 rounded-2xl p-4 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="pb-3 border-b border-white/6 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Curated Scenarios
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            1-Click Multi-Agent Benchmarks
          </p>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-white/4 px-2 py-0.5 rounded border border-white/6">
          6 Presets
        </span>
      </div>

      {/* Scenarios List */}
      <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-0.5">
        {DEMO_SCENARIOS.map((sc) => {
          const Icon = sc.icon;
          return (
            <button
              key={sc.id}
              onClick={() => onSelectScenario(sc.prompt)}
              disabled={disabled}
              className="w-full text-left p-3 rounded-xl bg-[#12151c] hover:bg-[#161a24] active:bg-[#1a1f2c] border border-white/4 hover:border-white/10 disabled:opacity-40 transition-all group relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-blue-400 transition-colors">
                    {sc.num}
                  </span>
                  <h3 className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors">
                    {sc.title}
                  </h3>
                </div>
                <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-300 transition-colors" />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span className="text-slate-400">{sc.category}</span>
                <span className="text-blue-400/80 group-hover:text-blue-300 flex items-center gap-0.5">
                  Run <ArrowRight className="w-2.5 h-2.5 inline" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-white/6 text-[10px] text-slate-400 flex-shrink-0 font-mono">
        <span>Runs full 4-agent state pipeline &bull; CUDA RoBERTa</span>
      </div>
    </div>
  );
};
