-- Create pix_payments table to track PIX payment requests with real-time monitoring
CREATE TABLE public.pix_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  pix_key TEXT NOT NULL,
  pix_key_type TEXT NOT NULL DEFAULT 'random',
  amount NUMERIC NOT NULL,
  transaction_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own PIX payments
CREATE POLICY "Users can view own pix payments" 
ON public.pix_payments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = pix_payments.order_id 
    AND (orders.user_id = auth.uid() OR is_admin())
  )
);

-- System can insert PIX payments (via edge function with service role)
CREATE POLICY "System can insert pix payments"
ON public.pix_payments
FOR INSERT
WITH CHECK (true);

-- Admins can update PIX payments (for confirmation)
CREATE POLICY "Admins can update pix payments"
ON public.pix_payments
FOR UPDATE
USING (is_admin());

-- Enable realtime for pix_payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.pix_payments;

-- Trigger for updated_at
CREATE TRIGGER update_pix_payments_updated_at
BEFORE UPDATE ON public.pix_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();