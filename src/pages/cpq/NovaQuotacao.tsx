
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, Send, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CustomerSelector } from '@/components/cpq/forms/CustomerSelector';
import { ProductSelector } from '@/components/cpq/forms/ProductSelector';
import { QuoteItemsTable } from '@/components/cpq/tables/QuoteItemsTable';
import { PriceSummary } from '@/components/cpq/display/PriceSummary';
import { PaymentConditions } from '@/components/cpq/forms/PaymentConditions';
import { useCPQStore } from '@/stores/cpqStore';
import { QuoteService } from '@/services/quoteService';
import { PricingService } from '@/services/pricingService';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/types/cpq';

export default function NovaQuotacao() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
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
    clearQuote
  } = useCPQStore();

  const totals = QuoteService.calculateQuoteTotals(items, discount);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCurrentStep(2);
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
      const quote = QuoteService.createQuote({
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

  const steps = [
    { id: 1, title: "Cliente", description: "Selecione o cliente" },
    { id: 2, title: "Produtos", description: "Adicione os produtos" },
    { id: 3, title: "Finalização", description: "Revise e finalize" }
  ];

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
            <h1 className="text-2xl font-bold">Nova Cotação</h1>
            <p className="text-muted-foreground">Crie uma nova cotação para seu cliente</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>
          <Button onClick={handleFinalize} disabled={isLoading || items.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            Finalizar Cotação
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
          {currentStep >= 1 && (
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
          )}

          {/* Step 2: Product Selection */}
          {currentStep >= 2 && selectedCustomer && (
            <Card>
              <CardHeader>
                <CardTitle>2. Produtos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProductSelector 
                  destinationUF={destinationUF}
                  onAddProduct={addItem}
                />
                {items.length > 0 && (
                  <>
                    <Separator />
                    <QuoteItemsTable items={items} />
                  </>
                )}
                {items.length > 0 && (
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
          {currentStep >= 3 && items.length > 0 && (
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
