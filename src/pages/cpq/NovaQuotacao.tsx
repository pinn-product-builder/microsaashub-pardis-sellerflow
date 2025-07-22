
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, Send, ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { CustomerSelector } from '@/components/cpq/forms/CustomerSelector';
import { ProductSelector } from '@/components/cpq/forms/ProductSelector';
import { QuoteItemsTable } from '@/components/cpq/tables/QuoteItemsTable';
import { PriceSummary } from '@/components/cpq/display/PriceSummary';
import { PaymentConditions } from '@/components/cpq/forms/PaymentConditions';
import { useCPQStore } from '@/stores/cpqStore';
import { QuoteService } from '@/services/quoteService';
import { VTEXService } from '@/services/vtexService';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/types/cpq';

export default function NovaQuotacao() {
  const { id } = useParams();
  const isEditing = !!id;
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingToVTEX, setIsSendingToVTEX] = useState(false);
  const { toast } = useToast();
  
  const {
    selectedCustomer,
    destinationUF,
    items,
    discount,
    paymentConditions,
    notes,
    setSelectedCustomer,
    addItem,
    setDiscount,
    setPaymentConditions,
    setNotes,
    clearQuote,
    setCurrentQuote
  } = useCPQStore();

  const totals = QuoteService.calculateQuoteTotals(items, discount);

  // Debug logs
  useEffect(() => {
    console.log('NovaQuotacao State:', {
      selectedCustomer: selectedCustomer?.companyName,
      destinationUF,
      itemsCount: items.length,
      currentStep
    });
  }, [selectedCustomer, destinationUF, items.length, currentStep]);

  // Carregar cotação para edição
  useEffect(() => {
    if (isEditing && id) {
      const quote = QuoteService.getQuote(id);
      if (quote) {
        setCurrentQuote(quote);
        setSelectedCustomer(quote.customer);
        setDiscount(quote.discount);
        setPaymentConditions(quote.paymentConditions);
        setNotes(quote.notes || '');
        
        // Adicionar itens da cotação
        quote.items.forEach(item => addItem(item));
        
        // Se tem cliente e itens, vai para o step 3
        if (quote.customer && quote.items.length > 0) {
          setCurrentStep(3);
        } else if (quote.customer) {
          setCurrentStep(2);
        }
      } else {
        toast({
          title: "Erro",
          description: "Cotação não encontrada.",
          variant: "destructive"
        });
      }
    }
  }, [isEditing, id]);

  const handleCustomerSelect = (customer: Customer) => {
    console.log('Customer selected:', customer.companyName, 'UF:', customer.uf);
    setSelectedCustomer(customer);
    
    // Aguardar um momento para garantir que o estado foi atualizado
    setTimeout(() => {
      if (!isEditing) {
        setCurrentStep(2);
        toast({
          title: "Cliente selecionado",
          description: `${customer.companyName} foi selecionado. Agora você pode adicionar produtos.`
        });
      }
    }, 100);
  };

  const handleProductAdded = () => {
    toast({
      title: "Produto adicionado",
      description: "Produto foi adicionado à cotação com sucesso!"
    });
    
    // Se tem produtos, permitir ir para finalização
    if (items.length > 0 && currentStep < 3) {
      setCurrentStep(3);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedCustomer || items.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione um cliente e adicione pelo menos um produto.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing && id) {
        // Atualizar cotação existente
        QuoteService.updateQuote(id, {
          customer: selectedCustomer,
          destinationUF,
          items,
          subtotal: totals.subtotal,
          totalTaxes: totals.totalTaxes,
          totalFreight: totals.totalFreight,
          discount: totals.discount,
          total: totals.total,
          paymentConditions,
          notes
        });

        toast({
          title: "Sucesso",
          description: "Cotação atualizada com sucesso."
        });
      } else {
        // Criar nova cotação
        const quote = QuoteService.createQuote({
          customer: selectedCustomer,
          destinationUF,
          items,
          subtotal: totals.subtotal,
          totalTaxes: totals.totalTaxes,
          totalFreight: totals.totalFreight,
          discount: totals.discount,
          total: totals.total,
          status: 'draft',
          paymentConditions,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
          createdBy: 'current-user',
          notes
        });

        toast({
          title: "Sucesso",
          description: `Cotação ${quote.number} salva como rascunho.`
        });
      }

      clearQuote();
      setCurrentStep(1);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a cotação.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedCustomer || items.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione um cliente e adicione pelo menos um produto.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      let quote;
      
      if (isEditing && id) {
        // Finalizar cotação existente
        quote = QuoteService.updateQuote(id, {
          customer: selectedCustomer,
          destinationUF,
          items,
          subtotal: totals.subtotal,
          totalTaxes: totals.totalTaxes,
          totalFreight: totals.totalFreight,
          discount: totals.discount,
          total: totals.total,
          status: 'calculated',
          paymentConditions,
          notes
        });
      } else {
        // Criar e finalizar nova cotação
        quote = QuoteService.createQuote({
          customer: selectedCustomer,
          destinationUF,
          items,
          subtotal: totals.subtotal,
          totalTaxes: totals.totalTaxes,
          totalFreight: totals.totalFreight,
          discount: totals.discount,
          total: totals.total,
          status: 'calculated',
          paymentConditions,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
          createdBy: 'current-user',
          notes
        });
      }

      toast({
        title: "Sucesso",
        description: `Cotação ${quote.number} finalizada com sucesso!`
      });

      clearQuote();
      setCurrentStep(1);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível finalizar a cotação.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendToVTEX = async () => {
    if (!selectedCustomer || items.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione um cliente e adicione pelo menos um produto.",
        variant: "destructive"
      });
      return;
    }

    setIsSendingToVTEX(true);
    try {
      // Primeiro, criar/atualizar a cotação
      let quote;
      
      if (isEditing && id) {
        quote = QuoteService.updateQuote(id, {
          customer: selectedCustomer,
          destinationUF,
          items,
          subtotal: totals.subtotal,
          totalTaxes: totals.totalTaxes,
          totalFreight: totals.totalFreight,
          discount: totals.discount,
          total: totals.total,
          status: 'calculated',
          paymentConditions,
          notes
        });
      } else {
        quote = QuoteService.createQuote({
          customer: selectedCustomer,
          destinationUF,
          items,
          subtotal: totals.subtotal,
          totalTaxes: totals.totalTaxes,
          totalFreight: totals.totalFreight,
          discount: totals.discount,
          total: totals.total,
          status: 'calculated',
          paymentConditions,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdBy: 'current-user',
          notes
        });
      }

      // Enviar para VTEX
      const result = await VTEXService.sendOrderToVTEX(quote);
      
      if (result.success) {
        toast({
          title: "Sucesso",
          description: `Cotação enviada para VTEX! ${result.message}`
        });
        
        // Atualizar status da cotação
        QuoteService.updateQuote(quote.id, { status: 'sent' });
        
        clearQuote();
        setCurrentStep(1);
      } else {
        toast({
          title: "Erro na integração VTEX",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar para VTEX.",
        variant: "destructive"
      });
    } finally {
      setIsSendingToVTEX(false);
    }
  };

  const steps = [
    { id: 1, title: "Cliente", description: "Selecione o cliente" },
    { id: 2, title: "Produtos", description: "Adicione os produtos" },
    { id: 3, title: "Finalização", description: "Revise e finalize" }
  ];

  const canProceedToStep2 = selectedCustomer && destinationUF;
  const canProceedToStep3 = canProceedToStep2 && items.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/cpq">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao CPQ
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'Editar Cotação' : 'Nova Cotação'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? 'Edite os dados da cotação' : 'Crie uma nova cotação para seu cliente'}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isLoading || !canProceedToStep3}>
            <Save className="h-4 w-4 mr-2" />
            {isEditing ? 'Salvar Alterações' : 'Salvar Rascunho'}
          </Button>
          <Button onClick={handleFinalize} disabled={isLoading || !canProceedToStep3}>
            <Send className="h-4 w-4 mr-2" />
            Finalizar Cotação
          </Button>
          <Button 
            onClick={handleSendToVTEX} 
            disabled={isSendingToVTEX || !canProceedToStep3}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSendingToVTEX ? 'Enviando...' : 'Enviar para VTEX'}
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep >= step.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step.id}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-px bg-border mx-4" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle>1. Seleção do Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerSelector 
                selectedCustomer={selectedCustomer}
                onCustomerSelect={handleCustomerSelect}
              />
            </CardContent>
          </Card>

          {/* Step 2: Product Selection */}
          {canProceedToStep2 && (
            <Card>
              <CardHeader>
                <CardTitle>2. Produtos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProductSelector 
                  destinationUF={destinationUF}
                  selectedCustomer={selectedCustomer}
                  onAddProduct={(item) => {
                    addItem(item);
                    handleProductAdded();
                  }}
                />
                {items.length > 0 && (
                  <>
                    <Separator />
                    <QuoteItemsTable items={items} />
                  </>
                )}
                {items.length > 0 && currentStep < 3 && (
                  <div className="flex justify-end">
                    <Button onClick={() => setCurrentStep(3)}>
                      Continuar para Finalização
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Payment Conditions */}
          {canProceedToStep3 && currentStep >= 3 && (
            <Card>
              <CardHeader>
                <CardTitle>3. Condições de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentConditions
                  paymentConditions={paymentConditions}
                  onPaymentChange={setPaymentConditions}
                  discount={discount}
                  onDiscountChange={setDiscount}
                  notes={notes}
                  onNotesChange={setNotes}
                  customerPaymentTerms={selectedCustomer?.paymentTerms || []}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Price Summary */}
        {items.length > 0 && (
          <div className="space-y-6">
            <PriceSummary 
              items={items}
              discount={discount}
              totals={totals}
            />
          </div>
        )}
      </div>
    </div>
  );
}
