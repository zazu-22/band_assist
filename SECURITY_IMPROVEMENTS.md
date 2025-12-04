# Security and Performance Improvements - Issue #110

This document summarizes the security and performance improvements made to address the follow-up comments from PR #109.

## Overview

The original implementation in PR #109 used JWT access tokens in URL query parameters for file access. This had several security and performance concerns that have been addressed in this update.

## Security Improvements

### 1. File Access Tokens (High Priority)

**Problem**: JWT tokens in URL query parameters are insecure because:
- URLs are logged in server logs, browser history, and analytics
- Tokens can leak via the Referer header
- JWT tokens are long-lived (hours/days)
- Same token can access multiple files

**Solution**: Implemented short-lived, single-use file access tokens:

- **Created `file_access_tokens` table** (`supabase/migrations/016_add_file_access_tokens.sql`)
  - Stores token, user_id, storage_path, band_id, expires_at, used_at
  - Tokens expire after 5 minutes
  - Tokens marked as used on first access (single-use)
  - Includes cleanup function for expired tokens

- **Updated Edge Function** (`supabase/functions/serve-file-inline/index.ts`)
  - Validates file access token instead of JWT
  - Checks token hasn't expired
  - Checks token hasn't been used
  - Verifies storage path matches token's path
  - Marks token as used after first access

- **Updated Storage Service** (`src/services/supabaseStorageService.ts`)
  - Added `generateFileAccessToken()` method
  - Updated `regenerateSignedUrl()` to create file access tokens
  - Updated `uploadFile()` to use new token generation

### 2. Path-Based Authorization (High Priority)

**Problem**: No verification that the user has permission to access specific files.

**Solution**: Added comprehensive path-based authorization in Edge Function:

```typescript
// Verify storage path matches token's path
if (storagePath !== tokenData.storage_path) {
  return 403 // Forbidden
}

// Verify file belongs to authorized band
const pathBandId = storagePath.split('/')[1]
if (pathBandId !== tokenData.band_id) {
  return 403 // Forbidden
}
```

This prevents users from:
- Accessing files from other bands
- Using tokens for different files than intended
- Bypassing band membership checks

## Performance Improvements

### 3. Batched Session Lookups (Medium Priority)

**Problem**: `supabase.auth.getSession()` was called for every chart URL regeneration. For 50 charts, that's 50 redundant session lookups.

**Solution**:
- Updated `regenerateSignedUrl()` to accept optional `userId` parameter
- Updated `refreshChartUrls()` to get session once and pass userId to all URL generations
- Reduces session lookups from O(n) to O(1) per load

**Performance Impact**: For a band with 50 songs and 3 charts each (150 charts):
- Before: 150 session lookups
- After: 1 session lookup
- **~99% reduction** in session API calls

### 4. Token Generation Optimization

**Solution**: Generate tokens only when needed (lazy generation already in place)
- URLs generated when charts are loaded
- Tokens created on-demand for each file access
- 5-minute expiry keeps token count low

## Documentation Updates

### 5. JWT Verification Configuration

**Problem**: Contradictory configuration - PR description said disable JWT verification, but config had `verify_jwt = true`.

**Solution**:
- Updated `supabase/config.toml` to set `verify_jwt = false`
- Added comments explaining why (custom file access tokens instead of JWT)
- Created comprehensive `supabase/functions/serve-file-inline/README.md` documenting:
  - Security model
  - Authorization flow
  - Token lifecycle
  - Performance optimizations
  - Testing instructions

### 6. Updated Database Types

**Solution**: Added `file_access_tokens` table definition to `src/types/database.types.ts` for TypeScript type safety.

## Testing

All 735 tests passing:
- ✅ TypeScript compilation (`npm run typecheck`)
- ✅ ESLint validation (`npm run lint`)
- ✅ Unit tests (`npm test`)

## Migration Path

### For Development:

1. Run migration: `npx supabase db push`
2. Update Edge Function: `npx supabase functions deploy serve-file-inline`
3. Restart dev server: `npm run dev`

### For Production:

1. Apply migration via Supabase Dashboard or CLI
2. Deploy updated Edge Function
3. Verify JWT verification is disabled in function settings
4. Monitor Edge Function logs for any issues

## Security Checklist Summary

- ✅ Short-lived tokens (5 minutes)
- ✅ Single-use tokens
- ✅ File-specific tokens
- ✅ Band-scoped authorization
- ✅ Path validation
- ✅ No JWT in URLs
- ✅ Proper error messages (no information leakage)
- ✅ Database-backed token validation
- ✅ Automatic token cleanup

## Performance Checklist Summary

- ✅ Batched session lookups
- ✅ Lazy URL generation
- ✅ Database indexing for fast token lookups
- ✅ Reduced API calls from O(n) to O(1)

## Files Changed

1. `supabase/migrations/016_add_file_access_tokens.sql` - New migration
2. `supabase/functions/serve-file-inline/index.ts` - Updated security model
3. `supabase/functions/serve-file-inline/README.md` - New documentation
4. `supabase/config.toml` - Updated JWT verification setting
5. `src/services/supabaseStorageService.ts` - Token generation and batching
6. `src/types/database.types.ts` - Added file_access_tokens table types

## References

- Issue #110: https://github.com/zazu-22/band_assist/issues/110
- PR #109: https://github.com/zazu-22/band_assist/pull/109
- OWASP URL Token Security: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
