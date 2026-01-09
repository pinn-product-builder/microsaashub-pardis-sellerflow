import { useState, useCallback } from 'react';
import { Upload, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { PageContainer, PageHeader, PageContent } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { FileUploadStep } from '@/components/import/FileUploadStep';
import { ColumnMappingStep } from '@/components/import/ColumnMappingStep';
import { ValidationPreviewStep } from '@/components/import/ValidationPreviewStep';
import { ImportResultStep } from '@/components/import/ImportResultStep';
import { CSVImportService } from '@/services/csvImportService';
import {
  ImportConfig,
  ColumnMapping,
  ImportPreview,
  ImportResult,
} from '@/types/import';

type ImportStep = 'upload' | 'mapping' | 'preview' | 'result';

const STEPS: { key: ImportStep; label: string; number: number }[] = [
  { key: 'upload', label: 'Upload', number: 1 },
  { key: 'mapping', label: 'Mapeamento', number: 2 },
  { key: 'preview', label: 'Validação', number: 3 },
  { key: 'result', label: 'Resultado', number: 4 },
];

export default function Importacao() {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Upload
  const [config, setConfig] = useState<ImportConfig>({
    entityType: 'products',
    hasHeader: true,
    delimiter: 'auto',
    encoding: 'UTF-8',
    updateExisting: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);

  // Step 2: Mapping
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);

  // Step 3: Preview
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  // Step 4: Result
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file);
    if (!file) {
      setCsvHeaders([]);
      setCsvRows([]);
    }
  }, []);

  const handleParseFile = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo CSV');
      return;
    }

    setIsLoading(true);
    try {
      const { headers, rows } = await CSVImportService.parseCSV(selectedFile, config);
      setCsvHeaders(headers);
      setCsvRows(rows);
      setCurrentStep('mapping');
      toast.success(`Arquivo carregado: ${rows.length} linhas encontradas`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao processar arquivo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = () => {
    const requiredMappings = mappings.filter((m) => m.isRequired);
    const missingRequired = requiredMappings.filter((m) => !m.csvColumn);

    if (missingRequired.length > 0) {
      toast.error('Mapeie todos os campos obrigatórios antes de continuar');
      return;
    }

    const validationResult = CSVImportService.validateData(
      csvRows,
      csvHeaders,
      mappings,
      config.entityType
    );

    setPreview(validationResult);
    setCurrentStep('preview');
  };

  const handleImport = async () => {
    if (!preview) return;

    if (preview.validRows === 0) {
      toast.error('Não há registros válidos para importar');
      return;
    }

    setIsLoading(true);
    try {
      const importResult = await CSVImportService.executeImport(preview, config);
      setResult(importResult);
      setCurrentStep('result');

      if (importResult.success) {
        toast.success(`Importação concluída: ${importResult.inserted + importResult.updated} registros processados`);
      } else {
        toast.warning(`Importação concluída com ${importResult.failed} erros`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro durante a importação');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewImport = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setMappings([]);
    setPreview(null);
    setResult(null);
  };

  const handleBack = () => {
    const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].key);
    }
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <PageContainer>
      <PageHeader
        title="Importação CSV"
        description="Importe produtos, clientes ou estoque a partir de arquivos CSV do ERP/Datasul"
      />

      <PageContent>
        {/* Progress Steps */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`
                      flex items-center justify-center h-10 w-10 rounded-full border-2 font-medium
                      ${currentStepIndex > index
                        ? 'bg-primary border-primary text-primary-foreground'
                        : currentStepIndex === index
                          ? 'border-primary text-primary'
                          : 'border-muted-foreground/30 text-muted-foreground'
                      }
                    `}
                  >
                    {currentStepIndex > index ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={`
                      ml-3 font-medium
                      ${currentStepIndex >= index ? 'text-foreground' : 'text-muted-foreground'}
                    `}
                  >
                    {step.label}
                  </span>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`
                        h-0.5 w-16 mx-4
                        ${currentStepIndex > index ? 'bg-primary' : 'bg-muted-foreground/30'}
                      `}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="animate-fade-in">
          {currentStep === 'upload' && (
            <FileUploadStep
              config={config}
              onConfigChange={setConfig}
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
            />
          )}

          {currentStep === 'mapping' && (
            <ColumnMappingStep
              entityType={config.entityType}
              csvHeaders={csvHeaders}
              mappings={mappings}
              onMappingsChange={setMappings}
            />
          )}

          {currentStep === 'preview' && preview && (
            <ValidationPreviewStep
              preview={preview}
              mappings={mappings}
              entityType={config.entityType}
            />
          )}

          {currentStep === 'result' && result && (
            <ImportResultStep result={result} onNewImport={handleNewImport} />
          )}
        </div>

        {/* Navigation Buttons */}
        {currentStep !== 'result' && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 'upload' || isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            <div className="flex gap-3">
              {currentStep === 'upload' && (
                <Button onClick={handleParseFile} disabled={!selectedFile || isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Continuar
                </Button>
              )}

              {currentStep === 'mapping' && (
                <Button onClick={handleValidate} disabled={isLoading}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Validar Dados
                </Button>
              )}

              {currentStep === 'preview' && (
                <Button
                  onClick={handleImport}
                  disabled={isLoading || (preview?.validRows === 0)}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Importar {preview?.validRows} Registros
                </Button>
              )}
            </div>
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
}
