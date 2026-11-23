import { useState } from 'react';
import { Clapperboard } from 'lucide-react';
import { sb } from '../lib/supabase';
import { Button, Card, Input } from '../components/ui';

export default function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setMsg('');
    const { error } = mode === 'in' ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password });
    if (error) setMsg(error.message); else if (mode === 'up') setMsg('Account created. If email confirmation is on, check your inbox, then sign in.');
    setBusy(false);
  }
  return (
    <div className="grid min-h-screen place-items-center p-5">
      <Card className="w-full max-w-sm animate-up space-y-4">
        <div className="text-center"><Clapperboard className="mx-auto h-8 w-8 text-violet-400" />
          <h1 className="mt-2 text-2xl font-extrabold">CineFlow<span className="text-violet-400">AI</span></h1>
          <p className="text-sm text-white/50">Script in. Cinematic video out.</p></div>
        <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input type="password" placeholder="Password (min 6)" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        {msg && <p className="text-sm text-amber-300">{msg}</p>}
        <Button className="w-full" loading={busy} onClick={submit}>{mode === 'in' ? 'Sign in' : 'Create account'}</Button>
        <button className="w-full text-xs text-white/50 hover:text-white" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'No account? Sign up' : 'Have an account? Sign in'}</button>
      </Card>
    </div>
  );
}
