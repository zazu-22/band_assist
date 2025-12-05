# Service Integration Tests

## User-Member Linking Tests

The file `supabaseStorageService.userMemberLinking.test.ts` contains comprehensive integration tests for the three user-member linking service methods:

### Test Coverage

1. **getLinkedMemberForUser** (4 tests)
   - Returns linked member when user has linked member
   - Returns null when user has no linked member  
   - Returns null when user is in different band
   - Throws error on database failure

2. **fetchUnlinkedMembers** (5 tests)
   - Returns array of unlinked members
   - Returns empty array when all members are linked
   - Does not return linked members
   - Returns members sorted by name
   - Throws error on database failure

3. **claimMember** (7 tests)
   - Successfully claims unlinked member
   - Throws error when user is not a band member
   - Throws error when member is already claimed
   - Throws error when user already linked to another member
   - Handles concurrent claim attempts (race condition test)
   - Throws error when member not found
   - Throws error on database failure

### Running the Tests

These are **integration tests** that require:

1. **Supabase Configuration**: Environment variables must be set
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. **Authenticated Session**: RLS policies require a valid user session
   - Tests create bands which require authentication
   - You may need to modify RLS policies for test environment
   - OR use a service role key for testing (bypasses RLS)

3. **Test Database**: Recommended to use a separate test database or test data isolation

### Running Tests

```bash
# Run all service tests
npm test -- src/services/__tests__/

# Run only user-member linking tests
npm test -- src/services/__tests__/supabaseStorageService.userMemberLinking.test.ts

# Run with coverage
npm run test:coverage -- src/services/__tests__/
```

### Test Environment Setup

To run these integration tests successfully, you need to either:

1. **Option A: Use Service Role Key** (Bypasses RLS)
   - Create a `.env.test` file with service role key
   - Configure Vitest to use it for tests

2. **Option B: Modify RLS Policies for Test Environment**
   - Allow inserts/updates during test runs
   - Use a test-specific database

3. **Option C: Mock Supabase Client**
   - Convert to unit tests with mocked Supabase responses
   - Faster but less comprehensive

### Current Status

- ✅ All 16 tests implemented
- ✅ TypeScript compilation passes
- ✅ ESLint validation passes  
- ⚠️ Tests fail due to RLS policies (need auth setup)

### Next Steps

1. Set up test authentication mechanism
2. Configure test environment variables
3. Run tests against test database
4. Verify all test scenarios pass
5. Add to CI/CD pipeline
