import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, CheckCircle, Clock, Truck, XCircle, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface SessionOrder {
  id: string;
  status: string | null;
  total_amount: number;
  created_at: string | null;
  items?: { id: string; quantity: number; unit_price: number; product?: { name: string } | null }[];
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-yellow-500/20 text-yellow-400", label: "Aguardando Pagamento" },
  paid: { icon: CheckCircle, color: "bg-blue-500/20 text-blue-400", label: "Pedido Pago" },
  approved: { icon: CheckCircle, color: "bg-emerald-500/20 text-emerald-400", label: "Pedido Aprovado" },
  awaiting_customization: { icon: Package, color: "bg-orange-500/20 text-orange-400", label: "Aguardando Personalização" },
  art_finalized: { icon: CheckCircle, color: "bg-green-500/20 text-green-400", label: "Arte Aprovada para Impressão" },
  processing: { icon: Package, color: "bg-purple-500/20 text-purple-400", label: "Em Produção" },
  ready_to_ship: { icon: Truck, color: "bg-cyan-500/20 text-cyan-400", label: "Pronto para Envio" },
  shipped: { icon: Truck, color: "bg-cyan-500/20 text-cyan-400", label: "Enviado" },
  delivered: { icon: CheckCircle, color: "bg-green-500/20 text-green-400", label: "Entregue" },
  cancelled: { icon: XCircle, color: "bg-red-500/20 text-red-400", label: "Cancelado" },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SessionOrdersModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SessionOrder[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listExpanded, setListExpanded] = useState(false);

  const fetchSessionOrders = async () => {
    const ids: string[] = JSON.parse(sessionStorage.getItem("session_orders") || "[]");
    if (ids.length === 0) { setLoading(false); return; }

    const { data } = await supabase
      .from("orders")
      .select("id, status, total_amount, created_at, items:order_items(id, quantity, unit_price, product:products(name))")
      .in("id", ids)
      .order("created_at", { ascending: false });

    const nextOrders = (data as any) || [];
    setOrders(nextOrders);
    setListExpanded((prev) => (nextOrders.length <= 1 ? true : prev));
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    fetchSessionOrders();

    // Realtime for session orders
    const ids: string[] = JSON.parse(sessionStorage.getItem("session_orders") || "[]");
    if (ids.length === 0) return;

    const channel = supabase
      .channel("session-orders-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        if (ids.includes(payload.new?.id)) fetchSessionOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const getStatus = (s: string | null) => statusConfig[(s || "pending").toLowerCase()] || statusConfig.pending;

  const getEffectiveStatus = (order: SessionOrder) => {
    const raw = (order.status || "pending").toLowerCase();
    const hasDisplayEmpresarial = order.items?.some((item) =>
      (item.product?.name || "").toLowerCase().includes("display empresarial")
    );
    if (raw === "approved" && hasDisplayEmpresarial) return "awaiting_customization";
    return raw;
  };

  const totalAmount = orders.reduce((acc, o) => acc + (o.total_amount || 0), 0);
  const showSummary = orders.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" /> Seus Pedidos desta Sessão
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">Nenhum pedido nesta sessão.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {showSummary && (
              <button
                className="w-full flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                onClick={() => setListExpanded(!listExpanded)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Resumo da sessão</span>
                  <Badge variant="secondary">{orders.length} pedidos</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary">{formatCurrency(totalAmount)}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${listExpanded ? "rotate-180" : ""}`} />
                </div>
              </button>
            )}

            {(!showSummary || listExpanded) && (
              <div className="space-y-2">
                {orders.map((order) => {
                  const effectiveStatus = getEffectiveStatus(order);
                  const st = getStatus(effectiveStatus);
                  const StatusIcon = st.icon;
                  const isExpanded = expandedId === order.id;

                  return (
                    <div key={order.id} className="border border-border rounded-lg overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{order.id.slice(0, 8)}</span>
                          <Badge className={st.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {st.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary">{formatCurrency(order.total_amount)}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-1 border-t border-border pt-2">
                          {order.items?.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm text-muted-foreground">
                              <span>{item.product?.name || "Produto"} x{item.quantity}</span>
                              <span>{formatCurrency(item.unit_price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => { onOpenChange(false); navigate("/"); }}>
            Continuar Comprando
          </Button>
          <Button className="flex-1" onClick={() => { onOpenChange(false); navigate("/dashboard"); }}>
            Ir ao Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
