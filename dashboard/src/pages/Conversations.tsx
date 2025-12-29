import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type Project } from '../lib/api';
import { MessageSquare } from 'lucide-react';
import { Button3D } from 'react-3d-button';

export const Conversations: React.FC = () => {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
  });
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | undefined>(undefined);
  const [startDate, setStartDate] = React.useState<string | undefined>(undefined);
  const [endDate, setEndDate] = React.useState<string | undefined>(undefined);
  const { data: sessions = [], refetch } = useQuery({
    queryKey: ['sessions', selectedProjectId, startDate, endDate],
    queryFn: () => api.getSessions(selectedProjectId, startDate, endDate),
  });
  const [selected, setSelected] = React.useState<string | null>(null);
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selected, startDate, endDate],
    queryFn: () => (selected ? api.getSessionMessages(selected, startDate, endDate) : Promise.resolve([])),
    enabled: !!selected,
  });
  const exportSelected = () => {
    if (!selected || !messages.length) return;
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converso-session-${selected}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="card-base p-4 sticky-card rounded-xl">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <div className="label-base mb-1">Project</div>
            <select
              className="select-base"
              value={selectedProjectId ?? ''}
              onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
            >
              <option value="">All Projects</option>
              {projects.map((p: Project) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="label-base mb-1">Start Date</div>
            <input
              type="date"
              className="input-base"
              value={startDate ?? ''}
              onChange={(e) => setStartDate(e.target.value || undefined)}
            />
          </div>
          <div>
            <div className="label-base mb-1">End Date</div>
            <input
              type="date"
              className="input-base"
              value={endDate ?? ''}
              onChange={(e) => setEndDate(e.target.value || undefined)}
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button3D type="secondary" onPress={() => { setSelectedProjectId(undefined); setStartDate(undefined); setEndDate(undefined); }}>Clear</Button3D>
            <Button3D type="info" onPress={() => refetch()}>Apply</Button3D>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-base p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <MessageSquare size={18} />
              Conversations
            </h2>
          </div>
        <div className="mt-4 space-y-2">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`w-full text-left px-4 py-3 rounded-lg border ${selected === s.id ? 'bg-blue-950/40 border-blue-900 text-blue-300' : 'bg-gray-950 border-gray-800 text-gray-300'} transition-colors`}
            >
              <div className="text-sm font-medium">Session {s.id.slice(0, 8)}</div>
              <div className="text-xs text-gray-400">{new Date(s.created_at).toLocaleString()}</div>
              {s.last_response_ms != null && (
                <div className="text-xs text-gray-400">First token: {s.last_response_ms} ms</div>
              )}
            </button>
          ))}
          {!sessions.length && <div className="text-sm text-gray-400">No sessions yet</div>}
        </div>
      </div>

      <div className="card-base p-6 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">Messages</h3>
          <div className="flex items-center gap-3">
            <Button3D type="secondary" onPress={exportSelected} disabled={!messages.length}>
              Export JSON
            </Button3D>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-4 rounded-2xl border ${m.role === 'user' ? 'bg-gray-950 border-gray-800' : 'bg-blue-950/30 border-blue-900'} max-w-3xl ${m.role === 'user' ? '' : 'ml-auto'} shadow-sm`}
            >
              <div className="text-xs text-gray-400 mb-1 capitalize">{m.role} • {new Date(m.created_at).toLocaleTimeString()}</div>
              <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{m.content}</div>
            </div>
          ))}
          {!messages.length && <div className="text-sm text-gray-400">Select a session to view messages</div>}
        </div>
      </div>
      </div>
    </div>
  );
}
