import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Paintbrush } from "lucide-react";
import { ArrowLeft, Package, Truck, Clock, CheckCircle, XCircle, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Order, OrderItem } from "@/types/ecommerce";
import DisplayOrderStepper from "@/components/order/DisplayOrderStepper";

interface OrderWithItems extends Order {
  items?: OrderItem[];
  display_arts?: { id: string; locked: boolean }[];
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-yellow-500/20 text-yellow-400", label: "Aguardando Pagamento" },
  paid: { icon: CheckCircle, color: "bg-blue-500/20 text-blue-400", label: "Pago" },
  awaiting_customization: { icon: Package, color: "bg-orange-500/20 text-orange-400", label: "Personalizar Arte" },
  art_finalized: { icon: CheckCircle, color: "bg-green-500/20 text-green-400", label: "Arte Finalizada" },
  processing: { icon: Package, color: "bg-purple-500/20 text-purple-400", label: "Em Produção" },
  ready_to_ship: { icon: Truck, color: "bg-cyan-500/20 text-cyan-400", label: "Pronto para Envio" },
  shipped: { icon: Truck, color: "bg-cyan-500/20 text-cyan-400", label: "Enviado" },
  delivered: { icon: CheckCircle, color: "bg-green-500/20 text-green-400", label: "Entregue" },
  cancelled: { icon: XCircle, color: "bg-red-500/20 text-red-400", label: "Cancelado" },
};

export default function MyOrders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        items:order_items(
          *,
          product:products(*)
        ),
        display_arts(id, locked)
      `,
      )
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar pedidos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const copyTrackingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Código copiado!" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meus Pedidos</h1>
            <p className="text-muted-foreground">Acompanhe suas compras</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhum pedido</h2>
            <p className="text-muted-foreground mb-6">Você ainda não fez nenhuma compra.</p>
            <Button
              onClick={() => {
                navigate("/");
                setTimeout(() => {
                  document.getElementById("precos")?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
            >
              Proteja seu Pet Hoje
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => {
              const status = statusConfig[order.status || "pending"];
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-card">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg">Pedido #{order.id.slice(0, 8)}</CardTitle>
                          <Badge className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">{formatDate(order.created_at)}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible>
                        <AccordionItem value="details" className="border-none">
                          <AccordionTrigger className="py-2">
                            <div className="flex items-center justify-between w-full mr-4">
                              <span className="text-sm text-muted-foreground">{order.items?.length || 0} item(s)</span>
                              <span className="font-semibold text-primary">{formatCurrency(order.total_amount)}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              {/* Stepper for display orders */}
                              {order.display_arts && order.display_arts.length > 0 && order.status !== "cancelled" && (
                                <DisplayOrderStepper order={order} />
                              )}

                              {/* Items */}
                              <div className="space-y-2">
                                {order.items?.map((item: any) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                        <Package className="w-5 h-5 text-muted-foreground" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">{item.product?.name || "Produto"}</p>
                                        <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                                      </div>
                                    </div>
                                    <span className="text-sm">{formatCurrency(item.unit_price * item.quantity)}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Shipping */}
                              <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                                <p className="text-sm font-medium">Entrega</p>
                                <p className="text-xs text-muted-foreground">{order.shipping_address}</p>
                                <p className="text-xs text-muted-foreground">
                                  {order.shipping_city} - {order.shipping_state}, {order.shipping_zip}
                                </p>
                                {order.tracking_code && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                                      Rastreio: {order.tracking_code}
                                    </span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={() => copyTrackingCode(order.tracking_code!)}
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Actions — only for non-display orders */}
                              {(!order.display_arts || order.display_arts.length === 0) && (
                                <div className="flex gap-2">
                                  {order.status === "pending" && order.asaas_payment_link && (
                                    <Button size="sm" onClick={() => window.open(order.asaas_payment_link!, "_blank")}>
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      Pagar Agora
                                    </Button>
                                  )}
                                  {order.tracking_code && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        window.open(
                                          `https://rastreamento.correios.com.br/app/index.php?objeto=${order.tracking_code}`,
                                          "_blank",
                                        )
                                      }
                                    >
                                      <Truck className="w-4 h-4 mr-2" />
                                      Rastrear
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
