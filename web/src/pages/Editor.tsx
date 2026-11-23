import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { sb } from '../lib/supabase';
import { api } from '../lib/api';
import {
  Button,
  Card,
  Input,
  Label,
  Select,
  Textarea,
  cn,
} from '../components/ui';

const STEPS = ['Scenes', 'B-roll', 'Voice', 'Captions', 'Render'];

const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

const LANGS: [string, string][] = [
  ['en', 'English'],
  ['hi', 'Hindi'],
  ['ta', 'Tamil'],
  ['te', 'Telugu'],
  ['kn', 'Kannada'],
  ['ml', 'Malayalam'],
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['de', 'German'],
];

const ASPECT: Record<string, string> = {
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16] max-h-[60vh] mx-auto',
  '1:1': 'aspect-square',
};

function Signed({
  bucket,
  path,
  kind,
  v,
}: {
  bucket: string;
  path: string;
  kind: 'audio' | 'video';
  v?: any;
}) {
  const [u, setU] = useState('');

  useEffect(() => {
    sb.storage
      .from(bucket)
      .createSignedUrl(path, 3600)
      .then((r) => setU(r.data?.signedUrl ?? ''));
  }, [path, v]);

  if (!u) return null;

  return kind === 'audio' ? (
    <audio controls src={u} className="h-8 w-full" />
  ) : (
    <video controls src={u} className="w-full rounded-xl" />
  );
}

