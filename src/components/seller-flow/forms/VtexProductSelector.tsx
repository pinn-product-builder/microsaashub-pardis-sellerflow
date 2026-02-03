import { useEffect, useMemo, useState } from "react";
import { Search, Plus, DollarSign } from "lucide-react";
import { getEmbalagemQty } from "@/utils/vtexUtils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PricingService } from "@/services/pricingService";
import { Customer, Product, QuoteItem } from "@/types/seller-flow";

// Sub-componentes Modularizados
import { VtexProductTable } from "./vtex-product-selector/VtexProductTable";
import { VtexProductDetails } from "./vtex-product-selector/VtexProductDetails";
import { VtexProductAddForm } from "./vtex-product-selector/VtexProductAddForm";

// Types
type CatalogRow = {
    vtex_sku_id: number;
    vtex_product_id: number;
    product_name: string | null;
    sku_name: string | null;
    ean: string | null;
    ref_id: string | null;
    embalagem: string | null;
    gramatura: string | null;
    selling_price: number | null;
    price_source?: string | null;
    available_quantity?: number | null;
};

type EffectivePriceRow = {
    vtex_sku_id: number;
    effective_price: number | null;
    cost_price: number | null;
};

const POLICY_LABELS = [
    { id: "1", label: "Principal" },
    { id: "2", label: "B2C" },
    { id: "mgpmgclustera", label: "MGP MG Cluster A" },
    { id: "mgpbrclustera", label: "MGP BR Cluster A" },
];

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
    tradePolicyId?: string;
    onAddProduct: (item: QuoteItem) => void;
}

