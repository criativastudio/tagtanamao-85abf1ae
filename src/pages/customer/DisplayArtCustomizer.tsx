import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Lock, CheckCircle, Loader2, Image as ImageIcon, ZoomIn, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { sanitizeSvg } from '@/lib/sanitize';
import { ElementPositions } from '@/types/ecommerce';

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
    element_positions: ElementPositions | null;
  };
}

interface ArtTemplate {
  id: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  svg_content: string;
  product_type: string;
  element_positions: ElementPositions | null;
}

/**
 * Build an SVG preview with logo and company name rendered as overlay elements
 * using the position metadata from the template.
 */
const COLOR_PRESETS = [
  { label: 'Preto', value: '#000000' },
  { label: 'Branco', value: '#FFFFFF' },
  { label: 'Vermelho', value: '#DC2626' },
  { label: 'Azul', value: '#2563EB' },
  { label: 'Dourado', value: '#D4A843' },
  { label: 'Verde', value: '#16A34A' },
];

function buildPreviewSvg(
  svgContent: string,
  positions: ElementPositions | null,
  logoUrl: string | null,
  companyName: string,
  logoZoom: number = 100,
  textColor: string = '#000000'
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return svgContent;

  // Get viewBox dimensions
  const viewBox = svgEl.getAttribute('viewBox');
  let svgWidth = 800, svgHeight = 800;
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length >= 4) {
      svgWidth = parts[2];
      svgHeight = parts[3];
    }
  }

  const pos = positions || {};

  // Add logo as image element
  if (logoUrl) {
    const logoPos = pos.logo || { x: 50, y: 50, width: 120, height: 120 };
    const scale = logoZoom / 100;
    const scaledW = logoPos.width * scale;
    const scaledH = logoPos.height * scale;
    const cx = logoPos.x + logoPos.width / 2;
    const cy = logoPos.y + logoPos.height / 2;
    const imgX = cx - scaledW / 2;
    const imgY = cy - scaledH / 2;

    const imgEl = doc.createElementNS('http://www.w3.org/2000/svg', 'image');
    imgEl.setAttribute('href', logoUrl);
    imgEl.setAttribute('x', String(imgX));
    imgEl.setAttribute('y', String(imgY));
    imgEl.setAttribute('width', String(scaledW));
    imgEl.setAttribute('height', String(scaledH));
    imgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    // Clip to circle at original bounds
    const clipId = 'logo-clip-preview';
    const defs = doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const clipPath = doc.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    clipPath.setAttribute('id', clipId);
    const circle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', String(Math.min(logoPos.width, logoPos.height) / 2));
    clipPath.appendChild(circle);
    defs.appendChild(clipPath);
    svgEl.insertBefore(defs, svgEl.firstChild);
    imgEl.setAttribute('clip-path', `url(#${clipId})`);
    svgEl.appendChild(imgEl);
  }

  // Add company name as text element
  if (companyName) {
    const cnPos = pos.company_name || { x: svgWidth / 2, y: svgHeight - 80, fontSize: 24, textAnchor: 'middle' as const };
    const textEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', String(cnPos.x));
    textEl.setAttribute('y', String(cnPos.y));
    textEl.setAttribute('font-size', String(cnPos.fontSize));
    textEl.setAttribute('font-family', 'Arial, sans-serif');
    textEl.setAttribute('font-weight', 'bold');
    textEl.setAttribute('text-anchor', cnPos.textAnchor || 'middle');
    textEl.setAttribute('fill', textColor);
    textEl.textContent = companyName;
    svgEl.appendChild(textEl);
  }

  // Add QR placeholder
  const qrPos = pos.qr_code || { x: svgWidth / 2 - 100, y: svgHeight / 2 - 100, width: 200, height: 200 };
  const qrRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  qrRect.setAttribute('x', String(qrPos.x));
  qrRect.setAttribute('y', String(qrPos.y));
  qrRect.setAttribute('width', String(qrPos.width));
  qrRect.setAttribute('height', String(qrPos.height));
  qrRect.setAttribute('fill', 'none');
  qrRect.setAttribute('stroke', '#999');
  qrRect.setAttribute('stroke-width', '2');
  qrRect.setAttribute('stroke-dasharray', '8,4');
  qrRect.setAttribute('rx', '8');
  svgEl.appendChild(qrRect);
  const qrLabel = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
  qrLabel.setAttribute('x', String(qrPos.x + qrPos.width / 2));
  qrLabel.setAttribute('y', String(qrPos.y + qrPos.height / 2 + 6));
  qrLabel.setAttribute('text-anchor', 'middle');
  qrLabel.setAttribute('font-size', '14');
  qrLabel.setAttribute('fill', '#999');
  qrLabel.textContent = 'QR gerado ao finalizar';
  svgEl.appendChild(qrLabel);

  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
}

