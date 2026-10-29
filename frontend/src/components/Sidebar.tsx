import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Files,
  Upload,
  Share2,
  ShieldCheck,
  Users,
  User as UserIcon,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isVaultAdmin, isSystemAdmin } = useAuth();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-brand-800 text-white shadow-sm'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Main Navigation */}
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Workspace
            </p>
            <nav className="space-y-1">
              <NavLink to="/" end className={navLinkClass} onClick={onClose}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>

              {/* Business document operations (Only for Document Owner, Shared User, Vault Admin) */}
              {!isSystemAdmin && (
                <>
                  <NavLink to="/documents" className={navLinkClass} onClick={onClose}>
                    <Files className="w-4 h-4" />
                    <span>My Documents</span>
                  </NavLink>
                  <NavLink to="/shared-with-me" className={navLinkClass} onClick={onClose}>
                    <Share2 className="w-4 h-4" />
                    <span>Shared with Me</span>
                  </NavLink>
                  <NavLink to="/upload" className={navLinkClass} onClick={onClose}>
                    <Upload className="w-4 h-4" />
                    <span>Upload Document</span>
                  </NavLink>
                </>
              )}
            </nav>
          </div>

          {/* Administration Section */}
          {(isVaultAdmin || isSystemAdmin) && (
            <div>
              <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Administration
              </p>
              <nav className="space-y-1">
                <NavLink to="/admin/audit" className={navLinkClass} onClick={onClose}>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Audit Logs</span>
                </NavLink>

                {isSystemAdmin && (
                  <NavLink to="/admin/users" className={navLinkClass} onClick={onClose}>
                    <Users className="w-4 h-4" />
                    <span>User Management</span>
                  </NavLink>
                )}
              </nav>
            </div>
          )}

          {/* System & Support */}
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Account
            </p>
            <nav className="space-y-1">
              <NavLink to="/profile" className={navLinkClass} onClick={onClose}>
                <UserIcon className="w-4 h-4" />
                <span>Profile Settings</span>
              </NavLink>
            </nav>
          </div>
        </div>

        {/* Security Assurance Badge */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div className="flex items-center gap-2 text-brand-800 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span>Vault Security Active</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Path traversal sanitization, magic bytes detection & strict RBAC enforced.
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
