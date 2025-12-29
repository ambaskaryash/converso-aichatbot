const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api/v1';

const getToken = () => localStorage.getItem('converso_token') || '';
const getCsrfToken = () => {
  const match = document.cookie.split('; ').find((row) => row.startsWith('csrftoken='));
  return match ? decodeURIComponent(match.split('=')[1]) : '';
};

export interface Project {
  id: string;
  name: string;
  api_key: string;
  created_at: string;
  updated_at?: string;
}

export interface IngestResponse {
  message: string;
  document_id: string;
}

export interface OverviewMetrics {
  total_conversations: number;
  messages_today: number;
  active_users: number;
  avg_response_ms: number | null;
  status: 'live' | 'offline';
  usage: Array<{ day: string; messages: number }>;
}

export interface EmbedSettings {
  domains: string[];
  theme: 'ocean' | 'sunset' | 'forest' | 'neon' | 'pirate';
}

export const api = {
  getProjects: async (): Promise<Project[]> => {
    const response = await fetch(`${API_BASE_URL}/projects/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  createProject: async (name: string): Promise<Project> => {
    const response = await fetch(`${API_BASE_URL}/projects/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({
        name,
        vector_namespace: `ns_${crypto.randomUUID()}`,
      }),
    });
    if (!response.ok) throw new Error('Failed to create project');
    return response.json();
  },

  getOverview: async (projectId?: string): Promise<OverviewMetrics> => {
    const url = projectId
      ? `${API_BASE_URL}/analytics/overview?project_id=${projectId}`
      : `${API_BASE_URL}/analytics/overview`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error('Failed to fetch overview metrics');
    return response.json();
  },
  getLatencyTrend: async (projectId?: string): Promise<Array<{ day: string; ms: number }>> => {
    const url = projectId
      ? `${API_BASE_URL}/analytics/latency_trend?project_id=${projectId}`
      : `${API_BASE_URL}/analytics/latency_trend`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!response.ok) throw new Error('Failed to fetch latency trend');
    const data = await response.json();
    return data.trend ?? [];
  },

  listAdmins: async (): Promise<Array<{ id: string; email: string; role: string; created_at: string }>> => {
    const response = await fetch(`${API_BASE_URL}/admins/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error('Failed to fetch admins');
    return response.json();
  },
  listAdminsPaged: async (skip = 0, limit = 50, sortBy: 'email' | 'created_at' = 'created_at', sortOrder: 'asc' | 'desc' = 'desc'): Promise<Array<{ id: string; email: string; role: string; created_at: string }>> => {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit), sort_by: sortBy, sort_order: sortOrder });
    const response = await fetch(`${API_BASE_URL}/admins/?${params.toString()}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error('Failed to fetch admins');
    return response.json();
  },

  createAdmin: async (email: string, password: string): Promise<{ id: string; email: string; role: string; created_at: string }> => {
    const response = await fetch(`${API_BASE_URL}/admins/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
        'x-csrf-token': getCsrfToken(),
      },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create admin');
    }
    return response.json();
  },

  updateAdminPassword: async (id: string, password: string): Promise<{ id: string; email: string; role: string }> => {
    const response = await fetch(`${API_BASE_URL}/admins/${id}/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
        'x-csrf-token': getCsrfToken(),
      },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update admin password');
    }
    return response.json();
  },
  updateAdminRole: async (id: string, role: 'owner' | 'admin' | 'viewer'): Promise<{ id: string; email: string; role: string }> => {
    const response = await fetch(`${API_BASE_URL}/admins/${id}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
        'x-csrf-token': getCsrfToken(),
      },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update role');
    }
    return response.json();
  },
  deleteAdmin: async (id: string): Promise<{ ok: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/admins/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'x-csrf-token': getCsrfToken(),
      },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete admin');
    }
    return response.json();
  },
  listAdminLogs: async (skip = 0, limit = 50): Promise<Array<{ id: string; actor_email: string; action: string; target_email?: string; metadata?: Record<string, unknown>; created_at: string }>> => {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    const response = await fetch(`${API_BASE_URL}/admins/logs?${params.toString()}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error('Failed to fetch admin logs');
    return response.json();
  },

  getSessions: async (projectId?: string, startDate?: string, endDate?: string): Promise<Array<{id: string; created_at: string; project_id: string; last_response_ms?: number}>> => {
    const params = new URLSearchParams();
    if (projectId) params.set('project_id', projectId);
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    const url = `${API_BASE_URL}/conversations/sessions${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  },

  getSessionMessages: async (sessionId: string, startDate?: string, endDate?: string): Promise<Array<{id: string; role: string; content: string; created_at: string}>> => {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    const url = `${API_BASE_URL}/conversations/sessions/${sessionId}/messages${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  },

  getEmbedSettings: async (projectId: string, apiKey: string): Promise<EmbedSettings> => {
    const response = await fetch(`${API_BASE_URL}/integrations/${projectId}/embed-settings?api_key=${apiKey}`);
    if (!response.ok) throw new Error('Failed to fetch embed settings');
    return response.json();
  },

  updateEmbedSettings: async (projectId: string, apiKey: string, settings: Partial<EmbedSettings>): Promise<EmbedSettings> => {
    const response = await fetch(`${API_BASE_URL}/integrations/${projectId}/embed-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error('Failed to update embed settings');
    return response.json();
  },

  ingestText: async (projectId: string, apiKey: string, text: string): Promise<IngestResponse> => {
    const response = await fetch(`${API_BASE_URL}/ingest/${projectId}/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        metadata: { source: 'dashboard_manual_entry' },
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to ingest text');
    }
    return response.json();
  },
};
