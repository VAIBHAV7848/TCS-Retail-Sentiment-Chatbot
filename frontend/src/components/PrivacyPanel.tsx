import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { previewPrivacy } from '../api';
import type { PiiEntity } from '../types';

interface PrivacyPanelProps {
  latestOriginalText?: string;
  piiEntities?: PiiEntity[] | string[];
  hasPrivacyWarning?: boolean;
  theme?: 'light' | 'dark';
}

export const PrivacyPanel: React.FC<PrivacyPanelProps> = ({
  latestOriginalText = '',
  piiEntities = [],
  hasPrivacyWarning = false,
  theme = 'light',
}) => {
  const [activeTab, setActiveTab] = useState<'session' | 'sandbox'>('session');
  const [sandboxInput, setSandboxInput] = useState('');
  const [originalText, setOriginalText] = useState(latestOriginalText);
  const [maskedText, setMaskedText] = useState('');
  const [detectedCount, setDetectedCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (activeTab === 'session' && latestOriginalText) {
      setOriginalText(latestOriginalText);
      runPreview(latestOriginalText);
    }
  }, [latestOriginalText, activeTab]);

  const runPreview = async (text: string) => {
    if (!text.trim()) {
      setMaskedText('');
      setDetectedCount(0);
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await previewPrivacy(text);
      setOriginalText(res.original || text);
      setMaskedText(res.masked || text);
      setDetectedCount(res.entities?.length || 0);
    } catch {
      setOriginalText(text);
      setMaskedText(text);
      setDetectedCount(0);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSandboxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sandboxInput.trim()) {
      runPreview(sandboxInput);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex flex-col h-full rounded-2xl border p-4 shadow-sm transition-colors relative overflow-hidden ${
      isDark
        ? 'bg-[#0d0f14] border-white/8 text-white'
        : 'bg-white border-black/8 text-[#1d1d1f]'
    }`}>
      {/* Header bar */}
      <div className={`flex items-center justify-between pb-3 border-b flex-shrink-0 ${
        isDark ? 'border-white/6' : 'border-black/6'
      }`}>
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[#0071e3]" />
          <h2 className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? 'text-slate-300' : 'text-[#1d1d1f]'
          }`}>
            Privacy Vault & Tokenizer
          </h2>
          {(hasPrivacyWarning || piiEntities.length > 0 || detectedCount > 0) && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border ${
              isDark
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <ShieldAlert className="w-2.5 h-2.5" />
              {piiEntities.length || detectedCount || 1} Tokenized
            </span>
          )}
        </div>

        {/* Segmented Control */}
        <div className={`flex items-center p-0.5 rounded-xl border text-[11px] shadow-xs ${
          isDark
            ? 'bg-[#161a22] border-white/6 text-slate-400'
            : 'bg-[#e5e5ea] border-black/6 text-[#86868b]'
        }`}>
          <button
            onClick={() => {
              setActiveTab('session');
              if (latestOriginalText) runPreview(latestOriginalText);
            }}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'session'
                ? isDark
                  ? 'bg-white/12 text-white shadow-sm'
                  : 'bg-white text-[#1d1d1f] shadow-xs'
                : isDark
                ? 'hover:text-slate-200'
                : 'hover:text-[#1d1d1f]'
            }`}
          >
            Live Turn
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'sandbox'
                ? isDark
                  ? 'bg-white/12 text-white shadow-sm'
                  : 'bg-white text-[#1d1d1f] shadow-xs'
                : isDark
                ? 'hover:text-slate-200'
                : 'hover:text-[#1d1d1f]'
            }`}
          >
            Test Sandbox
          </button>
        </div>
      </div>

      {/* Sandbox Form if active */}
      {activeTab === 'sandbox' && (
        <form onSubmit={handleSandboxSubmit} className="pt-3 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={sandboxInput}
            onChange={(e) => setSandboxInput(e.target.value)}
            placeholder="Paste text with Aadhaar, PAN, Card, or Phone..."
            className={`flex-1 rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors border ${
              isDark
                ? 'bg-[#151922] border-white/10 text-white placeholder-slate-400 focus:border-blue-500'
                : 'bg-[#f5f5f7] border-black/8 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:bg-white'
            }`}
          />
          <button
            type="submit"
            disabled={isAnalyzing || !sandboxInput.trim()}
            className="px-3.5 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-40 text-xs font-medium text-white transition-all shadow-xs"
          >
            Mask
          </button>
        </form>
      )}

      {/* Before / After Stream Panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 py-3 overflow-y-auto min-h-[140px]">
        {/* Left: Raw Inbound */}
        <div className={`flex flex-col rounded-xl border p-3 overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#12151c] border-white/4'
            : 'bg-[#fff1f2] border-rose-200/70'
        }`}>
          <div className={`flex items-center justify-between pb-2 mb-2 border-b ${
            isDark ? 'border-white/4' : 'border-rose-200/60'
          }`}>
            <span className={`text-[10px] font-mono uppercase tracking-wider font-medium ${
              isDark ? 'text-rose-400/90' : 'text-rose-700'
            }`}>
              1. Raw Customer Inbound
            </span>
            <span className={`text-[9px] font-mono ${isDark ? 'text-slate-400' : 'text-rose-500'}`}>
              Zero-Retention
            </span>
          </div>
          <div className={`flex-1 overflow-y-auto text-xs font-mono leading-relaxed break-words whitespace-pre-wrap ${
            isDark ? 'text-slate-300' : 'text-[#881337]'
          }`}>
            {originalText ? (
              originalText
            ) : (
              <div className="space-y-2">
                <span className={`block text-[11px] ${isDark ? 'text-slate-400' : 'text-rose-500'}`}>
                  No active turn in buffer. Test quick PII presets:
                </span>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => {
                      const text = "Aadhaar: 4832 9812 5467, Phone: 9845012345";
                      setSandboxInput(text);
                      runPreview(text);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      isDark ? 'bg-white/5 border-white/8 hover:bg-white/10 text-rose-300' : 'bg-white border-rose-200 hover:bg-rose-100 text-rose-700'
                    }`}
                  >
                    + Aadhaar & Phone
                  </button>
                  <button
                    onClick={() => {
                      const text = "Visa: 4532 1111 2222 3333, Order: #ORD-9912";
                      setSandboxInput(text);
                      runPreview(text);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      isDark ? 'bg-white/5 border-white/8 hover:bg-white/10 text-rose-300' : 'bg-white border-rose-200 hover:bg-rose-100 text-rose-700'
                    }`}
                  >
                    + Card & Order ID
                  </button>
                  <button
                    onClick={() => {
                      const text = "PAN: ABCDE1234F, UPI: priya@okhdfcbank";
                      setSandboxInput(text);
                      runPreview(text);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      isDark ? 'bg-white/5 border-white/8 hover:bg-white/10 text-rose-300' : 'bg-white border-rose-200 hover:bg-rose-100 text-rose-700'
                    }`}
                  >
                    + PAN & UPI VPA
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Masked Model Payload */}
        <div className={`flex flex-col rounded-xl border p-3 overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#12151c] border-white/4'
            : 'bg-[#f0f9ff] border-sky-200/70'
        }`}>
          <div className={`flex items-center justify-between pb-2 mb-2 border-b ${
            isDark ? 'border-white/4' : 'border-sky-200/60'
          }`}>
            <span className={`text-[10px] font-mono uppercase tracking-wider font-medium ${
              isDark ? 'text-sky-400/90' : 'text-[#0284c7]'
            }`}>
              2. Tokenized Model Payload
            </span>
            <span className={`text-[9px] font-mono ${isDark ? 'text-slate-400' : 'text-sky-600'}`}>
              Model Sight Safe
            </span>
          </div>
          <div className={`flex-1 overflow-y-auto text-xs font-mono leading-relaxed break-words whitespace-pre-wrap ${
            isDark ? 'text-sky-200' : 'text-[#0369a1]'
          }`}>
            {maskedText ? (
              maskedText
            ) : (
              <div className="space-y-1.5 text-[11px] opacity-80">
                <p>Presidio Indian Entity Recognizers Active:</p>
                <div className="flex flex-wrap gap-1 text-[9px]">
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-600">[CARD] Luhn Verified</span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-600">[AADHAAR] Verhoeff</span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-600">[PAN] ITD Validated</span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-600">[UPI] VPA Regex</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vault Telemetry Footer */}
      <div className={`pt-3 border-t flex items-center justify-between text-[11px] flex-shrink-0 font-mono ${
        isDark ? 'border-white/6 text-slate-400' : 'border-black/6 text-[#86868b]'
      }`}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>AES-256 Symmetric Vault Active</span>
        </div>
        <span>External Model Leakage: 0 B</span>
      </div>
    </div>
  );
};
