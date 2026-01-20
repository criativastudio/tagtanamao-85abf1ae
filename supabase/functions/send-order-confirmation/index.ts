import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderConfirmationRequest {
  customerEmail: string;
  customerName: string;
  orderId: string;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  paymentLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client and verify user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claims?.claims?.sub) {
      console.error("Invalid token:", claimsError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claims.claims.sub;
    console.log("Authenticated user:", userId);

    const data: OrderConfirmationRequest = await req.json();

    // Validate order belongs to user
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("user_id, id")
      .eq("id", data.orderId)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (order.user_id !== userId) {
      console.error("User not authorized for this order:", userId, "vs", order.user_id);
      return new Response(
        JSON.stringify({ error: "Not authorized for this order" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending order confirmation email for order:", data.orderId);

    const itemsHtml = data.orderItems.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #333;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #333; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #333; text-align: right;">R$ ${item.price.toFixed(2)}</td>
      </tr>
    `).join('');

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
          <h1 style="color: #22c55e; font-size: 28px; margin: 0;">🎉 Pedido Confirmado!</h1>
        </div>
        
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border: 1px solid #333; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #ffffff; font-size: 18px; margin: 0 0 8px;">Olá, <strong>${data.customerName}</strong>!</p>
          <p style="color: #a1a1aa; margin: 0;">Seu pedido <strong style="color: #22c55e;">#${data.orderId.slice(0, 8)}</strong> foi criado com sucesso.</p>
        </div>
        
        <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 16px; overflow: hidden; margin-bottom: 24px;">
          <div style="background: #22c55e; padding: 16px;">
            <h2 style="color: #000; font-size: 16px; margin: 0; font-weight: 600;">📦 Itens do Pedido</h2>
          </div>
          <table style="width: 100%; border-collapse: collapse; color: #ffffff;">
            <thead>
              <tr style="background: #262626;">
                <th style="padding: 12px; text-align: left; font-weight: 500;">Produto</th>
                <th style="padding: 12px; text-align: center; font-weight: 500;">Qtd</th>
                <th style="padding: 12px; text-align: right; font-weight: 500;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div style="padding: 16px; background: #262626;">
            <table style="width: 100%; color: #a1a1aa;">
              <tr>
                <td style="padding: 4px 0;">Subtotal:</td>
                <td style="text-align: right;">R$ ${data.subtotal.toFixed(2)}</td>
              </tr>
              ${data.discount > 0 ? `
              <tr style="color: #22c55e;">
                <td style="padding: 4px 0;">Desconto:</td>
                <td style="text-align: right;">-R$ ${data.discount.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 4px 0;">Frete:</td>
                <td style="text-align: right;">${data.shipping === 0 ? 'Grátis' : `R$ ${data.shipping.toFixed(2)}`}</td>
              </tr>
              <tr style="color: #ffffff; font-size: 18px; font-weight: bold;">
                <td style="padding-top: 12px; border-top: 1px solid #333;">Total:</td>
                <td style="text-align: right; padding-top: 12px; border-top: 1px solid #333; color: #22c55e;">R$ ${data.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>
        </div>
        
        <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #22c55e; font-size: 14px; margin: 0 0 12px; font-weight: 600;">🚚 Endereço de Entrega</h3>
          <p style="color: #ffffff; margin: 0 0 4px;">${data.shippingAddress}</p>
          <p style="color: #a1a1aa; margin: 0;">${data.shippingCity} - ${data.shippingState}, ${data.shippingZip}</p>
        </div>
        
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${data.paymentLink}" style="display: inline-block; background: #22c55e; color: #000; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-weight: bold; font-size: 16px;">
            💳 Pagar Agora
          </a>
        </div>
        
        <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #22c55e; margin: 0; font-size: 14px;">
            💡 <strong>Dica:</strong> Você pode acompanhar todos os detalhes do seu pedido, incluindo o código de rastreio, no menu <strong>Meus Pedidos</strong> do seu painel.
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
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Tag na Mão <onboarding@resend.dev>",
        to: [data.customerEmail],
        subject: `Pedido #${data.orderId.slice(0, 8)} confirmado! 🎉`,
        html: emailHtml,
      }),
    });

    const result = await emailResponse.json();
    console.log("Order confirmation email sent:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending order confirmation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);