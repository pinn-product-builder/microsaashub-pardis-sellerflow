
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Eye, Download } from 'lucide-react';
import { PriceTableService } from '@/services/priceTableService';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function PricingTables() {
  const [tables] = useState(() => PriceTableService.getAllTables());

  const getChannelBadgeColor = (channel: string) => {
    switch (channel) {
      case 'VIP': return 'bg-purple-100 text-purple-800';
      case 'B2B': return 'bg-blue-100 text-blue-800';
      case 'B2C': return 'bg-green-100 text-green-800';
      case 'DISTRIBUIDOR': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
              <BreadcrumbPage>Tabelas de Preço</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tabelas de Preço</h1>
            <p className="text-muted-foreground">
              Gerencie tabelas de preço por canal e cliente
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Tabela
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tabelas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tables.length}</div>
            <p className="text-xs text-muted-foreground">Tabelas ativas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canais Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(tables.map(t => t.channel)).size}
            </div>
            <p className="text-xs text-muted-foreground">B2B, VIP, B2C</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tables.reduce((acc, t) => acc + t.prices.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total de itens</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tables.reduce((acc, t) => acc + t.customers.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Vinculados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tabelas de Preço</CardTitle>
          <CardDescription>
            Lista de todas as tabelas de preço configuradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Clientes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => (
                <TableRow key={table.id}>
                  <TableCell className="font-medium">{table.name}</TableCell>
                  <TableCell>
                    <Badge className={getChannelBadgeColor(table.channel)}>
                      {table.channel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(table.validFrom).toLocaleDateString()} - {new Date(table.validTo).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{table.prices.length}</TableCell>
                  <TableCell>{table.customers.length}</TableCell>
                  <TableCell>
                    <Badge variant={table.isActive ? "default" : "secondary"}>
                      {table.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
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
