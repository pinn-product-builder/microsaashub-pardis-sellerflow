import { PageContainer, PageHeader, PageContent } from '@/components/layout/Page';
import { LogViewer } from '@/components/admin/LogViewer';

export default function Logs() {
  return (
    <PageContainer>
      <PageHeader
        title="Logs do Sistema"
        description="Monitore eventos, erros e atividades em tempo real para facilitar a gestão de problemas"
      />
      <PageContent>
        <LogViewer />
      </PageContent>
    </PageContainer>
  );
}
