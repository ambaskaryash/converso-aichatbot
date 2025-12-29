import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle, AlertCircle, Activity, Clock, MessageSquare, Users } from 'lucide-react';
import { api } from '../lib/api';
import { Button3D } from 'react-3d-button';

// Design: Overview page focuses on quick comprehension of health & usage.
// KPIs are simple cards; usage trend is a line chart; status is prominent.

export const Overview: React.FC = () => {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
  });
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | undefined>(undefined);
  const { data: overview } = useQuery({
    queryKey: ['overview', selectedProjectId],
    queryFn: () => api.getOverview(selectedProjectId),
  });
  const { data: latencyTrend = [] } = useQuery({
    queryKey: ['latencyTrend', selectedProjectId],
    queryFn: () => api.getLatencyTrend(selectedProjectId),
  });
  const [diag, setDiag] = React.useState<Array<{ name: string; ok: boolean; detail?: string }>>([]);
  const [running, setRunning] = React.useState(false);
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api/v1';
  const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

  const totalConversations = overview?.total_conversations ?? 0;
  const messagesToday = overview?.messages_today ?? 0;
  const activeUsers = overview?.active_users ?? 0;
  const avgResponseMs = overview?.avg_response_ms ?? 0;
  const isLive = overview?.status === 'live';
  const usageData = overview?.usage ?? [];

  const runDiagnostics = async () => {
    setRunning(true);
    const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
    try {
      const u = new URL(API_BASE_URL);
      const base = `${u.protocol}//${u.host}`;
      const res = await fetch(`${base}/`);
      results.push({ name: 'API Root', ok: res.ok, detail: res.ok ? undefined : `HTTP ${res.status}` });
    } catch {
      results.push({ name: 'API Root', ok: false, detail: 'Network error' });
    }
    try {
      const ps = await api.getProjects();
      results.push({ name: 'Auth Projects', ok: Array.isArray(ps) });
      const pid = selectedProjectId ?? (ps[0]?.id as string | undefined);
      const proj = ps.find((p) => p.id === pid);
      if (pid && proj) {
        await new Promise<void>((resolve) => {
          const url = `${WS_BASE_URL}/chat/${pid}/ws?api_key=${encodeURIComponent(proj.api_key)}`;
          const ws = new WebSocket(url);
          const timer = setTimeout(() => {
            try { ws.close(); } catch { void 0; }
            results.push({ name: 'Chat WebSocket', ok: false, detail: 'Timeout' });
            resolve();
          }, 3000);
          ws.onopen = () => {
            clearTimeout(timer);
            results.push({ name: 'Chat WebSocket', ok: true });
            ws.close();
            resolve();
          };
          ws.onerror = () => {
            clearTimeout(timer);
            results.push({ name: 'Chat WebSocket', ok: false, detail: 'Error' });
            try { ws.close(); } catch { void 0; }
            resolve();
          };
          ws.onclose = () => { void 0; };
        });
        try {
          const settings = await api.getEmbedSettings(pid, proj.api_key);
          const ok = !settings.domains.length || settings.domains.includes('localhost');
          results.push({ name: 'Domain Whitelist', ok, detail: ok ? undefined : 'localhost not allowed' });
        } catch {
          results.push({ name: 'Domain Whitelist', ok: false });
        }
      } else {
        results.push({ name: 'Chat WebSocket', ok: false, detail: 'No project selected' });
      }
    } catch {
      results.push({ name: 'Auth Projects', ok: false });
    }
    setDiag(results);
    setRunning(false);
  };

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Converso Overview</h2>
            <p className="text-gray-400">Health and usage across your chatbots</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="select-base"
              value={selectedProjectId ?? ''}
              onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Button3D type="info" onPress={() => window.location.reload()}>
              Refresh
            </Button3D>
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-base p-6">
          <div className="flex items-center gap-3 text-gray-400">
            <MessageSquare size={18} />
            Total Conversations
          </div>
          <div className="mt-3 text-3xl font-bold text-gray-100">{totalConversations.toLocaleString()}</div>
        </div>

        <div className="card-base p-6">
          <div className="flex items-center gap-3 text-gray-400">
            <Activity size={18} />
            Messages Today
          </div>
          <div className="mt-3 text-3xl font-bold text-gray-100">{messagesToday}</div>
        </div>

        <div className="card-base p-6">
          <div className="flex items-center gap-3 text-gray-400">
            <Users size={18} />
            Active Users
          </div>
          <div className="mt-3 text-3xl font-bold text-gray-100">{activeUsers}</div>
        </div>

        <div className="card-base p-6">
          <div className="flex items-center gap-3 text-gray-400">
            <Clock size={18} />
            Avg Response Time
          </div>
          <div className="mt-3 text-3xl font-bold text-gray-100">{avgResponseMs} ms</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-base p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-100">Usage (7 days)</h3>
            <span className="text-sm text-gray-400">Projects: {projects.length}</span>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageData}>
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Line type="monotone" dataKey="messages" stroke="#60a5fa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-base p-6">
          <h3 className="text-lg font-semibold text-gray-100">Chatbot Status</h3>
          <div className="mt-4 flex items-center gap-3">
            {isLive ? (
              <CheckCircle className="text-green-500" size={20} />
            ) : (
              <AlertCircle className="text-red-500" size={20} />
            )}
            <span className="text-gray-300">{isLive ? 'Live' : 'Offline'}</span>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Converso services operational. Recent deployments healthy.
          </p>
          <div className="mt-4">
            <Button3D type="success" disabled={running} onPress={runDiagnostics}>
              Run Diagnostics
            </Button3D>
            {diag.length > 0 && (
              <div className="mt-3 space-y-1">
                {diag.map((d) => (
                  <div key={d.name} className={`text-sm ${d.ok ? 'text-green-400' : 'text-red-400'}`}>
                    {d.name}: {d.ok ? 'OK' : 'Fail'}{d.detail ? ` (${d.detail})` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card-base p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">Latency Trend (7 days)</h3>
          <span className="text-sm text-gray-400">{selectedProjectId ? 'Selected Project' : 'All Projects'}</span>
        </div>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={latencyTrend}>
              <XAxis dataKey="day" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Line type="monotone" dataKey="ms" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
