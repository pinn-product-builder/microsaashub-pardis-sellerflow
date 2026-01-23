
import { Calculator, ShoppingCart, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const activityIcons = {
  quote: Calculator,
  sale: ShoppingCart,
  customer: Users,
  default: Clock
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export default function RecentActivity() {
  const { data: activities = [] } = useQuery({
    queryKey: ['recent-activity-vtex'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vtex_quote_events')
        .select('id,event_type,message,created_at,quote_id,to_status,quote:vtex_quotes(quote_number,total,vtex_client_id,client:vtex_clients(md_id,company_name))')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      const rows = (data ?? []) as any[];

      return rows.map((r) => {
        const quoteNumber = r.quote?.quote_number ?? '';
        const clientName = r.quote?.client?.company_name ?? 'Cliente';
        const total = Number(r.quote?.total ?? 0);

        let type: keyof typeof activityIcons = 'quote';
        if (r.event_type === 'vtex_send') type = 'sale';
        if (r.event_type === 'note') type = 'quote';
        if (r.event_type === 'approval') type = 'quote';

        const descBase = quoteNumber ? `Cotação #${quoteNumber}` : 'Cotação';
        const status = r.to_status ? ` → ${String(r.to_status)}` : '';
        const msg = r.message ? `: ${r.message}` : '';

        return {
          id: r.id,
          type,
          description: `${descBase} (${clientName})${status}${msg}`,
          time: formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR }),
          value: total ? formatCurrency(total) : '',
        };
      });
    },
  });

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Atividade Recente</CardTitle>
        <CardDescription>
          Últimas movimentações do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity: any) => {
            const Icon = activityIcons[activity.type as keyof typeof activityIcons] || activityIcons.default;
            
            return (
              <div key={activity.id} className="flex items-center space-x-4">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium leading-none">
                    {activity.description}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.time}
                  </p>
                </div>
                <div className="text-sm font-medium">
                  {activity.value}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
