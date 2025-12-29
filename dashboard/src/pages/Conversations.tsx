import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type Project } from '../lib/api';
import { MessageSquare, Download, Calendar, Filter, X } from 'lucide-react';
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
      <div className="card-base p-6 sticky-card rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label-base mb-1.5 flex items-center gap-2">
                <Filter size={14} className="text-blue-400" />
                Project
              </label>
              <div className="relative">
                <select
                  className="appearance-none bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pr-8"
                  value={selectedProjectId ?? ''}
                  onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
                >
                  <option value="">All Projects</option>
                  {projects.map((p: Project) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>
            <div>
              <label className="label-base mb-1.5 flex items-center gap-2">
                <Calendar size={14} className="text-blue-400" />
                Start Date
              </label>
              <input
                type="date"
                className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                value={startDate ?? ''}
                onChange={(e) => setStartDate(e.target.value || undefined)}
              />
            </div>
            <div>
              <label className="label-base mb-1.5 flex items-center gap-2">
                <Calendar size={14} className="text-blue-400" />
                End Date
              </label>
              <input
                type="date"
                className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                value={endDate ?? ''}
                onChange={(e) => setEndDate(e.target.value || undefined)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 md:pb-[1px]">
            <Button3D
              type="secondary"
              onPress={() => { setSelectedProjectId(undefined); setStartDate(undefined); setEndDate(undefined); }}
            >
              <span className="flex items-center gap-2">
                <X size={16} />
                Clear
              </span>
            </Button3D>
            <Button3D type="primary" onPress={() => refetch()}>
              Apply Filters
            </Button3D>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[calc(100vh-300px)] lg:min-h-[500px]">
        <div className="card-base p-0 flex flex-col overflow-hidden h-full">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-400" />
              Conversations
            </h2>
            <span className="text-xs text-gray-500 px-2 py-1 rounded-full bg-gray-800">{sessions.length}</span>
          </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 group ${
                selected === s.id 
                  ? 'bg-blue-600/10 border-blue-500/50 shadow-md shadow-blue-500/10' 
                  : 'bg-transparent border-transparent hover:bg-gray-800/50 hover:border-gray-700'
              }`}
            >
              <div className={`text-sm font-medium mb-1 ${selected === s.id ? 'text-blue-400' : 'text-gray-300 group-hover:text-gray-200'}`}>
                Session {s.id.slice(0, 8)}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(s.created_at).toLocaleDateString()}</span>
                <span>{new Date(s.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              {s.last_response_ms != null && (
                <div className="mt-2 text-xs flex items-center gap-1.5 text-gray-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500/50"></div>
                  {s.last_response_ms} ms latency
                </div>
              )}
            </button>
          ))}
          {!sessions.length && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <MessageSquare size={32} className="mb-2 opacity-20" />
              <div className="text-sm">No sessions found</div>
            </div>
          )}
        </div>
      </div>

      <div className="card-base p-0 lg:col-span-2 flex flex-col overflow-hidden h-full">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <h3 className="text-lg font-semibold text-gray-100">Messages</h3>
          <Button3D type="secondary" onPress={exportSelected} disabled={!messages.length}>
            <span className="flex items-center gap-2">
              <Download size={14} />
              Export JSON
            </span>
          </Button3D>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-950/30">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'mr-auto items-start' : 'ml-auto items-end'}`}
            >
              <div className={`flex items-center gap-2 mb-1.5 text-xs text-gray-500 px-1`}>
                <span className="capitalize font-medium">{m.role}</span>
                <span>•</span>
                <span>{new Date(m.created_at).toLocaleTimeString()}</span>
              </div>
              <div 
                className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user' 
                    ? 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700' 
                    : 'bg-blue-600 text-white rounded-tr-none shadow-blue-500/10'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {!messages.length && (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mb-4">
                <MessageSquare size={24} className="opacity-40" />
              </div>
              <p className="text-sm">Select a conversation to view messages</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
