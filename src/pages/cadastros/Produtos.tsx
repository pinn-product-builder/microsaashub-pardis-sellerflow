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
  Package, 
  RefreshCw,
  Edit,
  Check,
  X,
  Tag,
  AlertTriangle,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { useProducts, useProductCategories, useUpdateProduct } from '@/hooks/useProducts';
import { StockIndicator } from '@/components/cpq/display/StockIndicator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Status options
const STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo', color: 'bg-green-500' },
  { value: 'inactive', label: 'Inativo', color: 'bg-gray-500' },
  { value: 'discontinued', label: 'Descontinuado', color: 'bg-red-500' },
];

export default function Produtos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  const { data: products, isLoading, refetch } = useProducts();
  const { data: categories } = useProductCategories();
  const updateProduct = useUpdateProduct();

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter(product => {
      // Search filter
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Category filter
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      
      // Stock filter
      const stockQty = product.stock_quantity ?? 0;
      let matchesStock = true;
      if (stockFilter === 'in_stock') matchesStock = stockQty > 10;
      else if (stockFilter === 'low_stock') matchesStock = stockQty > 0 && stockQty <= 10;
      else if (stockFilter === 'out_of_stock') matchesStock = stockQty <= 0;
      
      // Campaign filter
      const matchesCampaign = campaignFilter === 'all' || 
        (campaignFilter === 'yes' && product.campaign_name) ||
        (campaignFilter === 'no' && !product.campaign_name);
      
      return matchesSearch && matchesCategory && matchesStatus && matchesStock && matchesCampaign;
    });
  }, [products, searchTerm, categoryFilter, statusFilter, stockFilter, campaignFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!products) return { total: 0, active: 0, lowStock: 0, withCampaign: 0 };
    
    return {
      total: products.length,
      active: products.filter(p => p.status === 'active').length,
      lowStock: products.filter(p => (p.stock_quantity ?? 0) <= 10 && (p.stock_quantity ?? 0) > 0).length,
      withCampaign: products.filter(p => p.campaign_name).length
    };
  }, [products]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Start editing a product
  const handleStartEdit = (product: any) => {
    setEditingProduct(product);
    setEditValues({
      is_active: product.is_active,
      status: product.status,
      price_minimum: product.price_minimum,
      campaign_name: product.campaign_name,
      campaign_discount: product.campaign_discount,
    });
  };

  // Save product changes
  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    
    await updateProduct.mutateAsync({
      id: editingProduct.id,
      updates: editValues
    });
    
    setEditingProduct(null);
    setEditValues({});
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditValues({});
  };

  // Get status badge variant
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inativo</Badge>;
      case 'discontinued':
        return <Badge variant="destructive">Descontinuado</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Cadastro de Produtos
          </h1>
          <p className="text-muted-foreground">
            Gerencie os produtos sincronizados do sistema
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
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Campanha</CardTitle>
            <Sparkles className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.withCampaign}</div>
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
                placeholder="Buscar por nome, SKU ou descrição..."
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories?.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Estoque</label>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="in_stock">Em estoque</SelectItem>
                    <SelectItem value="low_stock">Estoque baixo</SelectItem>
                    <SelectItem value="out_of_stock">Sem estoque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Campanha</label>
                <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="yes">Com campanha</SelectItem>
                    <SelectItem value="no">Sem campanha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                    setStatusFilter('all');
                    setStockFilter('all');
                    setCampaignFilter('all');
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lista de Produtos ({filteredProducts.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum produto encontrado</p>
              <p className="text-sm">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Estoque</TableHead>
                    <TableHead className="text-right">Preço Base</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">
                        {product.sku}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.ncm && (
                            <div className="text-xs text-muted-foreground">
                              NCM: {product.ncm}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.category ? (
                          <Badge variant="outline">
                            <Tag className="h-3 w-3 mr-1" />
                            {product.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StockIndicator
                          quantity={product.stock_quantity ?? 0}
                          minExpiry={product.stock_min_expiry ?? undefined}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(product.base_cost)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(product.status)}
                      </TableCell>
                      <TableCell>
                        {product.campaign_name ? (
                          <div className="space-y-1">
                            <Badge className="bg-purple-500 flex items-center gap-1 w-fit">
                              <Sparkles className="h-3 w-3" />
                              {product.campaign_name}
                            </Badge>
                            {product.campaign_discount && (
                              <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                -{product.campaign_discount}%
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleStartEdit(product)}
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
      <Dialog open={!!editingProduct} onOpenChange={() => handleCancelEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>
              {editingProduct?.name} ({editingProduct?.sku})
            </DialogDescription>
          </DialogHeader>
          
          {editingProduct && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Produto Ativo</label>
                <Switch
                  checked={editValues.is_active ?? true}
                  onCheckedChange={(checked) => setEditValues((prev: any) => ({ ...prev, is_active: checked }))}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select 
                  value={editValues.status ?? 'active'} 
                  onValueChange={(value) => setEditValues((prev: any) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Preço Mínimo</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editValues.price_minimum ?? 0}
                  onChange={(e) => setEditValues((prev: any) => ({ ...prev, price_minimum: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Campanha
                </h4>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome da Campanha</label>
                    <Input
                      placeholder="Ex: Black Friday, Verão 2024..."
                      value={editValues.campaign_name ?? ''}
                      onChange={(e) => setEditValues((prev: any) => ({ ...prev, campaign_name: e.target.value || null }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Desconto da Campanha (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={editValues.campaign_discount ?? ''}
                      onChange={(e) => setEditValues((prev: any) => ({ ...prev, campaign_discount: parseFloat(e.target.value) || null }))}
                    />
                  </div>
                </div>
              </div>

              {editingProduct.last_sync_at && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Última sincronização: {format(new Date(editingProduct.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={updateProduct.isPending}>
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
