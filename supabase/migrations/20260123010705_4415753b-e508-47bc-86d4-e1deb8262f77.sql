-- Create a trigger to automatically clear payment links after payment is confirmed
-- This prevents exposure of payment links after they're no longer needed

CREATE OR REPLACE FUNCTION public.clear_payment_link_on_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear payment link when payment is confirmed or order is paid
  IF (NEW.payment_status IN ('confirmed', 'paid') OR NEW.status = 'paid') 
     AND (OLD.payment_status NOT IN ('confirmed', 'paid') AND OLD.status != 'paid') THEN
    NEW.asaas_payment_link := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS clear_payment_link_trigger ON orders;

CREATE TRIGGER clear_payment_link_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_payment_link_on_confirmation();

-- Also clear existing payment links for already paid orders
UPDATE orders 
SET asaas_payment_link = NULL 
WHERE (payment_status IN ('confirmed', 'paid') OR status = 'paid') 
  AND asaas_payment_link IS NOT NULL;