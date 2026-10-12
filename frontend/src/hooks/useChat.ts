import { useState, useCallback, useRef } from 'react';
import type {
  MessageItem,
  SentimentData,
  AvatarDirective,
  EscalationDecision,
  PiiEntity,
} from '../types';
import { sendMessage as apiSendMessage } from '../api';

export function useChat() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      try {
        const response = await apiSendMessage(text.trim(), sessionId);

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
    [loading, sessionId]
  );

  const resetChat = useCallback(() => {
    setMessages([]);
    setSessionId(undefined);
    setError(null);
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

  return {
    messages,
    sessionId,
    loading,
    error,
    currentSentiment,
    currentAvatar,
    currentEscalation,
    latestPiiEntities,
    hasPrivacyWarning,
    sendMessage,
    resetChat,
  };
}
