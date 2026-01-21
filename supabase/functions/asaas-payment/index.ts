import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const asaasApiKey = Deno.env.get("ASAAS_API_KEY")!;

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

interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
}

interface AsaasPayment {
  id: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  pixQrCode?: {
    encodedImage: string;
    payload: string;
    expirationDate: string;
  };
  status: string;
}

// Find or create customer in Asaas
async function findOrCreateCustomer(
  name: string,
  email: string,
  cpfCnpj: string,
  phone?: string
): Promise<AsaasCustomer> {
  console.log("Finding or creating Asaas customer:", email);

  // Search for existing customer
  const searchResponse = await fetch(
    `${ASAAS_BASE_URL}/customers?email=${encodeURIComponent(email)}`,
    {
      headers: {
        "Content-Type": "application/json",
        access_token: asaasApiKey,
      },
    }
  );

  const searchData = await searchResponse.json();

  if (searchData.data && searchData.data.length > 0) {
    console.log("Found existing customer:", searchData.data[0].id);
    return searchData.data[0];
  }

  // Create new customer
  const createResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: asaasApiKey,
    },
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
): Promise<AsaasPayment> {
  console.log("Creating Asaas payment:", { customerId, amount, billingType });

  const paymentData: any = {
    customer: customerId,
    billingType,
    value: amount,
    dueDate: dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    description: `Pedido #${orderId.slice(0, 8)}`,
    externalReference: orderId,
  };

  const response = await fetch(`${ASAAS_BASE_URL}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: asaasApiKey,
    },
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
      headers: {
        "Content-Type": "application/json",
        access_token: asaasApiKey,
      },
    });
    const pixData = await pixResponse.json();
    payment.pixQrCode = pixData;
  }

  return payment;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // WEBHOOK - No auth required (Asaas calls this)
    if (action === "webhook") {
      const webhookData = await req.json();
      console.log("Asaas webhook received:", webhookData);

      const { event, payment } = webhookData;

      if (!payment?.externalReference) {
        console.log("No external reference in webhook");
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const orderId = payment.externalReference;

      // Handle payment events
      if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
        console.log("Payment confirmed for order:", orderId);

        // Update order status
        const { error: orderError } = await supabase
          .from("orders")
          .update({
            payment_status: "confirmed",
            status: "paid",
            asaas_payment_id: payment.id,
          })
          .eq("id", orderId);

        if (orderError) {
          console.error("Error updating order:", orderError);
        }

        // Get order details for notifications
        const { data: order } = await supabase
          .from("orders")
          .select(`
            *,
            profiles (email, full_name, phone, whatsapp)
          `)
          .eq("id", orderId)
          .single();

        if (order) {
          // Get order items
          const { data: orderItems } = await supabase
            .from("order_items")
            .select(`
              quantity,
              unit_price,
              products (name)
            `)
            .eq("order_id", orderId);

          // Send confirmation email via Resend
          const resendApiKey = Deno.env.get("RESEND_API_KEY");
          if (resendApiKey && order.profiles?.email) {
            try {
              const itemsHtml = orderItems?.map((item: any) => `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #333;">${item.products?.name || 'Produto'}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #333; text-align: center;">${item.quantity}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #333; text-align: right;">R$ ${(item.unit_price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('') || '';

              const emailHtml = `
              <!DOCTYPE html>
              <html>
              <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                  <div style="text-align: center; margin-bottom: 40px;">
                    <h1 style="color: #22c55e; font-size: 28px; margin: 0;">✅ Pagamento Confirmado!</h1>
                  </div>
                  
                  <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border: 1px solid #333; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
                    <p style="color: #ffffff; font-size: 18px; margin: 0 0 8px;">Olá, <strong>${order.profiles?.full_name || order.shipping_name || 'Cliente'}</strong>!</p>
                    <p style="color: #a1a1aa; margin: 0;">Seu pagamento foi confirmado com sucesso! 🎉</p>
                    <p style="color: #a1a1aa; margin: 12px 0 0;">Pedido: <strong style="color: #22c55e;">#${orderId.slice(0, 8)}</strong></p>
                  </div>
                  
                  <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 16px; overflow: hidden; margin-bottom: 24px;">
                    <div style="background: #22c55e; padding: 16px;">
                      <h2 style="color: #000; font-size: 16px; margin: 0; font-weight: 600;">📦 Itens do Pedido</h2>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; color: #ffffff;">
                      <tbody>
                        ${itemsHtml}
                      </tbody>
                    </table>
                    <div style="padding: 16px; background: #262626;">
                      <p style="color: #ffffff; font-size: 18px; font-weight: bold; margin: 0; text-align: right;">
                        Total: <span style="color: #22c55e;">R$ ${order.total_amount.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                    <h3 style="color: #22c55e; font-size: 14px; margin: 0 0 12px; font-weight: 600;">🚚 Endereço de Entrega</h3>
                    <p style="color: #ffffff; margin: 0 0 4px;">${order.shipping_address}</p>
                    <p style="color: #a1a1aa; margin: 0;">${order.shipping_city} - ${order.shipping_state}, ${order.shipping_zip}</p>
                  </div>
                  
                  <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                    <p style="color: #22c55e; margin: 0; font-size: 14px;">
                      🚀 Seu pedido está sendo preparado e em breve será enviado!
                    </p>
                  </div>
                  
                  <div style="text-align: center; color: #71717a; font-size: 12px;">
                    <p style="margin: 0 0 8px;">Obrigado por comprar conosco! 💚</p>
                    <p style="margin: 0;">Tag na Mão - Proteção inteligente para seu pet</p>
                  </div>
                </div>
              </body>
              </html>
              `;

              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${resendApiKey}`,
                },
                body: JSON.stringify({
                  from: "Tag na Mão <onboarding@resend.dev>",
                  to: [order.profiles.email],
                  subject: `✅ Pagamento Confirmado - Pedido #${orderId.slice(0, 8)}`,
                  html: emailHtml,
                }),
              });
              console.log("Confirmation email sent");
            } catch (emailError) {
              console.error("Error sending email:", emailError);
            }
          }
        }
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

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Authenticated actions
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (order.user_id !== userData.user.id) {
        return new Response(
          JSON.stringify({ error: "Not authorized for this order" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Find or create customer
      const customer = await findOrCreateCustomer(
        data.customerName,
        data.customerEmail,
        data.customerCpfCnpj,
        data.customerPhone
      );

      // Create payment
      const payment = await createAsaasPayment(
        customer.id,
        data.amount,
        data.billingType,
        data.orderId,
        data.dueDate
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
    }

    // CHECK PAYMENT STATUS
    if (action === "status") {
      const paymentId = url.searchParams.get("paymentId");

      if (!paymentId) {
        return new Response(
          JSON.stringify({ error: "paymentId is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const response = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, {
        headers: {
          "Content-Type": "application/json",
          access_token: asaasApiKey,
        },
      });

      const payment = await response.json();

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: "Payment not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({
          status: payment.status,
          value: payment.value,
          billingType: payment.billingType,
          invoiceUrl: payment.invoiceUrl,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in asaas-payment function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
