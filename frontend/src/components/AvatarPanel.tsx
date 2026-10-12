import React, { useState, useEffect } from 'react';
import type { AvatarDirective, SentimentData } from '../types';
import { Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { RealtimeAvatar } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';

interface AvatarPanelProps {
  avatar?: AvatarDirective | null;
  sentiment?: SentimentData | null;
  loading?: boolean;
  latestReply?: string;
}

export const AvatarPanel: React.FC<AvatarPanelProps> = ({
  avatar,
  sentiment,
  loading = false,
  latestReply = '',
}) => {
  const [avatarMode, setAvatarMode] = useState<'emotion_morph' | 'realtime_ai'>('emotion_morph');
  const [realtimeVariant, setRealtimeVariant] = useState<'memoji' | 'geometric' | 'doodle'>('memoji');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const directive: AvatarDirective = avatar || {
    expression: 'composed',
    intensity: 0.6,
    voice_tone: 'friendly_professional',
    speech_rate: 1.0,
    gesture: 'subtle_nod',
  };

  const expression = directive.expression || 'composed';

  // Handle SpeechSynthesis when new reply arrives and TTS is enabled
  useEffect(() => {
    if (!ttsEnabled || !latestReply || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(latestReply);
    utterance.rate = directive.speech_rate || 1.0;

    // Adjust pitch based on tone directive
    if (directive.voice_tone?.includes('calm') || directive.voice_tone?.includes('apologetic')) {
      utterance.pitch = 0.9;
    } else if (directive.voice_tone?.includes('friendly') || directive.voice_tone?.includes('warm')) {
      utterance.pitch = 1.1;
    } else {
      utterance.pitch = 1.0;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    };
  }, [latestReply, ttsEnabled, directive.speech_rate, directive.voice_tone]);

  // Expression visual profile parameters for the custom SVG morph
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
          accentColor: '#38bdf8',
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
          accentColor: '#f59e0b',
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
          accentColor: '#f43f5e',
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
          accentColor: '#a855f7',
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
          accentColor: '#06b6d4',
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
          accentColor: '#94a3b8',
          status: 'Calm & Professional',
        };
    }
  };

  const expData = getExpressionData();

  // Derive realtime-avatar state from pipeline state
  const getAiAvatarState = (): 'speaking' | 'thinking' | 'listening' | 'idle' => {
    if (loading) return 'thinking';
    if (isSpeaking) return 'speaking';
    return 'idle';
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0f14] border border-white/8 rounded-2xl p-5 overflow-hidden shadow-xl relative">
      {/* Header with Mode Switcher Pill */}
      <div className="flex items-center justify-between pb-4 border-b border-white/6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Sentiment-Adaptive Avatar
          </h2>
        </div>

        {/* Apple-style Segmented Control */}
        <div className="flex items-center bg-[#161a22] p-0.5 rounded-lg border border-white/6 text-[11px]">
          <button
            onClick={() => setAvatarMode('emotion_morph')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              avatarMode === 'emotion_morph'
                ? 'bg-white/12 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Adaptive Vector
          </button>
          <button
            onClick={() => setAvatarMode('realtime_ai')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              avatarMode === 'realtime_ai'
                ? 'bg-white/12 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Realtime AI Face
          </button>
        </div>
      </div>

      {/* Main Avatar Canvas Area */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
        {avatarMode === 'emotion_morph' ? (
          /* Mode A: Morphing Vector Avatar with 7 Emotional Target States */
          <div className="relative flex flex-col items-center justify-center">
            {/* Subtle backlight ring matched to sentiment accent */}
            <div
              className="absolute w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
              style={{ backgroundColor: expData.accentColor }}
            />

            <div
              className="w-48 h-48 relative transition-transform duration-500 ease-out flex items-center justify-center"
              style={{ transform: expData.headTilt }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md">
                <defs>
                  {/* Subtle depth gradients */}
                  <linearGradient id="faceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fee2e2" />
                    <stop offset="100%" stopColor="#fecdd3" />
                  </linearGradient>
                  <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                </defs>

                {/* Outer head shadow */}
                <circle cx="100" cy="100" r="76" fill="#0b0e14" opacity="0.4" />

                {/* Head base */}
                <circle cx="100" cy="100" r="72" fill="url(#faceGrad)" stroke="#fda4af" strokeWidth="1.5" />

                {/* Blushing cheeks (intensity scales with joy/gentle) */}
                <ellipse
                  cx="58"
                  cy="124"
                  rx="11"
                  ry="7"
                  fill="#fb7185"
                  opacity={expData.blushOpacity}
                  className="transition-opacity duration-500"
                />
                <ellipse
                  cx="142"
                  cy="124"
                  rx="11"
                  ry="7"
                  fill="#fb7185"
                  opacity={expData.blushOpacity}
                  className="transition-opacity duration-500"
                />

                {/* Eyebrows with spring morph path */}
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

                {/* Small nose */}
                <path d="M 98 114 Q 100 119 103 118" fill="none" stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />

                {/* Morphing mouth */}
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

            {/* Expression Pill Badge */}
            <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-white/4 border border-white/8 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: expData.accentColor }} />
              <span className="text-xs font-medium text-slate-200">{expData.status}</span>
            </div>
          </div>
        ) : (
          /* Mode B: Realtime AI Avatar from react-ai-avatar package */
          <div className="flex flex-col items-center justify-center w-full">
            <div className="h-48 flex items-center justify-center">
              <RealtimeAvatar
                state={getAiAvatarState()}
                size={190}
                variant={realtimeVariant}
                thought={loading ? 'Analyzing customer emotion & privacy...' : undefined}
              />
            </div>

            {/* Realtime Variant Switcher */}
            <div className="mt-3 flex items-center gap-1.5 bg-[#161a22] p-1 rounded-lg border border-white/6 text-[10px]">
              {(['memoji', 'geometric', 'doodle'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setRealtimeVariant(v)}
                  className={`px-2 py-0.5 rounded font-medium capitalize transition-all ${
                    realtimeVariant === v ? 'bg-white/12 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Audio Wave & Speech Synthesizer Bar */}
      <div className="pt-3 border-t border-white/6 flex items-center justify-between text-xs text-slate-300 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              ttsEnabled
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/4 text-slate-400 border border-white/6 hover:text-slate-200'
            }`}
            title="Toggle text-to-speech audio for bot responses"
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{ttsEnabled ? 'Voice Active' : 'Voice Muted'}</span>
          </button>

          {/* Animated audio wave when active */}
          {(isSpeaking || loading) && (
            <div className="flex items-center gap-0.5 h-3 px-1">
              <span className="w-0.5 h-2 bg-blue-400 rounded-full animate-bounce" />
              <span className="w-0.5 h-3 bg-blue-400 rounded-full animate-bounce [animation-delay:0.15s]" />
              <span className="w-0.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.3s]" />
              <span className="w-0.5 h-3 bg-blue-400 rounded-full animate-bounce [animation-delay:0.45s]" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <span>Tempo: {directive.speech_rate || 1.0}x</span>
        </div>
      </div>

      {/* Telemetry Readout Grid */}
      <div className="mt-3 pt-3 border-t border-white/6 grid grid-cols-2 gap-2 text-[11px] text-slate-400 flex-shrink-0">
        <div className="bg-[#12151c] px-2.5 py-1.5 rounded-lg border border-white/4">
          <span className="text-[10px] uppercase text-slate-400 tracking-wider block font-medium">Tone Profile</span>
          <span className="text-slate-200 font-medium capitalize truncate block">
            {directive.voice_tone ? directive.voice_tone.replace(/_/g, ' ') : 'Neutral Professional'}
          </span>
        </div>

        <div className="bg-[#12151c] px-2.5 py-1.5 rounded-lg border border-white/4">
          <span className="text-[10px] uppercase text-slate-400 tracking-wider block font-medium">Emotion Signal</span>
          <span className="text-slate-200 font-medium capitalize truncate block">
            {sentiment?.emotion || 'Attentive'} ({sentiment ? Math.round(sentiment.confidence * 100) : 95}%)
          </span>
        </div>
      </div>

      {/* Safety Policy Label */}
      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400 flex-shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80 flex-shrink-0" />
        <span className="truncate">Affect Guard: Cheerful affect restricted during escalation</span>
      </div>
    </div>
  );
};
