# Deploy Band Assist with Supabase Backend

Quick deployment guide for `band.jasonshaffer.me` with multi-user sync via Supabase.

## 📋 Deployment Checklist

### Phase 1: Supabase Setup (15-20 minutes)

#### 1.1 Create Supabase Project

1. Go to **[supabase.com](https://supabase.com)** and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Name**: `band-assist` (or your choice)
   - **Database Password**: Generate strong password (SAVE THIS!)
   - **Region**: Choose closest to you (e.g., US East)
4. Click **"Create new project"**
5. Wait ~2 minutes for provisioning

#### 1.2 Run Database Migrations

1. In Supabase Dashboard, click **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Open `/home/user/band_assist/supabase/migrations/001_initial_schema.sql`
4. Copy ALL contents and paste into Supabase SQL Editor
5. Click **"Run"** (bottom right)
6. Verify success: You should see "Success. No rows returned"
7. Repeat for `002_enable_realtime.sql`

**Verify Tables Created:**
- Click **"Table Editor"** (left sidebar)
- You should see: `band_members`, `songs`, `band_events`, `roles`, `files`

#### 1.3 Create Storage Bucket

1. Click **"Storage"** (left sidebar)
2. Click **"New bucket"**
3. Fill in:
   - **Name**: `band-files` (EXACT - don't change this!)
   - **Public bucket**: **OFF** (keep it private)
4. Click **"Create bucket"**

#### 1.4 Apply Storage Policies

1. Click on the `band-files` bucket you just created
2. Click **"Policies"** tab
3. Click **"New Policy"**
4. Open `/home/user/band_assist/supabase/storage/band-files-policies.sql`
5. You'll see 4 policies - create each one separately:

**For each policy:**
- Click **"Create a new policy from scratch"**
- Copy the policy name (e.g., "Allow authenticated uploads")
- Set **Target roles** to "authenticated"
- Paste the SQL into the appropriate field
- Click **"Review"** then **"Save policy"**

**You should have 4 policies:**
- Allow authenticated uploads (INSERT)
- Allow authenticated reads (SELECT)
- Allow authenticated updates (UPDATE)
- Allow authenticated deletes (DELETE)

#### 1.5 Set Up Authentication

1. Click **"Authentication"** → **"Providers"** (left sidebar)
2. Find **"Email"** provider and enable it
3. Turn OFF "Confirm email" (simplifies for shared account)
4. Click **"Save"**

5. Click **"Users"** (under Authentication)
6. Click **"Add user"** → **"Create new user"**
7. Fill in:
   - **Email**: `band@jasonshaffer.me` (or your choice)
   - **Password**: Create a strong shared password (SAVE THIS!)
   - **Auto Confirm User**: **ON**
8. Click **"Create user"**

**Save these credentials - you'll share them with your brothers!**

#### 1.6 Get Your API Credentials

1. Click **"Settings"** → **"API"** (left sidebar)
2. Copy and save these TWO values:

   **Project URL:**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   **anon public key:** (under "Project API keys")
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
   ```

**Keep these handy - you'll need them for Vercel!**

---

### Phase 2: Vercel Deployment (10 minutes)

#### 2.1 Push Code to GitHub

```bash
# Make sure you're on the deployment branch
git status

# Push latest code
git push -u origin claude/setup-deployhq-011Crf1VfxDaAUbnfmsbLxA1
```

**Note:** You may want to merge this to `main` branch first, or deploy from this branch directly.

#### 2.2 Connect to Vercel

1. Go to **[vercel.com](https://vercel.com)** and sign in with GitHub
2. Click **"Add New Project"**
3. Find your `band_assist` repository
4. Click **"Import"**

#### 2.3 Configure Project Settings

Vercel should auto-detect Vite. Verify:

- **Framework Preset**: Vite ✅
- **Root Directory**: `./` ✅
- **Build Command**: `npm run build` ✅
- **Output Directory**: `dist` ✅

#### 2.4 Add Environment Variables

Click **"Environment Variables"** and add these THREE:

| Variable Name | Value | Notes |
|---------------|-------|-------|
| `GEMINI_API_KEY` | Your Gemini API key | From Google AI Studio |
| `VITE_SUPABASE_URL` | Your Supabase Project URL | From Step 1.6 above |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public key | From Step 1.6 above |

**Important:**
- All three are required
- Use `VITE_` prefix for Supabase vars (required by Vite)
- Use `GEMINI_API_KEY` without prefix (Vite config handles it)

#### 2.5 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. You'll see "Congratulations!" when done
4. Click **"Visit"** to see your app
5. You should see a **LOGIN SCREEN** (this means Supabase is working!)

**Test Login:**
- Enter the email/password you created in Step 1.5
- You should see the Band Assist dashboard

#### 2.6 Add Custom Domain

1. In Vercel project, click **"Settings"** → **"Domains"**
2. Click **"Add"**
3. Enter: `band.jasonshaffer.me`
4. Vercel will verify your CNAME record (from SiteGround)
5. Wait ~5-15 minutes for SSL certificate
6. Done! Visit `https://band.jasonshaffer.me`

---

### Phase 3: Test Everything (5 minutes)

Visit your deployed site and test:

- [ ] Site loads at `https://band.jasonshaffer.me`
- [ ] Login screen appears
- [ ] Can log in with band email/password
- [ ] Can create a new song
- [ ] Can upload a PDF chart (should upload to Supabase Storage)
- [ ] Can add a band member
- [ ] AI assistant works (asks questions, gets responses)
- [ ] Open in incognito/another device → login → verify data syncs

---

## 🎸 Share With Your Brothers

Send them:

```
Hey brothers! 🎸

The band management app is live!

🔗 https://band.jasonshaffer.me

Login credentials:
📧 Email: band@jasonshaffer.me
🔑 Password: [the password you created]

Features:
✅ Manage our setlist
✅ Upload charts and backing tracks
✅ Schedule practices and gigs
✅ Track assignments

All data syncs in real-time across all our devices!

Let me know if you have any issues.

Rock on! 🤘
```

---

## 🆘 Troubleshooting

### "Supabase is not configured" in Browser Console

**Fix:**
1. Check all 3 environment variables are set in Vercel
2. Verify variable names are EXACT (case-sensitive)
3. Click **"Redeploy"** in Vercel after adding vars

### Can't Log In - "Invalid credentials"

**Fix:**
1. Go to Supabase → Authentication → Users
2. Verify user exists and is confirmed
3. Try resetting password
4. Check Email provider is enabled

### File Uploads Fail

**Fix:**
1. Verify storage bucket is named exactly `band-files`
2. Check all 4 storage policies are created
3. Confirm user is logged in (check console for auth errors)

### Build Fails on Vercel

**Fix:**
1. Check build logs for specific error
2. Run `npm run build` locally to reproduce
3. Fix TypeScript/import errors
4. Push fix and redeploy

### Site Shows "App is using localStorage"

**Fix:**
1. This means Supabase env vars aren't detected
2. Double-check variable names in Vercel settings
3. Ensure `VITE_` prefix on Supabase vars
4. Redeploy

---

## 📊 What You Get with Supabase

✅ **Multi-user sync** - All band members see the same data
✅ **Real-time updates** - Changes appear instantly (after you enable subscriptions)
✅ **Centralized storage** - PDFs, images, backing tracks in cloud
✅ **Authentication** - Shared password login
✅ **Automatic backups** - Supabase backs up daily
✅ **Free tier** - More than enough for a band (500MB DB, 1GB storage)

---

## 🔄 Migrating Existing localStorage Data

If you have existing data in localStorage (from testing):

1. Open old app at `localhost:3000`
2. Go to **Settings** → **Export Backup**
3. Save JSON file
4. Open deployed app at `band.jasonshaffer.me`
5. Log in
6. Go to **Settings** → **Import Backup**
7. Upload the JSON file

---

## 🎯 Costs

**Free Tier (sufficient for years):**
- Supabase: 500MB database, 1GB file storage
- Vercel: Unlimited deployments, automatic HTTPS

**Only pay if you exceed limits** (unlikely for a 4-person band).

---

## 📚 Additional Resources

- **Detailed setup guide**: `/docs/03-DEPLOYMENT.md`
- **Database schema**: `/docs/02-SUPABASE_SCHEMA.md`
- **Supabase docs**: https://supabase.com/docs
- **Vercel docs**: https://vercel.com/docs

---

**Ready to deploy?** Start with Phase 1 above! 🚀

**Questions?** Each phase is designed to be completed in order. Don't skip steps!
