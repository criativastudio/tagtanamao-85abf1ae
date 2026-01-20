import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, productId, productType } = await req.json();

    if (!userId || !productId || !productType) {
      return new Response(
        JSON.stringify({ success: false, error: "Dados incompletos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create Supabase client with service role for unrestricted access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let error = null;

    if (productType === "pet_tag") {
      const { error: updateError } = await supabaseAdmin
        .from("pet_tags")
        .update({ 
          is_activated: true, 
          user_id: userId 
        })
        .eq("id", productId)
        .is("user_id", null); // Only update if not already assigned

      error = updateError;
    } else if (productType === "business_display") {
      const { error: updateError } = await supabaseAdmin
        .from("business_displays")
        .update({ 
          is_activated: true, 
          user_id: userId 
        })
        .eq("id", productId)
        .is("user_id", null); // Only update if not already assigned

      error = updateError;
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Tipo de produto inválido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (error) {
      console.error("Error activating product:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao ativar produto" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in activate-on-signup:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno do servidor" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
