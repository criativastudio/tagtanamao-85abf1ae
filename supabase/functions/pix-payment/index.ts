import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");

// Generate a random PIX key (simulating a dynamic PIX)
function generatePixKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Generate a unique transaction ID
function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `PIX${timestamp}${randomPart}`.toUpperCase();
}

// Format currency in BRL
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

interface CreatePixRequest {
  orderId: string;
  amount: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
}

interface ConfirmPixRequest {
  pixPaymentId: string;
  orderId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    let action = url.searchParams.get("action");

    // Parse body to determine action if not in query string
    let bodyData: any = null;
    if (req.method === "POST") {
      try {
        bodyData = await req.json();
      } catch {
        bodyData = {};
      }
    }

    // Default to "create" action if no action specified and body contains orderId
    if (!action && bodyData?.orderId && bodyData?.amount) {
      action = "create";
    }

    // Validate auth for all actions
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

    // CREATE PIX PAYMENT
    if (action === "create") {
      const data: CreatePixRequest = bodyData;
      console.log("Creating PIX payment for order:", data.orderId);

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

      // Generate PIX data
      const pixKey = generatePixKey();
      const transactionId = generateTransactionId();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Create PIX payment record
      const { data: pixPayment, error: pixError } = await supabase
        .from("pix_payments")
        .insert({
          order_id: data.orderId,
          pix_key: pixKey,
          pix_key_type: "random",
          amount: data.amount,
          transaction_id: transactionId,
          status: "pending",
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (pixError) {
        console.error("Error creating PIX payment:", pixError);
        throw pixError;
      }

      console.log("PIX payment created:", pixPayment.id);

      return new Response(
        JSON.stringify({
          success: true,
          pixPayment: {
            id: pixPayment.id,
            pixKey,
            transactionId,
            amount: data.amount,
            expiresAt: expiresAt.toISOString(),
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // CONFIRM PIX PAYMENT (Admin only)
    if (action === "confirm") {
      const data: ConfirmPixRequest = bodyData || await req.json();
      console.log("Confirming PIX payment:", data.pixPaymentId);

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userData.user.id)
        .single();

      if (profileError || !profile?.is_admin) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Update PIX payment status
      const { data: pixPayment, error: pixUpdateError } = await supabase
        .from("pix_payments")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", data.pixPaymentId)
        .select(`
          *,
          orders (
            id,
            user_id,
            total_amount,
            shipping_name,
            shipping_phone,
            shipping_address,
            shipping_city,
            shipping_state,
            shipping_zip
          )
        `)
        .single();

      if (pixUpdateError) {
        console.error("Error updating PIX payment:", pixUpdateError);
        throw pixUpdateError;
      }

      // Update order status
      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({
          payment_status: "confirmed",
          status: "paid",
        })
        .eq("id", data.orderId);

      if (orderUpdateError) {
        console.error("Error updating order:", orderUpdateError);
        throw orderUpdateError;
      }

      // Get customer profile for notifications
      const { data: customerProfile } = await supabase
        .from("profiles")
        .select("email, full_name, phone, whatsapp")
        .eq("id", pixPayment.orders.user_id)
        .single();

      // Get order items for email
      const { data: orderItems } = await supabase
        .from("order_items")
        .select(`
          quantity,
          unit_price,
          products (name)
        `)
        .eq("order_id", data.orderId);

      // Send confirmation email via Resend API
      if (resendApiKey && customerProfile?.email) {
        try {
          const itemsHtml = orderItems?.map((item: any) => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #333;">${item.products?.name || 'Produto'}</td>
              <td style="padding: 12px; border-bottom: 1px solid #333; text-align: center;">${item.quantity}</td>
              <td style="padding: 12px; border-bottom: 1px solid #333; text-align: right;">${formatCurrency(item.unit_price * item.quantity)}</td>
            </tr>
          `).join('') || '';

          const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #22c55e; font-size: 28px; margin: 0;">✅ Pagamento Confirmado!</h1>
              </div>
              
              <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border: 1px solid #333; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
                <p style="color: #ffffff; font-size: 18px; margin: 0 0 8px;">Olá, <strong>${customerProfile.full_name || 'Cliente'}</strong>!</p>
                <p style="color: #a1a1aa; margin: 0;">Seu pagamento PIX foi confirmado com sucesso! 🎉</p>
                <p style="color: #a1a1aa; margin: 12px 0 0;">Pedido: <strong style="color: #22c55e;">#${data.orderId.slice(0, 8)}</strong></p>
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
                    Total: <span style="color: #22c55e;">${formatCurrency(pixPayment.amount)}</span>
                  </p>
                </div>
              </div>
              
              <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #22c55e; font-size: 14px; margin: 0 0 12px; font-weight: 600;">🚚 Endereço de Entrega</h3>
                <p style="color: #ffffff; margin: 0 0 4px;">${pixPayment.orders.shipping_address}</p>
                <p style="color: #a1a1aa; margin: 0;">${pixPayment.orders.shipping_city} - ${pixPayment.orders.shipping_state}, ${pixPayment.orders.shipping_zip}</p>
              </div>
              
              <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #22c55e; margin: 0; font-size: 14px;">
                  🚀 Seu pedido está sendo preparado e em breve será enviado! Você receberá o código de rastreio por e-mail.
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

          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "Tag na Mão <onboarding@resend.dev>",
              to: [customerProfile.email],
              subject: `✅ Pagamento Confirmado - Pedido #${data.orderId.slice(0, 8)}`,
              html: emailHtml,
            }),
          });

          const emailResult = await emailResponse.json();
          console.log("Confirmation email sent:", emailResult);
        } catch (emailError) {
          console.error("Error sending confirmation email:", emailError);
        }
      }

      // Get admin WhatsApp for customer notification
      const { data: adminSettings } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", ["admin_whatsapp"]);

      const adminWhatsapp = adminSettings?.find(s => s.key === "admin_whatsapp")?.value;

      console.log("PIX payment confirmed successfully");

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment confirmed",
          customerPhone: customerProfile?.phone || customerProfile?.whatsapp,
          adminWhatsapp,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // CHECK PIX STATUS
    if (action === "status") {
      const pixPaymentId = url.searchParams.get("pixPaymentId");
      
      if (!pixPaymentId) {
        return new Response(
          JSON.stringify({ error: "pixPaymentId is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: pixPayment, error } = await supabase
        .from("pix_payments")
        .select("status, confirmed_at, expires_at")
        .eq("id", pixPaymentId)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: "PIX payment not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ 
          status: pixPayment.status,
          confirmedAt: pixPayment.confirmed_at,
          expiresAt: pixPayment.expires_at,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in pix-payment function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
