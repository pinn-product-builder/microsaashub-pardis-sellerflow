
import DashboardStats from '@/components/dashboard/DashboardStats';
import SalesChart from '@/components/dashboard/SalesChart';
import CategoryChart from '@/components/dashboard/CategoryChart';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, Plus, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link to="/cpq/nova-cotacao">
              <Plus className="mr-2 h-4 w-4" />
              Nova Cotação
            </Link>
          </Button>
        </div>
      </div>

      <DashboardStats />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <SalesChart />
        <CategoryChart />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <RecentActivity />
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesse rapidamente as principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Button asChild variant="outline" className="h-24 flex-col">
              <Link to="/cpq">
                <Calculator className="h-8 w-8 mb-2" />
                <span>Dashboard CPQ</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-24 flex-col">
              <Link to="/cpq/nova-cotacao">
                <Plus className="h-8 w-8 mb-2" />
                <span>Nova Cotação</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-24 flex-col">
              <Link to="/cpq/historico">
                <TrendingUp className="h-8 w-8 mb-2" />
                <span>Histórico</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-24 flex-col" disabled>
              <div className="h-8 w-8 mb-2 bg-muted rounded" />
              <span>Analytics (Em breve)</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
