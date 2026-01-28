import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LocationShareRequest {
  petTagId: string;
  petName: string;
  ownerWhatsapp: string;
  finderPhone: string;
  latitude: number;
  longitude: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { petTagId, petName, ownerWhatsapp, finderPhone, latitude, longitude }: LocationShareRequest = await req.json();

    console.log("Received location share request:", { petTagId, petName, latitude, longitude });

    // Validate required fields
    if (!petTagId || !ownerWhatsapp || !finderPhone || latitude === undefined || longitude === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: "Dados incompletos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get Evolution API credentials
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    const evolutionInstanceName = Deno.env.get("EVOLUTION_INSTANCE_NAME");

    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstanceName) {
      console.error("Evolution API credentials not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Serviço de mensagens não configurado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Format owner WhatsApp number (add Brazil country code)
    let ownerNumber = ownerWhatsapp.replace(/\D/g, "");
    if (!ownerNumber.startsWith("55")) {
      ownerNumber = "55" + ownerNumber;
    }

    // Format finder phone for message
    let finderNumber = finderPhone.replace(/\D/g, "");
    if (!finderNumber.startsWith("55")) {
      finderNumber = "55" + finderNumber;
    }

    // Build the location link
    const locationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

    // Build the message
    const message = `🐾 *Alerta TagTaNaMão*\n\nAlguém encontrou *${petName || "seu pet"}*!\n\n📍 Localização: ${locationLink}\n\n📱 Contato: wa.me/${finderNumber}\n\nMensagem do encontrador:\n_"Olá, encontrei o seu pet nessa localização. Esse é o meu número para contato."_`;

    console.log("Sending message to:", ownerNumber);
    console.log("Message content:", message);

    // Send message via Evolution API
    const evolutionUrl = `${evolutionApiUrl.replace(/\/$/, "")}/message/sendText/${evolutionInstanceName}`;
    
    const evolutionResponse = await fetch(evolutionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionApiKey,
      },
      body: JSON.stringify({
        number: ownerNumber,
        text: message,
      }),
    });

    const evolutionResult = await evolutionResponse.json();
    console.log("Evolution API response:", evolutionResult);

    if (!evolutionResponse.ok) {
      console.error("Evolution API error:", evolutionResult);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao enviar mensagem" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Log the successful notification
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Log the scan with finder info
    await supabaseAdmin.from("qr_scans").insert({
      pet_tag_id: petTagId,
      latitude,
      longitude,
      city: `Finder: ${finderNumber}`,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Mensagem enviada com sucesso" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in send-pet-location-whatsapp:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno do servidor" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
