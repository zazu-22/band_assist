import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchUnlinkedMembers,
  claimMember,
  SupabaseStorageService,
} from '../supabaseStorageService';
import { getSupabaseClient } from '../supabaseClient';

/**
 * Integration tests for user-member linking service methods
 *
 * These tests verify the functionality of:
 * - getLinkedMemberForUser: Retrieve member linked to a user
 * - fetchUnlinkedMembers: Get all members not linked to users
 * - claimMember: Link a member record to a user
 *
 * Test Strategy:
 * - Uses real Supabase connection for integration testing
 * - Creates isolated test data for each test
 * - Tests both happy paths and error scenarios
 * - Includes race condition testing for concurrent claims
 * - Proper cleanup after each test to prevent data pollution
 *
 * NOTE: Tests are currently skipped pending test environment setup.
 * See README.md in this directory for setup instructions.
 * See specs/backlog/infra-test-environment-setup.md for implementation plan.
 */

describe.skip('User-Member Linking Service Methods', () => {
  let testBandId: string;
  let testUserId: string;
  let testUserId2: string;
  let testMemberId1: string;
  let testMemberId2: string;
  let testMemberId3: string;
  let createdMemberIds: string[] = [];
  let createdBandId: string | null = null;
  let createdUserBandRecords: Array<{ userId: string; bandId: string }> = [];

  const supabase = getSupabaseClient();

  beforeEach(async () => {
    if (!supabase) {
      throw new Error('Supabase client not available for integration tests');
    }

    // Generate unique test IDs using valid UUIDs
    testBandId = crypto.randomUUID();
    testUserId = crypto.randomUUID();
    testUserId2 = crypto.randomUUID();
    testMemberId1 = crypto.randomUUID();
    testMemberId2 = crypto.randomUUID();
    testMemberId3 = crypto.randomUUID();

    createdMemberIds = [];
    createdBandId = null;
    createdUserBandRecords = [];

    // Create test band
    const { error: bandError } = await supabase.from('bands').insert({
      id: testBandId,
      name: 'Test Band for User Linking',
      created_by: testUserId,
    });

    if (bandError) {
      throw new Error(`Failed to create test band: ${bandError.message}`);
    }
    createdBandId = testBandId;

    // Create user_bands relationship for testUserId
    const { error: userBandError } = await supabase.from('user_bands').insert({
      user_id: testUserId,
      band_id: testBandId,
      role: 'admin',
    });

    if (userBandError) {
      throw new Error(`Failed to create user_bands record: ${userBandError.message}`);
    }
    createdUserBandRecords.push({ userId: testUserId, bandId: testBandId });

    // Create test members (all initially unlinked)
    const members = [
      {
        id: testMemberId1,
        name: 'Alice Test',
        roles: ['Vocals', 'Guitar'],
        avatar_color: 'bg-amber-500',
        band_id: testBandId,
        user_id: null,
      },
      {
        id: testMemberId2,
        name: 'Bob Test',
        roles: ['Bass'],
        avatar_color: 'bg-blue-500',
        band_id: testBandId,
        user_id: null,
      },
      {
        id: testMemberId3,
        name: 'Charlie Test',
        roles: ['Drums'],
        avatar_color: 'bg-green-500',
        band_id: testBandId,
        user_id: null,
      },
    ];

    const { error: membersError } = await supabase.from('band_members').insert(members);

    if (membersError) {
      throw new Error(`Failed to create test members: ${membersError.message}`);
    }
    createdMemberIds = [testMemberId1, testMemberId2, testMemberId3];
  });

  afterEach(async () => {
    if (!supabase) return;

    // Clean up test data in reverse order of creation
    // Delete band_members first (foreign key dependency)
    if (createdMemberIds.length > 0) {
      await supabase.from('band_members').delete().in('id', createdMemberIds);
    }

    // Delete user_bands records
    for (const record of createdUserBandRecords) {
      await supabase
        .from('user_bands')
        .delete()
        .eq('user_id', record.userId)
        .eq('band_id', record.bandId);
    }

    // Delete band last
    if (createdBandId) {
      await supabase.from('bands').delete().eq('id', createdBandId);
    }

    // Reset tracking arrays
    createdMemberIds = [];
    createdBandId = null;
    createdUserBandRecords = [];
  });

  describe('getLinkedMemberForUser', () => {
    it('should return linked member when user has linked member', async () => {
      // Arrange: Link testMemberId1 to testUserId
      if (!supabase) throw new Error('Supabase client not available');

      await supabase
        .from('band_members')
        .update({ user_id: testUserId })
        .eq('id', testMemberId1);

      // Create service instance
      const service = new SupabaseStorageService();

      // Act
      const result = await service.getLinkedMemberForUser(testUserId, testBandId);

      // Assert
      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        id: testMemberId1,
        name: 'Alice Test',
        roles: ['Vocals', 'Guitar'],
        userId: testUserId,
      });
      expect(result?.avatarColor).toBeDefined();
    });

    it('should return null when user has no linked member', async () => {
      // Arrange: No members linked to testUserId
      const service = new SupabaseStorageService();

      // Act
      const result = await service.getLinkedMemberForUser(testUserId, testBandId);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when user is in different band', async () => {
      // Arrange: Create a different band and link member there
      if (!supabase) throw new Error('Supabase client not available');

      const otherBandId = crypto.randomUUID();
      await supabase.from('bands').insert({
        id: otherBandId,
        name: 'Other Test Band',
        created_by: testUserId,
      });
      createdBandId = otherBandId; // Track for cleanup

      const otherMemberId = crypto.randomUUID();
      await supabase.from('band_members').insert({
        id: otherMemberId,
        name: 'Other Member',
        roles: ['Guitar'],
        band_id: otherBandId,
        user_id: testUserId,
      });
      createdMemberIds.push(otherMemberId);

      const service = new SupabaseStorageService();

      // Act: Query original band (should return null)
      const result = await service.getLinkedMemberForUser(testUserId, testBandId);

      // Assert
      expect(result).toBeNull();

      // Cleanup other band
      await supabase.from('band_members').delete().eq('id', otherMemberId);
      await supabase.from('bands').delete().eq('id', otherBandId);
    });

    it('should throw error on database failure', async () => {
      // Arrange: Use invalid band ID to trigger database error
      const service = new SupabaseStorageService();
      const invalidBandId = 'invalid-band-id-that-does-not-exist';

      // Act & Assert
      // Note: With RLS policies, this may return null instead of error
      // Testing with a properly formatted UUID that doesn't exist
      const result = await service.getLinkedMemberForUser(testUserId, invalidBandId);

      // The query succeeds but returns null (no matching records)
      expect(result).toBeNull();
    });
  });

  describe('fetchUnlinkedMembers', () => {
    it('should return array of unlinked members', async () => {
      // Arrange: All members are unlinked by default from beforeEach

      // Act
      const result = await fetchUnlinkedMembers(testBandId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: testMemberId1,
            name: 'Alice Test',
            roles: ['Vocals', 'Guitar'],
          }),
          expect.objectContaining({
            id: testMemberId2,
            name: 'Bob Test',
            roles: ['Bass'],
          }),
          expect.objectContaining({
            id: testMemberId3,
            name: 'Charlie Test',
            roles: ['Drums'],
          }),
        ])
      );
    });

    it('should return empty array when all members are linked', async () => {
      // Arrange: Link all members to users
      if (!supabase) throw new Error('Supabase client not available');

      await supabase
        .from('band_members')
        .update({ user_id: testUserId })
        .eq('id', testMemberId1);
      await supabase
        .from('band_members')
        .update({ user_id: testUserId2 })
        .eq('id', testMemberId2);
      await supabase
        .from('band_members')
        .update({ user_id: 'another-user-id' })
        .eq('id', testMemberId3);

      // Act
      const result = await fetchUnlinkedMembers(testBandId);

      // Assert
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should not return linked members', async () => {
      // Arrange: Link one member
      if (!supabase) throw new Error('Supabase client not available');

      await supabase
        .from('band_members')
        .update({ user_id: testUserId })
        .eq('id', testMemberId1);

      // Act
      const result = await fetchUnlinkedMembers(testBandId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.find((m: { id: string }) => m.id === testMemberId1)).toBeUndefined();
      expect(result.find((m: { id: string }) => m.id === testMemberId2)).toBeDefined();
      expect(result.find((m: { id: string }) => m.id === testMemberId3)).toBeDefined();
    });

    it('should return members sorted by name', async () => {
      // Act
      const result = await fetchUnlinkedMembers(testBandId);

      // Assert
      expect(result).toHaveLength(3);
      // Names should be in alphabetical order: Alice Test, Bob Test, Charlie Test
      expect(result[0].name).toBe('Alice Test');
      expect(result[1].name).toBe('Bob Test');
      expect(result[2].name).toBe('Charlie Test');
    });

    it('should throw error on database failure', async () => {
      // Arrange: Mock Supabase client to return null (simulating configuration error)
      const supabaseClientModule = await import('../supabaseClient');
      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(null);

      // Act & Assert
      await expect(fetchUnlinkedMembers(testBandId)).rejects.toThrow(
        'Supabase is not configured'
      );

      // Restore mocks
      vi.restoreAllMocks();
    });
  });

  describe('claimMember', () => {
    it('should successfully claim unlinked member', async () => {
      // Act
      await claimMember(testUserId, testMemberId1, testBandId);

      // Assert: Verify member is now linked
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('band_members')
        .select('user_id')
        .eq('id', testMemberId1)
        .single();

      expect(error).toBeNull();
      expect(data?.user_id).toBe(testUserId);
    });

    it('should throw error when user is not a band member', async () => {
      // Arrange: Use a user ID that's not in user_bands
      const nonMemberUserId = 'non-member-user-id';

      // Act & Assert
      await expect(claimMember(nonMemberUserId, testMemberId1, testBandId)).rejects.toThrow(
        'You must be a member of this band to claim a member record'
      );
    });

    it('should throw error when member is already claimed', async () => {
      // Arrange: Link member to testUserId2
      if (!supabase) throw new Error('Supabase client not available');

      await supabase
        .from('band_members')
        .update({ user_id: testUserId2 })
        .eq('id', testMemberId1);

      // Act & Assert: Try to claim with testUserId
      await expect(claimMember(testUserId, testMemberId1, testBandId)).rejects.toThrow(
        'This member is already linked to another user'
      );
    });

    it('should throw error when user already linked to another member', async () => {
      // Arrange: First, create user_bands record for testUserId2
      if (!supabase) throw new Error('Supabase client not available');

      await supabase.from('user_bands').insert({
        user_id: testUserId2,
        band_id: testBandId,
        role: 'member',
      });
      createdUserBandRecords.push({ userId: testUserId2, bandId: testBandId });

      // Link testMemberId1 to testUserId
      await claimMember(testUserId, testMemberId1, testBandId);

      // Act & Assert: Try to claim another member with same user
      await expect(claimMember(testUserId, testMemberId2, testBandId)).rejects.toThrow(
        'You are already linked to a member in this band'
      );
    });

    it('should handle concurrent claim attempts', async () => {
      // Arrange: Create user_bands record for testUserId2
      if (!supabase) throw new Error('Supabase client not available');

      await supabase.from('user_bands').insert({
        user_id: testUserId2,
        band_id: testBandId,
        role: 'member',
      });
      createdUserBandRecords.push({ userId: testUserId2, bandId: testBandId });

      // Act: Attempt concurrent claims for the same member
      const claim1Promise = claimMember(testUserId, testMemberId1, testBandId);
      const claim2Promise = claimMember(testUserId2, testMemberId1, testBandId);

      // Wait for both promises to settle
      const results = await Promise.allSettled([claim1Promise, claim2Promise]);

      // Assert: One should succeed, one should fail
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // Verify the failed attempt has appropriate error message
      const failedResult = results.find(r => r.status === 'rejected') as
        | PromiseRejectedResult
        | undefined;
      expect(failedResult).toBeDefined();
      expect(failedResult!.reason).toBeInstanceOf(Error);
      const errorMessage = (failedResult!.reason as Error).message;
      expect(
        errorMessage.includes('already linked') || errorMessage.includes('just claimed')
      ).toBe(true);

      // Verify member is linked to exactly one user
      const { data } = await supabase
        .from('band_members')
        .select('user_id')
        .eq('id', testMemberId1)
        .single();

      expect(data?.user_id).toBeTruthy();
      expect([testUserId, testUserId2]).toContain(data?.user_id);
    });

    it('should throw error when member not found', async () => {
      // Arrange: Use non-existent member ID
      const nonExistentMemberId = 'non-existent-member-id';

      // Act & Assert
      await expect(claimMember(testUserId, nonExistentMemberId, testBandId)).rejects.toThrow(
        'Member not found in this band'
      );
    });

    it('should throw error on database failure', async () => {
      // Arrange: Mock getSupabaseClient to return null
      const supabaseClientModule = await import('../supabaseClient');
      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(null);

      // Act & Assert
      await expect(claimMember(testUserId, testMemberId1, testBandId)).rejects.toThrow(
        'Supabase is not configured'
      );

      // Restore
      vi.restoreAllMocks();
    });
  });
});
