import { Warehouse, InventoryItem, StockMovement, ReorderRule, StockAlert } from '@/types/inventory';
import { mockProducts } from './mockData';

export const mockWarehouses: Warehouse[] = [
  {
    id: '1',
    name: 'CD São Paulo',
    uf: 'SP',
    city: 'São Paulo',
    address: 'Av. das Nações Unidas, 1000',
    isActive: true
  },
  {
    id: '2',
    name: 'CD Minas Gerais',
    uf: 'MG',
    city: 'Belo Horizonte',
    address: 'Rua dos Inconfidentes, 500',
    isActive: true
  },
  {
    id: '3',
    name: 'CD Rio de Janeiro',
    uf: 'RJ',
    city: 'Rio de Janeiro',
    address: 'Av. Brasil, 2000',
    isActive: true
  }
];

export const mockInventoryItems: InventoryItem[] = [
  {
    id: '1',
    productId: '1',
    sku: 'ELE001',
    name: 'Smartphone Samsung Galaxy A54',
    category: 'Eletrônicos',
    uom: 'UN',
    safetyStock: 10,
    minStock: 20,
    maxStock: 200,
    reorderPoint: 30,
    averageCost: 800,
    lastCost: 820,
    isActive: true,
    warehousesStock: [
      {
        warehouseId: '1',
        warehouseName: 'CD São Paulo',
        quantity: 85,
        reserved: 15,
        available: 70,
        lastUpdated: new Date('2024-01-15')
      },
      {
        warehouseId: '2',
        warehouseName: 'CD Minas Gerais',
        quantity: 45,
        reserved: 5,
        available: 40,
        lastUpdated: new Date('2024-01-14')
      },
      {
        warehouseId: '3',
        warehouseName: 'CD Rio de Janeiro',
        quantity: 25,
        reserved: 3,
        available: 22,
        lastUpdated: new Date('2024-01-13')
      }
    ]
  },
  {
    id: '2',
    productId: '2',
    sku: 'ELE002',
    name: 'Notebook Dell Inspiron 15',
    category: 'Eletrônicos',
    uom: 'UN',
    safetyStock: 5,
    minStock: 10,
    maxStock: 50,
    reorderPoint: 15,
    averageCost: 2500,
    lastCost: 2480,
    isActive: true,
    warehousesStock: [
      {
        warehouseId: '1',
        warehouseName: 'CD São Paulo',
        quantity: 12,
        reserved: 2,
        available: 10,
        lastUpdated: new Date('2024-01-15')
      },
      {
        warehouseId: '2',
        warehouseName: 'CD Minas Gerais',
        quantity: 8,
        reserved: 1,
        available: 7,
        lastUpdated: new Date('2024-01-14')
      },
      {
        warehouseId: '3',
        warehouseName: 'CD Rio de Janeiro',
        quantity: 3,
        reserved: 0,
        available: 3,
        lastUpdated: new Date('2024-01-13')
      }
    ]
  },
  {
    id: '3',
    productId: '3',
    sku: 'CASA001',
    name: 'Micro-ondas Electrolux 30L',
    category: 'Eletrodomésticos',
    uom: 'UN',
    safetyStock: 8,
    minStock: 15,
    maxStock: 100,
    reorderPoint: 25,
    averageCost: 450,
    lastCost: 465,
    isActive: true,
    warehousesStock: [
      {
        warehouseId: '1',
        warehouseName: 'CD São Paulo',
        quantity: 32,
        reserved: 7,
        available: 25,
        lastUpdated: new Date('2024-01-15')
      },
      {
        warehouseId: '2',
        warehouseName: 'CD Minas Gerais',
        quantity: 18,
        reserved: 2,
        available: 16,
        lastUpdated: new Date('2024-01-14')
      },
      {
        warehouseId: '3',
        warehouseName: 'CD Rio de Janeiro',
        quantity: 14,
        reserved: 1,
        available: 13,
        lastUpdated: new Date('2024-01-13')
      }
    ]
  },
  {
    id: '4',
    productId: '4',
    sku: 'CASA002',
    name: 'Aspirador de Pó Philips',
    category: 'Eletrodomésticos',
    uom: 'UN',
    safetyStock: 12,
    minStock: 25,
    maxStock: 120,
    reorderPoint: 35,
    averageCost: 280,
    lastCost: 275,
    isActive: true,
    warehousesStock: [
      {
        warehouseId: '1',
        warehouseName: 'CD São Paulo',
        quantity: 55,
        reserved: 8,
        available: 47,
        lastUpdated: new Date('2024-01-15')
      },
      {
        warehouseId: '2',
        warehouseName: 'CD Minas Gerais',
        quantity: 22,
        reserved: 3,
        available: 19,
        lastUpdated: new Date('2024-01-14')
      },
      {
        warehouseId: '3',
        warehouseName: 'CD Rio de Janeiro',
        quantity: 8,
        reserved: 1,
        available: 7,
        lastUpdated: new Date('2024-01-13')
      }
    ]
  },
  {
    id: '5',
    productId: '5',
    sku: 'JARD001',
    name: 'Furadeira Black & Decker',
    category: 'Ferramentas',
    uom: 'UN',
    safetyStock: 15,
    minStock: 30,
    maxStock: 150,
    reorderPoint: 45,
    averageCost: 120,
    lastCost: 125,
    isActive: true,
    warehousesStock: [
      {
        warehouseId: '1',
        warehouseName: 'CD São Paulo',
        quantity: 78,
        reserved: 12,
        available: 66,
        lastUpdated: new Date('2024-01-15')
      },
      {
        warehouseId: '2',
        warehouseName: 'CD Minas Gerais',
        quantity: 35,
        reserved: 5,
        available: 30,
        lastUpdated: new Date('2024-01-14')
      },
      {
        warehouseId: '3',
        warehouseName: 'CD Rio de Janeiro',
        quantity: 18,
        reserved: 2,
        available: 16,
        lastUpdated: new Date('2024-01-13')
      }
    ]
  }
];

