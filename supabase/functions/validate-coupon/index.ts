import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const COMBO_IDS = ["pet-tag-pack-2", "pet-tag-pack-3"];

interface ValidateCouponRequest {
  code: string;
  orderTotal: number;
  productIds?: string[];
}

interface CouponResponse {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_value: number | null;
  max_discount: number | null;
  discountAmount: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { code, orderTotal, productIds }: ValidateCouponRequest = await req.json();

    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({ error: "Código de cupom é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (typeof orderTotal !== "number" || orderTotal <= 0) {
      return new Response(
        JSON.stringify({ error: "Valor do pedido inválido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch coupon by code (using service role to bypass RLS)
    const { data: coupon, error: couponError } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("is_active", true)
      .single();

    if (couponError || !coupon) {
      console.log("Coupon not found:", code);
      return new Response(
        JSON.stringify({ error: "Cupom inválido ou inexistente" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check exclude_combos
    if (coupon.exclude_combos && productIds && productIds.length > 0) {
      const hasCombo = productIds.some(id => COMBO_IDS.includes(id));
      if (hasCombo) {
        return new Response(
          JSON.stringify({ error: "Este cupom não é válido para combos com desconto" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Validate coupon dates
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return new Response(
        JSON.stringify({ error: "Este cupom ainda não está disponível" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return new Response(
        JSON.stringify({ error: "Este cupom expirou" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check usage limit
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return new Response(
        JSON.stringify({ error: "Este cupom atingiu o limite máximo de usos" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check minimum order value
    if (coupon.min_order_value && orderTotal < coupon.min_order_value) {
      return new Response(
        JSON.stringify({ 
          error: `Pedido mínimo de R$ ${coupon.min_order_value.toFixed(2)} para usar este cupom` 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check product restrictions
    const { data: couponProducts } = await supabase
      .from("coupon_products")
      .select("product_id")
      .eq("coupon_id", coupon.id);

    const allowedProductIds = couponProducts?.map(cp => cp.product_id) || [];
    const hasProductRestriction = allowedProductIds.length > 0;

    if (hasProductRestriction && productIds && productIds.length > 0) {
      const eligibleIds = productIds.filter(id => allowedProductIds.includes(id));
      if (eligibleIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "Este cupom não é válido para os produtos do seu carrinho" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Calculate discount
    // If there's a product restriction, we'd ideally calculate only on eligible products
    // But since orderTotal is what we receive, we apply to the full total
    // The frontend could send eligibleTotal in the future if needed
    let discountAmount = 0;
    if (coupon.discount_type === "percentage") {
      discountAmount = orderTotal * (coupon.discount_value / 100);
    } else {
      discountAmount = coupon.discount_value;
    }

    // Apply max discount cap
    if (coupon.max_discount && discountAmount > coupon.max_discount) {
      discountAmount = coupon.max_discount;
    }

    // Can't discount more than order total
    if (discountAmount > orderTotal) {
      discountAmount = orderTotal;
    }

    // Return only necessary coupon info (not all fields)
    const response: CouponResponse = {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_value: coupon.min_order_value,
      max_discount: coupon.max_discount,
      discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimals
    };

    console.log("Coupon validated:", response.code, "discount:", response.discountAmount);

    return new Response(
      JSON.stringify({ success: true, coupon: response }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error validating coupon:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao validar cupom" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
