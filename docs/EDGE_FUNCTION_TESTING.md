# Edge Function Testing Guide

## Overview

This guide covers testing the `serve-file-inline` Edge Function, which handles secure file serving with short-lived tokens.

## Local Testing Setup

### Prerequisites

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
npx supabase start
```

### Deploy Function Locally

```bash
npx supabase functions deploy serve-file-inline --no-verify-jwt
```

## Manual Integration Tests

### Test 1: Token Validation

**Setup:**
1. Create a test user and get their ID
2. Create a test band
3. Upload a test file to storage

**Test valid token:**
```bash
# Get your local Supabase URL
SUPABASE_URL="http://localhost:54321"

# Create a file access token via your app's UI or programmatically
# Then test the Edge Function:
curl "${SUPABASE_URL}/functions/v1/serve-file-inline?path=bands/BAND_ID/charts/SONG_ID/file.pdf&token=TOKEN" \
  -o test-output.pdf

# Should return: 200 OK with PDF content
```

**Test expired token:**
```sql
-- Manually expire a token in the database
UPDATE file_access_tokens
SET expires_at = NOW() - INTERVAL '10 minutes'
WHERE token = 'YOUR_TOKEN';
```

```bash
curl -i "${SUPABASE_URL}/functions/v1/serve-file-inline?path=bands/BAND_ID/charts/SONG_ID/file.pdf&token=EXPIRED_TOKEN"

# Expected: 401 Unauthorized
# Response: {"error":"Token has expired"}
```

### Test 2: Path Authorization

**Test path mismatch:**
```bash
# Create token for file A, try to access file B
curl -i "${SUPABASE_URL}/functions/v1/serve-file-inline?path=bands/BAND_ID/charts/OTHER_SONG/file.pdf&token=TOKEN_FOR_DIFFERENT_FILE"

# Expected: 403 Forbidden
# Response: {"error":"Token is not valid for this file"}
```

**Test band isolation:**
```bash
# Create token for band A, try to access file from band B
curl -i "${SUPABASE_URL}/functions/v1/serve-file-inline?path=bands/OTHER_BAND_ID/charts/SONG_ID/file.pdf&token=TOKEN_FOR_DIFFERENT_BAND"

# Expected: 403 Forbidden
# Response: {"error":"File does not belong to the authorized band"}
```

### Test 3: Race Condition Handling

**Test concurrent requests with same token:**
```bash
# Send 5 concurrent requests with same token
for i in {1..5}; do
  curl -s "${SUPABASE_URL}/functions/v1/serve-file-inline?path=PATH&token=TOKEN" \
    -o "output-$i.pdf" &
done
wait

# Expected:
# - All requests within 30s grace period should succeed (200 OK)
# - Requests should get identical file content
# - Only one request should mark token as used (check database)
```

Verify in database:
```sql
SELECT used_at, created_at
FROM file_access_tokens
WHERE token = 'TOKEN';

-- used_at should be set to timestamp of first request
```

### Test 4: Token Reuse Grace Period

**Test within grace period (< 30 seconds):**
```bash
# First request
curl -s "${SUPABASE_URL}/functions/v1/serve-file-inline?path=PATH&token=TOKEN" -o output1.pdf

# Second request within 30 seconds
sleep 5
curl -i "${SUPABASE_URL}/functions/v1/serve-file-inline?path=PATH&token=TOKEN" -o output2.pdf

# Expected: 200 OK (within grace period)
```

**Test after grace period (> 30 seconds):**
```bash
# First request
curl -s "${SUPABASE_URL}/functions/v1/serve-file-inline?path=PATH&token=TOKEN" -o output1.pdf

# Second request after grace period
sleep 35
curl -i "${SUPABASE_URL}/functions/v1/serve-file-inline?path=PATH&token=TOKEN"

# Expected: 401 Unauthorized
# Response: {"error":"Token has already been used"}
```

### Test 5: Missing Parameters

**Test missing path:**
```bash
curl -i "${SUPABASE_URL}/functions/v1/serve-file-inline?token=TOKEN"

# Expected: 400 Bad Request
# Response: {"error":"Missing path parameter"}
```

**Test missing token:**
```bash
curl -i "${SUPABASE_URL}/functions/v1/serve-file-inline?path=PATH"

# Expected: 401 Unauthorized
# Response: {"error":"Missing token parameter"}
```

### Test 6: CORS Preflight

**Test OPTIONS request:**
```bash
curl -i -X OPTIONS "${SUPABASE_URL}/functions/v1/serve-file-inline"

# Expected: 200 OK with CORS headers
# Headers should include:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
```

## Automated Test Script

Create a test script `scripts/test-edge-function.sh`:

```bash
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run test
run_test() {
  local test_name=$1
  local command=$2
  local expected_code=$3

  echo "Running: $test_name"

  HTTP_CODE=$(eval "$command" 2>&1 | grep "HTTP" | awk '{print $2}')

  if [ "$HTTP_CODE" = "$expected_code" ]; then
    echo -e "${GREEN}✓ PASSED${NC}: $test_name"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC}: $test_name (Expected: $expected_code, Got: $HTTP_CODE)"
    ((TESTS_FAILED++))
  fi
  echo ""
}

# Run tests
echo "Starting Edge Function Integration Tests..."
echo ""

# Add your test cases here following the manual tests above

echo "Test Results:"
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -gt 0 ]; then
  exit 1
fi
```

## Production Testing Checklist

Before deploying to production, verify:

- [ ] Valid tokens return 200 OK with correct file
- [ ] Expired tokens return 401 Unauthorized
- [ ] Invalid tokens return 401 Unauthorized
- [ ] Path mismatch returns 403 Forbidden
- [ ] Cross-band access returns 403 Forbidden
- [ ] Missing parameters return 400/401 errors
- [ ] CORS headers allow frontend access
- [ ] Token reuse within 30s grace period works
- [ ] Token reuse after 30s grace period fails
- [ ] Concurrent requests handle race conditions correctly
- [ ] Content-Disposition header is set to "inline"
- [ ] Content-Type matches file extension

## Monitoring in Production

Watch for these metrics in Supabase Dashboard:

1. **Error rates** - Track 401/403 responses
2. **Response times** - Should be < 500ms
3. **Token usage patterns** - Identify suspicious reuse attempts
4. **Database query performance** - Token lookup speed

## Common Issues

### Issue: "Token has already been used" errors
- **Cause**: PDF viewer making multiple requests beyond grace period
- **Solution**: Increase `TOKEN_REUSE_GRACE_PERIOD_MS` in Edge Function

### Issue: "Invalid storage path format" errors
- **Cause**: Old URLs or incorrect path structure
- **Solution**: Ensure `refreshChartUrls()` is called on data load

### Issue: CORS errors in browser
- **Cause**: CORS headers not configured correctly
- **Solution**: Verify `corsHeaders` in Edge Function matches frontend domain
