import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Dog, 
  Building2, 
  Package,
  QrCode,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PetTag {
  id: string;
  pet_name: string | null;
  owner_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  is_activated: boolean | null;
  qr_code: string;
  slug: string | null;
  created_at: string | null;
}

interface BusinessDisplay {
  id: string;
  business_name: string | null;
  description: string | null;
  is_activated: boolean | null;
  qr_code: string;
  slug: string | null;
  created_at: string | null;
}

export default function MyProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [petTags, setPetTags] = useState<PetTag[]>([]);
  const [displays, setDisplays] = useState<BusinessDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    setLoading(true);
    
    // Fetch pet tags belonging to this user
    const { data: tagsData, error: tagsError } = await supabase
      .from('pet_tags')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (tagsError) {
      toast.error('Erro ao carregar tags pet');
    } else {
      setPetTags(tagsData || []);
    }
    
    // Fetch business displays belonging to this user
    const { data: displaysData, error: displaysError } = await supabase
      .from('business_displays')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (displaysError) {
      toast.error('Erro ao carregar displays');
    } else {
      setDisplays(displaysData || []);
    }
    
    setLoading(false);
  };

  const filteredTags = petTags.filter(tag => 
    tag.qr_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.pet_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDisplays = displays.filter(display => 
    display.qr_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    display.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    display.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProducts = petTags.length + displays.length;
  const activatedProducts = petTags.filter(t => t.is_activated).length + displays.filter(d => d.is_activated).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Meus Produtos</h1>
            <p className="text-muted-foreground">
              {totalProducts} produto(s) • {activatedProducts} ativado(s)
            </p>
          </div>
          <Button variant="hero" onClick={() => navigate('/dashboard/activate')}>
            <QrCode className="w-4 h-4 mr-2" />
            Ativar Produto
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nome ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 rounded-xl text-center"
          >
            <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold text-foreground">{totalProducts}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4 rounded-xl text-center"
          >
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold text-foreground">{activatedProducts}</div>
            <div className="text-sm text-muted-foreground">Ativos</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4 rounded-xl text-center"
          >
            <Dog className="w-8 h-8 mx-auto mb-2 text-orange-400" />
            <div className="text-2xl font-bold text-foreground">{petTags.length}</div>
            <div className="text-sm text-muted-foreground">Tags Pet</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-4 rounded-xl text-center"
          >
            <Building2 className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <div className="text-2xl font-bold text-foreground">{displays.length}</div>
            <div className="text-sm text-muted-foreground">Displays</div>
          </motion.div>
        </div>

        {/* Products Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all">Todos ({totalProducts})</TabsTrigger>
            <TabsTrigger value="tags">Tags Pet ({petTags.length})</TabsTrigger>
            <TabsTrigger value="displays">Displays ({displays.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {totalProducts === 0 ? (
              <EmptyState onActivate={() => navigate('/dashboard/activate')} />
            ) : (
              <div className="space-y-4">
                {filteredTags.map((tag) => (
                  <ProductCard
                    key={tag.id}
                    type="pet"
                    name={tag.pet_name || 'Pet sem nome'}
                    code={tag.qr_code}
                    isActivated={tag.is_activated || false}
                    slug={tag.slug}
                    onEdit={() => navigate('/dashboard/tags')}
                  />
                ))}
                {filteredDisplays.map((display) => (
                  <ProductCard
                    key={display.id}
                    type="display"
                    name={display.business_name || 'Display sem nome'}
                    code={display.qr_code}
                    isActivated={display.is_activated || false}
                    slug={display.slug}
                    onEdit={() => navigate('/dashboard/displays')}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tags">
            {petTags.length === 0 ? (
              <EmptyState type="tags" onActivate={() => navigate('/dashboard/activate')} />
            ) : (
              <div className="space-y-4">
                {filteredTags.map((tag) => (
                  <ProductCard
                    key={tag.id}
                    type="pet"
                    name={tag.pet_name || 'Pet sem nome'}
                    code={tag.qr_code}
                    isActivated={tag.is_activated || false}
                    slug={tag.slug}
                    onEdit={() => navigate('/dashboard/tags')}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="displays">
            {displays.length === 0 ? (
              <EmptyState type="displays" onActivate={() => navigate('/dashboard/activate')} />
            ) : (
              <div className="space-y-4">
                {filteredDisplays.map((display) => (
                  <ProductCard
                    key={display.id}
                    type="display"
                    name={display.business_name || 'Display sem nome'}
                    code={display.qr_code}
                    isActivated={display.is_activated || false}
                    slug={display.slug}
                    onEdit={() => navigate('/dashboard/displays')}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface ProductCardProps {
  type: 'pet' | 'display';
  name: string;
  code: string;
  isActivated: boolean;
  slug: string | null;
  onEdit: () => void;
}

function ProductCard({ type, name, code, isActivated, slug, onEdit }: ProductCardProps) {
  const navigate = useNavigate();
  const Icon = type === 'pet' ? Dog : Building2;
  const colorClass = type === 'pet' ? 'text-orange-400 bg-orange-500/20' : 'text-blue-400 bg-blue-500/20';
  const publicUrl = type === 'pet' ? `/pet/${code}` : `/display/${code}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 rounded-xl flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="font-medium text-foreground">{name}</div>
          <div className="text-sm text-muted-foreground font-mono">{code}</div>
          <div className="flex items-center gap-2 mt-1">
            {isActivated ? (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <CheckCircle2 className="w-3 h-3" />
                Ativado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-yellow-500">
                <Clock className="w-3 h-3" />
                Aguardando ativação
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isActivated && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(publicUrl, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Ver página
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
        >
          <Edit className="w-4 h-4 mr-1" />
          Editar
        </Button>
        {!isActivated && (
          <Button
            variant="hero"
            size="sm"
            onClick={() => navigate('/dashboard/activate')}
          >
            Ativar
          </Button>
        )}
      </div>
    </motion.div>
  );
}

interface EmptyStateProps {
  type?: 'tags' | 'displays';
  onActivate: () => void;
}

function EmptyState({ type, onActivate }: EmptyStateProps) {
  const Icon = type === 'tags' ? Dog : type === 'displays' ? Building2 : Package;
  const message = type === 'tags' 
    ? 'Nenhuma tag pet encontrada' 
    : type === 'displays' 
      ? 'Nenhum display encontrado'
      : 'Nenhum produto encontrado';

  return (
    <div className="text-center py-12">
      <Icon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">{message}</h3>
      <p className="text-muted-foreground mb-6">
        Compre um produto e ative-o usando o código único do manual.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" onClick={() => window.location.href = '/loja'}>
          Ir para Loja
        </Button>
        <Button variant="hero" onClick={onActivate}>
          Ativar Produto
        </Button>
      </div>
    </div>
  );
}
