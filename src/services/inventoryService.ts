import { 
  Warehouse, 
  InventoryItem, 
  StockMovement, 
  ReorderRule, 
  StockAlert, 
  StockReservation,
  WarehouseStock 
} from '@/types/inventory';
import { 
  mockWarehouses, 
  mockInventoryItems, 
  mockStockMovements, 
  mockStockAlerts, 
  mockReorderRules 
} from '@/data/inventoryMock';

class InventoryService {
  private warehouses: Warehouse[] = [...mockWarehouses];
  private items: InventoryItem[] = [...mockInventoryItems];
  private movements: StockMovement[] = [...mockStockMovements];
  private alerts: StockAlert[] = [...mockStockAlerts];
  private reorderRules: ReorderRule[] = [...mockReorderRules];

  // Warehouses
  async listWarehouses(): Promise<Warehouse[]> {
    return this.warehouses.filter(w => w.isActive);
  }

  async getWarehouseById(id: string): Promise<Warehouse | null> {
    return this.warehouses.find(w => w.id === id) || null;
  }

  // Inventory Items
  async listItems(filters?: {
    category?: string;
    warehouseId?: string;
    status?: 'OK' | 'LOW' | 'CRITICAL';
    search?: string;
  }): Promise<InventoryItem[]> {
    let filteredItems = [...this.items];

    if (filters?.category) {
      filteredItems = filteredItems.filter(item => item.category === filters.category);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        item.sku.toLowerCase().includes(search) ||
        item.name.toLowerCase().includes(search)
      );
    }

    if (filters?.warehouseId) {
      filteredItems = filteredItems.filter(item => 
        item.warehousesStock.some(ws => ws.warehouseId === filters.warehouseId)
      );
    }

    if (filters?.status) {
      filteredItems = filteredItems.filter(item => {
        const totalStock = this.getTotalStock(item.id);
        if (filters.status === 'CRITICAL' && totalStock <= item.safetyStock) return true;
        if (filters.status === 'LOW' && totalStock > item.safetyStock && totalStock <= item.minStock) return true;
        if (filters.status === 'OK' && totalStock > item.minStock) return true;
        return false;
      });
    }

