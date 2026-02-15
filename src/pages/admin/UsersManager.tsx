import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ExternalLink, Eye, BarChart3, ShoppingBag, Globe, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  created_at: string | null;
}

interface Order {
  id: string;
  total_amount: number;
  status: string | null;
  created_at: string | null;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    products: { name: string; type: string } | null;
  }[];
}

interface PetTag {
  id: string;
  qr_code: string;
  pet_name: string | null;
  is_activated: boolean | null;
  slug: string | null;
}

interface Display {
  id: string;
  qr_code: string;
  business_name: string | null;
  is_activated: boolean | null;
  slug: string | null;
}

interface BioPage {
  id: string;
  slug: string;
  title: string;
  is_active: boolean | null;
}

interface AnalyticsEvent {
  event_type: string;
  button_id: string | null;
  created_at: string;
}

interface QrScan {
  scanned_at: string | null;
}

export default function UsersManager() {
  const navigate = useNavigate();
  const { profile: currentProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [ordersMap, setOrdersMap] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  // Detail states
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userPetTags, setUserPetTags] = useState<PetTag[]>([]);
  const [userDisplays, setUserDisplays] = useState<Display[]>([]);
  const [userBioPages, setUserBioPages] = useState<BioPage[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<AnalyticsEvent[]>([]);
  const [userScans, setUserScans] = useState<QrScan[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (currentProfile?.is_admin) {
      fetchUsers();
    }
  }, [currentProfile]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, whatsapp, created_at')
      .order('created_at', { ascending: false });

    if (profilesData) {
      setProfiles(profilesData);
      // Check which users have orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('user_id')
        .not('user_id', 'is', null);
      
      const map: Record<string, boolean> = {};
      ordersData?.forEach(o => { if (o.user_id) map[o.user_id] = true; });
      setOrdersMap(map);
    }
    setLoading(false);
  };

  const fetchUserDetails = async (userId: string) => {
    setLoadingDetails(true);

    const [ordersRes, petRes, displayRes, bioRes] = await Promise.all([
      supabase.from('orders').select('id, total_amount, status, created_at, order_items(id, quantity, unit_price, products(name, type))').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('pet_tags').select('id, qr_code, pet_name, is_activated, slug').eq('user_id', userId),
      supabase.from('business_displays').select('id, qr_code, business_name, is_activated, slug').eq('user_id', userId),
      supabase.from('bio_pages').select('id, slug, title, is_active').eq('user_id', userId),
    ]);

    setUserOrders((ordersRes.data as any) || []);
    setUserPetTags(petRes.data || []);
    setUserDisplays(displayRes.data || []);
    setUserBioPages(bioRes.data || []);

    // Fetch analytics for bio pages
    const bioIds = bioRes.data?.map(b => b.id) || [];
    if (bioIds.length > 0) {
      const { data: analyticsData } = await supabase
        .from('bio_page_analytics')
        .select('event_type, button_id, created_at')
        .in('bio_page_id', bioIds);
      setUserAnalytics(analyticsData || []);
    } else {
      setUserAnalytics([]);
    }

    // Fetch QR scans
    const petIds = petRes.data?.map(p => p.id) || [];
    const displayIds = displayRes.data?.map(d => d.id) || [];
    
    let allScans: QrScan[] = [];
    if (petIds.length > 0) {
      const { data } = await supabase.from('qr_scans').select('scanned_at').in('pet_tag_id', petIds);
      if (data) allScans = [...allScans, ...data];
    }
    if (displayIds.length > 0) {
      const { data } = await supabase.from('qr_scans').select('scanned_at').in('display_id', displayIds);
      if (data) allScans = [...allScans, ...data];
    }
    setUserScans(allScans);

    setLoadingDetails(false);
  };

  const selectUser = (user: Profile) => {
    setSelectedUser(user);
    fetchUserDetails(user.id);
  };

  const filteredProfiles = useMemo(() => {
    if (!search.trim()) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(p =>
      (p.full_name?.toLowerCase().includes(q)) ||
      (p.email?.toLowerCase().includes(q)) ||
      (p.id.toLowerCase().includes(q))
    );
  }, [profiles, search]);

  // Analytics computations
  const totalViews = userAnalytics.filter(a => a.event_type === 'view').length + userScans.length;
  const totalClicks = userAnalytics.filter(a => a.event_type === 'click').length;

  const topButtons = useMemo(() => {
    const counts: Record<string, number> = {};
    userAnalytics.filter(a => a.event_type === 'click' && a.button_id).forEach(a => {
      counts[a.button_id!] = (counts[a.button_id!] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [userAnalytics]);

  const peakHours = useMemo(() => {
    const hours: Record<number, number> = {};
    [...userAnalytics, ...userScans.map(s => ({ created_at: s.scanned_at || '' }))].forEach(e => {
      const h = new Date(e.created_at).getHours();
      if (!isNaN(h)) hours[h] = (hours[h] || 0) + 1;
    });
    return Object.entries(hours).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 3).map(([h, c]) => ({ hour: Number(h), count: c }));
  }, [userAnalytics, userScans]);

  if (!currentProfile?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Acesso não autorizado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/configuracoes')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User list */}
          <div className="lg:col-span-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou código..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[calc(100vh-220px)]">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProfiles.map(p => (
                    <Card
                      key={p.id}
                      className={`cursor-pointer transition-colors hover:border-primary/50 ${selectedUser?.id === p.id ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => selectUser(p)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{p.full_name || 'Sem nome'}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                          </div>
                          <Badge variant={ordersMap[p.id] ? 'default' : 'secondary'} className="ml-2 shrink-0">
                            {ordersMap[p.id] ? 'Comprou' : 'Não comprou'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredProfiles.length === 0 && (
                    <p className="text-center text-muted-foreground py-6">Nenhum usuário encontrado.</p>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* User details */}
          <div className="lg:col-span-2">
            {!selectedUser ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Selecione um usuário para ver detalhes.</p>
              </div>
            ) : loadingDetails ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{selectedUser.full_name || 'Sem nome'}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    {selectedUser.phone && <p className="text-xs text-muted-foreground">Tel: {selectedUser.phone}</p>}
                  </CardHeader>
                </Card>

                <Tabs defaultValue="orders">
                  <TabsList className="w-full grid grid-cols-4">
                    <TabsTrigger value="orders"><ShoppingBag className="w-4 h-4 mr-1" />Pedidos</TabsTrigger>
                    <TabsTrigger value="pages"><Globe className="w-4 h-4 mr-1" />Páginas</TabsTrigger>
                    <TabsTrigger value="metrics"><BarChart3 className="w-4 h-4 mr-1" />Métricas</TabsTrigger>
                    <TabsTrigger value="access"><Eye className="w-4 h-4 mr-1" />Acesso</TabsTrigger>
                  </TabsList>

                  <TabsContent value="orders" className="mt-4">
                    {userOrders.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4 text-center">Nenhum pedido encontrado.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pedido</TableHead>
                            <TableHead>Itens</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userOrders.map(order => (
                            <TableRow key={order.id}>
                              <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                              <TableCell>
                                {order.order_items?.map(item => (
                                  <div key={item.id} className="text-xs">
                                    {item.products?.name || 'Produto'} x{item.quantity}
                                  </div>
                                ))}
                              </TableCell>
                              <TableCell>R$ {order.total_amount.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant={order.status === 'paid' ? 'default' : 'secondary'}>
                                  {order.status || 'pending'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  <TabsContent value="pages" className="mt-4 space-y-4">
                    {/* Pet Tags */}
                    {userPetTags.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Tags Pet</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                          {userPetTags.map(tag => (
                            <div key={tag.id} className="flex items-center justify-between text-sm">
                              <span>{tag.pet_name || tag.qr_code}</span>
                              <a href={`/pet/${tag.qr_code}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                Abrir <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Displays */}
                    {userDisplays.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Displays Empresariais</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                          {userDisplays.map(d => (
                            <div key={d.id} className="flex items-center justify-between text-sm">
                              <span>{d.business_name || d.qr_code}</span>
                              <a href={`/display/${d.qr_code}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                Abrir <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Bio Pages */}
                    {userBioPages.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Bio Pages</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                          {userBioPages.map(bio => (
                            <div key={bio.id} className="flex items-center justify-between text-sm">
                              <span>{bio.title} ({bio.slug})</span>
                              <a href={`/bio/${bio.slug}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                Abrir <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {userPetTags.length === 0 && userDisplays.length === 0 && userBioPages.length === 0 && (
                      <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma página encontrada.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="metrics" className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold">{totalViews}</p>
                          <p className="text-xs text-muted-foreground">Visualizações</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold">{totalClicks}</p>
                          <p className="text-xs text-muted-foreground">Cliques</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold">{userScans.length}</p>
                          <p className="text-xs text-muted-foreground">QR Scans</p>
                        </CardContent>
                      </Card>
                    </div>

                    {topButtons.length > 0 && (
                      <Card className="mt-4">
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Botões Mais Clicados</CardTitle></CardHeader>
                        <CardContent>
                          {topButtons.map(([name, count]) => (
                            <div key={name} className="flex justify-between text-sm py-1 border-b last:border-0">
                              <span>{name}</span>
                              <span className="text-muted-foreground">{count} cliques</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {peakHours.length > 0 && (
                      <Card className="mt-4">
                        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Clock className="w-4 h-4" /> Horários de Pico</CardTitle></CardHeader>
                        <CardContent>
                          {peakHours.map(({ hour, count }) => (
                            <div key={hour} className="flex justify-between text-sm py-1 border-b last:border-0">
                              <span>{hour}h - {hour + 1}h</span>
                              <span className="text-muted-foreground">{count} acessos</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="access" className="mt-4">
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        {userBioPages.map(bio => (
                          <Button key={bio.id} variant="outline" className="w-full justify-start" asChild>
                            <a href={`/bio/${bio.slug}`} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4 mr-2" /> Ver página: {bio.title}
                            </a>
                          </Button>
                        ))}
                        {userPetTags.map(tag => (
                          <Button key={tag.id} variant="outline" className="w-full justify-start" asChild>
                            <a href={`/pet/${tag.qr_code}`} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4 mr-2" /> Ver pet: {tag.pet_name || tag.qr_code}
                            </a>
                          </Button>
                        ))}
                        {userDisplays.map(d => (
                          <Button key={d.id} variant="outline" className="w-full justify-start" asChild>
                            <a href={`/display/${d.qr_code}`} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4 mr-2" /> Ver display: {d.business_name || d.qr_code}
                            </a>
                          </Button>
                        ))}
                        {userBioPages.length === 0 && userPetTags.length === 0 && userDisplays.length === 0 && (
                          <p className="text-muted-foreground text-sm text-center">Nenhuma página disponível.</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
