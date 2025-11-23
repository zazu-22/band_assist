# Quick Start: Deploy to Vercel (LocalStorage Version)

This guide is for deploying Band Assist to Vercel with **localStorage only** (no Supabase backend) using your custom subdomain.

## ✅ Prerequisites Completed

- [x] DNS configured on SiteGround (`band.jasonshaffer.me` → `cname.vercel-dns.com`)
- [x] Code ready in GitHub repository
- [x] `vercel.json` configuration file exists

## 🚀 Deployment Steps (10 minutes)

### Step 1: Push Code to GitHub

Make sure your latest code is pushed:

```bash
git status
git add .
git commit -m "chore: Prepare for Vercel deployment"
git push -u origin claude/setup-deployhq-011Crf1VfxDaAUbnfmsbLxA1
```

### Step 2: Connect to Vercel

1. Go to **[vercel.com](https://vercel.com)** and sign in with GitHub
2. Click **"Add New Project"**
3. Find and import your `band_assist` repository
4. Vercel will auto-detect Vite configuration ✅

### Step 3: Configure Build Settings

Vercel should auto-detect these (verify they match):

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 4: Add Environment Variable

Click **"Environment Variables"** and add:

| Name | Value |
|------|-------|
| `GEMINI_API_KEY` | Your actual Gemini API key |

**Important Notes:**
- The Vite config will automatically map this to `process.env.API_KEY` for the app
- Don't add `VITE_SUPABASE_*` variables unless you want to use Supabase
- Without Supabase vars, the app uses localStorage (current behavior)

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. You'll get a temporary URL like `https://band-assist-xxxx.vercel.app`
4. Test it! The app should work exactly like it does locally

### Step 6: Add Custom Domain

1. In your Vercel project, go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter: `band.jasonshaffer.me`
4. Vercel will verify the CNAME record you created on SiteGround
5. Wait 5-15 minutes for SSL certificate provisioning
6. Done! Your app is live at `https://band.jasonshaffer.me`

## 🎯 What You'll Get

✅ **Fast static hosting** on Vercel's global CDN
✅ **Free HTTPS** with automatic certificate renewal
✅ **LocalStorage persistence** (each user's data stays on their device)
✅ **Automatic deployments** on every git push
✅ **Zero downtime** deployments

## ⚠️ LocalStorage Limitations

With the localStorage version:

- **Data is per-device** - not synced between browsers/devices
- **No collaboration** - each person has their own separate data
- **Use Export/Import** - To share data, use Settings → Export → share file → Import

**Want multi-user sync?** Follow `/docs/03-DEPLOYMENT.md` to add Supabase backend later.

## 🔄 Updating After Deployment

Every time you push to your branch, Vercel will:

1. Automatically build and deploy
2. Keep the old version as fallback
3. Send you deployment notifications

To manually trigger a deployment:

1. Go to Vercel dashboard
2. Click **"Deployments"**
3. Click **"Redeploy"** on any previous deployment

## 🧪 Testing Checklist

After deployment, verify:

- [ ] Site loads at `https://band.jasonshaffer.me`
- [ ] Navigation works (all menu items)
- [ ] Can create a new song
- [ ] Can upload a chart (PDF/image)
- [ ] AI assistant works (requires Gemini API key)
- [ ] Can export/import data
- [ ] AlphaTab renders Guitar Pro files
- [ ] Backing track upload works

## 🆘 Troubleshooting

### DNS Not Resolving

**Symptom:** `band.jasonshaffer.me` doesn't load

**Fix:**
- Wait up to 24 hours for DNS propagation (usually 15-30 min)
- Check DNS: `nslookup band.jasonshaffer.me`
- Verify CNAME in SiteGround points to `cname.vercel-dns.com`

### Build Fails

**Symptom:** Vercel shows "Build failed"

**Fix:**
1. Check build logs in Vercel dashboard
2. Run `npm run build` locally to reproduce
3. Fix TypeScript/build errors
4. Push fix to GitHub

### AI Features Don't Work

**Symptom:** Chat assistant shows errors

**Fix:**
1. Verify `GEMINI_API_KEY` is set in Vercel environment variables
2. Check the API key is valid in Google AI Studio
3. Redeploy after adding/changing env vars

### Site Shows Old Version

**Symptom:** Changes not appearing on live site

**Fix:**
1. Check Vercel deployments - is latest commit deployed?
2. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
3. Clear browser cache

## 📱 Sharing With Your Brothers

Send them:

```
Hey! The band app is live!

🔗 https://band.jasonshaffer.me

NOTE: Each person has their own data (not synced).
To share song data, use Settings → Export → send file → Import on their device.

We can add real-time syncing with Supabase later if needed!
```

## 🎸 Next Steps

**After you confirm it works:**

1. ✅ Test all features on live site
2. 📱 Share with band members
3. 🎵 Add your setlist songs
4. 🎤 Start using for practice/gigs!

**Want to add real-time sync later?**

Follow these docs (in order):
1. `/docs/01-SETUP.md` - Set up Supabase
2. `/docs/03-DEPLOYMENT.md` - Add Supabase env vars to Vercel
3. Redeploy - App will auto-detect Supabase and enable sync

---

**You're all set!** 🚀 The DNS is configured, the code is ready, and Vercel will handle the rest.
