# Cleanup Expired Tokens Edge Function

## Overview

This scheduled Edge Function automatically cleans up expired file access tokens to prevent table bloat. It calls the `cleanup_expired_file_tokens()` database function which removes tokens that have been expired for more than 1 hour.

## Why This Is Needed

File access tokens are created every time a user views a PDF or image. Without cleanup:
- With high usage, thousands of tokens could accumulate daily
- Each token row takes up database space
- Table bloat slows down token lookups

This function ensures old tokens are regularly removed.

## Setup Instructions

### Initial Setup

Before deploying this function, create the `.npmrc` file:

```bash
cat > supabase/functions/cleanup-expired-tokens/.npmrc << 'EOF'
node-linker=hoisted
EOF
```

This ensures consistent package management for the Edge Function.

### Option 1: GitHub Actions (Recommended)

Create `.github/workflows/cleanup-tokens.yml`:

```yaml
name: Cleanup Expired Tokens

on:
  schedule:
    # Run every hour at :15 (e.g., 00:15, 01:15, 02:15)
    - cron: '15 * * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup Expired Tokens
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://your-project.supabase.co/functions/v1/cleanup-expired-tokens
```

**Required GitHub Secrets:**

Add these secrets in GitHub repository Settings → Secrets and variables → Actions:

```bash
# Using GitHub CLI
gh secret set SUPABASE_URL --body "https://your-project.supabase.co"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "your-service-role-key"

# Or add manually via GitHub web interface
```

**Note:** Without these secrets, the workflow will fail. Verify secrets are set before enabling the workflow.

### Option 2: Supabase CLI (Local Testing)

Test the function locally:

```bash
# Start Supabase
npx supabase start

# Deploy function
npx supabase functions deploy cleanup-expired-tokens

# Test manually
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  http://localhost:54321/functions/v1/cleanup-expired-tokens
```

### Option 3: pg_cron (Advanced)

If your Supabase project has the `pg_cron` extension enabled, you can schedule the cleanup directly in PostgreSQL:

```sql
-- Enable pg_cron (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run every hour
SELECT cron.schedule(
  'cleanup-expired-file-tokens',
  '0 * * * *', -- Every hour at :00
  $$SELECT cleanup_expired_file_tokens();$$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Unschedule if needed
SELECT cron.unschedule('cleanup-expired-file-tokens');
```

**Note**: `pg_cron` is not available on Supabase free tier. Use GitHub Actions instead.

## Monitoring

Check cleanup results in Supabase Dashboard > Edge Functions > cleanup-expired-tokens > Logs.

Successful execution logs:
```json
{
  "success": true,
  "deletedCount": 42,
  "timestamp": "2025-12-04T10:15:00.000Z"
}
```

## How It Works

1. Function is triggered (scheduled or manual)
2. Validates authorization header
3. Calls `cleanup_expired_file_tokens()` database function
4. Database function deletes tokens where `expires_at < NOW() - INTERVAL '1 hour'`
5. Returns count of deleted tokens

## Security

- Requires `Authorization: Bearer` header with service role key
- Only service role can execute this function
- Database function uses `SECURITY DEFINER` to bypass RLS

## Customization

To change cleanup frequency or retention period:

**Cleanup frequency**: Update the cron schedule in your chosen setup method

**Retention period**: Modify the database function in migration `016_add_file_access_tokens.sql`:

```sql
-- Change from 1 hour to 24 hours
WHERE expires_at < NOW() - INTERVAL '24 hours';
```
