import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Eye, MousePointer, MapPin, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardAnalyticsProps {
  petTagIds?: string[];
  displayIds?: string[];
  showAll?: boolean; // Admin mode - fetch all scans
}

interface ScanData {
  id: string;
  scanned_at: string;
  pet_tag_id: string | null;
  display_id: string | null;
  city: string | null;
  country: string | null;
}

interface AnalyticsData {
  totalScans: number;
  petTagScans: number;
  displayScans: number;
  scansByDay: { date: string; petTags: number; displays: number }[];
  topLocations: { name: string; count: number }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function DashboardAnalytics({ petTagIds = [], displayIds = [], showAll = false }: DashboardAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (showAll || petTagIds.length > 0 || displayIds.length > 0) {
      fetchAnalytics();
    } else {
      setLoading(false);
    }
  }, [petTagIds, displayIds, showAll]);

  const fetchAnalytics = async () => {
    try {
      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30).toISOString();

      let query = supabase
        .from('qr_scans')
        .select('*')
        .gte('scanned_at', thirtyDaysAgo);

      // If not showAll, filter by specific IDs
      if (!showAll) {
        if (petTagIds.length > 0 && displayIds.length > 0) {
          query = query.or(`pet_tag_id.in.(${petTagIds.join(',')}),display_id.in.(${displayIds.join(',')})`);
        } else if (petTagIds.length > 0) {
          query = query.in('pet_tag_id', petTagIds);
        } else if (displayIds.length > 0) {
          query = query.in('display_id', displayIds);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const scans = (data || []) as ScanData[];

      // Calculate metrics
      const petTagScans = scans.filter(s => s.pet_tag_id).length;
      const displayScans = scans.filter(s => s.display_id).length;

      // Scans by day (last 7 days)
      const scansByDay = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(today, 6 - i);
        const dayScans = scans.filter(s => {
          const scanDate = new Date(s.scanned_at);
          return scanDate >= startOfDay(date) && scanDate <= endOfDay(date);
        });
        return {
          date: format(date, 'EEE', { locale: ptBR }),
          petTags: dayScans.filter(s => s.pet_tag_id).length,
          displays: dayScans.filter(s => s.display_id).length,
        };
      });

      // Top locations
      const locationCounts = scans.reduce((acc, scan) => {
        const location = scan.city || scan.country || 'Desconhecido';
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topLocations = Object.entries(locationCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAnalytics({
        totalScans: scans.length,
        petTagScans,
        displayScans,
        scansByDay,
        topLocations,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!analytics || (!showAll && petTagIds.length === 0 && displayIds.length === 0)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 rounded-xl text-center"
      >
        <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Sem dados de analytics</h3>
        <p className="text-muted-foreground">
          Quando seus QR Codes forem escaneados, você verá estatísticas aqui.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{analytics.totalScans}</p>
              <p className="text-sm text-muted-foreground">Scans totais (30d)</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <MousePointer className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{analytics.petTagScans}</p>
              <p className="text-sm text-muted-foreground">Scans Tags Pet</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <MousePointer className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{analytics.displayScans}</p>
              <p className="text-sm text-muted-foreground">Scans Displays</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Scans Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-6 rounded-xl"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Scans por Dia (7 dias)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.scansByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Bar dataKey="petTags" name="Tags Pet" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="displays" name="Displays" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Locations */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-6 rounded-xl"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">
            <MapPin className="w-5 h-5 inline mr-2 text-primary" />
            Top Regiões
          </h3>
          {analytics.topLocations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Sem dados de localização</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.topLocations.map((location, index) => (
                <div key={location.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-foreground">{location.name}</span>
                  </div>
                  <span className="text-muted-foreground font-medium">{location.count} scans</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
