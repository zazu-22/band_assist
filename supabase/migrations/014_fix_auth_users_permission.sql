-- Fix RLS policies that incorrectly access auth.users table
-- Migration: 014_fix_auth_users_permission.sql
--
-- PROBLEM: The invitations table RLS policies use subqueries like:
--   email = (SELECT email FROM auth.users WHERE id = auth.uid())
--
-- The authenticated role does not have SELECT permission on auth.users
-- in Supabase, causing "permission denied for table users" (42501) errors.
--
-- SOLUTION: Use auth.jwt() ->> 'email' instead, which extracts the email
-- from the JWT token without requiring table access.

-- =============================================================================
-- FIX INVITATIONS SELECT POLICY
-- =============================================================================

DROP POLICY IF EXISTS "Band members can view invitations for their band" ON invitations;
CREATE POLICY "Band members can view invitations for their band"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    OR email = (auth.jwt() ->> 'email')
  );

-- =============================================================================
-- FIX INVITATIONS UPDATE POLICY FOR INVITEES
-- =============================================================================

DROP POLICY IF EXISTS "Invitees can update their invitation status (accept)" ON invitations;
CREATE POLICY "Invitees can update their invitation status (accept)"
  ON invitations FOR UPDATE
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON POLICY "Band members can view invitations for their band" ON invitations IS
  'Users can view invitations for bands they belong to, or invitations sent to their email. Uses auth.jwt() instead of auth.users subquery for compatibility.';

COMMENT ON POLICY "Invitees can update their invitation status (accept)" ON invitations IS
  'Invitees can accept/update their own invitations (matched by email). Uses auth.jwt() instead of auth.users subquery for compatibility.';
