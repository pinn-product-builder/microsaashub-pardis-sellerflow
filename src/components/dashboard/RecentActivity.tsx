
import { Calculator, ShoppingCart, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { recentActivities } from '@/data/dashboardData';

const activityIcons = {
  quote: Calculator,
  sale: ShoppingCart,
  customer: Users,
  default: Clock
};

export default function RecentActivity() {
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
          {recentActivities.map((activity) => {
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
