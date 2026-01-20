import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Ticket, 
  Layout, 
  LayoutDashboard,
  Settings,
  FileImage,
  QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SettingItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
}

const settingsItems: SettingItem[] = [
  {
    id: 'pix',
    title: 'Configurações PIX',
    description: 'Configure chave PIX e notificações de pedidos para o admin.',
    icon: QrCode,
    path: '/admin/configuracoes/pix',
    color: 'text-green-400'
  },
  {
    id: 'templates',
    title: 'Templates de Arte',
    description: 'Gerencie os templates SVG disponíveis para personalização de produtos.',
    icon: FileImage,
    path: '/admin/templates',
    color: 'text-purple-400'
  },
  {
    id: 'coupons',
    title: 'Cupons de Desconto',
    description: 'Crie e gerencie cupons de desconto para a loja.',
    icon: Ticket,
    path: '/admin/cupons',
    color: 'text-primary'
  },
  {
    id: 'landing',
    title: 'Landing Page',
    description: 'Personalize textos, imagens e seções da página inicial.',
    icon: Layout,
    path: '/admin/configuracoes/landing',
    color: 'text-blue-400'
  },
  {
    id: 'dashboard-admin',
    title: 'Dashboard Admin',
    description: 'Ajustes visuais e funcionais do painel administrativo.',
    icon: Settings,
    path: '/admin/configuracoes/dashboard-admin',
    color: 'text-orange-400'
  },
  {
    id: 'dashboard-user',
    title: 'Dashboard Usuário',
    description: 'Personalize a experiência do painel de clientes.',
    icon: LayoutDashboard,
    path: '/admin/configuracoes/dashboard-user',
    color: 'text-cyan-400'
  }
];

export default function SettingsPage() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && profile && !profile.is_admin) {
      navigate('/dashboard');
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive"
      });
    }
  }, [profile, loading, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile?.is_admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Gerencie templates, cupons e personalizações</p>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-6 rounded-xl cursor-pointer hover:border-primary/50 transition-all group"
            onClick={() => navigate(item.path)}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg bg-card/80 ${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
