// ─── Helpers ─────────────────────────────────────────────────────────────────

export const API_URL = "http://localhost:5000/api/v1";
export const GET_TIMEOUT = 120; // seconds
export const POST_TIMEOUT = 300; // seconds

export function cn(...args) { return args.filter(Boolean).join(' '); }

export async function apiRequest(endpoint, method = 'GET', data = null, files = null) {
  const url = `${API_URL}${endpoint}`;
  try {
    let response;
    const opts = { method };
    if (method === 'GET') {
      response = await fetch(url, { ...opts, signal: AbortSignal.timeout(GET_TIMEOUT * 1000) });
    } else if (files) {
      const fd = new FormData();
      for (const [k, v] of Object.entries(files)) fd.append(k, v);
      response = await fetch(url, { ...opts, body: fd, signal: AbortSignal.timeout(POST_TIMEOUT * 1000) });
    } else {
      response = await fetch(url, { ...opts, body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(POST_TIMEOUT * 1000) });
    }
    if (response.ok) return await response.json();
    return null;
  } catch { return null; }
}

export async function checkHealth() {
  try {
    const r = await fetch(API_URL.replace('/api/v1', '') + '/health', { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}

export function fmtVal(v) {
  if (v == null) return 'N/A';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') {
    if (v > 1e6) return `$${v.toLocaleString('en', { maximumFractionDigits: 0 })}`;
    if (v > 1e3) return v.toLocaleString('en', { maximumFractionDigits: 0 });
    if (!Number.isInteger(v)) return v.toFixed(2);
    return String(v);
  }
  return String(v);
}
