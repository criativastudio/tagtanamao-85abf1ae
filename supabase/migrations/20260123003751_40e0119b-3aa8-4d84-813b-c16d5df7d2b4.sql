-- Fix 1: Remove admin_whatsapp and admin_notification_enabled from public policy
-- These are internal admin settings, not meant for public access
DROP POLICY IF EXISTS "Anyone can read PIX settings" ON admin_settings;

CREATE POLICY "Anyone can read PIX settings" 
ON admin_settings FOR SELECT 
USING (key IN ('pix_key', 'pix_key_type'));

-- Note: pet_tags_public is a VIEW not a table, and uses security_invoker = true
-- This means it inherits the caller's permissions from the base pet_tags table
-- Since pet_tags has no public SELECT policy, public access is already blocked
-- The view is intentionally designed this way for the get-pet-tag edge function