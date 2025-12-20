# Pluggy Connect Token - Next.js

A Next.js application for integrating Pluggy's financial data API with Supabase.

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/YOUR_REPO_NAME)

Click the button above to deploy your own instance. You'll need:
- Pluggy API credentials from [Pluggy Dashboard](https://dashboard.pluggy.ai)
- A Supabase account (database tables will be created automatically)

## Local Development
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables
```
PLUGGY_CLIENT_ID=
PLUGGY_CLIENT_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```