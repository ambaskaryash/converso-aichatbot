import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Users, RefreshCw, Trash2, Shield, History, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button3D } from 'react-3d-button';
import { Input } from '../components/ui/Input';

export const Admins: React.FC = () => {
  const qc = useQueryClient();
  const [skip, setSkip] = React.useState(0);
  const [limit] = React.useState(20);
  const [sortBy, setSortBy] = React.useState<'email' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const { data: admins = [], refetch } = useQuery({
    queryKey: ['admins', skip, limit, sortBy, sortOrder],
    queryFn: () => api.listAdminsPaged(skip, limit, sortBy, sortOrder),
  });
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const createMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => api.createAdmin(email, password),
    onSuccess: () => {
      setEmail('');
      setPassword('');
      qc.invalidateQueries({ queryKey: ['admins'] });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => api.updateAdminPassword(id, password),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] });
    },
  });
  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'owner' | 'admin' | 'viewer' }) => api.updateAdminRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAdmin(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] });
    },
  });
  const [passwordInputs, setPasswordInputs] = React.useState<Record<string, string>>({});
  const [roleInputs, setRoleInputs] = React.useState<Record<string, 'owner' | 'admin' | 'viewer'>>({});
  const [toast, setToast] = React.useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const showToast = (t: { type: 'error' | 'success'; message: string }) => {
    setToast(t);
    setTimeout(() => setToast(null), 3000);
  };
  const strongPassword = (p: string) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p) && p.length >= 8;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-md border ${toast.type === 'error' ? 'bg-red-950 border-red-900 text-red-300' : 'bg-green-950 border-green-900 text-green-300'}`}>
          {toast.message}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-100 flex items-center gap-3 tracking-tight">
            <Users className="text-blue-500" size={32} />
            Admins
          </h2>
          <p className="text-gray-400 mt-1 ml-11">Manage platform administrators and access controls</p>
        </div>
        <Button3D type="secondary" onPress={() => refetch()}>
          <span className="flex items-center gap-2">
            <RefreshCw size={16} />
            Refresh
          </span>
        </Button3D>
      </div>

      <div className="card-base p-6">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2 mb-4">
          <Shield size={20} className="text-blue-400" />
          Add Admin
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button3D
            type="primary"
            disabled={!email || !password || createMutation.status === 'pending'}
            onPress={() => {
              if (!strongPassword(password)) {
                showToast({ type: 'error', message: 'Password is weak. Use 8+ chars with upper, lower, number, symbol.' });
                return;
              }
              createMutation.mutate({ email, password });
            }}
          >
            Add Admin
          </Button3D>
        </div>
        {createMutation.isError && (
          <div className="text-sm text-red-400 mt-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            {(createMutation.error as Error).message}
          </div>
        )}
      </div>

      <div className="card-base p-0 overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-100">Existing Admins</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select 
                className="appearance-none bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pr-8"
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as 'email' | 'created_at')}
              >
                <option value="created_at">Sort by Created</option>
                <option value="email">Sort by Email</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            
            <div className="relative">
              <select 
                className="appearance-none bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pr-8"
                value={sortOrder} 
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>

            <div className="flex items-center gap-2 border-l border-gray-800 pl-3">
              <Button3D type="secondary" onPress={() => setSkip(Math.max(0, skip - limit))}>
                <ArrowLeft size={16} />
              </Button3D>
              <Button3D type="secondary" onPress={() => setSkip(skip + limit)}>
                <ArrowRight size={16} />
              </Button3D>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium">Reset Password</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {admins.map((a) => (
                <tr key={a.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-200">{a.email}</td>
                  <td className="px-6 py-4">
                    <div className="relative w-32">
                      <select
                        className="appearance-none bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5 pr-6"
                        value={roleInputs[a.id] ?? a.role}
                        onChange={(e) => setRoleInputs((prev) => ({ ...prev, [a.id]: e.target.value as 'owner' | 'admin' | 'viewer' }))}
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-400">
                        <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <Input
                      type="password"
                      placeholder="New password"
                      className="h-8 text-xs w-40"
                      value={passwordInputs[a.id] ?? ''}
                      onChange={(e) => setPasswordInputs((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button3D
                        type="secondary"
                        disabled={!passwordInputs[a.id] || updateMutation.status === 'pending'}
                        onPress={() => {
                          const pwd = passwordInputs[a.id] ?? '';
                          if (!strongPassword(pwd)) {
                            showToast({ type: 'error', message: 'Password is weak. Use 8+ chars with upper, lower, number, symbol.' });
                            return;
                          }
                          updateMutation.mutate({ id: a.id, password: pwd });
                        }}
                      >
                        Update
                      </Button3D>
                      
                      <Button3D
                        type="info"
                        onPress={() => roleMutation.mutate({ id: a.id, role: roleInputs[a.id] ?? a.role })}
                      >
                        Save Role
                      </Button3D>

                      <Button3D
                        type="danger"
                        onPress={() => {
                          if (confirm(`Delete admin ${a.email}?`)) {
                            deleteMutation.mutate(a.id);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </Button3D>
                    </div>
                  </td>
                </tr>
              ))}
              {!admins.length && (
                <tr>
                  <td className="px-6 py-8 text-center text-gray-500" colSpan={5}>
                    No admins found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {updateMutation.isError && (
          <div className="p-4 text-sm text-red-400 bg-red-900/10 border-t border-red-900/20">{(updateMutation.error as Error).message}</div>
        )}
      </div>

      <Logs />
    </div>
  );
}

const Logs: React.FC = () => {
  const [skip, setSkip] = React.useState(0);
  const [limit] = React.useState(20);
  const { data: logs = [], refetch } = useQuery({
    queryKey: ['adminLogs', skip, limit],
    queryFn: () => api.listAdminLogs(skip, limit),
  });
  return (
    <div className="card-base p-0 overflow-hidden">
      <div className="p-6 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <History size={20} className="text-blue-400" />
          Audit Logs
        </h3>
        <div className="flex items-center gap-2">
          <Button3D type="secondary" onPress={() => setSkip(Math.max(0, skip - limit))}>
            <ArrowLeft size={16} />
          </Button3D>
          <Button3D type="secondary" onPress={() => setSkip(skip + limit)}>
            <ArrowRight size={16} />
          </Button3D>
          <Button3D type="secondary" onPress={() => refetch()}>
            <span className="flex items-center gap-2">
              <RefreshCw size={14} />
              Refresh
            </span>
          </Button3D>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 border-b border-gray-800">
            <tr>
              <th className="px-6 py-3 font-medium">Time</th>
              <th className="px-6 py-3 font-medium">Actor</th>
              <th className="px-6 py-3 font-medium">Action</th>
              <th className="px-6 py-3 font-medium">Target</th>
              <th className="px-6 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-6 py-4">{l.actor_email}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {l.action}
                  </span>
                </td>
                <td className="px-6 py-4">{l.target_email ?? '-'}</td>
                <td className="px-6 py-4 font-mono text-xs text-gray-500 truncate max-w-xs" title={JSON.stringify(l.metadata ?? {})}>
                  {JSON.stringify(l.metadata ?? {})}
                </td>
              </tr>
            ))}
            {!logs.length && (
              <tr>
                <td className="px-6 py-8 text-center text-gray-500" colSpan={5}>
                  No logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
