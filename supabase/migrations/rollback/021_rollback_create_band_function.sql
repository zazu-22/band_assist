-- Rollback: Remove atomic band creation function

DROP FUNCTION IF EXISTS create_band_with_admin(TEXT);
