-- Remove the overly permissive INSERT policy on payments table
-- Edge functions use service role key which bypasses RLS, so no INSERT policy is needed
DROP POLICY IF EXISTS "System can insert payments" ON public.payments;

-- Create a more restrictive INSERT policy that only allows service role
-- (effectively no one via client, only backend edge functions)
-- Since service role bypasses RLS anyway, we'll make the policy deny all client inserts
CREATE POLICY "Only backend can insert payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (false);

-- This ensures:
-- 1. Anonymous users cannot insert payment records
-- 2. Authenticated users via client cannot insert payment records
-- 3. Edge functions using service role key can still insert (bypasses RLS)