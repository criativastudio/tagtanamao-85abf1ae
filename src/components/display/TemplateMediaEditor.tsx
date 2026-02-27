import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageCompression";
import {
  Upload, X, Plus, Image, Film, Type,
  Loader2, Play, Youtube, MousePointer, Navigation, GripVertical
} from "lucide-react";
import TemplateTextEditor from "./TemplateTextEditor";
import TemplateHeroButtonsEditor from "./TemplateHeroButtonsEditor";
import TemplateBottomNavEditor from "./TemplateBottomNavEditor";

interface MediaItem {
  url: string;
  title?: string;
  type?: "image" | "video" | "instagram";
  badge?: string;
  bgColor?: string;
}

interface HeroButton {
  label: string;
  icon?: string;
  url?: string;
  action?: string;
}

interface BottomNavItem {
  icon: string;
  label: string;
  url: string;
  badgeCount?: number;
}

interface TemplateConfig {
  hero?: {
    type: "video" | "image" | "carousel" | "youtube";
    items: MediaItem[];
    youtubeId?: string;
  };
  headline?: string;
  subheadline?: string;
  heroSubtitle?: string;
  tags?: string[];
  heroButtons?: HeroButton[];
  covers?: MediaItem[];
  thumbnails?: MediaItem[];
  sections?: { title: string; itemIndexes: number[] }[];
  bottomNav?: BottomNavItem[];
}

interface Props {
  displayId: string;
  userId: string;
  config: TemplateConfig;
  onChange: (config: TemplateConfig) => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 30 * 1024 * 1024;

export default function TemplateMediaEditor({ displayId, userId, config, onChange }: Props) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<"hero" | "covers" | "thumbnails">("hero");
  const [reelUrl, setReelUrl] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (section: "hero" | "covers" | "thumbnails", index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const updated = { ...config };
    if (section === "hero" && updated.hero) {
      const items = [...updated.hero.items];
      const [moved] = items.splice(dragIndex, 1);
      items.splice(index, 0, moved);
      updated.hero = { ...updated.hero, items };
    } else if (section === "covers" || section === "thumbnails") {
      const items = [...(updated[section] || [])];
      const [moved] = items.splice(dragIndex, 1);
      items.splice(index, 0, moved);
      updated[section] = items;
    }
    onChange(updated);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const addInstagramReel = (section: "covers" | "thumbnails") => {
    const match = reelUrl.match(/(?:instagram\.com\/(?:reel|reels|p)\/|instagr\.am\/)([a-zA-Z0-9_-]+)/);
    if (!match) {
      toast({ title: "URL inválida", description: "Cole um link válido de Instagram Reels.", variant: "destructive" });
      return;
    }
    const newItem: MediaItem = { url: reelUrl.trim(), type: "instagram", title: "" };
    const updated = { ...config };
    updated[section] = [...(updated[section] || []), newItem];
    onChange(updated);
    setReelUrl("");
    toast({ title: "Reel adicionado!", description: "O vídeo do Instagram foi adicionado." });
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: `Limite: ${isVideo ? "30MB" : "5MB"}. Tamanho: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
        variant: "destructive",
      });
      return null;
    }

    let uploadBlob: Blob = file;
    let ext = file.name.split(".").pop() || "jpg";

    if (!isVideo) {
      try {
        // Use profile preset (400x400) for smaller/optimized thumbnails
        uploadBlob = await compressImage(file, "profile");
        ext = "webp";
      } catch {
        uploadBlob = file;
      }
    }

    const path = `${userId}/${displayId}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("display-media")
      .upload(path, uploadBlob, { contentType: isVideo ? file.type : "image/webp" });

    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      return null;
    }

    const { data: urlData } = supabase.storage.from("display-media").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(uploadTarget);

    const newItems: MediaItem[] = [];
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const url = await uploadFile(file, uploadTarget);
      if (url) {
        newItems.push({ url, title: "", type: isVideo ? "video" : "image" });
      }
    }

    if (newItems.length > 0) {
      const updated = { ...config };

      if (uploadTarget === "hero") {
        const heroType = newItems.some(i => i.type === "video") ? "video" :
          (updated.hero?.type === "carousel" || newItems.length > 1) ? "carousel" : "image";
        updated.hero = {
          type: heroType as any,
          items: [...(updated.hero?.items || []), ...newItems],
        };
      } else if (uploadTarget === "covers") {
        updated.covers = [...(updated.covers || []), ...newItems];
      } else {
        updated.thumbnails = [...(updated.thumbnails || []), ...newItems];
      }

      onChange(updated);
      toast({ title: "Upload concluído!", description: `${newItems.length} arquivo(s) adicionado(s).` });
    }

    setUploading(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerUpload = (target: "hero" | "covers" | "thumbnails", accept: string) => {
    setUploadTarget(target);
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.multiple = true;
      fileInputRef.current.click();
    }
  };

