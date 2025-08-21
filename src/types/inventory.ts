export interface Warehouse {
  id: string;
  name: string;
  uf: string;
  city: string;
  address?: string;
  isActive: boolean;
}

export interface InventoryItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  category: string;
  uom: string; // Unidade de medida
  safetyStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  averageCost: number;
  lastCost: number;
  warehousesStock: WarehouseStock[];
  isActive: boolean;
}

export interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reserved: number;
  available: number; // quantity - reserved
  lastUpdated: Date;
}

export interface StockMovement {
  id: string;
  date: Date;
  type: 'in' | 'out' | 'transfer' | 'adjustment' | 'reservation' | 'release';
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  warehouseFrom?: string;
  warehouseFromName?: string;
  warehouseTo?: string;
  warehouseToName?: string;
  reason: string;
  referenceId?: string; // ID da cotação, pedido, etc.
  unitCost?: number;
  totalCost?: number;
  createdBy: string;
  notes?: string;
}

export interface ReorderRule {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  warehouseId?: string; // null = regra global
  warehouseName?: string;
  minStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  supplierLeadTimeDays: number;
  isActive: boolean;
  lastTriggered?: Date;
}

export interface StockAlert {
  id: string;
  type: 'LOW_STOCK' | 'CRITICAL_STOCK' | 'OVERSTOCK' | 'REORDER_POINT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  productId: string;
  sku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  threshold: number;
  message: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface StockReservation {
  id: string;
  productId: string;
  sku: string;
  warehouseId: string;
  quantity: number;
  reservedFor: 'QUOTE' | 'ORDER' | 'TRANSFER' | 'MANUAL';
  referenceId: string;
  expiresAt?: Date;
  createdAt: Date;
  createdBy: string;
  releasedAt?: Date;
  releasedBy?: string;
}