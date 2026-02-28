import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Monitor, Power, PowerOff, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface DisplayTemplate {
  id: string;
  name: string;
  description: string | null;
  template_key: string;
  price: number;
  preview_url: string | null;
  is_active: boolean | null;
  show_on_landing: boolean;
  features: string[] | null;
  created_at: string;
}

interface BusinessDisplay {
  id: string;
  qr_code: string;
  business_name: string | null;
  active_template_id: string | null;
  is_activated: boolean | null;
}

const emptyForm = {
  name: "",
  description: "",
  template_key: "",
  price: 0,
  preview_url: "",
  is_active: true,
  features: [] as string[],
};

export default function DisplayTemplatesManager() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<DisplayTemplate[]>([]);
  const [displays, setDisplays] = useState<BusinessDisplay[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [featureInput, setFeatureInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Activation state
  const [selectedDisplayId, setSelectedDisplayId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (!loading && profile && !profile.is_admin) {
      navigate("/dashboard");
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingData(true);
    const [templatesRes, displaysRes] = await Promise.all([
      supabase.from("display_templates").select("*").order("created_at", { ascending: false }),
      supabase.from("business_displays").select("id, qr_code, business_name, active_template_id, is_activated"),
    ]);

    if (templatesRes.data) {
      setTemplates(templatesRes.data.map(t => ({
        ...t,
        features: Array.isArray(t.features) ? t.features as string[] : [],
      })));
    }
    if (displaysRes.data) setDisplays(displaysRes.data);
    setLoadingData(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFeatureInput("");
    setDialogOpen(true);
  };

  const openEdit = (t: DisplayTemplate) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      description: t.description || "",
      template_key: t.template_key,
      price: t.price,
      preview_url: t.preview_url || "",
      is_active: t.is_active ?? true,
      features: t.features || [],
    });
    setFeatureInput("");
    setDialogOpen(true);
  };

  const addFeature = () => {
    if (!featureInput.trim()) return;
    setForm(f => ({ ...f, features: [...f.features, featureInput.trim()] }));
    setFeatureInput("");
  };

  const removeFeature = (idx: number) => {
    setForm(f => ({ ...f, features: f.features.filter((_, i) => i !== idx) }));
  };

  const saveTemplate = async () => {
    if (!form.name || !form.template_key) {
      toast({ title: "Preencha nome e template_key", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      template_key: form.template_key,
      price: form.price,
      preview_url: form.preview_url || null,
      is_active: form.is_active,
      features: form.features,
    };

    if (editingId) {
      const { error } = await supabase.from("display_templates").update(payload).eq("id", editingId);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Template atualizado!" });
      }
    } else {
      const { error } = await supabase.from("display_templates").insert(payload);
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Template criado!" });
      }
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const toggleActive = async (id: string, current: boolean | null) => {
    await supabase.from("display_templates").update({ is_active: !(current ?? true) }).eq("id", id);
    fetchData();
  };

  const toggleShowOnLanding = async (id: string, current: boolean) => {
    await supabase.from("display_templates").update({ show_on_landing: !current } as any).eq("id", id);
    fetchData();
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("display_templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template excluído" });
      fetchData();
    }
  };

  const activateOnDisplay = async () => {
    if (!selectedDisplayId || !selectedTemplateId) {
      toast({ title: "Selecione display e template", variant: "destructive" });
      return;
    }
    setActivating(true);
    const { error } = await supabase
      .from("business_displays")
      .update({ active_template_id: selectedTemplateId })
      .eq("id", selectedDisplayId);

    if (error) {
      toast({ title: "Erro ao ativar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template ativado no display!" });
      setSelectedDisplayId("");
      setSelectedTemplateId("");
      fetchData();
    }
    setActivating(false);
  };

  const deactivateDisplay = async (displayId: string) => {
    const { error } = await supabase
      .from("business_displays")
      .update({ active_template_id: null, template_config: {} })
      .eq("id", displayId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template desativado do display" });
      fetchData();
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile?.is_admin) return null;

  const displaysWithTemplate = displays.filter(d => d.active_template_id);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Templates de Display</h1>
          <p className="text-sm text-muted-foreground">Gerencie templates (Netflix e futuros) e ative em displays</p>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Templates disponíveis</h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Novo Template
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {templates.map(t => (
          <Card key={t.id} className={`relative ${!(t.is_active ?? true) ? "opacity-60" : ""}`}>
            {t.preview_url && (
              <img src={t.preview_url} alt={t.name} className="w-full h-32 object-cover rounded-t-lg" />
            )}
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={t.show_on_landing}
                      onCheckedChange={() => toggleShowOnLanding(t.id, t.show_on_landing)}
                    />
                    <span className="text-xs text-muted-foreground">Landing</span>
                  </div>
                  <Switch
                    checked={t.is_active ?? true}
                    onCheckedChange={() => toggleActive(t.id, t.is_active)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Key: {t.template_key} · R$ {t.price.toFixed(2)}</p>
            </CardHeader>
            <CardContent className="pt-0">
              {t.description && <p className="text-sm text-muted-foreground mb-2">{t.description}</p>}
              {t.features && t.features.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-0.5 mb-3">
                  {t.features.map((f, i) => <li key={i}>• {f}</li>)}
                </ul>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                  <Pencil className="w-3 h-3 mr-1" /> Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="w-3 h-3 mr-1" /> Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir template?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O template "{t.name}" será removido permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteTemplate(t.id)}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">Nenhum template cadastrado.</p>
        )}
      </div>

      {/* Activate on Display Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Power className="w-5 h-5 text-primary" />
            Ativar template em um display
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label>Display</Label>
              <Select value={selectedDisplayId} onValueChange={setSelectedDisplayId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione um display" />
                </SelectTrigger>
                <SelectContent>
                  {displays.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.business_name || "Sem nome"} ({d.qr_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.is_active).map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.template_key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={activateOnDisplay} disabled={activating || !selectedDisplayId || !selectedTemplateId}>
              <Power className="w-4 h-4 mr-1" /> Ativar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Displays with active templates */}
      {displaysWithTemplate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              Displays com template ativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {displaysWithTemplate.map(d => {
                const tmpl = templates.find(t => t.id === d.active_template_id);
                return (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <span className="font-medium text-foreground">{d.business_name || "Sem nome"}</span>
                      <span className="text-muted-foreground text-sm ml-2">({d.qr_code})</span>
                      {tmpl && <span className="text-primary text-sm ml-2">→ {tmpl.name}</span>}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => deactivateDisplay(d.id)}>
                      <PowerOff className="w-3 h-3 mr-1" /> Desativar
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Template" : "Novo Template"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Atualize os dados do template." : "Preencha os dados para criar um novo template de display."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Template Key *</Label>
              <Input value={form.template_key} onChange={e => setForm(f => ({ ...f, template_key: e.target.value }))} className="mt-1" placeholder="ex: netflix" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} className="mt-1" />
            </div>
            <div>
              <Label>Preview URL</Label>
              <Input value={form.preview_url} onChange={e => setForm(f => ({ ...f, preview_url: e.target.value }))} className="mt-1" placeholder="URL da imagem de preview" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Ativo</Label>
            </div>
            <div>
              <Label>Features</Label>
              <div className="flex gap-2 mt-1">
                <Input value={featureInput} onChange={e => setFeatureInput(e.target.value)} placeholder="Adicionar feature" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addFeature())} />
                <Button type="button" size="sm" onClick={addFeature}>+</Button>
              </div>
              <ul className="mt-2 space-y-1">
                {form.features.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-sm bg-muted/50 px-2 py-1 rounded">
                    <span>{f}</span>
                    <button onClick={() => removeFeature(i)} className="text-destructive hover:text-destructive/80 text-xs">✕</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveTemplate} disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
