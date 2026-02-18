import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Monitor, Paintbrush, CheckCircle, Clock, Edit3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface DisplayArt {
  id: string;
  locked: boolean;
  company_name: string | null;
  logo_url: string | null;
  template_id: string | null;
  order_item_id: string | null;
}

interface DisplayOrderItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    type: string;
    image_url: string | null;
  } | null;
  arts: DisplayArt[];
}

function ArtStatusBadge({ art }: { art: DisplayArt | null }) {
  if (!art) {
    return (
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
        <Clock className="w-3 h-3 mr-1" />
        Pendente
      </Badge>
    );
  }
  if (art.locked) {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <CheckCircle className="w-3 h-3 mr-1" />
        Finalizada
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
      <Edit3 className="w-3 h-3 mr-1" />
      Em edição
    </Badge>
  );
}

export default function DisplaysOrderManager() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const { toast } = useToast();
  const { user } = useAuth();

  const [items, setItems] = useState<DisplayOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingArt, setCreatingArt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!orderId) {
      navigate("/meus-pedidos");
      return;
    }
    fetchData();
  }, [user, orderId]);

  // Realtime updates for display_arts
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`display_arts_order_${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "display_arts", filter: `order_id=eq.${orderId}` },
        () => {
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch order items that are business_display
    const { data: orderItems, error } = await supabase
      .from("order_items")
      .select(`
        id,
        quantity,
        product:products(id, name, type, image_url)
      `)
      .eq("order_id", orderId!);

    if (error) {
      toast({ title: "Erro ao carregar pedido", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Filter only business_display items
    const displayItems = (orderItems || []).filter(
      (item: any) => item.product?.type === "business_display",
    );

    if (displayItems.length === 0) {
      toast({ title: "Nenhum display encontrado neste pedido", variant: "destructive" });
      navigate("/meus-pedidos");
      return;
    }

    // Fetch all display_arts for this order
    const { data: arts } = await supabase
      .from("display_arts")
      .select("id, locked, company_name, logo_url, template_id, order_item_id")
      .eq("order_id", orderId!);

    const artsData: DisplayArt[] = (arts || []) as DisplayArt[];

    // Build items with their associated arts
    const enrichedItems: DisplayOrderItem[] = displayItems.map((item: any) => {
      const itemArts = artsData.filter((a) => a.order_item_id === item.id);
      return {
        id: item.id,
        quantity: item.quantity,
        product: item.product,
        arts: itemArts,
      };
    });

    setItems(enrichedItems);
    setLoading(false);
  };

  const handleCustomize = async (item: DisplayOrderItem, artIndex: number) => {
    const existingArt = item.arts[artIndex];

    if (existingArt) {
      navigate(`/personalizar-display/${existingArt.id}`);
      return;
    }

    // Create a new display_art for this item slot
    setCreatingArt(`${item.id}-${artIndex}`);
    const { data: newArt, error } = await supabase
      .from("display_arts")
      .insert({
        order_id: orderId!,
        order_item_id: item.id,
        user_id: user!.id,
      })
      .select()
      .single();

    setCreatingArt(null);

    if (error || !newArt) {
      toast({ title: "Erro ao criar personalização", description: error?.message, variant: "destructive" });
      return;
    }

    navigate(`/personalizar-display/${newArt.id}`);
  };

  const allFinalized =
    items.length > 0 &&
    items.every((item) => {
      const totalArts = item.quantity;
      const finalizedArts = item.arts.filter((a) => a.locked).length;
      return finalizedArts >= totalArts;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/meus-pedidos")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Personalizar Displays</h1>
            <p className="text-muted-foreground text-sm">
              Personalize cada display do seu pedido individualmente
            </p>
          </div>
        </div>

        {allFinalized && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="text-green-400 font-semibold text-sm">Todas as artes finalizadas!</p>
              <p className="text-muted-foreground text-xs">Seu pedido está sendo encaminhado para produção.</p>
            </div>
          </motion.div>
        )}

        <div className="space-y-4">
          {items.map((item) =>
            Array.from({ length: item.quantity }).map((_, artIndex) => {
              const art = item.arts[artIndex] ?? null;
              const isCreating = creatingArt === `${item.id}-${artIndex}`;
              const label =
                item.quantity > 1
                  ? `${item.product?.name || "Display"} — Unidade ${artIndex + 1}`
                  : item.product?.name || "Display Empresarial";

              return (
                <motion.div
                  key={`${item.id}-${artIndex}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: artIndex * 0.08 }}
                >
                  <Card className="glass-card">
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Icon / thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {item.product?.image_url ? (
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Monitor className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{label}</p>
                        <div className="mt-1">
                          <ArtStatusBadge art={art} />
                        </div>
                        {art && !art.locked && art.company_name && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            Empresa: {art.company_name}
                          </p>
                        )}
                      </div>

                      {/* Action */}
                      <Button
                        size="sm"
                        variant={art?.locked ? "outline" : "default"}
                        disabled={isCreating}
                        onClick={() => handleCustomize(item, artIndex)}
                        className={
                          art?.locked
                            ? "border-green-500/50 text-green-400 hover:bg-green-500/10"
                            : ""
                        }
                      >
                        {isCreating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : art?.locked ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Ver Arte
                          </>
                        ) : (
                          <>
                            <Paintbrush className="w-4 h-4 mr-2" />
                            {art ? "Continuar" : "Personalizar"}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            }),
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <Button variant="ghost" onClick={() => navigate("/meus-pedidos")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Pedidos
          </Button>
        </div>
      </div>
    </div>
  );
}
