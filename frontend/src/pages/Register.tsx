import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { Shield, User as UserIcon, Mail, Lock, ArrowRight, Check, X } from 'lucide-react';

export const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { success, error } = useToast();
  const navigate = useNavigate();

  const isPasswordLongEnough = password.length >= 12;
  const hasMixedChars = /[a-zA-Z]/.test(password) && /[0-9!@#$%^&*]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordLongEnough) {
      error('Weak Password', 'Password must be at least 12 characters as mandated by security requirements.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/register', {
        username: username.trim(),
        email: email.trim(),
        fullName: fullName.trim(),
        password,
      });

      success('Account Created', 'Registration successful! Please sign in with your credentials.');
      navigate('/login');
    } catch (err) {
      error('Registration Failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-vault-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-vault-700 to-vault-500 flex items-center justify-center text-white shadow-xl shadow-vault-900/30">
            <Shield className="w-8 h-8" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Create Vault Account
        </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          Enforces 12+ character adaptive salted password hashing
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-100">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Full Name
              </label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alice Smith"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-vault-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Username
              </label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alice_smith"
                  pattern="^[a-zA-Z0-9_.-]+$"
                  title="Alphanumeric, underscores, hyphens, and dots only"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-vault-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Email Address
              </label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alice@company.com"
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
                  placeholder="At least 12 characters"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-vault-500 focus:bg-white transition"
                />
              </div>

              {/* Password Policy Checklist */}
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px]">
                  {isPasswordLongEnough ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span className={isPasswordLongEnough ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                    Minimum 12 characters (Security Policy)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  {hasMixedChars ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span className={hasMixedChars ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                    Letters and numbers/special characters
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordLongEnough}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mt-2 rounded-xl text-sm font-semibold text-white bg-vault-800 hover:bg-vault-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vault-600 transition shadow-md shadow-vault-900/10 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-vault-600 hover:text-vault-700 underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
