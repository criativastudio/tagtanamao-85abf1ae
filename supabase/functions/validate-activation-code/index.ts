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
    const { code, type } = await req.json();

    if (!code || !type) {
      return new Response(
        JSON.stringify({ valid: false, error: "Código e tipo são obrigatórios" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create Supabase client with service role for unrestricted access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let product = null;
    let tableName = "";

    if (type === "pet_tag") {
      tableName = "pet_tags";
      const { data, error } = await supabaseAdmin
        .from("pet_tags")
        .select("id, qr_code, is_activated, user_id")
        .eq("qr_code", code)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ valid: false, error: "Código não encontrado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      product = data;
    } else if (type === "business_display") {
      tableName = "business_displays";
      const { data, error } = await supabaseAdmin
        .from("business_displays")
        .select("id, qr_code, is_activated, user_id")
        .eq("qr_code", code)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ valid: false, error: "Código não encontrado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      product = data;
    } else {
      return new Response(
        JSON.stringify({ valid: false, error: "Tipo de produto inválido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if already activated (already has a user)
    if (product.is_activated && product.user_id) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Este produto já foi ativado por outro usuário" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Code is valid and available
    return new Response(
      JSON.stringify({ 
        valid: true, 
        productId: product.id,
        productType: type,
        qrCode: product.qr_code
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error validating activation code:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "Erro ao validar código" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
