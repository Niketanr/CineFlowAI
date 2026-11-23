# CineFlowAI
Backend: `server/` (Express + FFmpeg). Frontend: `web/` (Vite + React + TS + Tailwind).
1. Supabase: run `supabase/schema.sql` in the SQL editor.
2. `cd server && cp .env.example .env` (fill) `&& npm i && npm run dev`
3. `cd web && cp .env.example .env` (Supabase URL + ANON key, API URL) `&& npm i && npm run dev` -> http://localhost:5173
Needs Node 20+, FFmpeg with libass on the server machine.
