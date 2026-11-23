create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  title text not null,
  script text not null,
  format text not null default '16:9' check (format in ('16:9','9:16','1:1')),
  style text not null default 'cinematic',
  target_duration int not null default 60,
  voice text not null default 'alloy',
  language text not null default 'en',
  caption_style jsonb not null default '{"size":28,"color":"FFFFFF","position":"bottom"}',
  status text not null default 'draft' check (status in ('draft','scenes','voiced','rendering','done','failed')),
  render_progress int not null default 0,
  render_error text,
  video_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  position int not null,
  narration text not null,
  visual text,
  keywords text[] not null default '{}',
  clip jsonb,            -- {id,title,thumbnail,preview,url}
  audio_path text,
  duration real
);
alter table projects enable row level security;
alter table scenes enable row level security;
create policy "own projects" on projects for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own scenes" on scenes for all
  using (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()));
alter publication supabase_realtime add table projects;
insert into storage.buckets (id, name, public) values ('audio','audio',false),('renders','renders',false) on conflict do nothing;

-- let users read their own audio/render files (paths start with the user id)
create policy "read own audio" on storage.objects for select
  using (bucket_id in ('audio','renders') and (storage.foldername(name))[1] = auth.uid()::text);
