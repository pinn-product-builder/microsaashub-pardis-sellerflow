
import { TrendingUp, TrendingDown, Calculator, ShoppingCart, Percent, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardStats } from '@/data/dashboardData';

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

const formatters = {
  cotacaosMes: (value: number) => value.toString(),
  vendasRealizadas: (value: number) => value.toString(),
  margemMedia: (value: number) => `${value}%`,
  ticketMedio: (value: number) => `R$ ${(value / 1000).toFixed(1)}k`
};

export default function DashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Object.entries(dashboardStats).map(([key, stat]) => {
        const Icon = icons[key as keyof typeof icons];
        const title = titles[key as keyof typeof titles];
        const formatter = formatters[key as keyof typeof formatters];
        const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;

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
                {formatter(stat.value)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendIcon className={`mr-1 h-3 w-3 ${
                  stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                }`} />
                {stat.change > 0 ? '+' : ''}{stat.change}% em relação ao mês anterior
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
