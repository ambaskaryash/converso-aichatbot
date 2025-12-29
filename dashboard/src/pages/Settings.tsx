import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button3D } from 'react-3d-button';
import { api } from '../lib/api';

const decodeTokenEmail = (): string | null => {
  const t = localStorage.getItem('converso_token') || '';
  if (!t) return null;
  const parts = t.split('.');
  if (parts.length < 2) return null;
  const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  try {
    const json = JSON.parse(decodeURIComponent(escape(window.atob(b64))));
    return typeof json.sub === 'string' ? json.sub : null;
  } catch {
    return null;
  }
};

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const email = decodeTokenEmail();
  const { data: admins = [] } = useQuery({
    queryKey: ['admins', 'settings'],
    queryFn: api.listAdmins,
  });
  const me = admins.find((a) => a.email === email) || null;
  const [newPassword, setNewPassword] = React.useState('');
  const strongPassword = (p: string) =>
    /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p) && p.length >= 8;
  const [toast, setToast] = React.useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const showToast = (t: { type: 'error' | 'success'; message: string }) => {
    setToast(t);
    setTimeout(() => setToast(null), 3000);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error('Profile not found');
      return api.updateAdminPassword(me.id, newPassword);
    },
    onSuccess: () => {
      setNewPassword('');
      qc.invalidateQueries({ queryKey: ['admins'] });
      showToast({ type: 'success', message: 'Password updated' });
    },
    onError: (e) => {
      showToast({ type: 'error', message: (e as Error).message || 'Failed to update password' });
    },
  });

  const logout = () => {
    try {
      localStorage.removeItem('converso_token');
      document.cookie = 'csrftoken=; Max-Age=0; path=/';
    } catch (e) {
      void e;
    }
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-md border ${toast.type === 'error' ? 'bg-red-950 border-red-900 text-red-300' : 'bg-green-950 border-green-900 text-green-300'}`}>
          {toast.message}
        </div>
      )}
      <div className="card-base p-6">
        <h2 className="text-xl font-semibold text-gray-100">Profile</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="label-base mb-1">Email</div>
            <input className="input-base w-full" value={email ?? ''} readOnly />
          </div>
          <div>
            <div className="label-base mb-1">Role</div>
            <input className="input-base w-full" value={me?.role ?? ''} readOnly />
          </div>
        </div>
      </div>

      <div className="card-base p-6">
        <h3 className="text-lg font-semibold text-gray-100">Change Password</h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="password"
            className="input-base"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button3D
            type="primary"
            disabled={!strongPassword(newPassword) || updateMutation.status === 'pending'}
            onPress={() => {
              if (!strongPassword(newPassword)) {
                showToast({ type: 'error', message: 'Password is weak. Use 8+ chars with upper, lower, number, symbol.' });
                return;
              }
              updateMutation.mutate();
            }}
          >
            {updateMutation.status === 'pending' ? 'Updating...' : 'Update Password'}
          </Button3D>
          <Button3D type="secondary" onPress={() => setNewPassword('')}>Clear</Button3D>
        </div>
      </div>

      <div className="card-base p-6">
        <h3 className="text-lg font-semibold text-gray-100">Session</h3>
        <div className="mt-4">
          <Button3D type="danger" onPress={logout}>Logout</Button3D>
        </div>
      </div>
    </div>
  );
}
