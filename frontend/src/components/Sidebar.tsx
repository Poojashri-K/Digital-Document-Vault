import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  // Close mobile drawer on link click only on mobile viewports (< 1024px)
  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Determine active item state reliably across route variants
  const isDashboardActive = location.pathname === '/' || location.pathname === '/dashboard';
  const isMyDocumentsActive =
    location.pathname === '/documents' ||
    (location.pathname.startsWith('/documents/') && location.pathname !== '/documents/upload');
  const isUploadActive = location.pathname === '/upload' || location.pathname === '/documents/upload';
  const isSharedActive = location.pathname === '/shared-with-me' || location.pathname === '/shared';
  const isAuditActive = location.pathname === '/admin/audit';
  const isUsersActive = location.pathname === '/admin/users';
  const isProfileActive = location.pathname === '/profile';

  const getNavLinkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 ${
      isActive
        ? 'bg-vault-800 text-white shadow-sm font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
    }`;

  return (
    <>
      {/* Mobile backdrop overlay - only active on viewports < lg */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Persistent desktop sidebar & mobile slide-out drawer */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between overflow-y-auto transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        aria-label="Sidebar Navigation"
      >
        <div className="space-y-6">
          {/* Main Navigation */}
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Workspace
            </p>
            <nav className="space-y-1">
              <NavLink
                to="/dashboard"
                className={getNavLinkClass(isDashboardActive)}
                onClick={handleNavClick}
              >
                <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                <span>Dashboard</span>
              </NavLink>

              {/* Business document operations (Only for Document Owner, Shared User, Vault Admin) */}
              {!isSystemAdmin && (
                <>
                  <NavLink
                    to="/documents"
                    className={getNavLinkClass(isMyDocumentsActive)}
                    onClick={handleNavClick}
                  >
                    <Files className="w-4 h-4 flex-shrink-0" />
                    <span>My Documents</span>
                  </NavLink>

                  <NavLink
                    to="/shared-with-me"
                    className={getNavLinkClass(isSharedActive)}
                    onClick={handleNavClick}
                  >
                    <Share2 className="w-4 h-4 flex-shrink-0" />
                    <span>Shared with Me</span>
                  </NavLink>

                  <NavLink
                    to="/upload"
                    className={getNavLinkClass(isUploadActive)}
                    onClick={handleNavClick}
                  >
                    <Upload className="w-4 h-4 flex-shrink-0" />
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
                <NavLink
                  to="/admin/audit"
                  className={getNavLinkClass(isAuditActive)}
                  onClick={handleNavClick}
                >
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  <span>Audit Logs</span>
                </NavLink>

                {isSystemAdmin && (
                  <NavLink
                    to="/admin/users"
                    className={getNavLinkClass(isUsersActive)}
                    onClick={handleNavClick}
                  >
                    <Users className="w-4 h-4 flex-shrink-0" />
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
              <NavLink
                to="/profile"
                className={getNavLinkClass(isProfileActive)}
                onClick={handleNavClick}
              >
                <UserIcon className="w-4 h-4 flex-shrink-0" />
                <span>Profile Settings</span>
              </NavLink>
            </nav>
          </div>
        </div>

        {/* Security Assurance Card */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl mt-6">
          <div className="flex items-center gap-2 text-vault-800 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-vault-600 flex-shrink-0" />
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
