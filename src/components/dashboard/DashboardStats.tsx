
import { TrendingUp, TrendingDown, Calculator, ShoppingCart, Percent, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const icons = {
  cotacaosMes: Calculator,
  vendasRealizadas: ShoppingCart,
  margemMedia: Percent,
  ticketMedio: DollarSign
};

const titles = {
  cotacaosMes: 'Cotações do Mês',
  vendasRealizadas: 'Vendas Realizadas',
  margemMedia: 'Margem Média',
  ticketMedio: 'Ticket Médio'
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
}

export default function DashboardStats() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats-vtex'],
    queryFn: async () => {
      const now = new Date();
      const curStart = monthStart(now);
      const prevStart = monthStart(addMonths(now, -1));

      // Puxamos só os últimos 2 meses para calcular variação
      const { data, error } = await (supabase as any)
        .from('vtex_quotes')
        .select('created_at,status,total,total_margin_percent,vtex_order_id')
        .gte('created_at', prevStart.toISOString());

      if (error) throw error;
      const rows = (data ?? []) as any[];

      const isCur = (r: any) => new Date(r.created_at) >= curStart;
      const isPrev = (r: any) => new Date(r.created_at) >= prevStart && new Date(r.created_at) < curStart;

      const cur = rows.filter(isCur);
      const prev = rows.filter(isPrev);

      const countQuotes = (arr: any[]) => arr.length;
      const countSales = (arr: any[]) =>
        arr.filter((r) => r.vtex_order_id || r.status === 'sent' || r.status === 'converted').length;
      const avgMargin = (arr: any[]) => {
        const vals = arr.map((r) => Number(r.total_margin_percent)).filter((n) => Number.isFinite(n));
        if (!vals.length) return 0;
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      };
      const avgTicket = (arr: any[]) => {
        const vals = arr.map((r) => Number(r.total)).filter((n) => Number.isFinite(n));
        if (!vals.length) return 0;
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      };

      const curStats = {
        cotacaosMes: countQuotes(cur),
        vendasRealizadas: countSales(cur),
        margemMedia: avgMargin(cur),
        ticketMedio: avgTicket(cur),
      };
      const prevStats = {
        cotacaosMes: countQuotes(prev),
        vendasRealizadas: countSales(prev),
        margemMedia: avgMargin(prev),
        ticketMedio: avgTicket(prev),
      };

      const pct = (curV: number, prevV: number) => {
        if (!prevV) return curV ? 100 : 0;
        return ((curV - prevV) / prevV) * 100;
      };

      return {
        cotacaosMes: {
          value: curStats.cotacaosMes,
          change: pct(curStats.cotacaosMes, prevStats.cotacaosMes),
          trend: curStats.cotacaosMes >= prevStats.cotacaosMes ? 'up' : 'down',
        },
        vendasRealizadas: {
          value: curStats.vendasRealizadas,
          change: pct(curStats.vendasRealizadas, prevStats.vendasRealizadas),
          trend: curStats.vendasRealizadas >= prevStats.vendasRealizadas ? 'up' : 'down',
        },
        margemMedia: {
          value: curStats.margemMedia,
          change: pct(curStats.margemMedia, prevStats.margemMedia),
          trend: curStats.margemMedia >= prevStats.margemMedia ? 'up' : 'down',
        },
        ticketMedio: {
          value: curStats.ticketMedio,
          change: pct(curStats.ticketMedio, prevStats.ticketMedio),
          trend: curStats.ticketMedio >= prevStats.ticketMedio ? 'up' : 'down',
        },
      };
    },
  });

  const formatters = {
    cotacaosMes: (value: number) => String(Math.round(value || 0)),
    vendasRealizadas: (value: number) => String(Math.round(value || 0)),
    margemMedia: (value: number) => `${(value || 0).toFixed(1)}%`,
    ticketMedio: (value: number) => formatCurrency(value || 0),
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Object.entries(stats ?? {}).map(([key, stat]) => {
        const Icon = icons[key as keyof typeof icons];
        const title = titles[key as keyof typeof titles];
        const formatter = formatters[key as keyof typeof formatters];
        const TrendIcon = (stat as any).trend === 'up' ? TrendingUp : TrendingDown;

        return (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatter((stat as any).value)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendIcon className={`mr-1 h-3 w-3 ${
                  (stat as any).trend === 'up' ? 'text-green-500' : 'text-red-500'
                }`} />
                {Number((stat as any).change) > 0 ? '+' : ''}{Number((stat as any).change).toFixed(0)}% em relação ao mês anterior
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
