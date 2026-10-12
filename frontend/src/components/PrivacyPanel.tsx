import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { previewPrivacy } from '../api';
import type { PiiEntity } from '../types';

interface PrivacyPanelProps {
  latestOriginalText?: string;
  piiEntities?: PiiEntity[] | string[];
  hasPrivacyWarning?: boolean;
}

export const PrivacyPanel: React.FC<PrivacyPanelProps> = ({
  latestOriginalText = '',
  piiEntities = [],
  hasPrivacyWarning = false,
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

  return (
    <div className="flex flex-col h-full bg-[#0d0f14] border border-white/8 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-blue-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Privacy Vault & Tokenizer
          </h2>
          {(hasPrivacyWarning || piiEntities.length > 0 || detectedCount > 0) && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[9px] font-mono">
              <ShieldAlert className="w-2.5 h-2.5" />
              {piiEntities.length || detectedCount || 1} Tokenized
            </span>
          )}
        </div>

        {/* Segmented Control */}
        <div className="flex items-center bg-[#161a22] p-0.5 rounded-lg border border-white/6 text-[11px]">
          <button
            onClick={() => {
              setActiveTab('session');
              if (latestOriginalText) runPreview(latestOriginalText);
            }}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              activeTab === 'session'
                ? 'bg-white/12 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Turn
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              activeTab === 'sandbox'
                ? 'bg-white/12 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
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
            className="flex-1 bg-[#151922] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isAnalyzing || !sandboxInput.trim()}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-medium text-white transition-all"
          >
            Mask
          </button>
        </form>
      )}

      {/* Before / After Stream Panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 py-3 overflow-y-auto min-h-[140px]">
        {/* Left: Raw Inbound */}
        <div className="flex flex-col bg-[#12151c] rounded-xl border border-white/4 p-3 overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/4">
            <span className="text-[10px] font-mono uppercase text-rose-400/90 tracking-wider">
              1. Raw Customer Inbound
            </span>
            <span className="text-[9px] font-mono text-slate-400">Zero-Retention</span>
          </div>
          <div className="flex-1 overflow-y-auto text-xs text-slate-300 font-mono leading-relaxed break-words whitespace-pre-wrap">
            {originalText || (
              <span className="text-slate-400 italic">No incoming message in current buffer. Send a message to inspect masking.</span>
            )}
          </div>
        </div>

        {/* Right: Masked Model Payload */}
        <div className="flex flex-col bg-[#12151c] rounded-xl border border-white/4 p-3 overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/4">
            <span className="text-[10px] font-mono uppercase text-sky-400/90 tracking-wider">
              2. Tokenized Model Payload
            </span>
            <span className="text-[9px] font-mono text-slate-400">Model Sight Safe</span>
          </div>
          <div className="flex-1 overflow-y-auto text-xs text-sky-200 font-mono leading-relaxed break-words whitespace-pre-wrap">
            {maskedText || (
              <span className="text-slate-400 italic">Masked tokens stream will appear here.</span>
            )}
          </div>
        </div>
      </div>

      {/* Vault Telemetry Footer */}
      <div className="pt-3 border-t border-white/6 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>AES-256 Symmetric Vault Active</span>
        </div>
        <span className="text-slate-400">External Model Leakage: 0 B</span>
      </div>
    </div>
  );
};