export default function DisplayArtCustomizer() {
  const { displayArtId } = useParams<{ displayArtId: string }>();
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get('order_id');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [displayArt, setDisplayArt] = useState<DisplayArtData | null>(null);
  const [templates, setTemplates] = useState<ArtTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoZoom, setLogoZoom] = useState(100);
  const [textColor, setTextColor] = useState('#000000');
  const [uploading, setUploading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, displayArtId, orderIdParam]);

  const fetchData = async () => {
    setLoading(true);

    let art: any = null;

    if (displayArtId) {
      // Route: /personalizar-display/:displayArtId
      const { data, error: artError } = await supabase
        .from('display_arts')
        .select('*, template:art_templates(*)')
        .eq('id', displayArtId)
        .single();

      if (artError || !data) {
        toast({ title: 'Arte não encontrada', variant: 'destructive' });
        navigate('/meus-pedidos');
        return;
      }
      art = data;
    } else if (orderIdParam) {
      // Route: /personalizar-display?order_id=...
      // Try to find an existing unlocked display_art for this order
      const { data: existing } = await supabase
        .from('display_arts')
        .select('*, template:art_templates(*)')
        .eq('order_id', orderIdParam)
        .eq('locked', false)
        .maybeSingle();

      if (existing) {
        art = existing;
        // Redirect to canonical URL
        navigate(`/personalizar-display/${existing.id}`, { replace: true });
      } else {
        // Create a new display_art for this order
        const { data: newArt, error: createError } = await supabase
          .from('display_arts')
          .insert({ order_id: orderIdParam, user_id: user!.id })
          .select('*, template:art_templates(*)')
          .single();

        if (createError || !newArt) {
          toast({ title: 'Erro ao iniciar personalização', description: createError?.message, variant: 'destructive' });
          navigate('/meus-pedidos');
          return;
        }
        art = newArt;
        navigate(`/personalizar-display/${newArt.id}`, { replace: true });
      }
    } else {
      toast({ title: 'Parâmetros inválidos', variant: 'destructive' });
      navigate('/meus-pedidos');
      return;
    }

    setDisplayArt(art as any);
    setSelectedTemplate(art.template_id);
    setCompanyName(art.company_name || '');
    setLogoUrl(art.logo_url);
    setTextColor((art as any).text_color || '#000000');

    const { data: tmpl } = await supabase
      .from('art_templates')
      .select('*')
      .eq('is_active', true)
      .in('product_type', ['display', 'business_display']);

    setTemplates((tmpl || []).map(t => ({
      ...t,
      element_positions: (t.element_positions || null) as any
    })));
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
      .update({ company_name: companyName, text_color: textColor } as any)
      .eq('id', displayArtId);
  };

  const handleTextColorChange = async (color: string) => {
    setTextColor(color);
    await supabase
      .from('display_arts')
      .update({ text_color: color } as any)
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

    await handleSaveCompanyName();

    setFinalizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('finalize-display-art', {
        body: { displayArtId },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: '✅ Arte finalizada!', description: `QR Code gerado: ${data.qrCode}` });
        fetchData();
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

  // Build live preview SVG
  const previewHtml = currentTemplate
    ? sanitizeSvg(buildPreviewSvg(
        currentTemplate.svg_content,
        currentTemplate.element_positions,
        logoUrl,
        companyName || 'Nome da Empresa',
        logoZoom,
        textColor
      ))
    : '';

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
                  Sua arte foi finalizada e está aguardando produção.
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
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/30 bg-white">
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      </div>
                      {/* Zoom control */}
                      <div className="w-full space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-1.5 text-sm">
                            <ZoomIn className="w-4 h-4" />
                            Zoom da Logo
                          </Label>
                          <span className="text-sm text-muted-foreground">{logoZoom}%</span>
                        </div>
                        <Slider
                          value={[logoZoom]}
                          onValueChange={([v]) => setLogoZoom(v)}
                          min={50}
                          max={200}
                          step={5}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          Ajuste para encaixar a logo sem cortes
                        </p>
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
                  <div className="space-y-4">
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
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-sm">
                        <Palette className="w-4 h-4" />
                        Cor do Texto
                      </Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            title={preset.label}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              textColor === preset.value
                                ? 'border-primary scale-110 ring-2 ring-primary/30'
                                : 'border-border hover:border-primary/50'
                            }`}
                            style={{ backgroundColor: preset.value }}
                            onClick={() => handleTextColorChange(preset.value)}
                          />
                        ))}
                        <label className="relative w-8 h-8 cursor-pointer" title="Cor personalizada">
                          <input
                            type="color"
                            value={textColor}
                            onChange={(e) => handleTextColorChange(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div
                            className="w-8 h-8 rounded-full border-2 border-dashed border-border flex items-center justify-center"
                            style={{ background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)` }}
                          >
                            <span className="text-[10px] font-bold text-white drop-shadow">+</span>
                          </div>
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Escolha a cor que combina com o modelo selecionado
                      </p>
                    </div>
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
                  <CardTitle className="text-lg">Preview em Tempo Real</CardTitle>
                </CardHeader>
                <CardContent>
                  {currentTemplate ? (
                    <div className="space-y-4">
                      <div
                        className="w-full border border-border rounded-lg overflow-hidden bg-white p-4"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                      {logoUrl && (
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/30">
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{companyName || 'Nome da Empresa'}</p>
                            <p className="text-xs text-muted-foreground">Logo e nome aplicados na arte</p>
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
