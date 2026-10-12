import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  MessageItem,
  SentimentData,
  AvatarDirective,
  EscalationDecision,
  PiiEntity,
} from '../types';
import {
  sendMessage as apiSendMessage,
  requestHumanHandoff,
  sendHumanMessage,
  getSessionMessages,
} from '../api';

const BUS_CHANNEL_NAME = 'retailsense_chat_bus';

export function useChat() {
  const [messages, setMessages] = useState<MessageItem[]>([]);

  // Initialize and persist session across tabs
  const [sessionId, setSessionId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('retailsense_active_session');
      if (stored) return stored;
      const created = `sess-${Date.now()}`;
      localStorage.setItem('retailsense_active_session', created);
      return created;
    } catch {
      return `sess-${Date.now()}`;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Human Representative Live Mode
  const [isHumanActive, setIsHumanActive] = useState<boolean>(false);
  const [humanAgentName, setHumanAgentName] = useState<string>('Sarah Jenkins');

  const [currentSentiment, setCurrentSentiment] = useState<SentimentData | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<AvatarDirective>({
    expression: 'composed',
    intensity: 0.5,
    voice_tone: 'friendly_professional',
    speech_rate: 1.0,
    gesture: 'welcome',
  });
  const [currentEscalation, setCurrentEscalation] = useState<EscalationDecision | null>(null);
  const [latestPiiEntities, setLatestPiiEntities] = useState<PiiEntity[] | string[]>([]);
  const [hasPrivacyWarning, setHasPrivacyWarning] = useState<boolean>(false);

  // Store in memory without saving raw text to localStorage (Critical Rule 2)
  const messageCounter = useRef(0);

  // Sync session ID to localStorage whenever it changes
  useEffect(() => {
    if (sessionId) {
      try {
        localStorage.setItem('retailsense_active_session', sessionId);
      } catch {}
    }
  }, [sessionId]);

  // Seamless Handoff to Real Human Specialist
  const connectHumanHandoff = useCallback(
    async (reason?: string) => {
      setLoading(true);
      setError(null);
      const cleanReason =
        typeof reason === 'string' && reason.length > 0 ? reason : undefined;
      const activeSession = sessionId || `sess-${Date.now()}`;
      setSessionId(activeSession);

      try {
        const handoff = await requestHumanHandoff(activeSession, cleanReason);
        setIsHumanActive(true);
        setHumanAgentName(handoff.agent_name || 'Sarah Jenkins');

        // Seamless system message inside the exact same chat
        messageCounter.current += 1;
        const handoffMessage: MessageItem = {
          id: `handoff-${Date.now()}-${messageCounter.current}`,
          sender: 'bot',
          text: handoff.handoff_message,
          timestamp: new Date().toISOString(),
          isHuman: true,
          agentName: handoff.agent_name,
        };

        setMessages((prev) => [...prev, handoffMessage]);

        // Adapt avatar to attentive listening posture
        setCurrentAvatar({
          expression: 'attentive',
          intensity: 0.8,
          voice_tone: 'empathetic_human',
          speech_rate: 1.0,
          gesture: 'listening',
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unable to connect to representative';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  // Switch back to AI mode anytime
  const returnToAiMode = useCallback(() => {
    setIsHumanActive(false);
    messageCounter.current += 1;
    const aiResumeMessage: MessageItem = {
      id: `ai-resume-${Date.now()}-${messageCounter.current}`,
      sender: 'bot',
      text: "You are now back with the RetailSense AI Copilot. How else can I help you?",
      timestamp: new Date().toISOString(),
      isHuman: false,
    };
    setMessages((prev) => [...prev, aiResumeMessage]);
    setCurrentAvatar({
      expression: 'composed',
      intensity: 0.5,
      voice_tone: 'friendly_professional',
      speech_rate: 1.0,
      gesture: 'welcome',
    });
  }, []);

  // LAYER 1: Native Real-time Cross-Tab Broadcast Channel (0ms Latency)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let bus: BroadcastChannel | null = null;
    try {
      bus = new BroadcastChannel(BUS_CHANNEL_NAME);
      bus.onmessage = (event) => {
        const data = event.data;
        if (data?.type === 'AGENT_REPLY') {
          // If message is for this session or matches current active session
          if (!sessionId || data.sessionId === sessionId) {
            setMessages((prev) => {
              // Avoid duplicate text
              const exists = prev.some(
                (m) => m.text.trim() === data.text.trim() && m.isHuman
              );
              if (exists) return prev;

              messageCounter.current += 1;
              const newAgentMsg: MessageItem = {
                id: `agent-realtime-${Date.now()}-${messageCounter.current}`,
                sender: 'bot',
                text: data.text,
                timestamp: data.timestamp || new Date().toISOString(),
                isHuman: true,
                agentName: data.agentName || 'Sarah Jenkins',
              };
              return [...prev, newAgentMsg];
            });

            setIsHumanActive(true);
            if (data.agentName) setHumanAgentName(data.agentName);
            setCurrentAvatar({
              expression: 'attentive',
              intensity: 0.8,
              voice_tone: 'empathetic_human',
              speech_rate: 1.0,
              gesture: 'listening',
            });
          }
        }
      };
    } catch {
      // Fallback
    }

    return () => {
      bus?.close();
    };
  }, [sessionId]);

  // LAYER 2: Fast Polling (Every 1200ms) - ALWAYS ACTIVE when sessionId exists!
  useEffect(() => {
    if (!sessionId) return;

    let isMounted = true;
    const poll = async () => {
      try {
        const remoteMessages = await getSessionMessages(sessionId);
        if (!isMounted || !remoteMessages || remoteMessages.length === 0) return;

        setMessages((prev) => {
          const existingTexts = new Set(prev.map((m) => `${m.sender}:${m.text.trim()}`));
          const newItems: MessageItem[] = [];

          for (const rm of remoteMessages) {
            const senderType = rm.is_bot ? 'bot' : 'user';
            const key = `${senderType}:${rm.text.trim()}`;
            if (!existingTexts.has(key)) {
              newItems.push({
                id: `remote-${rm.id}-${Date.now()}`,
                sender: senderType,
                text: rm.text,
                timestamp: rm.timestamp,
                isHuman: rm.is_human,
                agentName: rm.agent_name || (rm.is_human ? 'Sarah Jenkins' : undefined),
                sentiment: rm.sentiment as any,
                avatar: rm.avatar as any,
              });

              // If human agent replied from desk, automatically switch to human live mode!
              if (rm.is_human) {
                setIsHumanActive(true);
                if (rm.agent_name) setHumanAgentName(rm.agent_name);
              }
            }
          }

          if (newItems.length > 0) {
            return [...prev, ...newItems];
          }
          return prev;
        });
      } catch {
        // Background poll jitter
      }
    };

    poll();
    const interval = setInterval(poll, 1200);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      messageCounter.current += 1;
      const userMessageId = `user-${Date.now()}-${messageCounter.current}`;
      const nowIso = new Date().toISOString();

      const userMessage: MessageItem = {
        id: userMessageId,
        sender: 'user',
        text: text.trim(),
        timestamp: nowIso,
      };

      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);
      setError(null);

      const activeSession = sessionId || `sess-${Date.now()}`;
      if (!sessionId) {
        setSessionId(activeSession);
      }

      // Broadcast customer message across tabs so agent desk updates instantly
      try {
        const bus = new BroadcastChannel(BUS_CHANNEL_NAME);
        bus.postMessage({
          type: 'CUSTOMER_MESSAGE',
          sessionId: activeSession,
          text: text.trim(),
        });
        bus.close();
      } catch {}

      // If customer is speaking directly to a real human specialist
      if (isHumanActive) {
        try {
          const humanRes = await sendHumanMessage(
            activeSession,
            'customer',
            text.trim(),
            humanAgentName
          );

          if (humanRes.sentiment) {
            setCurrentSentiment(humanRes.sentiment);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to deliver message to representative';
          setError(errorMessage);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Standard AI Assistant Route
      try {
        const response = await apiSendMessage(text.trim(), activeSession);

        if (response.session_id) {
          setSessionId(response.session_id);
        }

        if (response.sentiment) {
          setCurrentSentiment(response.sentiment);
        }

        if (response.avatar) {
          setCurrentAvatar(response.avatar);
        }

        if (response.escalation) {
          setCurrentEscalation(response.escalation);
        }

        if (response.pii_entities_found) {
          setLatestPiiEntities(response.pii_entities_found);
        } else {
          setLatestPiiEntities([]);
        }

        setHasPrivacyWarning(Boolean(response.privacy_warning));

        messageCounter.current += 1;
        const botMessage: MessageItem = {
          id: response.request_id || `bot-${Date.now()}-${messageCounter.current}`,
          sender: 'bot',
          text: response.reply,
          timestamp: response.created_at || new Date().toISOString(),
          sentiment: response.sentiment,
          escalation: response.escalation,
          avatar: response.avatar,
          pii_entities_found: response.pii_entities_found,
          privacy_warning: response.privacy_warning,
          isHuman: false,
        };

        setMessages((prev) => [...prev, botMessage]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);

        messageCounter.current += 1;
        const botErrMessage: MessageItem = {
          id: `bot-err-${Date.now()}-${messageCounter.current}`,
          sender: 'bot',
          text: `Error: Unable to reach sentiment analysis service. (${errorMessage})`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, botErrMessage]);
      } finally {
        setLoading(false);
      }
    },
    [loading, sessionId, isHumanActive, humanAgentName]
  );

  const resetChat = useCallback(() => {
    const freshSession = `sess-${Date.now()}`;
    setSessionId(freshSession);
    try {
      localStorage.setItem('retailsense_active_session', freshSession);
    } catch {}

    setMessages([]);
    setError(null);
    setIsHumanActive(false);
    setCurrentSentiment(null);
    setCurrentAvatar({
      expression: 'composed',
      intensity: 0.5,
      voice_tone: 'friendly_professional',
      speech_rate: 1.0,
      gesture: 'welcome',
    });
    setCurrentEscalation(null);
    setLatestPiiEntities([]);
    setHasPrivacyWarning(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
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
  };
}
