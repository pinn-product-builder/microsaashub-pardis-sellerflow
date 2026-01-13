
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Play,
  ArrowLeft,
  Activity,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'warning' | 'running';
  description: string;
  duration: number;
  details?: string;
}

export default function Testes() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const [testResults, setTestResults] = useState<TestResult[]>([
    {
      id: '1',
      name: 'Validação de Formulários',
      status: 'passed',
      description: 'Testa se todos os campos obrigatórios são validados corretamente',
      duration: 234
    },
    {
      id: '2',
      name: 'Cálculo de Preços',
      status: 'passed',
      description: 'Verifica se os cálculos de impostos e frete estão corretos',
      duration: 187
    },
    {
      id: '3',
      name: 'Integração VTEX',
      status: 'warning',
      description: 'Testa a conectividade com a API da VTEX',
      duration: 456,
      details: 'Algumas requisições estão mais lentas que o esperado'
    },
    {
      id: '4',
      name: 'Performance de Componentes',
      status: 'failed',
      description: 'Verifica se os componentes renderizam dentro do tempo esperado',
      duration: 892,
      details: 'Componente QuoteItemsTable excedeu o tempo limite de renderização'
    },
    {
      id: '5',
      name: 'Acessibilidade',
      status: 'passed',
      description: 'Verifica se a aplicação atende aos padrões de acessibilidade',
      duration: 356
    }
  ]);

  const runAllTests = async () => {
    setIsRunning(true);
    setProgress(0);
    
    // Simula execução dos testes
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setProgress(i);
    }
    
    setIsRunning(false);
    toast({
      title: "Testes concluídos",
      description: "Todos os testes foram executados com sucesso.",
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-600 animate-pulse" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-100 text-green-800">Passou</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Falhou</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Aviso</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">Executando</Badge>;
    }
  };

  const passedTests = testResults.filter(t => t.status === 'passed').length;
  const failedTests = testResults.filter(t => t.status === 'failed').length;
  const warningTests = testResults.filter(t => t.status === 'warning').length;
  const totalTests = testResults.length;

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
            <h1 className="text-2xl font-bold">Testes e Qualidade</h1>
            <p className="text-muted-foreground">
              Monitore a qualidade e performance da aplicação
            </p>
          </div>
        </div>
        <Button onClick={runAllTests} disabled={isRunning}>
          <Play className="h-4 w-4 mr-2" />
          {isRunning ? 'Executando...' : 'Executar Todos'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="unit">Testes Unitários</TabsTrigger>
          <TabsTrigger value="integration">Integração</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Estatísticas */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div className="ml-2">
                    <p className="text-sm text-muted-foreground">Passou</p>
                    <p className="text-2xl font-bold">{passedTests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <div className="ml-2">
                    <p className="text-sm text-muted-foreground">Falhou</p>
                    <p className="text-2xl font-bold">{failedTests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <div className="ml-2">
                    <p className="text-sm text-muted-foreground">Avisos</p>
                    <p className="text-2xl font-bold">{warningTests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TestTube className="h-4 w-4 text-blue-600" />
                  <div className="ml-2">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{totalTests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progresso dos Testes */}
          {isRunning && (
            <Card>
              <CardHeader>
                <CardTitle>Executando Testes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultados dos Testes */}
          <Card>
            <CardHeader>
              <CardTitle>Resultados dos Testes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((test) => (
                  <div key={test.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(test.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{test.name}</h4>
                          {getStatusBadge(test.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {test.description}
                        </p>
                        {test.details && (
                          <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            {test.details}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {test.duration}ms
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cobertura de Código */}
          <Card>
            <CardHeader>
              <CardTitle>Cobertura de Código</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Linhas</span>
                    <span>87%</span>
                  </div>
                  <Progress value={87} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Funções</span>
                    <span>92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Branches</span>
                    <span>78%</span>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unit">
          <Card>
            <CardHeader>
              <CardTitle>Testes Unitários</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Resultados dos testes unitários de componentes e funções.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration">
          <Card>
            <CardHeader>
              <CardTitle>Testes de Integração</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Testes de integração com APIs externas e serviços.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Testes de Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Tempo de Carregamento</p>
                  <p className="text-2xl font-bold">1.2s</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">First Contentful Paint</p>
                  <p className="text-2xl font-bold">0.8s</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Largest Contentful Paint</p>
                  <p className="text-2xl font-bold">1.1s</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Bundle Size</p>
                  <p className="text-2xl font-bold">485KB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
