#!/bin/bash

# Integration tests for serve-file-inline Edge Function
# Requires local Supabase to be running: npx supabase start

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Get local Supabase URL
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"

echo -e "${YELLOW}Edge Function Integration Tests${NC}"
echo "Testing: ${SUPABASE_URL}/functions/v1/serve-file-inline"
echo ""

# Helper function to run test
run_test() {
  local test_name=$1
  local url=$2
  local expected_code=$3

  echo -n "Testing: $test_name ... "

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url")

  if [ "$HTTP_CODE" = "$expected_code" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $HTTP_CODE)"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC} (Expected: $expected_code, Got: $HTTP_CODE)"
    ((TESTS_FAILED++))
  fi
}

# Test 1: Missing path parameter
run_test "Missing path parameter" \
  "${SUPABASE_URL}/functions/v1/serve-file-inline?token=test" \
  "400"

# Test 2: Missing token parameter
run_test "Missing token parameter" \
  "${SUPABASE_URL}/functions/v1/serve-file-inline?path=test" \
  "401"

# Test 3: Invalid token
run_test "Invalid token" \
  "${SUPABASE_URL}/functions/v1/serve-file-inline?path=bands/test/charts/test/file.pdf&token=invalid-token-12345" \
  "401"

# Test 4: CORS preflight
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "${SUPABASE_URL}/functions/v1/serve-file-inline")
echo -n "Testing: CORS preflight ... "
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ PASSED${NC} (HTTP $HTTP_CODE)"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FAILED${NC} (Expected: 200, Got: $HTTP_CODE)"
  ((TESTS_FAILED++))
fi

echo ""
echo "================================"
echo "Test Results:"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo "================================"

if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
