-- Add admin bulk delete password setting (hashed)
-- Default password is 'admin123' hashed with SHA256
INSERT INTO public.admin_settings (key, value, description) 
VALUES (
  'bulk_delete_password_hash', 
  '240be518fabd2724ddb6f04eeb9d5b059f23f44ff38b7bcb1ca29eb9edb82b4b', 
  'Hash SHA256 da senha para exclusão em massa'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;