    return filteredItems;
  }

  async getItemById(id: string): Promise<InventoryItem | null> {
    return this.items.find(item => item.id === id) || null;
  }

  async getItemBySku(sku: string): Promise<InventoryItem | null> {
    return this.items.find(item => item.sku === sku) || null;
  }

  // Stock calculations
  getTotalStock(itemId: string): number {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return 0;
    return item.warehousesStock.reduce((total, ws) => total + ws.quantity, 0);
  }

  getTotalReserved(itemId: string): number {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return 0;
    return item.warehousesStock.reduce((total, ws) => total + ws.reserved, 0);
  }

  getTotalAvailable(itemId: string): number {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return 0;
    return item.warehousesStock.reduce((total, ws) => total + ws.available, 0);
  }

  getStockByWarehouse(itemId: string, warehouseId: string): WarehouseStock | null {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return null;
    return item.warehousesStock.find(ws => ws.warehouseId === warehouseId) || null;
  }

  // Stock movements
  async getMovements(filters?: {
    productId?: string;
    warehouseId?: string;
    type?: StockMovement['type'];
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<StockMovement[]> {
    let filteredMovements = [...this.movements];

    if (filters?.productId) {
      filteredMovements = filteredMovements.filter(m => m.productId === filters.productId);
    }

    if (filters?.warehouseId) {
      filteredMovements = filteredMovements.filter(m => 
        m.warehouseFrom === filters.warehouseId || m.warehouseTo === filters.warehouseId
      );
    }

    if (filters?.type) {
      filteredMovements = filteredMovements.filter(m => m.type === filters.type);
    }

    if (filters?.dateFrom) {
      filteredMovements = filteredMovements.filter(m => m.date >= filters.dateFrom!);
    }

    if (filters?.dateTo) {
      filteredMovements = filteredMovements.filter(m => m.date <= filters.dateTo!);
    }

    // Sort by date desc
    filteredMovements.sort((a, b) => b.date.getTime() - a.date.getTime());

    if (filters?.limit) {
      filteredMovements = filteredMovements.slice(0, filters.limit);
    }

    return filteredMovements;
  }

  async registerMovement(movement: Omit<StockMovement, 'id'>): Promise<StockMovement> {
    const newMovement: StockMovement = {
      ...movement,
      id: Date.now().toString()
    };

    this.movements.unshift(newMovement);
    await this.updateStockFromMovement(newMovement);
    
    return newMovement;
  }

  private async updateStockFromMovement(movement: StockMovement): Promise<void> {
    const item = this.items.find(i => i.id === movement.productId);
    if (!item) return;

    switch (movement.type) {
      case 'in':
        if (movement.warehouseTo) {
          const warehouseStock = item.warehousesStock.find(ws => ws.warehouseId === movement.warehouseTo);
          if (warehouseStock) {
            warehouseStock.quantity += movement.quantity;
            warehouseStock.available = warehouseStock.quantity - warehouseStock.reserved;
            warehouseStock.lastUpdated = new Date();
          }
        }
        break;

      case 'out':
        if (movement.warehouseFrom) {
          const warehouseStock = item.warehousesStock.find(ws => ws.warehouseId === movement.warehouseFrom);
          if (warehouseStock) {
            warehouseStock.quantity = Math.max(0, warehouseStock.quantity - movement.quantity);
            warehouseStock.available = warehouseStock.quantity - warehouseStock.reserved;
            warehouseStock.lastUpdated = new Date();
          }
        }
        break;

      case 'transfer':
        if (movement.warehouseFrom && movement.warehouseTo) {
          const fromStock = item.warehousesStock.find(ws => ws.warehouseId === movement.warehouseFrom);
          const toStock = item.warehousesStock.find(ws => ws.warehouseId === movement.warehouseTo);
          
          if (fromStock) {
            fromStock.quantity = Math.max(0, fromStock.quantity - movement.quantity);
            fromStock.available = fromStock.quantity - fromStock.reserved;
            fromStock.lastUpdated = new Date();
          }
          
          if (toStock) {
            toStock.quantity += movement.quantity;
            toStock.available = toStock.quantity - toStock.reserved;
            toStock.lastUpdated = new Date();
          }
        }
        break;

      case 'adjustment':
        if (movement.warehouseFrom || movement.warehouseTo) {
          const warehouseId = movement.warehouseFrom || movement.warehouseTo;
          const warehouseStock = item.warehousesStock.find(ws => ws.warehouseId === warehouseId);
          if (warehouseStock) {
            warehouseStock.quantity = Math.max(0, warehouseStock.quantity + movement.quantity);
            warehouseStock.available = warehouseStock.quantity - warehouseStock.reserved;
            warehouseStock.lastUpdated = new Date();
          }
        }
        break;

      case 'reservation':
        if (movement.warehouseFrom) {
          const warehouseStock = item.warehousesStock.find(ws => ws.warehouseId === movement.warehouseFrom);
          if (warehouseStock) {
            warehouseStock.reserved += movement.quantity;
            warehouseStock.available = warehouseStock.quantity - warehouseStock.reserved;
            warehouseStock.lastUpdated = new Date();
          }
        }
        break;

      case 'release':
        if (movement.warehouseFrom) {
          const warehouseStock = item.warehousesStock.find(ws => ws.warehouseId === movement.warehouseFrom);
          if (warehouseStock) {
            warehouseStock.reserved = Math.max(0, warehouseStock.reserved - movement.quantity);
            warehouseStock.available = warehouseStock.quantity - warehouseStock.reserved;
            warehouseStock.lastUpdated = new Date();
          }
        }
        break;
    }
  }

  // Stock reservations
  async reserveStock(
    productId: string, 
    quantity: number, 
    warehouseId: string,
    referenceId: string,
    reservedFor: StockReservation['reservedFor'] = 'MANUAL',
    expiresAt?: Date
  ): Promise<boolean> {
    const warehouseStock = this.getStockByWarehouse(productId, warehouseId);
    if (!warehouseStock || warehouseStock.available < quantity) {
      return false;
    }

    await this.registerMovement({
      date: new Date(),
      type: 'reservation',
      productId,
      sku: warehouseStock.warehouseId, // This should be the SKU, but we'll get it from the item
      productName: '', // This should be the product name, but we'll get it from the item
      quantity,
      warehouseFrom: warehouseId,
      warehouseFromName: warehouseStock.warehouseName,
      reason: `Reserva para ${reservedFor}`,
      referenceId,
      createdBy: 'Sistema'
    });

    return true;
  }

  async releaseReservation(
    productId: string, 
    quantity: number, 
    warehouseId: string,
    referenceId: string
  ): Promise<boolean> {
    const warehouseStock = this.getStockByWarehouse(productId, warehouseId);
    if (!warehouseStock || warehouseStock.reserved < quantity) {
      return false;
    }

    await this.registerMovement({
      date: new Date(),
      type: 'release',
      productId,
      sku: '', // This should be the SKU
      productName: '', // This should be the product name
      quantity,
      warehouseFrom: warehouseId,
      warehouseFromName: warehouseStock.warehouseName,
      reason: 'Liberação de reserva',
      referenceId,
      createdBy: 'Sistema'
    });

    return true;
  }

  // Alerts
  async getAlerts(acknowledged?: boolean): Promise<StockAlert[]> {
    let filteredAlerts = [...this.alerts];

    if (acknowledged !== undefined) {
      filteredAlerts = filteredAlerts.filter(alert => 
        acknowledged ? !!alert.acknowledgedAt : !alert.acknowledgedAt
      );
    }

    return filteredAlerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = acknowledgedBy;
    }
  }

  // Analytics and reports
  getInventoryStats() {
    const totalSKUs = this.items.length;
    const totalQuantity = this.items.reduce((total, item) => total + this.getTotalStock(item.id), 0);
    const totalReserved = this.items.reduce((total, item) => total + this.getTotalReserved(item.id), 0);
    const totalAvailable = this.items.reduce((total, item) => total + this.getTotalAvailable(item.id), 0);
    const totalValue = this.items.reduce((total, item) => 
      total + (this.getTotalStock(item.id) * item.averageCost), 0
    );

    const lowStockItems = this.items.filter(item => {
      const totalStock = this.getTotalStock(item.id);
      return totalStock > item.safetyStock && totalStock <= item.minStock;
    }).length;

    const criticalStockItems = this.items.filter(item => {
      const totalStock = this.getTotalStock(item.id);
      return totalStock <= item.safetyStock;
    }).length;

    return {
      totalSKUs,
      totalQuantity,
      totalReserved,
      totalAvailable,
      totalValue,
      lowStockItems,
      criticalStockItems,
      activeWarehouses: this.warehouses.filter(w => w.isActive).length
    };
  }

  getStockByWarehouseStats() {
    return this.warehouses.filter(w => w.isActive).map(warehouse => {
      const warehouseStock = this.items.reduce((acc, item) => {
        const stock = item.warehousesStock.find(ws => ws.warehouseId === warehouse.id);
        if (stock) {
          acc.quantity += stock.quantity;
          acc.reserved += stock.reserved;
          acc.available += stock.available;
          acc.value += stock.quantity * item.averageCost;
        }
        return acc;
      }, { quantity: 0, reserved: 0, available: 0, value: 0 });

      return {
        warehouse: warehouse.name,
        ...warehouseStock
      };
    });
  }
}

export const inventoryService = new InventoryService();