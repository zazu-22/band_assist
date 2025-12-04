# Serve File Inline Edge Function

## Overview

This Supabase Edge Function serves storage files with the `Content-Disposition: inline` header, which fixes the Firefox PDF download issue. Files display inline in the browser instead of being downloaded.

## Security Model

### File Access Tokens

This function uses **short-lived file access tokens** instead of JWT tokens in URLs. This provides significantly better security:

- **Tokens expire after 5 minutes** - Reduces exposure window
- **Limited reuse** - Token can be reused within 30 seconds of first use (grace period for PDF viewer reloads)
- **File-specific** - Each token is bound to a specific storage path
- **Band-scoped** - Token includes band_id for authorization

### Authorization Flow

1. **Client requests file URL**: Storage service generates a file access token
2. **Token creation**: Random UUID token stored in `file_access_tokens` table with:
   - `storage_path` - Full path to the file
   - `user_id` - User who generated the token
   - `band_id` - Band that owns the file
   - `expires_at` - 5 minutes from now
   - `used_at` - NULL (not yet used)

3. **Edge Function validation**:
   - Validates token exists and hasn't expired
   - Checks token can be used (first use or within 30s grace period)
   - Verifies storage path matches token's path
   - Confirms file belongs to the authorized band
   - Marks token as used on first access

4. **File delivery**: Serves file with `Content-Disposition: inline` header

### Why Not JWT in URL?

JWT tokens in URLs have several security issues:

- **Logged everywhere**: URLs appear in server logs, browser history, analytics
- **Referer leakage**: Token exposed via Referer header when navigating away
- **Long-lived**: JWT tokens typically valid for hours or days
- **Reusable**: Same token can access multiple files

File access tokens solve all these issues.

## Path-Based Authorization

The function validates that:

1. **User owns the token**: Token was created by/for this user
2. **Band membership**: User has access to the band that owns the file
3. **Path validation**: Storage path matches the format `bands/{band_id}/...`
4. **Band ID consistency**: Band ID in path matches token's band_id

This prevents users from accessing files belonging to other bands, even if they somehow obtain a token.

## Configuration

In `supabase/config.toml`:

```toml
[functions.serve-file-inline]
enabled = true
verify_jwt = false  # We use custom file access tokens instead
```

**Important**: `verify_jwt` is set to `false` because this function validates custom file access tokens, not JWT tokens.

## Token Cleanup

Expired tokens are automatically cleaned up via the `cleanup_expired_file_tokens()` database function. Tokens are kept for 1 hour after expiry for debugging purposes.

To manually clean up expired tokens:

```sql
SELECT cleanup_expired_file_tokens();
```

## Performance Optimizations

- **Batched session lookups**: Client gets session once and reuses user ID for multiple token generations
- **Lazy URL generation**: URLs generated only when needed
- **Database indexing**: Fast token lookups via indexed queries

## Testing

Test the function locally:

```bash
# Start Supabase locally
npx supabase start

# Deploy function
npx supabase functions deploy serve-file-inline

# Test with a valid token
curl "http://localhost:54321/functions/v1/serve-file-inline?path=bands/xxx/charts/xxx/file.pdf&token=xxx"
```

## Monitoring

Watch for these Edge Function logs:

- `Invalid or expired token` - Token validation failed
- `Token has expired` - Token past expiry time
- `Token has already been used` - Token used beyond 30-second grace period
- `Token is not valid for this file` - Path mismatch
- `File does not belong to the authorized band` - Authorization failure
