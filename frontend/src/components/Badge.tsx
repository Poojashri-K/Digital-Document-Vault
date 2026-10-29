import React from 'react';
import { PermissionType, Role, UserStatus, DocumentStatus } from '../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'purple';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'slate', size = 'sm' }) => {
  const variantStyles = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
};

export const RoleBadge: React.FC<{ role: Role }> = ({ role }) => {
  switch (role) {
    case 'ROLE_SYSTEM_ADMIN':
      return <Badge variant="purple">System Admin</Badge>;
    case 'ROLE_VAULT_ADMIN':
      return <Badge variant="blue">Vault Admin</Badge>;
    case 'ROLE_USER':
      return <Badge variant="slate">User</Badge>;
    default:
      return <Badge>{role}</Badge>;
  }
};

export const PermissionBadge: React.FC<{ permission: PermissionType | 'OWNER'; isExpired?: boolean; isRevoked?: boolean }> = ({
  permission,
  isExpired,
  isRevoked,
}) => {
  if (isRevoked) {
    return <Badge variant="rose">Revoked</Badge>;
  }
  if (isExpired) {
    return <Badge variant="amber">Expired</Badge>;
  }
  switch (permission) {
    case 'OWNER':
      return <Badge variant="purple">Owner</Badge>;
    case 'DOWNLOAD':
      return <Badge variant="emerald">Download</Badge>;
    case 'VIEW':
      return <Badge variant="blue">View Only</Badge>;
    default:
      return <Badge>{permission}</Badge>;
  }
};

export const StatusBadge: React.FC<{ status: UserStatus | DocumentStatus }> = ({ status }) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="emerald">Active</Badge>;
    case 'LOCKED':
      return <Badge variant="rose">Locked</Badge>;
    case 'DISABLED':
      return <Badge variant="amber">Disabled</Badge>;
    case 'ARCHIVED':
      return <Badge variant="amber">Archived</Badge>;
    case 'DELETED':
      return <Badge variant="rose">Deleted</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};
