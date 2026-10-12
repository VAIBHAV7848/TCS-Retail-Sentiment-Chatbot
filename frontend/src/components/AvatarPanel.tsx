import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AvatarDirective, SentimentData } from '../types';
import { Volume2, VolumeX, ShieldCheck, Sparkles } from 'lucide-react';
import { RealtimeAvatar, PortraitAvatar } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';

interface AvatarPanelProps {
  avatar?: AvatarDirective | null;
  sentiment?: SentimentData | null;
  loading?: boolean;
  latestReply?: string;
  theme?: 'light' | 'dark';
}

type AvatarDisplayMode = 'portrait' | 'adaptive_vector' | 'memoji';

export const AvatarPanel: React.FC<AvatarPanelProps> = ({
  avatar,
  sentiment,
  loading = false,
  latestReply = '',
  theme = 'light',
}) => {
  const [avatarMode, setAvatarMode] = useState<AvatarDisplayMode>('portrait');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // Web Audio Context & Analyser references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const directive: AvatarDirective = avatar || {
    expression: 'composed',
    intensity: 0.6,
    voice_tone: 'friendly_professional',
    speech_rate: 1.0,
    gesture: 'subtle_nod',
  };

  const expression = directive.expression || 'composed';

  // Initialize Web Audio Analyser
  const getOrCreateAnalyser = useCallback((): AnalyserNode | null => {
    if (analyserRef.current) return analyserRef.current;
    if (typeof window === 'undefined') return null;

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;

      const ctx = new AudioContextClass();
      const newAnalyser = ctx.createAnalyser();
      newAnalyser.fftSize = 64;
      newAnalyser.smoothingTimeConstant = 0.8;

      audioCtxRef.current = ctx;
      analyserRef.current = newAnalyser;
      setAnalyser(newAnalyser);
      return newAnalyser;
    } catch (e) {
      console.warn('Web Audio Context initialization deferred or unsupported:', e);
      return null;
    }
  }, []);

  // Ensure AudioContext is initialized on user interaction
  useEffect(() => {
    getOrCreateAnalyser();
  }, [getOrCreateAnalyser]);

  // Audio simulation pump: When speaking, drive PCM energy into AnalyserNode
  const startAudioSimulation = useCallback(() => {
    const node = getOrCreateAnalyser();
    const ctx = audioCtxRef.current;
    if (!node || !ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);

      lfo.frequency.setValueAtTime(4.5, ctx.currentTime);
      lfoGain.gain.setValueAtTime(25, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      osc.connect(gain);
      gain.connect(node);

      lfo.start();
      osc.start();
      oscillatorRef.current = osc;
      gainNodeRef.current = gain;

      const dataArray = new Uint8Array(node.frequencyBinCount);
      const updateLevel = () => {
        if (!node) return;
        node.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / (dataArray.length || 1);
        setAudioLevel(Math.min(100, Math.round((avg / 255) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      console.warn('Audio simulation error:', e);
    }
  }, [getOrCreateAnalyser]);

  const stopAudioSimulation = useCallback(() => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch {}
      oscillatorRef.current = null;
    }
    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect();
      } catch {}
      gainNodeRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      stopAudioSimulation();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopAudioSimulation]);

  useEffect(() => {
    if (!ttsEnabled || !latestReply || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(latestReply);
    utterance.rate = directive.speech_rate || 1.0;

    if (directive.voice_tone?.includes('calm') || directive.voice_tone?.includes('apologetic')) {
      utterance.pitch = 0.9;
    } else if (directive.voice_tone?.includes('friendly') || directive.voice_tone?.includes('warm')) {
      utterance.pitch = 1.1;
    } else {
      utterance.pitch = 1.0;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      startAudioSimulation();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      stopAudioSimulation();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      stopAudioSimulation();
    };

    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      stopAudioSimulation();
    };
  }, [latestReply, ttsEnabled, directive.speech_rate, directive.voice_tone, startAudioSimulation, stopAudioSimulation]);

  const getAiAvatarState = (): 'speaking' | 'thinking' | 'listening' | 'idle' => {
    if (loading) return 'thinking';
    if (isSpeaking) return 'speaking';
    return 'idle';
  };

  const aiAvatarState = getAiAvatarState();

  const getExpressionData = () => {
    switch (expression) {
      case 'warm_smile':
        return {
          mouthD: 'M 72 136 Q 100 162 128 136 Q 100 150 72 136 Z',
          mouthFill: '#f43f5e',
          leftEyebrow: 'M 64 76 Q 78 68 92 74',
          rightEyebrow: 'M 108 74 Q 122 68 136 76',
          leftEyeScaleY: 0.9,
          rightEyeScaleY: 0.9,
          blushOpacity: 0.55,
          headTilt: 'rotate(2deg)',
          accentColor: '#10b981',
          status: 'Friendly & Welcoming',
        };
      case 'attentive':
        return {
          mouthD: 'M 82 142 Q 100 146 118 142',
          mouthFill: 'none',
          leftEyebrow: 'M 64 74 Q 78 71 92 74',
          rightEyebrow: 'M 108 74 Q 122 71 136 74',
          leftEyeScaleY: 1.05,
          rightEyeScaleY: 1.05,
          blushOpacity: 0.1,
          headTilt: 'rotate(-2deg)',
          accentColor: '#0284c7',
          status: 'Attentive & Active',
        };
      case 'concerned':
        return {
          mouthD: 'M 78 148 Q 100 134 122 148',
          mouthFill: 'none',
          leftEyebrow: 'M 66 72 Q 78 79 92 82',
          rightEyebrow: 'M 108 82 Q 122 79 134 72',
          leftEyeScaleY: 0.85,
          rightEyeScaleY: 0.85,
          blushOpacity: 0.25,
          headTilt: 'rotate(1deg) translateY(2px)',
          accentColor: '#d97706',
          status: 'Empathetic & Concerned',
        };
      case 'serious':
        return {
          mouthD: 'M 80 143 L 120 143',
          mouthFill: 'none',
          leftEyebrow: 'M 65 79 L 93 81',
          rightEyebrow: 'M 107 81 L 135 79',
          leftEyeScaleY: 0.8,
          rightEyeScaleY: 0.8,
          blushOpacity: 0.0,
          headTilt: 'rotate(0deg)',
          accentColor: '#e11d48',
          status: 'Direct & De-escalating',
        };
      case 'gentle':
        return {
          mouthD: 'M 76 141 Q 100 152 124 141',
          mouthFill: 'none',
          leftEyebrow: 'M 66 75 Q 80 71 92 77',
          rightEyebrow: 'M 108 77 Q 120 71 134 75',
          leftEyeScaleY: 0.95,
          rightEyeScaleY: 0.95,
          blushOpacity: 0.4,
          headTilt: 'rotate(1deg)',
          accentColor: '#9333ea',
          status: 'Gentle & Patient',
        };
      case 'reassuring':
        return {
          mouthD: 'M 74 139 Q 100 156 126 139',
          mouthFill: '#f43f5e',
          leftEyebrow: 'M 64 74 Q 78 68 92 73',
          rightEyebrow: 'M 108 73 Q 122 68 136 74',
          leftEyeScaleY: 1.0,
          rightEyeScaleY: 1.0,
          blushOpacity: 0.35,
          headTilt: 'rotate(-1deg)',
          accentColor: '#0891b2',
          status: 'Supportive & Reassuring',
        };
      case 'composed':
      default:
        return {
          mouthD: 'M 80 142 Q 100 145 120 142',
          mouthFill: 'none',
          leftEyebrow: 'M 65 75 Q 79 72 92 75',
          rightEyebrow: 'M 108 75 Q 121 72 135 75',
          leftEyeScaleY: 1.0,
          rightEyeScaleY: 1.0,
          blushOpacity: 0.15,
          headTilt: 'rotate(0deg)',
          accentColor: '#64748b',
          status: 'Calm & Professional',
        };
    }
  };

  const expData = getExpressionData();
  const isDark = theme === 'dark';

  return (
    <div className={`flex flex-col h-full rounded-2xl border p-4 overflow-hidden transition-colors relative ${
      isDark
        ? 'bg-[#0d0f14] border-white/8 shadow-xl text-white'
        : 'bg-white border-black/8 shadow-sm text-[#1d1d1f]'
    }`}>
      {/* Header with Segmented Avatar Selector */}
      <div className={`flex items-center justify-between pb-3 border-b flex-shrink-0 ${
        isDark ? 'border-white/6' : 'border-black/6'
      }`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
            isDark ? 'text-slate-300' : 'text-[#1d1d1f]'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
            AI Avatar Engine
          </h2>
        </div>

        {/* 3-Way Segmented Control */}
        <div className={`flex items-center p-0.5 rounded-xl border text-[11px] shadow-xs ${
          isDark
            ? 'bg-[#161a22] border-white/6 text-slate-400'
            : 'bg-[#e5e5ea] border-black/6 text-[#86868b]'
        }`}>
          <button
            onClick={() => setAvatarMode('portrait')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              avatarMode === 'portrait'
                ? isDark
                  ? 'bg-white/12 text-white shadow-sm'
                  : 'bg-white text-[#1d1d1f] shadow-xs'
                : isDark
                ? 'hover:text-slate-200'
                : 'hover:text-[#1d1d1f]'
            }`}
            title="Interactive animated PortraitAvatar with WebAudio Analyser & dynamic poses"
          >
            Portrait
          </button>
          <button
            onClick={() => setAvatarMode('adaptive_vector')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              avatarMode === 'adaptive_vector'
                ? isDark
                  ? 'bg-white/12 text-white shadow-sm'
                  : 'bg-white text-[#1d1d1f] shadow-xs'
                : isDark
                ? 'hover:text-slate-200'
                : 'hover:text-[#1d1d1f]'
            }`}
            title="Morphing vector avatar reacting to 7 sentiment states"
          >
            Adaptive Vector
          </button>
          <button
            onClick={() => setAvatarMode('memoji')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              avatarMode === 'memoji'
                ? isDark
                  ? 'bg-white/12 text-white shadow-sm'
                  : 'bg-white text-[#1d1d1f] shadow-xs'
                : isDark
                ? 'hover:text-slate-200'
                : 'hover:text-[#1d1d1f]'
            }`}
            title="Realtime Memoji 3D face preset"
          >
            Memoji
          </button>
        </div>
      </div>

      {/* Main Avatar Canvas Area - Prominently Displayed & Centered */}
      <div className="flex flex-col items-center justify-center py-2 relative flex-shrink-0">
        {avatarMode === 'portrait' ? (
          /* Mode 1: Top-Notch PortraitAvatar inside RealtimeAvatar with BYOS variant + AnalyserNode */
          <div className="flex flex-col items-center justify-center w-full relative">
            {/* Ambient Backlight Glow */}
            <div
              className={`absolute w-48 h-48 rounded-full blur-2xl pointer-events-none transition-all duration-700 ${
                isDark
                  ? isSpeaking
                    ? 'bg-indigo-500/30 scale-110'
                    : loading
                    ? 'bg-amber-500/25 scale-100'
                    : 'bg-blue-600/25'
                  : isSpeaking
                  ? 'bg-blue-400/25 scale-110'
                  : loading
                  ? 'bg-amber-300/30 scale-100'
                  : 'bg-slate-200/60'
              }`}
            />

            <div className="w-48 h-48 flex items-center justify-center relative">
              <RealtimeAvatar
                state={aiAvatarState}
                analyser={analyser}
                variant="byos"
                size={185}
                thought={loading ? 'Synthesizing empathetic resolution...' : undefined}
                thinkingEmojis={loading ? ['🤔', '🔍', '💡', '✨'] : undefined}
                thinkingEmojiInterval={800}
                showGlow={false}
                showStatePill={false}
              >
                <PortraitAvatar state={aiAvatarState} poses={true} />
              </RealtimeAvatar>
            </div>
          </div>
        ) : avatarMode === 'adaptive_vector' ? (
          /* Mode 2: Morphing Vector Avatar with 7 Emotional Target States */
          <div className="relative flex flex-col items-center justify-center">
            {/* Dynamic Emotion Backlight Ring */}
            <div
              className="absolute w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-20"
              style={{ backgroundColor: expData.accentColor }}
            />

            <div
              className="w-48 h-48 relative transition-transform duration-500 ease-out flex items-center justify-center"
              style={{ transform: expData.headTilt }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-sm">
                <defs>
                  <linearGradient id="faceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fee2e2" />
                    <stop offset="100%" stopColor="#fecdd3" />
                  </linearGradient>
                  <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                </defs>

                {/* Head base */}
                <circle cx="100" cy="100" r="76" fill={isDark ? '#0b0e14' : '#e2e8f0'} opacity="0.3" />
                <circle cx="100" cy="100" r="72" fill="url(#faceGrad)" stroke="#fda4af" strokeWidth="1.5" />

                {/* Cheeks */}
                <ellipse cx="58" cy="124" rx="11" ry="7" fill="#fb7185" opacity={expData.blushOpacity} />
                <ellipse cx="142" cy="124" rx="11" ry="7" fill="#fb7185" opacity={expData.blushOpacity} />

                {/* Eyebrows */}
                <path
                  d={expData.leftEyebrow}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
                <path
                  d={expData.rightEyebrow}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />

                {/* Eyes */}
                <g
                  style={{
                    transform: `scaleY(${expData.leftEyeScaleY})`,
                    transformOrigin: '78px 98px',
                    transition: 'transform 0.4s ease',
                  }}
                >
                  <ellipse cx="78" cy="98" rx="8" ry="11" fill="url(#eyeGrad)" />
                  <circle cx="81" cy="94" r="3.2" fill="#ffffff" />
                  <circle cx="76" cy="102" r="1.5" fill="#ffffff" opacity="0.7" />
                </g>

                <g
                  style={{
                    transform: `scaleY(${expData.rightEyeScaleY})`,
                    transformOrigin: '122px 98px',
                    transition: 'transform 0.4s ease',
                  }}
                >
                  <ellipse cx="122" cy="98" rx="8" ry="11" fill="url(#eyeGrad)" />
                  <circle cx="125" cy="94" r="3.2" fill="#ffffff" />
                  <circle cx="120" cy="102" r="1.5" fill="#ffffff" opacity="0.7" />
                </g>

                {/* Nose & Mouth */}
                <path d="M 98 114 Q 100 119 103 118" fill="none" stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
                <path
                  d={expData.mouthD}
                  fill={expData.mouthFill}
                  stroke="#334155"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-500"
                />
              </svg>
            </div>

            <div className={`mt-2.5 flex items-center gap-2 px-3 py-1 rounded-full border shadow-xs ${
              isDark
                ? 'bg-white/4 border-white/8 text-slate-200'
                : 'bg-[#f5f5f7] border-black/6 text-[#1d1d1f]'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: expData.accentColor }} />
              <span className="text-xs font-medium">{expData.status}</span>
            </div>
          </div>
        ) : (
          /* Mode 3: Memoji Preset */
          <div className="flex flex-col items-center justify-center w-full">
            <div className="w-52 h-52 flex items-center justify-center">
              <RealtimeAvatar
                state={aiAvatarState}
                analyser={analyser}
                size={195}
                variant="memoji"
                thought={loading ? 'Analyzing sentiment & policy guardrails...' : undefined}
                thinkingEmojis={loading ? true : undefined}
              />
            </div>

            <div className={`mt-2.5 flex items-center gap-2 px-3 py-1 rounded-full border shadow-xs ${
              isDark
                ? 'bg-white/4 border-white/8 text-slate-200'
                : 'bg-[#f5f5f7] border-black/6 text-[#1d1d1f]'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-xs font-medium">Memoji Reactive 3D</span>
            </div>
          </div>
        )}
      </div>

      {/* Audio Wave & WebAudio Analyser Control Strip */}
      <div className={`mt-2.5 pt-2.5 border-t flex items-center justify-between text-xs flex-shrink-0 transition-colors ${
        isDark ? 'border-white/6 text-slate-300' : 'border-black/6 text-[#48484a]'
      }`}>
        <button
          onClick={() => {
            getOrCreateAnalyser();
            setTtsEnabled(!ttsEnabled);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
            ttsEnabled
              ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-xs'
              : isDark
              ? 'bg-white/4 text-slate-400 border border-white/6 hover:text-slate-200'
              : 'bg-[#f5f5f7] text-[#86868b] border border-black/6 hover:text-[#1d1d1f]'
          }`}
          title="Toggle text-to-speech audio voice output"
        >
          {ttsEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-600" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{ttsEnabled ? 'Voice Active' : 'Voice Muted'}</span>
        </button>

        {/* Real-time Spectrum Waveform Indicator */}
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-xs ${
          isDark ? 'bg-white/4 border-white/8 text-slate-300' : 'bg-[#f5f5f7] border-black/6 text-[#48484a]'
        }`}>
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                isSpeaking
                  ? 'bg-emerald-500 animate-pulse'
                  : loading
                  ? 'bg-amber-500'
                  : 'bg-indigo-400 opacity-60'
              }`}
              style={{
                height: isSpeaking
                  ? `${Math.max(4, Math.sin(i * 0.9 + (audioLevel || 20)) * 10 + 4)}px`
                  : loading
                  ? `${(i % 3 + 1) * 3}px`
                  : `${(i % 2 + 1) * 2.5}px`,
              }}
            />
          ))}
          <span className="text-[10px] font-mono ml-1 font-medium">
            {isSpeaking
              ? (audioLevel > 0 ? `${audioLevel}% PCM` : 'Lip-Sync')
              : loading
              ? 'Reasoning'
              : 'Listening'}
          </span>
        </div>

        <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-[#86868b]'}`}>
          Tempo: {directive.speech_rate || 1.0}x
        </span>
      </div>

      {/* Telemetry & Emotion Analysis HUD */}
      <div className={`mt-2 p-2.5 rounded-xl border flex-shrink-0 transition-colors ${
        isDark ? 'bg-[#121620] border-white/6' : 'bg-[#fbfbfd] border-black/6 shadow-xs'
      }`}>
        <div className="grid grid-cols-2 gap-2 pb-2 mb-2 border-b border-black/5 dark:border-white/5">
          <div>
            <span className={`text-[9px] uppercase tracking-wider block font-medium ${
              isDark ? 'text-slate-400' : 'text-[#86868b]'
            }`}>
              Tone Profile
            </span>
            <span className={`text-[11px] font-semibold capitalize truncate block ${
              isDark ? 'text-slate-200' : 'text-[#1d1d1f]'
            }`}>
              {directive.voice_tone ? directive.voice_tone.replace(/_/g, ' ') : 'Neutral Professional'}
            </span>
          </div>
          <div>
            <span className={`text-[9px] uppercase tracking-wider block font-medium ${
              isDark ? 'text-slate-400' : 'text-[#86868b]'
            }`}>
              Emotion Signal
            </span>
            <span className={`text-[11px] font-semibold capitalize truncate block ${
              isDark ? 'text-slate-200' : 'text-[#1d1d1f]'
            }`}>
              {sentiment?.emotion || 'Attentive'} ({sentiment ? Math.round(sentiment.confidence * 100) : 95}%)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-1 text-[9px] font-mono font-medium uppercase">
          <span className="opacity-70">RoBERTa Polarity Distribution</span>
          <span className={`text-[10px] font-bold ${
            sentiment?.polarity === 'positive'
              ? 'text-emerald-500'
              : sentiment?.polarity === 'negative'
              ? 'text-rose-500'
              : 'text-amber-500'
          }`}>
            {sentiment?.polarity ? sentiment.polarity.toUpperCase() : 'NEUTRAL (90%)'}
          </span>
        </div>

        {/* 3-Color Horizontal Progress Bar */}
        <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-black/10 dark:bg-white/10 mb-1.5">
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${Math.round((sentiment?.polarity_scores?.positive || 0.1) * 100)}%` }}
            title={`Positive: ${Math.round((sentiment?.polarity_scores?.positive || 0.1) * 100)}%`}
          />
          <div
            className="bg-amber-400 transition-all duration-500"
            style={{ width: `${Math.round((sentiment?.polarity_scores?.neutral || 0.8) * 100)}%` }}
            title={`Neutral: ${Math.round((sentiment?.polarity_scores?.neutral || 0.8) * 100)}%`}
          />
          <div
            className="bg-rose-500 transition-all duration-500"
            style={{ width: `${Math.round((sentiment?.polarity_scores?.negative || 0.1) * 100)}%` }}
            title={`Negative: ${Math.round((sentiment?.polarity_scores?.negative || 0.1) * 100)}%`}
          />
        </div>

        {/* Polarity legend */}
        <div className="flex items-center justify-between text-[9px] font-mono opacity-75">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Pos {Math.round((sentiment?.polarity_scores?.positive || 0.1) * 100)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Neu {Math.round((sentiment?.polarity_scores?.neutral || 0.8) * 100)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Neg {Math.round((sentiment?.polarity_scores?.negative || 0.1) * 100)}%
          </span>
        </div>
      </div>

      {/* Safety Policy Guard */}
      <div className={`mt-2 flex items-center gap-1.5 text-[10px] flex-shrink-0 ${
        isDark ? 'text-slate-400' : 'text-[#86868b]'
      }`}>
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
        <span className="truncate">Affect Guard: Empathy-gated during customer escalation</span>
      </div>
    </div>
  );
};
