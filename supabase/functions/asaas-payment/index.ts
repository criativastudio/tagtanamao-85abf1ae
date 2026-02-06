import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const asaasApiKey = Deno.env.get("ASAAS_API_KEY")!;
const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

const ASAAS_BASE_URL = asaasApiKey?.includes("_hmlg_")
  ? "https://sandbox.asaas.com/api/v3"
  : "https://api.asaas.com/v3";

// --- Shipping validation ---
const VALID_SHIPPING: Record<string, { price: number; localOnly?: boolean }> = {
  PAC: { price: 12.90 },
  SEDEX: { price: 24.90 },
  LOCAL_PORTO_VELHO: { price: 5.00, localOnly: true },
  LOCAL_JARU: { price: 5.00, localOnly: true },
};

function validateShippingMethod(method: string | null, cost: number | null, city: string | null, state: string | null): string | null {
  if (!method) return "Método de envio não informado";
  const cfg = VALID_SHIPPING[method];
  if (!cfg) return `Método de envio inválido: ${method}`;
  if (Math.abs((cost || 0) - cfg.price) > 0.01) return `Valor de frete inválido para ${method}`;
  if (cfg.localOnly) {
    const c = (city || "").trim().toLowerCase();
    const s = (state || "").trim().toUpperCase();
    if (s !== "RO") return "Entrega local disponível apenas para RO";
    if (method === "LOCAL_PORTO_VELHO" && c !== "porto velho") return "Entrega local Porto Velho indisponível para esta cidade";
    if (method === "LOCAL_JARU" && c !== "jaru") return "Entrega local Jaru indisponível para esta cidade";
  }
  return null;
}

function getShippingLabel(method: string): string {
  if (method === "LOCAL_PORTO_VELHO") return "Entrega Local - Porto Velho";
  if (method === "LOCAL_JARU") return "Entrega Local - Jaru";
  return method;
}

async function validateOrderAmount(supabase: any, orderId: string, frontendAmount: number): Promise<string | null> {
  const { data: order } = await supabase
    .from("orders")
    .select("shipping_cost, shipping_method, discount_amount, shipping_city, shipping_state")
    .eq("id", orderId)
    .single();
  if (!order) return "Pedido não encontrado para validação";

  const shippingErr = validateShippingMethod(order.shipping_method, order.shipping_cost, order.shipping_city, order.shipping_state);
  if (shippingErr) return shippingErr;

  const { data: items } = await supabase.from("order_items").select("quantity, unit_price").eq("order_id", orderId);
  if (!items || items.length === 0) return "Itens do pedido não encontrados";

  const subtotal = items.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0);
  const expected = subtotal + (order.shipping_cost || 0) - (order.discount_amount || 0);
  if (Math.abs(expected - frontendAmount) > 0.01) {
    console.error("Amount mismatch:", { expected, frontendAmount, subtotal, shipping: order.shipping_cost, discount: order.discount_amount });
    return `Valor do pagamento não confere. Esperado: ${expected.toFixed(2)}`;
  }
  return null;
}

// --- Asaas helpers ---
interface CreatePaymentRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpfCnpj: string;
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD";
}

interface WebhookPayload {
  event: string;
  payment: {
    id: string;
    status: string;
    value: number;
    externalReference: string;
    billingType: string;
    invoiceUrl?: string;
  };
}

async function findOrCreateCustomer(name: string, email: string, cpfCnpj: string, phone: string, externalReference: string): Promise<string> {
  console.log("Finding or creating Asaas customer:", email);
  const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
  const searchResponse = await fetch(`${ASAAS_BASE_URL}/customers?cpfCnpj=${cleanCpfCnpj}`, {
    headers: { "Content-Type": "application/json", access_token: asaasApiKey },
  });
  const searchData = await searchResponse.json();
  if (searchData.data && searchData.data.length > 0) {
    console.log("Found existing customer:", searchData.data[0].id);
    return searchData.data[0].id;
  }

  const createResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: asaasApiKey },
    body: JSON.stringify({
      name, email, cpfCnpj: cleanCpfCnpj,
      mobilePhone: phone.replace(/\D/g, ""),
      externalReference, notificationDisabled: false,
    }),
  });
  const customerData = await createResponse.json();
  if (!createResponse.ok) {
    console.error("Error creating customer:", customerData);
    throw new Error(customerData.errors?.[0]?.description || "Falha ao criar cliente no Asaas");
  }
  console.log("Created new customer:", customerData.id);
  return customerData.id;
}

