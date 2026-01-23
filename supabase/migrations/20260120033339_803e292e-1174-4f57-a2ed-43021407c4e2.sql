-- Create admin_settings table for PIX and WhatsApp configuration
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can view settings" 
ON public.admin_settings 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can insert settings" 
ON public.admin_settings 
FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can update settings" 
ON public.admin_settings 
FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can delete settings" 
ON public.admin_settings 
FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Public read policy for checkout to access PIX settings
CREATE POLICY "Anyone can read PIX settings" 
ON public.admin_settings 
FOR SELECT 
USING (key IN ('pix_key', 'pix_key_type', 'admin_whatsapp', 'admin_notification_enabled'));

-- Insert default values
INSERT INTO public.admin_settings (key, value, description) VALUES
('pix_key', '69992213658', 'Chave PIX para recebimento'),
('pix_key_type', 'phone', 'Tipo da chave PIX (phone, email, cpf, cnpj, random)'),
('admin_whatsapp', '5569992213658', 'WhatsApp do admin para notificações'),
('admin_notification_enabled', 'true', 'Habilitar notificações de novos pedidos');

-- Create trigger for updated_at
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();