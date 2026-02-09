import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const melhorEnvioToken = Deno.env.get("MELHOR_ENVIO_TOKEN")!;

// Melhor Envio: use MELHOR_ENVIO_SANDBOX=true for sandbox environment
const isSandbox = Deno.env.get("MELHOR_ENVIO_SANDBOX") === "true";
const ME_BASE_URL = isSandbox
  ? "https://sandbox.melhorenvio.com.br/api/v2"
  : "https://melhorenvio.com.br/api/v2";

const ORIGIN_POSTAL_CODE = "76890000";

interface ShipmentProduct {
  weight: number;
  width: number;
  height: number;
  length: number;
  quantity: number;
  unitPrice: number;
  name: string;
}

async function meRequest(path: string, method = "GET", body?: any) {
  const url = `${ME_BASE_URL}${path}`;
  console.log(`ME Request: ${method} ${url}`);
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${melhorEnvioToken}`,
      "User-Agent": "TagTaNaMao contato@qrpet.com.br",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    console.error(`Melhor Envio API error (${res.status}):`, text);
    if (res.status === 403) {
      throw new Error("Token do Melhor Envio inválido ou sem permissão. Verifique o token nas configurações.");
    }
    throw new Error(data?.message || data?.error || `Melhor Envio error ${res.status}`);
  }
  return data;
}

// Calculate shipping quotes
async function calculateShipping(toPostalCode: string, products: ShipmentProduct[]) {
  // Aggregate products into a single package
  const totalWeight = products.reduce((s, p) => s + p.weight * p.quantity, 0);
  const maxWidth = Math.max(...products.map(p => p.width));
  const maxHeight = products.reduce((s, p) => s + p.height * p.quantity, 0);
  const maxLength = Math.max(...products.map(p => p.length));
  const totalValue = products.reduce((s, p) => s + p.unitPrice * p.quantity, 0);

  const body = {
    from: { postal_code: ORIGIN_POSTAL_CODE },
    to: { postal_code: toPostalCode.replace(/\D/g, "") },
    package: {
      weight: Math.max(totalWeight, 0.1),
      width: Math.max(maxWidth, 11),
      height: Math.max(maxHeight, 2),
      length: Math.max(maxLength, 16),
    },
    options: {
      insurance_value: totalValue,
      receipt: false,
      own_hand: false,
    },
  };

  console.log("Calculating shipping:", JSON.stringify(body));
  const quotes = await meRequest("/me/shipment/calculate", "POST", body);

  // Filter only available quotes (no errors)
  return quotes
    .filter((q: any) => !q.error && q.price)
    .map((q: any) => ({
      id: q.id,
      service: q.name,
      carrier: q.company?.name || q.company?.picture || "",
      carrierPicture: q.company?.picture || "",
      price: parseFloat(q.price) || 0,
      discount: parseFloat(q.discount) || 0,
      delivery_time: q.delivery_time || 0,
      deliveryRange: q.delivery_range || {},
      serviceCode: String(q.id),
    }));
}

// Add shipment to cart (for label generation)
async function addToCart(order: any, items: any[], serviceId: number) {
  const products = items.map((item: any) => ({
    name: item.product?.name || "Produto",
    quantity: item.quantity,
    unitary_value: item.unit_price,
  }));

  const totalWeight = items.reduce((s: number, i: any) => {
    const w = i.product?.weight || 0.2;
    return s + w * i.quantity;
  }, 0);
  const maxWidth = Math.max(...items.map((i: any) => i.product?.width || 15));
  const maxHeight = items.reduce((s: number, i: any) => s + (i.product?.height || 15) * i.quantity, 0);
  const maxLength = Math.max(...items.map((i: any) => i.product?.length || 5));
  const totalValue = items.reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0);

  const body = {
    service: serviceId,
    agency: null,
    from: {
      name: "QRPet - Tag Tá Na Mão",
      phone: "69992213658",
      email: "contato@qrpet.com.br",
      document: "",
      company_document: "",
      state_register: "",
      address: "Rua Principal",
      complement: "",
      number: "100",
      district: "Centro",
      city: "Jaru",
      state_abbr: "RO",
      country_id: "BR",
      postal_code: ORIGIN_POSTAL_CODE,
    },
    to: {
      name: order.shipping_name,
      phone: (order.shipping_phone || "").replace(/\D/g, ""),
      email: order.profile_email || "",
      document: order.customer_cpf || "",
      address: order.shipping_address?.split(",")[0] || "",
      complement: "",
      number: order.shipping_address?.match(/,\s*(\d+)/)?.[1] || "SN",
      district: "",
      city: order.shipping_city,
      state_abbr: order.shipping_state,
      country_id: "BR",
      postal_code: (order.shipping_zip || "").replace(/\D/g, ""),
    },
    products,
    volumes: [
      {
        weight: Math.max(totalWeight, 0.1),
        width: Math.max(maxWidth, 11),
        height: Math.max(maxHeight, 2),
        length: Math.max(maxLength, 16),
      },
    ],
    options: {
      insurance_value: totalValue,
      receipt: false,
      own_hand: false,
      non_commercial: true,
      invoice: null,
    },
  };

  console.log("Adding to ME cart:", JSON.stringify(body));
  const result = await meRequest("/me/cart", "POST", body);
  return result;
}

// Checkout (purchase label)
async function checkout(shipmentIds: string[]) {
  const result = await meRequest("/me/shipment/checkout", "POST", {
    orders: shipmentIds,
  });
  return result;
}

// Generate label
async function generateLabel(shipmentIds: string[]) {
  const result = await meRequest("/me/shipment/generate", "POST", {
    orders: shipmentIds,
  });
  return result;
}

// Print label
async function printLabel(shipmentIds: string[]) {
  const result = await meRequest("/me/shipment/print", "POST", {
    orders: shipmentIds,
    mode: "public",
  });
  return result;
}

// Get tracking info
async function getTracking(shipmentId: string) {
  const result = await meRequest(`/me/shipment/tracking`, "POST", {
    orders: [shipmentId],
  });
  return result;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "quote";

    // Quote action is public (no auth needed for shipping calculation)
    if (action === "quote") {
      const body = await req.json();
      const { postalCode, products } = body;

      if (!postalCode || !products?.length) {
        return new Response(JSON.stringify({ error: "CEP e produtos são obrigatórios" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const quotes = await calculateShipping(postalCode, products);
      return new Response(JSON.stringify({ success: true, quotes }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // All other actions require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check admin for label/tracking actions
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", userData.user.id).single();
    const isAdmin = profile?.is_admin === true;

    if (action === "generate-label") {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Acesso negado" }), {
          status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const body = await req.json();
      const { orderId } = body;

      // Fetch order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("*, profile:profiles(email, cpf)")
        .eq("id", orderId)
        .single();

      if (orderErr || !order) {
        return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
          status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (order.status !== "paid" && order.payment_status !== "confirmed") {
        return new Response(JSON.stringify({ error: "Apenas pedidos pagos podem gerar etiqueta" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Fetch order items with product details
      const { data: items } = await supabase
        .from("order_items")
        .select("*, product:products(*)")
        .eq("order_id", orderId);

      if (!items?.length) {
        return new Response(JSON.stringify({ error: "Itens do pedido não encontrados" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Get the service ID from shipping method stored in order
      // We need to calculate shipping again to get the service ID
      const quotes = await calculateShipping(
        (order.shipping_zip || "").replace(/\D/g, ""),
        items.map((i: any) => ({
          weight: i.product?.weight || 0.2,
          width: i.product?.width || 15,
          height: i.product?.height || 15,
          length: i.product?.length || 5,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          name: i.product?.name || "Produto",
        }))
      );

      // Match service by name or carrier
      const matchingQuote = quotes.find((q: any) =>
        q.service === order.shipping_service_name ||
        q.carrier === order.shipping_carrier
      ) || quotes[0];

      if (!matchingQuote) {
        return new Response(JSON.stringify({ error: "Serviço de frete não disponível para este destino" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const profileData = Array.isArray(order.profile) ? order.profile[0] : order.profile;

      // Add to cart
      const cartResult = await addToCart(
        {
          ...order,
          profile_email: profileData?.email || "",
          customer_cpf: profileData?.cpf || "",
        },
        items,
        parseInt(matchingQuote.serviceCode)
      );

      const shipmentId = cartResult?.id;
      if (!shipmentId) {
        return new Response(JSON.stringify({ error: "Falha ao adicionar envio ao carrinho", details: cartResult }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Checkout (purchase)
      const checkoutResult = await checkout([shipmentId]);
      console.log("Checkout result:", JSON.stringify(checkoutResult));

      // Generate label
      const genResult = await generateLabel([shipmentId]);
      console.log("Generate label result:", JSON.stringify(genResult));

      // Get print URL
      const printResult = await printLabel([shipmentId]);
      const labelUrl = printResult?.url || "";

      // Update order
      await supabase.from("orders").update({
        melhor_envio_shipment_id: shipmentId,
        melhor_envio_label_url: labelUrl,
        shipping_status: "label_generated",
        status: "processing",
      }).eq("id", orderId);

      return new Response(JSON.stringify({
        success: true,
        shipmentId,
        labelUrl,
        checkoutResult,
      }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    if (action === "print-label") {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Acesso negado" }), {
          status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const body = await req.json();
      const { orderId } = body;

      const { data: order } = await supabase
        .from("orders")
        .select("melhor_envio_shipment_id, melhor_envio_label_url")
        .eq("id", orderId)
        .single();

      if (!order?.melhor_envio_shipment_id) {
        return new Response(JSON.stringify({ error: "Etiqueta ainda não foi gerada para este pedido" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // If we already have the label URL, return it
      if (order.melhor_envio_label_url) {
        return new Response(JSON.stringify({ success: true, labelUrl: order.melhor_envio_label_url }), {
          status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const printResult = await printLabel([order.melhor_envio_shipment_id]);
      const labelUrl = printResult?.url || "";

      if (labelUrl) {
        await supabase.from("orders").update({ melhor_envio_label_url: labelUrl }).eq("id", orderId);
      }

      return new Response(JSON.stringify({ success: true, labelUrl }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "tracking") {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Acesso negado" }), {
          status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const body = await req.json();
      const { orderId } = body;

      const { data: order } = await supabase
        .from("orders")
        .select("melhor_envio_shipment_id, tracking_code")
        .eq("id", orderId)
        .single();

      if (!order?.melhor_envio_shipment_id) {
        return new Response(JSON.stringify({ error: "Envio não encontrado" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const trackingResult = await getTracking(order.melhor_envio_shipment_id);
      const trackingData = trackingResult?.[order.melhor_envio_shipment_id] || trackingResult;

      // Update tracking code if available
      if (trackingData?.tracking) {
        await supabase.from("orders").update({
          tracking_code: trackingData.tracking,
          shipping_status: trackingData.status || "posted",
        }).eq("id", orderId);
      }

      return new Response(JSON.stringify({ success: true, tracking: trackingData }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in melhor-envio:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro no Melhor Envio" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
