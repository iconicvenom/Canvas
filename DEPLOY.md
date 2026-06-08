# Deploy Canvas to Vercel

## 1. Create a PostgreSQL database

Use [Neon](https://neon.tech) (free tier) or [Vercel Postgres](https://vercel.com/storage/postgres):

1. Create a project and copy the connection string
2. Use the **pooled** connection string for serverless (Neon: add `?sslmode=require`)

## 2. Deploy via Vercel CLI

```bash
cd Canvas
pnpm install
npx vercel login
npx vercel link
npx vercel env add DATABASE_URL        # paste postgres URL
npx vercel env add JWT_SECRET          # long random string
npx vercel env add JWT_REFRESH_SECRET  # another long random string
npx vercel deploy --prod
```

## 3. Environment variables (Vercel Dashboard → Settings → Environment Variables)

| Variable | Required | Example |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Yes | random 64-char string |
| `JWT_REFRESH_SECRET` | Yes | random 64-char string |
| `CLIENT_ORIGIN` | After first deploy | `https://your-app.vercel.app` or custom domain |
| `NODE_ENV` | Auto | `production` |

`CLIENT_ORIGIN` must match your live URL exactly (including `https://`). After the first deploy, copy your Vercel URL and set it.

## 4. Deploy via GitHub (alternative)

1. Push repo to GitHub
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Framework Preset: **Other**
4. Add env vars above
5. Deploy

## 5. Verify

- `https://your-app.vercel.app/` — landing page
- `https://your-app.vercel.app/register` — sign up
- `https://your-app.vercel.app/dashboard` — create a board
- `https://your-app.vercel.app/api/health` — `{"ok":true}`

## Notes

- API, WebSockets, and frontend are served from the same Vercel domain
- Image uploads on Vercel use inline base64 (no persistent disk)
- Set `CLIENT_ORIGIN` to your custom domain if you add one in Vercel
