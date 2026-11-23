import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Film, Pencil, Plus, Trash2 } from 'lucide-react';
import { sb } from '../lib/supabase';
import { Button, Card } from '../components/ui';

const badge: Record<string, string> = { draft: 'bg-white/10', scenes: 'bg-sky-500/20 text-sky-300', voiced: 'bg-amber-500/20 text-amber-300', rendering: 'bg-violet-500/20 text-violet-300', done: 'bg-emerald-500/20 text-emerald-300', failed: 'bg-red-500/20 text-red-300' };

export default function Dashboard() {
  const [items, setItems] = useState<any[] | null>(null); const nav = useNavigate();
  const load = () => sb.from('projects').select('*').order('updated_at', { ascending: false }).then(({ data }) => setItems(data ?? []));
  useEffect(() => { load(); }, []);
  async function rename(p: any) { const t = prompt('Rename project', p.title); if (t?.trim()) { await sb.from('projects').update({ title: t.trim() }).eq('id', p.id); load(); } }
  async function del(p: any) { if (confirm(`Delete "${p.title}"? This cannot be undone.`)) { await sb.from('projects').delete().eq('id', p.id); load(); } }
  return (
    <div className="animate-up">
      <section className="glass relative overflow-hidden rounded-3xl p-8 md:p-12">
        <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight md:text-5xl">Turn any script into a <span className="bg-gradient-to-r from-violet-400 to-amber-300 bg-clip-text text-transparent">cinematic video</span>.</h1>
        <p className="mt-3 max-w-xl text-white/60">AI scenes, real stock footage, natural voiceover and subtitles, rendered to MP4.</p>
        <Button className="mt-6" onClick={() => nav('/new')}><Plus className="h-4 w-4" />New video</Button>
      </section>
      <h2 className="mb-4 mt-10 text-lg font-semibold">Recent projects</h2>
      {items === null ? <p className="text-white/40">Loading…</p> : items.length === 0 ? <Card className="text-center text-white/50">No projects yet. Create your first video above.</Card> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(p => (
            <Card key={p.id} className="space-y-3 transition hover:border-violet-400/40">
              <Link to={`/p/${p.id}`} className="block"><div className="grid aspect-video place-items-center rounded-xl bg-gradient-to-br from-violet-900/40 to-black"><Film className="h-8 w-8 text-white/30" /></div>
                <div className="mt-3 truncate font-semibold">{p.title}</div></Link>
              <div className="flex items-center justify-between text-xs text-white/50">
                <span className={`rounded-full px-2 py-0.5 ${badge[p.status]}`}>{p.status}</span><span>{p.format} · {p.target_duration}s</span>
                <span className="flex"><Button variant="ghost" className="px-2" onClick={() => rename(p)}><Pencil className="h-4 w-4" /></Button><Button variant="danger" className="px-2" onClick={() => del(p)}><Trash2 className="h-4 w-4" /></Button></span>
              </div>
            </Card>))}
        </div>)}
    </div>
  );
}
