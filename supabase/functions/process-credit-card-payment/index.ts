import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const asaasApiKey = Deno.env.get("ASAAS_API_KEY")!;

// Use sandbox for testing (hmlg = homologação), production for live
// Keys starting with $aact_hmlg_ are sandbox keys
const ASAAS_BASE_URL = asaasApiKey?.includes("_hmlg_")
  ? "https://sandbox.asaas.com/api/v3"
  : "https://api.asaas.com/v3";

interface ProcessPaymentRequest {
  orderId: string;
  amount: number;
  // Customer info
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpfCnpj: string;
  // Address
  postalCode: string;
  address: string;
  addressNumber: string;
  complement?: string;
  province: string;
  city: string;
  state: string;
  // Card data
  cardHolderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  // Optional
  installments?: number;
}

// Mask card number for logs
function maskCardNumber(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, '');
  if (clean.length < 4) return '****';
  return '**** **** **** ' + clean.slice(-4);
}

// Find or create customer in Asaas
async function findOrCreateCustomer(
  name: string,
  email: string,
  cpfCnpj: string,
  phone: string,
  address: {
    postalCode: string;
    address: string;
    addressNumber: string;
    complement?: string;
    province: string;
    city: string;
    state: string;
  },
  externalReference: string
): Promise<{ id: string; isNew: boolean }> {
  console.log("Finding or creating Asaas customer:", email);

  // Search by CPF/CNPJ first (more reliable)
  const searchResponse = await fetch(
    `${ASAAS_BASE_URL}/customers?cpfCnpj=${cpfCnpj.replace(/\D/g, '')}`,
    { headers: { "Content-Type": "application/json", access_token: asaasApiKey } }
  );
  const searchData = await searchResponse.json();

  if (searchData.data && searchData.data.length > 0) {
    console.log("Found existing customer by CPF:", searchData.data[0].id);
    return { id: searchData.data[0].id, isNew: false };
  }

  // Create new customer
  const createResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: asaasApiKey },
    body: JSON.stringify({
      name,
      email,
      cpfCnpj: cpfCnpj.replace(/\D/g, ""),
      mobilePhone: phone.replace(/\D/g, ""),
      postalCode: address.postalCode.replace(/\D/g, ""),
      address: address.address,
      addressNumber: address.addressNumber,
      complement: address.complement || "",
      province: address.province,
      city: address.city,
      state: address.state,
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
  return { id: customerData.id, isNew: true };
}

// Process credit card payment
async function processCardPayment(
  customerId: string,
  amount: number,
  orderId: string,
  cardData: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  },
  holderInfo: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone: string;
    postalCode: string;
    address: string;
    addressNumber: string;
    complement?: string;
    province: string;
    city: string;
  },
  installments: number = 1
): Promise<any> {
  console.log("Processing card payment:", { 
    customerId, 
    amount, 
    installments,
    cardMasked: maskCardNumber(cardData.number)
  });

  // Format expiry year to 4 digits
  let expiryYear = cardData.expiryYear;
  if (expiryYear.length === 2) {
    expiryYear = '20' + expiryYear;
  }

  const paymentData: any = {
    customer: customerId,
    billingType: "CREDIT_CARD",
    value: amount,
    dueDate: new Date().toISOString().split("T")[0],
    description: `Pedido #${orderId.slice(0, 8)}`,
    externalReference: orderId,
    creditCard: {
      holderName: cardData.holderName,
      number: cardData.number.replace(/\D/g, ""),
      expiryMonth: cardData.expiryMonth.padStart(2, '0'),
      expiryYear,
      ccv: cardData.ccv,
    },
    creditCardHolderInfo: {
      name: holderInfo.name,
      email: holderInfo.email,
      cpfCnpj: holderInfo.cpfCnpj.replace(/\D/g, ""),
      phone: holderInfo.phone.replace(/\D/g, ""),
      postalCode: holderInfo.postalCode.replace(/\D/g, ""),
      address: holderInfo.address,
      addressNumber: holderInfo.addressNumber,
      complement: holderInfo.complement || "",
      province: holderInfo.province,
      city: holderInfo.city,
    },
  };

  // Add installments if more than 1
  if (installments > 1) {
    paymentData.installmentCount = installments;
    paymentData.installmentValue = Math.ceil((amount / installments) * 100) / 100;
  }

  const response = await fetch(`${ASAAS_BASE_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: asaasApiKey },
    body: JSON.stringify(paymentData),
  });

  const payment = await response.json();
  
  if (!response.ok) {
    console.error("Error processing payment:", payment);
    
    // Map common Asaas errors to user-friendly messages
    const errorMessage = payment.errors?.[0]?.description || "Falha ao processar pagamento";
    const errorCode = payment.errors?.[0]?.code;
    
    let userMessage = errorMessage;
    if (errorCode === "invalid_creditCard" || errorMessage.includes("cartão")) {
      userMessage = "Dados do cartão inválidos. Verifique o número, validade e CVV.";
    } else if (errorMessage.includes("recusad") || errorMessage.includes("negad")) {
      userMessage = "Pagamento recusado pelo emissor do cartão. Tente outro cartão.";
    } else if (errorMessage.includes("saldo") || errorMessage.includes("limite")) {
      userMessage = "Cartão sem limite disponível. Tente outro cartão.";
    }
    
    throw new Error(userMessage);
  }

  console.log("Payment processed:", { 
    id: payment.id, 
    status: payment.status,
    value: payment.value 
  });

  return payment;
}

// Rollback: Cancel payment in Asaas if DB operation fails
async function cancelPayment(paymentId: string): Promise<void> {
  console.log("Rolling back payment:", paymentId);
  
  try {
    const response = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", access_token: asaasApiKey },
    });
    
    if (response.ok) {
      console.log("Payment cancelled successfully");
    } else {
      console.error("Failed to cancel payment:", await response.json());
    }
  } catch (error) {
    console.error("Error cancelling payment:", error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Validate JWT
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
    const data: ProcessPaymentRequest = await req.json();
    
    console.log("Processing credit card payment for order:", data.orderId);
    console.log("Card masked:", maskCardNumber(data.cardNumber));

    // Validate order belongs to user
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, total_amount, status, payment_status")
      .eq("id", data.orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // SECURITY: Verify order belongs to requesting user
    if (order.user_id !== userId) {
      console.error("User mismatch:", { orderUserId: order.user_id, requestUserId: userId });
      return new Response(
        JSON.stringify({ error: "Acesso negado a este pedido" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prevent double payment
    if (order.status === "paid" || order.payment_status === "confirmed") {
      return new Response(
        JSON.stringify({ error: "Este pedido já foi pago" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create or find customer in Asaas
    const { id: customerId } = await findOrCreateCustomer(
      data.customerName,
      data.customerEmail,
      data.customerCpfCnpj,
      data.customerPhone,
      {
        postalCode: data.postalCode,
        address: data.address,
        addressNumber: data.addressNumber,
        complement: data.complement,
        province: data.province,
        city: data.city,
        state: data.state,
      },
      userId
    );

    // Update profile with Asaas customer ID and address
    await supabase
      .from("profiles")
      .update({
        asaas_customer_id: customerId,
        cpf: data.customerCpfCnpj,
        cep: data.postalCode,
        endereco: data.address,
        numero: data.addressNumber,
        complemento: data.complement || null,
        bairro: data.province,
        cidade: data.city,
        estado: data.state,
      })
      .eq("id", userId);

    // Process the payment
    const payment = await processCardPayment(
      customerId,
      data.amount,
      data.orderId,
      {
        holderName: data.cardHolderName,
        number: data.cardNumber,
        expiryMonth: data.expiryMonth,
        expiryYear: data.expiryYear,
        ccv: data.ccv,
      },
      {
        name: data.customerName,
        email: data.customerEmail,
        cpfCnpj: data.customerCpfCnpj,
        phone: data.customerPhone,
        postalCode: data.postalCode,
        address: data.address,
        addressNumber: data.addressNumber,
        complement: data.complement,
        province: data.province,
        city: data.city,
      },
      data.installments || 1
    );

    // Determine status
    const isConfirmed = payment.status === "CONFIRMED" || payment.status === "RECEIVED";
    const isPending = payment.status === "PENDING";
    const isRejected = !isConfirmed && !isPending;

    // Update order in database
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        asaas_payment_id: payment.id,
        payment_method: "credit_card",
        payment_status: isConfirmed ? "confirmed" : isPending ? "pending" : "failed",
        status: isConfirmed ? "paid" : "pending",
      })
      .eq("id", data.orderId);

    if (updateOrderError) {
      console.error("Failed to update order, rolling back payment:", updateOrderError);
      await cancelPayment(payment.id);
      throw new Error("Falha ao salvar pagamento. Tente novamente.");
    }

    // Insert payment record
    const { error: insertPaymentError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        order_id: data.orderId,
        amount: data.amount,
        status: isConfirmed ? "confirmed" : isPending ? "pending" : "failed",
        payment_method: "credit_card",
        asaas_payment_id: payment.id,
        asaas_customer_id: customerId,
        card_last_digits: data.cardNumber.replace(/\D/g, '').slice(-4),
        card_brand: detectCardBrand(data.cardNumber),
        installments: data.installments || 1,
        paid_at: isConfirmed ? new Date().toISOString() : null,
        error_message: isRejected ? payment.errors?.[0]?.description : null,
      });

    if (insertPaymentError) {
      console.error("Failed to insert payment record:", insertPaymentError);
      // Don't rollback for this, order is already updated
    }

    // Map status for frontend
    let frontendStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
    if (isConfirmed) {
      frontendStatus = 'APPROVED';
    } else if (isPending) {
      frontendStatus = 'PENDING';
    } else {
      frontendStatus = 'REJECTED';
    }

    console.log("Payment result:", { 
      orderId: data.orderId, 
      status: frontendStatus,
      asaasStatus: payment.status 
    });

    return new Response(
      JSON.stringify({
        success: true,
        status: frontendStatus,
        payment: {
          id: payment.id,
          status: payment.status,
          value: payment.value,
          invoiceUrl: payment.invoiceUrl,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in process-credit-card-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar pagamento" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

// Simple card brand detection for logging
function detectCardBrand(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^5[1-5]|^2[2-7]/.test(clean)) return 'mastercard';
  if (/^3[47]/.test(clean)) return 'amex';
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011|506699)/.test(clean)) return 'elo';
  if (/^(606282|3841)/.test(clean)) return 'hipercard';
  return 'other';
}

serve(handler);
