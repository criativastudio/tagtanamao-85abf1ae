import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Crown, Lock, ShoppingCart, Sparkles, Check, Percent,
} from "lucide-react";

interface DisplayTemplate {
  id: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  price: number;
  template_key: string;
  features: string[];
}

interface DashboardTemplatesProps {
  userId: string;
}

const ORDER_BUMP_DISCOUNT = 0.4; // 40% off for display owners

export default function DashboardTemplates({ userId }: DashboardTemplatesProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<DisplayTemplate[]>([]);
  const [ownedTemplateIds, setOwnedTemplateIds] = useState<Set<string>>(new Set());
  const [hasDisplay, setHasDisplay] = useState(false);
  const [displayId, setDisplayId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);

    const [displaysRes, templatesRes, ownedRes] = await Promise.all([
      supabase
        .from("business_displays")
        .select("id")
        .eq("user_id", userId)
        .eq("is_activated", true)
        .limit(1),
      supabase
        .from("display_templates")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true }),
      supabase
        .from("user_templates")
        .select("template_id")
        .eq("user_id", userId),
    ]);

    if (displaysRes.data && displaysRes.data.length > 0) {
      setHasDisplay(true);
      setDisplayId(displaysRes.data[0].id);
    }

    if (templatesRes.data) {
      setTemplates(
        templatesRes.data.map((t) => ({
          ...t,
          features: Array.isArray(t.features)
            ? (t.features as unknown as string[])
            : [],
        }))
      );
    }

    if (ownedRes.data) {
      setOwnedTemplateIds(new Set(ownedRes.data.map((o) => o.template_id)));
    }

    setLoading(false);
  };

  const getDiscountedPrice = (price: number) =>
    Math.round(price * (1 - ORDER_BUMP_DISCOUNT) * 100) / 100;

  const handleBuy = (template: DisplayTemplate) => {
    const params = new URLSearchParams();
    params.set("template_id", template.id);
    if (displayId) params.set("display_id", displayId);
    if (hasDisplay) params.set("order_bump", "true");
    navigate(`/loja/checkout?${params.toString()}`);
  };

  const handleActivate = (templateId: string) => {
    if (displayId) {
      navigate(`/dashboard/displays/templates?display=${displayId}`);
    }
  };

  // Don't render if no paid templates available
  const paidTemplates = templates.filter((t) => t.price > 0);
  if (!loading && paidTemplates.length === 0) return null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            Templates Premium
          </h2>
          {hasDisplay && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Percent className="w-3 h-3" />
              Desconto especial
            </Badge>
          )}
        </div>
      </div>

      {hasDisplay && (
        <p className="text-sm text-muted-foreground -mt-2">
          Como você já possui um Display Empresarial, aproveite preços exclusivos com até{" "}
          <span className="text-primary font-semibold">
            {Math.round(ORDER_BUMP_DISCOUNT * 100)}% de desconto
          </span>
          !
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paidTemplates.map((template) => {
          const isOwned = ownedTemplateIds.has(template.id);
          const discountedPrice = getDiscountedPrice(template.price);

          return (
            <motion.div
              key={template.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="overflow-hidden h-full relative">
                {/* Preview */}
                <div className="aspect-video bg-gradient-to-br from-muted to-background relative overflow-hidden">
                  {template.preview_url ? (
                    <img
                      src={template.preview_url}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Crown className="w-10 h-10 text-primary/60" />
                    </div>
                  )}
                  {!isOwned && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="w-3 h-3" /> Premium
                      </Badge>
                    </div>
                  )}
                  {hasDisplay && !isOwned && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-primary text-primary-foreground gap-1">
                        <Percent className="w-3 h-3" />
                        -{Math.round(ORDER_BUMP_DISCOUNT * 100)}%
                      </Badge>
                    </div>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-foreground">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {template.description}
                    </p>
                  </div>

                  {template.features.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {template.features.slice(0, 3).map((f, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Price & Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div>
                      {hasDisplay && !isOwned ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground line-through">
                            R$ {template.price.toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-lg font-bold text-primary">
                            R$ {discountedPrice.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-foreground">
                          R$ {template.price.toFixed(2).replace(".", ",")}
                        </span>
                      )}
                    </div>

                    {isOwned ? (
                      <Button
                        size="sm"
                        variant="glow"
                        onClick={() => handleActivate(template.id)}
                      >
                        <Sparkles className="w-4 h-4 mr-1" /> Usar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="hero"
                        onClick={() => handleBuy(template)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Comprar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
