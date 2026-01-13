import { useState, useEffect } from 'react';
import { Page, PageContainer, PageHeader, PageContent } from '@/components/layout/Page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, RefreshCw, CheckCircle, Users, Package, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  exportToPDF, 
  DocumentData,
  ApprovalRule,
  PricingConfig,
  PricingEngineConfig,
  PaymentCondition,
  Permission
} from '@/services/businessRulesDocumentGenerator';

export default function Documentacao() {
  const [isLoading, setIsLoading] = useState(true);
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [
        { data: approvalRules },
        { data: pricingConfigs },
        { data: engineConfig },
        { data: paymentConditions },
        { data: permissions }
      ] = await Promise.all([
        supabase.from('approval_rules').select('*').eq('is_active', true).order('margin_min'),
        supabase.from('pricing_config').select('*').eq('is_active', true),
        supabase.from('pricing_engine_config').select('*').eq('is_active', true).limit(1).single(),
        supabase.from('payment_conditions').select('*').eq('is_active', true).order('days'),
        supabase.from('permissions').select('*').eq('is_active', true).order('module').order('name')
      ]);

      setDocumentData({
        approvalRules: (approvalRules || []) as ApprovalRule[],
        pricingConfigs: (pricingConfigs || []) as PricingConfig[],
        engineConfig: engineConfig as PricingEngineConfig,
        paymentConditions: (paymentConditions || []) as PaymentCondition[],
        permissions: (permissions || []) as Permission[],
        generatedAt: new Date(),
        version: '1.0.0'
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados para documentação');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportPDF = () => {
    if (!documentData) {
      toast.error('Dados não carregados');
      return;
    }
    exportToPDF(documentData);
    toast.success('PDF gerado! Use Ctrl+P ou Cmd+P para salvar.');
  };

  const modules = [
    {
      icon: LogIn,
      title: 'Autenticação',
      description: 'Login, logout e controle de sessão',
      rules: ['Autenticação via e-mail e senha', 'Recuperação de senha', 'Controle de sessão', 'Rotas protegidas']
    },
    {
      icon: FileText,
      title: 'Cotações',
      description: 'Criação, cálculo e aprovação de propostas',
      rules: ['Ciclo de vida completo', 'Precificação por região (MG/BR)', 'Cálculo de margem', 'Matriz de aprovação', 'Condições de pagamento']
    },
    {
      icon: Package,
      title: 'Cadastros',
      description: 'Gestão de clientes e produtos',
      rules: ['Cadastro de clientes', 'Cadastro de produtos', 'Importação CSV', 'Soft delete']
    },
    {
      icon: Users,
      title: 'Gestão de Usuários',
      description: 'Usuários, grupos e permissões',
      rules: ['Controle de acesso baseado em permissões', 'Grupos de usuários', 'Hierarquia de papéis', 'Matriz de aprovação']
    }
  ];

  return (
    <Page>
      <PageContainer>
        <PageHeader 
          title="Documentação" 
          description="Documento de regras de negócio do sistema"
        />
        <PageContent>
        {/* Header com ações */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Regras de Negócio - Pardis Seller Flow</CardTitle>
                  <CardDescription>
                    Documentação completa dos módulos focais desta etapa do projeto
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadData} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                <Button onClick={handleExportPDF} disabled={isLoading || !documentData}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Versão 1.0.0</Badge>
              <Badge variant="outline">
                Gerado em: {documentData?.generatedAt.toLocaleDateString('pt-BR') || '-'}
              </Badge>
              <Badge variant="secondary">4 módulos documentados</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Módulos documentados */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((module, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <module.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{module.title}</CardTitle>
                    <CardDescription className="text-sm">{module.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {module.rules.map((rule, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Resumo de configurações */}
        {documentData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo de Configurações Atuais</CardTitle>
              <CardDescription>Dados que serão incluídos no documento PDF</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{documentData.approvalRules.length}</p>
                  <p className="text-sm text-muted-foreground">Regras de Aprovação</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{documentData.pricingConfigs.length}</p>
                  <p className="text-sm text-muted-foreground">Regiões de Preço</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{documentData.paymentConditions.length}</p>
                  <p className="text-sm text-muted-foreground">Condições Pagamento</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{documentData.permissions.length}</p>
                  <p className="text-sm text-muted-foreground">Permissões</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Matriz de Aprovação */}
                <div>
                  <h4 className="font-medium mb-2">Matriz de Aprovação</h4>
                  <div className="space-y-1">
                    {documentData.approvalRules.map((rule, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                        <span className="font-medium">{rule.name}</span>
                        <Badge variant="outline">{rule.approver_role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Condições de Pagamento */}
                <div>
                  <h4 className="font-medium mb-2">Condições de Pagamento</h4>
                  <div className="space-y-1">
                    {documentData.paymentConditions.map((cond, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                        <span>{cond.name}</span>
                        <span className="text-muted-foreground">
                          {cond.adjustment_percent > 0 ? '+' : ''}{cond.adjustment_percent.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </PageContent>
      </PageContainer>
    </Page>
  );
}
