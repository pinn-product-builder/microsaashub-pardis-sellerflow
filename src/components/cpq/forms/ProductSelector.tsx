
import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
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
import { mockProducts } from '@/data/mockData';
import { Product, QuoteItem } from '@/types/cpq';
import { PricingService } from '@/services/pricingService';

interface ProductSelectorProps {
  destinationUF: string;
  onAddProduct: (item: QuoteItem) => void;
}

export function ProductSelector({ destinationUF, onAddProduct }: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return mockProducts;
    
    return mockProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleAddProduct = () => {
    if (!selectedProduct || !destinationUF) return;

    const quoteItem = PricingService.calculateQuoteItem(
      selectedProduct,
      quantity,
      destinationUF
    );

    onAddProduct(quoteItem);
    setSelectedProduct(null);
    setQuantity(1);
    setOpen(false);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Produtos</Label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!destinationUF}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Selecionar Produto</DialogTitle>
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full overflow-hidden">
                {/* Products List */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Produtos Disponíveis</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Peso</TableHead>
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
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  SKU: {product.sku}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{product.category}</Badge>
                            </TableCell>
                            <TableCell>{product.weight}kg</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Product Details & Add */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      {selectedProduct ? 'Detalhes do Produto' : 'Selecione um Produto'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedProduct ? (
                      <>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Nome</Label>
                            <p className="font-medium">{selectedProduct.name}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">SKU</Label>
                            <p className="font-medium">{selectedProduct.sku}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Categoria</Label>
                            <p className="font-medium">{selectedProduct.category}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Peso</Label>
                            <p className="font-medium">{selectedProduct.weight}kg</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Dimensões (L×W×H)</Label>
                            <p className="font-medium">
                              {selectedProduct.dimensions.length}×{selectedProduct.dimensions.width}×{selectedProduct.dimensions.height}cm
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Custo Base</Label>
                            <p className="font-medium">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(selectedProduct.baseCost)}
                            </p>
                          </div>
                          {selectedProduct.description && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Descrição</Label>
                              <p className="text-sm">{selectedProduct.description}</p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="quantity">Quantidade</Label>
                          <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          />
                        </div>

                        <Button onClick={handleAddProduct} className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar à Cotação
                        </Button>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Clique em um produto na lista para ver os detalhes
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!destinationUF && (
        <p className="text-sm text-muted-foreground">
          Selecione um cliente primeiro para adicionar produtos
        </p>
      )}
    </div>
  );
}
