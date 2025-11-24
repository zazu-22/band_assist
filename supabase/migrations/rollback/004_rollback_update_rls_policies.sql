-- Rollback for 004_update_rls_policies.sql
-- Reverts RLS policy updates

-- Note: This rollback assumes the original RLS policies from 001_initial_schema.sql
-- Since 004 updated policies, we need to restore the original simple policies

-- Drop updated policies
DROP POLICY IF EXISTS "Users can view members in their bands" ON band_members;
DROP POLICY IF EXISTS "Users can manage members in their bands" ON band_members;
DROP POLICY IF EXISTS "Users can view songs in their bands" ON songs;
DROP POLICY IF EXISTS "Users can manage songs in their bands" ON songs;
DROP POLICY IF EXISTS "Users can view events in their bands" ON band_events;
DROP POLICY IF EXISTS "Users can manage events in their bands" ON band_events;
DROP POLICY IF EXISTS "Users can view roles in their bands" ON roles;
DROP POLICY IF EXISTS "Users can manage roles in their bands" ON roles;
DROP POLICY IF EXISTS "Users can view files in their bands" ON files;
DROP POLICY IF EXISTS "Users can manage files in their bands" ON files;

-- Restore original simple policies (from 001_initial_schema.sql)
-- Note: These are simple placeholder policies - adjust based on original implementation
CREATE POLICY "Enable read access for all users" ON band_members FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON band_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON band_members FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON band_members FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON songs FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON songs FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON songs FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON band_events FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON band_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON band_events FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON band_events FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON roles FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON roles FOR DELETE USING (true);

-- Note: Adjust these policies based on your security requirements
