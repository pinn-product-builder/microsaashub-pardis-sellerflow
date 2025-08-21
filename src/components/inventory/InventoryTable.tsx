import { useState } from 'react';
import { Search, Filter, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { InventoryItem } from '@/types/inventory';
import { inventoryService } from '@/services/inventoryService';
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

interface InventoryTableProps {
  items: InventoryItem[];
  onItemSelect?: (item: InventoryItem) => void;
  showActions?: boolean;
}

export function InventoryTable({ items, onItemSelect, showActions = true }: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getStockStatus = (item: InventoryItem) => {
    const totalStock = inventoryService.getTotalStock(item.id);
    
    if (totalStock <= item.safetyStock) {
      return { status: 'CRITICAL', label: 'Crítico', variant: 'destructive' as const };
    } else if (totalStock <= item.minStock) {
      return { status: 'LOW', label: 'Baixo', variant: 'secondary' as const };
    } else {
      return { status: 'OK', label: 'Normal', variant: 'default' as const };
    }
  };

  const getStockIcon = (status: string) => {
    switch (status) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'LOW':
        return <Package className="h-4 w-4 text-muted-foreground" />;
      default:
        return <CheckCircle className="h-4 w-4 text-primary" />;
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    const stockStatus = getStockStatus(item);
    const matchesStatus = statusFilter === 'all' || stockStatus.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(new Set(items.map(item => item.category)));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Controle de Estoque
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por SKU ou nome do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="OK">Normal</SelectItem>
              <SelectItem value="LOW">Baixo</SelectItem>
              <SelectItem value="CRITICAL">Crítico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Reservado</TableHead>
                <TableHead className="text-right">Disponível</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Custo Médio</TableHead>
                <TableHead className="text-center">Status</TableHead>
                {showActions && <TableHead className="text-center">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showActions ? 10 : 9} className="h-24 text-center">
                    Nenhum item encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const totalStock = inventoryService.getTotalStock(item.id);
                  const totalReserved = inventoryService.getTotalReserved(item.id);
                  const totalAvailable = inventoryService.getTotalAvailable(item.id);
                  const stockStatus = getStockStatus(item);
                  
                  return (
                    <TableRow 
                      key={item.id}
                      className={onItemSelect ? "cursor-pointer hover:bg-muted/50" : ""}
                      onClick={() => onItemSelect?.(item)}
                    >
                      <TableCell className="font-mono font-medium">
                        {item.sku}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.uom}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {totalStock.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {totalReserved.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {totalAvailable.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.minStock.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.averageCost)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStockIcon(stockStatus.status)}
                          <Badge variant={stockStatus.variant}>
                            {stockStatus.label}
                          </Badge>
                        </div>
                      </TableCell>
                      {showActions && (
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onItemSelect?.(item);
                            }}
                          >
                            Detalhes
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {filteredItems.length > 0 && (
          <div className="flex items-center justify-between px-2 py-4 text-sm text-muted-foreground">
            <div>
              Exibindo {filteredItems.length} de {items.length} itens
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>Normal</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span>Baixo</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span>Crítico</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}