# PR #109 Deployment Guide

Quick reference for deploying the security improvements from PR #109.

## Prerequisites

- [ ] Supabase CLI installed: `npm install -g supabase`
- [ ] GitHub CLI installed (optional): `brew install gh`
- [ ] Access to Supabase Dashboard
- [ ] Access to GitHub repository settings

## Step-by-Step Deployment

### 1. Create Required Files (1 min)

```bash
# Create .npmrc for cleanup function
cat > supabase/functions/cleanup-expired-tokens/.npmrc << 'EOF'
node-linker=hoisted
EOF

# Verify file was created
ls -la supabase/functions/cleanup-expired-tokens/.npmrc
```

### 2. Configure GitHub Secrets (2 min)

**Option A: Using GitHub CLI**
```bash
# Set Supabase URL
gh secret set SUPABASE_URL --body "https://your-project.supabase.co"

# Set Service Role Key (find in Supabase Dashboard → Project Settings → API)
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "eyJhbG..."

# Verify secrets
gh secret list
# Expected output should include:
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
```

**Option B: Using GitHub Web Interface**
1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Click "New repository secret"
3. Add `SUPABASE_URL` with value from Supabase Dashboard
4. Add `SUPABASE_SERVICE_ROLE_KEY` with service role key from Supabase Dashboard

### 3. Deploy Edge Functions (3 min)

```bash
# Login to Supabase (if not already logged in)
npx supabase login

# Link to your project (if not already linked)
npx supabase link --project-ref your-project-ref

# Deploy cleanup function
npx supabase functions deploy cleanup-expired-tokens

# Deploy updated serve-file-inline function
npx supabase functions deploy serve-file-inline

# Verify deployments
npx supabase functions list
```

### 4. Configure Environment Variables (2 min)

**In Supabase Dashboard:**

1. Navigate to: Edge Functions → `serve-file-inline` → Settings
2. Add environment variable:
   - Key: `ALLOWED_ORIGINS`
   - Value: `https://yourdomain.com,https://www.yourdomain.com`
3. Save and redeploy function

**Get your domain:**
```bash
# If using Vercel
vercel domains ls

# Or check your hosting provider's dashboard
```

### 5. Test Deployment (5 min)

**Test 1: Verify GitHub Actions workflow**
```bash
# Trigger manual workflow run
gh workflow run cleanup-tokens.yml

# Check workflow status
gh run list --workflow=cleanup-tokens.yml

# View logs
gh run view --log
```

**Test 2: Local Edge Function tests**
```bash
# Start local Supabase
npx supabase start

# Run test script
./scripts/test-edge-function.sh

# Expected output:
# ✓ PASSED: Missing path parameter (HTTP 400)
# ✓ PASSED: Missing token parameter (HTTP 401)
# ✓ PASSED: Invalid token (HTTP 401)
# ✓ PASSED: CORS preflight (HTTP 200)
```

**Test 3: Manual cleanup function test**
```bash
# Test cleanup function directly (requires ANON_KEY)
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  https://your-project.supabase.co/functions/v1/cleanup-expired-tokens

# Expected response:
# {"success":true,"deletedCount":0,"timestamp":"2025-12-04T..."}
```

**Test 4: Verify CORS configuration**
```bash
# Test CORS from your app domain
curl -i -X OPTIONS \
  -H "Origin: https://yourdomain.com" \
  https://your-project.supabase.co/functions/v1/serve-file-inline

# Should include:
# Access-Control-Allow-Origin: https://yourdomain.com
```

### 6. Database Verification (2 min)

```sql
-- Connect to your Supabase database (SQL Editor in Dashboard)

-- Verify cleanup function exists
SELECT cleanup_expired_file_tokens();

-- Check file_access_tokens table
SELECT COUNT(*) as total_tokens,
       COUNT(*) FILTER (WHERE used_at IS NOT NULL) as used_tokens,
       COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_tokens
FROM file_access_tokens;

-- View recent tokens (sample)
SELECT token, expires_at, used_at, created_at
FROM file_access_tokens
ORDER BY created_at DESC
LIMIT 5;
```

### 7. Monitor (Ongoing)

**Set up monitoring alerts:**

1. **GitHub Actions failures**
   - Enable notifications: Repository → Settings → Notifications
   - Watch for workflow failure emails

2. **Supabase Edge Function logs**
   - Dashboard → Edge Functions → Logs
   - Watch for:
     - `ALLOWED_ORIGINS not set` warnings
     - Token validation errors
     - Cleanup execution logs

3. **Application logs**
   - Browser Console → Look for:
     - `[refreshChartUrls] Failed to generate fresh URL`
     - CORS errors
     - Token expired errors

## Troubleshooting

### Issue: GitHub Actions workflow fails with 401

**Cause:** Secrets not set or incorrect

**Fix:**
```bash
# Verify secrets exist
gh secret list

# Re-set secrets if needed
gh secret set SUPABASE_URL --body "https://your-project.supabase.co"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "eyJhbG..."
```

### Issue: CORS errors in browser

**Cause:** `ALLOWED_ORIGINS` not set or domain mismatch

**Fix:**
1. Check Edge Function logs for: `ALLOWED_ORIGINS not set - allowing all origins`
2. Set `ALLOWED_ORIGINS` in Supabase Dashboard → Edge Functions → serve-file-inline → Settings
3. Ensure domain matches exactly (include protocol: `https://`)
4. Redeploy function after setting environment variable

### Issue: "Token has already been used" errors within 30 seconds

**Cause:** Possible race condition or clock skew

**Fix:**
1. Check Edge Function logs for specific token
2. Verify the race condition fix is deployed (check `index.ts` line 196 for `recheckNow`)
3. If persistent, increase `TOKEN_REUSE_GRACE_PERIOD_MS` in Edge Function

### Issue: Charts fail to load after deployment

**Cause:** Stale URLs or token generation failure

**Fix:**
1. Check browser console for `[refreshChartUrls]` errors
2. Verify user has active session
3. Check `file_access_tokens` table for recent tokens
4. Test token generation manually:
   ```sql
   SELECT * FROM file_access_tokens
   WHERE user_id = 'your-user-id'
   ORDER BY created_at DESC LIMIT 1;
   ```

## Rollback Plan

If issues occur after deployment:

```bash
# Rollback serve-file-inline to previous version
npx supabase functions deploy serve-file-inline --legacy-bundle

# Disable GitHub Actions workflow
# (Comment out 'schedule' section in .github/workflows/cleanup-tokens.yml)

# Manual cleanup if needed
SELECT cleanup_expired_file_tokens();
```

## Post-Deployment Checklist

After 24 hours:

- [ ] Check GitHub Actions workflow ran successfully (should run 24 times)
- [ ] Verify token cleanup is working:
  ```sql
  SELECT COUNT(*) FROM file_access_tokens
  WHERE expires_at < NOW() - INTERVAL '1 hour';
  -- Should be 0 or very low
  ```
- [ ] Review Edge Function logs for errors
- [ ] Verify CORS is working (no browser console errors)
- [ ] Check application performance (chart loading times)

## Success Criteria

✅ Deployment is successful if:
- GitHub Actions workflow runs hourly without errors
- Charts load correctly in browser
- No CORS errors in browser console
- Token table size stays manageable (< 1000 rows for typical usage)
- Edge Function logs show no critical errors

---

**Time estimate:** 15-20 minutes total
**Rollback time:** < 5 minutes if needed
**Impact:** Low (graceful degradation on errors)
