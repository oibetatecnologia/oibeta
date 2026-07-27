export type SessionHealthStatus = 'healthy' | 'attention' | 'critical';

export interface SessionHealthResponse {
  authenticated: boolean;
  source?: 'supabase' | 'development_headers' | 'active_session' | 'development_seed' | 'none';
  user?: {
    id: string;
    name: string;
    email: string;
    organizationId: string;
    role: string;
  } | null;
  tokenRequired: boolean;
  tokenPresent: boolean;
  checkedAt: string;
}

export interface SessionHealthSummary extends SessionHealthResponse {
  score: number;
  status: SessionHealthStatus;
  issues: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'alta' | 'média' | 'baixa';
    targetTab: string;
    taskTitle: string;
  }>;
}
