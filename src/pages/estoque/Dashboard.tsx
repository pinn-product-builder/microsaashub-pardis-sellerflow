import { useEffect, useState } from 'react';
import { 
  Package, 
  Warehouse, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  Archive,
  Clock,
  CheckCircle
} from 'lucide-react';
import { inventoryService } from '@/services/inventoryService';
import { useInventoryStore } from '@/stores/inventoryStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function EstoqueDashboard() {
  const { 
    items, 
    alerts, 
    movements, 
    loadItems, 
    loadAlerts, 
    loadMovements,
    acknowledgeAlert 
  } = useInventoryStore();
  
  const [stats, setStats] = useState<any>(null);
  const [warehouseStats, setWarehouseStats] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        loadItems(),
        loadAlerts(false), // Only unacknowledged alerts
        loadMovements({ limit: 10 })
      ]);
      
      const inventoryStats = inventoryService.getInventoryStats();
      const warehouseData = inventoryService.getStockByWarehouseStats();
      
      setStats(inventoryStats);
      setWarehouseStats(warehouseData);
    };

    loadData();
  }, [loadItems, loadAlerts, loadMovements]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getCategoryData = () => {
    const categoryMap = new Map();
    items.forEach(item => {
      const totalStock = inventoryService.getTotalStock(item.id);
      const value = totalStock * item.averageCost;
      
      if (categoryMap.has(item.category)) {
        categoryMap.set(item.category, categoryMap.get(item.category) + value);
      } else {
        categoryMap.set(item.category, value);
      }
    });

    return Array.from(categoryMap.entries()).map(([category, value]) => ({
      category,
      value
    }));
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (!stats) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Estoque</h1>
          <p className="text-muted-foreground">
            Visão geral do controle de estoque
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              SKUs Ativos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSKUs}</div>
            <p className="text-xs text-muted-foreground">
              produtos diferentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Quantidade Total
            </CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalQuantity.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground">
              unidades em estoque
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Disponível
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalAvailable.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalReserved.toLocaleString('pt-BR')} reservado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valor Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              custo médio inventário
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Alertas de Estoque ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <Alert key={alert.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <AlertDescription className="flex items-center gap-2">
                    <Badge 
                      variant={alert.severity === 'HIGH' ? 'destructive' : 'secondary'}
                    >
                      {alert.severity === 'HIGH' ? 'Alto' : 
                       alert.severity === 'MEDIUM' ? 'Médio' : 'Baixo'}
                    </Badge>
                    <span className="font-mono text-sm">{alert.sku}</span>
                    <span>{alert.productName}</span>
                    <span className="text-muted-foreground">
                      - {alert.warehouseName}
                    </span>
                  </AlertDescription>
                  <p className="text-sm text-muted-foreground mt-1">
                    {alert.message} (Atual: {alert.currentStock}, Limite: {alert.threshold})
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => acknowledgeAlert(alert.id, 'Usuário Sistema')}
                >
                  Reconhecer
                </Button>
              </Alert>
            ))}
            
            {alerts.length > 5 && (
              <p className="text-sm text-muted-foreground">
                E mais {alerts.length - 5} alertas...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warehouse Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Estoque por Depósito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={warehouseStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="warehouse" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value.toLocaleString('pt-BR')}
                />
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Quantidade']}
                />
                <Bar 
                  dataKey="quantity" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Valor por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getCategoryData()}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ category, percent }) => 
                    `${category} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {getCategoryData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Valor']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Movimentações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {movements.slice(0, 8).map((movement) => (
              <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={
                    movement.type === 'in' ? 'default' : 
                    movement.type === 'out' ? 'secondary' : 
                    movement.type === 'transfer' ? 'outline' : 'destructive'
                  }>
                    {movement.type === 'in' ? 'Entrada' :
                     movement.type === 'out' ? 'Saída' :
                     movement.type === 'transfer' ? 'Transferência' :
                     movement.type === 'adjustment' ? 'Ajuste' : 'Reserva'}
                  </Badge>
                  <div>
                    <p className="font-medium">
                      <span className="font-mono text-sm">{movement.sku}</span> - {movement.productName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {movement.quantity} unidades - {movement.reason}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {movement.createdBy}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {movement.date.toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Estoque Normal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats.totalSKUs - stats.lowStockItems - stats.criticalStockItems}
            </div>
            <p className="text-xs text-muted-foreground">
              produtos com estoque adequado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {stats.lowStockItems}
            </div>
            <p className="text-xs text-muted-foreground">
              produtos com estoque baixo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Estoque Crítico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.criticalStockItems}
            </div>
            <p className="text-xs text-muted-foreground">
              produtos com estoque crítico
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}