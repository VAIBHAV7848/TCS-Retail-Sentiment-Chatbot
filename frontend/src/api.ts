import type {
  ChatResponse,
  PrivacyPreviewResponse,
  DashboardData,
  CaseData,
  HealthData,
} from './types';

const API_BASE = 'http://localhost:8000';

export async function sendMessage(message: string, sessionId?: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      session_id: sessionId,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to send message (${res.status}): ${errorText}`);
  }

  return res.json();
}

export async function previewPrivacy(text: string): Promise<PrivacyPreviewResponse> {
  const res = await fetch(`${API_BASE}/privacy/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to preview privacy (${res.status}): ${errorText}`);
  }

  return res.json();
}

export async function getDashboard(): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/dashboard/summary`);
  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard summary (${res.status})`);
  }
  return res.json();
}

export async function getCases(): Promise<CaseData[]> {
  const res = await fetch(`${API_BASE}/cases`);
  if (!res.ok) {
    throw new Error(`Failed to fetch cases (${res.status})`);
  }
  return res.json();
}

export async function getHealth(): Promise<HealthData> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`Failed to fetch health status (${res.status})`);
  }
  return res.json();
}
