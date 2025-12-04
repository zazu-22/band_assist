-- Add file_access_tokens table for secure, short-lived file access
-- Addresses security concern from PR #109 review: tokens in URL

-- =============================================================================
-- FILE ACCESS TOKENS TABLE
-- =============================================================================

CREATE TABLE file_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ, -- NULL = unused, set on first use for single-use tokens
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_file_access_tokens_token ON file_access_tokens(token) WHERE used_at IS NULL AND expires_at > NOW();
CREATE INDEX idx_file_access_tokens_user_id ON file_access_tokens(user_id);
CREATE INDEX idx_file_access_tokens_expires_at ON file_access_tokens(expires_at);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE file_access_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view their own file access tokens"
  ON file_access_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create tokens for bands they belong to
CREATE POLICY "Users can create file access tokens for their bands"
  ON file_access_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

-- Service role can update tokens (mark as used)
CREATE POLICY "Service role can update file access tokens"
  ON file_access_tokens FOR UPDATE
  TO service_role
  USING (true);

-- =============================================================================
-- CLEANUP FUNCTION
-- =============================================================================

-- Function to clean up expired tokens (should be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_file_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM file_access_tokens
  WHERE expires_at < NOW() - INTERVAL '1 hour'; -- Keep for 1 hour after expiry for debugging

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE file_access_tokens IS 'Short-lived, single-use tokens for secure file access. Tokens expire after 5 minutes and are marked as used on first access.';
COMMENT ON COLUMN file_access_tokens.token IS 'Random token used in URL query parameter';
COMMENT ON COLUMN file_access_tokens.storage_path IS 'Full storage path (e.g., bands/{band_id}/charts/{song_id}/{file_id}.ext)';
COMMENT ON COLUMN file_access_tokens.band_id IS 'Band that owns the file - used for authorization';
COMMENT ON COLUMN file_access_tokens.expires_at IS 'Token expiry time (typically 5 minutes from creation)';
COMMENT ON COLUMN file_access_tokens.used_at IS 'Timestamp of first use - for single-use tokens';
