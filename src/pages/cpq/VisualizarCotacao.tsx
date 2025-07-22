
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Edit, 
  Copy, 
  Send, 
  Download, 
  FileText, 
  Mail,
  ShoppingCart,
  Calendar,
  User,
  MapPin,
  ExternalLink,
  Activity,
  Shield
} from 'lucide-react';
import { QuoteService } from '@/services/quoteService';
import { VTEXService } from '@/services/vtexService';
import { ConversionService } from '@/services/conversionService';
import { Quote } from '@/types/cpq';
import { ValidationResult } from '@/types/vtex';
import { QuoteStatusBadge } from '@/components/cpq/display/QuoteStatusBadge';
import { QuoteItemsTable } from '@/components/cpq/tables/QuoteItemsTable';
import { ExportActions } from '@/components/cpq/actions/ExportActions';
import { EmailDialog } from '@/components/cpq/dialogs/EmailDialog';
import { ConversionTimeline } from '@/components/cpq/conversion/ConversionTimeline';
import { PreSendValidation } from '@/components/cpq/conversion/PreSendValidation';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function VisualizarCotacao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isSendingToVTEX, setIsSendingToVTEX] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    if (id) {
      const foundQuote = QuoteService.getQuote(id);
      setQuote(foundQuote);
      setIsLoading(false);
    }
  }, [id]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
  };

  const handleDuplicate = () => {
    if (!quote) return;

    const duplicatedQuote = QuoteService.createQuote({
      customer: quote.customer,
      destinationUF: quote.destinationUF,
      items: quote.items,
      subtotal: quote.subtotal,
      totalTaxes: quote.totalTaxes,
      totalFreight: quote.totalFreight,
      discount: quote.discount,
      total: quote.total,
      status: 'draft',
      paymentConditions: quote.paymentConditions,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: 'current-user',
      notes: quote.notes
    });

    toast({
      title: "Cotação Duplicada",
      description: `Nova cotação ${duplicatedQuote.number} criada com sucesso!`
    });

    navigate(`/cpq/cotacao/${duplicatedQuote.id}`);
  };

  const handleConvertToOrder = () => {
    if (!quote) return;

    QuoteService.updateQuote(quote.id, { 
      status: 'approved',
      notes: `${quote.notes}\n\nConvertido em pedido em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`
    });

    toast({
      title: "Convertido em Pedido",
      description: "Cotação convertida em pedido com sucesso!"
    });

    setQuote(prev => prev ? { ...prev, status: 'approved' } : null);
  };

  const handleSendEmail = () => {
    setShowEmailDialog(true);
  };

  const handleSendToVTEX = async () => {
    if (!quote) return;

    // Verificar se há falhas nas validações
    const hasFailures = validationResults.some(r => r.status === 'failed');
    if (hasFailures) {
      toast({
        title: "Validações Pendentes",
        description: "Corrija os problemas nas validações antes de enviar para VTEX.",
        variant: "destructive"
      });
      setShowValidation(true);
      return;
    }

    setIsSendingToVTEX(true);
    try {
      const result = await ConversionService.processConversion(quote);
      
      if (result.success) {
        toast({
          title: "Processamento Iniciado",
          description: result.message
        });
        
        // Atualizar status da cotação baseado no resultado
        const newStatus = result.timeline.steps.some(s => s.name === 'Enviando para VTEX' && s.status === 'completed') 
          ? 'sent' 
          : result.timeline.steps.some(s => s.name === 'Avaliando aprovação' && s.status === 'completed' && s.details?.includes('Aprovação manual'))
          ? 'pending'
          : 'processing';

        QuoteService.updateQuote(quote.id, { 
          status: newStatus,
          notes: `${quote.notes}\n\nProcessamento iniciado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`
        });
        
        setQuote(prev => prev ? { ...prev, status: newStatus } : null);
        setShowTimeline(true);
      } else {
        toast({
          title: "Erro no Processamento",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado no processamento",
        variant: "destructive"
      });
    } finally {
      setIsSendingToVTEX(false);
    }
  };

  const handleValidationComplete = (results: ValidationResult[]) => {
    setValidationResults(results);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando cotação...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/cpq/historico">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Histórico
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Cotação não encontrada</h3>
              <p className="text-muted-foreground">A cotação solicitada não existe ou foi removida.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vtexSettings = VTEXService.getCurrentSettings();
  const canSendToVTEX = vtexSettings?.isEnabled && 
    (quote.status === 'calculated' || quote.status === 'approved');
  const conversionTimeline = ConversionService.getConversionTimeline(quote.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/cpq/historico">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Histórico
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Cotação {quote.number}</h1>
            <p className="text-muted-foreground">
              Criada em {formatDate(quote.createdAt)} por {quote.createdBy}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <QuoteStatusBadge status={quote.status} />
          <ExportActions quote={quote} />
          {quote.status === 'draft' && (
            <Button variant="outline" asChild>
              <Link to={`/cpq/editar/${quote.id}`}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicar
          </Button>
          {(quote.status === 'calculated' || quote.status === 'approved') && (
            <Button variant="outline" onClick={handleSendEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          )}
          {canSendToVTEX && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setShowValidation(!showValidation)}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Shield className="h-4 w-4 mr-2" />
                Validar
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSendToVTEX}
                disabled={isSendingToVTEX || validationResults.some(r => r.status === 'failed')}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {isSendingToVTEX ? 'Processando...' : 'Enviar para VTEX'}
              </Button>
            </>
          )}
          {conversionTimeline && (
            <Button 
              variant="outline" 
              onClick={() => setShowTimeline(!showTimeline)}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Activity className="h-4 w-4 mr-2" />
              Timeline
            </Button>
          )}
          {quote.status === 'calculated' && (
            <Button onClick={handleConvertToOrder}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Converter em Pedido
            </Button>
          )}
        </div>
      </div>

      {/* Validation Panel */}
      {showValidation && canSendToVTEX && (
        <PreSendValidation 
          quote={quote} 
          onValidationComplete={handleValidationComplete}
        />
      )}

      {/* Timeline Panel */}
      {showTimeline && conversionTimeline && (
        <ConversionTimeline timeline={conversionTimeline} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Empresa</p>
                  <p className="font-medium">{quote.customer.companyName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CNPJ</p>
                  <p className="font-medium">{quote.customer.cnpj}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Localização</p>
                  <p className="font-medium">{quote.customer.city}/{quote.customer.uf}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">UF Destino</p>
                  <Badge variant="outline">{quote.destinationUF}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Items */}
          <Card>
            <CardHeader>
              <CardTitle>Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              <QuoteItemsTable items={quote.items} />
            </CardContent>
          </Card>

          {/* Payment and Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Condições e Observações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Condições de Pagamento</p>
                <p className="font-medium">{quote.paymentConditions}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Validade</p>
                <p className="font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(quote.validUntil)}
                  {new Date(quote.validUntil) < new Date() && (
                    <Badge variant="destructive" className="ml-2">Expirada</Badge>
                  )}
                </p>
              </div>
              {quote.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="whitespace-pre-wrap">{quote.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Impostos:</span>
                  <span>{formatCurrency(quote.totalTaxes)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Frete:</span>
                  <span>{formatCurrency(quote.totalFreight)}</span>
                </div>
                {quote.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Desconto:</span>
                    <span>-{formatCurrency(quote.discount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(quote.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itens:</span>
                <span>{quote.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criada:</span>
                <span>{formatDate(quote.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atualizada:</span>
                <span>{formatDate(quote.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criada por:</span>
                <span>{quote.createdBy}</span>
              </div>
            </CardContent>
          </Card>

          {/* VTEX Integration Status */}
          {vtexSettings && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ExternalLink className="h-4 w-4 mr-2 text-orange-600" />
                  Integração VTEX
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={vtexSettings.isEnabled ? "default" : "secondary"}>
                    {vtexSettings.isEnabled ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                {canSendToVTEX && (
                  <div className="text-xs text-muted-foreground">
                    Esta cotação pode ser enviada para VTEX
                  </div>
                )}
                {validationResults.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Validações:</p>
                    <div className="flex flex-wrap gap-1">
                      {validationResults.map(r => (
                        <Badge 
                          key={r.ruleId} 
                          variant={r.status === 'passed' ? 'default' : r.status === 'failed' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {r.status === 'passed' ? '✓' : r.status === 'failed' ? '✗' : '⚠'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <EmailDialog 
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        quote={quote}
      />
    </div>
  );
}
