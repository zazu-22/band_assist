# Deployment Guide

This guide covers deploying Band Assist to production using Supabase + Vercel.

## Overview

- **Backend**: Supabase (PostgreSQL database + file storage + authentication)
- **Frontend**: Vercel (static site hosting with custom domain)
- **DNS**: Your domain registrar (point to Vercel)

## Prerequisites

- Supabase account (free tier: <https://supabase.com>)
- Vercel account (free tier: <https://vercel.com>)
- GitHub repository (for automatic deployments)
- Custom domain (optional but recommended)

---

## Part 1: Supabase Setup (Backend)

### Step 1: Create Supabase Project

1. Go to <https://supabase.com> and sign in
2. Click "New Project"
3. Fill in project details:
   - Name: `band-assist` (or your preferred name)
   - Database Password: Generate a strong password (save it!)
   - Region: Choose closest to your location
4. Wait for project to provision (~2 minutes)

### Step 2: Run Database Migrations

1. In Supabase Dashboard, go to **SQL Editor**
2. Open `/supabase/migrations/001_initial_schema.sql` from this repo
3. Copy the entire contents and paste into SQL Editor
4. Click "Run" to execute migration
5. Repeat for `/supabase/migrations/002_enable_realtime.sql`

**Verify:** Go to **Table Editor** and confirm these tables exist:

- `band_members`
- `songs`
- `band_events`
- `roles`
- `files`

### Step 3: Create Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Click "New Bucket"
3. Name: `band-files`
4. Public: **No** (keep it private)
5. Click "Create bucket"

### Step 4: Apply Storage Policies

1. Click on the `band-files` bucket
2. Go to "Policies" tab
3. Click "New Policy" → "Create a policy from scratch"
4. Open `/supabase/storage/band-files-policies.sql` from this repo
5. Copy ALL policy SQL statements and paste them into the Supabase SQL Editor
6. Run the entire script to create all four policies:
   - Upload policy (INSERT)
   - View policy (SELECT)
   - Update policy (UPDATE)
   - Delete policy (DELETE)

**Note:** All policies are band-scoped - users can only access files belonging to bands they are members of.

### Step 5: Set Up Authentication

For the **individual user account model**:

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. **Enable "Confirm email"** (recommended for security)
   - This requires users to verify their email before logging in
   - Alternatively, you can disable it for easier testing
4. Configure email templates (optional but recommended):
   - Customize the confirmation and invitation emails if desired

**Note:** Users will create their own accounts when they first visit your app or accept an invitation.

### Step 6: Get API Credentials

1. Go to **Settings** → **API**
2. Copy these values (you'll need them for Vercel):
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

---

## Part 2: Vercel Deployment (Frontend)

### Step 1: Push Code to GitHub

If you haven't already:

```bash
git add .
git commit -m "feat: Add Supabase backend integration"
git push origin main
```

### Step 2: Import Project to Vercel

1. Go to <https://vercel.com> and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Vite configuration

### Step 3: Configure Environment Variables

In Vercel project settings, add these environment variables:

| Variable Name | Value | Where to Find |
|---------------|-------|---------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | Supabase Dashboard → Settings → API → anon public key |
| `VITE_API_KEY` or `GEMINI_API_KEY` | Your Google Gemini API key | (existing, keep it) |

**Important:** All Vite environment variables must be prefixed with `VITE_`

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Vercel will assign a URL like `https://band-assist.vercel.app`

### Step 5: Configure Custom Domain (Optional)

1. In Vercel project, go to **Settings** → **Domains**
2. Add your custom domain (e.g., `band.sharpdressedband.com`)
3. Vercel will show DNS configuration instructions
4. Go to your domain registrar (GoDaddy, Namecheap, etc.)
5. Add DNS records as instructed by Vercel:
   - Type: `A` or `CNAME`
   - Name: `band` (or `@` for root domain)
   - Value: Vercel's IP or domain
6. Wait for DNS propagation (5-30 minutes)
7. Vercel will automatically provision HTTPS certificate

---

## Part 3: Post-Deployment

### Test the Deployment

1. Visit your deployed URL
2. Log in with the shared band credentials
3. Create a test song
4. Upload a PDF chart → verify it uploads to Storage (check Supabase Storage dashboard)
5. Upload a Guitar Pro file → verify it renders with AlphaTab
6. Upload a backing track audio file → verify playback works
7. Reorder songs in the Setlist view → refresh page and verify order persists
8. Open the app in another browser/device → verify real-time sync works
9. Try the JSON backup import/export feature in Settings

### Authentication & Band Setup Flow

The app automatically handles user authentication and band management:

**First User (Band Creator):**

1. Visit your deployed URL
2. See login screen with email/password fields
3. Click "Sign Up" (or create account)
4. Enter email and password
5. Verify email (if confirmation enabled)
6. Upon first login, a band is automatically created called "My Band"
7. User becomes the admin of this band
8. Can rename the band and invite other members via Settings → Team

**Invited Members:**

1. Receive an email invitation from the band admin
2. Click the invitation link or visit your app URL
3. Sign up with the invited email address
4. Upon signup, automatically join the band
5. Access all band data immediately

**Session persistence:** Sessions are maintained using Supabase Auth tokens and persist across page refreshes.

**Band Management:**

- Band selector shown in navigation (displays current band name)
- Future support for users being in multiple bands
- Admins can invite members via Settings → Team tab

### New Features in This Deployment

**File Storage:**

- PDF charts, images, Guitar Pro files, and audio files are now stored in Supabase Storage (`band-files` bucket)
- Files are no longer stored as base64 in the database (saves space and improves performance)
- Guitar Pro files store both a Storage URL and base64 copy for AlphaTab rendering
- File size limits: 50MB for charts, 10MB for audio (configurable in upload handlers)

**Persistent Setlist Ordering:**

- Drag-and-drop song reordering in Setlist view now persists across sessions
- Order syncs in real-time across all users
- Songs are ordered by `sort_order` column in database
- Unordered songs (NULL `sort_order`) appear after ordered songs, sorted alphabetically

### Monitor Usage

**Supabase Dashboard:**

- **Database** → Check usage (rows, storage)
- **Storage** → Check file storage usage
- **Authentication** → Monitor active sessions

**Free Tier Limits:**

- 500MB database storage
- 1GB file storage
- 2GB bandwidth/month
- 50,000 monthly active users

### Backup Strategy

1. **Automatic:** Supabase creates daily backups (free tier: 7 days retention)
2. **Manual:** Use Settings → Export Backup in the app regularly
3. **Code backups:** Keep GitHub repo up to date

---

## Part 4: Migrating Existing Data

If you have existing localStorage data:

### Option A: Manual Import (Easiest)

1. Open the old app (running on `localhost:3000`)
2. Go to Settings → Export Backup
3. Open the new deployed app
4. Log in with band credentials
5. Go to Settings → Import Backup
6. Select the exported JSON file

### Option B: Automated Migration (Advanced)

See `/docs/MIGRATION.md` for scripted migration from localStorage to Supabase.

---

## Troubleshooting

### "Supabase is not configured" Warning

**Symptoms:** Console shows "Using LocalStorage" instead of "Using Supabase"

**Fix:**

1. Check environment variables in Vercel are correct
2. Ensure variables are prefixed with `VITE_`
3. Redeploy after adding/changing variables

### File Uploads Failing

**Symptoms:** PDFs/images don't upload, errors in console

**Fix:**

1. Verify storage bucket is named `band-files` exactly
2. Check storage policies are applied correctly
3. Confirm user is authenticated (check Network tab for 401 errors)

### Authentication Errors

**Symptoms:** Can't log in, "Invalid credentials" error

**Fix:**

1. Verify user was created in Supabase Auth
2. Check email/password are correct
3. Ensure email provider is enabled in Supabase Auth settings

### Real-time Updates Not Working

**Symptoms:** Changes on one device don't appear on another

**Fix:**

1. Verify `002_enable_realtime.sql` migration was run
2. Check browser console for WebSocket errors
3. Confirm real-time is enabled in Supabase project settings

### Deployment Build Failures

**Symptoms:** Vercel build fails

**Common Causes:**

- Missing environment variables
- TypeScript errors
- Import errors

**Fix:**

1. Check Vercel build logs for specific error
2. Run `npm run build` locally to reproduce
3. Fix errors and push to GitHub

---

## Updating the Deployment

Any time you push to `main` branch, Vercel will automatically:

1. Pull latest code
2. Run build
3. Deploy to production
4. Keep previous version as fallback

To deploy a specific branch:

1. Go to Vercel project → Settings → Git
2. Change production branch
3. Or create preview deployments for feature branches

---

## Cost Estimates

### Free Tier (Sufficient for Band Use)

- **Supabase Free:** 500MB DB, 1GB storage, unlimited API requests
- **Vercel Free:** Unlimited bandwidth, 100GB monthly, automatic HTTPS

### If You Exceed Free Tier

- **Supabase Pro:** $25/month (8GB DB, 100GB storage)
- **Vercel Pro:** $20/month (unlimited bandwidth, faster builds)

**For a band of 4-5 people:** Free tier should last years unless you upload hundreds of high-quality backing tracks.

---

## Security Checklist

- [ ] Supabase database has RLS policies enabled (band-scoped)
- [ ] Storage bucket is private (not public)
- [ ] Storage policies are band-scoped (applied from migration scripts)
- [ ] Email confirmation is enabled (recommended)
- [ ] Environment variables are set in Vercel (not hardcoded)
- [ ] HTTPS is enabled on custom domain (Vercel does this automatically)
- [ ] Regular backups are being taken via Settings → Data → Export Backup
- [ ] Only invite trusted members via Settings → Team tab

---

## Support

**Issues with this guide?** Open an issue on GitHub

**Supabase help:** <https://supabase.com/docs>

**Vercel help:** <https://vercel.com/docs>

**Vite help:** <https://vitejs.dev/guide/>
