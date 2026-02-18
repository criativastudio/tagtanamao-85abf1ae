import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");

// --- Shipping validation ---
const VALID_SHIPPING: Record<string, { price: number; localOnly?: boolean }> = {
  PAC: { price: 12.9 },
  SEDEX: { price: 24.9 },
  LOCAL_PORTO_VELHO: { price: 5.0, localOnly: true },
  LOCAL_JARU: { price: 0, localOnly: true },
};

function validateShippingMethod(
  method: string | null,
  cost: number | null,
  city: string | null,
  state: string | null,
): string | null {
  if (!method) return "Método de envio não informado";

  let normalizedMethod = (method || "").toUpperCase();

  if (normalizedMethod.includes("PAC")) normalizedMethod = "PAC";
  if (normalizedMethod.includes("SEDEX")) normalizedMethod = "SEDEX";
  if (normalizedMethod.includes("PORTO VELHO")) normalizedMethod = "LOCAL_PORTO_VELHO";
  if (normalizedMethod.includes("JARU")) normalizedMethod = "LOCAL_JARU";

  const cfg = VALID_SHIPPING[normalizedMethod];
  if (!cfg) return `Método de envio inválido: ${method}`;
  if (Math.abs((cost || 0) - cfg.price) > 0.01) return `Valor de frete inválido para ${method}`;
  if (cfg.localOnly) {
    const c = (city || "").trim().toLowerCase();
    const s = (state || "").trim().toUpperCase();
    if (s !== "RO") return "Entrega local disponível apenas para RO";
    if (normalizedMethod === "LOCAL_PORTO_VELHO" && c !== "porto velho")
      return "Entrega local indisponível para esta cidade";
    if (normalizedMethod === "LOCAL_JARU" && c !== "jaru") return "Entrega local indisponível para esta cidade";
  }
  return null;
}

async function validateOrderAmount(supabase: any, orderId: string, frontendAmount: number): Promise<string | null> {
  const { data: order } = await supabase
    .from("orders")
    .select("shipping_cost, shipping_method, discount_amount, shipping_city, shipping_state")
    .eq("id", orderId)
    .single();
  if (!order) return "Pedido não encontrado para validação";
  const shippingErr = validateShippingMethod(
    order.shipping_method,
    order.shipping_cost,
    order.shipping_city,
    order.shipping_state,
  );
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

/**
 * Determina o próximo status após pagamento confirmado com base no tipo de produto.
 * - Display → awaiting_customization
 * - Pet tag / outros → processing
 */
async function getNextStatusAfterPayment(supabase: any, orderId: string): Promise<string> {
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, products(type)")
    .eq("order_id", orderId);

  const hasDisplay = items?.some((item: any) => item.products?.type === "business_display");
  return hasDisplay ? "awaiting_customization" : "processing";
}

// --- PIX helpers ---
function generatePixKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "";
  for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
  return key;
}

