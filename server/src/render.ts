import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sb } from './lib.js';

const run = (cmd: string, args: string[], cwd?: string) => new Promise<string>((res, rej) => {
  const p = spawn(cmd, args, { cwd }); let out = '', err = '';
  p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d);
  p.on('close', c => c === 0 ? res(out) : rej(new Error(`${cmd} failed: ${err.slice(-400)}`)));
});

export const probeDuration = async (file: string) =>
  parseFloat(await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]));

const SIZES: Record<string, [number, number]> = { '16:9': [1920, 1080], '9:16': [1080, 1920], '1:1': [1080, 1080] };
const ts = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = (s % 60).toFixed(3).replace('.', ',');
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${x.padStart(6, '0')}`; };

// Split narration into ~7-word chunks, timed proportionally to word count.
export function makeSrt(narration: string, duration: number) {
  const words = narration.split(/\s+/).filter(Boolean), chunks: string[] = [];
  for (let i = 0; i < words.length; i += 7) chunks.push(words.slice(i, i + 7).join(' '));
  let t = 0;
  return chunks.map((c, i) => {
    const d = duration * c.split(' ').length / words.length;
    const block = `${i + 1}\n${ts(t)} --> ${ts(t + d)}\n${c}\n`; t += d; return block;
  }).join('\n');
}

async function download(url: string, dest: string) {
  const r = await fetch(url); if (!r.ok) throw new Error(`Download failed ${r.status}`);
  await writeFile(dest, Buffer.from(await r.arrayBuffer()));
}

export async function renderProject(project: any, scenes: any[]) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cf-'));
  const progress = (n: number) => sb.from('projects').update({ render_progress: n, updated_at: new Date().toISOString() }).eq('id', project.id);
  try {
    await sb.from('projects').update({ status: 'rendering', render_progress: 1, render_error: null }).eq('id', project.id);
    const [W, H] = SIZES[project.format] ?? SIZES['16:9'];
    const cs = project.caption_style, align = cs.position === 'top' ? 8 : cs.position === 'middle' ? 5 : 2;
    const colour = cs.color.replace('#', '').match(/../g)!.reverse().join(''); // RRGGBB -> BBGGRR
    const style = `FontSize=${cs.size},PrimaryColour=&H${colour}&,Outline=2,Alignment=${align},MarginV=60`;
    const parts: string[] = [];

    for (const [i, s] of scenes.entries()) {
      if (!s.clip?.url || !s.audio_path) throw new Error(`Scene ${i + 1} needs footage and voiceover`);
      const clip = `clip${i}.mp4`, audio = `a${i}.mp3`, srt = `s${i}.srt`, out = `p${i}.mp4`;
      await download(s.clip.url, path.join(dir, clip));
      const { data, error } = await sb.storage.from('audio').download(s.audio_path);
      if (error) throw error;
      await writeFile(path.join(dir, audio), Buffer.from(await data.arrayBuffer()));
      const dur = await probeDuration(path.join(dir, audio));
      await writeFile(path.join(dir, srt), makeSrt(s.narration, dur));
      const vf = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=30,setsar=1,` +
        `subtitles=${srt}:force_style='${style}',fade=t=in:d=0.4,fade=t=out:st=${Math.max(0, dur - 0.4).toFixed(2)}:d=0.4`;
      await run('ffmpeg', ['-y', '-stream_loop', '-1', '-i', clip, '-i', audio, '-t', dur.toFixed(2), '-vf', vf,
        '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-ar', '44100', '-ac', '2', out], dir);
      parts.push(out);
      await progress(Math.round(((i + 1) / scenes.length) * 90));
    }

    await writeFile(path.join(dir, 'list.txt'), parts.map(p => `file '${p}'`).join('\n'));
    await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', '-movflags', '+faststart', 'final.mp4'], dir);
    const key = `${project.user_id}/${project.id}-${Date.now()}.mp4`;
    const up = await sb.storage.from('renders').upload(key, await readFile(path.join(dir, 'final.mp4')), { contentType: 'video/mp4' });
    if (up.error) throw up.error;
    await sb.from('projects').update({ status: 'done', render_progress: 100, video_path: key }).eq('id', project.id);
  } catch (e: any) {
    await sb.from('projects').update({ status: 'failed', render_error: String(e.message ?? e).slice(0, 500) }).eq('id', project.id);
  } finally { await rm(dir, { recursive: true, force: true }); }
}
