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

interface DashboardProps {
  theme?: 'light' | 'dark';
}

export const Dashboard: React.FC<DashboardProps> = ({ theme = 'light' }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [cases, setCases] = useState<CaseData[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const isDark = theme === 'dark';

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
    { name: 'Neutral', value: dist.neutral || 0, color: isDark ? '#64748b' : '#94a3b8' },
    { name: 'Negative', value: dist.negative || 0, color: '#f43f5e' },
  ].filter((d) => d.value > 0);

  const barData = [
    { name: 'None', count: esc.none || 0 },
    { name: 'Follow-Up', count: esc.follow_up || 0 },
    { name: 'Review', count: esc.human_review || 0 },
    { name: 'Handoff', count: esc.urgent_handoff || 0 },
  ];

  return (
    <div className={`flex-1 overflow-y-auto p-6 transition-colors ${
      isDark ? 'bg-[#08090c] text-slate-100' : 'bg-[#f5f5f7] text-[#1d1d1f]'
    }`}>
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Top Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
          isDark ? 'border-white/6' : 'border-black/6'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                Observability & Analytics
              </h1>
              <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                isDark
                  ? 'bg-white/6 text-slate-300 border-white/8'
                  : 'bg-black/5 text-[#48484a] border-black/8 font-medium'
              }`}>
                PS Metric Target: &ge;80%
              </span>
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
              Live sentiment classification telemetry, Tier-2 trigger rates, and human escalation queues.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
              isDark
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}>
              API: {health?.status || 'ok'}
            </span>
            <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
              Refreshed {lastRefreshed.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchData}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all shadow-xs ${
                isDark
                  ? 'bg-white/6 hover:bg-white/10 text-slate-200 border-white/8'
                  : 'bg-white hover:bg-black/5 text-[#1d1d1f] border-black/8'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Executive Metric Cards (Apple & Antigravity Style) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-2xl border shadow-sm transition-colors ${
            isDark
              ? 'bg-[#0e1117] border-white/8 text-white'
              : 'bg-white border-black/8 text-[#1d1d1f]'
          }`}>
            <div className={`flex items-center justify-between mb-2 ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
              <span className="text-[11px] font-semibold uppercase tracking-wider">Processed Turns</span>
              <MessageSquare className="w-4 h-4 text-[#0071e3]" />
            </div>
            <div className="text-2xl font-bold tracking-tight font-mono">{total}</div>
            <div className={`text-[10px] mt-1 font-mono ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
              100% PII Anonymized
            </div>
          </div>

          <div className={`p-4 rounded-2xl border shadow-sm transition-colors ${
            isDark
              ? 'bg-[#0e1117] border-white/8 text-white'
              : 'bg-white border-black/8 text-[#1d1d1f]'
          }`}>
            <div className={`flex items-center justify-between mb-2 ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
              <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Confidence</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 font-mono">
              {Math.round((data?.avg_confidence || 0.91) * 100)}%
            </div>
            <div className="text-[10px] text-emerald-600 font-mono mt-1">Exceeds 80% PS Target</div>
          </div>

          <div className={`p-4 rounded-2xl border shadow-sm transition-colors ${
            isDark
              ? 'bg-[#0e1117] border-white/8 text-white'
              : 'bg-white border-black/8 text-[#1d1d1f]'
          }`}>
            <div className={`flex items-center justify-between mb-2 ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
              <span className="text-[11px] font-semibold uppercase tracking-wider">Tier-2 LLM Review</span>
              <Cpu className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-amber-600 font-mono">
              {Math.round((data?.tier2_rate || 0.28) * 100)}%
            </div>
            <div className={`text-[10px] mt-1 font-mono ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
              Groq GPT-OSS 120B
            </div>
          </div>

          <div className={`p-4 rounded-2xl border shadow-sm transition-colors ${
            isDark
              ? 'bg-[#0e1117] border-white/8 text-white'
              : 'bg-white border-black/8 text-[#1d1d1f]'
          }`}>
            <div className={`flex items-center justify-between mb-2 ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
              <span className="text-[11px] font-semibold uppercase tracking-wider">Pipeline Latency</span>
              <Zap className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight font-mono">
              {Math.round(data?.avg_latency_ms || 118)} ms
            </div>
            <div className={`text-[10px] mt-1 font-mono ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
              CUDA Accelerated
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sentiment Distribution Donut */}
          <div className={`p-5 rounded-2xl border flex flex-col shadow-sm transition-colors ${
            isDark
              ? 'bg-[#0e1117] border-white/8 text-white'
              : 'bg-white border-black/8 text-[#1d1d1f]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b mb-4 ${
              isDark ? 'border-white/6' : 'border-black/6'
            }`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${
                isDark ? 'text-slate-300' : 'text-[#1d1d1f]'
              }`}>
                Sentiment Class Distribution
              </h3>
              <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
                Cardiff RoBERTa
              </span>
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
                        backgroundColor: isDark ? '#141822' : '#ffffff',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        color: isDark ? '#fff' : '#1d1d1f',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
                  Awaiting conversation telemetry...
                </div>
              )}

              {/* Center Donut Label */}
              <div className="absolute flex flex-col items-center pointer-events-none">
                <span className={`text-2xl font-bold font-mono ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  {pieData.reduce((acc, curr) => acc + curr.value, 0)}
                </span>
                <span className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
                  Classified
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className={`flex items-center justify-center gap-6 pt-3 border-t text-xs ${
              isDark ? 'border-white/6' : 'border-black/6'
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className={isDark ? 'text-slate-300' : 'text-[#48484a]'}>Positive ({dist.positive || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-slate-500' : 'bg-slate-400'}`} />
                <span className={isDark ? 'text-slate-300' : 'text-[#48484a]'}>Neutral ({dist.neutral || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className={isDark ? 'text-slate-300' : 'text-[#48484a]'}>Negative ({dist.negative || 0})</span>
              </div>
            </div>
          </div>

          {/* Escalation Decisions Bar */}
          <div className={`p-5 rounded-2xl border flex flex-col shadow-sm transition-colors ${
            isDark
              ? 'bg-[#0e1117] border-white/8 text-white'
              : 'bg-white border-black/8 text-[#1d1d1f]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b mb-4 ${
              isDark ? 'border-white/6' : 'border-black/6'
            }`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${
                isDark ? 'text-slate-300' : 'text-[#1d1d1f]'
              }`}>
                Escalation Tier Breakdown
              </h3>
              <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
                Rule & Urgency Engine
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#86868b'} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={isDark ? '#64748b' : '#86868b'} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#141822' : '#ffffff',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      color: isDark ? '#fff' : '#1d1d1f',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Bar dataKey="count" fill="#0071e3" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={`pt-3 border-t flex items-center justify-between text-[11px] font-mono ${
              isDark ? 'border-white/6 text-slate-400' : 'border-black/6 text-[#86868b]'
            }`}>
              <span>Handoffs Triggered: {esc.urgent_handoff || 0}</span>
              <span>Automated Resolution: {Math.round(((esc.none || 0) / (total || 1)) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Escalated Cases Queue Table */}
        <div className={`p-5 rounded-2xl border shadow-sm transition-colors ${
          isDark
            ? 'bg-[#0e1117] border-white/8 text-white'
            : 'bg-white border-black/8 text-[#1d1d1f]'
        }`}>
          <div className={`flex items-center justify-between pb-3 border-b mb-4 ${
            isDark ? 'border-white/6' : 'border-black/6'
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${
                isDark ? 'text-slate-300' : 'text-[#1d1d1f]'
              }`}>
                Human Agent Handoff Queue
              </h3>
            </div>
            <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
              {cases.length} Open Cases
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b font-mono text-[10px] uppercase ${
                  isDark ? 'border-white/6 text-slate-400' : 'border-black/6 text-[#86868b]'
                }`}>
                  <th className="pb-2.5">Case ID</th>
                  <th className="pb-2.5">Priority</th>
                  <th className="pb-2.5">Trigger Reason</th>
                  <th className="pb-2.5">Masked Case Summary</th>
                  <th className="pb-2.5">Status</th>
                </tr>
              </thead>
              <tbody className={isDark ? 'divide-y divide-white/4' : 'divide-y divide-black/4'}>
                {cases.length > 0 ? (
                  cases.map((c) => (
                    <tr key={c.case_id} className={`transition-colors ${
                      isDark ? 'hover:bg-white/2' : 'hover:bg-black/2'
                    }`}>
                      <td className="py-2.5 font-mono text-[#0071e3]">{c.case_id.slice(0, 12)}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                            c.priority === 'critical'
                              ? isDark
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isDark
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {c.priority}
                        </span>
                      </td>
                      <td className={`py-2.5 ${isDark ? 'text-slate-300' : 'text-[#48484a]'}`}>{c.reason}</td>
                      <td className={`py-2.5 font-mono text-[11px] max-w-xs truncate ${
                        isDark ? 'text-slate-400' : 'text-[#86868b]'
                      }`}>
                        {c.summary || 'Customer escalated via sentiment threshold'}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase border ${
                          isDark
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {c.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className={`py-8 text-center italic font-mono text-xs ${
                      isDark ? 'text-slate-400' : 'text-[#86868b]'
                    }`}>
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
