import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import NetflixTemplate from "@/components/display/NetflixTemplate";
import TemplateMediaEditor from "@/components/display/TemplateMediaEditor";
import {
  ArrowLeft, Check, Crown, Eye, Palette, Save, ShoppingCart,
  Sparkles, Loader2, Lock
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

interface TemplateConfig {
  hero?: {
    type: "video" | "image" | "carousel" | "youtube";
    items: { url: string; title?: string; type?: "image" | "video" | "instagram" }[];
    youtubeId?: string;
  };
  covers?: { url: string; title?: string; type?: "image" | "video" | "instagram" }[];
  thumbnails?: { url: string; title?: string; type?: "image" | "video" | "instagram" }[];
  sections?: { title: string; itemIndexes: number[] }[];
}

export default function DisplayTemplateManager() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const displayId = searchParams.get("display");
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<DisplayTemplate[]>([]);
  const [ownedTemplateIds, setOwnedTemplateIds] = useState<Set<string>>(new Set());
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>({});
  const [displayData, setDisplayData] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [tab, setTab] = useState<"browse" | "edit">("browse");

  useEffect(() => {
    if (user && displayId) fetchAll();
  }, [user, displayId]);

  const fetchAll = async () => {
    setLoading(true);

    // Fetch display
    const { data: display } = await supabase
      .from("business_displays")
      .select("*")
      .eq("id", displayId!)
      .single();

    if (display) {
      setDisplayData(display);
      setActiveTemplateId(display.active_template_id || null);
      setTemplateConfig((display.template_config as unknown as TemplateConfig) || {});
    }

    // Fetch available templates
    const { data: tpls } = await supabase
      .from("display_templates")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (tpls) {
      setTemplates(tpls.map(t => ({
        ...t,
        features: Array.isArray(t.features) ? (t.features as unknown as string[]) : [],
      })));
    }

    // Fetch owned templates
    if (user) {
      const { data: owned } = await supabase
        .from("user_templates")
        .select("template_id")
        .eq("user_id", user.id);

      if (owned) {
        setOwnedTemplateIds(new Set(owned.map(o => o.template_id)));
      }
    }

    setLoading(false);
  };

  const handleActivateTemplate = async (templateId: string) => {
    if (!displayId) return;

    const { error } = await supabase
      .from("business_displays")
      .update({ active_template_id: templateId })
      .eq("id", displayId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setActiveTemplateId(templateId);
      setTab("edit");
      toast({ title: "Template ativado!", description: "Agora personalize o conteúdo." });
    }
  };

  const handleDeactivateTemplate = async () => {
    if (!displayId) return;

    const { error } = await supabase
      .from("business_displays")
      .update({ active_template_id: null, template_config: {} })
      .eq("id", displayId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setActiveTemplateId(null);
      setTemplateConfig({});
      setTab("browse");
      toast({ title: "Template desativado", description: "Seu display voltou ao layout padrão." });
    }
  };

  const handlePurchaseTemplate = async (template: DisplayTemplate) => {
    if (!user || !displayId) return;

    // For free templates, just add to owned
    if (template.price === 0) {
      const { error } = await supabase
        .from("user_templates")
        .insert({ user_id: user.id, template_id: template.id });

      if (!error) {
        setOwnedTemplateIds(prev => new Set([...prev, template.id]));
        toast({ title: "Template adquirido!", description: "Agora você pode ativá-lo." });
      }
      return;
    }

    // For paid templates, redirect to checkout with template as product
    navigate(`/loja/checkout?template_id=${template.id}&display_id=${displayId}`);
  };

  const handleSaveConfig = async () => {
    if (!displayId) return;
    setSaving(true);

    const { error } = await supabase
      .from("business_displays")
      .update({ template_config: templateConfig as any })
      .eq("id", displayId);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Conteúdo salvo!", description: "As alterações já estão visíveis no seu link." });
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64" />)}
          </div>
        </div>
      </div>
    );
  }

  // Full-screen preview
  if (previewMode && displayData) {
    return (
      <div className="relative">
        <div className="fixed top-4 right-4 z-[60] flex gap-2">
          <Button variant="glass" onClick={() => setPreviewMode(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Editor
          </Button>
        </div>
        <NetflixTemplate
          businessName={displayData.business_name || "Meu Negócio"}
          description={displayData.description}
          logoUrl={displayData.logo_url}
          themeColor={displayData.theme_color || "#e50914"}
          config={templateConfig}
        />
      </div>
    );
  }

  const activeTemplate = templates.find(t => t.id === activeTemplateId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/displays")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Templates Premium
              </h1>
              <p className="text-xs text-muted-foreground">
                {displayData?.business_name || "Display"} • Modo Avançado
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTemplateId && (
              <>
                <Button variant="outline" size="sm" onClick={() => setPreviewMode(true)}>
                  <Eye className="w-4 h-4 mr-1.5" /> Preview
                </Button>
                <Button variant="glow" size="sm" onClick={handleSaveConfig} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Salvar
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={tab === "browse" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("browse")}
          >
            <Sparkles className="w-4 h-4 mr-1.5" /> Explorar Templates
          </Button>
          {activeTemplateId && (
            <Button
              variant={tab === "edit" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("edit")}
            >
              <Palette className="w-4 h-4 mr-1.5" /> Editar Conteúdo
            </Button>
          )}
        </div>

        {tab === "browse" ? (
          <div className="space-y-6">
            {/* Active Template Banner */}
            {activeTemplate && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Template ativo: {activeTemplate.name}</p>
                      <p className="text-xs text-muted-foreground">Seu display está usando este template</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setTab("edit")}>
                      Editar Conteúdo
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDeactivateTemplate}>
                      Desativar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => {
                const isOwned = ownedTemplateIds.has(template.id);
                const isActive = activeTemplateId === template.id;

                return (
                  <motion.div key={template.id} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                    <Card className={`overflow-hidden h-full ${isActive ? "ring-2 ring-primary" : ""}`}>
                      {/* Template Preview */}
                      <div className="aspect-video bg-gradient-to-br from-gray-900 to-black relative overflow-hidden">
                        {template.preview_url ? (
                          <img src={template.preview_url} alt={template.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <Crown className="w-10 h-10 mx-auto text-red-500 mb-2" />
                              <span className="text-white/60 text-sm font-medium">{template.template_key.toUpperCase()}</span>
                            </div>
                          </div>
                        )}
                        {isActive && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-primary text-primary-foreground">Ativo</Badge>
                          </div>
                        )}
                        {!isOwned && template.price > 0 && (
                          <div className="absolute top-2 left-2">
                            <Badge variant="secondary" className="gap-1">
                              <Lock className="w-3 h-3" /> Premium
                            </Badge>
                          </div>
                        )}
                      </div>

                      <CardContent className="p-4 space-y-3">
                        <div>
                          <h3 className="font-bold text-foreground">{template.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                        </div>

                        {/* Features */}
                        {template.features.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {template.features.slice(0, 3).map((f, i) => (
                              <Badge key={i} variant="outline" className="text-[10px]">{f}</Badge>
                            ))}
                          </div>
                        )}

                        {/* Price & Action */}
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="text-lg font-bold text-foreground">
                            {template.price === 0 ? "Grátis" : `R$ ${template.price.toFixed(2).replace(".", ",")}`}
                          </span>

                          {isActive ? (
                            <Button size="sm" variant="outline" disabled>
                              <Check className="w-4 h-4 mr-1" /> Ativo
                            </Button>
                          ) : isOwned ? (
                            <Button size="sm" variant="glow" onClick={() => handleActivateTemplate(template.id)}>
                              <Sparkles className="w-4 h-4 mr-1" /> Ativar
                            </Button>
                          ) : (
                            <Button size="sm" variant="hero" onClick={() => handlePurchaseTemplate(template)}>
                              <ShoppingCart className="w-4 h-4 mr-1" />
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
        ) : (
          /* Edit Tab - Media Editor */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <TemplateMediaEditor
                displayId={displayId!}
                userId={user!.id}
                config={templateConfig}
                onChange={setTemplateConfig}
              />
            </div>

            {/* Live Preview (small) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground">PREVIEW AO VIVO</h3>
                <Button variant="outline" size="sm" onClick={() => setPreviewMode(true)}>
                  <Eye className="w-4 h-4 mr-1" /> Tela Cheia
                </Button>
              </div>
              <div className="rounded-xl overflow-hidden border border-border aspect-[9/16] max-h-[600px]">
                <div className="w-full h-full overflow-y-auto transform scale-[0.45] origin-top-left" style={{ width: "222%", height: "222%" }}>
                  <NetflixTemplate
                    businessName={displayData?.business_name || "Meu Negócio"}
                    description={displayData?.description}
                    logoUrl={displayData?.logo_url}
                    themeColor={displayData?.theme_color || "#e50914"}
                    config={templateConfig}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
