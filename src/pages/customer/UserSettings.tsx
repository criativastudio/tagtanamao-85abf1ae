import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Bell, 
  Shield, 
  Settings,
  QrCode,
  Dog,
  Building2,
  ShoppingCart,
  Package,
  Ticket,
  Layout,
  FileImage,
  LayoutDashboard,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AdminMenuItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
}

const adminMenuItems: AdminMenuItem[] = [
  {
    id: 'qr-generator',
    title: 'Gerador de QR Codes',
    description: 'Gere e gerencie QR Codes para produção.',
    icon: QrCode,
    path: '/admin',
    color: 'text-primary'
  },
  {
    id: 'pet-tags',
    title: 'Tags Pet',
    description: 'Gerencie todas as tags de pets.',
    icon: Dog,
    path: '/dashboard/tags',
    color: 'text-yellow-400'
  },
  {
    id: 'displays',
    title: 'Displays',
    description: 'Gerencie todos os displays.',
    icon: Building2,
    path: '/dashboard/displays',
    color: 'text-blue-400'
  },
  {
    id: 'orders',
    title: 'Pedidos',
    description: 'Gerencie os pedidos da loja.',
    icon: ShoppingCart,
    path: '/admin/pedidos',
    color: 'text-purple-400'
  },
  {
    id: 'products',
    title: 'Produtos',
    description: 'Gerencie os produtos da loja.',
    icon: Package,
    path: '/admin/produtos',
    color: 'text-orange-400'
  },
];

const adminSettingsItems: AdminMenuItem[] = [
  {
    id: 'pix',
    title: 'Configurações PIX',
    description: 'Chave PIX e notificações.',
    icon: QrCode,
    path: '/admin/configuracoes/pix',
    color: 'text-green-400'
  },
  {
    id: 'security',
    title: 'Segurança',
    description: 'Senha de exclusão em massa.',
    icon: ShieldCheck,
    path: '/admin/configuracoes/seguranca',
    color: 'text-red-400'
  },
  {
    id: 'templates',
    title: 'Templates de Arte',
    description: 'Templates SVG para produtos.',
    icon: FileImage,
    path: '/admin/templates',
    color: 'text-purple-400'
  },
  {
    id: 'coupons',
    title: 'Cupons de Desconto',
    description: 'Gerencie cupons da loja.',
    icon: Ticket,
    path: '/admin/cupons',
    color: 'text-primary'
  },
  {
    id: 'landing',
    title: 'Landing Page',
    description: 'Personalize a página inicial.',
    icon: Layout,
    path: '/admin/configuracoes/landing',
    color: 'text-blue-400'
  },
  {
    id: 'dashboard-admin',
    title: 'Dashboard Admin',
    description: 'Ajustes do painel admin.',
    icon: Settings,
    path: '/admin/configuracoes/dashboard-admin',
    color: 'text-orange-400'
  },
  {
    id: 'dashboard-user',
    title: 'Dashboard Usuário',
    description: 'Ajustes do painel de clientes.',
    icon: LayoutDashboard,
    path: '/admin/configuracoes/dashboard-user',
    color: 'text-cyan-400'
  }
];

export default function UserSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, user } = useAuth();

  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    whatsapp: profile?.whatsapp || '',
    address: profile?.address || ''
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    whatsappNotifications: true,
    scanAlerts: true,
    orderUpdates: true
  });

  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
          whatsapp: profileData.whatsapp,
          address: profileData.address
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">Gerencie seu perfil e preferências</p>
          </div>
        </div>
        <Button variant="hero" onClick={handleSaveProfile} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className={`grid w-full max-w-lg ${profile?.is_admin ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>
          {profile?.is_admin && (
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-xl space-y-6"
          >
            <h2 className="text-lg font-semibold text-foreground">Informações Pessoais</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Seu nome"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={profileData.whatsapp}
                  onChange={(e) => setProfileData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={profileData.address}
                onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Seu endereço completo"
              />
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="notifications">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-xl space-y-6"
          >
            <h2 className="text-lg font-semibold text-foreground">Preferências de Notificação</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Notificações por E-mail</Label>
                  <p className="text-sm text-muted-foreground">Receba atualizações por e-mail</p>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailNotifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Notificações por WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">Receba alertas no WhatsApp</p>
                </div>
                <Switch
                  checked={notifications.whatsappNotifications}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, whatsappNotifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Alertas de Leitura</Label>
                  <p className="text-sm text-muted-foreground">Seja notificado quando alguém escanear seu QR</p>
                </div>
                <Switch
                  checked={notifications.scanAlerts}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, scanAlerts: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Atualizações de Pedidos</Label>
                  <p className="text-sm text-muted-foreground">Status e rastreio dos seus pedidos</p>
                </div>
                <Switch
                  checked={notifications.orderUpdates}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, orderUpdates: checked }))}
                />
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="security">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-xl space-y-6"
          >
            <h2 className="text-lg font-semibold text-foreground">Segurança da Conta</h2>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <Label>Alterar Senha</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Para alterar sua senha, utilize a opção de recuperação de senha na tela de login.
                </p>
                <Button variant="outline" onClick={() => navigate('/auth')}>
                  Ir para Login
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <Label className="text-destructive">Zona de Perigo</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Ações irreversíveis para sua conta.
                </p>
                <Button variant="destructive" disabled>
                  Excluir Conta
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Entre em contato com o suporte para excluir sua conta.
                </p>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {profile?.is_admin && (
          <TabsContent value="admin">
            <div className="space-y-6">
              {/* Admin Menu */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 rounded-xl"
              >
                <h2 className="text-lg font-semibold text-foreground mb-4">Menu Admin</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {adminMenuItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all cursor-pointer group"
                      onClick={() => navigate(item.path)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-muted/50 ${item.color} group-hover:scale-110 transition-transform`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {item.title}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Admin Settings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-6 rounded-xl"
              >
                <h2 className="text-lg font-semibold text-foreground mb-4">Configurações do Sistema</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {adminSettingsItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (index + adminMenuItems.length) * 0.05 }}
                      className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all cursor-pointer group"
                      onClick={() => navigate(item.path)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-muted/50 ${item.color} group-hover:scale-110 transition-transform`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {item.title}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
