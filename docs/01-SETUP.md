# Band Assist Setup Guide

Complete guide to setting up Band Assist for local development and production deployment.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Supabase Backend Setup](#supabase-backend-setup)
3. [Environment Variables](#environment-variables)
4. [Running the Application](#running-the-application)
5. [Deployment](#deployment)

---

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- Code editor (VS Code recommended)

### Step 1: Clone and Install

```bash
git clone https://github.com/your-username/band_assist.git
cd band_assist
npm install
```

### Step 2: Create Environment File

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Gemini API key:

```text
GEMINI_API_KEY=your_gemini_api_key_here
```

**Optional:** Add Supabase credentials (if you want backend sync):

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 3: Run Development Server

```bash
npm run dev
```

Open <http://localhost:3000> in your browser.

**Without Supabase:** App will use localStorage (client-side only, data stays on your device)

**With Supabase:** App will sync data across all users and devices

---

## Supabase Backend Setup

Only needed if you want shared data storage across multiple users/devices.

### Step 1: Create Supabase Account

1. Go to <https://supabase.com>
2. Sign up (free tier is sufficient)
3. Click "New Project"

### Step 2: Create Project

Fill in project details:

- **Name:** `band-assist` (or your choice)
- **Database Password:** Generate strong password (save it!)
- **Region:** Choose closest to your location
- Click "Create new project"

Wait ~2 minutes for project to provision.

### Step 3: Run Database Migrations

1. In Supabase Dashboard, go to **SQL Editor**
2. Open the file `/supabase/migrations/001_initial_schema.sql` from this repo
3. Copy entire contents
4. Paste into SQL Editor
5. Click **Run** (bottom right)
6. Verify success (should see "Success. No rows returned")

Repeat for `002_enable_realtime.sql`

**Verify Tables Created:**

1. Go to **Table Editor** in Supabase Dashboard
2. You should see these tables:
   - `band_members`
   - `songs`
   - `band_events`
   - `roles`
   - `files`

### Step 4: Create Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Click "New bucket"
3. **Name:** `band-files` (exact name, case-sensitive!)
4. **Public:** No (keep it private)
5. Click "Create bucket"

### Step 5: Apply Storage Policies

1. Click on the `band-files` bucket you just created
2. Click "Policies" tab
3. Click "New Policy"
4. Click "For full customization click here"
5. Open `/supabase/storage/band-files-policies.sql` from this repo
6. Copy the first policy (upload)
7. Paste into policy editor
8. Click "Save policy"
9. Repeat for remaining 3 policies (view, update, delete)

### Step 6: Set Up Authentication

#### Option A: Shared Band Password (Recommended)

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider (should be enabled by default)
3. Under "Email" settings:
   - Disable "Confirm email" (toggle OFF)
   - Disable "Secure email change" (toggle OFF)
4. Go to **Authentication** → **Users**
5. Click "Add user manually"
6. Fill in:
   - **Email:** `band@yourband.com` (or your choice)
   - **Password:** Choose a strong shared password
   - **Auto Confirm User:** YES (check the box)
7. Click "Create user"

**Share these credentials with your band members!**

#### Option B: Individual Accounts (More Secure)

If you prefer individual logins:

1. Each band member creates their own account
2. You'll need to add a signup UI (not currently implemented)
3. See `/docs/AUTH_IMPLEMENTATION.md` for guidance

### Step 7: Get API Credentials

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (under "Project API keys" section)

### Step 8: Add Credentials to Environment

Edit your `.env.local` file:

```text
# Gemini (existing)
GEMINI_API_KEY=your_gemini_api_key

# Supabase (add these)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here
```

**Important:**

- Use the **anon public** key, NOT the service role key
- All Vite env vars must be prefixed with `VITE_`

---

## Environment Variables

### Required

| Variable         | Description              | Where to Get                           |
| ---------------- | ------------------------ | -------------------------------------- |
| `GEMINI_API_KEY` | Google Gemini AI API key | <https://ai.google.dev/> → Get API key |

### Optional (for Backend Sync)

| Variable                 | Description              | Where to Get                                      |
| ------------------------ | ------------------------ | ------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL     | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key | Supabase Dashboard → Settings → API → anon public |

### Environment File Structure

**`.env.local`** (for local development, gitignored):

```text
GEMINI_API_KEY=your_key_here
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Production (Vercel):**
Set these in Vercel Dashboard → Project Settings → Environment Variables

---

## Running the Application

### Development Mode

```bash
npm run dev
```

- Runs on <http://localhost:3000>
- Hot reload enabled
- Console shows which storage backend is active:
  - "✅ Using Supabase for data persistence" = Backend connected
  - "📦 Using LocalStorage for data persistence" = Client-side only

### Build for Production

```bash
npm run build
```

Creates optimized build in `/dist` folder.

### Preview Production Build

```bash
npm run preview
```

Serves the production build locally on <http://localhost:4173>

---

## Deployment

See detailed deployment guide: [03-DEPLOYMENT.md](./03-DEPLOYMENT.md)

### Quick Deploy to Vercel

1. Push code to GitHub
2. Go to <https://vercel.com>
3. Import your repository
4. Add environment variables (see above)
5. Deploy

Vercel will automatically:

- Build the app
- Deploy to global CDN
- Provision HTTPS
- Create preview deployments for PRs

---

## Troubleshooting

### "Supabase is not configured" in Console

**Cause:** Environment variables not set or misspelled

**Fix:**

1. Check `.env.local` exists
2. Ensure variables are prefixed with `VITE_`
3. Restart dev server after changing env vars
4. In production, check Vercel environment variables

### Database Migration Fails

**Cause:** SQL syntax error or tables already exist

**Fix:**

1. Check you're in the SQL Editor (not another section)
2. Run migrations in order (001, then 002)
3. If tables already exist, drop them first:

   ```sql
   DROP TABLE IF EXISTS files, roles, band_events, songs, band_members CASCADE;
   ```

4. Then re-run migration

### Storage Bucket Policies Not Working

**Cause:** Policy SQL not applied correctly

**Fix:**

1. Go to Storage → band-files → Policies
2. Delete all existing policies
3. Re-apply from `band-files-policies.sql` one by one
4. Ensure each policy is saved without errors

### File Uploads Return 401 Errors

**Cause:** User not authenticated or bucket permissions wrong

**Fix:**

1. Verify you're logged in (check Network tab in DevTools)
2. Check storage policies are applied
3. Confirm bucket name is exactly `band-files`
4. Try logging out and back in

### Data Not Syncing Between Devices

**Cause:** Real-time not enabled or different Supabase projects

**Fix:**

1. Verify `002_enable_realtime.sql` was run
2. Check console for WebSocket connection errors
3. Confirm both devices are using same Supabase URL
4. Try hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

---

## Next Steps

After setup:

1. ✅ Import existing data (Settings → Import Backup)
2. ✅ Add band members (Settings → Band Roster)
3. ✅ Create songs and upload charts
4. ✅ Share app URL with band members
5. ✅ Set up regular backups (Settings → Export Backup)

---

## Support & Resources

**Documentation:**

- [Database Schema](./02-SUPABASE_SCHEMA.md)
- [Deployment Guide](./03-DEPLOYMENT.md)
- [Project README](../CLAUDE.md)

**External Docs:**

- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/guide/)
- [React Documentation](https://react.dev/)

**Issues:**
Open an issue on GitHub if you encounter problems
