import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { sb, auth, ownProject, type AuthedReq } from './lib.js';
import { generateScenes, searchCoverr, tts } from './ai.js';
import { renderProject, probeDuration } from './render.js';
import { writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN }), express.json({ limit: '1mb' }));
const uid = (r: express.Request) => (r as AuthedReq).userId;
const h = (fn: express.RequestHandler): express.RequestHandler => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((e: any) => res.status(e.status ?? 500).json({ error: e.message ?? 'Server error' }));

app.get('/health', (_q, r) => { r.json({ ok: true }); });

// Step 3: script -> scenes (replaces existing scenes)
app.post('/api/projects/:id/scenes', auth, h(async (req, res) => {
  const p = await ownProject(req.params.id, uid(req));
  const scenes = await generateScenes(p);
  await sb.from('scenes').delete().eq('project_id', p.id);
  const { data, error } = await sb.from('scenes').insert(scenes.map((s, i) => ({ project_id: p.id, position: i, ...s }))).select();
  if (error) throw error;
  await sb.from('projects').update({ status: 'scenes' }).eq('id', p.id);
  res.json({ scenes: data });
}));

// Step 4: b-roll search (per scene keywords, or custom ?q= to find alternatives)
app.get('/api/projects/:id/scenes/:sceneId/broll', auth, h(async (req, res) => {
  const p = await ownProject(req.params.id, uid(req));
  const { data: s } = await sb.from('scenes').select('*').eq('id', req.params.sceneId).eq('project_id', p.id).single();
  if (!s) return res.status(404).json({ error: 'Scene not found' });
  const q = String(req.query.q ?? s.keywords.join(' '));
  res.json({ results: await searchCoverr(q, p.format, Number(req.query.page ?? 1)) });
}));

// Step 4b: auto-pick the first result for every scene without footage
app.post('/api/projects/:id/broll/auto', auth, h(async (req, res) => {
  const p = await ownProject(req.params.id, uid(req));
  const { data: scenes } = await sb.from('scenes').select('*').eq('project_id', p.id).is('clip', null);
  for (const s of scenes ?? []) {
    const results = await searchCoverr(s.keywords.join(' '), p.format);
    if (results[0]) await sb.from('scenes').update({ clip: results[0] }).eq('id', s.id);
  }
  res.json({ ok: true });
}));

// Step 5+6: voiceover per scene; stores real audio duration (drives subtitles + timeline)
app.post('/api/projects/:id/voiceover', auth, h(async (req, res) => {
  const body = z.object({ voice: z.string().default('alloy'), language: z.string().default('en') }).parse(req.body);
  const p = await ownProject(req.params.id, uid(req));
  const { data: scenes } = await sb.from('scenes').select('*').eq('project_id', p.id).order('position');
  for (const s of scenes ?? []) {
    const mp3 = await tts(s.narration, body.voice, body.language);
    const key = `${p.user_id}/${p.id}/${s.id}.mp3`, tmp = path.join(tmpdir(), `${s.id}.mp3`);
    const up = await sb.storage.from('audio').upload(key, mp3, { contentType: 'audio/mpeg', upsert: true });
    if (up.error) throw up.error;
    await writeFile(tmp, mp3); const duration = await probeDuration(tmp); await rm(tmp);
    await sb.from('scenes').update({ audio_path: key, duration }).eq('id', s.id);
  }
  await sb.from('projects').update({ voice: body.voice, language: body.language, status: 'voiced' }).eq('id', p.id);
  res.json({ ok: true });
}));

// Step 8: render (async job; client watches projects.render_progress via Supabase Realtime or polling)
app.post('/api/projects/:id/render', auth, h(async (req, res) => {
  const p = await ownProject(req.params.id, uid(req));
  if (p.status === 'rendering') return res.status(409).json({ error: 'Already rendering' });
  const { data: scenes } = await sb.from('scenes').select('*').eq('project_id', p.id).order('position');
  if (!scenes?.length) return res.status(400).json({ error: 'No scenes' });
  res.status(202).json({ started: true });
  renderProject(p, scenes);
}));

// Step 9: signed download link
app.get('/api/projects/:id/download', auth, h(async (req, res) => {
  const p = await ownProject(req.params.id, uid(req));
  if (!p.video_path) return res.status(404).json({ error: 'Not rendered yet' });
  const { data, error } = await sb.storage.from('renders').createSignedUrl(p.video_path, 3600, { download: `${p.title}.mp4` });
  if (error) throw error;
  res.json({ url: data.signedUrl });
}));

app.listen(process.env.PORT ?? 8080, () => console.log('CineFlow server up'));
