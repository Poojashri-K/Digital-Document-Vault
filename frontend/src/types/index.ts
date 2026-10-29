export type Role = 'ROLE_USER' | 'ROLE_VAULT_ADMIN' | 'ROLE_SYSTEM_ADMIN';
export type UserStatus = 'ACTIVE' | 'LOCKED' | 'DISABLED';
export type DocumentStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';
export type PermissionType = 'VIEW' | 'DOWNLOAD';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  description: string | null;
  status: DocumentStatus;
  currentVersionNumber: number;
  currentFileName: string;
  currentFileSizeBytes: number;
  currentContentType: string;
  ownerId: string;
  ownerUsername: string;
  ownerFullName: string;
  sharedPermissionType: PermissionType | null;
  sharedExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  versionNumber: number;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
  checksumSha256: string;
  uploadedById: string;
  uploadedByUsername: string;
  createdAt: string;
}

export interface DocumentPermissionItem {
  id: string;
  userId: string;
  username: string;
  email: string;
  fullName: string;
  permissionType: PermissionType;
  grantedById: string;
  grantedByUsername: string;
  expiresAt: string | null;
  revokedAt: string | null;
  active: boolean;
  expired: boolean;
  createdAt: string;
}

export interface DocumentDetail {
  id: string;
  title: string;
  description: string | null;
  status: DocumentStatus;
  ownerId: string;
  ownerUsername: string;
  ownerFullName: string;
  userPermission: PermissionType | 'OWNER';
  isOwner: boolean;
  versions: DocumentVersion[];
  permissions: DocumentPermissionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ShareResponse {
  id: string;
  documentId: string;
  documentTitle: string;
  recipientId: string;
  recipientUsername: string;
  recipientEmail: string;
  recipientFullName: string;
  permissionType: PermissionType;
  grantedById: string;
  grantedByUsername: string;
  expiresAt: string | null;
  revokedAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface AuditEventItem {
  id: string;
  eventType: string;
  actorId: string | null;
  actorUsername: string;
  resourceType: string | null;
  resourceId: string | null;
  actionDetails: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string;
  createdAt: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  correlationId: string;
  path: string;
  validationErrors?: Record<string, string>;
}
