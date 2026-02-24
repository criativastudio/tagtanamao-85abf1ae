import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, GripVertical, Video, ImageIcon, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SiteSection {
  id: string;
  title: string;
  section_type: "video" | "pet_slides";
  is_active: boolean;
  position: number;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const SECTION_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  video: { label: "Vídeo de Apresentação", icon: Video, description: "Vídeo grande em destaque" },
  pet_slides: {
    label: "Slides de Pets Encontrados",
    icon: ImageIcon,
    description: "Carrossel com fotos de pets encontrados via tag",
  },
};

export default function SiteSectionsManager() {
  const { toast } = useToast();
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // New section form
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<string>("video");
  const [newConfig, setNewConfig] = useState("");

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("site_sections").select("*").order("position", { ascending: true });

    if (error) {
      toast({ title: "Erro ao carregar seções", description: error.message, variant: "destructive" });
    } else {
      setSections((data as SiteSection[]) || []);
    }
    setLoading(false);
  };

  const createSection = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);

    let config = {};
    if (newConfig.trim()) {
      try {
        config = JSON.parse(newConfig);
      } catch {
        toast({ title: "JSON inválido no campo config", variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    const maxPosition = sections.length > 0 ? Math.max(...sections.map((s) => s.position)) + 1 : 0;

    const { error } = await supabase.from("site_sections").insert({
      title: newTitle.trim(),
      section_type: newType,
      position: maxPosition,
      config,
    });

    if (error) {
      toast({ title: "Erro ao criar seção", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Seção criada!" });
      setNewTitle("");
      setNewType("video");
      setNewConfig("");
      setShowCreateDialog(false);
      fetchSections();
    }
    setSaving(false);
  };

  const toggleActive = async (section: SiteSection) => {
    const { error } = await supabase
      .from("site_sections")
      .update({ is_active: !section.is_active })
      .eq("id", section.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, is_active: !s.is_active } : s)));
    }
  };

  const moveSection = async (sectionId: string, direction: "up" | "down") => {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sections.length) return;

    const updated = [...sections];
    const tempPos = updated[idx].position;
    updated[idx].position = updated[swapIdx].position;
    updated[swapIdx].position = tempPos;
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    setSections(updated);

    // Persist both position changes
    await Promise.all([
      supabase.from("site_sections").update({ position: updated[idx].position }).eq("id", updated[idx].id),
      supabase.from("site_sections").update({ position: updated[swapIdx].position }).eq("id", updated[swapIdx].id),
    ]);
  };

  const deleteSection = async (id: string) => {
    const { error } = await supabase.from("site_sections").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      setSections((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Seção excluída!" });
    }
  };

  return (
    <Card className="glass-card border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Seções do Site</CardTitle>
            <CardDescription>Gerencie as seções dinâmicas da landing page</CardDescription>
          </div>
          <Button variant="hero" size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Seção
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Carregando seções...</p>
          </div>
        ) : sections.length === 0 ? (
          <div className="p-8 text-center rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground">Nenhuma seção criada ainda.</p>
          </div>
        ) : (
          sections.map((section, idx) => {
            const typeInfo = SECTION_TYPE_LABELS[section.section_type];
            const Icon = typeInfo?.icon || Video;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                  section.is_active ? "bg-card/50 border-border" : "bg-muted/20 border-border/50 opacity-60"
                }`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />

                <div className="p-2 rounded-lg bg-muted/50 flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <section className="relative py-8 overflow-hidden">
                    {/* Efeitos de fundo */}
                    <div className="absolute inset-0 bg-grid opacity-10" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

                    <div className="relative z-10 text-center">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="mb-4"
                      >
                        <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
                          {typeInfo?.label}
                        </span>
                        <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">{section.title}</h2>
                      </motion.div>
                    </div>
                  </section>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={idx === 0}
                    onClick={() => moveSection(section.id, "up")}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={idx === sections.length - 1}
                    onClick={() => moveSection(section.id, "down")}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>

                  <Switch checked={section.is_active} onCheckedChange={() => toggleActive(section)} />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteSection(section.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })
        )}
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Seção</DialogTitle>
            <DialogDescription>Adicione uma nova seção dinâmica à landing page.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Vídeo Institucional"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Seção</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SECTION_TYPE_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <val.icon className="w-4 h-4" />
                        {val.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{SECTION_TYPE_LABELS[newType]?.description}</p>
            </div>

            <div className="space-y-2">
              <Label>Configuração (JSON opcional)</Label>
              <Textarea
                value={newConfig}
                onChange={(e) => setNewConfig(e.target.value)}
                placeholder='{"videoUrl": "https://...", "autoplay": true}'
                rows={3}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Vídeo: videoUrl, autoplay · Slides: limite de fotos, intervalo
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={createSection} disabled={!newTitle.trim() || saving}>
                {saving ? "Criando..." : "Criar Seção"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
