import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const asaasApiKey = Deno.env.get("ASAAS_API_KEY")!;
const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

// Use sandbox for testing (hmlg = homologação), production for live
// Keys starting with $aact_hmlg_ are sandbox keys
const ASAAS_BASE_URL = asaasApiKey?.includes("_hmlg_")
  ? "https://sandbox.asaas.com/api/v3"
  : "https://api.asaas.com/v3";

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

// Find or create customer in Asaas
async function findOrCreateCustomer(
  name: string,
  email: string,
  cpfCnpj: string,
  phone: string,
  externalReference: string
): Promise<string> {
  console.log("Finding or creating Asaas customer:", email);

  // Search by CPF/CNPJ first (more reliable)
  const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
  const searchResponse = await fetch(
    `${ASAAS_BASE_URL}/customers?cpfCnpj=${cleanCpfCnpj}`,
    { headers: { "Content-Type": "application/json", access_token: asaasApiKey } }
  );
  const searchData = await searchResponse.json();

  if (searchData.data && searchData.data.length > 0) {
    console.log("Found existing customer by CPF:", searchData.data[0].id);
    return searchData.data[0].id;
  }

  // Create new customer
  const createResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: asaasApiKey },
    body: JSON.stringify({
      name,
      email,
      cpfCnpj: cleanCpfCnpj,
      mobilePhone: phone.replace(/\D/g, ""),
      externalReference,
      notificationDisabled: false,
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

// Create payment in Asaas
async function createPayment(
  customerId: string,
  amount: number,
  orderId: string,
  billingType: "PIX" | "BOLETO"
): Promise<any> {
  console.log("Creating Asaas payment:", { customerId, amount, billingType });

  // Calculate due date (3 days from now for boleto, same day for PIX)
  const dueDate = new Date();
  if (billingType === "BOLETO") {
    dueDate.setDate(dueDate.getDate() + 3);
  }

  const paymentData: any = {
    customer: customerId,
    billingType,
    value: amount,
    dueDate: dueDate.toISOString().split("T")[0],
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
    throw new Error(payment.errors?.[0]?.description || "Falha ao criar cobrança");
  }

  console.log("Payment created:", payment.id);

  // If PIX, get the QR code
  if (billingType === "PIX") {
    const pixResponse = await fetch(`${ASAAS_BASE_URL}/payments/${payment.id}/pixQrCode`, {
      headers: { "Content-Type": "application/json", access_token: asaasApiKey },
    });
    const pixData = await pixResponse.json();

    if (pixResponse.ok) {
      payment.pixQrCode = {
        encodedImage: pixData.encodedImage,
        payload: pixData.payload,
        expirationDate: pixData.expirationDate,
      };
    }
  }

  return payment;
}

// Handle webhook events
async function handleWebhook(
  supabase: any,
  payload: WebhookPayload
): Promise<{ success: boolean; message: string }> {
  console.log("Processing webhook event:", payload.event);

  const { event, payment } = payload;
  const orderId = payment.externalReference;

  if (!orderId) {
    console.error("No order ID in webhook");
    return { success: false, message: "Missing order reference" };
  }

  // Map Asaas events to order statuses
  let orderStatus: string | null = null;
  let paymentStatus: string | null = null;

  switch (event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
      orderStatus = "paid";
      paymentStatus = "confirmed";
      break;
    case "PAYMENT_OVERDUE":
      paymentStatus = "overdue";
      break;
    case "PAYMENT_REFUNDED":
    case "PAYMENT_REFUND_REQUESTED":
      orderStatus = "cancelled";
      paymentStatus = "refunded";
      break;
    case "PAYMENT_DELETED":
      paymentStatus = "cancelled";
      break;
    default:
      console.log("Unhandled event type:", event);
      return { success: true, message: "Event ignored" };
  }

  // Update order
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };
  if (orderStatus) updateData.status = orderStatus;
  if (paymentStatus) updateData.payment_status = paymentStatus;

  const { error: orderError } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (orderError) {
    console.error("Error updating order:", orderError);
    return { success: false, message: "Failed to update order" };
  }

  // Update payments table if exists
  await supabase
    .from("payments")
    .update({
      status: paymentStatus,
      paid_at: paymentStatus === "confirmed" ? new Date().toISOString() : null,
    })
    .eq("order_id", orderId);

  console.log("Order updated:", { orderId, orderStatus, paymentStatus });

  return { success: true, message: "Webhook processed" };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check if this is a webhook call
    const accessToken = req.headers.get("asaas-access-token");
    
    if (accessToken) {
      // Validate webhook token
      if (webhookToken && accessToken !== webhookToken) {
        console.error("Invalid webhook token");
        return new Response(
          JSON.stringify({ error: "Invalid webhook token" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const payload: WebhookPayload = await req.json();
      const result = await handleWebhook(supabase, payload);

      return new Response(
        JSON.stringify(result),
        { status: result.success ? 200 : 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Regular payment creation request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = userData.user.id;
    const data: CreatePaymentRequest = await req.json();

    console.log("Creating Asaas payment for order:", data.orderId);

    // Validate order belongs to user
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, total_amount, status")
      .eq("id", data.orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (order.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Acesso negado" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create or find customer
    const customerId = await findOrCreateCustomer(
      data.customerName,
      data.customerEmail,
      data.customerCpfCnpj,
      data.customerPhone,
      userId
    );

    // Update profile with Asaas customer ID
    await supabase
      .from("profiles")
      .update({
        asaas_customer_id: customerId,
        cpf: data.customerCpfCnpj,
      })
      .eq("id", userId);

    // Create payment (only PIX and BOLETO, credit card uses separate function)
    if (data.billingType === "CREDIT_CARD") {
      return new Response(
        JSON.stringify({ error: "Use process-credit-card-payment for credit card payments" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const payment = await createPayment(
      customerId,
      data.amount,
      data.orderId,
      data.billingType
    );

    // Update order with payment info
    await supabase
      .from("orders")
      .update({
        asaas_payment_id: payment.id,
        asaas_payment_link: payment.invoiceUrl,
        payment_method: data.billingType.toLowerCase(),
      })
      .eq("id", data.orderId);

    // Insert payment record
    await supabase
      .from("payments")
      .insert({
        user_id: userId,
        order_id: data.orderId,
        amount: data.amount,
        status: "pending",
        payment_method: data.billingType.toLowerCase(),
        asaas_payment_id: payment.id,
        asaas_customer_id: customerId,
      });

    console.log("Payment created successfully:", payment.id);

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: payment.id,
          invoiceUrl: payment.invoiceUrl,
          bankSlipUrl: payment.bankSlipUrl,
          pixQrCode: payment.pixQrCode,
          status: payment.status,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in asaas-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar pagamento" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
