import React, { useState } from 'react';
import {
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, getErrorMessage } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { formatDate } from '../utils/formatters';

export const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { success, error: showError } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Password rules validation
  const isLengthValid = newPassword.length >= 12;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const isPasswordValid = isLengthValid && hasUpper && hasLower && hasNumber && hasSymbol;
  const passwordsMatch = newPassword === confirmPassword;

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showError('Validation Error', 'Full name cannot be empty.');
      return;
    }

    try {
      setSavingProfile(true);
      await api.put('/api/profile', {
        fullName: fullName.trim(),
      });

      success('Profile Updated', 'Your full name has been updated.');
      await refreshUser();
    } catch (err: unknown) {
      showError('Update Failed', getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      showError('Validation Error', 'Please enter your current password.');
      return;
    }

    if (!isPasswordValid) {
      showError('Validation Error', 'New password must satisfy all security complexity rules.');
      return;
    }

    if (!passwordsMatch) {
      showError('Validation Error', 'New passwords do not match.');
      return;
    }

    try {
      setSavingPassword(true);
      await api.put('/api/profile', {
        fullName: user?.fullName || user?.username,
        currentPassword,
        newPassword,
      });

      success('Password Changed', 'Your security password has been updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      showError('Password Change Failed', getErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <User className="w-6 h-6 text-brand-600" />
          User Profile & Security
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your vault identity, session security credentials, and access credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Account Overview Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-center space-y-4">
            <div className="w-20 h-20 bg-brand-50 border-2 border-brand-200 text-brand-700 rounded-full flex items-center justify-center font-bold text-2xl mx-auto">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : user?.username.charAt(0).toUpperCase()}
            </div>

            <div>
              <h2 className="font-bold text-slate-900 text-lg">{user?.fullName || user?.username}</h2>
              <span className="text-xs text-slate-400 font-mono block mt-0.5">{user?.email}</span>
            </div>

            <div className="pt-2 flex justify-center">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-800 border border-brand-200">
                {user?.role}
              </span>
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Account Status:</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {user?.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Member Since:</span>
                <span className="font-medium text-slate-700">
                  {user?.createdAt ? formatDate(user.createdAt) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Settings & Password Change */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Name Form */}
          <form onSubmit={handleUpdateName} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              Personal Information
            </h3>

            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                disabled
                value={user?.username || ''}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm font-mono cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 mt-1">Username is fixed and used for authentication.</p>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="fullname" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                id="fullname"
                type="text"
                required
                maxLength={150}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                {savingProfile ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Change Password Form */}
          <form onSubmit={handleChangePassword} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-brand-600" />
              Change Security Password
            </h3>
            <p className="text-xs text-slate-500">
              Passwords require at least 12 characters with uppercase, lowercase, numbers, and symbols.
            </p>

            <div>
              <label htmlFor="curr-pass" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Current Password <span className="text-red-500">*</span>
              </label>
              <input
                id="curr-pass"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter existing password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <div>
              <label htmlFor="new-pass" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                New Password <span className="text-red-500">*</span>
              </label>
              <input
                id="new-pass"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 12 characters"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />

              {/* Password complexity checklist */}
              <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                <span className="font-semibold text-slate-700 block">Password Requirements:</span>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>12+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Lowercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Numeric digit</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Special character</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-pass" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <input
                id="confirm-pass"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Passwords do not match.
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingPassword || !isPasswordValid || !passwordsMatch || !currentPassword}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                {savingPassword ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Update Security Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
