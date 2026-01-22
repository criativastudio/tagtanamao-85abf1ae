import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { qrCode } = await req.json();
    
    console.log("Fetching pet tag for QR code:", qrCode);

    if (!qrCode) {
      console.error("No QR code provided");
      return new Response(
        JSON.stringify({ error: "QR code is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create Supabase client with service role for bypassing RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch pet tag data including gallery and buttons
    const { data: petTag, error } = await supabase
      .from("pet_tags")
      .select("id, pet_name, pet_photo_url, owner_name, phone, whatsapp, address, reward_enabled, reward_text, is_activated, lost_mode, qr_code, gallery_photos, buttons, theme_color")
      .eq("qr_code", qrCode)
      .single();

    if (error || !petTag) {
      console.error("Pet tag not found:", error);
      return new Response(
        JSON.stringify({ error: "Pet not found", notFound: true }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Found pet tag:", petTag.id, "lost_mode:", petTag.lost_mode);

    // Build the response based on lost_mode status
    // Public fields that are always returned
    const publicData = {
      id: petTag.id,
      pet_name: petTag.pet_name,
      pet_photo_url: petTag.pet_photo_url,
      reward_enabled: petTag.reward_enabled,
      reward_text: petTag.reward_text,
      is_activated: petTag.is_activated,
      lost_mode: petTag.lost_mode,
      qr_code: petTag.qr_code,
      gallery_photos: petTag.gallery_photos || [],
      buttons: petTag.buttons || [],
      theme_color: petTag.theme_color || '#10b981',
    };

    // If lost_mode is enabled, include contact details
    // This allows finders to contact the owner when the pet is marked as lost
    if (petTag.lost_mode) {
      console.log("Pet is in lost mode, including contact details");
      return new Response(
        JSON.stringify({
          ...publicData,
          owner_name: petTag.owner_name,
          phone: petTag.phone,
          whatsapp: petTag.whatsapp,
          address: petTag.address,
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // If not in lost mode, only return public info (no contact details)
    console.log("Pet is NOT in lost mode, hiding contact details");
    return new Response(
      JSON.stringify({
        ...publicData,
        owner_name: null,
        phone: null,
        whatsapp: null,
        address: null,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in get-pet-tag:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});