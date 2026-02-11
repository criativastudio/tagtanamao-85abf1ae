import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Receipt,
  Calendar,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(160 60% 60%)',
  'hsl(200 80% 55%)',
  'hsl(40 90% 55%)',
  'hsl(280 70% 60%)',
  'hsl(0 70% 55%)',
];

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const VALID_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];

export default function FinancialDashboard() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [productFilter, setProductFilter] = useState('all');
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const setPreset = (days: number) => {
    setStartDate(format(subDays(new Date(), days), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
  };

  // Fetch products for filter dropdown
  const { data: products } = useQuery({
    queryKey: ['financial-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch orders + items in the selected date range
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['financial-orders', startDate, endDate],
    queryFn: async () => {
      const { data: orders, error: oErr } = await supabase
        .from('orders')
        .select('id, total_amount, discount_amount, shipping_cost, status, payment_status, created_at')
        .in('status', VALID_STATUSES)
        .gte('created_at', startOfDay(parseISO(startDate)).toISOString())
        .lte('created_at', endOfDay(parseISO(endDate)).toISOString())
        .order('created_at', { ascending: true });

      if (oErr) throw oErr;
      if (!orders?.length) return { orders: [], items: [] };

      const orderIds = orders.map((o) => o.id);
      const { data: items, error: iErr } = await supabase
        .from('order_items')
        .select('id, order_id, product_id, quantity, unit_price')
        .in('order_id', orderIds);

      if (iErr) throw iErr;
      return { orders, items: items || [] };
    },
  });

  // Derived data
  const { orders, items } = ordersData || { orders: [], items: [] };

  const filteredItems = useMemo(() => {
    if (productFilter === 'all') return items;
    return items.filter((i) => i.product_id === productFilter);
  }, [items, productFilter]);

  const filteredOrderIds = useMemo(() => {
    if (productFilter === 'all') return new Set(orders.map((o) => o.id));
    return new Set(filteredItems.map((i) => i.order_id));
  }, [orders, filteredItems, productFilter]);

  const filteredOrders = useMemo(
    () => orders.filter((o) => filteredOrderIds.has(o.id)),
    [orders, filteredOrderIds],
  );

  // Summary cards
  const totals = useMemo(() => {
    const grossRevenue = filteredOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const totalDiscount = filteredOrders.reduce((s, o) => s + Number(o.discount_amount || 0), 0);
    const totalShipping = filteredOrders.reduce((s, o) => s + Number(o.shipping_cost || 0), 0);
    const netRevenue = grossRevenue - totalDiscount;
    const orderCount = filteredOrders.length;
    const avgTicket = orderCount ? grossRevenue / orderCount : 0;
    const itemsSold = filteredItems.reduce((s, i) => s + i.quantity, 0);
    return { grossRevenue, totalDiscount, totalShipping, netRevenue, orderCount, avgTicket, itemsSold };
  }, [filteredOrders, filteredItems]);

  // Revenue by day (bar chart)
  const revenueByDay = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      const day = format(parseISO(o.created_at!), 'yyyy-MM-dd');
      map[day] = (map[day] || 0) + Number(o.total_amount || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date: format(parseISO(date), 'dd/MM'), total }));
  }, [filteredOrders]);

  // Sales by product (pie chart)
  const salesByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    filteredItems.forEach((i) => {
      const name = products?.find((p) => p.id === i.product_id)?.name || 'Outro';
      map[name] = (map[name] || 0) + i.quantity * Number(i.unit_price);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredItems, products]);

  // Cumulative revenue line chart
  const cumulativeRevenue = useMemo(() => {
    let acc = 0;
    return revenueByDay.map((d) => {
      acc += d.total;
      return { date: d.date, acumulado: acc };
    });
  }, [revenueByDay]);

  // Consolidated table by product
  const consolidatedByProduct = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    filteredItems.forEach((i) => {
      const name = products?.find((p) => p.id === i.product_id)?.name || 'Outro';
      if (!map[name]) map[name] = { name, qty: 0, revenue: 0 };
      map[name].qty += i.quantity;
      map[name].revenue += i.quantity * Number(i.unit_price);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredItems, products]);

  if (authLoading) {
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

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--foreground))',
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Financeiro
          </h1>
          <p className="text-muted-foreground text-sm">Controle de vendas e análises</p>
        </div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-4 rounded-xl mb-6"
      >
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[180px]">
            <Label>Produto</Label>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                {products?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data inicial</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Data final</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreset(7)}>
              <Calendar className="w-3.5 h-3.5 mr-1" /> 7d
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPreset(30)}>
              <Calendar className="w-3.5 h-3.5 mr-1" /> 30d
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPreset(90)}>
              <Calendar className="w-3.5 h-3.5 mr-1" /> 90d
            </Button>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            <SummaryCard icon={DollarSign} label="Receita Bruta" value={BRL(totals.grossRevenue)} />
            <SummaryCard icon={TrendingUp} label="Receita Líquida" value={BRL(totals.netRevenue)} />
            <SummaryCard icon={ShoppingCart} label="Pedidos" value={String(totals.orderCount)} />
            <SummaryCard icon={Receipt} label="Ticket Médio" value={BRL(totals.avgTicket)} />
          </motion.div>

          {/* Charts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
          >
            {/* Revenue by day */}
            <div className="glass p-4 rounded-xl">
              <h3 className="text-lg font-semibold text-foreground mb-3">Receita por dia</h3>
              <div className="h-64">
                {revenueByDay.length === 0 ? (
                  <Empty />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip formatter={(v: number) => BRL(v)} contentStyle={tooltipStyle} />
                      <Bar dataKey="total" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Sales by product */}
            <div className="glass p-4 rounded-xl">
              <h3 className="text-lg font-semibold text-foreground mb-3">Vendas por produto</h3>
              <div className="h-64">
                {salesByProduct.length === 0 ? (
                  <Empty />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={salesByProduct} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} label={({ name }) => name}>
                        {salesByProduct.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => BRL(v)} contentStyle={tooltipStyle} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </motion.div>

          {/* Cumulative line chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass p-4 rounded-xl mb-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-3">Evolução acumulada</h3>
            <div className="h-64">
              {cumulativeRevenue.length === 0 ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cumulativeRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip formatter={(v: number) => BRL(v)} contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="acumulado" name="Receita acumulada" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Consolidated table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass p-4 rounded-xl"
          >
            <h3 className="text-lg font-semibold text-foreground mb-3">Resumo por produto</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd vendida</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consolidatedByProduct.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhuma venda no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  consolidatedByProduct.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right">{row.qty}</TableCell>
                      <TableCell className="text-right">{BRL(row.revenue)}</TableCell>
                    </TableRow>
                  ))
                )}
                {consolidatedByProduct.length > 0 && (
                  <TableRow className="font-bold border-t-2 border-border">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{totals.itemsSold}</TableCell>
                    <TableCell className="text-right">{BRL(totals.grossRevenue)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </motion.div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="glass p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function Empty() {
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
      Sem dados no período selecionado.
    </div>
  );
}
