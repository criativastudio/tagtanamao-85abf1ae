import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  QrCode, 
  Dog, 
  Building2, 
  ShoppingBag, 
  Settings, 
  LogOut,
  Plus,
  Eye,
  BarChart3,
  MapPin,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PetTag {
  id: string;
  pet_name: string | null;
  is_activated: boolean;
  qr_code: string;
  created_at: string;
}

interface BusinessDisplay {
  id: string;
  business_name: string | null;
  is_activated: boolean;
  qr_code: string;
  created_at: string;
}

interface ScanStats {
  total: number;
  lastScan: string | null;
}

export default function Dashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [petTags, setPetTags] = useState<PetTag[]>([]);
  const [displays, setDisplays] = useState<BusinessDisplay[]>([]);
  const [scanStats, setScanStats] = useState<ScanStats>({ total: 0, lastScan: null });
  const [loadingData, setLoadingData] = useState(true);

  // Auth protection is now handled by ProtectedRoute wrapper in App.tsx

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoadingData(true);
    
    // Fetch pet tags
    const { data: tagsData } = await supabase
      .from('pet_tags')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (tagsData) setPetTags(tagsData);
    
    // Fetch business displays
    const { data: displaysData } = await supabase
      .from('business_displays')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (displaysData) setDisplays(displaysData);
    
    // Fetch scan stats
    const tagIds = tagsData?.map(t => t.id) || [];
    const displayIds = displaysData?.map(d => d.id) || [];
    
    if (tagIds.length > 0 || displayIds.length > 0) {
      // Use parameterized .in() method for safe query construction
      let query = supabase
        .from('qr_scans')
        .select('*', { count: 'exact' });

      if (tagIds.length > 0 && displayIds.length > 0) {
        // Both arrays have items - need to use .or() but with safe array interpolation
        query = query.or(`pet_tag_id.in.(${tagIds.join(',')}),display_id.in.(${displayIds.join(',')})`);
      } else if (tagIds.length > 0) {
        query = query.in('pet_tag_id', tagIds);
      } else {
        query = query.in('display_id', displayIds);
      }

      const { data: scansData, count } = await query
        .order('scanned_at', { ascending: false })
        .limit(1);
      
      setScanStats({
        total: count || 0,
        lastScan: scansData?.[0]?.scanned_at || null
      });
    }
    
    setLoadingData(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { 
      label: 'Tags Pet', 
      value: petTags.length, 
      icon: Dog, 
      color: 'text-primary',
      active: petTags.filter(t => t.is_activated).length
    },
    { 
      label: 'Displays', 
      value: displays.length, 
      icon: Building2, 
      color: 'text-blue-400',
      active: displays.filter(d => d.is_activated).length
    },
    { 
      label: 'Leituras', 
      value: scanStats.total, 
      icon: Eye, 
      color: 'text-purple-400' 
    },
    { 
      label: 'QR Codes', 
      value: petTags.length + displays.length, 
      icon: QrCode, 
      color: 'text-orange-400' 
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-4 hidden lg:block">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <QrCode className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold gradient-text">QRPet</span>
        </div>

        <nav className="space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => navigate('/dashboard/tags')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Dog className="w-5 h-5" />
            Tags Pet
          </button>
          <button 
            onClick={() => navigate('/dashboard/displays')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Building2 className="w-5 h-5" />
            Displays
          </button>
          <button 
            onClick={() => navigate('/meus-pedidos')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            Pedidos
          </button>
          <button 
            onClick={() => navigate('/dashboard/configuracoes')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Configurações
          </button>
          {profile?.is_admin && (
            <button 
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Shield className="w-5 h-5" />
              Admin
            </button>
          )}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Olá, {profile?.full_name || profile?.email?.split('@')[0] || 'Usuário'}!
            </h1>
            <p className="text-muted-foreground">Gerencie suas tags e displays</p>
          </div>
          <Button variant="hero" onClick={() => navigate('/dashboard/activate')}>
            <Plus className="w-5 h-5 mr-2" />
            Ativar Produto
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6 rounded-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                {'active' in stat && (
                  <span className="text-xs text-muted-foreground">
                    {stat.active} ativos
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pet Tags */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 rounded-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Tags Pet</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/tags')}>
                Ver todas
              </Button>
            </div>
            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : petTags.length === 0 ? (
              <div className="text-center py-8">
                <Dog className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">Nenhuma tag cadastrada</p>
                <Button variant="outline" size="sm" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Tag
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {petTags.slice(0, 3).map((tag) => (
                  <div 
                    key={tag.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Dog className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {tag.pet_name || 'Pet sem nome'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tag.is_activated ? 'Ativado' : 'Não ativado'}
                        </p>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${tag.is_activated ? 'bg-primary' : 'bg-muted'}`} />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Business Displays */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 rounded-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Displays Empresariais</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/displays')}>
                Ver todos
              </Button>
            </div>
            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : displays.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">Nenhum display cadastrado</p>
                <Button variant="outline" size="sm" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Display
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {displays.slice(0, 3).map((display) => (
                  <div 
                    key={display.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {display.business_name || 'Empresa sem nome'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {display.is_activated ? 'Ativado' : 'Não ativado'}
                        </p>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${display.is_activated ? 'bg-blue-400' : 'bg-muted'}`} />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Last Scan Location */}
        {scanStats.lastScan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6 rounded-xl mt-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Última Leitura</h2>
            </div>
            <p className="text-muted-foreground">
              {new Date(scanStats.lastScan).toLocaleString('pt-BR')}
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
