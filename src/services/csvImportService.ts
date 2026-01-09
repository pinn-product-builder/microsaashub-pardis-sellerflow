import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import {
  ImportEntityType,
  ColumnMapping,
  ImportValidationError,
  ImportRecord,
  ImportPreview,
  ImportResult,
  ImportConfig,
  getColumnsForEntity,
} from '@/types/import';

export class CSVImportService {
  // Parse CSV file and return raw data
  static parseCSV(file: File, config: ImportConfig): Promise<{ headers: string[]; rows: string[][] }> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        delimiter: config.delimiter === 'auto' ? '' : config.delimiter,
        encoding: config.encoding,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as string[][];
          if (data.length === 0) {
            reject(new Error('Arquivo CSV vazio'));
            return;
          }
          
          const headers = config.hasHeader ? data[0] : data[0].map((_, i) => `Coluna ${i + 1}`);
          const rows = config.hasHeader ? data.slice(1) : data;
          
          resolve({ headers, rows });
        },
        error: (error) => {
          reject(new Error(`Erro ao processar CSV: ${error.message}`));
        },
      });
    });
  }

  // Validate and preview import data
  static validateData(
    rows: string[][],
    headers: string[],
    mappings: ColumnMapping[],
    entityType: ImportEntityType
  ): ImportPreview {
    const entityColumns = getColumnsForEntity(entityType);
    const records: ImportRecord[] = [];
    const allErrors: ImportValidationError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      const errors: ImportValidationError[] = [];
      const data: Record<string, unknown> = {};

      // Process each mapping
      for (const mapping of mappings) {
        const csvIndex = headers.indexOf(mapping.csvColumn);
        const rawValue = csvIndex >= 0 ? row[csvIndex]?.trim() || '' : '';
        const columnConfig = entityColumns.find(c => c.dbColumn === mapping.dbColumn);

        if (!columnConfig) continue;

        // Check required fields
        if (columnConfig.isRequired && !rawValue) {
          errors.push({
            row: rowNumber,
            column: columnConfig.label,
            value: rawValue,
            message: `Campo obrigatório "${columnConfig.label}" está vazio`,
            severity: 'error',
          });
          continue;
        }

        // Transform value based on type
        let transformedValue: unknown = rawValue || columnConfig.defaultValue;

        if (rawValue) {
          switch (columnConfig.type) {
            case 'number':
              const numValue = parseFloat(rawValue.replace(',', '.').replace(/[^\d.-]/g, ''));
              if (isNaN(numValue)) {
                errors.push({
                  row: rowNumber,
                  column: columnConfig.label,
                  value: rawValue,
                  message: `Valor "${rawValue}" não é um número válido`,
                  severity: 'error',
                });
              } else {
                transformedValue = numValue;
              }
              break;

            case 'boolean':
              const boolValue = rawValue.toLowerCase();
              transformedValue = ['true', 'sim', 's', '1', 'yes', 'y'].includes(boolValue);
              break;

            case 'date':
              // Try to parse date in multiple formats
              const dateFormats = [
                /^\d{4}-\d{2}-\d{2}$/, // ISO
                /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
              ];
              const isValidDate = dateFormats.some(f => f.test(rawValue));
              if (!isValidDate && rawValue) {
                errors.push({
                  row: rowNumber,
                  column: columnConfig.label,
                  value: rawValue,
                  message: `Data "${rawValue}" em formato inválido`,
                  severity: 'warning',
                });
              } else if (rawValue) {
                // Convert DD/MM/YYYY to ISO
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawValue)) {
                  const [day, month, year] = rawValue.split('/');
                  transformedValue = `${year}-${month}-${day}`;
                } else {
                  transformedValue = rawValue;
                }
              }
              break;

            case 'string':
            default:
              transformedValue = rawValue;
              break;
          }
        }

        // Custom validation
        if (columnConfig.validate && rawValue) {
          const validationError = columnConfig.validate(rawValue);
          if (validationError) {
            errors.push({
              row: rowNumber,
              column: columnConfig.label,
              value: rawValue,
              message: validationError,
              severity: 'error',
            });
          }
        }

        data[mapping.dbColumn] = transformedValue;
      }

      records.push({
        rowNumber,
        data,
        isValid: errors.filter(e => e.severity === 'error').length === 0,
        errors,
      });

      allErrors.push(...errors);
    }

    const validRows = records.filter(r => r.isValid).length;
    const warningRows = records.filter(r => r.errors.some(e => e.severity === 'warning')).length;

    return {
      totalRows: rows.length,
      validRows,
      invalidRows: rows.length - validRows,
      warningRows,
      records,
      errors: allErrors,
    };
  }

  // Execute import to database
  static async executeImport(
    preview: ImportPreview,
    config: ImportConfig
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const validRecords = preview.records.filter(r => r.isValid);
    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const errors: ImportValidationError[] = [];

    const tableName = config.entityType === 'inventory' ? 'products' : config.entityType;
    const uniqueKey = config.entityType === 'customers' ? 'cnpj' : 'sku';

    for (const record of validRecords) {
      try {
        const data = record.data as Record<string, unknown>;
        
        // For inventory, we only update stock fields on existing products
        if (config.entityType === 'inventory') {
          const { error } = await supabase
            .from('products')
            .update({
              stock_quantity: data.stock_quantity as number,
              stock_min_expiry: data.stock_min_expiry as string,
              last_sync_at: new Date().toISOString(),
            })
            .eq('sku', data.sku as string);

          if (error) throw error;
          updated++;
          continue;
        }

        // Check if record exists
        let existingId: string | null = null;
        
        if (config.entityType === 'products') {
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('sku', data.sku as string)
            .maybeSingle();
          existingId = existing?.id || null;
        } else {
          const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('cnpj', data.cnpj as string)
            .maybeSingle();
          existingId = existing?.id || null;
        }

        if (existingId && config.updateExisting) {
          // Update existing record
          if (config.entityType === 'products') {
            const { error } = await supabase
              .from('products')
              .update({
                ...data as Record<string, unknown>,
                is_active: true,
                last_sync_at: new Date().toISOString(),
              })
              .eq('id', existingId);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('customers')
              .update({
                ...data as Record<string, unknown>,
                is_active: true,
                last_sync_at: new Date().toISOString(),
              })
              .eq('id', existingId);
            if (error) throw error;
          }
          updated++;
        } else if (!existingId) {
          // Insert new record
          if (config.entityType === 'products') {
            const { error } = await supabase.from('products').insert({
              sku: data.sku as string,
              name: data.name as string,
              base_cost: (data.base_cost as number) || 0,
              description: data.description as string,
              category: data.category as string,
              unit: (data.unit as string) || 'UN',
              price_mg: data.price_mg as number,
              price_br: data.price_br as number,
              price_minimum: data.price_minimum as number,
              stock_quantity: (data.stock_quantity as number) || 0,
              stock_min_expiry: data.stock_min_expiry as string,
              ncm: data.ncm as string,
              external_id: data.external_id as string,
              status: 'active',
              campaign_discount: 0,
              is_active: true,
              last_sync_at: new Date().toISOString(),
            });
            if (error) throw error;
          } else {
            const { error } = await supabase.from('customers').insert({
              cnpj: data.cnpj as string,
              company_name: data.company_name as string,
              trade_name: data.trade_name as string,
              uf: data.uf as string,
              city: data.city as string,
              address: data.address as string,
              is_lab_to_lab: (data.is_lab_to_lab as boolean) || false,
              credit_limit: (data.credit_limit as number) || 0,
              tax_regime: data.tax_regime as string,
              state_registration: data.state_registration as string,
              external_id: data.external_id as string,
              price_table_type: (data.uf === 'MG' ? 'MG' : 'BR'),
              available_payment_terms: [],
              is_active: true,
              last_sync_at: new Date().toISOString(),
            });
            if (error) throw error;
          }
          inserted++;
        }
      } catch (error) {
        failed++;
        errors.push({
          row: record.rowNumber,
          column: 'Sistema',
          value: '',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          severity: 'error',
        });
      }
    }

    const duration = Date.now() - startTime;

    return {
      success: failed === 0,
      totalProcessed: validRecords.length,
      inserted,
      updated,
      failed,
      errors,
      duration,
      timestamp: new Date().toISOString(),
    };
  }

  // Generate sample CSV template
  static generateTemplate(entityType: ImportEntityType): string {
    const columns = getColumnsForEntity(entityType);
    const headers = columns.map(c => c.label);
    
    // Add sample row
    const sampleRow = columns.map(c => {
      switch (c.type) {
        case 'number':
          return '0';
        case 'boolean':
          return 'Não';
        case 'date':
          return '2024-01-01';
        default:
          return `Exemplo ${c.label}`;
      }
    });

    return [headers.join(';'), sampleRow.join(';')].join('\n');
  }

  // Download template as CSV file
  static downloadTemplate(entityType: ImportEntityType): void {
    const csv = this.generateTemplate(entityType);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `template_${entityType}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
