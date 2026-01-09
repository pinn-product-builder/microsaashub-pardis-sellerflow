import { AlertCircle, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ImportPreview, ColumnMapping, getColumnsForEntity, ImportEntityType } from '@/types/import';

interface ValidationPreviewStepProps {
  preview: ImportPreview;
  mappings: ColumnMapping[];
  entityType: ImportEntityType;
}

export function ValidationPreviewStep({
  preview,
  mappings,
  entityType,
}: ValidationPreviewStepProps) {
  const entityColumns = getColumnsForEntity(entityType);
  const mappedColumns = mappings.filter((m) => m.csvColumn);

  const errorCount = preview.errors.filter((e) => e.severity === 'error').length;
  const warningCount = preview.errors.filter((e) => e.severity === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          label="Total de Linhas"
          value={preview.totalRows}
          icon={<AlertCircle className="h-4 w-4" />}
          variant="default"
        />
        <SummaryCard
          label="Válidas"
          value={preview.validRows}
          icon={<CheckCircle2 className="h-4 w-4" />}
          variant="success"
        />
        <SummaryCard
          label="Com Erros"
          value={preview.invalidRows}
          icon={<XCircle className="h-4 w-4" />}
          variant="error"
        />
        <SummaryCard
          label="Com Avisos"
          value={preview.warningRows}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant="warning"
        />
      </div>

      {/* Errors and Warnings */}
      {(errorCount > 0 || warningCount > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Problemas Encontrados
            </CardTitle>
            <CardDescription>
              {errorCount} erros e {warningCount} avisos detectados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {errorCount > 0 && (
                <AccordionItem value="errors">
                  <AccordionTrigger className="text-destructive">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      {errorCount} Erros (impedem importação)
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {preview.errors
                          .filter((e) => e.severity === 'error')
                          .slice(0, 50)
                          .map((error, i) => (
                            <div
                              key={i}
                              className="text-sm p-2 bg-destructive/10 rounded"
                            >
                              <span className="font-medium">Linha {error.row}:</span>{' '}
                              {error.message}
                              {error.value && (
                                <span className="text-muted-foreground">
                                  {' '}
                                  (valor: "{error.value}")
                                </span>
                              )}
                            </div>
                          ))}
                        {errorCount > 50 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            E mais {errorCount - 50} erros...
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </AccordionContent>
                </AccordionItem>
              )}

              {warningCount > 0 && (
                <AccordionItem value="warnings">
                  <AccordionTrigger className="text-yellow-600">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {warningCount} Avisos (não impedem importação)
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {preview.errors
                          .filter((e) => e.severity === 'warning')
                          .slice(0, 50)
                          .map((warning, i) => (
                            <div
                              key={i}
                              className="text-sm p-2 bg-yellow-500/10 rounded"
                            >
                              <span className="font-medium">Linha {warning.row}:</span>{' '}
                              {warning.message}
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview dos Dados</CardTitle>
          <CardDescription>
            Primeiras 10 linhas do arquivo (mostrando apenas linhas válidas)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                  {mappedColumns.map((m) => {
                    const col = entityColumns.find((c) => c.dbColumn === m.dbColumn);
                    return (
                      <TableHead key={m.dbColumn}>{col?.label || m.dbColumn}</TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.records.slice(0, 10).map((record) => (
                  <TableRow
                    key={record.rowNumber}
                    className={!record.isValid ? 'bg-destructive/5' : ''}
                  >
                    <TableCell className="font-mono text-sm">
                      {record.rowNumber}
                    </TableCell>
                    <TableCell>
                      {record.isValid ? (
                        <Badge variant="default" className="bg-green-500">
                          OK
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Erro</Badge>
                      )}
                    </TableCell>
                    {mappedColumns.map((m) => (
                      <TableCell key={m.dbColumn} className="max-w-[200px] truncate">
                        {String(record.data[m.dbColumn] ?? '-')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant: 'default' | 'success' | 'error' | 'warning';
}

function SummaryCard({ label, value, icon, variant }: SummaryCardProps) {
  const variantClasses = {
    default: 'border-border',
    success: 'border-green-500/50 bg-green-500/5',
    error: 'border-destructive/50 bg-destructive/5',
    warning: 'border-yellow-500/50 bg-yellow-500/5',
  };

  const iconClasses = {
    default: 'text-muted-foreground',
    success: 'text-green-500',
    error: 'text-destructive',
    warning: 'text-yellow-500',
  };

  return (
    <Card className={variantClasses[variant]}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2">
          <span className={iconClasses[variant]}>{icon}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
