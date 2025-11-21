-- Enable Real-time Subscriptions for Collaborative Editing
-- Allows frontend to subscribe to database changes in real-time

-- Enable real-time on all core tables
ALTER PUBLICATION supabase_realtime ADD TABLE band_members;
ALTER PUBLICATION supabase_realtime ADD TABLE songs;
ALTER PUBLICATION supabase_realtime ADD TABLE band_events;
ALTER PUBLICATION supabase_realtime ADD TABLE roles;

-- Note: Real-time subscriptions will allow the frontend to listen for:
-- - INSERT: New songs, members, events added by other users
-- - UPDATE: Changes to existing records
-- - DELETE: Removed records
--
-- Example frontend subscription:
-- supabase
--   .channel('band-updates')
--   .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, handleChange)
--   .subscribe()
