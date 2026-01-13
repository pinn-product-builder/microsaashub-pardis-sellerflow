
import { Product, Customer } from '@/types/seller-flow';

export interface PriceTable {
  id: string;
  name: string;
  description: string;
  channel: 'B2B' | 'B2C' | 'VIP' | 'DISTRIBUIDOR';
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  prices: PriceTableItem[];
  customers: string[]; // customer IDs
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface PriceTableItem {
  productId: string;
  basePrice: number;
  tierPrices: TierPrice[];
  promotionalPrice?: number;
  promotionalValidTo?: Date;
  minimumPrice: number;
  maxDiscount: number;
}

export interface TierPrice {
  minQuantity: number;
  maxQuantity?: number;
  price: number;
  discount: number;
}

const STORAGE_KEY = 'seller_flow_price_tables';

export class PriceTableService {
  private static getTables(): PriceTable[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : this.getDefaultTables();
  }

  private static saveTables(tables: PriceTable[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  }

  private static getDefaultTables(): PriceTable[] {
    const defaultTables: PriceTable[] = [
      {
        id: '1',
        name: 'Tabela B2B Padrão',
        description: 'Tabela de preços para clientes B2B regulares',
        channel: 'B2B',
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2024-12-31'),
        isActive: true,
        prices: [],
        customers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        id: '2',
        name: 'Tabela VIP',
        description: 'Tabela especial para clientes VIP',
        channel: 'VIP',
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2024-12-31'),
        isActive: true,
        prices: [],
        customers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      }
    ];
    
    this.saveTables(defaultTables);
    return defaultTables;
  }

  static getAllTables(): PriceTable[] {
    return this.getTables().filter(table => table.isActive);
  }

  static getTableById(id: string): PriceTable | null {
    return this.getTables().find(table => table.id === id) || null;
  }

  static getTableByCustomer(customerId: string): PriceTable | null {
    return this.getTables().find(table => 
      table.isActive && table.customers.includes(customerId)
    ) || null;
  }

  static getTableByChannel(channel: string): PriceTable | null {
    return this.getTables().find(table => 
      table.isActive && table.channel === channel
    ) || null;
  }

  static getProductPrice(
    productId: string, 
    quantity: number = 1, 
    customerId?: string,
    channel: string = 'B2B'
  ): PriceTableItem | null {
    let table: PriceTable | null = null;
    
    if (customerId) {
      table = this.getTableByCustomer(customerId);
    }
    
    if (!table) {
      table = this.getTableByChannel(channel);
    }
    
    if (!table) return null;
    
    const priceItem = table.prices.find(p => p.productId === productId);
    if (!priceItem) return null;
    
    // Verificar preço promocional
    if (priceItem.promotionalPrice && priceItem.promotionalValidTo) {
      if (new Date() <= new Date(priceItem.promotionalValidTo)) {
        return {
          ...priceItem,
          basePrice: priceItem.promotionalPrice
        };
      }
    }
    
    // Verificar preços por tier
    const tierPrice = priceItem.tierPrices.find(tier => 
      quantity >= tier.minQuantity && 
      (!tier.maxQuantity || quantity <= tier.maxQuantity)
    );
    
    if (tierPrice) {
      return {
        ...priceItem,
        basePrice: tierPrice.price
      };
    }
    
    return priceItem;
  }

  static createTable(table: Omit<PriceTable, 'id' | 'createdAt' | 'updatedAt'>): PriceTable {
    const tables = this.getTables();
    const newTable: PriceTable = {
      ...table,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    tables.push(newTable);
    this.saveTables(tables);
    return newTable;
  }

  static updateTable(id: string, updates: Partial<PriceTable>): PriceTable | null {
    const tables = this.getTables();
    const index = tables.findIndex(t => t.id === id);
    
    if (index === -1) return null;
    
    tables[index] = {
      ...tables[index],
      ...updates,
      updatedAt: new Date()
    };
    
    this.saveTables(tables);
    return tables[index];
  }

  static deleteTable(id: string): boolean {
    const tables = this.getTables();
    const filtered = tables.filter(t => t.id !== id);
    
    if (filtered.length === tables.length) return false;
    
    this.saveTables(filtered);
    return true;
  }
}