function generateTransactionId(): string {
  return `PIX${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`.toUpperCase();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    let action = url.searchParams.get("action");

    let bodyData: any = null;
    if (req.method === "POST") {
      try {
        bodyData = await req.json();
      } catch {
        bodyData = {};
      }
    }

    if (!action && bodyData?.orderId && bodyData?.amount) action = "create";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // CREATE PIX PAYMENT
    if (action === "create") {
      const data: CreatePixRequest = bodyData;
      console.log("Creating PIX payment for order:", data.orderId);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, user_id, total_amount")
        .eq("id", data.orderId)
        .single();
      if (orderError || !order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      if (order.user_id !== userData.user.id) {
        return new Response(JSON.stringify({ error: "Not authorized for this order" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Validate amount
      const amountErr = await validateOrderAmount(supabase, data.orderId, data.amount);
      if (amountErr) {
        console.error("Shipping/amount validation failed:", amountErr);
        return new Response(JSON.stringify({ error: amountErr }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const pixKey = generatePixKey();
      const transactionId = generateTransactionId();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

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
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // CONFIRM PIX PAYMENT (Admin only)
    if (action === "confirm") {
      const data: ConfirmPixRequest = bodyData || (await req.json());
      console.log("Confirming PIX payment:", data.pixPaymentId);

      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", userData.user.id).single();
      if (!profile?.is_admin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { data: pixPayment, error: pixUpdateError } = await supabase
        .from("pix_payments")
        .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("id", data.pixPaymentId)
        .select(
          `*, orders (id, user_id, total_amount, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_state, shipping_zip)`,
        )
        .single();

      if (pixUpdateError) throw pixUpdateError;

      // Determine next status after payment — auto-advance based on product type
      const nextStatus = await getNextStatusAfterPayment(supabase, data.orderId);
      console.log(`Auto-advancing PIX order ${data.orderId} to '${nextStatus}' after confirmation`);

      await supabase.from("orders").update({
        payment_status: "confirmed",
        status: nextStatus,
      }).eq("id", data.orderId);

      const { data: customerProfile } = await supabase
        .from("profiles")
        .select("email, full_name, phone, whatsapp")
        .eq("id", pixPayment.orders.user_id)
        .single();

      const { data: orderItems } = await supabase
        .from("order_items")
        .select(`quantity, unit_price, products (name)`)
        .eq("order_id", data.orderId);

      // Send confirmation email
      if (resendApiKey && customerProfile?.email) {
        try {
          const itemsHtml =
            orderItems
              ?.map(
                (item: any) => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #333;">${item.products?.name || "Produto"}</td>
              <td style="padding: 12px; border-bottom: 1px solid #333; text-align: center;">${item.quantity}</td>
              <td style="padding: 12px; border-bottom: 1px solid #333; text-align: right;">${formatCurrency(item.unit_price * item.quantity)}</td>
            </tr>
          `,
              )
              .join("") || "";

          const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',sans-serif;">
            <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
              <h1 style="color:#22c55e;text-align:center;">✅ Pagamento Confirmado!</h1>
              <div style="background:#1a1a1a;border:1px solid #333;border-radius:16px;padding:24px;margin:24px 0;">
                <p style="color:#fff;font-size:18px;">Olá, <strong>${customerProfile.full_name || "Cliente"}</strong>!</p>
                <p style="color:#a1a1aa;">Seu pagamento PIX foi confirmado! 🎉</p>
                <p style="color:#a1a1aa;">Pedido: <strong style="color:#22c55e;">#${data.orderId.slice(0, 8)}</strong></p>
              </div>
              <div style="background:#1a1a1a;border:1px solid #333;border-radius:16px;overflow:hidden;margin:24px 0;">
                <div style="background:#22c55e;padding:16px;"><h2 style="color:#000;margin:0;">📦 Itens do Pedido</h2></div>
                <table style="width:100%;border-collapse:collapse;color:#fff;"><tbody>${itemsHtml}</tbody></table>
                <div style="padding:16px;background:#262626;">
                  <p style="color:#fff;font-size:18px;font-weight:bold;text-align:right;">Total: <span style="color:#22c55e;">${formatCurrency(pixPayment.amount)}</span></p>
                </div>
              </div>
              <div style="background:#1a1a1a;border:1px solid #333;border-radius:16px;padding:20px;margin:24px 0;">
                <h3 style="color:#22c55e;">🚚 Endereço de Entrega</h3>
                <p style="color:#fff;">${pixPayment.orders.shipping_address}</p>
                <p style="color:#a1a1aa;">${pixPayment.orders.shipping_city} - ${pixPayment.orders.shipping_state}, ${pixPayment.orders.shipping_zip}</p>
              </div>
              <div style="text-align:center;color:#71717a;font-size:12px;"><p>Obrigado por comprar conosco! 💚</p><p>Tag na Mão</p></div>
            </div>
          </body></html>`;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
            body: JSON.stringify({
              from: "Tag na Mão <onboarding@resend.dev>",
              to: [customerProfile.email],
              subject: `✅ Pagamento Confirmado - Pedido #${data.orderId.slice(0, 8)}`,
              html: emailHtml,
            }),
          });
          console.log("Confirmation email sent");
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
      }

      const { data: adminSettings } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", ["admin_whatsapp"]);
      const adminWhatsapp = adminSettings?.find((s: any) => s.key === "admin_whatsapp")?.value;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment confirmed",
          nextStatus,
          customerPhone: customerProfile?.phone || customerProfile?.whatsapp,
          adminWhatsapp,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // CHECK PIX STATUS
    if (action === "status") {
      const pixPaymentId = url.searchParams.get("pixPaymentId");
      if (!pixPaymentId) {
        return new Response(JSON.stringify({ error: "pixPaymentId is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const { data: pixPayment, error } = await supabase
        .from("pix_payments")
        .select("status, confirmed_at, expires_at")
        .eq("id", pixPaymentId)
        .single();
      if (error) {
        return new Response(JSON.stringify({ error: "PIX payment not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      return new Response(
        JSON.stringify({
          status: pixPayment.status,
          confirmedAt: pixPayment.confirmed_at,
          expiresAt: pixPayment.expires_at,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in pix-payment function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