export const mockStockMovements: StockMovement[] = [
  {
    id: '1',
    date: new Date('2024-01-15T10:30:00'),
    type: 'in',
    productId: '1',
    sku: 'ELE001',
    productName: 'Smartphone Samsung Galaxy A54',
    quantity: 50,
    warehouseTo: '1',
    warehouseToName: 'CD São Paulo',
    reason: 'Entrada de estoque - Compra',
    unitCost: 820,
    totalCost: 41000,
    createdBy: 'João Silva',
    notes: 'Recebimento lote 001/2024'
  },
  {
    id: '2',
    date: new Date('2024-01-14T14:15:00'),
    type: 'out',
    productId: '2',
    sku: 'ELE002',
    productName: 'Notebook Dell Inspiron 15',
    quantity: 3,
    warehouseFrom: '1',
    warehouseFromName: 'CD São Paulo',
    reason: 'Saída para venda',
    referenceId: 'COT-2024-001',
    unitCost: 2480,
    totalCost: 7440,
    createdBy: 'Maria Santos',
    notes: 'Venda para cliente TechCorp'
  },
  {
    id: '3',
    date: new Date('2024-01-13T16:45:00'),
    type: 'transfer',
    productId: '3',
    sku: 'CASA001',
    productName: 'Micro-ondas Electrolux 30L',
    quantity: 10,
    warehouseFrom: '1',
    warehouseFromName: 'CD São Paulo',
    warehouseTo: '2',
    warehouseToName: 'CD Minas Gerais',
    reason: 'Transferência entre depósitos',
    unitCost: 465,
    totalCost: 4650,
    createdBy: 'Carlos Oliveira',
    notes: 'Rebalanceamento de estoque'
  },
  {
    id: '4',
    date: new Date('2024-01-12T09:20:00'),
    type: 'reservation',
    productId: '1',
    sku: 'ELE001',
    productName: 'Smartphone Samsung Galaxy A54',
    quantity: 5,
    warehouseFrom: '1',
    warehouseFromName: 'CD São Paulo',
    reason: 'Reserva para cotação',
    referenceId: 'COT-2024-002',
    createdBy: 'Ana Costa',
    notes: 'Reserva temporária para análise'
  },
  {
    id: '5',
    date: new Date('2024-01-11T11:30:00'),
    type: 'adjustment',
    productId: '4',
    sku: 'CASA002',
    productName: 'Aspirador de Pó Philips',
    quantity: -2,
    warehouseFrom: '2',
    warehouseFromName: 'CD Minas Gerais',
    reason: 'Ajuste de inventário',
    unitCost: 275,
    totalCost: -550,
    createdBy: 'Pedro Lima',
    notes: 'Produto danificado - baixa'
  }
];

export const mockStockAlerts: StockAlert[] = [
  {
    id: '1',
    type: 'LOW_STOCK',
    severity: 'MEDIUM',
    productId: '5',
    sku: 'JARD001',
    productName: 'Furadeira Black & Decker',
    warehouseId: '3',
    warehouseName: 'CD Rio de Janeiro',
    currentStock: 18,
    threshold: 30,
    message: 'Estoque abaixo do mínimo estabelecido',
    createdAt: new Date('2024-01-14T08:00:00')
  },
  {
    id: '2',
    type: 'CRITICAL_STOCK',
    severity: 'HIGH',
    productId: '2',
    sku: 'ELE002',
    productName: 'Notebook Dell Inspiron 15',
    warehouseId: '3',
    warehouseName: 'CD Rio de Janeiro',
    currentStock: 3,
    threshold: 10,
    message: 'Estoque crítico - necessária reposição urgente',
    createdAt: new Date('2024-01-13T15:30:00')
  },
  {
    id: '3',
    type: 'REORDER_POINT',
    severity: 'MEDIUM',
    productId: '4',
    sku: 'CASA002',
    productName: 'Aspirador de Pó Philips',
    warehouseId: '2',
    warehouseName: 'CD Minas Gerais',
    currentStock: 22,
    threshold: 35,
    message: 'Ponto de pedido atingido - sugerida nova compra',
    createdAt: new Date('2024-01-12T10:15:00')
  }
];

export const mockReorderRules: ReorderRule[] = [
  {
    id: '1',
    productId: '1',
    sku: 'ELE001',
    productName: 'Smartphone Samsung Galaxy A54',
    warehouseId: '1',
    warehouseName: 'CD São Paulo',
    minStock: 20,
    reorderPoint: 30,
    reorderQuantity: 100,
    supplierLeadTimeDays: 7,
    isActive: true
  },
  {
    id: '2',
    productId: '2',
    sku: 'ELE002',
    productName: 'Notebook Dell Inspiron 15',
    minStock: 10,
    reorderPoint: 15,
    reorderQuantity: 25,
    supplierLeadTimeDays: 10,
    isActive: true
  },
  {
    id: '3',
    productId: '3',
    sku: 'CASA001',
    productName: 'Micro-ondas Electrolux 30L',
    warehouseId: '2',
    warehouseName: 'CD Minas Gerais',
    minStock: 15,
    reorderPoint: 25,
    reorderQuantity: 50,
    supplierLeadTimeDays: 5,
    isActive: true
  }
];