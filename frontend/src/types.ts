export interface PolarityScores {
  negative: number;
  neutral: number;
  positive: number;
}

export interface EmotionScores {
  [emotion: string]: number;
}

export interface SentimentData {
  polarity: 'positive' | 'neutral' | 'negative';
  polarity_scores: PolarityScores;
  emotion: string;
  emotion_scores?: EmotionScores;
  intent?: string;
  topic?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  trend?: string;
  escalation_signals?: string[];
  tier_used?: number;
  reason?: string;
  evidence_spans?: string[];
}

export interface AvatarDirective {
  expression: 'warm_smile' | 'attentive' | 'concerned' | 'serious' | 'gentle' | 'reassuring' | 'composed' | string;
  intensity: number;
  voice_tone?: string;
  speech_rate?: number;
  gesture?: string;
}

export interface EscalationDecision {
  decision: 'none' | 'follow_up' | 'human_review' | 'urgent_handoff' | string;
  priority: 'low' | 'medium' | 'high' | 'critical' | string;
  reason?: string;
  triggers?: string[];
}

export interface PiiEntity {
  entity_type: string;
  original: string;
  replacement?: string;
  start?: number;
  end?: number;
}

export interface ChatResponse {
  request_id: string;
  session_id: string;
  reply: string;
  sentiment?: SentimentData;
  escalation?: EscalationDecision;
  avatar?: AvatarDirective;
  privacy_warning?: boolean;
  pii_entities_found?: PiiEntity[] | string[];
  created_at?: string;
}

export interface PrivacyPreviewResponse {
  original: string;
  masked: string;
  entities: Array<{
    entity_type: string;
    value?: string;
    original?: string;
    replacement?: string;
    start?: number;
    end?: number;
  }>;
}

export interface DashboardData {
  total_messages: number;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  escalation_counts: {
    none?: number;
    follow_up?: number;
    human_review?: number;
    urgent_handoff?: number;
    [key: string]: number | undefined;
  };
  avg_confidence: number;
  tier2_rate: number;
  avg_latency_ms: number;
}

export interface CaseData {
  case_id: string;
  session_id: string;
  priority: string;
  reason: string;
  status: string;
  summary?: string;
  signals?: string[];
  created_at: string;
}

export interface HealthData {
  status: string;
  models_loaded?: boolean;
  timestamp?: string;
}

export interface MessageItem {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  sentiment?: SentimentData;
  escalation?: EscalationDecision;
  avatar?: AvatarDirective;
  pii_entities_found?: PiiEntity[] | string[];
  privacy_warning?: boolean;
  response?: {
    next_steps?: string[];
    citations?: string[];
  };
}
