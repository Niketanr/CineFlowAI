import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { z } from 'zod';
import { fetchRetry } from './lib.js';

const SceneSchema = z.array(
  z.object({
    narration: z.string().min(1),
    visual: z.string(),
    keywords: z.array(z.string()).min(1).max(5),
  })
);

export async function generateScenes(p: {
  title: string;
  script: string;
  style: string;
  target_duration: number;
  format: string;
}) {
  const sceneCount = Math.max(
    3,
    Math.round(p.target_duration / 8)
  );

  const prompt = `Split this script into about ${sceneCount} scenes for a ${p.target_duration}s ${p.format} "${p.style}" video titled "${p.title}".

Keep the narration faithful to the script. Tighten only if needed to fit the duration, approximately 2.5 words per second overall.

Return ONLY a JSON object of the form:
{"scenes":[{"narration":"...","visual":"...","keywords":["..."]}]}

"visual" is a shot description.
"keywords" are 2-4 concrete stock-footage search terms. Avoid abstract concepts.

SCRIPT:
${p.script}`;

  return fetchRetry(async () => {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error('GROQ_API_KEY is missing from server/.env');
    }

    const model =
      process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

    const r = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          response_format: {
            type: 'json_object',
          },
          messages: [
            {
              role: 'system',
              content:
                'You are a professional video script editor. Return valid JSON only.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!r.ok) {
      const errorBody = await r.text();

      console.error('Groq API error:', {
        status: r.status,
        model,
        response: errorBody,
      });

      throw new Error(
        `Groq API ${r.status}: ${errorBody}`
      );
    }

    const result: any = await r.json();

    const content = result?.choices?.[0]?.message?.content;

    if (!content || typeof content !== 'string') {
      console.error('Groq returned an empty response:', result);

      throw new Error('Groq returned an empty scene response');
    }

    let parsed: any;

    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('Groq returned invalid JSON:', content);

      throw new Error('Groq returned invalid JSON for scenes');
    }

    if (!parsed?.scenes || !Array.isArray(parsed.scenes)) {
      console.error('Groq response is missing the scenes array:', parsed);

      throw new Error('Groq response does not contain a scenes array');
    }

    return SceneSchema.parse(parsed.scenes);
  });
}

// Coverr stock footage search
// Coverr stock footage search
// Coverr stock footage search with fallback queries
export async function searchCoverr(
  query: string,
  format: string,
  page = 0
) {
  return fetchRetry(async () => {
    const apiKey = process.env.COVERR_API_KEY;

    if (!apiKey) {
      throw new Error('COVERR_API_KEY is missing from server/.env');
    }

    // Use shorter, broader search terms
    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);

    const queries = [
      words.slice(0, 2).join(' '),
      words[0],
      ...words.slice(1, 4),
      'wind turbine',
      'wind farm',
      'renewable energy',
      'nature landscape',
    ].filter(Boolean);

    // Remove duplicate search terms
    const uniqueQueries = [...new Set(queries)];

    for (const searchQuery of uniqueQueries) {
      const params = new URLSearchParams({
        query: searchQuery,
        page: String(page),
        page_size: '12',
        urls: 'true',
      });

      const url = `https://api.coverr.co/videos?${params}`;

      const r = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
        },
      });

      if (!r.ok) {
        const errorBody = await r.text();

        console.error('Coverr API error:', {
          status: r.status,
          query: searchQuery,
          response: errorBody,
        });

        throw new Error(`Coverr API ${r.status}: ${errorBody}`);
      }

      const j: any = await r.json();

      console.log('Coverr search:', {
        query: searchQuery,
        total: j.total,
        hits: j.hits?.length,
      });

      const videos = (j.hits ?? [])
        .map((h: any) => ({
          id: h.id,
          title: h.title,
          thumbnail: h.thumbnail,
          preview: h.urls?.mp4_preview || h.urls?.mp4,
          url: h.urls?.mp4_download || h.urls?.mp4,
          vertical:
            h.is_vertical ??
            (h.max_height > h.max_width),
          duration: h.duration,
        }))
        .filter((video: any) => video.url);

      if (videos.length > 0) {
        const wantVertical = format === '9:16';

        return videos.sort(
          (a: any, b: any) =>
            Number(b.vertical === wantVertical) -
            Number(a.vertical === wantVertical)
        );
      }
    }

    console.warn('No Coverr footage found for:', query);
    return [];
  });
}
// Microsoft Edge TTS voices
// [female voice, male voice]
const EDGE: Record<string, [string, string]> = {
  en: ['en-US-AriaNeural', 'en-US-GuyNeural'],
  hi: ['hi-IN-SwaraNeural', 'hi-IN-MadhurNeural'],
  ta: ['ta-IN-PallaviNeural', 'ta-IN-ValluvarNeural'],
  te: ['te-IN-ShrutiNeural', 'te-IN-MohanNeural'],
  kn: ['kn-IN-SapnaNeural', 'kn-IN-GaganNeural'],
  ml: ['ml-IN-SobhanaNeural', 'ml-IN-MidhunNeural'],
  es: ['es-ES-ElviraNeural', 'es-ES-AlvaroNeural'],
  fr: ['fr-FR-DeniseNeural', 'fr-FR-HenriNeural'],
  de: ['de-DE-KatjaNeural', 'de-DE-ConradNeural'],
};

export async function tts(
  text: string,
  voice: string,
  language: string
): Promise<Buffer> {
  const male = ['echo', 'onyx', 'fable'].includes(voice);

  const voicePair = EDGE[language] ?? EDGE.en;
  const voiceName = voicePair[male ? 1 : 0];

  return fetchRetry(async () => {
    const engine = new MsEdgeTTS();

    await engine.setMetadata(
      voiceName,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );

    const res: any = engine.toStream(text);
    const stream = res.audioStream ?? res;

    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    const buffer = Buffer.concat(chunks);

    if (buffer.length < 1000) {
      throw new Error('Voice generation returned no audio');
    }

    return buffer;
  });
}