import { useState } from 'react';
import { PageContainer, PageHeader, PageContent } from '@/components/layout/Page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Shield, CreditCard, Clock, Settings, Calendar } from 'lucide-react';
import { PricingConfigTab } from '@/components/seller-flow/config/PricingConfigTab';
import { ApprovalRulesTab } from '@/components/seller-flow/config/ApprovalRulesTab';
import { PaymentConditionsTab } from '@/components/seller-flow/config/PaymentConditionsTab';
import { ValidityConfigTab } from '@/components/seller-flow/config/ValidityConfigTab';
import { EngineConfigTab } from '@/components/seller-flow/config/EngineConfigTab';
import { BusinessHoursTab } from '@/components/seller-flow/config/BusinessHoursTab';
import { UserAbsenceManagement } from '@/components/profile/UserAbsenceManagement';
import { PricingFormulaCard } from '@/components/seller-flow/config/PricingFormulaCard';
import { MarginSimulator } from '@/components/seller-flow/config/MarginSimulator';
import { AuthRequiredCard } from '@/components/seller-flow/config/AuthRequiredCard';
import { usePricingConfigs } from '@/hooks/usePricingConfig';
import { usePricingEngineConfig, useActiveApprovalRulesForEngine } from '@/hooks/usePricingEngineConfig';
import { useAuth } from '@/hooks/useAuth';

export default function Configuracoes() {
  const { isAuthenticated } = useAuth();
  const { data: configs } = usePricingConfigs();
  const { data: engineConfig } = usePricingEngineConfig();
  const { data: approvalRules } = useActiveApprovalRulesForEngine();
  const [activeTab, setActiveTab] = useState('pricing');

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

  const handleNavigateToTab = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Configurações do Sistema"
        description="Gerencie os parâmetros de precificação, aprovação e validade de cotações"
      />
      <PageContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Pricing</span>
            </TabsTrigger>
            <TabsTrigger value="motor" className="flex items-center gap-2">
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
            <TabsTrigger value="hours" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Horário</span>
            </TabsTrigger>
            <TabsTrigger value="absences" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Ausências</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" className="space-y-6">
            {/* Fórmula explicativa */}
            <PricingFormulaCard
              config={configs?.[0]}
              engineConfig={engineConfig}
              approvalRules={approvalRules}
              onNavigateToTab={handleNavigateToTab}
            />

            {/* Simulador de margem */}
            <MarginSimulator configs={configs} />

            {/* Tabela de configuração */}
            <PricingConfigTab />
          </TabsContent>

          <TabsContent value="motor" className="space-y-6">
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

          <TabsContent value="hours">
            <BusinessHoursTab />
          </TabsContent>

          <TabsContent value="absences">
            <UserAbsenceManagement />
          </TabsContent>
        </Tabs>
      </PageContent>
    </PageContainer>
  );
}
