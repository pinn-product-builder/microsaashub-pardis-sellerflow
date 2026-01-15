import { PageContainer, PageHeader, PageContent } from '@/components/layout/Page';
import TaxRulesManager from '@/components/admin/TaxRulesManager';

export default function RegrasFiscais() {
  return (
    <PageContainer>
      <PageHeader 
        title="Regras Fiscais" 
        description="Gerencie as alíquotas de impostos por estado"
      />
      <PageContent>
        <TaxRulesManager />
      </PageContent>
    </PageContainer>
  );
}
