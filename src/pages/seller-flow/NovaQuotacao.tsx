import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Componentes Modularizados
import { NovaQuotacaoHeader } from '@/components/seller-flow/forms/nova-quotacao/NovaQuotacaoHeader';
import { NovaQuotacaoProgress } from '@/components/seller-flow/forms/nova-quotacao/NovaQuotacaoProgress';
import { NovaQuotacaoStep1 } from '@/components/seller-flow/forms/nova-quotacao/NovaQuotacaoStep1';
import { NovaQuotacaoStep2 } from '@/components/seller-flow/forms/nova-quotacao/NovaQuotacaoStep2';
import { NovaQuotacaoStep3 } from '@/components/seller-flow/forms/nova-quotacao/NovaQuotacaoStep3';
import { PriceSummary } from '@/components/seller-flow/display/PriceSummary';

// Hooks e Stores
import { useSellerFlowStore } from '@/stores/sellerFlowStore';
import { useVtexPolicyStore } from '@/stores/vtexPolicyStore';
import { usePardisQuote } from '@/hooks/usePardisQuote';

// Serviços e Utils
import { QuoteService } from '@/services/quoteService';
import { VtexQuoteService } from '@/services/vtexQuoteService';
import { EdgeFunctions } from '@/services/edgeFunctions';
import { getApproverLabel } from '@/hooks/usePardisQuote';
import { Customer } from '@/types/seller-flow';

/**
 * Página Principal de Nova Cotação / Edição.
 * Esta página orquestra o fluxo de venda em 3 passos, utilizando componentes modulares para manter o código limpo.
 */
