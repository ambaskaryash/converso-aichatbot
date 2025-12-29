import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Users, RefreshCw, Trash2 } from 'lucide-react';
import { Button3D } from 'react-3d-button';

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
        <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
          <Users size={20} />
          Admins
        </h2>
        <Button3D type="info" onPress={() => refetch()}>
          <span className="flex items-center gap-2">
            <RefreshCw size={16} />
            Refresh
          </span>
        </Button3D>
      </div>

      <div className="card-base p-6">
        <h3 className="text-lg font-semibold text-gray-100">Add Admin</h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="input-base"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="input-base"
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
            {createMutation.status === 'pending' ? 'Adding...' : 'Add Admin'}
          </Button3D>
        </div>
        {createMutation.isError && (
          <div className="text-sm text-red-400 mt-2">{(createMutation.error as Error).message}</div>
        )}
      </div>

      <div className="card-base p-6">
        <h3 className="text-lg font-semibold text-gray-100">Existing Admins</h3>
        <div className="mt-4 overflow-x-auto">
          <div className="flex items-center gap-3 mb-3">
            <select className="select-base" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'email' | 'created_at')}>
              <option value="created_at">Sort by Created</option>
              <option value="email">Sort by Email</option>
            </select>
            <select className="select-base" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}>
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          <div className="flex items-center gap-2">
            <Button3D type="secondary" onPress={() => setSkip(Math.max(0, skip - limit))}>Prev</Button3D>
            <Button3D type="secondary" onPress={() => setSkip(skip + limit)}>Next</Button3D>
          </div>
          </div>
          <table className="min-w-full text-sm text-gray-300 table-base rounded-lg overflow-hidden">
            <thead>
              <tr className="text-left border-b border-gray-800">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Reset Password</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-b border-gray-800">
                  <td className="px-3 py-2">{a.email}</td>
                  <td className="px-3 py-2">
                    <select
                      className="select-base"
                      value={roleInputs[a.id] ?? a.role}
                      onChange={(e) => setRoleInputs((prev) => ({ ...prev, [a.id]: e.target.value as 'owner' | 'admin' | 'viewer' }))}
                    >
                      <option value="owner">owner</option>
                      <option value="admin">admin</option>
                      <option value="viewer">viewer</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <input
                      type="password"
                      className="input-base"
                      placeholder="New password"
                      value={passwordInputs[a.id] ?? ''}
                      onChange={(e) => setPasswordInputs((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-3 py-2">
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
                      {updateMutation.status === 'pending' ? 'Updating...' : 'Update'}
                    </Button3D>
                    <span className="ml-2 inline-block">
                      <Button3D
                        type="info"
                        onPress={() => roleMutation.mutate({ id: a.id, role: roleInputs[a.id] ?? a.role })}
                      >
                      Save Role
                      </Button3D>
                    </span>
                    <span className="ml-2 inline-block">
                      <Button3D
                        type="danger"
                        onPress={() => {
                        if (confirm(`Delete admin ${a.email}?`)) {
                          deleteMutation.mutate(a.id);
                        }
                      }}
                    >
                      <Trash2 size={16} />
                      Delete
                      </Button3D>
                    </span>
                  </td>
                </tr>
              ))}
              {!admins.length && (
                <tr>
                  <td className="px-3 py-4 text-gray-400" colSpan={5}>
                    No admins yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {updateMutation.isError && (
          <div className="text-sm text-red-400 mt-2">{(updateMutation.error as Error).message}</div>
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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-100">Audit Logs</h3>
        <div className="flex items-center gap-2">
          <Button3D type="secondary" onPress={() => setSkip(Math.max(0, skip - limit))}>Prev</Button3D>
          <Button3D type="secondary" onPress={() => setSkip(skip + limit)}>Next</Button3D>
          <Button3D type="info" onPress={() => refetch()}>Refresh</Button3D>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm text-gray-300">
          <thead>
            <tr className="text-left border-b border-gray-800">
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-gray-800">
                <td className="px-3 py-2">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-3 py-2">{l.actor_email}</td>
                <td className="px-3 py-2">{l.action}</td>
                <td className="px-3 py-2">{l.target_email ?? '-'}</td>
                <td className="px-3 py-2">{JSON.stringify(l.metadata ?? {})}</td>
              </tr>
            ))}
            {!logs.length && (
              <tr>
                <td className="px-3 py-4 text-gray-400" colSpan={5}>
                  No logs
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
