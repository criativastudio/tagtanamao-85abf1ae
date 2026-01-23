-- Fix RLS policy for business_displays UPDATE to include WITH CHECK
DROP POLICY IF EXISTS "Users can update own displays" ON public.business_displays;

CREATE POLICY "Users can update own displays" 
ON public.business_displays 
FOR UPDATE 
USING ((auth.uid() = user_id) OR is_admin())
WITH CHECK ((auth.uid() = user_id) OR is_admin());