import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';

export const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export type AuthedReq = Request & { userId: string };
export async function auth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      error: 'Missing authentication token'
    });
  }

  const { data, error } = await sb.auth.getUser(token);

  if (error || !data?.user) {
    console.error('Supabase authentication failed:', {
      message: error?.message,
      status: error?.status,
      code: error?.code
    });

    return res.status(401).json({
      error: error?.message ?? 'Unauthorized'
    });
  }

  (req as AuthedReq).userId = data.user.id;

  next();
}
// Server uses the service key, so ownership must be checked explicitly.
export async function ownProject(id: string, userId: string) {
  const { data, error } = await sb
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Supabase project lookup failed:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    throw Object.assign(
      new Error(`Project lookup failed: ${error.message}`),
      { status: 500 }
    );
  }

  if (!data) {
    console.error('Project not found for user:', { id, userId });

    throw Object.assign(
      new Error('Project not found'),
      { status: 404 }
    );
  }

  return data;
}

export async function fetchRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; await new Promise(r => setTimeout(r, 800 * 2 ** i)); }
  }
  throw last;
}
