-- Band Assist: Database-Level Rate Limit Enforcement
-- Migration: 010_enforce_rate_limiting.sql
-- Depends on: 007_add_rate_limiting.sql, 008_fix_rate_limiting.sql
--
-- HISTORY:
-- - Migration 007: Added check_invitation_rate_limit() RPC and CHECK constraint
-- - Migration 008: Removed CHECK constraint (caused TOCTOU race conditions)
-- - Migration 010: Added trigger enforcement (prevents race conditions atomically)
--
-- PROBLEM: Application-level rate limit checks are vulnerable to race conditions
-- where multiple concurrent requests can bypass the limit.
--
-- SOLUTION: Add BEFORE INSERT trigger that enforces rate limits atomically
-- within the database transaction, preventing race conditions.

-- =============================================================================
-- SHARED COUNTING FUNCTION (Single Source of Truth)
-- =============================================================================

-- Counts pending invitations for a band in the last hour
-- This is the single source of truth for rate limiting logic
CREATE OR REPLACE FUNCTION count_pending_invitations(p_band_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  invitation_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO invitation_count
  FROM invitations
  WHERE band_id = p_band_id
    AND invited_at > (NOW() - INTERVAL '1 hour')
    AND status = 'pending';

  RETURN invitation_count;
END;
$$;

COMMENT ON FUNCTION count_pending_invitations IS
  'Counts pending invitations for a band in the last hour. Single source of truth for rate limiting logic. Used by both RPC check and trigger enforcement.';

-- =============================================================================
-- UPDATE RPC FUNCTION TO USE SHARED LOGIC
-- =============================================================================

-- Update the existing RPC function to use the shared counting function
CREATE OR REPLACE FUNCTION check_invitation_rate_limit(p_band_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  rate_limit INTEGER := 10;
BEGIN
  -- Use shared counting function for consistency
  RETURN count_pending_invitations(p_band_id) < rate_limit;
END;
$$;

-- Update comment to reflect new implementation
COMMENT ON FUNCTION check_invitation_rate_limit IS
  'Checks if a band has exceeded the invitation rate limit (10 pending invitations per hour). Returns true if under limit. Recommended for application-level UX (fast feedback). Actual enforcement is via database trigger (this migration).';

-- =============================================================================
-- TRIGGER FUNCTION: ENFORCE RATE LIMIT
-- =============================================================================

-- Function to enforce invitation rate limit at database level
-- Prevents TOCTOU race conditions by running atomically with INSERT
CREATE OR REPLACE FUNCTION enforce_invitation_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER  -- Runs with caller's permissions (safe: only reads from invitations)
AS $$
DECLARE
  invitation_count INTEGER;
  rate_limit INTEGER := 10;
BEGIN
  -- Use shared counting function for consistency
  invitation_count := count_pending_invitations(NEW.band_id);

  -- Raise exception if rate limit exceeded
  IF invitation_count >= rate_limit THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum % pending invitations per hour per band', rate_limit
      USING HINT = 'Please wait before sending additional invitations',
            ERRCODE = 'P0001'; -- raise_exception (standard for user-defined exceptions)
  END IF;

  -- Allow insert if under limit
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION enforce_invitation_rate_limit IS
  'Trigger function that enforces invitation rate limit (10 pending invitations per hour per band) at database level. Prevents TOCTOU race conditions by running atomically with INSERT. Raises P0001 exception if limit exceeded.';

-- =============================================================================
-- TRIGGER: CHECK RATE LIMIT BEFORE INSERT
-- =============================================================================

-- Create trigger that enforces rate limit on every invitation insert
CREATE TRIGGER check_rate_limit_before_insert
  BEFORE INSERT ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION enforce_invitation_rate_limit();

COMMENT ON TRIGGER check_rate_limit_before_insert ON invitations IS
  'Enforces invitation rate limit (10 pending per hour per band) atomically to prevent race conditions. Application should catch exception code P0001 and show friendly error.';

-- =============================================================================
-- SECURITY MODEL
-- =============================================================================

-- Two-layer defense approach:
--
-- 1. APPLICATION LAYER (check_invitation_rate_limit RPC):
--    - Fast feedback for users
--    - Prevents unnecessary requests
--    - Shows friendly error messages
--
-- 2. DATABASE LAYER (this trigger):
--    - Actual security enforcement
--    - Prevents race conditions (TOCTOU)
--    - Protects against bypass via raw SQL/API
--    - Runs atomically with INSERT
--
-- The application should:
-- 1. Call check_invitation_rate_limit() for UX (optional but recommended)
-- 2. Attempt INSERT
-- 3. Catch exception code 'P0001' and show user-friendly message
--
-- Even if concurrent requests pass the application check, only the first N
-- that fit under the limit will succeed at the database level.
--
-- ERROR CODE REFERENCE:
-- - P0001: Standard PostgreSQL error code for RAISE EXCEPTION
-- - Used consistently across all rate limit enforcement
