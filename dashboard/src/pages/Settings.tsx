import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button3D } from 'react-3d-button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { User, Shield, Key, LogOut } from 'lucide-react';

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
    <div className="space-y-6 max-w-4xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-md border ${toast.type === 'error' ? 'bg-red-950 border-red-900 text-red-300' : 'bg-green-950 border-green-900 text-green-300'}`}>
          {toast.message}
        </div>
      )}
      
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-blue-500/30">
          <User className="text-blue-400" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Account Settings</h2>
          <p className="text-gray-400">Manage your profile and preferences</p>
        </div>
      </div>

      <div className="card-base p-6">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2 mb-6">
          <Shield size={20} className="text-blue-400" />
          Profile Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label-base mb-2">Email Address</label>
            <Input value={email ?? ''} readOnly className="bg-gray-900/50" />
          </div>
          <div>
            <label className="label-base mb-2">Role</label>
            <Input value={me?.role ?? ''} readOnly className="bg-gray-900/50" />
          </div>
        </div>
      </div>

      <div className="card-base p-6">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2 mb-6">
          <Key size={20} className="text-blue-400" />
          Security
        </h3>
        <div className="max-w-md">
          <label className="label-base mb-2">Change Password</label>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className="flex items-center gap-3">
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
                Update Password
              </Button3D>
              {newPassword && (
                <Button3D type="secondary" onPress={() => setNewPassword('')}>
                  Clear
                </Button3D>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and symbols.
          </p>
        </div>
      </div>

      <div className="card-base p-6 border-red-900/30 bg-red-950/10">
        <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2 mb-4">
          <LogOut size={20} />
          Session
        </h3>
        <div className="flex items-center justify-between">
          <p className="text-gray-400 text-sm">Sign out of your account on this device.</p>
          <Button3D type="danger" onPress={logout}>
            Sign Out
          </Button3D>
        </div>
      </div>
    </div>
  );
}
