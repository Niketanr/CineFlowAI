import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sb } from '../lib/supabase';
import { Button, Card, Input, Label, Select, Textarea, cn } from '../components/ui';

export default function NewProject() {
  const nav = useNavigate();
  const [f, setF] = useState({ title: '', script: '', format: '16:9', style: 'cinematic', target_duration: 60 });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = (k: string, v: any) => setF(s => ({ ...s, [k]: v }));
  async function create() {
    if (!f.title.trim() || f.script.trim().length < 30) return setErr('Add a title and a script (at least 30 characters).');
    setBusy(true); setErr('');
    const { data, error } = await sb.from('projects').insert(f).select('id').single();
    if (error) { setErr(error.message); setBusy(false); } else nav(`/p/${data.id}`);
  }
  return (
    <Card className="mx-auto max-w-3xl animate-up space-y-5">
      <h1 className="text-2xl font-bold">New video</h1>
      <div><Label>Title</Label><Input value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. The Future of Solar Energy" /></div>
      <div><Label>Script</Label><Textarea rows={10} value={f.script} onChange={e => set('script', e.target.value)} placeholder="Paste your script here…" /></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><Label>Format</Label><div className="flex gap-2">{['16:9', '9:16', '1:1'].map(x => <button key={x} onClick={() => set('format', x)} className={cn('flex-1 rounded-lg border px-2 py-2 text-sm', f.format === x ? 'border-violet-400 bg-violet-500/20' : 'border-white/10')}>{x}</button>)}</div></div>
        <div><Label>Style</Label><Select value={f.style} onChange={e => set('style', e.target.value)}>{['cinematic', 'documentary', 'energetic', 'minimal', 'corporate', 'storytelling'].map(s => <option key={s}>{s}</option>)}</Select></div>
        <div><Label>Target duration</Label><Select value={f.target_duration} onChange={e => set('target_duration', +e.target.value)}>{[15, 30, 60, 90, 120, 180].map(s => <option key={s} value={s}>{s} seconds</option>)}</Select></div>
      </div>
      {err && <p className="text-sm text-red-300">{err}</p>}
      <Button loading={busy} onClick={create}>Create &amp; generate scenes</Button>
    </Card>
  );
}
