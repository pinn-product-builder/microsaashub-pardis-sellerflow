
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Link } from "react-router-dom";
import { Calculator, FileText, TrendingUp, Users } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard de Cotações</h2>
      </div>
      
      <DashboardStats />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Vendas Mensais</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <SalesChart />
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Vendas por Categoria</CardTitle>
            <CardDescription>
              Distribuição de vendas por categoria de produto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryChart />
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
            <CardDescription>
              Últimas atividades do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesse rapidamente as principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link to="/cpq/nova-cotacao">
                <Calculator className="mr-2 h-4 w-4" />
                Nova Cotação
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/cpq/historico">
                <FileText className="mr-2 h-4 w-4" />
                Ver Histórico
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/cpq">
                <TrendingUp className="mr-2 h-4 w-4" />
                Dashboard Cotações
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
