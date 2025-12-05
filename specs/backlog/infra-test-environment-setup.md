# Test Environment Setup

| Field        | Value                                       |
| ------------ | ------------------------------------------- |
| **Status**   | Backlog                                     |
| **Authors**  | Claude (AI Assistant)                       |
| **Created**  | 2025-12-05                                  |
| **Updated**  | 2025-12-05                                  |
| **Priority** | High                                        |
| **Type**     | Infrastructure                              |

---

## Summary

Configure test environment with Supabase authentication to enable integration tests for service layer. This unblocks `infra-service-layer-testing` and `infra-ci-test-suite` specs.

---

## Problem

Integration tests for service methods (e.g., user-member linking) require:
- Supabase connection to local/test database
- Authentication context (service role or test user)
- Row Level Security (RLS) policy compliance
- Test data isolation

Currently, tests fail with `500 Internal Server Error` when trying to create test data due to missing authentication.

---

## Proposed Solution

Configure test environment to support authenticated integration tests with three implementation options.

### Option 1: Service Role Key (Recommended)

Use Supabase service role key to bypass RLS in tests:

**Pros:**
- Simplest implementation
- Works with local Supabase instance
- No additional setup needed

**Cons:**
- Bypasses RLS (doesn't test auth policies)
- Requires secure key management in CI

**Implementation:**
```typescript
// vitest.setup.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // From .env.test

export const testSupabase = createClient(supabaseUrl, serviceRoleKey);
```

### Option 2: Test User Authentication

Create dedicated test user and authenticate in beforeEach:

**Pros:**
- Tests real auth flow
- Tests RLS policies
- More realistic testing

**Cons:**
- Requires user creation/cleanup
- More complex setup
- Slower tests

**Implementation:**
```typescript
// Test setup
const testUser = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'test-password',
});
```

### Option 3: Mock Supabase Client

Mock Supabase client for unit tests:

**Pros:**
- Fast execution
- No database needed
- Full control over responses

**Cons:**
- Not true integration tests
- Doesn't catch database issues
- Maintenance overhead for mocks

---

## Technical Requirements

### 1. Environment Configuration

**Local Development:**
```bash
# .env.test (not committed)
VITE_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>  # From supabase status
```

**CI/CD:**
```yaml
# .github/workflows/test.yml
env:
  VITE_SUPABASE_URL: http://localhost:54321
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### 2. Test Database Setup

**Option A: Local Supabase Instance**
- Run `supabase start` before tests
- Reset database with `supabase db reset` for clean slate
- Use migrations to set up schema

**Option B: Dedicated Test Database**
- Create separate Supabase project for testing
- Configure test-specific RLS policies
- Automatic cleanup after tests

### 3. Test Data Isolation

**Strategy 1: Test Band Pattern**
```typescript
beforeEach(async () => {
  // Create test band with unique ID
  testBandId = `test-band-${Date.now()}`;
  // Create test user
  // Link user to band via user_bands
});

afterEach(async () => {
  // Clean up test band (CASCADE deletes members, etc.)
  await testSupabase.from('bands').delete().eq('id', testBandId);
});
```

**Strategy 2: Transaction Rollback**
- Use database transactions
- Rollback after each test
- Requires pgTAP or similar

### 4. Vitest Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    globalSetup: ['./vitest.global-setup.ts'], // Start Supabase
    environment: 'jsdom',
    testTimeout: 10000, // Longer for integration tests
  },
});
```

### 5. Global Setup/Teardown

```typescript
// vitest.global-setup.ts
export async function setup() {
  // Start local Supabase if not running
  // Wait for health check
  // Run migrations
}

export async function teardown() {
  // Optionally stop Supabase
  // Clean up test data
}
```

---

## Acceptance Criteria

- [ ] Test environment variables configured (`.env.test` created)
- [ ] Supabase client configured with authentication for tests
- [ ] Local Supabase starts automatically before tests
- [ ] Test data isolation strategy implemented
- [ ] Integration tests pass locally
- [ ] Integration tests pass in CI/CD
- [ ] Test cleanup removes all test data
- [ ] README updated with test setup instructions
- [ ] `describe.skip` removed from user-member linking tests
- [ ] No test failures due to authentication issues

---

## Implementation Steps

### Phase 1: Local Setup (30 min)

1. Create `.env.test` with service role key
2. Update `vitest.setup.ts` to use service role client
3. Implement test data cleanup in `afterEach`
4. Run tests locally to verify

### Phase 2: CI/CD Setup (30 min)

5. Add GitHub secret for service role key
6. Update GitHub Actions workflow to start Supabase
7. Configure test environment in workflow
8. Verify tests pass in CI

### Phase 3: Documentation (15 min)

9. Update test README with setup instructions
10. Document environment variables
11. Add troubleshooting section

---

## Dependencies

**Blocks:**
- `infra-service-layer-testing` - Cannot expand test coverage without auth
- `infra-ci-test-suite` - Cannot run integration tests in CI

**Requires:**
- Local Supabase CLI installed
- Node.js test environment

---

## Testing Strategy

**Manual Testing:**
1. Run `npm test` locally - should start Supabase and pass tests
2. Run in CI - should pass without manual intervention
3. Verify test data cleanup with database inspection

**Validation:**
```bash
# Start fresh
npx supabase db reset

# Run tests
npm test

# Verify no test data remains
psql -h localhost -p 54322 -U postgres -d postgres \
  -c "SELECT * FROM bands WHERE id LIKE 'test-%';"
# Should return 0 rows
```

---

## Security Considerations

1. **Service Role Key:**
   - Never commit to git
   - Store in GitHub secrets for CI
   - Rotate periodically

2. **Test Data:**
   - Use obviously fake emails (test@example.com)
   - Clean up after every test run
   - Don't use production-like data

3. **Test Database:**
   - Isolate from production
   - Use separate Supabase project for CI
   - Limit access to test environment

---

## Migration Path

**From Current State (Tests Disabled):**
1. Implement service role authentication ✓ Quick win
2. Enable tests (`describe.skip` → `describe`)
3. Verify all tests pass
4. Add CI/CD configuration
5. Monitor for flaky tests

**Future Enhancement:**
- Add test user authentication for RLS testing
- Implement transaction-based isolation
- Add performance benchmarks

---

## Estimated Effort

**Total:** 1-2 hours

**Breakdown:**
- Environment setup: 30 min
- Test client configuration: 30 min
- CI/CD integration: 30 min
- Documentation: 15 min
- Buffer for issues: 15 min

---

## References

- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Vitest Global Setup](https://vitest.dev/config/#globalsetup)
- [Service Role Key Usage](https://supabase.com/docs/guides/auth#service-role-key)
- Test README: `src/services/__tests__/README.md`
