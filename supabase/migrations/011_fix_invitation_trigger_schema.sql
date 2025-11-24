-- Fix invitation trigger to use schema-qualified table names
-- The trigger runs as supabase_auth_admin which doesn't have public schema in search path

-- Drop and recreate the function with schema-qualified table names
CREATE OR REPLACE FUNCTION public.accept_pending_invitations()
RETURNS TRIGGER AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Find pending invitations for this user's email
  -- IMPORTANT: Use schema-qualified table names (public.invitations)
  FOR invitation_record IN
    SELECT id, band_id FROM public.invitations
    WHERE email = NEW.email AND status = 'pending'
  LOOP
    -- Add user to band
    INSERT INTO public.user_bands (user_id, band_id, role)
    VALUES (NEW.id, invitation_record.band_id, 'member')
    ON CONFLICT (user_id, band_id) DO NOTHING;

    -- Mark invitation as accepted
    UPDATE public.invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = invitation_record.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

-- No need to recreate the trigger, it will use the updated function
