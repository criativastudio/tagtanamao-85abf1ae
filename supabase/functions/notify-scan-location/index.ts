import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ScanNotification {
  petTagId?: string;
  displayId?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { petTagId, displayId, latitude, longitude, city, country }: ScanNotification = await req.json();

    if (!petTagId && !displayId) {
      return new Response(
        JSON.stringify({ success: false, error: "ID do produto é obrigatório" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create Supabase client with service role for unrestricted access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let whatsappNumber: string | null = null;
    let productName: string | null = null;
    let ownerName: string | null = null;

    if (petTagId) {
      // Get pet tag with owner's WhatsApp
      const { data: petTag, error } = await supabaseAdmin
        .from("pet_tags")
        .select("pet_name, owner_name, whatsapp, lost_mode")
        .eq("id", petTagId)
        .single();

      if (error || !petTag) {
        console.log("Pet tag not found:", error);
        return new Response(
          JSON.stringify({ success: false, notified: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Only notify if WhatsApp is registered
      if (petTag.whatsapp) {
        whatsappNumber = petTag.whatsapp;
        productName = petTag.pet_name || "Seu pet";
        ownerName = petTag.owner_name;
      }
    } else if (displayId) {
      // Get display and find owner's WhatsApp from profile
      const { data: display, error: displayError } = await supabaseAdmin
        .from("business_displays")
        .select("business_name, user_id")
        .eq("id", displayId)
        .single();

      if (displayError || !display) {
        console.log("Display not found:", displayError);
        return new Response(
          JSON.stringify({ success: false, notified: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      productName = display.business_name || "Seu display";

      // Get owner's WhatsApp from profile
      if (display.user_id) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("whatsapp, full_name")
          .eq("id", display.user_id)
          .single();

        if (profile?.whatsapp) {
          whatsappNumber = profile.whatsapp;
          ownerName = profile.full_name;
        }
      }
    }

    // If no WhatsApp number, skip notification
    if (!whatsappNumber) {
      console.log("No WhatsApp number registered for notification");
      return new Response(
        JSON.stringify({ success: true, notified: false, reason: "No WhatsApp registered" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Format the WhatsApp number (remove non-digits, ensure country code)
    let formattedNumber = whatsappNumber.replace(/\D/g, "");
    if (!formattedNumber.startsWith("55")) {
      formattedNumber = "55" + formattedNumber;
    }

    // Build location message
    let locationInfo = "";
    if (latitude && longitude) {
      locationInfo = `📍 Localização: https://www.google.com/maps?q=${latitude},${longitude}`;
    } else if (city && country) {
      locationInfo = `📍 Região: ${city}, ${country}`;
    } else if (city) {
      locationInfo = `📍 Cidade: ${city}`;
    } else if (country) {
      locationInfo = `📍 País: ${country}`;
    }

    const timestamp = new Date().toLocaleString("pt-BR", { 
      timeZone: "America/Sao_Paulo",
      dateStyle: "short",
      timeStyle: "short"
    });

    const message = petTagId
      ? `🐾 *Alerta TagTaNaMão*\n\nO QR Code de *${productName}* foi escaneado!\n\n${locationInfo}\n⏰ ${timestamp}\n\nAcesse o dashboard para mais detalhes.`
      : `📱 *Alerta TagTaNaMão*\n\nO QR Code do display *${productName}* foi escaneado!\n\n${locationInfo}\n⏰ ${timestamp}\n\nAcesse o dashboard para mais detalhes.`;

    // Log the notification attempt (for now, we'll just log it)
    // In production, integrate with WhatsApp API (Mult Zap, etc.)
    console.log(`Would send WhatsApp to ${formattedNumber}: ${message}`);

    // Store the notification attempt in a log (optional)
    // For now, we return success to indicate the scan was processed
    
    // TODO: Integrate with Mult Zap or other WhatsApp API when enabled
    // const multZapApiKey = Deno.env.get("MULT_ZAP_API_KEY");
    // if (multZapApiKey) {
    //   await sendWhatsAppMessage(multZapApiKey, formattedNumber, message);
    // }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: true,
        message: "Notification processed"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in notify-scan-location:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno do servidor" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
