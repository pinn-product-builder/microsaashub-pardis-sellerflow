
import { useState, useMemo } from 'react';
import { Plus, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProducts } from '@/hooks/useProducts';
import { StockIndicator } from '@/components/cpq/display/StockIndicator';
import { MarginIndicator } from '@/components/cpq/display/MarginIndicator';
import { Product, QuoteItem, Customer } from '@/types/cpq';
import { PricingService } from '@/services/pricingService';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductSelectorProps {
  destinationUF: string;
  selectedCustomer: Customer | null;
  onAddProduct: (item: QuoteItem) => void;
}

export function ProductSelector({ destinationUF, selectedCustomer, onAddProduct }: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [campaignCode, setCampaignCode] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const { data: productsData = [], isLoading } = useProducts({ status: 'active' });

  // Transform Supabase data to CPQ Product type
  const products: (Product & { stockQuantity?: number; stockMinExpiry?: string })[] = useMemo(() => {
    return productsData.map(p => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category || 'Geral',
      weight: 0.5, // Default weight
      dimensions: { length: 10, width: 10, height: 10 },
      baseCost: p.base_cost,
      description: p.description || undefined,
      ncm: p.ncm || undefined,
      stockQuantity: p.stock_quantity || 0,
      stockMinExpiry: p.stock_min_expiry || undefined
    }));
  }, [productsData]);

  console.log('ProductSelector props:', { destinationUF, selectedCustomer: selectedCustomer?.companyName });

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const handleAddProduct = async () => {
    if (!selectedProduct || !destinationUF || !selectedCustomer) {
      toast({
        title: "Erro",
        description: "Selecione um produto válido e certifique-se de que um cliente foi selecionado.",
        variant: "destructive"
      });
      return;
    }

    setIsAdding(true);
    try {
      console.log('Adding product:', selectedProduct.name, 'Quantity:', quantity, 'UF:', destinationUF);
      
      const quoteItem = PricingService.calculateQuoteItem(
        selectedProduct,
        quantity,
        destinationUF,
        selectedCustomer,
        undefined,
        campaignCode || undefined
      );

      console.log('Quote item calculated:', quoteItem);
      
      onAddProduct(quoteItem);
      
      toast({
        title: "Produto adicionado",
        description: `${selectedProduct.name} foi adicionado à cotação!`,
        action: <CheckCircle className="h-4 w-4 text-green-600" />
      });
      
      setSelectedProduct(null);
      setQuantity(1);
      setCampaignCode('');
      setOpen(false);
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o produto à cotação.",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    console.log('Product selected:', product.name);
  };

  // Simular preço para preview
  const previewPrice = selectedProduct && selectedCustomer && destinationUF ? 
    PricingService.calculateQuoteItem(
      selectedProduct,
      quantity,
      destinationUF,
      selectedCustomer,
      undefined,
      campaignCode || undefined
    ) : null;

  const isButtonEnabled = !!destinationUF && !!selectedCustomer;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Produtos</Label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              disabled={!isButtonEnabled}
              title={!isButtonEnabled ? "Selecione um cliente primeiro" : "Adicionar produto"}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Selecionar Produto</DialogTitle>
              {selectedCustomer && (
                <p className="text-sm text-muted-foreground">
                  Cliente: {selectedCustomer.companyName} ({selectedCustomer.uf})
                </p>
              )}
            </DialogHeader>
            
            <div className="space-y-4 flex-1 overflow-hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por SKU, nome ou categoria..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full overflow-hidden">
                {/* Products List */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Produtos Disponíveis</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto max-h-96">
                    {isLoading ? (
                      <div className="p-4 space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Estoque</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.map((product) => (
                            <TableRow
                              key={product.id}
                              className={`cursor-pointer ${
                                selectedProduct?.id === product.id ? 'bg-muted' : ''
                              }`}
                              onClick={() => handleProductSelect(product)}
                            >
                              <TableCell>
                                <div>
                                  <div className="font-medium text-sm">{product.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    SKU: {product.sku}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <StockIndicator 
                                  quantity={product.stockQuantity || 0}
                                  minExpiry={product.stockMinExpiry}
                                  requestedQuantity={selectedProduct?.id === product.id ? quantity : undefined}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Product Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      {selectedProduct ? 'Detalhes do Produto' : 'Selecione um Produto'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedProduct ? (
                      <>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Nome</Label>
                            <p className="text-sm font-medium">{selectedProduct.name}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">SKU</Label>
                            <p className="text-sm">{selectedProduct.sku}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Categoria</Label>
                            <p className="text-sm">{selectedProduct.category}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Estoque</Label>
                            <div className="mt-1">
                              <StockIndicator 
                                quantity={(selectedProduct as any).stockQuantity || 0}
                                minExpiry={(selectedProduct as any).stockMinExpiry}
                                requestedQuantity={quantity}
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Custo Base</Label>
                            <p className="text-sm font-medium">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(selectedProduct.baseCost)}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-center py-8 text-sm">
                        Clique em um produto na lista para ver os detalhes
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Configuration & Preview */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Configuração & Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedProduct ? (
                      <>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="quantity" className="text-sm">Quantidade</Label>
                            <Input
                              id="quantity"
                              type="number"
                              min="1"
                              value={quantity}
                              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            />
                          </div>

                          <div>
                            <Label htmlFor="campaign" className="text-sm">Código de Campanha (opcional)</Label>
                            <Input
                              id="campaign"
                              placeholder="Ex: BLACKFRIDAY2024"
                              value={campaignCode}
                              onChange={(e) => setCampaignCode(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Preview de Preço */}
                        {previewPrice && (
                          <div className="space-y-3 p-3 bg-muted rounded-lg">
                            <h4 className="text-sm font-medium">Preview de Preço</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Preço Unitário:</span>
                                <span className="font-medium">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  }).format(previewPrice.unitPrice)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total:</span>
                                <span className="font-bold">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  }).format(previewPrice.totalPrice)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Margem:</span>
                                <MarginIndicator 
                                  marginPercent={previewPrice.margin}
                                  size="sm"
                                />
                              </div>
                            </div>

                            {/* Alertas */}
                            {previewPrice.alerts && previewPrice.alerts.length > 0 && (
                              <div className="space-y-2">
                                {previewPrice.alerts.map((alert, index) => (
                                  <Alert key={index} className="p-2">
                                    <AlertTriangle className="h-3 w-3" />
                                    <AlertDescription className="text-xs">
                                      {alert.message}
                                    </AlertDescription>
                                  </Alert>
                                ))}
                              </div>
                            )}

                            {/* Approval Required */}
                            {previewPrice.approvalRequired && (
                              <Alert className="p-2">
                                <AlertTriangle className="h-3 w-3" />
                                <AlertDescription className="text-xs">
                                  Esta cotação requer aprovação
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}

                        <Button 
                          onClick={handleAddProduct} 
                          className="w-full" 
                          disabled={isAdding || !destinationUF}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {isAdding ? 'Adicionando...' : 'Adicionar à Cotação'}
                        </Button>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-center py-8 text-sm">
                        Configure a quantidade e campanha
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!isButtonEnabled && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Selecione um cliente primeiro para adicionar produtos à cotação.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
