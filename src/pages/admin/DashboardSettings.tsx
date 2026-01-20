import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Settings, LayoutDashboard, ToggleLeft, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardSettings() {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const { toast } = useToast();
  const { profile, loading } = useAuth();

  const isAdminDashboard = type === 'dashboard-admin';
  const title = isAdminDashboard ? 'Dashboard Admin' : 'Dashboard Usuário';

  const [sidebarSettings, setSidebarSettings] = useState({
    showLogo: true,
    compactMode: false,
    showStats: true
  });

  const [menuSettings, setMenuSettings] = useState({
    showPetTags: true,
    showDisplays: true,
    showOrders: true,
    showBioPages: true,
    showSettings: true
  });

  const [statsSettings, setStatsSettings] = useState({
    showTotalScans: true,
    showActiveProducts: true,
    showRecentActivity: true,
    refreshInterval: 30
  });

  const handleSave = () => {
    toast({
      title: "Configurações salvas",
      description: `As alterações no ${title} foram salvas com sucesso.`
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
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground">
              {isAdminDashboard 
                ? 'Configure o painel administrativo' 
                : 'Personalize a experiência do cliente'}
            </p>
          </div>
        </div>
        <Button variant="hero" onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="sidebar" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="sidebar" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Sidebar
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            Menu
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <ToggleLeft className="w-4 h-4" />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sidebar">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-xl space-y-6"
          >
            <h2 className="text-lg font-semibold text-foreground">Configurações da Sidebar</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Mostrar Logo</Label>
                  <p className="text-sm text-muted-foreground">Exibir o logo na sidebar</p>
                </div>
                <Switch
                  checked={sidebarSettings.showLogo}
                  onCheckedChange={(checked) => setSidebarSettings(prev => ({ ...prev, showLogo: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Modo Compacto</Label>
                  <p className="text-sm text-muted-foreground">Reduzir tamanho da sidebar</p>
                </div>
                <Switch
                  checked={sidebarSettings.compactMode}
                  onCheckedChange={(checked) => setSidebarSettings(prev => ({ ...prev, compactMode: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Mostrar Estatísticas Rápidas</Label>
                  <p className="text-sm text-muted-foreground">Mini cards de estatísticas na sidebar</p>
                </div>
                <Switch
                  checked={sidebarSettings.showStats}
                  onCheckedChange={(checked) => setSidebarSettings(prev => ({ ...prev, showStats: checked }))}
                />
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="menu">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-xl space-y-6"
          >
            <h2 className="text-lg font-semibold text-foreground">Itens do Menu</h2>
            <p className="text-sm text-muted-foreground">
              Escolha quais itens exibir no menu do dashboard
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <Label>Tags Pet</Label>
                <Switch
                  checked={menuSettings.showPetTags}
                  onCheckedChange={(checked) => setMenuSettings(prev => ({ ...prev, showPetTags: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <Label>Displays</Label>
                <Switch
                  checked={menuSettings.showDisplays}
                  onCheckedChange={(checked) => setMenuSettings(prev => ({ ...prev, showDisplays: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <Label>Pedidos</Label>
                <Switch
                  checked={menuSettings.showOrders}
                  onCheckedChange={(checked) => setMenuSettings(prev => ({ ...prev, showOrders: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <Label>Bio Pages</Label>
                <Switch
                  checked={menuSettings.showBioPages}
                  onCheckedChange={(checked) => setMenuSettings(prev => ({ ...prev, showBioPages: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <Label>Configurações</Label>
                <Switch
                  checked={menuSettings.showSettings}
                  onCheckedChange={(checked) => setMenuSettings(prev => ({ ...prev, showSettings: checked }))}
                />
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="stats">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-xl space-y-6"
          >
            <h2 className="text-lg font-semibold text-foreground">Estatísticas do Dashboard</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Total de Leituras</Label>
                  <p className="text-sm text-muted-foreground">Card com total de scans</p>
                </div>
                <Switch
                  checked={statsSettings.showTotalScans}
                  onCheckedChange={(checked) => setStatsSettings(prev => ({ ...prev, showTotalScans: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Produtos Ativos</Label>
                  <p className="text-sm text-muted-foreground">Card com produtos ativados</p>
                </div>
                <Switch
                  checked={statsSettings.showActiveProducts}
                  onCheckedChange={(checked) => setStatsSettings(prev => ({ ...prev, showActiveProducts: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Atividade Recente</Label>
                  <p className="text-sm text-muted-foreground">Seção de últimas ações</p>
                </div>
                <Switch
                  checked={statsSettings.showRecentActivity}
                  onCheckedChange={(checked) => setStatsSettings(prev => ({ ...prev, showRecentActivity: checked }))}
                />
              </div>

              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <Label htmlFor="refreshInterval">Intervalo de Atualização (segundos)</Label>
                <Input
                  id="refreshInterval"
                  type="number"
                  min={10}
                  max={300}
                  value={statsSettings.refreshInterval}
                  onChange={(e) => setStatsSettings(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) || 30 }))}
                  className="max-w-[120px]"
                />
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
