-- Create atomic function to increment coupon usage
-- This prevents race conditions where multiple concurrent checkouts bypass max_uses limit
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_uuid UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_uses INTEGER;
  v_current_uses INTEGER;
  v_is_active BOOLEAN;
BEGIN
  -- Lock the row for update to prevent race conditions
  SELECT max_uses, current_uses, is_active INTO v_max_uses, v_current_uses, v_is_active
  FROM coupons
  WHERE id = coupon_uuid
  FOR UPDATE;

  -- Check if coupon exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 'Cupom não encontrado'::TEXT;
    RETURN;
  END IF;

  -- Check if coupon is active
  IF NOT v_is_active THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 'Cupom inativo'::TEXT;
    RETURN;
  END IF;

  -- Check usage limit (null means unlimited)
  IF v_max_uses IS NOT NULL AND v_current_uses >= v_max_uses THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 'Limite de uso do cupom excedido'::TEXT;
    RETURN;
  END IF;

  -- Atomically increment the counter
  UPDATE coupons
  SET current_uses = current_uses + 1
  WHERE id = coupon_uuid;

  RETURN QUERY SELECT TRUE::BOOLEAN, 'Sucesso'::TEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(UUID) TO authenticated;