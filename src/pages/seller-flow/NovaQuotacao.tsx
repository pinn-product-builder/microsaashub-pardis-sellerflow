import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, Send, ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { CustomerSelector } from '@/components/seller-flow/forms/CustomerSelector';
import { VtexProductSelector } from '@/components/seller-flow/forms/VtexProductSelector';
import { QuoteItemsTable } from '@/components/seller-flow/tables/QuoteItemsTable';
import { PriceSummary } from '@/components/seller-flow/display/PriceSummary';
import { PaymentConditions } from '@/components/seller-flow/forms/PaymentConditions';
import { AuthorizationBadge } from '@/components/seller-flow/display/AuthorizationBadge';
import { useSellerFlowStore } from '@/stores/sellerFlowStore';
import { QuoteService } from '@/services/quoteService';
import { EdgeFunctions } from '@/services/edgeFunctions';
import { VtexQuoteService } from '@/services/vtexQuoteService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePardisQuote, getApproverLabel } from '@/hooks/usePardisQuote';
import { Customer } from '@/types/seller-flow';
import { useVtexPolicyStore } from '@/stores/vtexPolicyStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function NovaQuotacao() {
  const { id } = useParams();
  const isEditing = !!id;
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingToVTEX, setIsSendingToVTEX] = useState(false);
  const { mode: policyMode, tradePolicyId, setMode: setPolicyMode, setTradePolicyId, policies, loadPolicies } = useVtexPolicyStore();
  const [isRepricingAll, setIsRepricingAll] = useState(false);
  const { toast } = useToast();
  
  const {
    selectedCustomer,
    destinationUF,
    items,
    discount,
    paymentConditions,
    notes,
    setSelectedCustomer,
    setDestinationUF,
    addItem,
    updateItem,
    setDiscount,
    setPaymentConditions,
    setNotes,
    clearQuote,
    setCurrentQuote
  } = useSellerFlowStore();

  const totals = QuoteService.calculateQuoteTotals(items, discount);
  
  // Pardis margin calculations
  const { summary: pardisSummary, isLoading: isPardisLoading } = usePardisQuote(items, selectedCustomer);

  // Debug logs
  useEffect(() => {
    console.log('NovaQuotacao State:', {
      selectedCustomer: selectedCustomer?.companyName,
      destinationUF,
      itemsCount: items.length,
      currentStep,
      pardisAuthorized: pardisSummary.isAuthorized,
      pardisMargin: pardisSummary.totalMarginPercent
    });
  }, [selectedCustomer, destinationUF, items.length, currentStep, pardisSummary]);

  // (removido) selector de policy manual

  // Carregar cotação para edição
  useEffect(() => {
    const loadQuote = async () => {
      if (isEditing && id) {
        const quote = await VtexQuoteService.getQuote(id);
        if (quote) {
          setCurrentQuote(quote);
          setSelectedCustomer(quote.customer);
          setDiscount(quote.discount);
          setPaymentConditions(quote.paymentConditions);
          setNotes(quote.notes || '');
          // mantém valor legacy apenas; modo padrão continua auto
          
          // Adicionar itens da cotação
          quote.items?.forEach(item => addItem(item));
          
          // Se tem cliente e itens, vai para o step 3
          if (quote.customer && quote.items?.length > 0) {
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
    };
    loadQuote();
  }, [isEditing, id]);

  useEffect(() => {
    if (policyMode === "fixed") loadPolicies();
  }, [policyMode, loadPolicies]);

  useEffect(() => {
    // Se o usuário fixar policy, recalcula todos os itens VTEX no carrinho (uma chamada RPC com arrays)
    if (policyMode !== "fixed") return;
    if (!items.length) return;

    const vtexItems = items.filter((it: any) => String(it.product?.id || "").startsWith("vtex:"));
    if (!vtexItems.length) return;

    (async () => {
      setIsRepricingAll(true);
      try {
        const sku_ids = vtexItems.map((it: any) => Number(it.product.sku));
        const quantities = vtexItems.map((it: any) => Number(it.quantity));
        const { data, error } = await (supabase as any).rpc("get_vtex_effective_prices", {
          sku_ids,
          quantities,
          trade_policy_id: String(tradePolicyId || "1"),
        });
        if (error) throw error;
        const map = new Map<number, any>();
        for (const r of (data ?? [])) map.set(Number(r.vtex_sku_id), r);

        vtexItems.forEach((it: any) => {
          const skuId = Number(it.product.sku);
          const row = map.get(skuId);
          const unit = row?.effective_price ?? null;
          if (unit && unit > 0) {
            updateItem(it.id, {
              ...it,
              unitPrice: unit,
              totalPrice: unit * it.quantity,
              vtexTradePolicyId: String(tradePolicyId || "1"),
            } as any);
          }
        });
      } catch {
        // silencioso (a UI já mostra valores anteriores)
      } finally {
        setIsRepricingAll(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyMode, tradePolicyId]);

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
      const saved = await VtexQuoteService.createOrUpdateQuote({
        quoteId: isEditing ? id : undefined,
        customer: selectedCustomer as any,
        destinationUF,
        tradePolicyId,
        items: items as any,
        status: "draft",
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        totalMarginPercent: pardisSummary.totalMarginPercent ?? null,
        requiresApproval: pardisSummary.requiresApproval,
        isAuthorized: pardisSummary.isAuthorized,
        notes,
      });

      toast({
        title: "Sucesso",
        description: `Cotação ${saved.number} salva como rascunho.`,
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
      const saved = await VtexQuoteService.createOrUpdateQuote({
        quoteId: isEditing ? id : undefined,
        customer: selectedCustomer as any,
        destinationUF,
        tradePolicyId,
        items: items as any,
        status: "calculated",
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        totalMarginPercent: pardisSummary.totalMarginPercent ?? null,
        requiresApproval: pardisSummary.requiresApproval,
        isAuthorized: pardisSummary.isAuthorized,
        notes,
      });

      // Se requer aprovação, cria solicitação e muda status para pending_approval
      if (pardisSummary.requiresApproval) {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) {
          throw new Error("Usuário não autenticado");
        }

        const { error: approvalErr } = await (supabase as any).from("vtex_approval_requests").insert({
          quote_id: saved.id,
          requested_by: user.id,
          quote_total: totals.total,
          quote_margin_percent: pardisSummary.totalMarginPercent ?? null,
          reason: `Margem ${pardisSummary.totalMarginPercent.toFixed(2)}% requer aprovação`,
          status: "pending",
        });
        if (approvalErr) throw approvalErr;

        const { error: qErr } = await (supabase as any).from("vtex_quotes").update({
          status: "pending_approval",
          requires_approval: true,
          updated_by: user.id,
        }).eq("id", saved.id);
        if (qErr) throw qErr;

        toast({
          title: "Enviado para aprovação",
          description: `Cotação ${saved.number} enviada para aprovação.`,
        });
      } else {
      toast({
        title: "Sucesso",
        description: `Cotação ${saved.number} finalizada com sucesso!`
      });
      }

      clearQuote();
      setCurrentStep(1);
    } catch (error) {
      // Log detalhado para debug (PostgREST costuma retornar erro rico)
      console.error("Erro ao finalizar cotação:", error);
      toast({
        title: "Erro",
        description: (error as any)?.message ?? "Não foi possível finalizar a cotação.",
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
      const saved = await VtexQuoteService.createOrUpdateQuote({
        quoteId: isEditing ? id : undefined,
        customer: selectedCustomer as any,
        destinationUF,
        tradePolicyId,
        items: items as any,
        status: "calculated",
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        totalMarginPercent: pardisSummary.totalMarginPercent ?? null,
        requiresApproval: pardisSummary.requiresApproval,
        isAuthorized: pardisSummary.isAuthorized,
        notes,
      });

      // Validação server-side: preço + estoque
      const validation = await VtexQuoteService.validateCart(policyMode === "fixed" ? tradePolicyId : null, items as any);
      const failures = validation.filter((r) => !r.ok);
      if (failures.length) {
        toast({
          title: "Falha na validação do carrinho",
          description: `Há ${failures.length} item(ns) com problema (preço/estoque). Ajuste antes de enviar.`,
          variant: "destructive",
        });
        return;
      }

      if (pardisSummary.requiresApproval) {
        toast({
          title: "Requer aprovação",
          description: "Esta cotação precisa ser aprovada antes do envio à VTEX.",
          variant: "destructive",
        });
        return;
      }

      const result = await EdgeFunctions.createVtexOrderForm({
        quoteId: saved.id,
        tradePolicyId,
        seller: "1",
      });
      
      if (result?.success) {
        toast({
          title: "Sucesso",
          description: `OrderForm criado na VTEX: ${result.orderFormId}`
        });

        clearQuote();
        setCurrentStep(1);
      } else {
        toast({
          title: "Erro na integração VTEX",
          description: "Não foi possível criar o orderForm.",
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

  const canProceedToStep2 = !!selectedCustomer && !!destinationUF;
  const canProceedToStep3 = canProceedToStep2 && items.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/seller-flow">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Seller Flow
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {isEditing ? 'Editar Cotação' : 'Nova Cotação'}
              {/* Authorization status badge in header */}
              {items.length > 0 && !isPardisLoading && (
                <AuthorizationBadge 
                  isAuthorized={pardisSummary.isAuthorized}
                  requiresApproval={pardisSummary.requiresApproval}
                  requiredRole={pardisSummary.requiredApproverRole}
                  size="sm"
                />
              )}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? 'Edite os dados da cotação' : 'Crie uma nova cotação para seu cliente'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isLoading || !canProceedToStep3}>
            <Save className="h-4 w-4 mr-2" />
            {isEditing ? 'Salvar Alterações' : 'Salvar Rascunho'}
          </Button>
          <Button 
            onClick={handleFinalize} 
            disabled={isLoading || !canProceedToStep3}
            variant={pardisSummary.requiresApproval ? "outline" : "default"}
          >
            {pardisSummary.requiresApproval ? (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Enviar para Aprovação
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Finalizar Cotação
              </>
            )}
          </Button>
          <Button 
            onClick={handleSendToVTEX} 
            disabled={isSendingToVTEX || !canProceedToStep3 || pardisSummary.requiresApproval}
            className="bg-orange-600 hover:bg-orange-700"
            title={pardisSummary.requiresApproval ? "Requer aprovação antes de enviar para VTEX" : undefined}
          >
            {isSendingToVTEX ? 'Enviando...' : 'Enviar para VTEX'}
          </Button>
        </div>
      </div>

      {/* Approval Warning Banner */}
      {items.length > 0 && pardisSummary.requiresApproval && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                Cotação requer aprovação
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                A margem de {pardisSummary.totalMarginPercent.toFixed(2)}% está abaixo do limite autorizado. 
                Esta cotação precisará ser aprovada por um(a) <strong>{getApproverLabel(pardisSummary.requiredApproverRole!)}</strong> antes de ser enviada ao cliente.
              </p>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-green-600">{pardisSummary.authorizedCount} itens autorizados</span>
                <span className="text-red-600">{pardisSummary.unauthorizedCount} itens pendentes</span>
              </div>
            </div>
          </div>
        </div>
      )}

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

              {/* UF destino pode vir vazia na base VTEX; nesse caso, o usuário escolhe manualmente */}
              {selectedCustomer && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium">UF de destino *</div>
                  <Select value={destinationUF || ''} onValueChange={(v) => setDestinationUF(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
                        "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
                        "RS","RO","RR","SC","SP","SE","TO",
                      ].map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!destinationUF && (
                    <div className="text-xs text-muted-foreground">
                      O cliente selecionado não possui UF cadastrada; selecione a UF para liberar o passo de produtos.
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <div className="text-sm font-medium">Política comercial (para preço VTEX)</div>
                    <div className="flex flex-col md:flex-row gap-2 mt-2">
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm md:w-56"
                        value={policyMode}
                        onChange={(e) => setPolicyMode(e.target.value as any)}
                      >
                        <option value="auto">Automático</option>
                        <option value="fixed">Fixar policy</option>
                      </select>
                      {policyMode === "fixed" && (
                        <select
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm md:w-72"
                          value={tradePolicyId}
                          onChange={(e) => setTradePolicyId(e.target.value)}
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          {policies
                            .map((p) => p.trade_policy_id)
                            .filter((p) => p !== "1" && p !== "2")
                            .slice(0, 80)
                            .map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {policyMode === "auto"
                        ? "Automático: escolhe a policy com preço disponível (prioridade: 1 → 2 → demais)."
                        : `Fixado: todos os preços serão recalculados usando "${tradePolicyId}".`}
                      {isRepricingAll ? " Recalculando itens..." : ""}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Product Selection */}
          {canProceedToStep2 && (
            <Card>
              <CardHeader>
                <CardTitle>2. Produtos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <VtexProductSelector
                  destinationUF={destinationUF}
                  selectedCustomer={selectedCustomer}
                  policyMode={policyMode}
                  tradePolicyId={tradePolicyId}
                  onAddProduct={(item) => {
                    addItem(item);
                    handleProductAdded();
                  }}
                />
                {items.length > 0 && (
                  <>
                    <Separator />
                    <QuoteItemsTable items={items} tradePolicyId={policyMode === "fixed" ? tradePolicyId : undefined} />
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
