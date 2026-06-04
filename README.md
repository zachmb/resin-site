# Resin Site

Resin's SvelteKit web app and API. This repo is the public web dashboard, the API surface used by iOS and the Chrome extension, and the source of the shared `/api/config` ecosystem configuration.

## Local Development

```sh
npm install
npm run dev
```

The app expects Supabase and server credentials in `.env.local`. Start from `.env.example`.

## Production

Deploy with the Vercel adapter already configured in `svelte.config.js`.

Required production environment variables:

- `PUBLIC_RESIN_APP_URL`
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPSEEK_API_KEY`
- `RESIN_SYNC_KEY`

`/api/config` returns the shared production config consumed by web, iOS, and the Chrome extension. Keep `resin-config.json` aligned with the live domain and public Supabase project values.

## Verification

```sh
npm run check
npm run build
```
