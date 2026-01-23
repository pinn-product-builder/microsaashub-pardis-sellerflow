import { useEffect, useMemo, useState } from "react";
import { Search, Plus, CheckCircle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { PricingService } from "@/services/pricingService";
import { Customer, Product, QuoteItem } from "@/types/seller-flow";

type CatalogRow = {
  vtex_sku_id: number;
  vtex_product_id: number;
  product_name: string | null;
  sku_name: string | null;
  ean: string | null;
  ref_id: string | null;
  embalagem: string | null;
  gramatura: string | null;
  is_active: boolean | null;
  score: number | null;
  selling_price: number | null;
  price_source?: string | null;
  trade_policy_id?: string | null;
  price_available?: boolean | null;
  available_quantity?: number | null;
  in_stock?: boolean | null;
};

type EffectivePriceRow = {
  vtex_sku_id: number;
  quantity: number;
  trade_policy_id: string;
  effective_price: number | null;
  price_source: string | null;
  cost_price: number | null;
  list_price: number | null;
};

function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface VtexProductSelectorProps {
  destinationUF: string;
  selectedCustomer: Customer | null;
  policyMode?: "auto" | "fixed";
  tradePolicyId?: string; // usado quando policyMode === 'fixed'
  onAddProduct: (item: QuoteItem) => void;
}

export function VtexProductSelector({
  destinationUF,
  selectedCustomer,
  policyMode = "auto",
  tradePolicyId = "1",
  onAddProduct,
}: VtexProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 350);

  const [pageSize] = useState(30);
  const [page, setPage] = useState(1);
  const off = useMemo(() => (page - 1) * pageSize, [page, pageSize]);
  const hasNext = false; // catálogo via RPC não retorna total; mantemos simples por enquanto

  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selected, setSelected] = useState<CatalogRow | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const { toast } = useToast();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const runSearch = async (query: string) => {
    try {
      setErr(null);
      setLoading(true);
      const rpcName = policyMode === "fixed" ? "search_catalog_policy" : "search_catalog_any_policy";
      const rpcArgs: any = {
        q: query ?? "",
        lim: pageSize,
        off,
        only_active: true,
      };
      if (policyMode === "fixed") rpcArgs.trade_policy_id = String(tradePolicyId || "1");
      const { data, error } = await (supabase as any).rpc(rpcName, rpcArgs);
      if (error) throw error;
      setRows((data ?? []) as CatalogRow[]);
    } catch (e: any) {
      setRows([]);
      setErr(e?.message ?? "Falha ao buscar catálogo VTEX");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    runSearch((debouncedQ || "").trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, open, off]);

  const fetchEffectivePrice = async (skuId: number, qty: number) => {
    const rpcName = policyMode === "fixed" ? "get_vtex_effective_prices" : "get_vtex_effective_prices_any_policy";
    const args: any = { sku_ids: [skuId], quantities: [qty] };
    if (policyMode === "fixed") args.trade_policy_id = String(tradePolicyId || "1");
    const { data, error } = await (supabase as any).rpc(rpcName, args);
    if (error) throw error;
    const row = (data ?? [])[0] as EffectivePriceRow | undefined;
    return row;
  };

  const handleAdd = async () => {
    if (!selected || !destinationUF || !selectedCustomer) {
      toast({
        title: "Erro",
        description: "Selecione um item VTEX e certifique-se de que um cliente foi selecionado.",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      const skuId = selected.vtex_sku_id;

      // Estoque: se tiver informação, impede adicionar acima do disponível
      if (typeof selected.available_quantity === "number" && selected.available_quantity >= 0) {
        if (quantity > selected.available_quantity) {
          toast({
            title: "Estoque insuficiente",
            description: `Disponível: ${selected.available_quantity.toFixed(0)} un. Ajuste a quantidade.`,
            variant: "destructive",
          });
          return;
        }
      }

      const eff = await fetchEffectivePrice(skuId, quantity);
      const unit = eff?.effective_price ?? null;

      if (!unit || unit <= 0) {
        toast({
          title: "SKU sem preço",
          description: `Não encontramos preço para o SKU ${skuId} na policy ${tradePolicyId}.`,
          variant: "destructive",
        });
        return;
      }

      const product: Product = {
        id: `vtex:${skuId}`,
        sku: String(skuId),
        name: selected.product_name ?? selected.sku_name ?? `SKU ${skuId}`,
        category: "VTEX",
        weight: 0.5,
        dimensions: { length: 10, width: 10, height: 10 },
        // para margem/validações: usar cost_price quando disponível, senão o próprio preço
        baseCost: eff?.cost_price ?? unit,
        description: selected.sku_name ?? undefined,
      };

      const quoteItem = PricingService.createQuoteItemWithUnitPrice(
        product,
        quantity,
        destinationUF,
        unit,
        selectedCustomer
      );
      (quoteItem as any).vtexTradePolicyId = policyMode === "fixed" ? String(tradePolicyId || "1") : (eff?.trade_policy_id ?? undefined);

      onAddProduct(quoteItem);
      toast({
        title: "Produto VTEX adicionado",
        description: `${product.name} (${formatCurrency(unit)}) foi adicionado à cotação.`,
        action: <CheckCircle className="h-4 w-4 text-green-600" />,
      });

      setSelected(null);
      setQuantity(1);
      setOpen(false);
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e?.message ?? "Não foi possível adicionar o item VTEX.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const isButtonEnabled = !!destinationUF && !!selectedCustomer;

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={!isButtonEnabled}
            title={!isButtonEnabled ? "Selecione um cliente primeiro" : "Adicionar produto VTEX"}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Produto (VTEX)
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Produto (VTEX)</DialogTitle>
            {selectedCustomer && (
              <p className="text-sm text-muted-foreground">
                Cliente: {selectedCustomer.companyName} ({selectedCustomer.uf}) • Policy {tradePolicyId}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10"
                placeholder="Buscar no catálogo VTEX (nome, SKU, EAN, ref...)"
              />
            </div>

            {err && <div className="text-sm text-red-600">{err}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full overflow-hidden">
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Resultados</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto overflow-y-auto max-h-96">
                  {loading ? (
                    <div className="p-4 space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <div>Nenhum item encontrado</div>
                    </div>
                  ) : (
                    <>
                      {/* min-width evita o "nome quebrado por letra" quando o painel fica estreito */}
                      <Table className="min-w-[640px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[72px]">SKU</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right w-[84px]">Estoque</TableHead>
                          <TableHead className="text-right w-[120px]">Preço</TableHead>
                          <TableHead className="text-right w-[110px]">Fonte</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r) => (
                          <TableRow
                            key={r.vtex_sku_id}
                            className={`cursor-pointer ${selected?.vtex_sku_id === r.vtex_sku_id ? "bg-muted" : ""}`}
                            onClick={() => setSelected(r)}
                          >
                            <TableCell className="font-mono text-xs align-top whitespace-nowrap">
                              {r.vtex_sku_id}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-sm leading-5 whitespace-normal break-words">
                                {r.product_name ?? r.sku_name ?? "-"}
                              </div>
                              {r.sku_name && r.sku_name !== r.product_name && (
                                <div className="text-xs text-muted-foreground whitespace-normal break-words">
                                  {r.sku_name}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs whitespace-nowrap align-top">
                              {typeof r.available_quantity === "number"
                                ? r.available_quantity.toFixed(0)
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm whitespace-nowrap align-top">
                              {typeof r.selling_price === "number" ? formatCurrency(r.selling_price) : "-"}
                            </TableCell>
                            <TableCell className="text-right align-top whitespace-nowrap">
                              {r.price_available === false ? (
                                <Badge variant="destructive" className="text-[10px] px-2 py-0.5 inline-flex">
                                  sem preço
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 inline-flex">
                                  {r.price_source ?? "-"}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{selected ? "Detalhes" : "Selecione um item"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selected ? (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground">SKU</Label>
                        <div className="font-mono">{selected.vtex_sku_id}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Produto</Label>
                        <div className="text-sm font-medium">{selected.product_name ?? "-"}</div>
                        <div className="text-xs text-muted-foreground">{selected.sku_name ?? ""}</div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {selected.ean && <Badge variant="outline">EAN: {selected.ean}</Badge>}
                        {selected.ref_id && <Badge variant="outline">Ref: {selected.ref_id}</Badge>}
                        {selected.embalagem && <Badge variant="outline">{selected.embalagem}</Badge>}
                        {selected.gramatura && <Badge variant="outline">{selected.gramatura}</Badge>}
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Preço (Policy {tradePolicyId}, qty=1)</Label>
                        <div className="text-lg font-semibold">
                          {typeof selected.selling_price === "number" ? formatCurrency(selected.selling_price) : "-"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Fonte:{" "}
                          <span className="font-mono">
                            {selected.price_source ?? (selected.price_available === false ? "missing" : "-")}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">Clique em um item da lista para ver detalhes.</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Adicionar na Cotação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))}
                    />
                  </div>
                  <Button onClick={handleAdd} disabled={!selected || isAdding} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    {isAdding ? "Adicionando..." : "Adicionar"}
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Se o preço “computed” estiver ausente, usamos fallback automático (fixed/list/base) para não
                    quebrar a cotação.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

