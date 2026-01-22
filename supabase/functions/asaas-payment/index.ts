import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const asaasApiKey = Deno.env.get("ASAAS_API_KEY")!;
const asaasWebhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

// Use sandbox for testing, production for live
const ASAAS_BASE_URL = asaasApiKey?.startsWith("$aact_")
  ? "https://api.asaas.com/v3"
  : "https://sandbox.asaas.com/api/v3";

interface CreatePaymentRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpfCnpj: string;
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX";
  dueDate?: string;
}

// Find or create customer in Asaas
async function findOrCreateCustomer(
  name: string,
  email: string,
  cpfCnpj: string,
  phone?: string
): Promise<{ id: string }> {
  console.log("Finding or creating Asaas customer:", email);

  const searchResponse = await fetch(
    `${ASAAS_BASE_URL}/customers?email=${encodeURIComponent(email)}`,
    { headers: { "Content-Type": "application/json", access_token: asaasApiKey } }
  );
  const searchData = await searchResponse.json();

  if (searchData.data && searchData.data.length > 0) {
    console.log("Found existing customer:", searchData.data[0].id);
    return searchData.data[0];
  }

  const createResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: asaasApiKey },
    body: JSON.stringify({
      name,
      email,
      cpfCnpj: cpfCnpj.replace(/\D/g, ""),
      phone: phone?.replace(/\D/g, ""),
      notificationDisabled: false,
    }),
  });

  const customerData = await createResponse.json();
  if (!createResponse.ok) {
    console.error("Error creating customer:", customerData);
    throw new Error(customerData.errors?.[0]?.description || "Failed to create customer");
  }

  console.log("Created new customer:", customerData.id);
  return customerData;
}

// Create payment in Asaas
async function createAsaasPayment(
  customerId: string,
  amount: number,
  billingType: string,
  orderId: string,
  dueDate?: string
): Promise<any> {
  console.log("Creating Asaas payment:", { customerId, amount, billingType });

  const paymentData = {
    customer: customerId,
    billingType,
    value: amount,
    dueDate: dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    description: `Pedido #${orderId.slice(0, 8)}`,
    externalReference: orderId,
  };

  const response = await fetch(`${ASAAS_BASE_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: asaasApiKey },
    body: JSON.stringify(paymentData),
  });

  const payment = await response.json();
  if (!response.ok) {
    console.error("Error creating payment:", payment);
    throw new Error(payment.errors?.[0]?.description || "Failed to create payment");
  }

  console.log("Payment created:", payment.id);

  // If PIX, get QR code
  if (billingType === "PIX") {
    const pixResponse = await fetch(`${ASAAS_BASE_URL}/payments/${payment.id}/pixQrCode`, {
      headers: { "Content-Type": "application/json", access_token: asaasApiKey },
    });
    const pixData = await pixResponse.json();
    payment.pixQrCode = pixData;
  }

  return payment;
}

// Handle webhook events
async function handleWebhook(req: Request, supabase: any): Promise<Response> {
  const webhookToken = req.headers.get("asaas-access-token");
  
  if (!asaasWebhookToken) {
    console.error("ASAAS_WEBHOOK_TOKEN not configured");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), 
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
  
  if (!webhookToken || webhookToken !== asaasWebhookToken) {
    console.error("Invalid webhook token received");
    return new Response(JSON.stringify({ error: "Unauthorized" }), 
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  const webhookData = await req.json();
  console.log("Asaas webhook received (authenticated):", webhookData);

  const { event, payment } = webhookData;

  if (!payment?.externalReference) {
    console.log("No external reference in webhook");
    return new Response(JSON.stringify({ received: true }), 
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  const orderId = payment.externalReference;

  // Verify order exists
  const { data: order, error: orderFetchError } = await supabase
    .from("orders")
    .select("id, total_amount, status, payment_status")
    .eq("id", orderId)
    .single();

  if (orderFetchError || !order) {
    console.error("Order not found for webhook:", orderId);
    return new Response(JSON.stringify({ error: "Order not found" }), 
      { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  // Prevent duplicate processing
  if (order.status === "paid" || order.payment_status === "confirmed") {
    console.log("Order already paid, skipping:", orderId);
    return new Response(JSON.stringify({ received: true, message: "Already processed" }), 
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  // Validate amount matches
  if (payment.value && Math.abs(order.total_amount - payment.value) > 0.01) {
    console.error("Amount mismatch:", { expected: order.total_amount, received: payment.value });
    return new Response(JSON.stringify({ error: "Amount mismatch" }), 
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  // Handle payment events
  if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
    console.log("Payment confirmed for order:", orderId);
    await supabase
      .from("orders")
      .update({ payment_status: "confirmed", status: "paid", asaas_payment_id: payment.id })
      .eq("id", orderId);
  } else if (event === "PAYMENT_OVERDUE") {
    await supabase
      .from("orders")
      .update({ payment_status: "overdue" })
      .eq("id", orderId);
  } else if (event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") {
    await supabase
      .from("orders")
      .update({ 
        payment_status: event === "PAYMENT_REFUNDED" ? "refunded" : "cancelled",
        status: "cancelled" 
      })
      .eq("id", orderId);
  }

  return new Response(JSON.stringify({ received: true }), 
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // WEBHOOK - Validate token before processing
    if (action === "webhook") {
      return handleWebhook(req, supabase);
    }

    // Authenticated actions
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), 
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // CREATE PAYMENT
    if (action === "create") {
      const data: CreatePaymentRequest = await req.json();
      console.log("Creating Asaas payment for order:", data.orderId);

      // Validate order belongs to user
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, user_id, total_amount")
        .eq("id", data.orderId)
        .single();

      if (orderError || !order) {
        return new Response(JSON.stringify({ error: "Order not found" }), 
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (order.user_id !== userData.user.id) {
        return new Response(JSON.stringify({ error: "Not authorized for this order" }), 
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      const customer = await findOrCreateCustomer(
        data.customerName, data.customerEmail, data.customerCpfCnpj, data.customerPhone
      );

      const payment = await createAsaasPayment(
        customer.id, data.amount, data.billingType, data.orderId, data.dueDate
      );

      await supabase
        .from("orders")
        .update({
          asaas_payment_id: payment.id,
          asaas_payment_link: payment.invoiceUrl,
          payment_method: data.billingType.toLowerCase(),
        })
        .eq("id", data.orderId);

      console.log("Payment created successfully:", payment.id);

      return new Response(JSON.stringify({
        success: true,
        payment: {
          id: payment.id,
          invoiceUrl: payment.invoiceUrl,
          bankSlipUrl: payment.bankSlipUrl,
          pixQrCode: payment.pixQrCode,
          status: payment.status,
        },
      }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // CHECK PAYMENT STATUS
    if (action === "status") {
      const paymentId = url.searchParams.get("paymentId");

      if (!paymentId) {
        return new Response(JSON.stringify({ error: "paymentId is required" }), 
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      const response = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, {
        headers: { "Content-Type": "application/json", access_token: asaasApiKey },
      });

      const payment = await response.json();

      if (!response.ok) {
        return new Response(JSON.stringify({ error: "Payment not found" }), 
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      return new Response(JSON.stringify({
        status: payment.status,
        value: payment.value,
        billingType: payment.billingType,
        invoiceUrl: payment.invoiceUrl,
      }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), 
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (error: any) {
    console.error("Error in asaas-payment function:", error);
    return new Response(JSON.stringify({ error: error.message }), 
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
