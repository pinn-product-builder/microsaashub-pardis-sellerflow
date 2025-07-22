
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Mock data para regras de precificação
const mockRules = [
  {
    id: '1',
    name: 'Desconto Volume B2B',
    description: 'Desconto progressivo para vendas B2B acima de R$ 10.000',
    type: 'VOLUME_DISCOUNT',
    channel: 'B2B',
    isActive: true,
    priority: 1,
    conditions: 'Valor > R$ 10.000',
    action: 'Desconto 5-15%',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Margem Mínima VIP',
    description: 'Garantia de margem mínima para clientes VIP',
    type: 'MINIMUM_MARGIN',
    channel: 'VIP',
    isActive: true,
    priority: 2,
    conditions: 'Cliente VIP',
    action: 'Margem min 20%',
    createdAt: new Date('2024-01-20'),
  },
  {
    id: '3',
    name: 'Aprovação Alto Valor',
    description: 'Aprovação obrigatória para cotações acima de R$ 50.000',
    type: 'APPROVAL_REQUIRED',
    channel: 'ALL',
    isActive: true,
    priority: 3,
    conditions: 'Valor > R$ 50.000',
    action: 'Solicitar aprovação',
    createdAt: new Date('2024-02-01'),
  },
  {
    id: '4',
    name: 'Desconto Sazonal',
    description: 'Desconto especial para período de baixa temporada',
    type: 'SEASONAL_DISCOUNT',
    channel: 'B2C',
    isActive: false,
    priority: 4,
    conditions: 'Jun-Ago',
    action: 'Desconto 10%',
    createdAt: new Date('2024-01-10'),
  },
];

export default function PricingRules() {
  const [rules] = useState(mockRules);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'VOLUME_DISCOUNT':
        return <Badge className="bg-blue-100 text-blue-800">Desconto Volume</Badge>;
      case 'MINIMUM_MARGIN':
        return <Badge className="bg-green-100 text-green-800">Margem Mínima</Badge>;
      case 'APPROVAL_REQUIRED':
        return <Badge className="bg-red-100 text-red-800">Aprovação</Badge>;
      case 'SEASONAL_DISCOUNT':
        return <Badge className="bg-purple-100 text-purple-800">Sazonal</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'ALL': return <Badge variant="outline">Todos</Badge>;
      case 'B2B': return <Badge className="bg-blue-100 text-blue-800">B2B</Badge>;
      case 'VIP': return <Badge className="bg-purple-100 text-purple-800">VIP</Badge>;
      case 'B2C': return <Badge className="bg-green-100 text-green-800">B2C</Badge>;
      default: return <Badge variant="secondary">{channel}</Badge>;
    }
  };

  const activeRules = rules.filter(r => r.isActive).length;

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/pricing/dashboard">Precificação</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Regras</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Regras de Precificação</h1>
            <p className="text-muted-foreground">
              Configure regras automáticas para cálculo de preços e descontos
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Regra
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Regras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
            <p className="text-xs text-muted-foreground">Regras configuradas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regras Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeRules}</div>
            <p className="text-xs text-muted-foreground">Em funcionamento</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipos de Regra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(rules.map(r => r.type)).size}
            </div>
            <p className="text-xs text-muted-foreground">Categorias diferentes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Ativação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((activeRules / rules.length) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">Regras ativas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regras de Precificação</CardTitle>
          <CardDescription>
            Lista de todas as regras configuradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Condições</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-sm text-muted-foreground">{rule.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(rule.type)}</TableCell>
                  <TableCell>{getChannelBadge(rule.channel)}</TableCell>
                  <TableCell className="font-mono text-sm">{rule.conditions}</TableCell>
                  <TableCell className="font-mono text-sm">{rule.action}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{rule.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {rule.isActive ? (
                        <ToggleRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-gray-400" />
                      )}
                      <span className={rule.isActive ? "text-green-600" : "text-gray-400"}>
                        {rule.isActive ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        {rule.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
