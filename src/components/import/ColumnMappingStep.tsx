import { useEffect, useState } from 'react';
import { ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ColumnMapping, ImportEntityType, getColumnsForEntity } from '@/types/import';

interface ColumnMappingStepProps {
  entityType: ImportEntityType;
  csvHeaders: string[];
  mappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
}

export function ColumnMappingStep({
  entityType,
  csvHeaders,
  mappings,
  onMappingsChange,
}: ColumnMappingStepProps) {
  const [autoMapped, setAutoMapped] = useState(false);
  const entityColumns = getColumnsForEntity(entityType);

  // Auto-map columns on first load
  useEffect(() => {
    if (!autoMapped && csvHeaders.length > 0) {
      const newMappings = entityColumns.map((col) => {
        // Try to find matching CSV header
        const matchingHeader = csvHeaders.find((h) => {
          const normalizedHeader = h.toLowerCase().trim();
          const normalizedLabel = col.label.toLowerCase();
          const normalizedDbCol = col.dbColumn.toLowerCase().replace(/_/g, ' ');
          
          return (
            normalizedHeader === normalizedLabel ||
            normalizedHeader === normalizedDbCol ||
            normalizedHeader.includes(normalizedLabel) ||
            normalizedLabel.includes(normalizedHeader)
          );
        });

        return {
          csvColumn: matchingHeader || '',
          dbColumn: col.dbColumn,
          isRequired: col.isRequired,
        };
      });

      onMappingsChange(newMappings);
      setAutoMapped(true);
    }
  }, [csvHeaders, autoMapped, entityColumns, onMappingsChange]);

  const handleMappingChange = (dbColumn: string, csvColumn: string) => {
    const newMappings = mappings.map((m) =>
      m.dbColumn === dbColumn ? { ...m, csvColumn } : m
    );
    onMappingsChange(newMappings);
  };

  const requiredMapped = mappings.filter(
    (m) => m.isRequired && m.csvColumn
  ).length;
  const requiredTotal = mappings.filter((m) => m.isRequired).length;
  const allRequiredMapped = requiredMapped === requiredTotal;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={allRequiredMapped ? 'border-green-500/50' : 'border-yellow-500/50'}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {allRequiredMapped ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            <div>
              <p className="font-medium">
                {allRequiredMapped
                  ? 'Todos os campos obrigatórios estão mapeados'
                  : `${requiredMapped} de ${requiredTotal} campos obrigatórios mapeados`}
              </p>
              <p className="text-sm text-muted-foreground">
                {mappings.filter((m) => m.csvColumn).length} de {mappings.length} campos
                totais mapeados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mapping Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mapeamento de Colunas</CardTitle>
          <CardDescription>
            Associe as colunas do CSV com os campos do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mappings.map((mapping) => {
              const columnConfig = entityColumns.find(
                (c) => c.dbColumn === mapping.dbColumn
              );
              
              return (
                <div
                  key={mapping.dbColumn}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                >
                  {/* CSV Column */}
                  <div className="flex-1">
                    <Select
                      value={mapping.csvColumn || 'none'}
                      onValueChange={(value) =>
                        handleMappingChange(
                          mapping.dbColumn,
                          value === 'none' ? '' : value
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">
                            Não mapear
                          </span>
                        </SelectItem>
                        {csvHeaders.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                  {/* Database Column */}
                  <div className="flex-1 flex items-center gap-2">
                    <span className="font-medium">{columnConfig?.label}</span>
                    {mapping.isRequired ? (
                      <Badge variant="destructive" className="text-xs">
                        Obrigatório
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Opcional
                      </Badge>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    {mapping.csvColumn ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : mapping.isRequired ? (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <div className="h-5 w-5" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