  const removeItem = (section: "hero" | "covers" | "thumbnails", index: number) => {
    const updated = { ...config };
    if (section === "hero" && updated.hero) {
      updated.hero.items = updated.hero.items.filter((_, i) => i !== index);
      if (updated.hero.items.length === 0) updated.hero = undefined;
    } else if (section === "covers") {
      updated.covers = (updated.covers || []).filter((_, i) => i !== index);
    } else {
      updated.thumbnails = (updated.thumbnails || []).filter((_, i) => i !== index);
    }
    onChange(updated);
  };

  const setHeroType = (type: string) => {
    const updated = { ...config };
    if (type === "youtube") {
      updated.hero = { type: "youtube", items: updated.hero?.items || [], youtubeId: updated.hero?.youtubeId || "" };
    } else {
      updated.hero = { ...updated.hero, type: type as any, items: updated.hero?.items || [] };
    }
    onChange(updated);
  };

  const setYoutubeUrl = (url: string) => {
    const updated = { ...config };
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    updated.hero = { ...updated.hero, type: "youtube", items: updated.hero?.items || [], youtubeId: match?.[1] || "" };
    onChange(updated);
  };

  const updateItemTitle = (section: "hero" | "covers" | "thumbnails", index: number, title: string) => {
    const updated = { ...config };
    if (section === "hero" && updated.hero) {
      updated.hero.items[index] = { ...updated.hero.items[index], title };
    } else if (section === "covers") {
      updated.covers = [...(updated.covers || [])];
      updated.covers[index] = { ...updated.covers[index], title };
    } else {
      updated.thumbnails = [...(updated.thumbnails || [])];
      updated.thumbnails[index] = { ...updated.thumbnails[index], title };
    }
    onChange(updated);
  };

  const updateCoverField = (section: "covers" | "thumbnails", index: number, field: string, value: string) => {
    const updated = { ...config };
    const arr = [...(updated[section] || [])];
    arr[index] = { ...arr[index], [field]: value };
    updated[section] = arr;
    onChange(updated);
  };

