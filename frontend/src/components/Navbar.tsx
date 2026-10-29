import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RoleBadge } from './Badge';
import { Shield, User as UserIcon, LogOut, ChevronDown, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface NavbarProps {
  onMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-vault-800 to-vault-600 flex items-center justify-center text-white shadow-md shadow-vault-900/10 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base leading-none block">
                Digital Document Vault
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase block mt-0.5">
                Enterprise Mini-Project
              </span>
            </div>
          </Link>
        </div>

        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 p-1.5 pl-2.5 rounded-xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-900 leading-tight">{user.fullName}</p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <RoleBadge role={user.role} />
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-vault-100 text-vault-800 flex items-center justify-center font-bold text-xs border border-vault-200">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fade-in">
                <div className="px-4 py-2.5 border-b border-slate-100 sm:hidden">
                  <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  <div className="mt-1.5">
                    <RoleBadge role={user.role} />
                  </div>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>My Profile</span>
                </Link>

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
