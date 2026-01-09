import { PageContainer, PageHeader, PageContent } from '@/components/layout/Page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Shield, CreditCard, Clock, Settings } from 'lucide-react';
import { PricingConfigTab } from '@/components/cpq/config/PricingConfigTab';
import { ApprovalRulesTab } from '@/components/cpq/config/ApprovalRulesTab';
import { PaymentConditionsTab } from '@/components/cpq/config/PaymentConditionsTab';
import { ValidityConfigTab } from '@/components/cpq/config/ValidityConfigTab';
import { EngineConfigTab } from '@/components/cpq/config/EngineConfigTab';
import { PricingFormulaCard } from '@/components/cpq/config/PricingFormulaCard';
import { MarginSimulator } from '@/components/cpq/config/MarginSimulator';
import { AuthRequiredCard } from '@/components/cpq/config/AuthRequiredCard';
import { usePricingConfigs } from '@/hooks/usePricingConfig';
import { useAuthStore } from '@/stores/authStore';

export default function Configuracoes() {
  const { isAuthenticated } = useAuthStore();
  const { data: configs } = usePricingConfigs();
  
  // Se não autenticado, mostrar card de autenticação
  if (!isAuthenticated) {
    return (
      <PageContainer>
        <PageHeader
          title="Configurações do Sistema"
          description="Gerencie os parâmetros de precificação, aprovação e validade de cotações"
        />
        <PageContent>
          <AuthRequiredCard />
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Configurações do Sistema"
        description="Gerencie os parâmetros de precificação, aprovação e validade de cotações"
      />
      <PageContent>
        <Tabs defaultValue="pricing" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Pricing</span>
            </TabsTrigger>
            <TabsTrigger value="engine" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Motor</span>
            </TabsTrigger>
            <TabsTrigger value="approval" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Aprovações</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Pagamento</span>
            </TabsTrigger>
            <TabsTrigger value="validity" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Validade</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" className="space-y-6">
            {/* Fórmula explicativa */}
            <PricingFormulaCard config={configs?.[0]} />
            
            {/* Simulador de margem */}
            <MarginSimulator configs={configs} />
            
            {/* Tabela de configuração */}
            <PricingConfigTab />
          </TabsContent>

          <TabsContent value="engine" className="space-y-6">
            <EngineConfigTab />
          </TabsContent>

          <TabsContent value="approval">
            <ApprovalRulesTab />
          </TabsContent>

          <TabsContent value="payment">
            <PaymentConditionsTab />
          </TabsContent>

          <TabsContent value="validity">
            <ValidityConfigTab />
          </TabsContent>
        </Tabs>
      </PageContent>
    </PageContainer>
  );
}