/**
 * COMPONENTE: Seletor de Produtos VTEX
 * Proporciona uma interface de busca no catálogo VTEX, seleção de itens e configuração de inclusão na cotação.
 * Modularizado em sub-componentes para maior clareza.
 */
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

    const [rows, setRows] = useState<CatalogRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const [selected, setSelected] = useState<CatalogRow | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [itemDiscount, setItemDiscount] = useState<number>(0);
    const [isAdding, setIsAdding] = useState(false);

    const { toast } = useToast();

    // Utilitários
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

    // IDENTIFICAÇÃO: Lógica de Busca RPC
    const runSearch = async (query: string) => {
        try {
            setErr(null);
            setLoading(true);
            const rpcName = policyMode === "fixed" ? "search_catalog_policy" : "search_catalog_any_policy";
            const rpcArgs: any = {
                q: query ?? "",
                lim: 30,
                off: 0,
                only_active: true,
            };
            if (policyMode === "fixed") rpcArgs.trade_policy_id = String(tradePolicyId || "1");

            const { data, error } = await (supabase as any).rpc(rpcName, rpcArgs);
            if (error) throw error;
            setRows((data ?? []) as CatalogRow[]);
        } catch (e: any) {
            setRows([]);
            setErr(e?.message ?? "Falha ao consultar catálogo VTEX.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) runSearch((debouncedQ || "").trim());
    }, [debouncedQ, open]);

    // Reseta form ao trocar seleção
    useEffect(() => {
        setQuantity(1);
        setItemDiscount(0);
    }, [selected]);

    // Lógica de Preço Efetivo (RPC)
    const fetchEffectivePrice = async (skuId: number, qtyUnits: number, policyId: string) => {
        const { data, error } = await (supabase as any).rpc("get_vtex_effective_prices", {
            sku_ids: [skuId],
            quantities: [qtyUnits],
            trade_policy_id: policyId
        });
        if (error) throw error;
        return (data ?? [])[0] as EffectivePriceRow | undefined;
    };

    const handleAdd = async () => {
        if (!selected || !destinationUF || !selectedCustomer) return;

        setIsAdding(true);
        try {
            const skuId = selected.vtex_sku_id;
            const embalagemQty = getEmbalagemQty(selected.embalagem, selected.product_name, selected.sku_name) ?? 1;
            const qtyUnits = Math.max(1, quantity * embalagemQty);

            // Busca preço final por política
            const priceRow = await fetchEffectivePrice(skuId, qtyUnits, String(tradePolicyId || "1"));
            // Correção: Multiplicando pelo tamanho da embalagem para obter o preço da CAIXA
            const packagingPrice = (priceRow?.effective_price ?? 0) * embalagemQty;
            const finalPackagingPrice = packagingPrice * (1 - itemDiscount / 100);

            if (finalPackagingPrice <= 0) throw new Error("Preço calculado inválido.");

            // Custo também deve ser multiplicado se vier unitário
            const unitCost = priceRow?.cost_price ?? (priceRow?.effective_price ?? 0);
            const totalCost = unitCost * embalagemQty;

            const product: Product = {
                id: `vtex:${skuId}`,
                sku: String(skuId),
                name: selected.product_name ?? selected.sku_name ?? `SKU ${skuId}`,
                category: "VTEX",
                weight: 0.5,
                dimensions: { length: 1, width: 1, height: 1 },
                baseCost: totalCost,
                description: selected.sku_name ?? undefined,
            };

            const quoteItem = PricingService.createQuoteItemWithUnitPrice(
                product,
                quantity,
                destinationUF,
                finalPackagingPrice,
                selectedCustomer
            );

            // Adiciona metadados VTEX
            (quoteItem as any).vtexTradePolicyId = tradePolicyId;
            (quoteItem as any).vtexEmbalagemQty = embalagemQty;

            if (itemDiscount > 0) {
                quoteItem.discounts = [{
                    type: 'MANUAL',
                    description: 'Ajuste comercial',
                    percentage: itemDiscount,
                    amount: packagingPrice * (itemDiscount / 100),
                    priority: 1,
                }];
            }

            onAddProduct(quoteItem);

            toast({
                title: "Sucesso",
                description: `${product.name} adicionado com sucesso.`,
            });

            setSelected(null);
            setOpen(false);
        } catch (e: any) {
            toast({ title: "Erro", description: e?.message ?? "Falha ao adicionar item.", variant: "destructive" });
        } finally {
            setIsAdding(false);
        }
    };

    const isButtonEnabled = !!destinationUF && !!selectedCustomer;

    return (
        <div className="space-y-2">
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={!isButtonEnabled} className="font-bold border-primary/20 hover:bg-primary/5">
                        <Plus className="h-4 w-4 mr-2" />
                        ADICIONAR PRODUTO VTEX
                    </Button>
                </DialogTrigger>

                <DialogContent className="max-w-[1200px] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border shadow-2xl">
                    <DialogHeader className="p-6 pb-4 border-b bg-muted/10">
                        <DialogTitle className="text-xl font-black tracking-tight">Catálogo de Produtos VTEX</DialogTitle>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">
                            Ambiente: <span className="text-primary underline">Política Principal (1)</span>
                        </p>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-6">
                        {/* IDENTIFICAÇÃO: BARRA DE BUSCA */}
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                className="pl-12 h-14 text-lg shadow-inner border-muted-foreground/10 focus-visible:ring-primary/20 font-medium"
                                placeholder="Busque por nome, SKU, referência ou EAN..."
                            />
                        </div>

                        {err && <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">{err}</div>}

                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px_320px] gap-6 flex-1 overflow-hidden">

                            {/* IDENTIFICAÇÃO: COLUNA 1 - RESULTADOS */}
                            <Card className="flex flex-col border shadow-sm overflow-hidden">
                                <CardHeader className="py-3 px-4 bg-muted/5 border-b flex flex-row items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Catálogo Disponível</span>
                                    <Badge variant="secondary" className="font-mono">{rows.length} itens</Badge>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 overflow-auto">
                                    <VtexProductTable
                                        loading={loading}
                                        rows={rows}
                                        selectedId={selected?.vtex_sku_id ?? null}
                                        onSelect={setSelected}
                                        formatCurrency={formatCurrency}
                                    />
                                </CardContent>
                            </Card>

                            {/* IDENTIFICAÇÃO: COLUNA 2 - DETALHES TÉCNICOS */}
                            <Card className="flex flex-col border shadow-sm bg-muted/5">
                                <CardHeader className="py-3 px-4 bg-muted/10 border-b">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ficha do Produto</span>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <VtexProductDetails selected={selected} formatCurrency={formatCurrency} />
                                </CardContent>
                            </Card>

                            {/* IDENTIFICAÇÃO: COLUNA 3 - CONFIGURAÇÃO DE INCLUSÃO */}
                            <Card className="flex flex-col border-primary/20 shadow-xl ring-1 ring-primary/5">
                                <CardHeader className="py-3 px-4 bg-primary text-primary-foreground border-b rounded-t-lg">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Pricing & Checkout</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 flex-1 flex flex-col">
                                    <VtexProductAddForm
                                        selected={selected}
                                        quantity={quantity}
                                        itemDiscount={itemDiscount}
                                        destinationUF={destinationUF}
                                        isAdding={isAdding}
                                        onQuantityChange={setQuantity}
                                        onDiscountChange={setItemDiscount}
                                        onAdd={handleAdd}
                                        formatCurrency={formatCurrency}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
