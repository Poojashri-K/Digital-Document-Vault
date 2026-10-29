export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    }).format(d) + ' UTC';
  } catch {
    return isoString;
  }
}

export function formatRelativeDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 7) return formatDate(isoString);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  } catch {
    return isoString;
  }
}

export function isExpired(isoString: string | null | undefined): boolean {
  if (!isoString) return false;
  try {
    return new Date(isoString).getTime() <= Date.now();
  } catch {
    return false;
  }
}

export function getFileCategory(contentType?: string, fileName?: string): 'pdf' | 'image' | 'word' | 'excel' | 'text' | 'unknown' {
  const ct = (contentType || '').toLowerCase();
  const fn = (fileName || '').toLowerCase();

  if (ct.includes('pdf') || fn.endsWith('.pdf')) return 'pdf';
  if (ct.includes('image') || fn.endsWith('.png') || fn.endsWith('.jpg') || fn.endsWith('.jpeg')) return 'image';
  if (ct.includes('word') || fn.endsWith('.docx')) return 'word';
  if (ct.includes('spreadsheet') || ct.includes('excel') || fn.endsWith('.xlsx')) return 'excel';
  if (ct.includes('text') || ct.includes('csv') || fn.endsWith('.txt') || fn.endsWith('.csv')) return 'text';
  return 'unknown';
}