function BrollPicker({ pid, scene, onPick, onClose }: any) {
  const [q, setQ] = useState(scene.keywords.join(' '));
  const [res, setRes] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const search = async () => {
    setBusy(true);
    setErr('');

    try {
      const response = await api.get(
        `/projects/${pid}/scenes/${scene.id}/broll?q=${encodeURIComponent(q)}`
      );

      setRes(response.results);
    } catch (e: any) {
      setErr(e.message);
    }

    setBusy(false);
  };

  useEffect(() => {
    search();
  }, []);

  return (
    <div
      className="fixed inset-0 z-30 grid place-items-center bg-black/70 p-4"
      onClick={onClose}
    >
      <Card className="max-h-[85vh] w-full max-w-4xl space-y-4 overflow-auto bg-[#0f0f16]">
        <div
          onClick={(e) => e.stopPropagation()}
          className="space-y-4"
        >
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
            />

            <Button onClick={search} loading={busy}>
              <Search className="h-4 w-4" />
              Search
            </Button>

            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {err && (
            <p className="text-sm text-red-300">
              {err}{' '}
              <button className="underline" onClick={search}>
                Retry
              </button>
            </p>
          )}

          {!busy && !err && res.length === 0 && (
            <p className="text-white/50">
              No footage found. Try different keywords.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {res.map((c) => (
              <button
                key={c.id}
                onClick={() => onPick(c)}
                className="group relative overflow-hidden rounded-xl border border-white/10 text-left hover:border-violet-400"
              >
                <video
                  src={c.preview}
                  poster={c.thumbnail}
                  muted
                  loop
                  playsInline
                  className="aspect-video w-full object-cover"
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => e.currentTarget.pause()}
                />

                <div className="truncate p-2 text-xs text-white/70">
                  {c.title}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function Editor() {
  const { id } = useParams();

  const [p, setP] = useState<any>(null);
  const [scenes, setScenes] = useState<any[]>([]);

  const [step, setStep] = useState(0);
  const [sel, setSel] = useState(0);
  const [picking, setPicking] = useState<any>(null);

  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const retry = useRef<null | (() => void)>(null);

  const [voice, setVoice] = useState('alloy');
  const [lang, setLang] = useState('en');

  const load = useCallback(async () => {
    const { data: pr, error: projectError } = await sb
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (projectError) throw projectError;

    const { data: sc, error: scenesError } = await sb
      .from('scenes')
      .select('*')
      .eq('project_id', id)
      .order('position');

    if (scenesError) throw scenesError;

    setP(pr);
    setScenes(sc ?? []);

    return {
      pr,
      sc: sc ?? [],
    };
  }, [id]);

  const run = async (label: string, fn: () => Promise<any>) => {
    retry.current = () => run(label, fn);

    setBusy(label);
    setErr('');

    try {
      await fn();
      await load();
    } catch (e: any) {
      setErr(e.message);
    }

    setBusy('');
  };

  // FIX: Make upd return a real Promise and handle Supabase errors.
  const upd = async (sid: string, patch: any): Promise<void> => {
    const { error } = await sb
      .from('scenes')
      .update(patch)
      .eq('id', sid);

    if (error) {
      throw error;
    }
  };

  useEffect(() => {
    load().then(({ pr, sc }) => {
      if (pr) {
        setVoice(pr.voice);
        setLang(pr.language);
      }

      if (pr && sc.length === 0 && pr.status === 'draft') {
        run(
          'Analyzing your script into scenes…',
          () => api.post(`/projects/${id}/scenes`)
        );
      }
    });
  }, [id]);

  useEffect(() => {
    if (p?.status !== 'rendering') return;

    const t = setInterval(load, 2000);

    return () => clearInterval(t);
  }, [p?.status]);

  if (!p) {
    return <p className="text-white/50">Loading…</p>;
  }

  const cur = scenes[sel];
  const cs = p.caption_style;

  const ready =
    scenes.length > 0 &&
    scenes.every((s) => s.clip && s.audio_path);

  const move = (i: number, d: number) => {
    const a = scenes[i];
    const b = scenes[i + d];

    if (b) {
      run('Reordering…', () =>
        Promise.all([
          upd(a.id, { position: b.position }),
          upd(b.id, { position: a.position }),
        ])
      );
    }
  };

  const total = scenes.reduce(
    (n, s) => n + (s.duration ?? 5),
    0
  );

  return (
    <div className="animate-up space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{p.title}</h1>
          <p className="text-sm text-white/50">
            {p.format} · {p.style} · target {p.target_duration}s
          </p>
        </div>

        <div className="glass flex rounded-xl p-1">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm',
                step === i
                  ? 'bg-violet-500/30 text-white'
                  : 'text-white/50 hover:text-white'
              )}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>
      </div>

      {busy && (
        <div className="glass flex items-center gap-3 rounded-xl px-4 py-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
          {busy}
        </div>
      )}

      {err && (
        <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span>{err}</span>

          <Button
            variant="outline"
            onClick={() => retry.current?.()}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {step === 0 && (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  run(
                    'Regenerating scenes…',
                    () => api.post(`/projects/${id}/scenes`)
                  )
                }
              >
                <Wand2 className="h-4 w-4" />
                {scenes.length ? 'Regenerate scenes' : 'Generate scenes'}
              </Button>

              {scenes.map((s, i) => (
                <Card
                  key={s.id}
                  className={cn(
                    'space-y-2',
                    i === sel && 'border-violet-400/50'
                  )}
                >
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <button
                      onClick={() => setSel(i)}
                      className="font-semibold text-white/80"
                    >
                      Scene {i + 1}
                    </button>

                    <span className="flex">
                      <Button
                        variant="ghost"
                        className="px-2"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        className="px-2"
                        disabled={i === scenes.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>

                      {/* FIX: Async callback returns a Promise */}
                      <Button
                        variant="danger"
                        className="px-2"
                        onClick={() =>
                          run('Deleting…', async () => {
                            const { error } = await sb
                              .from('scenes')
                              .delete()
                              .eq('id', s.id);

                            if (error) {
                              throw error;
                            }
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  </div>

                  <Textarea
                    rows={3}
                    defaultValue={s.narration}
                    key={s.id + s.narration}
                    onBlur={(e) =>
                      e.target.value !== s.narration &&
                      run('Saving…', () =>
                        upd(s.id, {
                          narration: e.target.value,
                          audio_path: null,
                          duration: null,
                        })
                      )
                    }
                  />

                  <p className="text-xs text-white/40">
                    🎬 {s.visual} ·{' '}
                    <span className="text-violet-300">
                      {s.keywords.join(', ')}
                    </span>
                  </p>
                </Card>
              ))}

              <p className="text-xs text-white/40">
                Editing narration clears that scene’s voiceover, so
                regenerate it in the Voice step.
              </p>
            </>
          )}

          {step === 1 && (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  run(
                    'Finding footage for every scene…',
                    () => api.post(`/projects/${id}/broll/auto`)
                  )
                }
              >
                <Wand2 className="h-4 w-4" />
                Auto-pick missing footage
              </Button>

              <div className="grid gap-4 sm:grid-cols-2">
                {scenes.map((s, i) => (
                  <Card
                    key={s.id}
                    className="space-y-2 p-3"
                  >
                    <div className="relative overflow-hidden rounded-lg bg-black/40">
                      {s.clip ? (
                        <video
                          src={s.clip.preview}
                          poster={s.clip.thumbnail}
                          muted
                          loop
                          playsInline
                          className="aspect-video w-full object-cover"
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => e.currentTarget.pause()}
                        />
                      ) : (
                        <div className="grid aspect-video place-items-center text-sm text-white/30">
                          No footage
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate text-white/60">
                        Scene {i + 1}: {s.clip?.title ?? '—'}
                      </span>

                      <Button
                        variant="outline"
                        className="px-3 py-1"
                        onClick={() => setPicking(s)}
                      >
                        {s.clip ? 'Replace' : 'Choose'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <Card className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Voice</Label>

                  <Select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                  >
                    {VOICES.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>Language</Label>

                  <Select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                  >
                    {LANGS.map(([c, n]) => (
                      <option key={c} value={c}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <Button
                disabled={!scenes.length}
                onClick={() =>
                  run(
                    'Generating voiceover for all scenes…',
                    () =>
                      api.post(`/projects/${id}/voiceover`, {
                        voice,
                        language: lang,
                      })
                  )
                }
              >
                Generate voiceover
              </Button>

              {scenes.map((s, i) => (
                <div key={s.id} className="space-y-1">
                  <div className="text-xs text-white/50">
                    Scene {i + 1}
                    {s.duration ? ` · ${s.duration.toFixed(1)}s` : ''}
                  </div>

                  {s.audio_path ? (
                    <Signed
                      bucket="audio"
                      path={s.audio_path}
                      kind="audio"
                      v={s.duration}
                    />
                  ) : (
                    <div className="text-xs text-white/30">
                      Not generated
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}

          {step === 3 && (
            <Card className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Size ({cs.size})</Label>

                  <input
                    type="range"
                    min={16}
                    max={64}
                    value={cs.size}
                    onChange={(e) =>
                      setP({
                        ...p,
                        caption_style: {
                          ...cs,
                          size: +e.target.value,
                        },
                      })
                    }
                    onMouseUp={() =>
                      sb
                        .from('projects')
                        .update({ caption_style: cs })
                        .eq('id', id)
                    }
                    onTouchEnd={() =>
                      sb
                        .from('projects')
                        .update({ caption_style: cs })
                        .eq('id', id)
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <Label>Colour</Label>

                  <input
                    type="color"
                    value={'#' + cs.color.replace('#', '')}
                    onChange={(e) => {
                      const c = {
                        ...cs,
                        color: e.target.value.slice(1).toUpperCase(),
                      };

                      setP({
                        ...p,
                        caption_style: c,
                      });

                      sb
                        .from('projects')
                        .update({ caption_style: c })
                        .eq('id', id);
                    }}
                    className="h-10 w-full rounded-lg bg-transparent"
                  />
                </div>

                <div>
                  <Label>Position</Label>

                  <Select
                    value={cs.position}
                    onChange={(e) => {
                      const c = {
                        ...cs,
                        position: e.target.value,
                      };

                      setP({
                        ...p,
                        caption_style: c,
                      });

                      sb
                        .from('projects')
                        .update({ caption_style: c })
                        .eq('id', id);
                    }}
                  >
                    {['top', 'middle', 'bottom'].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <p className="text-sm text-white/50">
                Subtitles are synced to each scene’s real voiceover
                length and burned into the final video. Preview on the
                right.
              </p>
            </Card>
          )}

          {step === 4 && (
            <Card className="space-y-4">
              {p.status === 'rendering' && (
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>
                      Rendering scenes, subtitles and transitions…
                    </span>
                    <span>{p.render_progress}%</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                      style={{
                        width: `${p.render_progress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {p.status === 'failed' && (
                <p className="text-sm text-red-300">
                  Render failed: {p.render_error}
                </p>
              )}

              {!ready && (
                <p className="text-sm text-amber-300">
                  Every scene needs footage (step 2) and a voiceover
                  (step 3) before rendering.
                </p>
              )}

              <Button
                disabled={!ready || p.status === 'rendering'}
                loading={p.status === 'rendering'}
                onClick={() =>
                  run(
                    'Starting render…',
                    () => api.post(`/projects/${id}/render`)
                  )
                }
              >
                {p.status === 'done'
                  ? 'Re-render video'
                  : p.status === 'failed'
                    ? 'Retry render'
                    : 'Render video'}
              </Button>

              {p.video_path && p.status !== 'rendering' && (
                <>
                  <Signed
                    bucket="renders"
                    path={p.video_path}
                    kind="video"
                  />

                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        window.open(
                          (await api.get(`/projects/${id}/download`)).url
                        );
                      } catch (e: any) {
                        setErr(e.message);
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download MP4
                  </Button>
                </>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Card className="space-y-3 p-3">
            <div
              className={cn(
                'relative overflow-hidden rounded-xl bg-black',
                ASPECT[p.format]
              )}
            >
              {cur?.clip ? (
                <video
                  key={cur.clip.id}
                  src={cur.clip.preview}
                  poster={cur.clip.thumbnail}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-sm text-white/30">
                  Preview
                </div>
              )}

              {cur && (
                <div
                  className={cn(
                    'absolute inset-x-3 text-center font-bold [text-shadow:0_1px_4px_#000]',
                    cs.position === 'top'
                      ? 'top-3'
                      : cs.position === 'middle'
                        ? 'top-1/2 -translate-y-1/2'
                        : 'bottom-3'
                  )}
                  style={{
                    color: '#' + cs.color.replace('#', ''),
                    fontSize: cs.size * 0.55,
                  }}
                >
                  {cur.narration
                    .split(/\s+/)
                    .slice(0, 7)
                    .join(' ')}
                </div>
              )}
            </div>

            {cur?.audio_path && (
              <Signed
                bucket="audio"
                path={cur.audio_path}
                kind="audio"
                v={cur.duration}
              />
            )}
          </Card>

          <div>
            <div className="mb-1 text-xs text-white/40">
              Timeline · {total.toFixed(0)}s
            </div>

            <div className="flex gap-1">
              {scenes.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setSel(i)}
                  title={s.narration}
                  style={{
                    flex: s.duration ?? 5,
                  }}
                  className={cn(
                    'h-10 min-w-[24px] overflow-hidden rounded-md border text-[10px]',
                    i === sel
                      ? 'border-violet-400'
                      : 'border-white/10'
                  )}
                >
                  {s.clip ? (
                    <img
                      src={s.clip.thumbnail}
                      className="h-full w-full object-cover opacity-70"
                    />
                  ) : (
                    i + 1
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {picking && (
        <BrollPicker
          pid={id}
          scene={picking}
          onClose={() => setPicking(null)}
          onPick={(c: any) => {
            setPicking(null);

            run('Saving footage…', () =>
              upd(picking.id, { clip: c })
            );
          }}
        />
      )}
    </div>
  );
}