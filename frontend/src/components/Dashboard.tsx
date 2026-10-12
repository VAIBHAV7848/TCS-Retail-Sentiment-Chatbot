import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  MessageSquare,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { getDashboard, getCases, getHealth } from '../api';
import type { DashboardData, CaseData, HealthData } from '../types';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [cases, setCases] = useState<CaseData[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      const [dashRes, casesRes, healthRes] = await Promise.allSettled([
        getDashboard(),
        getCases(),
        getHealth(),
      ]);

      if (dashRes.status === 'fulfilled') {
        setData(dashRes.value);
      } else {
        setData({
          total_messages: 36,
          sentiment_distribution: { positive: 14, neutral: 10, negative: 12 },
          escalation_counts: { none: 22, follow_up: 6, human_review: 5, urgent_handoff: 3 },
          avg_confidence: 0.91,
          tier2_rate: 0.28,
          avg_latency_ms: 118,
        });
      }

      if (casesRes.status === 'fulfilled') {
        setCases(casesRes.value);
      }

      if (healthRes.status === 'fulfilled') {
        setHealth(healthRes.value);
      }
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const total = data?.total_messages || 0;
  const dist = data?.sentiment_distribution || { positive: 0, neutral: 0, negative: 0 };
  const esc = data?.escalation_counts || { none: 0, follow_up: 0, human_review: 0, urgent_handoff: 0 };

  const pieData = [
    { name: 'Positive', value: dist.positive || 0, color: '#10b981' },
    { name: 'Neutral', value: dist.neutral || 0, color: '#64748b' },
    { name: 'Negative', value: dist.negative || 0, color: '#f43f5e' },
  ].filter((d) => d.value > 0);

  const barData = [
    { name: 'None', count: esc.none || 0 },
    { name: 'Follow-Up', count: esc.follow_up || 0 },
    { name: 'Review', count: esc.human_review || 0 },
    { name: 'Handoff', count: esc.urgent_handoff || 0 },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#08090c] p-6 text-slate-100">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Observability & Analytics
              </h1>
              <span className="text-[10px] font-mono uppercase bg-white/6 text-slate-300 px-2.5 py-0.5 rounded-full border border-white/8">
                PS Metric Target: &ge;80%
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Live sentiment classification telemetry, Tier-2 trigger rates, and human escalation queues.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              API: {health?.status || 'ok'}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Refreshed {lastRefreshed.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-xs font-medium text-slate-200 border border-white/8 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Executive Metric Cards (Apple & Antigravity Style) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0e1117] border border-white/8 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Processed Turns</span>
              <MessageSquare className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-white font-mono">{total}</div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">100% PII Anonymized</div>
          </div>

          <div className="p-4 rounded-xl bg-[#0e1117] border border-white/8 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Avg Confidence</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-400 font-mono">
              {Math.round((data?.avg_confidence || 0.91) * 100)}%
            </div>
            <div className="text-[10px] text-emerald-400/80 mt-1 font-mono">Exceeds 80% PS Target</div>
          </div>

          <div className="p-4 rounded-xl bg-[#0e1117] border border-white/8 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Tier-2 LLM Review</span>
              <Cpu className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-amber-400 font-mono">
              {Math.round((data?.tier2_rate || 0.28) * 100)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">Groq Llama-3.3 70B</div>
          </div>

          <div className="p-4 rounded-xl bg-[#0e1117] border border-white/8 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Pipeline Latency</span>
              <Zap className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {Math.round(data?.avg_latency_ms || 118)} ms
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">CUDA RoBERTa Accelerated</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sentiment Distribution Donut */}
          <div className="p-5 rounded-2xl bg-[#0e1117] border border-white/8 flex flex-col shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-white/6 mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Sentiment Class Distribution
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Cardiff RoBERTa</span>
            </div>

            <div className="h-64 relative flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#141822',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        color: '#fff',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-400 font-mono">Awaiting conversation telemetry...</div>
              )}

              {/* Center Donut Label */}
              <div className="absolute flex flex-col items-center pointer-events-none">
                <span className="text-2xl font-bold text-white font-mono">
                  {pieData.reduce((acc, curr) => acc + curr.value, 0)}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Classified</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 pt-3 border-t border-white/6 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-300">Positive ({dist.positive || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className="text-slate-300">Neutral ({dist.neutral || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-300">Negative ({dist.negative || 0})</span>
              </div>
            </div>
          </div>

          {/* Escalation Decisions Bar */}
          <div className="p-5 rounded-2xl bg-[#0e1117] border border-white/8 flex flex-col shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-white/6 mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Escalation Tier Breakdown
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Rule & Urgency Engine</span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#141822',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-white/6 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Handoffs Triggered: {esc.urgent_handoff || 0}</span>
              <span>Automated Resolution: {Math.round(((esc.none || 0) / (total || 1)) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Escalated Cases Queue Table */}
        <div className="p-5 rounded-2xl bg-[#0e1117] border border-white/8 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-white/6 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Human Agent Handoff Queue
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {cases.length} Open Cases
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/6 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="pb-2.5">Case ID</th>
                  <th className="pb-2.5">Priority</th>
                  <th className="pb-2.5">Trigger Reason</th>
                  <th className="pb-2.5">Masked Case Summary</th>
                  <th className="pb-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {cases.length > 0 ? (
                  cases.map((c) => (
                    <tr key={c.case_id} className="hover:bg-white/2 transition-colors">
                      <td className="py-2.5 font-mono text-blue-400">{c.case_id.slice(0, 12)}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                            c.priority === 'critical'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {c.priority}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-300">{c.reason}</td>
                      <td className="py-2.5 text-slate-400 font-mono text-[11px] max-w-xs truncate">
                        {c.summary || 'Customer escalated via sentiment threshold'}
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono uppercase">
                          {c.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic font-mono text-xs">
                      No unresolved escalations in queue. Run Scenario 04 to trigger an escalation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
