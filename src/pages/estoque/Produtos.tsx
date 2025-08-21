import { useEffect, useState } from 'react';
import { Plus, Download, Upload } from 'lucide-react';
import { useInventoryStore } from '@/stores/inventoryStore';
import { InventoryItem } from '@/types/inventory';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StockMovementForm } from '@/components/inventory/StockMovementForm';

export default function EstoqueProdutos() {
  const { items, loadItems, loading } = useInventoryStore();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showMovementDialog, setShowMovementDialog] = useState(false);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleItemSelect = (item: InventoryItem) => {
    setSelectedItem(item);
    // In a future version, this could open a detailed view modal
    console.log('Selected item:', item);
  };

  const handleMovementSuccess = () => {
    setShowMovementDialog(false);
    loadItems(); // Refresh the items list
  };

  if (loading && items.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Produtos em Estoque</h1>
          <p className="text-muted-foreground">
            Gerencie e monitore todos os produtos do estoque
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Importar
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground">
              Total de SKUs
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {items.filter(item => {
                const totalStock = item.warehousesStock.reduce((sum, ws) => sum + ws.quantity, 0);
                return totalStock > item.minStock;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Com estoque normal
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">
              {items.filter(item => {
                const totalStock = item.warehousesStock.reduce((sum, ws) => sum + ws.quantity, 0);
                return totalStock > item.safetyStock && totalStock <= item.minStock;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Com estoque baixo
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">
              {items.filter(item => {
                const totalStock = item.warehousesStock.reduce((sum, ws) => sum + ws.quantity, 0);
                return totalStock <= item.safetyStock;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Com estoque crítico
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Products Table */}
      <InventoryTable
        items={items}
        onItemSelect={handleItemSelect}
        showActions={true}
      />

      {/* Future: Item Details Dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedItem.sku} - {selectedItem.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p className="font-medium">{selectedItem.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unidade</p>
                  <p className="font-medium">{selectedItem.uom}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo Médio</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(selectedItem.averageCost)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estoque Mínimo</p>
                  <p className="font-medium">{selectedItem.minStock}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Estoque por Depósito</h3>
                <div className="space-y-2">
                  {selectedItem.warehousesStock.map((ws) => (
                    <div key={ws.warehouseId} className="flex justify-between items-center p-2 border rounded">
                      <span>{ws.warehouseName}</span>
                      <div className="text-right">
                        <p className="font-medium">
                          {ws.available} disponível
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {ws.quantity} total ({ws.reserved} reservado)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}