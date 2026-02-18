import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-ignore - no type definitions available for qrcode npm module in Deno
import QRCode from "npm:qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Generate a unique 6-digit numeric activation code,
 * checking uniqueness against both pet_tags and business_displays.
 */
async function generateUniqueCode(supabase: any): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));

    const [{ data: petMatch }, { data: displayMatch }] = await Promise.all([
      supabase.from("pet_tags").select("id").eq("qr_code", code).maybeSingle(),
      supabase.from("business_displays").select("id").eq("qr_code", code).maybeSingle(),
    ]);

    if (!petMatch && !displayMatch) return code;
  }
  throw new Error("Não foi possível gerar um código único após 20 tentativas");
}

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
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Auth claims error:", claimsError);
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

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

    if (displayArt.user_id !== userId) {
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

    if (!displayArt.template_id || !displayArt.logo_url || !displayArt.company_name) {
      return new Response(
        JSON.stringify({ error: "Template, logo e nome da empresa são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique 6-digit activation code
    const activationCode = await generateUniqueCode(supabase);

    // Generate QR Code as PNG Data URI
    const qrTargetUrl = `https://tagtanamao.lovable.app/display/${activationCode}`;
    const qrDataUri = await QRCode.toDataURL(qrTargetUrl, {
      width: 400,
      margin: 1,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    // Insert QR code record
    const { data: qrRecord, error: qrError } = await supabase
      .from("qr_codes")
      .insert({
        code: activationCode,
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

    // Build final SVG
    const template = displayArt.template;
    const positions = template?.element_positions || {};
    let baseSvg = template?.svg_content || '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"></svg>';

    const viewBoxMatch = baseSvg.match(/viewBox="([^"]+)"/);
    let svgWidth = 800, svgHeight = 800;
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].split(/[\s,]+/).map(Number);
      if (parts.length >= 4) {
        svgWidth = parts[2];
        svgHeight = parts[3];
      }
    }

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

    // Add real QR Code image
    const qrPos = positions.qr_code || { x: svgWidth / 2 - 100, y: svgHeight / 2 - 100, width: 200, height: 200 };
    svgBody += `
      <image href="${qrDataUri}" x="${qrPos.x}" y="${qrPos.y}" width="${qrPos.width}" height="${qrPos.height}" />
    `;

    // Add activation code text below QR
    svgBody += `
      <text x="${qrPos.x + qrPos.width / 2}" y="${qrPos.y + qrPos.height + 18}" text-anchor="middle" font-size="14" font-family="monospace" font-weight="bold" fill="#333333">${activationCode}</text>
    `;

    // Add order number (white, centered, bottom)
    const orderNum = `#${displayArt.order_id.slice(0, 8)}`;
    const onPos = positions.order_number || { x: svgWidth / 2, y: svgHeight - 15, fontSize: 14 };
    svgBody += `
      <text x="${onPos.x}" y="${onPos.y}" font-size="${onPos.fontSize}" font-family="monospace" font-weight="bold" text-anchor="middle" fill="white">${orderNum}</text>
    `;

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

    // Update order status
    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: "art_finalized" })
      .eq("id", displayArt.order_id);

    if (orderError) {
      console.error("Error updating order status:", orderError);
    }

    // Create business_display record with is_activated: false (awaiting activation)
    const { error: displayError } = await supabase
      .from("business_displays")
      .insert({
        user_id: userId,
        qr_code: activationCode,
        business_name: displayArt.company_name,
        logo_url: displayArt.logo_url,
        is_activated: false,
      });

    if (displayError) {
      console.error("Error creating business display:", displayError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        qrCode: activationCode,
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
