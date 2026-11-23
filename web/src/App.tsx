import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Clapperboard, LogOut } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { sb } from './lib/supabase';
import { Button } from './components/ui';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import NewProject from './pages/NewProject';
import Editor from './pages/Editor';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined) return null;
  if (!session) return <Auth />;
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight"><Clapperboard className="h-5 w-5 text-violet-400" />CineFlow<span className="text-violet-400">AI</span></Link>
          <Button variant="ghost" onClick={() => sb.auth.signOut()}><LogOut className="h-4 w-4" />Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8">
        <Routes><Route path="/" element={<Dashboard />} /><Route path="/new" element={<NewProject />} /><Route path="/p/:id" element={<Editor />} /></Routes>
      </main>
    </>
  );
}
