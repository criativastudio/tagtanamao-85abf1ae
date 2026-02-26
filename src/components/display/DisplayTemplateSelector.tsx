import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check, Crown, Lock, Palette, ShoppingCart, Sparkles, Loader2,
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

interface DisplayTemplateSelectorProps {
  displayId: string;
  userId: string;
  onTemplateChange?: () => void;
}

export default function DisplayTemplateSelector({
  displayId,
  userId,
  onTemplateChange,
}: DisplayTemplateSelectorProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<DisplayTemplate[]>([]);
  const [ownedTemplateIds, setOwnedTemplateIds] = useState<Set<string>>(new Set());
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [displayId, userId]);

  const fetchData = async () => {
    setLoading(true);

    const [templatesRes, ownedRes, displayRes] = await Promise.all([
      supabase
        .from("display_templates")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true }),
      supabase
        .from("user_templates")
        .select("template_id")
        .eq("user_id", userId),
      supabase
        .from("business_displays")
        .select("active_template_id")
        .eq("id", displayId)
        .single(),
    ]);

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

    if (displayRes.data) {
      setActiveTemplateId(displayRes.data.active_template_id || null);
    }

    setLoading(false);
  };

  const handleActivate = async (templateId: string) => {
    setActivating(templateId);

    const { error } = await supabase
      .from("business_displays")
      .update({ active_template_id: templateId })
      .eq("id", displayId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setActiveTemplateId(templateId);
      toast({ title: "Template ativado!", description: "Agora personalize o conteúdo." });
      onTemplateChange?.();
    }

    setActivating(null);
  };

  const handleDeactivate = async () => {
    setActivating("deactivate");

    const { error } = await supabase
      .from("business_displays")
      .update({ active_template_id: null, template_config: {} })
      .eq("id", displayId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setActiveTemplateId(null);
      toast({ title: "Template desativado", description: "Display voltou ao layout padrão." });
      onTemplateChange?.();
    }

    setActivating(null);
  };

  const handlePurchase = (template: DisplayTemplate) => {
    navigate(`/loja/checkout?template_id=${template.id}`);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (templates.length === 0) return null;

  const activeTemplate = templates.find((t) => t.id === activeTemplateId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Crown className="w-4 h-4 text-primary" />
          Templates Premium
        </h3>
        {activeTemplate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(`/dashboard/displays/templates?display=${displayId}`)
            }
          >
            <Palette className="w-4 h-4 mr-1.5" />
            Editar Conteúdo
          </Button>
        )}
      </div>

      {/* Active template banner */}
      {activeTemplate && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              Ativo: {activeTemplate.name}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeactivate}
            disabled={activating === "deactivate"}
          >
            {activating === "deactivate" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Desativar"
            )}
          </Button>
        </div>
      )}

      {/* Templates grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {templates.map((template) => {
          const isOwned = ownedTemplateIds.has(template.id);
          const isActive = activeTemplateId === template.id;
          const isLoading = activating === template.id;

          return (
            <motion.div
              key={template.id}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
            >
              <Card
                className={`overflow-hidden h-full ${
                  isActive ? "ring-2 ring-primary" : ""
                }`}
              >
                {/* Preview */}
                <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
                  {template.preview_url ? (
                    <img
                      src={template.preview_url}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Crown className="w-8 h-8 text-primary/60" />
                    </div>
                  )}
                  {isActive && (
                    <Badge className="absolute top-1.5 right-1.5 text-[10px]">
                      Ativo
                    </Badge>
                  )}
                  {!isOwned && template.price > 0 && (
                    <Badge
                      variant="secondary"
                      className="absolute top-1.5 left-1.5 gap-1 text-[10px]"
                    >
                      <Lock className="w-2.5 h-2.5" /> Premium
                    </Badge>
                  )}
                </div>

                <CardContent className="p-3 space-y-2">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">
                      {template.name}
                    </h4>
                    {template.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {template.description}
                      </p>
                    )}
                  </div>

                  {template.features.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.features.slice(0, 2).map((f, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[9px] px-1.5 py-0"
                        >
                          {f}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1.5 border-t border-border">
                    <span className="text-sm font-bold text-foreground">
                      {template.price === 0
                        ? "Grátis"
                        : `R$ ${template.price
                            .toFixed(2)
                            .replace(".", ",")}`}
                    </span>

                    {isActive ? (
                      <Button size="sm" variant="outline" disabled className="h-7 text-xs">
                        <Check className="w-3 h-3 mr-1" /> Ativo
                      </Button>
                    ) : isOwned ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                        onClick={() => handleActivate(template.id)}
                        disabled={!!activating}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Sparkles className="w-3 h-3 mr-1" />
                        )}
                        Ativar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                        onClick={() => handlePurchase(template)}
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        {template.price === 0 ? "Adquirir" : "Comprar"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
