import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { qrCode, productType, userId } = await req.json();

    if (!qrCode || !productType || !userId) {
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

    let tableName = "";
    
    if (productType === "pet_tag") {
      tableName = "pet_tags";
    } else if (productType === "business_display") {
      tableName = "business_displays";
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Tipo de produto inválido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // First, check if the product exists
    const { data: product, error: fetchError } = await supabaseAdmin
      .from(tableName)
      .select("id, qr_code, is_activated, user_id")
      .eq("qr_code", qrCode)
      .single();

    if (fetchError || !product) {
      console.error("Product not found:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Código de produto não encontrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Check if already activated by another user
    if (product.is_activated && product.user_id && product.user_id !== userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Este produto já foi ativado por outro usuário" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if already activated by this user
    if (product.is_activated && product.user_id === userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Este produto já está ativado na sua conta" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Activate the product
    const { error: updateError } = await supabaseAdmin
      .from(tableName)
      .update({ 
        is_activated: true, 
        user_id: userId 
      })
      .eq("id", product.id);

    if (updateError) {
      console.error("Error activating product:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao ativar produto" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        productId: product.id,
        message: "Produto ativado com sucesso" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in activate-product:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno do servidor" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
