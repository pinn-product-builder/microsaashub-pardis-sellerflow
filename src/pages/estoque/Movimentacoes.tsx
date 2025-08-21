import { useEffect, useState } from 'react';
import { Plus, Filter, Download, Calendar, Package, ArrowUpDown } from 'lucide-react';
import { useInventoryStore } from '@/stores/inventoryStore';
import { StockMovement } from '@/types/inventory';
import { StockMovementForm } from '@/components/inventory/StockMovementForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function EstoqueMovimentacoes() {
  const { movements, warehouses, loadMovements, loadWarehouses, loading } = useInventoryStore();
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    warehouse: 'all',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    loadMovements({ limit: 100 });
    loadWarehouses();
  }, [loadMovements, loadWarehouses]);

  useEffect(() => {
    let filtered = [...movements];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(movement =>
        movement.sku.toLowerCase().includes(search) ||
        movement.productName.toLowerCase().includes(search) ||
        movement.reason.toLowerCase().includes(search)
      );
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(movement => movement.type === filters.type);
    }

    // Warehouse filter
    if (filters.warehouse !== 'all') {
      filtered = filtered.filter(movement =>
        movement.warehouseFrom === filters.warehouse ||
        movement.warehouseTo === filters.warehouse
      );
    }

    // Date filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(movement => movement.date >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(movement => movement.date <= toDate);
    }

    setFilteredMovements(filtered);
  }, [movements, filters]);

  const handleMovementSuccess = () => {
    setShowMovementDialog(false);
    loadMovements({ limit: 100 });
  };

  const getMovementTypeInfo = (type: StockMovement['type']) => {
    switch (type) {
      case 'in':
        return { label: 'Entrada', variant: 'default' as const, icon: '↓' };
      case 'out':
        return { label: 'Saída', variant: 'secondary' as const, icon: '↑' };
      case 'transfer':
        return { label: 'Transferência', variant: 'outline' as const, icon: '⇄' };
      case 'adjustment':
        return { label: 'Ajuste', variant: 'destructive' as const, icon: '±' };
      case 'reservation':
        return { label: 'Reserva', variant: 'secondary' as const, icon: '🔒' };
      case 'release':
        return { label: 'Liberação', variant: 'outline' as const, icon: '🔓' };
      default:
        return { label: type, variant: 'outline' as const, icon: '?' };
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getMovementSummary = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayMovements = filteredMovements.filter(m => {
      const movementDate = new Date(m.date);
      movementDate.setHours(0, 0, 0, 0);
      return movementDate.getTime() === today.getTime();
    });

    const inToday = todayMovements.filter(m => m.type === 'in').length;
    const outToday = todayMovements.filter(m => m.type === 'out').length;
    const transferToday = todayMovements.filter(m => m.type === 'transfer').length;

    return { todayMovements: todayMovements.length, inToday, outToday, transferToday };
  };

  const summary = getMovementSummary();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Movimentações de Estoque</h1>
          <p className="text-muted-foreground">
            Histórico completo de entradas, saídas e transferências
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          
          <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Movimentação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Registrar Movimentação</DialogTitle>
              </DialogHeader>
              <StockMovementForm
                onSuccess={handleMovementSuccess}
                onCancel={() => setShowMovementDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.todayMovements}</div>
            <p className="text-xs text-muted-foreground">
              Movimentações hoje
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{summary.inToday}</div>
            <p className="text-xs text-muted-foreground">
              Entradas hoje
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-secondary-foreground">{summary.outToday}</div>
            <p className="text-xs text-muted-foreground">
              Saídas hoje
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">{summary.transferToday}</div>
            <p className="text-xs text-muted-foreground">
              Transferências hoje
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Package className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar SKU, produto ou motivo..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <Select 
              value={filters.type} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="in">Entrada</SelectItem>
                <SelectItem value="out">Saída</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
                <SelectItem value="adjustment">Ajuste</SelectItem>
                <SelectItem value="reservation">Reserva</SelectItem>
                <SelectItem value="release">Liberação</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.warehouse} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, warehouse: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Depósito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos depósitos</SelectItem>
                {warehouses.map(warehouse => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Data inicial"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Data final"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Histórico de Movimentações ({filteredMovements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Valor Unit.</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      Carregando movimentações...
                    </TableCell>
                  </TableRow>
                ) : filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      Nenhuma movimentação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((movement) => {
                    const typeInfo = getMovementTypeInfo(movement.type);
                    
                    return (
                      <TableRow key={movement.id}>
                        <TableCell>
                          <div className="text-sm">
                            {formatDateTime(movement.date)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant={typeInfo.variant}>
                            {typeInfo.icon} {typeInfo.label}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="font-mono font-medium">
                          {movement.sku}
                        </TableCell>
                        
                        <TableCell>
                          <div>
                            <p className="font-medium">{movement.productName}</p>
                            {movement.notes && (
                              <p className="text-xs text-muted-foreground">{movement.notes}</p>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-right font-medium">
                          <span className={
                            movement.type === 'in' ? 'text-primary' :
                            movement.type === 'out' ? 'text-secondary-foreground' :
                            ''
                          }>
                            {movement.type === 'out' || movement.type === 'adjustment' && movement.quantity < 0 ? '-' : '+'}
                            {Math.abs(movement.quantity).toLocaleString('pt-BR')}
                          </span>
                        </TableCell>
                        
                        <TableCell>
                          {movement.warehouseFromName || '-'}
                        </TableCell>
                        
                        <TableCell>
                          {movement.warehouseToName || '-'}
                        </TableCell>
                        
                        <TableCell>
                          <div>
                            <p className="text-sm">{movement.reason}</p>
                            {movement.referenceId && (
                              <p className="text-xs text-muted-foreground font-mono">
                                Ref: {movement.referenceId}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-right">
                          {formatCurrency(movement.unitCost)}
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            {movement.createdBy}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredMovements.length > 0 && (
            <div className="flex items-center justify-between px-2 py-4 text-sm text-muted-foreground">
              <div>
                Exibindo {filteredMovements.length} de {movements.length} movimentações
              </div>
              <div>
                Total de registros: {movements.length}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}