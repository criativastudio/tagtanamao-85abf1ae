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

    // Validate required fields (location is now optional)
    if (!petTagId || !ownerWhatsapp || !finderPhone) {
      return new Response(
        JSON.stringify({ success: false, error: "Dados incompletos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const hasLocation = latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null;

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

    // Build the message based on whether we have location
    let message: string;
    if (hasLocation) {
      const locationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
      message = `🐾 *Alerta TagTaNaMão*\n\nAlguém encontrou *${petName || "seu pet"}*!\n\n📱 Contato: wa.me/${finderNumber}\n\n📍 Localização aproximada de onde o pet foi encontrado:\n${locationLink}\n\nMensagem do encontrador:\n_"Olá, encontrei o seu pet nessa localização. Esse é o meu número para contato."_`;
    } else {
      message = `🐾 *Alerta TagTaNaMão*\n\nAlguém encontrou *${petName || "seu pet"}*!\n\n📱 Contato: wa.me/${finderNumber}\n\nMensagem do encontrador:\n_"Olá, encontrei o seu pet e gostaria de entrar em contato para devolvê-lo."_\n\n⚠️ _Localização não disponível_`;
    }

    console.log("Sending message to:", ownerNumber);
    console.log("Message content:", message);

    // Send message via Evolution API with timeout and retry
    const evolutionUrl = `${evolutionApiUrl.replace(/\/$/, "")}/message/sendText/${evolutionInstanceName}`;
    
    console.log("Evolution URL:", evolutionUrl);
    console.log("Instance name:", evolutionInstanceName);
    
    const sendWithTimeout = async (timeoutMs: number): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const response = await fetch(evolutionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": evolutionApiKey,
          },
          body: JSON.stringify({
            number: ownerNumber,
            text: message,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    let evolutionResponse: Response;
    let evolutionResult: unknown;
    let lastError: Error | null = null;

    // Try up to 2 times with 15 second timeout each
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Attempt ${attempt} to send message...`);
        evolutionResponse = await sendWithTimeout(15000);
        evolutionResult = await evolutionResponse.json();
        console.log("Evolution API response:", evolutionResult);

        if (evolutionResponse.ok) {
          break; // Success, exit loop
        } else {
          lastError = new Error(`API returned ${evolutionResponse.status}`);
          console.error(`Attempt ${attempt} failed:`, evolutionResult);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Attempt ${attempt} error:`, lastError.message);
        
        if (attempt < 2) {
          console.log("Retrying in 2 seconds...");
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // If all attempts failed, still log the scan but return error
    if (lastError && (!evolutionResponse! || !evolutionResponse!.ok)) {
      console.error("All attempts failed:", lastError.message);
      
      // Still log the scan attempt even if message failed
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      await supabaseAdmin.from("qr_scans").insert({
        pet_tag_id: petTagId,
        latitude: hasLocation ? latitude : null,
        longitude: hasLocation ? longitude : null,
        city: `Finder: ${finderNumber} (msg failed)`,
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Não foi possível enviar a mensagem. Tente novamente ou entre em contato diretamente." 
        }),
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
      latitude: hasLocation ? latitude : null,
      longitude: hasLocation ? longitude : null,
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
