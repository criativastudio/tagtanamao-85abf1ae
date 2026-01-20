import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, MousePointer, TrendingUp, Calendar } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BioAnalyticsProps {
  bioPageId: string;
}

interface AnalyticsData {
  totalViews: number;
  totalClicks: number;
  viewsToday: number;
  clicksToday: number;
  clicksByButton: { button_id: string; count: number }[];
  viewsByDay: { date: string; count: number }[];
}

export const BioAnalytics = ({ bioPageId }: BioAnalyticsProps) => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalViews: 0,
    totalClicks: 0,
    viewsToday: 0,
    clicksToday: 0,
    clicksByButton: [],
    viewsByDay: [],
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const today = new Date();
        const todayStart = startOfDay(today).toISOString();
        const todayEnd = endOfDay(today).toISOString();
        const sevenDaysAgo = subDays(today, 7).toISOString();

        // Fetch all analytics data
        const { data, error } = await supabase
          .from("bio_page_analytics")
          .select("*")
          .eq("bio_page_id", bioPageId)
          .gte("created_at", sevenDaysAgo);

        if (error) throw error;

        const events = data || [];

        // Calculate metrics
        const views = events.filter(e => e.event_type === 'view');
        const clicks = events.filter(e => e.event_type === 'click');
        const viewsToday = views.filter(e => 
          e.created_at >= todayStart && e.created_at <= todayEnd
        );
        const clicksToday = clicks.filter(e => 
          e.created_at >= todayStart && e.created_at <= todayEnd
        );

        // Clicks by button
        const clicksByButton = clicks.reduce((acc, click) => {
          const id = click.button_id || 'unknown';
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Views by day
        const viewsByDay = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(today, 6 - i);
          const dayViews = views.filter(v => {
            const vDate = new Date(v.created_at);
            return vDate >= startOfDay(date) && vDate <= endOfDay(date);
          });
          return {
            date: format(date, 'dd/MM', { locale: ptBR }),
            count: dayViews.length,
          };
        });

        setAnalytics({
          totalViews: views.length,
          totalClicks: clicks.length,
          viewsToday: viewsToday.length,
          clicksToday: clicksToday.length,
          clicksByButton: Object.entries(clicksByButton).map(([button_id, count]) => ({
            button_id,
            count,
          })),
          viewsByDay,
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [bioPageId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  const ctr = analytics.totalViews > 0 
    ? ((analytics.totalClicks / analytics.totalViews) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.totalViews}</p>
                <p className="text-xs text-muted-foreground">Visualizações (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <MousePointer className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.totalClicks}</p>
                <p className="text-xs text-muted-foreground">Cliques (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ctr}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Cliques</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Calendar className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.viewsToday}</p>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Views Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Visualizações por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {analytics.viewsByDay.map((day, index) => {
              const maxCount = Math.max(...analytics.viewsByDay.map(d => d.count), 1);
              const height = (day.count / maxCount) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                    style={{ 
                      height: `${Math.max(height, 4)}%`,
                      backgroundColor: 'hsl(var(--primary))',
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{day.date}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Buttons */}
      {analytics.clicksByButton.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cliques por Botão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.clicksByButton
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((item) => (
                  <div 
                    key={item.button_id} 
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <span className="text-sm truncate flex-1">
                      {item.button_id === 'unknown' ? 'Desconhecido' : item.button_id.substring(0, 8)}
                    </span>
                    <span className="font-medium">{item.count} cliques</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