async function createPayment(customerId: string, amount: number, orderId: string, billingType: "PIX" | "BOLETO", description: string): Promise<any> {
  console.log("Creating Asaas payment:", { customerId, amount, billingType });
  const dueDate = new Date();
  if (billingType === "BOLETO") dueDate.setDate(dueDate.getDate() + 3);

  const response = await fetch(`${ASAAS_BASE_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: asaasApiKey },
    body: JSON.stringify({
      customer: customerId, billingType, value: amount,
      dueDate: dueDate.toISOString().split("T")[0],
      description, externalReference: orderId,
    }),
  });
  const payment = await response.json();
  if (!response.ok) {
    console.error("Error creating payment:", payment);
    throw new Error(payment.errors?.[0]?.description || "Falha ao criar cobrança");
  }
  console.log("Payment created:", payment.id);

  if (billingType === "PIX") {
    const pixResponse = await fetch(`${ASAAS_BASE_URL}/payments/${payment.id}/pixQrCode`, {
      headers: { "Content-Type": "application/json", access_token: asaasApiKey },
    });
    const pixData = await pixResponse.json();
    if (pixResponse.ok) {
      payment.pixQrCode = { encodedImage: pixData.encodedImage, payload: pixData.payload, expirationDate: pixData.expirationDate };
    }
  }
  return payment;
}

async function handleWebhook(supabase: any, payload: WebhookPayload): Promise<{ success: boolean; message: string }> {
  console.log("Processing webhook event:", payload.event);
  const { event, payment } = payload;
  const orderId = payment.externalReference;
  if (!orderId) return { success: false, message: "Missing order reference" };

  let orderStatus: string | null = null;
  let paymentStatus: string | null = null;

  switch (event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
      orderStatus = "paid"; paymentStatus = "confirmed"; break;
    case "PAYMENT_OVERDUE":
      paymentStatus = "overdue"; break;
    case "PAYMENT_REFUNDED":
    case "PAYMENT_REFUND_REQUESTED":
      orderStatus = "cancelled"; paymentStatus = "refunded"; break;
    case "PAYMENT_DELETED":
      paymentStatus = "cancelled"; break;
    default:
      return { success: true, message: "Event ignored" };
  }

  const updateData: any = { updated_at: new Date().toISOString() };
  if (orderStatus) updateData.status = orderStatus;
  if (paymentStatus) updateData.payment_status = paymentStatus;

  const { error: orderError } = await supabase.from("orders").update(updateData).eq("id", orderId);
  if (orderError) { console.error("Error updating order:", orderError); return { success: false, message: "Failed to update order" }; }

  await supabase.from("payments").update({
    status: paymentStatus,
    paid_at: paymentStatus === "confirmed" ? new Date().toISOString() : null,
  }).eq("order_id", orderId);

  console.log("Order updated:", { orderId, orderStatus, paymentStatus });
  return { success: true, message: "Webhook processed" };
}

// --- Handler ---
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Webhook
    const accessToken = req.headers.get("asaas-access-token");
    if (accessToken) {
      if (webhookToken && accessToken !== webhookToken) {
        return new Response(JSON.stringify({ error: "Invalid webhook token" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      const payload: WebhookPayload = await req.json();
      const result = await handleWebhook(supabase, payload);
      return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const userId = userData.user.id;
    const data: CreatePaymentRequest = await req.json();
    console.log("Creating Asaas payment for order:", data.orderId);

    // Validate order belongs to user
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, total_amount, status, shipping_method")
      .eq("id", data.orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (order.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Validate amount against order items + shipping - discount
    const amountErr = await validateOrderAmount(supabase, data.orderId, data.amount);
    if (amountErr) {
      console.error("Shipping/amount validation failed:", amountErr);
      return new Response(JSON.stringify({ error: amountErr }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Customer
    const customerId = await findOrCreateCustomer(data.customerName, data.customerEmail, data.customerCpfCnpj, data.customerPhone, userId);

    await supabase.from("profiles").update({ asaas_customer_id: customerId, cpf: data.customerCpfCnpj }).eq("id", userId);

    if (data.billingType === "CREDIT_CARD") {
      return new Response(JSON.stringify({ error: "Use process-credit-card-payment for credit card payments" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Build description with shipping info
    const shippingLabel = getShippingLabel(order.shipping_method || "");
    const description = `Pedido #${data.orderId.slice(0, 8)} | Frete: ${shippingLabel}`;

    const payment = await createPayment(customerId, data.amount, data.orderId, data.billingType, description);

    await supabase.from("orders").update({
      asaas_payment_id: payment.id,
      asaas_payment_link: payment.invoiceUrl,
      payment_method: data.billingType.toLowerCase(),
    }).eq("id", data.orderId);

    await supabase.from("payments").insert({
      user_id: userId, order_id: data.orderId, amount: data.amount,
      status: "pending", payment_method: data.billingType.toLowerCase(),
      asaas_payment_id: payment.id, asaas_customer_id: customerId,
    });

    console.log("Payment created successfully:", payment.id);

    return new Response(JSON.stringify({
      success: true,
      payment: {
        id: payment.id, invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl, pixQrCode: payment.pixQrCode,
        status: payment.status,
      },
    }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (error: any) {
    console.error("Error in asaas-payment:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro ao processar pagamento" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