export default function NovaQuotacao() {
  const { id } = useParams();
  const isEditing = !!id;
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingToVTEX, setIsSendingToVTEX] = useState(false);
  const { mode: policyMode, tradePolicyId } = useVtexPolicyStore();
  const { toast } = useToast();

  const {
    selectedCustomer,
    destinationUF,
    items,
    discount,
    discountReason,
    paymentConditions,
    notes,
    setSelectedCustomer,
    setDestinationUF,
    addItem,
    updateItem,
    setDiscount,
    setDiscountReason,
    setPaymentConditions,
    setNotes,
    clearQuote,
    setCurrentQuote
  } = useSellerFlowStore();

  const totals = QuoteService.calculateQuoteTotals(items, discount);

  // Cálculos de Margem Pardis em Tempo Real
  const { summary: pardisSummary, isLoading: isPardisLoading } = usePardisQuote(items, selectedCustomer, discount);

  // Limpar justificativa se o desconto for removido
  useEffect(() => {
    if (discount <= 0 && discountReason) {
      setDiscountReason('');
    }
  }, [discount, discountReason, setDiscountReason]);

  // Carregar dados da cotação existente (Modo Edição)
  useEffect(() => {
    const loadQuote = async () => {
      if (isEditing && id) {
        setIsLoading(true);
        try {
          const quote = await VtexQuoteService.getQuote(id);
          if (quote) {
            setCurrentQuote(quote);
            setSelectedCustomer(quote.customer as any);
            setDestinationUF(quote.destinationUF);
            setDiscount(quote.discount);
            setDiscountReason((quote as any).discountReason || '');
            setPaymentConditions(quote.paymentConditions);
            setNotes(quote.notes || '');

            // Resetar e recarregar itens
            clearQuote();
            quote.items?.forEach(item => addItem(item));

            // Determinar passo inicial
            if (quote.customer && quote.items?.length > 0) {
              setCurrentStep(3);
            } else if (quote.customer) {
              setCurrentStep(2);
            }
          }
        } catch (error) {
          toast({
            title: "Erro ao carregar",
            description: "Cotação não encontrada ou inacessível.",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadQuote();
  }, [id, isEditing]);

  // Handlers Principais
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDestinationUF(customer.uf || "");

    if (!isEditing) {
      setCurrentStep(2);
      toast({
        title: "Cliente selecionado",
        description: `${customer.companyName} foi selecionado. Adicione produtos agora.`
      });
    }
  };

  const handleProductAdded = () => {
    toast({
      title: "Produto adicionado",
      description: "Item incluído na cotação com sucesso!"
    });
  };

  const handleSaveDraft = async () => {
    if (!selectedCustomer || items.length === 0) {
      toast({ title: "Erro", description: "Dados insuficientes para salvar.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await VtexQuoteService.createOrUpdateQuote({
        quoteId: isEditing ? id : undefined,
        customer: selectedCustomer as any,
        destinationUF,
        tradePolicyId,
        items: items as any,
        status: "draft",
        subtotal: totals.subtotal,
        discount: totals.discount,
        discountReason: discountReason.trim(),
        total: totals.total,
        totalMarginPercent: pardisSummary.totalMarginPercent ?? null,
        requiresApproval: pardisSummary.requiresApproval,
        isAuthorized: pardisSummary.isAuthorized,
        notes,
      });

      toast({ title: "Sucesso", description: "Rascunho salvo com sucesso." });
      clearQuote();
      setCurrentStep(1);
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível salvar rascunho.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedCustomer || items.length === 0) {
      toast({ title: "Erro", description: "Selecione cliente e produtos.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const saved = await VtexQuoteService.createOrUpdateQuote({
        quoteId: isEditing ? id : undefined,
        customer: selectedCustomer as any,
        destinationUF,
        tradePolicyId,
        items: items as any,
        status: pardisSummary.requiresApproval ? "pending_approval" : "calculated",
        subtotal: totals.subtotal,
        discount: totals.discount,
        discountReason: discountReason.trim(),
        total: totals.total,
        totalMarginPercent: pardisSummary.totalMarginPercent ?? null,
        requiresApproval: pardisSummary.requiresApproval,
        isAuthorized: pardisSummary.isAuthorized,
        notes,
      });

      if (pardisSummary.requiresApproval) {
        toast({ title: "Enviado para Aprovação", description: "Margem abaixo do limite automático." });
      } else {
        toast({ title: "Finalizado", description: `Cotação ${saved.number} pronta para envio.` });
      }

      clearQuote();
      setCurrentStep(1);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao finalizar cotação.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendToVTEX = async () => {
    setIsSendingToVTEX(true);
    try {
      // 1. Validar disponibilidade (re-fetch de preços e estoque)
      const validation = await VtexQuoteService.validateCart(tradePolicyId, items as any);
      const failures = validation.filter(v => !v.ok);

      if (failures.length) {
        toast({
          title: "Inconsistência encontrada",
          description: "Preços ou estoque alterados. Por favor, revise os itens.",
          variant: "destructive"
        });
        return;
      }

      // 2. Chamar Edge Function para criar OrderForm
      const result = await EdgeFunctions.createVtexOrderForm({
        customer: selectedCustomer as any,
        items: items as any,
        tradePolicyId
      });

      if (result?.success) {
        toast({ title: "Sucesso VTEX", description: "OrderForm criado no catálogo." });
        clearQuote();
        setCurrentStep(1);
      }
    } catch (error) {
      toast({ title: "Erro de Integração", description: "Falha ao sincronizar com VTEX.", variant: "destructive" });
    } finally {
      setIsSendingToVTEX(false);
    }
  };

  const canProceedToStep2 = !!selectedCustomer && !!destinationUF;
  const canProceedToStep3 = canProceedToStep2 && items.length > 0;

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* IDENTIFICAÇÃO: CABEÇALHO GLOBAL */}
      <NovaQuotacaoHeader
        isEditing={isEditing}
        isPardisLoading={isPardisLoading}
        isLoading={isLoading}
        isSendingToVTEX={isSendingToVTEX}
        hasItems={items.length > 0}
        canProceedToStep3={canProceedToStep3}
        pardisSummary={pardisSummary}
        handleSaveDraft={handleSaveDraft}
        handleFinalize={handleFinalize}
        handleSendToVTEX={handleSendToVTEX}
      />

      {/* IDENTIFICAÇÃO: AVISO DE APROVAÇÃO (FLUXO PARDIS) */}
      {items.length > 0 && pardisSummary.requiresApproval && (
        <div className="mb-8 p-6 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-lg text-yellow-900 dark:text-yellow-100">Governança Comercial: Aprovação Necessária</h4>
              <p className="text-yellow-800 dark:text-yellow-200 mt-1">
                A margem atual de <strong>{pardisSummary.totalMarginPercent.toFixed(2)}%</strong> está abaixo da alçada automática do vendedor.
                Aprovação necessária por: <strong>{getApproverLabel(pardisSummary.requiredApproverRole!)}</strong>.
              </p>
              <div className="flex gap-4 mt-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 font-bold px-3 py-1">
                  {pardisSummary.authorizedCount} Itens OK
                </Badge>
                <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200 font-bold px-3 py-1">
                  {pardisSummary.unauthorizedCount} Pendentes
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IDENTIFICAÇÃO: PROGRESSO DO FLUXO (STEPPER) */}
      <NovaQuotacaoProgress currentStep={currentStep} />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">

          {/* IDENTIFICAÇÃO: PASSO 1 - CLIENTE */}
          <NovaQuotacaoStep1
            selectedCustomer={selectedCustomer}
            destinationUF={destinationUF}
            onCustomerSelect={handleCustomerSelect}
            onUFChange={setDestinationUF}
          />

          {/* IDENTIFICAÇÃO: PASSO 2 - PRODUTOS */}
          {canProceedToStep2 && (
            <NovaQuotacaoStep2
              destinationUF={destinationUF}
              selectedCustomer={selectedCustomer}
              policyMode={policyMode}
              tradePolicyId={tradePolicyId}
              items={items}
              discount={discount}
              currentStep={currentStep}
              addItem={addItem}
              handleProductAdded={handleProductAdded}
              setCurrentStep={setCurrentStep}
            />
          )}

          {/* IDENTIFICAÇÃO: PASSO 3 - FINALIZAÇÃO */}
          {canProceedToStep3 && currentStep >= 3 && (
            <NovaQuotacaoStep3
              selectedCustomer={selectedCustomer}
              paymentConditions={paymentConditions}
              onPaymentChange={setPaymentConditions}
              discount={discount}
              onDiscountChange={setDiscount}
              discountReason={discountReason}
              onDiscountReasonChange={setDiscountReason}
              notes={notes}
              onNotesChange={setNotes}
            />
          )}
        </div>

        {/* IDENTIFICAÇÃO: SIDEBAR DE RESUMO (PRICE SUMMARY) */}
        <div className="lg:sticky lg:top-8 h-fit space-y-6">
          {items.length > 0 && (
            <div className="bg-card rounded-xl border shadow-xl p-2">
              <PriceSummary
                items={items}
                discount={discount}
                totals={totals}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
