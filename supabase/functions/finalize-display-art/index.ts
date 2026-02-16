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

    // Fetch display art with template
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

    // Build final SVG using element_positions from the template
    const template = displayArt.template;
    const positions = template?.element_positions || {};
    let baseSvg = template?.svg_content || '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"></svg>';
    
    // Parse the SVG
    // We'll build the final SVG by appending positioned elements
    // First, get SVG dimensions from viewBox
    const viewBoxMatch = baseSvg.match(/viewBox="([^"]+)"/);
    let svgWidth = 800, svgHeight = 800;
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].split(/[\s,]+/).map(Number);
      if (parts.length >= 4) {
        svgWidth = parts[2];
        svgHeight = parts[3];
      }
    }

    // Remove closing </svg> tag to append elements
    const closingTagIndex = baseSvg.lastIndexOf("</svg>");
    let svgBody = baseSvg.substring(0, closingTagIndex);

    // Add logo (circular clip)
    const logoPos = positions.logo || { x: 50, y: 50, width: 120, height: 120 };
    const clipId = "logo-clip-final";
    svgBody += `
      <defs>
        <clipPath id="${clipId}">
          <circle cx="${logoPos.x + logoPos.width / 2}" cy="${logoPos.y + logoPos.height / 2}" r="${Math.min(logoPos.width, logoPos.height) / 2}" />
        </clipPath>
      </defs>
      <image href="${displayArt.logo_url}" x="${logoPos.x}" y="${logoPos.y}" width="${logoPos.width}" height="${logoPos.height}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${clipId})" />
    `;

    // Add company name
    const cnPos = positions.company_name || { x: svgWidth / 2, y: svgHeight - 80, fontSize: 24, textAnchor: "middle" };
    svgBody += `
      <text x="${cnPos.x}" y="${cnPos.y}" font-size="${cnPos.fontSize}" font-family="Arial, sans-serif" font-weight="bold" text-anchor="${cnPos.textAnchor || 'middle'}" fill="${displayArt.text_color || '#000000'}">${displayArt.company_name}</text>
    `;

    // Add QR code placeholder text (will be replaced in production with actual QR image)
    const qrPos = positions.qr_code || { x: svgWidth / 2 - 100, y: svgHeight / 2 - 100, width: 200, height: 200 };
    const qrUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/display/${qrCode}`;
    svgBody += `
      <rect x="${qrPos.x}" y="${qrPos.y}" width="${qrPos.width}" height="${qrPos.height}" fill="white" stroke="#ddd" stroke-width="1" rx="4" />
      <text x="${qrPos.x + qrPos.width / 2}" y="${qrPos.y + qrPos.height / 2 - 10}" text-anchor="middle" font-size="12" fill="#666">${qrCode}</text>
      <text x="${qrPos.x + qrPos.width / 2}" y="${qrPos.y + qrPos.height / 2 + 10}" text-anchor="middle" font-size="10" fill="#999">${qrUrl}</text>
    `;

    // Add order number (white, centered, bottom)
    const orderNum = `#${displayArt.order_id.slice(0, 8)}`;
    const onPos = positions.order_number || { x: svgWidth / 2, y: svgHeight - 15, fontSize: 14 };
    svgBody += `
      <text x="${onPos.x}" y="${onPos.y}" font-size="${onPos.fontSize}" font-family="monospace" font-weight="bold" text-anchor="middle" fill="white">${orderNum}</text>
    `;

    // Close SVG
    const finalSvg = svgBody + "</svg>";

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
