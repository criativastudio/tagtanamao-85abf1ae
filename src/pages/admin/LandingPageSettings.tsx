import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Eye, Layout, Type, Image, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function LandingPageSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, loading } = useAuth();

  const [heroSettings, setHeroSettings] = useState({
    title: 'Proteja Quem Você Ama',
    subtitle: 'Com Tecnologia Inteligente',
    description: 'Tags QR inteligentes que conectam seus pets e negócios ao mundo digital.',
    ctaText: 'Comprar Agora',
    showVideo: false
  });

  const [featuresSettings, setFeaturesSettings] = useState({
    title: 'Por que escolher QRPet?',
    showSection: true
  });

  const [pricingSettings, setPricingSettings] = useState({
    showSection: true,
    highlightPlan: 2
  });

  const handleSave = () => {
    // TODO: Implementar salvamento no banco de dados
    toast({
      title: "Configurações salvas",
      description: "As alterações na landing page foram salvas com sucesso."
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile?.is_admin) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/configuracoes')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Landing Page</h1>
            <p className="text-muted-foreground">Personalize a página inicial do site</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open('/', '_blank')}>
            <Eye className="w-4 h-4 mr-2" />
            Visualizar
          </Button>
          <Button variant="hero" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="hero" className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            Hero
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            Imagens
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Cores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hero">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-xl space-y-6"
          >
            <h2 className="text-lg font-semibold text-foreground">Seção Hero</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="heroTitle">Título Principal</Label>
                <Input
                  id="heroTitle"
                  value={heroSettings.title}
                  onChange={(e) => setHeroSettings(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="heroSubtitle">Subtítulo</Label>
                <Input
                  id="heroSubtitle"
                  value={heroSettings.subtitle}
                  onChange={(e) => setHeroSettings(prev => ({ ...prev, subtitle: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="heroDescription">Descrição</Label>
              <Textarea
                id="heroDescription"
                value={heroSettings.description}
                onChange={(e) => setHeroSettings(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="heroCta">Texto do Botão CTA</Label>
                <Input
                  id="heroCta"
                  value={heroSettings.ctaText}
                  onChange={(e) => setHeroSettings(prev => ({ ...prev, ctaText: e.target.value }))}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Mostrar Vídeo</Label>
                  <p className="text-sm text-muted-foreground">Exibir vídeo em vez de imagem</p>
                </div>
                <Switch
                  checked={heroSettings.showVideo}
                  onCheckedChange={(checked) => setHeroSettings(prev => ({ ...prev, showVideo: checked }))}
                />
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="features">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Seção Features</h2>
              <Switch
                checked={featuresSettings.showSection}
                onCheckedChange={(checked) => setFeaturesSettings(prev => ({ ...prev, showSection: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="featuresTitle">Título da Seção</Label>
              <Input
                id="featuresTitle"
                value={featuresSettings.title}
                onChange={(e) => setFeaturesSettings(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Para editar os recursos individuais, modifique o componente Features.tsx no código.
            </p>
          </motion.div>
        </TabsContent>

        <TabsContent value="images">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-xl space-y-6"
          >
            <h2 className="text-lg font-semibold text-foreground">Imagens da Landing Page</h2>
            
            <p className="text-muted-foreground">
              Em breve você poderá fazer upload de imagens customizadas para cada seção da landing page.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="aspect-video rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Hero Image</span>
              </div>
              <div className="aspect-video rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Product Image 1</span>
              </div>
              <div className="aspect-video rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Product Image 2</span>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="colors">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-xl space-y-6"
          >
            <h2 className="text-lg font-semibold text-foreground">Cores e Tema</h2>
            
            <p className="text-muted-foreground">
              A personalização de cores está integrada ao sistema de design. 
              Alterações globais podem ser feitas no arquivo index.css.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Primary</Label>
                <div className="h-12 rounded-lg bg-primary" />
              </div>
              <div className="space-y-2">
                <Label>Background</Label>
                <div className="h-12 rounded-lg bg-background border border-border" />
              </div>
              <div className="space-y-2">
                <Label>Card</Label>
                <div className="h-12 rounded-lg bg-card border border-border" />
              </div>
              <div className="space-y-2">
                <Label>Muted</Label>
                <div className="h-12 rounded-lg bg-muted" />
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
