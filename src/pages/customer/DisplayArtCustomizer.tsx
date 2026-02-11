import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Lock, CheckCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { sanitizeSvg } from '@/lib/sanitize';

interface DisplayArtData {
  id: string;
  order_id: string;
  user_id: string;
  template_id: string | null;
  logo_url: string | null;
  company_name: string | null;
  locked: boolean;
  final_svg: string | null;
  template?: {
    id: string;
    name: string;
    description: string | null;
    preview_url: string | null;
    svg_content: string;
    product_type: string;
  };
}

interface ArtTemplate {
  id: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  svg_content: string;
  product_type: string;
}

export default function DisplayArtCustomizer() {
  const { displayArtId } = useParams<{ displayArtId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [displayArt, setDisplayArt] = useState<DisplayArtData | null>(null);
  const [templates, setTemplates] = useState<ArtTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, displayArtId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch display art
    const { data: art, error: artError } = await supabase
      .from('display_arts')
      .select('*, template:art_templates(*)')
      .eq('id', displayArtId)
      .single();

    if (artError || !art) {
      toast({ title: 'Arte não encontrada', variant: 'destructive' });
      navigate('/meus-pedidos');
      return;
    }

    setDisplayArt(art as any);
    setSelectedTemplate(art.template_id);
    setCompanyName(art.company_name || '');
    setLogoUrl(art.logo_url);

    // Fetch templates
    const { data: tmpl } = await supabase
      .from('art_templates')
      .select('*')
      .eq('is_active', true)
      .in('product_type', ['display', 'business_display']);

    setTemplates(tmpl || []);
    setLoading(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileName = `display-logos/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('bio-images')
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: 'Erro ao enviar logo', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('bio-images').getPublicUrl(fileName);
    setLogoUrl(publicUrl);

    // Save to display_arts
    await supabase
      .from('display_arts')
      .update({ logo_url: publicUrl })
      .eq('id', displayArtId);

    setUploading(false);
  };

  const handleSelectTemplate = async (templateId: string) => {
    setSelectedTemplate(templateId);
    await supabase
      .from('display_arts')
      .update({ template_id: templateId })
      .eq('id', displayArtId);
  };

  const handleSaveCompanyName = async () => {
    await supabase
      .from('display_arts')
      .update({ company_name: companyName })
      .eq('id', displayArtId);
  };

  const handleFinalize = async () => {
    if (!selectedTemplate || !logoUrl || !companyName.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Escolha um modelo, envie sua logo e preencha o nome da empresa.',
        variant: 'destructive',
      });
      return;
    }

    // Save company name first
    await handleSaveCompanyName();

    setFinalizing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('finalize-display-art', {
        body: { displayArtId },
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: '✅ Arte finalizada!', description: `QR Code gerado: ${data.qrCode}` });
        fetchData(); // Reload to show locked state
      } else {
        throw new Error(data?.error || 'Erro ao finalizar arte');
      }
    } catch (error: any) {
      toast({ title: 'Erro ao finalizar', description: error.message, variant: 'destructive' });
    } finally {
      setFinalizing(false);
    }
  };

  const currentTemplate = templates.find(t => t.id === selectedTemplate);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isLocked = displayArt?.locked;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/meus-pedidos')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Personalizar Display</h1>
            <p className="text-muted-foreground">
              {isLocked ? 'Arte finalizada e travada' : 'Escolha o modelo, envie sua logo e finalize'}
            </p>
          </div>
          {isLocked && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <Lock className="w-3 h-3 mr-1" />
              Finalizada
            </Badge>
          )}
        </div>

        {isLocked ? (
          /* Locked state - show final art */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Arte Finalizada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Sua arte foi finalizada e está aguardando produção. Você receberá atualizações sobre o andamento do seu pedido.
                </p>
                {displayArt?.final_svg && (
                  <div
                    className="w-full max-w-md mx-auto border border-border rounded-lg overflow-hidden bg-white p-4"
                    dangerouslySetInnerHTML={{ __html: sanitizeSvg(displayArt.final_svg) }}
                  />
                )}
                <Button onClick={() => navigate('/meus-pedidos')} className="w-full">
                  Voltar aos Meus Pedidos
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Edit state */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form */}
            <div className="space-y-6">
              {/* Template Selection */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">1. Escolha o Modelo</CardTitle>
                </CardHeader>
                <CardContent>
                  {templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum modelo disponível no momento.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {templates.map((template) => (
                        <motion.div
                          key={template.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`cursor-pointer rounded-lg border-2 p-3 transition-colors ${
                            selectedTemplate === template.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handleSelectTemplate(template.id)}
                        >
                          {template.preview_url ? (
                            <img
                              src={template.preview_url}
                              alt={template.name}
                              className="w-full h-24 object-contain rounded mb-2"
                            />
                          ) : (
                            <div className="w-full h-24 bg-muted rounded flex items-center justify-center mb-2">
                              <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <p className="text-sm font-medium text-center">{template.name}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Logo Upload */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">2. Envie sua Logo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {logoUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/30 bg-white">
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      </div>
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            Trocar Logo
                          </span>
                        </Button>
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                        {uploading ? (
                          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Clique para enviar sua logomarca</p>
                            <p className="text-xs text-muted-foreground mt-1">PNG, JPG (será exibida circular)</p>
                          </>
                        )}
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                    </label>
                  )}
                </CardContent>
              </Card>

              {/* Company Name */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">3. Nome da Empresa</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Nome que aparecerá no display</Label>
                    <Input
                      id="company-name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      onBlur={handleSaveCompanyName}
                      placeholder="Ex: Minha Empresa"
                      maxLength={50}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Finalize Button */}
              <Button
                className="w-full h-14 text-lg"
                onClick={handleFinalize}
                disabled={finalizing || !selectedTemplate || !logoUrl || !companyName.trim()}
              >
                {finalizing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Finalizar Arte
                  </>
                )}
              </Button>
            </div>

            {/* Right: Preview */}
            <div className="lg:sticky lg:top-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {currentTemplate ? (
                    <div className="space-y-4">
                      <div
                        className="w-full border border-border rounded-lg overflow-hidden bg-white p-4"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeSvg(
                            currentTemplate.svg_content
                              .replace(/\{\{company_name\}\}/g, companyName || 'Nome da Empresa')
                              .replace(/\{\{logo_url\}\}/g, logoUrl || '')
                              .replace(/\{\{qr_code\}\}/g, 'QR-PREVIEW')
                              .replace(/\{\{qr_url\}\}/g, '#')
                          ),
                        }}
                      />
                      {logoUrl && (
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/30">
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{companyName || 'Nome da Empresa'}</p>
                            <p className="text-xs text-muted-foreground">Logo aplicada</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Selecione um modelo para ver o preview</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
