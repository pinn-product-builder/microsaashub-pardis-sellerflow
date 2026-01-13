
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Shield
} from 'lucide-react';
import { ValidationResult } from '@/types/vtex';
import { Quote } from '@/types/seller-flow';
import { ConversionService } from '@/services/conversionService';

interface PreSendValidationProps {
  quote: Quote;
  onValidationComplete: (results: ValidationResult[]) => void;
}

export function PreSendValidation({ quote, onValidationComplete }: PreSendValidationProps) {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);

  const runValidations = async () => {
    setIsValidating(true);
    try {
      const rules = ConversionService.getDefaultValidationRules();
      const results = await ConversionService.validateQuote(quote, rules);
      setValidationResults(results);
      setHasValidated(true);
      onValidationComplete(results);
    } catch (error) {
      console.error('Erro ao executar validações:', error);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    runValidations();
  }, [quote.id]);

  const getStatusIcon = (status: ValidationResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: ValidationResult['status']) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-100 text-green-800">Passou</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Atenção</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const hasFailures = validationResults.some(r => r.status === 'failed');
  const hasWarnings = validationResults.some(r => r.status === 'warning');
  const allPassed = validationResults.length > 0 && validationResults.every(r => r.status === 'passed');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Validações Pré-Envio
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runValidations}
            disabled={isValidating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
            {isValidating ? 'Validando...' : 'Revalidar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Geral */}
        {hasValidated && (
          <Alert className={`${
            hasFailures ? 'border-red-200 bg-red-50' : 
            hasWarnings ? 'border-yellow-200 bg-yellow-50' : 
            'border-green-200 bg-green-50'
          }`}>
            {hasFailures ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : hasWarnings ? (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <AlertDescription className={`${
              hasFailures ? 'text-red-800' : 
              hasWarnings ? 'text-yellow-800' : 
              'text-green-800'
            }`}>
              {hasFailures ? (
                <strong>Validações falharam:</strong>
              ) : hasWarnings ? (
                <strong>Atenção necessária:</strong>
              ) : (
                <strong>Todas as validações passaram:</strong>
              )}{' '}
              {hasFailures 
                ? 'Corrija os problemas antes de enviar para VTEX.'
                : hasWarnings
                ? 'Revise os alertas antes de prosseguir.'
                : 'Cotação pronta para envio.'
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Lista de Validações */}
        {isValidating ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg animate-pulse">
                <div className="w-5 h-5 bg-muted-foreground/20 rounded-full"></div>
                <div className="flex-1">
                  <div className="w-32 h-4 bg-muted-foreground/20 rounded mb-1"></div>
                  <div className="w-48 h-3 bg-muted-foreground/10 rounded"></div>
                </div>
                <div className="w-16 h-6 bg-muted-foreground/20 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {validationResults.map((result) => (
              <div key={result.ruleId} className="flex items-start space-x-3 p-3 border rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(result.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium">{result.ruleName}</h4>
                    {getStatusBadge(result.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.details && (
                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                      <strong>Detalhes:</strong> {JSON.stringify(result.details, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {validationResults.length === 0 && !isValidating && (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma validação configurada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
