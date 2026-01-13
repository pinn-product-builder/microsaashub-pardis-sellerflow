import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Filter, 
  Building2, 
  MapPin, 
  RefreshCw,
  Edit,
  Check,
  X,
  Users
} from 'lucide-react';
import { useCustomers, useUpdateCustomer } from '@/hooks/useCustomers';
import { L2LBadge } from '@/components/seller-flow/display/L2LBadge';
import { Customer } from '@/types/pardis';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Brazilian states for filter
const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [ufFilter, setUfFilter] = useState<string>('all');
  const [l2lFilter, setL2lFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editValues, setEditValues] = useState<Partial<Customer>>({});

  const { data: customers, isLoading, refetch } = useCustomers();
  const updateCustomer = useUpdateCustomer();

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    
    return customers.filter(customer => {
      // Search filter
      const matchesSearch = !searchTerm || 
        customer.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.cnpj.includes(searchTerm) ||
        (customer.trade_name?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // UF filter
      const matchesUf = ufFilter === 'all' || customer.uf === ufFilter;
      
      // L2L filter
      const matchesL2l = l2lFilter === 'all' || 
        (l2lFilter === 'yes' && customer.is_lab_to_lab) ||
        (l2lFilter === 'no' && !customer.is_lab_to_lab);
      
      return matchesSearch && matchesUf && matchesL2l;
    });
  }, [customers, searchTerm, ufFilter, l2lFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!customers) return { total: 0, active: 0, l2l: 0, states: 0 };
    
    const uniqueStates = new Set(customers.map(c => c.uf));
    
    return {
      total: customers.length,
      active: customers.filter(c => c.is_active).length,
      l2l: customers.filter(c => c.is_lab_to_lab).length,
      states: uniqueStates.size
    };
  }, [customers]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  // Start editing a customer
  const handleStartEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditValues({
      is_lab_to_lab: customer.is_lab_to_lab,
      is_active: customer.is_active,
      credit_limit: customer.credit_limit,
      price_table_type: customer.price_table_type,
    });
  };

  // Save customer changes
  const handleSaveEdit = async () => {
    if (!editingCustomer) return;
    
    await updateCustomer.mutateAsync({
      id: editingCustomer.id,
      updates: editValues
    });
    
    setEditingCustomer(null);
    setEditValues({});
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCustomer(null);
    setEditValues({});
  };

  // Quick toggle L2L inline
  const handleToggleL2L = async (customer: Customer) => {
    await updateCustomer.mutateAsync({
      id: customer.id,
      updates: { is_lab_to_lab: !customer.is_lab_to_lab }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Cadastro de Clientes
          </h1>
          <p className="text-muted-foreground">
            Gerencie os clientes sincronizados do sistema
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab-to-Lab</CardTitle>
            <Badge variant="secondary" className="text-xs">L2L</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.l2l}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estados Atendidos</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.states}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado (UF)</label>
                <Select value={ufFilter} onValueChange={setUfFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os estados</SelectItem>
                    {STATES.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lab-to-Lab</label>
                <Select value={l2lFilter} onValueChange={setL2lFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="yes">Apenas L2L</SelectItem>
                    <SelectItem value="no">Não L2L</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSearchTerm('');
                    setUfFilter('all');
                    setL2lFilter('all');
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lista de Clientes ({filteredCustomers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum cliente encontrado</p>
              <p className="text-sm">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>UF/Cidade</TableHead>
                    <TableHead className="text-center">L2L</TableHead>
                    <TableHead className="text-right">Limite Crédito</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.company_name}</div>
                          {customer.trade_name && (
                            <div className="text-sm text-muted-foreground">
                              {customer.trade_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCNPJ(customer.cnpj)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline">{customer.uf}</Badge>
                          <span className="text-sm text-muted-foreground">{customer.city}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div 
                          className="cursor-pointer inline-block"
                          onClick={() => handleToggleL2L(customer)}
                          title="Clique para alternar"
                        >
                          <L2LBadge 
                            isLabToLab={customer.is_lab_to_lab} 
                            showLabel={false}
                            size="sm"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(customer.credit_limit)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.price_table_type === 'MG' ? 'default' : 'secondary'}>
                          {customer.price_table_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={customer.is_active ? 'default' : 'destructive'}>
                          {customer.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleStartEdit(customer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingCustomer} onOpenChange={() => handleCancelEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              {editingCustomer?.company_name}
            </DialogDescription>
          </DialogHeader>
          
          {editingCustomer && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Lab-to-Lab (L2L)</label>
                <Switch
                  checked={editValues.is_lab_to_lab ?? false}
                  onCheckedChange={(checked) => setEditValues(prev => ({ ...prev, is_lab_to_lab: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Cliente Ativo</label>
                <Switch
                  checked={editValues.is_active ?? true}
                  onCheckedChange={(checked) => setEditValues(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Limite de Crédito</label>
                <Input
                  type="number"
                  value={editValues.credit_limit ?? 0}
                  onChange={(e) => setEditValues(prev => ({ ...prev, credit_limit: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Tabela de Preço</label>
                <Select 
                  value={editValues.price_table_type ?? 'BR'} 
                  onValueChange={(value) => setEditValues(prev => ({ ...prev, price_table_type: value as 'MG' | 'BR' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MG">MG</SelectItem>
                    <SelectItem value="BR">BR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingCustomer.last_sync_at && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Última sincronização: {format(new Date(editingCustomer.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={updateCustomer.isPending}>
                  <Check className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
