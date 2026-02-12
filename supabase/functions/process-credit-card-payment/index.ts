import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const asaasApiKey = Deno.env.get("ASAAS_API_KEY")!;

const ASAAS_BASE_URL = asaasApiKey?.includes("_hmlg_")
  ? "https://sandbox.asaas.com/api/v3"
  : "https://api.asaas.com/v3";

// --- Shipping validation (Melhor Envio dynamic prices) ---
const LOCAL_SHIPPING: Record<string, { price: number; city: string; state: string }> = {
  "Entrega Local - Porto Velho": { price: 5.00, city: "porto velho", state: "RO" },
  "Frete Grátis - Jaru": { price: 0, city: "jaru", state: "RO" },
};

function validateShippingMethod(method: string | null, cost: number | null, city: string | null, state: string | null): string | null {
  if (!method) return "Método de envio não informado";
  if (cost === null || cost === undefined || cost < 0) return "Valor de frete inválido";
  
  const localCfg = LOCAL_SHIPPING[method];
  if (localCfg) {
    if (Math.abs((cost || 0) - localCfg.price) > 0.01) return `Valor de frete inválido para ${method}`;
    const c = (city || "").trim().toLowerCase();
    const s = (state || "").trim().toUpperCase();
    if (s !== localCfg.state) return `Entrega local disponível apenas para ${localCfg.state}`;
    if (c !== localCfg.city) return `Entrega local indisponível para esta cidade`;
  }
  return null;
}

function getShippingLabel(method: string): string {
  return method || "Envio";
}

async function validateOrderAmount(supabase: any, orderId: string, frontendAmount: number): Promise<string | null> {
  const { data: order } = await supabase
    .from("orders")
    .select("shipping_cost, shipping_method, discount_amount, shipping_city, shipping_state")
    .eq("id", orderId).single();
  if (!order) return "Pedido não encontrado para validação";
  const shippingErr = validateShippingMethod(order.shipping_method, order.shipping_cost, order.shipping_city, order.shipping_state);
  if (shippingErr) return shippingErr;
  const { data: items } = await supabase.from("order_items").select("quantity, unit_price").eq("order_id", orderId);
  if (!items || items.length === 0) return "Itens do pedido não encontrados";
  const subtotal = items.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0);
  const expected = subtotal + (order.shipping_cost || 0) - (order.discount_amount || 0);
  if (Math.abs(expected - frontendAmount) > 0.01) {
    console.error("Amount mismatch:", { expected, frontendAmount });
    return `Valor do pagamento não confere. Esperado: ${expected.toFixed(2)}`;
  }
  return null;
}

// --- Asaas helpers ---
interface ProcessPaymentRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpfCnpj: string;
  postalCode: string;
  address: string;
  addressNumber: string;
  complement?: string;
  province: string;
  city: string;
  state: string;
  cardHolderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  installments?: number;
}

function maskCardNumber(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, '');
  return '**** **** **** ' + clean.slice(-4);
}

function detectCardBrand(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^5[1-5]|^2[2-7]/.test(clean)) return 'mastercard';
  if (/^3[47]/.test(clean)) return 'amex';
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011|506699)/.test(clean)) return 'elo';
  if (/^(606282|3841)/.test(clean)) return 'hipercard';
  return 'other';
}

async function findOrCreateCustomer(name: string, email: string, cpfCnpj: string, phone: string, address: any, externalReference: string): Promise<{ id: string }> {
  const searchResponse = await fetch(`${ASAAS_BASE_URL}/customers?cpfCnpj=${cpfCnpj.replace(/\D/g, '')}`, {
    headers: { "Content-Type": "application/json", access_token: asaasApiKey },
  });
  const searchData = await searchResponse.json();
  if (searchData.data?.length > 0) return { id: searchData.data[0].id };

  const createResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: asaasApiKey },
    body: JSON.stringify({
      name, email, cpfCnpj: cpfCnpj.replace(/\D/g, ""),
      mobilePhone: phone.replace(/\D/g, ""),
      postalCode: address.postalCode.replace(/\D/g, ""),
      address: address.address, addressNumber: address.addressNumber,
      complement: address.complement || "", province: address.province,
      city: address.city, state: address.state,
      externalReference, notificationDisabled: false,
    }),
  });
  const customerData = await createResponse.json();
  if (!createResponse.ok) throw new Error(customerData.errors?.[0]?.description || "Falha ao criar cliente no Asaas");
  return { id: customerData.id };
}

