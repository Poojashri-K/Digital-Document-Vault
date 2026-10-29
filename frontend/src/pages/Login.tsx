import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../api/client';
import { Shield, Lock, Mail, ArrowRight, UserCheck, ShieldAlert, FileText, KeyRound } from 'lucide-react';

export const Login: React.FC = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      error('Validation Error', 'Please enter both username/email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(usernameOrEmail.trim(), password);
      success('Welcome back', `Logged in as ${user.fullName}`);
      navigate(from, { replace: true });
    } catch (err) {
      error('Authentication Failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (u: string, p: string) => {
    setUsernameOrEmail(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-vault-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-vault-700 to-vault-500 flex items-center justify-center text-white shadow-xl shadow-vault-900/30">
            <Shield className="w-8 h-8" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Digital Document Vault
        </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          Secure enterprise document management with strict RBAC & audited access
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="usernameOrEmail" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Username or Email
              </label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="usernameOrEmail"
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="name@vault.local"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-vault-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-vault-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-vault-800 hover:bg-vault-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vault-600 transition shadow-md shadow-vault-900/10 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-vault-600 hover:text-vault-700 underline">
              Register now
            </Link>
          </div>

          {/* Quick Demo Account Shortcuts */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
              <KeyRound className="w-3.5 h-3.5 text-vault-600" />
              <span>Select Demo Account</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoAccount('owner@vault.local', 'OwnerPassword123!')}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-vault-50 hover:border-vault-300 text-left transition group"
              >
                <div className="flex items-center gap-1 font-semibold text-slate-800 group-hover:text-vault-800">
                  <FileText className="w-3.5 h-3.5 text-vault-600" />
                  <span>Doc Owner</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">owner@vault.local</p>
              </button>

              <button
                type="button"
                onClick={() => setDemoAccount('colleague@vault.local', 'ColleaguePassword123!')}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-vault-50 hover:border-vault-300 text-left transition group"
              >
                <div className="flex items-center gap-1 font-semibold text-slate-800 group-hover:text-vault-800">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Shared User</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">colleague@vault.local</p>
              </button>

              <button
                type="button"
                onClick={() => setDemoAccount('vaultadmin@vault.local', 'VaultAdminPass123!')}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-vault-50 hover:border-vault-300 text-left transition group"
              >
                <div className="flex items-center gap-1 font-semibold text-slate-800 group-hover:text-vault-800">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Vault Admin</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">vaultadmin@vault.local</p>
              </button>

              <button
                type="button"
                onClick={() => setDemoAccount('sysadmin@vault.local', 'SysAdminPass123!')}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-vault-50 hover:border-vault-300 text-left transition group"
              >
                <div className="flex items-center gap-1 font-semibold text-slate-800 group-hover:text-vault-800">
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                  <span>System Admin</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">sysadmin@vault.local</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
