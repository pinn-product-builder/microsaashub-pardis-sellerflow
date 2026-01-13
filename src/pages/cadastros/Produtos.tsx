import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download
} from 'lucide-react';
import { useProducts, useProductCategories, useUpdateProduct, useBatchUpdateProducts } from '@/hooks/useProducts';
import { StockIndicator } from '@/components/seller-flow/display/StockIndicator';
import { BatchActionsBar } from '@/components/products/BatchActionsBar';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportProductsToExcel } from '@/utils/productExport';
import { toast } from 'sonner';

// Pagination options
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Status options
const STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo', color: 'bg-green-500' },
  { value: 'inactive', label: 'Inativo', color: 'bg-gray-500' },
  { value: 'discontinued', label: 'Descontinuado', color: 'bg-red-500' },
];

// Sort column type
type SortColumn = 'sku' | 'name' | 'stock_quantity' | 'base_cost' | null;
type SortDirection = 'asc' | 'desc';

export default function Produtos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [expiryFilter, setExpiryFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: products, isLoading, refetch } = useProducts();
  const { data: categories } = useProductCategories();
  const updateProduct = useUpdateProduct();
  const batchUpdateProducts = useBatchUpdateProducts();

  // Handle column sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction or clear sort
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Get sort icon for column
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    let filtered = products.filter(product => {
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
      
      // Expiry filter
      let matchesExpiry = true;
      if (expiryFilter !== 'all') {
        const expiryDate = product.stock_min_expiry ? new Date(product.stock_min_expiry) : null;
        const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, new Date()) : null;
        
        switch (expiryFilter) {
          case 'expired':
            matchesExpiry = daysUntilExpiry !== null && daysUntilExpiry < 0;
            break;
          case 'expiring_7':
            matchesExpiry = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
            break;
          case 'expiring_30':
            matchesExpiry = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
            break;
          case 'expiring_90':
            matchesExpiry = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
            break;
          case 'ok':
            matchesExpiry = daysUntilExpiry === null || daysUntilExpiry > 90;
            break;
          case 'no_expiry':
            matchesExpiry = !product.stock_min_expiry;
            break;
        }
      }
      
      return matchesSearch && matchesCategory && matchesStatus && matchesStock && matchesCampaign && matchesExpiry;
    });

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortColumn) {
          case 'sku':
            aValue = a.sku.toLowerCase();
            bValue = b.sku.toLowerCase();
            break;
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'stock_quantity':
            aValue = a.stock_quantity ?? 0;
            bValue = b.stock_quantity ?? 0;
            break;
          case 'base_cost':
            aValue = a.base_cost;
            bValue = b.base_cost;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [products, searchTerm, categoryFilter, statusFilter, stockFilter, campaignFilter, expiryFilter, sortColumn, sortDirection]);

  // Pagination calculations
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  
  // Paginated products
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, startIndex, endIndex]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter, stockFilter, campaignFilter, expiryFilter, pageSize]);

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

  // Handle export to Excel
  const handleExportExcel = () => {
    if (filteredProducts.length === 0) {
      toast.error('Nenhum produto para exportar');
      return;
    }
    exportProductsToExcel(filteredProducts);
    toast.success(`${filteredProducts.length} produtos exportados com sucesso`);
  };

  // Selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedProducts.map(p => p.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  }, [paginatedProducts]);

  const handleSelectProduct = useCallback((productId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Batch actions
  const handleBatchActivate = async () => {
    const ids = Array.from(selectedIds);
    await batchUpdateProducts.mutateAsync({
      ids,
      updates: { is_active: true, status: 'active' }
    });
    handleClearSelection();
  };

  const handleBatchDeactivate = async () => {
    const ids = Array.from(selectedIds);
    await batchUpdateProducts.mutateAsync({
      ids,
      updates: { is_active: false, status: 'blocked' }
    });
    handleClearSelection();
  };

  const handleBatchApplyCampaign = async (campaignName: string, campaignDiscount: number) => {
    const ids = Array.from(selectedIds);
    await batchUpdateProducts.mutateAsync({
      ids,
      updates: { campaign_name: campaignName, campaign_discount: campaignDiscount }
    });
    handleClearSelection();
  };

  const handleBatchRemoveCampaign = async () => {
    const ids = Array.from(selectedIds);
    await batchUpdateProducts.mutateAsync({
      ids,
      updates: { campaign_name: null, campaign_discount: null }
    });
    handleClearSelection();
  };

  // Check if all items on current page are selected
  const allSelectedOnPage = paginatedProducts.length > 0 && 
    paginatedProducts.every(p => selectedIds.has(p.id));
  const someSelectedOnPage = paginatedProducts.some(p => selectedIds.has(p.id)) && !allSelectedOnPage;

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
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportExcel}
            disabled={filteredProducts.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 pt-4 border-t">
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Validade</label>
                <Select value={expiryFilter} onValueChange={setExpiryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="expired">Vencidos</SelectItem>
                    <SelectItem value="expiring_7">Vence em 7 dias</SelectItem>
                    <SelectItem value="expiring_30">Vence em 30 dias</SelectItem>
                    <SelectItem value="expiring_90">Vence em 90 dias</SelectItem>
                    <SelectItem value="ok">Validade OK (+90 dias)</SelectItem>
                    <SelectItem value="no_expiry">Sem data de validade</SelectItem>
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
                    setExpiryFilter('all');
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
            <span>Lista de Produtos ({totalItems})</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal text-muted-foreground">Itens por página:</span>
              <Select 
                value={pageSize.toString()} 
                onValueChange={(value) => setPageSize(parseInt(value))}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allSelectedOnPage}
                          ref={(el) => {
                            if (el) {
                              (el as any).indeterminate = someSelectedOnPage;
                            }
                          }}
                          onCheckedChange={handleSelectAll}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('sku')}
                      >
                        <div className="flex items-center">
                          SKU
                          {getSortIcon('sku')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          Produto
                          {getSortIcon('name')}
                        </div>
                      </TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead 
                        className="text-center cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('stock_quantity')}
                      >
                        <div className="flex items-center justify-center">
                          Estoque
                          {getSortIcon('stock_quantity')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('base_cost')}
                      >
                        <div className="flex items-center justify-end">
                          Preço Base
                          {getSortIcon('base_cost')}
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Campanha</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((product) => (
                      <TableRow 
                        key={product.id}
                        className={selectedIds.has(product.id) ? 'bg-muted/50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                            aria-label={`Selecionar ${product.name}`}
                          />
                        </TableCell>
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

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Exibindo {startIndex + 1} a {endIndex} de {totalItems} produtos
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1 mx-2">
                    <span className="text-sm">Página</span>
                    <Input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const page = parseInt(e.target.value);
                        if (page >= 1 && page <= totalPages) {
                          setCurrentPage(page);
                        }
                      }}
                      className="w-16 h-8 text-center"
                    />
                    <span className="text-sm">de {totalPages}</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
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

      {/* Batch Actions Bar */}
      <BatchActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={handleClearSelection}
        onActivate={handleBatchActivate}
        onDeactivate={handleBatchDeactivate}
        onApplyCampaign={handleBatchApplyCampaign}
        onRemoveCampaign={handleBatchRemoveCampaign}
        isLoading={batchUpdateProducts.isPending}
      />
    </div>
  );
}
