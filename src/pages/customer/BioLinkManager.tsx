import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Globe,
  ArrowLeft,
  Eye,
  Edit2,
  Save,
  X,
  ExternalLink,
  Clock,
  Palette,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/bio/ImageUpload";
import DisplayTemplateSelector from "@/components/display/DisplayTemplateSelector";

interface BioButton {
  id: string;
  label: string;
  url: string;
  type: string;
}

interface BioPage {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  is_active: boolean | null;
  profile_photo_url: string | null;
  theme: Record<string, unknown> | null;
  buttons: BioButton[];
  display_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface BioStats {
  views: number;
  lastView: string | null;
}

const ICON_OPTIONS = [
  { id: "link", label: "Link" },
  { id: "instagram", label: "Instagram" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "phone", label: "Telefone" },
  { id: "email", label: "Email" },
  { id: "website", label: "Website" },
  { id: "facebook", label: "Facebook" },
  { id: "youtube", label: "YouTube" },
];

const themeColors = ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16"];

export default function BioLinkManager() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [bioPage, setBioPage] = useState<BioPage | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<BioStats>({ views: 0, lastView: null });

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    slug: "",
    profile_photo_url: "",
    theme_color: "#10b981",
    buttons: [] as BioButton[],
  });

  useEffect(() => {
    if (user && id) {
      fetchBioPage();
    }
  }, [user, id]);

  const fetchBioPage = async () => {
    setLoading(true);

    const [bioRes, analyticsRes] = await Promise.all([
      supabase
        .from("bio_pages")
        .select("*")
        .eq("id", id!)
        .single(),
      supabase
        .from("bio_page_analytics")
        .select("created_at")
        .eq("bio_page_id", id!)
        .eq("event_type", "page_view")
        .order("created_at", { ascending: false }),
    ]);

    if (bioRes.error || !bioRes.data) {
      toast({ title: "Erro", description: "Bio page não encontrada.", variant: "destructive" });
      navigate("/dashboard/produtos");
      return;
    }

    const data = bioRes.data;
    const parsedButtons: BioButton[] = Array.isArray(data.buttons)
      ? (data.buttons as unknown[]).map((btn: unknown) => {
          const b = btn as Record<string, unknown>;
          return {
            id: String(b.id || crypto.randomUUID()),
            label: String(b.label || ""),
            url: String(b.url || ""),
            type: String(b.type || "link"),
          };
        })
      : [];

    const theme = data.theme as Record<string, unknown> | null;
    const primaryColor = theme?.primaryColor as string | undefined;
    // Convert HSL string to hex-ish display or just use as-is
    const themeColor = primaryColor ? `hsl(${primaryColor})` : "#10b981";

    const page: BioPage = {
      ...data,
      theme: theme,
      buttons: parsedButtons,
    };

    setBioPage(page);
    setFormData({
      title: data.title || "",
      subtitle: data.subtitle || "",
      slug: data.slug || "",
      profile_photo_url: data.profile_photo_url || "",
      theme_color: themeColor,
      buttons: parsedButtons,
    });

    // Stats
    const analytics = analyticsRes.data || [];
    setStats({
      views: analytics.length,
      lastView: analytics.length > 0 ? analytics[0].created_at : null,
    });

    setLoading(false);
  };

  const handleSave = async () => {
    if (!bioPage || !user) return;
    setSaving(true);

    const updateData = {
      title: formData.title.trim() || "Minha Bio",
      subtitle: formData.subtitle.trim() || null,
      slug: formData.slug.trim(),
      profile_photo_url: formData.profile_photo_url.trim() || null,
      buttons: formData.buttons.map((btn) => ({
        id: btn.id,
        label: btn.label,
        url: btn.url,
        type: btn.type,
      })),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("bio_pages")
      .update(updateData)
      .eq("id", bioPage.id)
      .select();

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else if (data && data.length > 0) {
      toast({ title: "Bio atualizada!", description: "As informações foram salvas com sucesso." });
      setEditMode(false);
      fetchBioPage();
    }

    setSaving(false);
  };

  const handlePhotoUpload = (url: string) => {
    setFormData((prev) => ({ ...prev, profile_photo_url: url }));
  };

  const handlePhotoRemove = () => {
    setFormData((prev) => ({ ...prev, profile_photo_url: "" }));
  };

  const handleAddButton = () => {
    const newButton: BioButton = {
      id: crypto.randomUUID(),
      label: "Novo Botão",
      url: "",
      type: "link",
    };
    setFormData((prev) => ({ ...prev, buttons: [...prev.buttons, newButton] }));
  };

  const handleUpdateButton = (btnId: string, updates: Partial<BioButton>) => {
    setFormData((prev) => ({
      ...prev,
      buttons: prev.buttons.map((btn) => (btn.id === btnId ? { ...btn, ...updates } : btn)),
    }));
  };

  const handleRemoveButton = (btnId: string) => {
    setFormData((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((btn) => btn.id !== btnId),
    }));
  };

  // Create a virtual display for template activation (Option A)
  const ensureDisplayForTemplates = async (): Promise<string | null> => {
    if (!bioPage || !user) return null;

    // If already has a display_id, use it
    if (bioPage.display_id) return bioPage.display_id;

    // Create a virtual business_display
    const { data, error } = await supabase
      .from("business_displays")
      .insert({
        user_id: user.id,
        business_name: bioPage.title,
        description: bioPage.subtitle,
        is_activated: true,
        theme_color: "#10b981",
      })
      .select("id")
      .single();

    if (error || !data) {
      toast({ title: "Erro", description: "Não foi possível preparar o template.", variant: "destructive" });
      return null;
    }

    // Link the bio page to this virtual display
    await supabase
      .from("bio_pages")
      .update({ display_id: data.id })
      .eq("id", bioPage.id);

    setBioPage((prev) => prev ? { ...prev, display_id: data.id } : prev);
    return data.id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!bioPage) return null;

  const displayId = bioPage.display_id;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/produtos")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Gerenciar Link Bio</h1>
                <p className="text-xs text-muted-foreground">/{bioPage.slug}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(`/bio/${bioPage.slug}`, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Página
            </Button>
            {editMode ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
                  <X className="w-4 h-4" />
                </Button>
                <Button variant="hero" size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl overflow-hidden"
        >
          {/* Hero with photo */}
          <div
            className="relative h-48"
            style={{
              background: `linear-gradient(135deg, ${formData.theme_color}40, ${formData.theme_color}10)`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {formData.profile_photo_url ? (
                <img
                  src={formData.profile_photo_url}
                  alt={formData.title}
                  className="w-28 h-28 rounded-full object-cover border-4 border-background shadow-xl"
                />
              ) : (
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center border-4 border-background shadow-xl"
                  style={{ backgroundColor: `${formData.theme_color}30` }}
                >
                  <Globe className="w-14 h-14" style={{ color: formData.theme_color }} />
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <Eye className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                <p className="text-2xl font-bold text-foreground">{stats.views}</p>
                <p className="text-xs text-muted-foreground">Visualizações</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <Clock className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                <p className="text-sm font-medium text-foreground">
                  {stats.lastView
                    ? new Date(stats.lastView).toLocaleDateString("pt-BR")
                    : "-"}
                </p>
                <p className="text-xs text-muted-foreground">Última visualização</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <Link2 className="w-5 h-5 mx-auto mb-1 text-orange-400" />
                <p className="text-2xl font-bold text-foreground">{formData.buttons.length}</p>
                <p className="text-xs text-muted-foreground">Botões</p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {editMode && user && (
                <div>
                  <Label>Foto de Perfil</Label>
                  <ImageUpload
                    userId={user.id}
                    currentUrl={formData.profile_photo_url || null}
                    onUpload={handlePhotoUpload}
                    onRemove={handlePhotoRemove}
                    type="profile"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  disabled={!editMode}
                  placeholder="Ex: Meu Link Bio"
                />
              </div>

              <div>
                <Label htmlFor="subtitle">Subtítulo / Descrição</Label>
                <Textarea
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                  disabled={!editMode}
                  placeholder="Breve descrição"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  disabled={!editMode}
                  placeholder="meu-link"
                />
                {formData.slug && (
                  <p className="text-xs text-muted-foreground mt-1">
                    URL: {window.location.origin}/bio/{formData.slug}
                  </p>
                )}
              </div>

              {/* Theme Color */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Palette className="w-4 h-4" />
                  Cor do Tema
                </Label>
                {editMode ? (
                  <div className="flex gap-2 flex-wrap">
                    {themeColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData((prev) => ({ ...prev, theme_color: color }))}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          formData.theme_color === color
                            ? "ring-2 ring-offset-2 ring-offset-background scale-110"
                            : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full" style={{ backgroundColor: formData.theme_color }} />
                )}
              </div>

              {/* Buttons Section */}
              <div className="p-4 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center justify-between mb-4">
                  <Label className="flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Botões / Links
                  </Label>
                  {editMode && (
                    <Button variant="outline" size="sm" onClick={handleAddButton}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </div>

                {formData.buttons.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum botão configurado</p>
                ) : (
                  <div className="space-y-3">
                    {formData.buttons.map((button) => (
                      <div key={button.id} className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                        <select
                          value={button.type}
                          onChange={(e) => handleUpdateButton(button.id, { type: e.target.value })}
                          disabled={!editMode}
                          className="w-24 p-2 rounded bg-muted/50 text-sm"
                        >
                          {ICON_OPTIONS.map((icon) => (
                            <option key={icon.id} value={icon.id}>
                              {icon.label}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={button.label}
                          onChange={(e) => handleUpdateButton(button.id, { label: e.target.value })}
                          disabled={!editMode}
                          placeholder="Label"
                          className="flex-1"
                        />
                        <Input
                          value={button.url}
                          onChange={(e) => handleUpdateButton(button.id, { url: e.target.value })}
                          disabled={!editMode}
                          placeholder="URL"
                          className="flex-1"
                        />
                        {editMode && (
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveButton(button.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Templates Premium */}
              {user && displayId ? (
                <DisplayTemplateSelector
                  displayId={displayId}
                  userId={user.id}
                  onTemplateChange={() => fetchBioPage()}
                />
              ) : user ? (
                <div className="p-4 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">Templates Premium</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ative um template premium para personalizar o layout da sua bio page.
                      </p>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={async () => {
                        const newDisplayId = await ensureDisplayForTemplates();
                        if (newDisplayId) {
                          fetchBioPage();
                        }
                      }}
                    >
                      Ver Templates
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Link to Bio Editor */}
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <p className="text-sm text-muted-foreground mb-2">
                  Para uma página mais completa com galeria e temas personalizados:
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/dashboard/bio/${bioPage.id}`)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Personalizar (TEMPLATE PADRÃO)
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
