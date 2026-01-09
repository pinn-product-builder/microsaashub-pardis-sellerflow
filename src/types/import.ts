// Types for CSV Import functionality

export type ImportEntityType = 'products' | 'customers' | 'inventory';

export interface ColumnMapping {
  csvColumn: string;
  dbColumn: string;
  isRequired: boolean;
  transform?: (value: string) => unknown;
}

export interface ImportValidationError {
  row: number;
  column: string;
  value: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportRecord {
  rowNumber: number;
  data: Record<string, unknown>;
  isValid: boolean;
  errors: ImportValidationError[];
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warningRows: number;
  records: ImportRecord[];
  errors: ImportValidationError[];
}

export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  inserted: number;
  updated: number;
  failed: number;
  errors: ImportValidationError[];
  duration: number;
  timestamp: string;
}

export interface ImportConfig {
  entityType: ImportEntityType;
  hasHeader: boolean;
  delimiter: string;
  encoding: string;
  updateExisting: boolean;
}

export interface EntityColumnConfig {
  dbColumn: string;
  label: string;
  isRequired: boolean;
  type: 'string' | 'number' | 'boolean' | 'date';
  defaultValue?: unknown;
  validate?: (value: string) => string | null;
}

// Column configurations for each entity type
export const PRODUCT_COLUMNS: EntityColumnConfig[] = [
  { dbColumn: 'sku', label: 'SKU', isRequired: true, type: 'string' },
  { dbColumn: 'name', label: 'Nome', isRequired: true, type: 'string' },
  { dbColumn: 'description', label: 'Descrição', isRequired: false, type: 'string' },
  { dbColumn: 'category', label: 'Categoria', isRequired: false, type: 'string' },
  { dbColumn: 'unit', label: 'Unidade', isRequired: false, type: 'string', defaultValue: 'UN' },
  { dbColumn: 'base_cost', label: 'Custo Base', isRequired: true, type: 'number' },
  { dbColumn: 'price_mg', label: 'Preço MG', isRequired: false, type: 'number' },
  { dbColumn: 'price_br', label: 'Preço BR', isRequired: false, type: 'number' },
  { dbColumn: 'price_minimum', label: 'Preço Mínimo', isRequired: false, type: 'number' },
  { dbColumn: 'stock_quantity', label: 'Estoque', isRequired: false, type: 'number', defaultValue: 0 },
  { dbColumn: 'stock_min_expiry', label: 'Validade Mínima', isRequired: false, type: 'date' },
  { dbColumn: 'ncm', label: 'NCM', isRequired: false, type: 'string' },
  { dbColumn: 'external_id', label: 'ID Externo (ERP)', isRequired: false, type: 'string' },
];

export const CUSTOMER_COLUMNS: EntityColumnConfig[] = [
  { dbColumn: 'cnpj', label: 'CNPJ', isRequired: true, type: 'string' },
  { dbColumn: 'company_name', label: 'Razão Social', isRequired: true, type: 'string' },
  { dbColumn: 'trade_name', label: 'Nome Fantasia', isRequired: false, type: 'string' },
  { dbColumn: 'uf', label: 'UF', isRequired: true, type: 'string' },
  { dbColumn: 'city', label: 'Cidade', isRequired: true, type: 'string' },
  { dbColumn: 'address', label: 'Endereço', isRequired: false, type: 'string' },
  { dbColumn: 'is_lab_to_lab', label: 'Lab-to-Lab', isRequired: false, type: 'boolean', defaultValue: false },
  { dbColumn: 'credit_limit', label: 'Limite de Crédito', isRequired: false, type: 'number', defaultValue: 0 },
  { dbColumn: 'tax_regime', label: 'Regime Tributário', isRequired: false, type: 'string' },
  { dbColumn: 'state_registration', label: 'Inscrição Estadual', isRequired: false, type: 'string' },
  { dbColumn: 'external_id', label: 'ID Externo (ERP)', isRequired: false, type: 'string' },
];

export const INVENTORY_COLUMNS: EntityColumnConfig[] = [
  { dbColumn: 'sku', label: 'SKU', isRequired: true, type: 'string' },
  { dbColumn: 'stock_quantity', label: 'Quantidade', isRequired: true, type: 'number' },
  { dbColumn: 'stock_min_expiry', label: 'Validade Mínima', isRequired: false, type: 'date' },
];

export function getColumnsForEntity(entityType: ImportEntityType): EntityColumnConfig[] {
  switch (entityType) {
    case 'products':
      return PRODUCT_COLUMNS;
    case 'customers':
      return CUSTOMER_COLUMNS;
    case 'inventory':
      return INVENTORY_COLUMNS;
  }
}
