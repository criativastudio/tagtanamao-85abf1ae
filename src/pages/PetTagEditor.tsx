import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Eye, Loader2, Palette } from "lucide-react";
import { ImageUpload } from "@/components/bio/ImageUpload";
import { PetButtonEditor, PetButton } from "@/components/pet/PetButtonEditor";
import { PetGalleryEditor } from "@/components/pet/PetGalleryEditor";
import { PetPagePreview } from "@/components/pet/PetPagePreview";

interface PetTag {
  id: string;
  qr_code: string;
  pet_name: string | null;
  pet_photo_url: string | null;
  owner_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  reward_enabled: boolean | null;
  reward_text: string | null;
  lost_mode: boolean | null;
  gallery_photos: string[];
  buttons: PetButton[];
  theme_color: string;
}

const COLOR_OPTIONS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#22c55e',
];

const PetTagEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [petTag, setPetTag] = useState<PetTag | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    fetchPetTag();
  }, [id, user]);

  const fetchPetTag = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pet_tags')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do pet.",
        variant: "destructive"
      });
      navigate('/dashboard/tags');
    } else {
      // Parse JSON fields safely
      let galleryPhotos: string[] = [];
      let buttons: PetButton[] = [];
      
      if (data.gallery_photos) {
        if (Array.isArray(data.gallery_photos)) {
          galleryPhotos = data.gallery_photos.map((p: unknown) => String(p));
        } else if (typeof data.gallery_photos === 'string') {
          galleryPhotos = JSON.parse(data.gallery_photos);
        }
      }
      
      if (data.buttons) {
        if (Array.isArray(data.buttons)) {
          buttons = (data.buttons as unknown) as PetButton[];
        } else if (typeof data.buttons === 'string') {
          buttons = JSON.parse(data.buttons);
        }
      }
      
      setPetTag({
        ...data,
        gallery_photos: galleryPhotos,
        buttons: buttons,
        theme_color: data.theme_color || '#10b981'
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!petTag) return;
    setSaving(true);

    const { error } = await supabase
      .from('pet_tags')
      .update({
        pet_name: petTag.pet_name,
        pet_photo_url: petTag.pet_photo_url,
        owner_name: petTag.owner_name,
        phone: petTag.phone,
        whatsapp: petTag.whatsapp,
        address: petTag.address,
        reward_enabled: petTag.reward_enabled,
        reward_text: petTag.reward_text,
        lost_mode: petTag.lost_mode,
        gallery_photos: petTag.gallery_photos as unknown as null,
        buttons: petTag.buttons as unknown as null,
        theme_color: petTag.theme_color,
        updated_at: new Date().toISOString()
      })
      .eq('id', petTag.id);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Salvo!",
        description: "As alterações foram salvas com sucesso."
      });
    }
    setSaving(false);
  };

  const updateField = <K extends keyof PetTag>(field: K, value: PetTag[K]) => {
    if (!petTag) return;
    setPetTag({ ...petTag, [field]: value });
  };

  const addButton = (preset?: Partial<PetButton>) => {
    if (!petTag) return;
    const newButton: PetButton = {
      id: crypto.randomUUID(),
      label: preset?.label || 'Novo Link',
      url: '',
      icon: preset?.icon || 'Link',
      color: preset?.color || petTag.theme_color,
      enabled: true,
      order: petTag.buttons.length
    };
    updateField('buttons', [...petTag.buttons, newButton]);
  };

  const updateButton = (buttonId: string, updates: Partial<PetButton>) => {
    if (!petTag) return;
    const updatedButtons = petTag.buttons.map(btn =>
      btn.id === buttonId ? { ...btn, ...updates } : btn
    );
    updateField('buttons', updatedButtons);
  };

  const removeButton = (buttonId: string) => {
    if (!petTag) return;
    const filteredButtons = petTag.buttons.filter(btn => btn.id !== buttonId);
    updateField('buttons', filteredButtons);
  };

  const reorderButtons = (buttons: PetButton[]) => {
    updateField('buttons', buttons);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-12 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[600px]" />
            <Skeleton className="h-[600px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!petTag) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/tags')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{petTag.pet_name || 'Editar Pet Tag'}</h1>
              <p className="text-xs text-muted-foreground">Personalize a página do seu pet</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/pet/${petTag.qr_code}`, '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Visualizar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-4">
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="info">Dados</TabsTrigger>
                <TabsTrigger value="gallery">Galeria</TabsTrigger>
                <TabsTrigger value="buttons">Botões</TabsTrigger>
                <TabsTrigger value="theme">Tema</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                {/* Profile Photo */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Foto Principal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ImageUpload
                      userId={user?.id || ''}
                      currentUrl={petTag.pet_photo_url}
                      onUpload={(url) => updateField('pet_photo_url', url)}
                      onRemove={() => updateField('pet_photo_url', null)}
                      type="profile"
                    />
                  </CardContent>
                </Card>

                {/* Pet Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Informações do Pet</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome do Pet</Label>
                      <Input
                        value={petTag.pet_name || ''}
                        onChange={(e) => updateField('pet_name', e.target.value)}
                        placeholder="Ex: Rex, Luna..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome do Tutor</Label>
                      <Input
                        value={petTag.owner_name || ''}
                        onChange={(e) => updateField('owner_name', e.target.value)}
                        placeholder="Seu nome"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Contato (visível quando perdido)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">Modo Pet Perdido</p>
                        <p className="text-xs text-muted-foreground">Exibe contatos na página pública</p>
                      </div>
                      <Switch
                        checked={petTag.lost_mode || false}
                        onCheckedChange={(checked) => updateField('lost_mode', checked)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp</Label>
                      <Input
                        value={petTag.whatsapp || ''}
                        onChange={(e) => updateField('whatsapp', e.target.value)}
                        placeholder="11999999999"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        value={petTag.phone || ''}
                        onChange={(e) => updateField('phone', e.target.value)}
                        placeholder="11999999999"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Endereço</Label>
                      <Input
                        value={petTag.address || ''}
                        onChange={(e) => updateField('address', e.target.value)}
                        placeholder="Cidade, Bairro..."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Reward */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Recompensa</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">Oferecer Recompensa</p>
                        <p className="text-xs text-muted-foreground">Incentiva quem encontrar seu pet</p>
                      </div>
                      <Switch
                        checked={petTag.reward_enabled || false}
                        onCheckedChange={(checked) => updateField('reward_enabled', checked)}
                      />
                    </div>
                    {petTag.reward_enabled && (
                      <div className="space-y-2">
                        <Label>Texto da Recompensa</Label>
                        <Textarea
                          value={petTag.reward_text || ''}
                          onChange={(e) => updateField('reward_text', e.target.value)}
                          placeholder="Descreva a recompensa..."
                          rows={2}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="gallery" className="mt-4">
                <PetGalleryEditor
                  photos={petTag.gallery_photos}
                  onPhotosChange={(photos) => updateField('gallery_photos', photos)}
                  userId={user?.id || ''}
                  maxPhotos={6}
                />
              </TabsContent>

              <TabsContent value="buttons" className="mt-4">
                <PetButtonEditor
                  buttons={petTag.buttons}
                  onAddButton={addButton}
                  onUpdateButton={updateButton}
                  onRemoveButton={removeButton}
                  onReorderButtons={reorderButtons}
                  primaryColor={petTag.theme_color}
                />
              </TabsContent>

              <TabsContent value="theme" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Cor do Tema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color}
                          className={`w-10 h-10 rounded-full border-2 transition-all ${
                            petTag.theme_color === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => updateField('theme_color', color)}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      A cor escolhida será aplicada nos efeitos LED, bordas e destaques da página.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview Panel */}
          <div className="lg:sticky lg:top-20 h-fit">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-muted/50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Prévia da Página
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="aspect-[9/16] max-h-[600px] overflow-auto bg-[hsl(220,20%,4%)]">
                  <PetPagePreview
                    petName={petTag.pet_name}
                    ownerName={petTag.owner_name}
                    photoUrl={petTag.pet_photo_url}
                    galleryPhotos={petTag.gallery_photos}
                    buttons={petTag.buttons}
                    themeColor={petTag.theme_color}
                    rewardEnabled={petTag.reward_enabled || false}
                    rewardText={petTag.reward_text || ''}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetTagEditor;