async function cancelPayment(paymentId: string): Promise<void> {
  try {
    await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", access_token: asaasApiKey },
    });
  } catch (error) {
    console.error("Error cancelling payment:", error);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
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
    const data: ProcessPaymentRequest = await req.json();
    console.log("Processing credit card payment for order:", data.orderId);
    console.log("Card masked:", maskCardNumber(data.cardNumber));

    // Validate order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, total_amount, status, payment_status, shipping_method")
      .eq("id", data.orderId).single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (order.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Acesso negado a este pedido" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (order.status === "paid" || order.payment_status === "confirmed") {
      return new Response(JSON.stringify({ error: "Este pedido já foi pago" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Validate amount
    const amountErr = await validateOrderAmount(supabase, data.orderId, data.amount);
    if (amountErr) {
      console.error("Shipping/amount validation failed:", amountErr);
      return new Response(JSON.stringify({ error: amountErr }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Customer
    const { id: customerId } = await findOrCreateCustomer(
      data.customerName, data.customerEmail, data.customerCpfCnpj, data.customerPhone,
      { postalCode: data.postalCode, address: data.address, addressNumber: data.addressNumber, complement: data.complement, province: data.province, city: data.city, state: data.state },
      userId,
    );

    await supabase.from("profiles").update({
      asaas_customer_id: customerId, cpf: data.customerCpfCnpj,
      cep: data.postalCode, endereco: data.address, numero: data.addressNumber,
      complemento: data.complement || null, bairro: data.province, cidade: data.city, estado: data.state,
    }).eq("id", userId);

    // Build description with shipping
    const shippingLabel = getShippingLabel(order.shipping_method || "");
    const description = `Pedido #${data.orderId.slice(0, 8)} | Frete: ${shippingLabel}`;

    // Process payment
    let expiryYear = data.expiryYear;
    if (expiryYear.length === 2) expiryYear = '20' + expiryYear;

    const paymentData: any = {
      customer: customerId, billingType: "CREDIT_CARD", value: data.amount,
      dueDate: new Date().toISOString().split("T")[0],
      description, externalReference: data.orderId,
      creditCard: {
        holderName: data.cardHolderName, number: data.cardNumber.replace(/\D/g, ""),
        expiryMonth: data.expiryMonth.padStart(2, '0'), expiryYear, ccv: data.ccv,
      },
      creditCardHolderInfo: {
        name: data.customerName, email: data.customerEmail,
        cpfCnpj: data.customerCpfCnpj.replace(/\D/g, ""),
        phone: data.customerPhone.replace(/\D/g, ""),
        postalCode: data.postalCode.replace(/\D/g, ""),
        address: data.address, addressNumber: data.addressNumber,
        complement: data.complement || "", province: data.province, city: data.city,
      },
    };

    const installments = data.installments || 1;
    if (installments > 1) {
      paymentData.installmentCount = installments;
      paymentData.installmentValue = Math.ceil((data.amount / installments) * 100) / 100;
    }

    const response = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: asaasApiKey },
      body: JSON.stringify(paymentData),
    });
    const payment = await response.json();

    if (!response.ok) {
      const errorMessage = payment.errors?.[0]?.description || "Falha ao processar pagamento";
      let userMessage = errorMessage;
      if (errorMessage.includes("cartão")) userMessage = "Dados do cartão inválidos. Verifique o número, validade e CVV.";
      else if (errorMessage.includes("recusad") || errorMessage.includes("negad")) userMessage = "Pagamento recusado pelo emissor do cartão. Tente outro cartão.";
      throw new Error(userMessage);
    }

    const isConfirmed = payment.status === "CONFIRMED" || payment.status === "RECEIVED";
    const isPending = payment.status === "PENDING";
    const mappedPaymentStatus = isConfirmed ? "confirmed" : isPending ? "pending" : "failed";

    const { error: updateOrderError } = await supabase.from("orders").update({
      asaas_payment_id: payment.id, payment_method: "credit_card",
      payment_status: mappedPaymentStatus,
      status: mappedPaymentStatus === "confirmed" ? "paid" : "pending",
    }).eq("id", data.orderId);

    if (updateOrderError) {
      await cancelPayment(payment.id);
      throw new Error("Falha ao salvar pagamento. Tente novamente.");
    }

    await supabase.from("payments").insert({
      user_id: userId, order_id: data.orderId, amount: data.amount,
      status: isConfirmed ? "confirmed" : isPending ? "pending" : "failed",
      payment_method: "credit_card", asaas_payment_id: payment.id,
      asaas_customer_id: customerId,
      card_last_digits: data.cardNumber.replace(/\D/g, '').slice(-4),
      card_brand: detectCardBrand(data.cardNumber),
      installments: installments,
      paid_at: isConfirmed ? new Date().toISOString() : null,
    });

    const frontendStatus = isConfirmed ? 'CONFIRMED' : isPending ? 'PENDING' : 'REJECTED';
    console.log("Payment result:", { orderId: data.orderId, status: frontendStatus, mappedPaymentStatus });

    return new Response(JSON.stringify({
      success: true, status: frontendStatus, mappedPaymentStatus,
      payment: { id: payment.id, status: payment.status, value: payment.value, invoiceUrl: payment.invoiceUrl },
    }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (error: any) {
    console.error("Error in process-credit-card-payment:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro ao processar pagamento" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
