import { sb } from './supabase';
async function call(method: string, path: string, body?: unknown) {
  const { data } = await sb.auth.getSession();
  const r = await fetch(`${import.meta.env.VITE_API_URL}/api${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
    body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `Request failed (${r.status})`);
  return j;
}
export const api = { get: (p: string) => call('GET', p), post: (p: string, b?: unknown) => call('POST', p, b ?? {}) };
