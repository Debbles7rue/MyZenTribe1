# MyZenTribe — Next.js 14 + Tailwind + Supabase (Netlify-ready)

This is a functional starter for the MyZenTribe V1 app with the pages, routing, and key plumbing set up.
It includes:
- Next.js App Router (TypeScript) with Tailwind CSS
- Supabase Auth/DB wiring (server + client helpers)
- Basic pages: Home, Auth, Profile, Events, Communities, Meditation Room, Gratitude Journal, Karma Corner, Feedback, What's New
- Branding: pulsing logo, protective watermark CSS, blessing embedded
- Netlify config for deploy
- `.env.example` and SQL schema to create Supabase tables

## Quick Start

1) **Install deps**
   ```bash
   npm i
   ```
2) **Copy env**
   ```bash
   cp .env.example .env.local
   # fill in SUPABASE_URL and SUPABASE_ANON_KEY
   ```
3) **Run dev**
   ```bash
   npm run dev
   ```

## Deploy to Netlify
- Create a new Netlify site from this repo (Link to Git provider or upload).
- Framework: Next.js
- Build command: `npm run build`
- Publish directory: `.next`
- Add environment variables from `.env.example` (use Netlify "Environment variables").
- Ensure "Next.js runtime" is enabled automatically by Netlify.

## Supabase
- Create a new Supabase project.
- Run `supabase/schema.sql` in the SQL editor.
- Add the URL and anon key to your `.env.local` and Netlify.

## Notes
- Stripe & push notifications are stubbed for post-V1.
- Weather overlay is scaffolded; connect a weather API when ready.
- Business verification tiers and advanced analytics are left as TODOs.