  const renderMediaGrid = (items: MediaItem[], section: "hero" | "covers" | "thumbnails") => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={() => handleDrop(section, i)}
          onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
          className={`relative group rounded-lg overflow-hidden border bg-muted/30 cursor-grab active:cursor-grabbing transition-all ${
            dragOverIndex === i ? "border-primary ring-2 ring-primary/30" : "border-border"
          } ${dragIndex === i ? "opacity-40" : "opacity-100"}`}
        >
          {/* Drag handle */}
          <div className="absolute top-1 left-1 z-10 bg-black/60 rounded p-0.5 opacity-0 group-hover:opacity-100 transition">
            <GripVertical className="w-3.5 h-3.5 text-white" />
          </div>
          {item.type === "instagram" ? (
            <div className="aspect-video bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
              <div className="text-center text-white">
                <svg className="w-8 h-8 mx-auto mb-1" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                <span className="text-[10px] font-medium">Reel</span>
              </div>
            </div>
          ) : item.type === "video" ? (
            <div className="aspect-video bg-black flex items-center justify-center">
              <video src={item.url} className="w-full h-full object-cover" muted />
              <Play className="absolute w-8 h-8 text-white/80" />
            </div>
          ) : (
            <img src={item.url} alt={item.title || ""} className="aspect-video object-cover w-full" />
          )}
          <button
            onClick={() => removeItem(section, i)}
            className="absolute top-1 right-1 bg-black/70 hover:bg-destructive rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          <div className="p-1.5 space-y-1">
            <Input
              value={item.title || ""}
              onChange={(e) => updateItemTitle(section, i, e.target.value)}
              placeholder="Título"
              className="border-0 text-xs h-7 bg-transparent px-1"
            />
            {(section === "covers" || section === "thumbnails") && (
              <div className="flex gap-1">
                <Input
                  value={(item as any).badge || ""}
                  onChange={(e) => updateCoverField(section, i, "badge", e.target.value)}
                  placeholder="Badge (ex: NOVOS)"
                  className="border-0 text-[10px] h-6 bg-transparent px-1 flex-1"
                />
                <input
                  type="color"
                  value={(item as any).bgColor || "#1a1a2e"}
                  onChange={(e) => updateCoverField(section, i, "bgColor", e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0"
                  title="Cor de fundo"
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

      <Tabs defaultValue="texts" className="w-full">
        <TabsList className="grid w-full grid-cols-5 text-[10px]">
          <TabsTrigger value="texts" className="gap-1 text-[10px] px-1"><Type className="w-3.5 h-3.5" /> Textos</TabsTrigger>
          <TabsTrigger value="hero" className="gap-1 text-[10px] px-1"><Film className="w-3.5 h-3.5" /> Hero</TabsTrigger>
          <TabsTrigger value="covers" className="gap-1 text-[10px] px-1"><Image className="w-3.5 h-3.5" /> Capas</TabsTrigger>
          <TabsTrigger value="buttons" className="gap-1 text-[10px] px-1"><MousePointer className="w-3.5 h-3.5" /> Botões</TabsTrigger>
          <TabsTrigger value="navbar" className="gap-1 text-[10px] px-1"><Navigation className="w-3.5 h-3.5" /> Rodapé</TabsTrigger>
        </TabsList>

        {/* Texts Tab */}
        <TabsContent value="texts" className="space-y-4">
          <TemplateTextEditor
            headline={config.headline || ""}
            subheadline={config.subheadline || ""}
            heroSubtitle={config.heroSubtitle || ""}
            tags={config.tags || []}
            onChange={(data) => onChange({ ...config, ...data })}
          />
        </TabsContent>

        {/* Hero Tab */}
        <TabsContent value="hero" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Mídia Principal (Hero)</span>
                <Select value={config.hero?.type || "image"} onValueChange={setHeroType}>
                  <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="carousel">Carrossel</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.hero?.type === "youtube" ? (
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-red-500" /> URL do YouTube
                  </Label>
                  <Input placeholder="https://youtube.com/watch?v=..." onChange={(e) => setYoutubeUrl(e.target.value)} className="text-sm" />
                  {config.hero.youtubeId && (
                    <div className="aspect-video rounded-lg overflow-hidden mt-2">
                      <iframe src={`https://www.youtube.com/embed/${config.hero.youtubeId}`} className="w-full h-full border-0" allowFullScreen />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {(config.hero?.items || []).length > 0 && renderMediaGrid(config.hero!.items, "hero")}
                  <Button variant="outline" className="w-full border-dashed" onClick={() => triggerUpload("hero", config.hero?.type === "video" ? "video/*" : "image/*,video/*")} disabled={!!uploading}>
                    {uploading === "hero" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Adicionar {config.hero?.type === "video" ? "Vídeo" : "Mídia"}
                  </Button>
                </>
              )}
              <p className="text-[11px] text-muted-foreground">Imagens: máx 5MB • Vídeos: máx 30MB</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Covers Tab */}
        <TabsContent value="covers" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Capas (Carrossel Automático)</CardTitle>
              <p className="text-xs text-muted-foreground">Carrossel com scroll automático, badge "N" e etiquetas</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {(config.covers || []).length > 0 && renderMediaGrid(config.covers!, "covers")}
              <Button variant="outline" className="w-full border-dashed" onClick={() => triggerUpload("covers", "image/*,video/*")} disabled={!!uploading}>
                {uploading === "covers" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Adicionar Capas (Upload)
              </Button>
              <div className="flex gap-2">
                <Input
                  value={reelUrl}
                  onChange={(e) => setReelUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/ABC123/"
                  className="text-xs h-9 flex-1"
                />
                <Button variant="secondary" size="sm" className="h-9 whitespace-nowrap" onClick={() => addInstagramReel("covers")} disabled={!reelUrl.trim()}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Reel
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Proporção ideal: 2:3 (retrato) • Fotos: máx 5MB • Vídeos: máx 30MB • Ou cole link de Reels</p>
            </CardContent>
          </Card>

          {/* Thumbnails in same tab */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Thumbnails (Grid)</CardTitle>
              <p className="text-xs text-muted-foreground">Grid 3 colunas estilo catálogo Netflix</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {(config.thumbnails || []).length > 0 && renderMediaGrid(config.thumbnails!, "thumbnails")}
              <Button variant="outline" className="w-full border-dashed" onClick={() => triggerUpload("thumbnails", "image/*,video/*")} disabled={!!uploading}>
                {uploading === "thumbnails" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Adicionar Thumbnails (Upload)
              </Button>
              <div className="flex gap-2">
                <Input
                  value={reelUrl}
                  onChange={(e) => setReelUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/ABC123/"
                  className="text-xs h-9 flex-1"
                />
                <Button variant="secondary" size="sm" className="h-9 whitespace-nowrap" onClick={() => addInstagramReel("thumbnails")} disabled={!reelUrl.trim()}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Reel
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Proporção ideal: 2:3 (retrato) • Máx 5MB • Ou cole link de Reels</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hero Buttons Tab */}
        <TabsContent value="buttons" className="space-y-4">
          <TemplateHeroButtonsEditor
            buttons={config.heroButtons || []}
            onChange={(heroButtons) => onChange({ ...config, heroButtons })}
          />
        </TabsContent>

        {/* Bottom Nav Tab */}
        <TabsContent value="navbar" className="space-y-4">
          <TemplateBottomNavEditor
            items={config.bottomNav || []}
            onChange={(bottomNav) => onChange({ ...config, bottomNav })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
