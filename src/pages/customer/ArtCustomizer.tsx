import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Save,
  Palette,
  Image,
  Type,
  Eye,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArtTemplate, CustomerArt, EditableField } from '@/types/ecommerce';

export default function ArtCustomizer() {
  const navigate = useNavigate();
  const { templateId, artId } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const svgRef = useRef<HTMLDivElement>(null);
  
  const [template, setTemplate] = useState<ArtTemplate | null>(null);
  const [customerArt, setCustomerArt] = useState<CustomerArt | null>(null);
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewSvg, setPreviewSvg] = useState<string>('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadData();
  }, [user, templateId, artId]);

  useEffect(() => {
    if (template) {
      updatePreview();
    }
  }, [template, customData, logoUrl]);

  const loadData = async () => {
    setLoading(true);
    
    try {
      if (artId) {
        // Load existing customer art
        const { data: art, error } = await supabase
          .from('customer_arts')
          .select(`
            *,
            template:art_templates(*)
          `)
          .eq('id', artId)
          .single();

        if (error) throw error;
        
        const typedArt: CustomerArt = {
          ...art,
          custom_data: (art.custom_data as Record<string, string>) || {},
          template: art.template ? {
            ...art.template,
            editable_fields: (Array.isArray(art.template.editable_fields) ? art.template.editable_fields : []) as EditableField[]
          } : undefined
        };
        
        setCustomerArt(typedArt);
        setTemplate(typedArt.template || null);
        setCustomData(typedArt.custom_data || {});
        setLogoUrl(typedArt.logo_url);
      } else if (templateId) {
        // Load template for new art
        const { data: tmpl, error } = await supabase
          .from('art_templates')
          .select('*')
          .eq('id', templateId)
          .single();

        if (error) throw error;
        
        const typedTemplate: ArtTemplate = {
          ...tmpl,
          editable_fields: (Array.isArray(tmpl.editable_fields) ? tmpl.editable_fields : []) as EditableField[]
        };
        
        setTemplate(typedTemplate);
        
        // Initialize custom data with defaults
        const defaults: Record<string, string> = {};
        typedTemplate.editable_fields?.forEach(field => {
          if (field.defaultValue) {
            defaults[field.id] = field.defaultValue;
          }
        });
        setCustomData(defaults);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreview = () => {
    if (!template) return;
    
    let svg = template.svg_content;
    
    // Replace text placeholders
    template.editable_fields?.forEach(field => {
      if (field.type === 'text' && customData[field.id]) {
        // Find and replace text content in SVG
        const regex = new RegExp(`data-editable="${field.id}"[^>]*>[^<]*<`, 'g');
        svg = svg.replace(regex, (match) => {
          const prefix = match.slice(0, -1);
          return `${prefix}>${customData[field.id]}<`;
        });
      }
      
      if (field.type === 'image' && logoUrl) {
        // Replace image href
        const regex = new RegExp(`data-editable="${field.id}"[^>]*href="[^"]*"`, 'g');
        svg = svg.replace(regex, (match) => {
          return match.replace(/href="[^"]*"/, `href="${logoUrl}"`);
        });
      }
    });
    
    setPreviewSvg(svg);
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setCustomData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = `customer-logos/${user?.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from('bio-images')
      .upload(fileName, file);

    if (error) {
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('bio-images')
        .getPublicUrl(fileName);
      
      setLogoUrl(publicUrl);
      toast({ title: 'Logo atualizado' });
    }
  };

  const handleSave = async () => {
    if (!user || !template) return;
    
    setSaving(true);
    
    try {
      const artData = {
        user_id: user.id,
        template_id: template.id,
        custom_data: customData,
        logo_url: logoUrl,
        final_svg: previewSvg,
        status: 'draft',
      };

      if (customerArt) {
        const { error } = await supabase
          .from('customer_arts')
          .update(artData)
          .eq('id', customerArt.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('customer_arts')
          .insert(artData)
          .select()
          .single();
        
        if (error) throw error;
        
        setCustomerArt(data as CustomerArt);
        navigate(`/arte/${template.id}/${data.id}`, { replace: true });
      }
      
      toast({
        title: 'Arte salva',
        description: 'Suas alterações foram salvas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadSVG = () => {
    if (!previewSvg) return;
    
    const blob = new Blob([previewSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arte-${template?.name || 'custom'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Download iniciado' });
  };

  const handleReset = () => {
    if (!template) return;
    
    const defaults: Record<string, string> = {};
    template.editable_fields?.forEach(field => {
      if (field.defaultValue) {
        defaults[field.id] = field.defaultValue;
      }
    });
    setCustomData(defaults);
    setLogoUrl(null);
    
    toast({ title: 'Campos resetados' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Palette className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Template não encontrado</h2>
          <Button onClick={() => navigate('/dashboard')}>Voltar</Button>
        </div>
      </div>
    );
  }

  const textFields = template.editable_fields?.filter(f => f.type === 'text') || [];
  const imageFields = template.editable_fields?.filter(f => f.type === 'image') || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{template.name}</h1>
              <p className="text-sm text-muted-foreground">Personalize sua arte</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Resetar
            </Button>
            <Button variant="outline" onClick={handleDownloadSVG}>
              <Download className="w-4 h-4 mr-2" />
              SVG
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Preview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="order-2 lg:order-1"
          >
            <Card className="glass-card sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  ref={svgRef}
                  className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden"
                  dangerouslySetInnerHTML={{ 
                    __html: previewSvg
                      .replace(/width="[^"]*"/, 'width="100%"')
                      .replace(/height="[^"]*"/, 'height="100%"')
                  }}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Editor */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="order-1 lg:order-2"
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Personalizar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="text" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text">
                      <Type className="w-4 h-4 mr-2" />
                      Textos ({textFields.length})
                    </TabsTrigger>
                    <TabsTrigger value="images">
                      <Image className="w-4 h-4 mr-2" />
                      Imagens ({imageFields.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="space-y-4 mt-4">
                    {textFields.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum campo de texto editável neste template.
                      </p>
                    ) : (
                      textFields.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={field.id}>{field.name}</Label>
                          <Input
                            id={field.id}
                            value={customData[field.id] || ''}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            placeholder={field.placeholder || `Digite ${field.name.toLowerCase()}`}
                          />
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="images" className="space-y-4 mt-4">
                    {imageFields.length === 0 ? (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Faça upload da sua logo ou imagem:
                        </p>
                        <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt="Logo"
                              className="max-w-full max-h-32 object-contain"
                            />
                          ) : (
                            <>
                              <Image className="w-8 h-8 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Clique para fazer upload
                              </span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      imageFields.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label>{field.name}</Label>
                          <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                            {logoUrl ? (
                              <img
                                src={logoUrl}
                                alt={field.name}
                                className="max-w-full max-h-24 object-contain"
                              />
                            ) : (
                              <>
                                <Image className="w-6 h-6 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {field.placeholder || 'Upload'}
                                </span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
