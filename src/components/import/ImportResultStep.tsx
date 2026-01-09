import { CheckCircle2, XCircle, Clock, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImportResult } from '@/types/import';

interface ImportResultStepProps {
  result: ImportResult;
  onNewImport: () => void;
}

export function ImportResultStep({ result, onNewImport }: ImportResultStepProps) {
  const successRate = result.totalProcessed > 0
    ? ((result.inserted + result.updated) / result.totalProcessed) * 100
    : 0;

  const handleDownloadReport = () => {
    const report = generateReport(result);
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_importacao_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6">
      {/* Main Status */}
      <Card className={result.success ? 'border-green-500' : 'border-destructive'}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {result.success ? (
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">
                {result.success ? 'Importação Concluída!' : 'Importação com Erros'}
              </h2>
              <p className="text-muted-foreground">
                {format(new Date(result.timestamp), "dd 'de' MMMM 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Taxa de sucesso</span>
              <span className="font-medium">{successRate.toFixed(1)}%</span>
            </div>
            <Progress value={successRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Processados"
          value={result.totalProcessed}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Inseridos"
          value={result.inserted}
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
          variant="success"
        />
        <StatCard
          label="Atualizados"
          value={result.updated}
          icon={<CheckCircle2 className="h-4 w-4 text-blue-500" />}
          variant="info"
        />
        <StatCard
          label="Falhas"
          value={result.failed}
          icon={<XCircle className="h-4 w-4 text-destructive" />}
          variant="error"
        />
      </div>

      {/* Duration */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <span className="text-sm text-muted-foreground">
                Tempo de processamento:
              </span>
              <span className="ml-2 font-medium">
                {formatDuration(result.duration)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Errors Detail */}
      {result.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-destructive">
              Erros Durante a Importação
            </CardTitle>
            <CardDescription>
              {result.errors.length} registros não puderam ser importados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {result.errors.map((error, i) => (
                  <div
                    key={i}
                    className="text-sm p-2 bg-destructive/10 rounded border border-destructive/20"
                  >
                    <span className="font-medium">Linha {error.row}:</span>{' '}
                    {error.message}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleDownloadReport}>
          <Download className="h-4 w-4 mr-2" />
          Baixar Relatório
        </Button>
        <Button onClick={onNewImport}>
          Nova Importação
        </Button>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'info' | 'error';
}

function StatCard({ label, value, icon, variant = 'default' }: StatCardProps) {
  const bgClasses = {
    default: 'bg-muted/50',
    success: 'bg-green-500/5',
    info: 'bg-blue-500/5',
    error: 'bg-destructive/5',
  };

  return (
    <Card className={bgClasses[variant]}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <p className="text-3xl font-bold">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function generateReport(result: ImportResult): string {
  const lines = [
    '═══════════════════════════════════════════════════════════════',
    '                  RELATÓRIO DE IMPORTAÇÃO CSV',
    '═══════════════════════════════════════════════════════════════',
    '',
    `Data/Hora: ${format(new Date(result.timestamp), 'dd/MM/yyyy HH:mm:ss')}`,
    `Duração: ${formatDuration(result.duration)}`,
    '',
    '─── RESUMO ────────────────────────────────────────────────────',
    '',
    `Total Processados: ${result.totalProcessed}`,
    `Inseridos: ${result.inserted}`,
    `Atualizados: ${result.updated}`,
    `Falhas: ${result.failed}`,
    `Taxa de Sucesso: ${((result.inserted + result.updated) / result.totalProcessed * 100).toFixed(1)}%`,
    '',
  ];

  if (result.errors.length > 0) {
    lines.push('─── ERROS ─────────────────────────────────────────────────────');
    lines.push('');
    result.errors.forEach((error, i) => {
      lines.push(`${i + 1}. Linha ${error.row}: ${error.message}`);
    });
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    Fim do Relatório');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
