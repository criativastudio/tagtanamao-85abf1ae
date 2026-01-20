import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  Eye,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Search,
  Filter,
  Download,
  FileText,
  Printer,
  MapPin,
  User,
  Mail,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Order, OrderItem } from '@/types/ecommerce';

interface OrderWithItems extends Order {
  items?: OrderItem[];
  profile?: {
    email: string | null;
    full_name: string | null;
    phone: string | null;
  };
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  payment_confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  in_production: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  shipped: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  delivered: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  payment_confirmed: 'Pago',
  in_production: 'Em Produção',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const paymentStatusLabels: Record<string, string> = {
  pending: 'Aguardando',
  confirmed: 'Confirmado',
  failed: 'Falhou',
  refunded: 'Reembolsado',
};

export default function OrdersManager() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);

  useEffect(() => {
    if (!loading && profile && !profile.is_admin) {
      navigate('/dashboard');
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profile:profiles(email, full_name, phone)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar pedidos',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setOrders((data || []).map(order => ({
        ...order,
        profile: Array.isArray(order.profile) ? order.profile[0] : order.profile
      })));
    }
    
    setLoadingOrders(false);
  };

  const fetchOrderItems = async (orderId: string) => {
    const { data } = await supabase
      .from('order_items')
      .select(`
        *,
        product:products(*)
      `)
      .eq('order_id', orderId);
    
    return data || [];
  };

  const handleViewOrder = async (order: OrderWithItems) => {
    const items = await fetchOrderItems(order.id);
    setSelectedOrder({ ...order, items });
    setShowOrderDialog(true);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Status atualizado',
        description: `Pedido atualizado para ${statusLabels[newStatus]}`,
      });
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    }
  };

  const handleUpdateTracking = async (orderId: string, trackingCode: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ 
        tracking_code: trackingCode, 
        status: 'shipped',
        updated_at: new Date().toISOString() 
      })
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Erro ao atualizar rastreio',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Código de rastreio salvo',
        description: 'Cliente será notificado sobre o envio.',
      });
      fetchOrders();
    }
  };

  const filteredOrders = orders.filter(order => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      order.id.toLowerCase().includes(term) ||
      order.shipping_name?.toLowerCase().includes(term) ||
      order.shipping_phone?.toLowerCase().includes(term) ||
      order.profile?.email?.toLowerCase().includes(term) ||
      order.profile?.full_name?.toLowerCase().includes(term) ||
      order.profile?.phone?.toLowerCase().includes(term) ||
      order.tracking_code?.toLowerCase().includes(term);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const generateShippingLabel = (order: OrderWithItems) => {
    const labelWindow = window.open('', '_blank');
    if (!labelWindow) {
      toast({
        title: 'Erro',
        description: 'Permita pop-ups para gerar a etiqueta.',
        variant: 'destructive'
      });
      return;
    }

    const labelContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta - Pedido #${order.id.slice(0, 8)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            max-width: 400px;
            margin: 0 auto;
          }
          .label { 
            border: 2px solid #000; 
            padding: 20px; 
            border-radius: 8px;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px dashed #000; 
            padding-bottom: 15px; 
            margin-bottom: 15px; 
          }
          .logo { font-size: 24px; font-weight: bold; }
          .order-id { font-size: 14px; color: #666; margin-top: 5px; }
          .section { margin-bottom: 15px; }
          .section-title { 
            font-size: 12px; 
            font-weight: bold; 
            color: #666; 
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .recipient { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 5px; 
          }
          .address { font-size: 14px; line-height: 1.5; }
          .contact { font-size: 12px; color: #666; margin-top: 5px; }
          .barcode { 
            text-align: center; 
            border-top: 2px dashed #000; 
            padding-top: 15px; 
            margin-top: 15px;
            font-family: monospace;
            font-size: 16px;
            letter-spacing: 2px;
          }
          .tracking { 
            font-size: 12px; 
            color: #666; 
            margin-top: 5px; 
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="header">
            <div class="logo">🐾 QRPet</div>
            <div class="order-id">Pedido #${order.id.slice(0, 8)}</div>
          </div>
          
          <div class="section">
            <div class="section-title">Destinatário</div>
            <div class="recipient">${order.shipping_name || 'N/A'}</div>
            <div class="address">
              ${order.shipping_address || ''}<br/>
              ${order.shipping_city || ''} - ${order.shipping_state || ''}<br/>
              CEP: ${order.shipping_zip || ''}
            </div>
            <div class="contact">
              Tel: ${order.shipping_phone || 'N/A'}
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Remetente</div>
            <div class="address">
              QRPet - Tag na Mão<br/>
              contato@qrpet.com.br
            </div>
          </div>
          
          ${order.tracking_code ? `
            <div class="barcode">
              ${order.tracking_code}
              <div class="tracking">Código de Rastreio</div>
            </div>
          ` : ''}
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
            🖨️ Imprimir Etiqueta
          </button>
        </div>
      </body>
      </html>
    `;

    labelWindow.document.write(labelContent);
    labelWindow.document.close();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Pedidos</h1>
            <p className="text-muted-foreground">Gerencie pedidos, pagamentos e envios</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {Object.entries(statusLabels).map(([key, label]) => {
            const count = orders.filter(o => o.status === key).length;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 rounded-xl text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setStatusFilter(key)}
              >
                <div className="text-2xl font-bold text-foreground">{count}</div>
                <div className="text-sm text-muted-foreground">{label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, nome, telefone, e-mail ou rastreio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => setSearchTerm('')} disabled={!searchTerm}>
              Limpar
            </Button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingOrders ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">
                      #{order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.shipping_name || order.profile?.full_name || '-'}</p>
                        <p className="text-xs text-muted-foreground">{order.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatCurrency(order.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status || 'pending']}>
                        {statusLabels[order.status || 'pending']}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {paymentStatusLabels[order.payment_status || 'pending']}
                      </Badge>
                    </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => generateShippingLabel(order)}
                            title="Gerar etiqueta"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Order Details Dialog */}
        <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Pedido #{selectedOrder?.id.slice(0, 8)}
              </DialogTitle>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Status Actions */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground mr-2">Alterar status:</span>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={selectedOrder.status === key ? 'default' : 'outline'}
                      onClick={() => handleUpdateStatus(selectedOrder.id, key)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Cliente
                    </h3>
                    <div className="text-sm space-y-1 bg-muted/30 p-4 rounded-lg">
                      <p><strong>Nome:</strong> {selectedOrder.shipping_name || '-'}</p>
                      <p><strong>Email:</strong> {selectedOrder.profile?.email || '-'}</p>
                      <p><strong>Telefone:</strong> {selectedOrder.shipping_phone || '-'}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Endereço de Entrega
                    </h3>
                    <div className="text-sm space-y-1 bg-muted/30 p-4 rounded-lg">
                      <p>{selectedOrder.shipping_address}</p>
                      <p>{selectedOrder.shipping_city} - {selectedOrder.shipping_state}</p>
                      <p>CEP: {selectedOrder.shipping_zip}</p>
                    </div>
                  </div>
                </div>

                {/* Tracking */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Rastreamento</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Código de rastreio"
                      defaultValue={selectedOrder.tracking_code || ''}
                      id="tracking-input"
                    />
                    <Button
                      onClick={() => {
                        const input = document.getElementById('tracking-input') as HTMLInputElement;
                        handleUpdateTracking(selectedOrder.id, input.value);
                      }}
                    >
                      Salvar
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => generateShippingLabel(selectedOrder)}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Etiqueta
                    </Button>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Itens do Pedido</h3>
                  <div className="bg-muted/30 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Preço Unit.</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.product?.name || 'Produto'}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell>{formatCurrency(item.unit_price * item.quantity)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedOrder.total_amount - (selectedOrder.shipping_cost || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frete ({selectedOrder.shipping_method || 'N/A'}):</span>
                    <span>{formatCurrency(selectedOrder.shipping_cost || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
                    <span>Total:</span>
                    <span className="text-primary">{formatCurrency(selectedOrder.total_amount)}</span>
                  </div>
                </div>

                {/* Payment Link */}
                {selectedOrder.asaas_payment_link && (
                  <div className="flex gap-2">
                    <Input
                      value={selectedOrder.asaas_payment_link}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedOrder.asaas_payment_link || '');
                        toast({ title: 'Link copiado!' });
                      }}
                    >
                      Copiar Link
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
