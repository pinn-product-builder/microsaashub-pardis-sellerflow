import { useCallback, useState } from 'react';
import { Upload, FileText, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ImportConfig, ImportEntityType } from '@/types/import';
import { CSVImportService } from '@/services/csvImportService';

interface FileUploadStepProps {
  config: ImportConfig;
  onConfigChange: (config: ImportConfig) => void;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

export function FileUploadStep({
  config,
  onConfigChange,
  onFileSelect,
  selectedFile,
}: FileUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleDownloadTemplate = () => {
    CSVImportService.downloadTemplate(config.entityType);
  };

  return (
    <div className="space-y-6">
      {/* Entity Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tipo de Dados</CardTitle>
          <CardDescription>Selecione o tipo de dados que deseja importar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <EntityTypeCard
              type="products"
              label="Produtos"
              description="SKU, nome, preços, estoque"
              isSelected={config.entityType === 'products'}
              onSelect={() => onConfigChange({ ...config, entityType: 'products' })}
            />
            <EntityTypeCard
              type="customers"
              label="Clientes"
              description="CNPJ, razão social, endereço"
              isSelected={config.entityType === 'customers'}
              onSelect={() => onConfigChange({ ...config, entityType: 'customers' })}
            />
            <EntityTypeCard
              type="inventory"
              label="Estoque"
              description="Atualizar quantidades por SKU"
              isSelected={config.entityType === 'inventory'}
              onSelect={() => onConfigChange({ ...config, entityType: 'inventory' })}
            />
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Arquivo CSV</CardTitle>
          <CardDescription>
            Arraste um arquivo ou clique para selecionar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${selectedFile ? 'bg-muted/50' : 'hover:border-primary/50 hover:bg-muted/30'}
            `}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFileSelect(null as unknown as File)}
                  className="ml-4"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">
                  Arraste um arquivo CSV aqui ou
                </p>
                <label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <Button variant="outline" asChild>
                    <span>Selecionar arquivo</span>
                  </Button>
                </label>
              </>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="link" onClick={handleDownloadTemplate} className="text-sm">
              <Download className="h-4 w-4 mr-2" />
              Baixar template de exemplo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Opções de Importação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Arquivo possui cabeçalho</Label>
              <p className="text-sm text-muted-foreground">
                A primeira linha contém os nomes das colunas
              </p>
            </div>
            <Switch
              checked={config.hasHeader}
              onCheckedChange={(checked) =>
                onConfigChange({ ...config, hasHeader: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Atualizar registros existentes</Label>
              <p className="text-sm text-muted-foreground">
                Atualiza se SKU/CNPJ já existir no sistema
              </p>
            </div>
            <Switch
              checked={config.updateExisting}
              onCheckedChange={(checked) =>
                onConfigChange({ ...config, updateExisting: checked })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Delimitador</Label>
              <Select
                value={config.delimiter}
                onValueChange={(value) =>
                  onConfigChange({ ...config, delimiter: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Detectar automaticamente</SelectItem>
                  <SelectItem value=";">Ponto e vírgula (;)</SelectItem>
                  <SelectItem value=",">Vírgula (,)</SelectItem>
                  <SelectItem value="\t">Tab</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Codificação</Label>
              <Select
                value={config.encoding}
                onValueChange={(value) =>
                  onConfigChange({ ...config, encoding: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTF-8">UTF-8</SelectItem>
                  <SelectItem value="ISO-8859-1">ISO-8859-1 (Latin1)</SelectItem>
                  <SelectItem value="windows-1252">Windows-1252</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface EntityTypeCardProps {
  type: ImportEntityType;
  label: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}

function EntityTypeCard({ label, description, isSelected, onSelect }: EntityTypeCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        p-4 rounded-lg border-2 text-left transition-all
        ${isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
        }
      `}
    >
      <p className="font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </button>
  );
}
