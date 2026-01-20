import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Eye, Save, ExternalLink } from "lucide-react";
import { BioPage, BioButton, BioTheme, DEFAULT_THEME, BUTTON_PRESETS } from "@/types/bioPage";
import { BioEditorPreview } from "@/components/bio/BioEditorPreview";
import { BioButtonEditor } from "@/components/bio/BioButtonEditor";
import { BioThemeEditor } from "@/components/bio/BioThemeEditor";
import { BioAnalytics } from "@/components/bio/BioAnalytics";
import { ImageUpload, GalleryUpload } from "@/components/bio/ImageUpload";

const BioEditor = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bioPage, setBioPage] = useState<Partial<BioPage>>({
    title: "Minha Bio",
    subtitle: "",
    profile_photo_url: "",
    gallery_photos: [],
    buttons: [],
    theme: DEFAULT_THEME,
    is_active: true,
    slug: "",
  });

  useEffect(() => {
    if (!user) return;

    const fetchBioPage = async () => {
      if (id) {
        const { data, error } = await supabase
          .from("bio_pages")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (error) {
          toast.error("Página não encontrada");
          navigate("/dashboard");
          return;
        }

        setBioPage({
          ...data,
          gallery_photos: Array.isArray(data.gallery_photos) 
            ? (data.gallery_photos as unknown as string[]) 
            : [],
          buttons: Array.isArray(data.buttons) 
            ? (data.buttons as unknown as BioButton[]) 
            : [],
          theme: typeof data.theme === 'object' 
            ? { ...DEFAULT_THEME, ...(data.theme as unknown as Partial<BioTheme>) } 
            : DEFAULT_THEME,
        });
      }
      setLoading(false);
    };

    fetchBioPage();
  }, [id, user, navigate]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 6);
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!bioPage.title?.trim()) {
      toast.error("Digite um título para a página");
      return;
    }

    setSaving(true);

    try {
      const slug = bioPage.slug || generateSlug(bioPage.title);
      
      const dataToSave = {
        user_id: user.id,
        title: bioPage.title,
        subtitle: bioPage.subtitle || null,
        profile_photo_url: bioPage.profile_photo_url || null,
        gallery_photos: bioPage.gallery_photos as unknown as string,
        buttons: bioPage.buttons as unknown as string,
        theme: bioPage.theme as unknown as string,
        is_active: bioPage.is_active ?? true,
        slug,
      };

      if (id) {
        const { error } = await supabase
          .from("bio_pages")
          .update(dataToSave)
          .eq("id", id);

        if (error) throw error;
        toast.success("Página salva com sucesso!");
      } else {
        const { data, error } = await supabase
          .from("bio_pages")
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;
        toast.success("Página criada com sucesso!");
        navigate(`/dashboard/bio/${data.id}`);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Erro ao salvar página");
    } finally {
      setSaving(false);
    }
  };

  const addButton = (preset?: typeof BUTTON_PRESETS[0]) => {
    const newButton: BioButton = {
      id: crypto.randomUUID(),
      type: preset?.type || 'custom',
      label: preset?.label || 'Novo Link',
      url: '',
      icon: preset?.icon || 'Link',
      color: preset?.color || bioPage.theme?.primaryColor || DEFAULT_THEME.primaryColor,
      order: (bioPage.buttons?.length || 0),
      enabled: true,
    };

    setBioPage(prev => ({
      ...prev,
      buttons: [...(prev.buttons || []), newButton],
    }));
  };

  const updateButton = (buttonId: string, updates: Partial<BioButton>) => {
    setBioPage(prev => ({
      ...prev,
      buttons: prev.buttons?.map(b => 
        b.id === buttonId ? { ...b, ...updates } : b
      ),
    }));
  };

  const removeButton = (buttonId: string) => {
    setBioPage(prev => ({
      ...prev,
      buttons: prev.buttons?.filter(b => b.id !== buttonId),
    }));
  };

  const updateTheme = (updates: Partial<BioTheme>) => {
    setBioPage(prev => ({
      ...prev,
      theme: { ...DEFAULT_THEME, ...prev.theme, ...updates },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Editor de Bio</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {bioPage.slug && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/bio/${bioPage.slug}`, '_blank')}
              >
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-6">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="content">Conteúdo</TabsTrigger>
                <TabsTrigger value="buttons">Botões</TabsTrigger>
                <TabsTrigger value="theme">Tema</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Título</Label>
                      <Input
                        id="title"
                        value={bioPage.title}
                        onChange={(e) => setBioPage(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Nome do pet ou empresa"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subtitle">Subtítulo</Label>
                      <Input
                        id="subtitle"
                        value={bioPage.subtitle || ""}
                        onChange={(e) => setBioPage(prev => ({ ...prev, subtitle: e.target.value }))}
                        placeholder="Uma breve descrição"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Foto de Perfil</Label>
                      <div className="flex items-center gap-4">
                        <ImageUpload
                          userId={user?.id || ''}
                          currentUrl={bioPage.profile_photo_url}
                          onUpload={(url) => setBioPage(prev => ({ ...prev, profile_photo_url: url }))}
                          onRemove={() => setBioPage(prev => ({ ...prev, profile_photo_url: '' }))}
                          type="profile"
                        />
                        <div className="flex-1 text-sm text-muted-foreground">
                          <p>Clique para fazer upload</p>
                          <p className="text-xs">JPG, PNG ou GIF. Max 5MB.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slug">URL Personalizada</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">/bio/</span>
                        <Input
                          id="slug"
                          value={bioPage.slug || ""}
                          onChange={(e) => setBioPage(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                          placeholder="meu-pet"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="active">Página Ativa</Label>
                      <Switch
                        id="active"
                        checked={bioPage.is_active ?? true}
                        onCheckedChange={(checked) => setBioPage(prev => ({ ...prev, is_active: checked }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Galeria de Fotos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GalleryUpload
                      userId={user?.id || ''}
                      photos={bioPage.gallery_photos || []}
                      onPhotosChange={(photos) => setBioPage(prev => ({ ...prev, gallery_photos: photos }))}
                      maxPhotos={9}
                    />
                    <p className="text-xs text-muted-foreground mt-3">
                      Adicione até 9 fotos. As fotos aparecerão em um carrossel rotativo.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="buttons" className="mt-4">
                <BioButtonEditor
                  buttons={bioPage.buttons || []}
                  onAddButton={addButton}
                  onUpdateButton={updateButton}
                  onRemoveButton={removeButton}
                  primaryColor={bioPage.theme?.primaryColor || DEFAULT_THEME.primaryColor}
                />
              </TabsContent>

              <TabsContent value="theme" className="mt-4">
                <BioThemeEditor
                  theme={bioPage.theme || DEFAULT_THEME}
                  onUpdateTheme={updateTheme}
                />
              </TabsContent>

              <TabsContent value="analytics" className="mt-4">
                {id ? (
                  <BioAnalytics bioPageId={id} />
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Salve a página para ver as estatísticas
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview Panel */}
          <div className="hidden lg:block sticky top-24 h-[calc(100vh-120px)]">
            <Card className="h-full overflow-hidden">
              <CardHeader className="py-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Preview</CardTitle>
                  {bioPage.slug && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/bio/${bioPage.slug}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-60px)] overflow-auto">
                <BioEditorPreview bioPage={bioPage as BioPage} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BioEditor;
