import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify user auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { displayArtId } = await req.json();
    if (!displayArtId) {
      return new Response(JSON.stringify({ error: "displayArtId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch display art
    const { data: displayArt, error: artError } = await supabase
      .from("display_arts")
      .select("*, template:art_templates(*)")
      .eq("id", displayArtId)
      .single();

    if (artError || !displayArt) {
      return new Response(JSON.stringify({ error: "Arte não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    if (displayArt.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (displayArt.locked) {
      return new Response(JSON.stringify({ error: "Arte já está finalizada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate required fields
    if (!displayArt.template_id || !displayArt.logo_url || !displayArt.company_name) {
      return new Response(
        JSON.stringify({ error: "Template, logo e nome da empresa são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique QR code
    const qrCode = `DSP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Insert QR code record
    const { data: qrRecord, error: qrError } = await supabase
      .from("qr_codes")
      .insert({
        code: qrCode,
        order_id: displayArt.order_id,
        display_art_id: displayArt.id,
        is_used: true,
      })
      .select()
      .single();

    if (qrError) {
      return new Response(JSON.stringify({ error: "Erro ao gerar QR Code: " + qrError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build final SVG with QR code embedded
    const template = displayArt.template;
    let finalSvg = template?.svg_content || "";

    // Replace placeholders in SVG
    finalSvg = finalSvg.replace(/\{\{company_name\}\}/g, displayArt.company_name);
    finalSvg = finalSvg.replace(/\{\{logo_url\}\}/g, displayArt.logo_url);
    finalSvg = finalSvg.replace(/\{\{qr_code\}\}/g, qrCode);
    finalSvg = finalSvg.replace(/\{\{qr_url\}\}/g, `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/display/${qrCode}`);

    // Update display art: lock it and save final SVG
    const { error: updateError } = await supabase
      .from("display_arts")
      .update({
        final_svg: finalSvg,
        qr_code_id: qrRecord.id,
        locked: true,
      })
      .eq("id", displayArtId);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Erro ao salvar arte: " + updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update order status to art_finalized
    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: "art_finalized" })
      .eq("id", displayArt.order_id);

    if (orderError) {
      console.error("Error updating order status:", orderError);
    }

    // Create business_display record linked to this QR code
    const { error: displayError } = await supabase
      .from("business_displays")
      .insert({
        user_id: user.id,
        qr_code: qrCode,
        business_name: displayArt.company_name,
        logo_url: displayArt.logo_url,
        is_activated: true,
      });

    if (displayError) {
      console.error("Error creating business display:", displayError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        qrCode,
        displayArtId,
        message: "Arte finalizada com sucesso!",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in finalize-display-art:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
