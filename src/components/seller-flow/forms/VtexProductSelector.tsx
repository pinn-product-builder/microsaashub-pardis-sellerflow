import { useEffect, useMemo, useState } from "react";
import { Search, Plus, CheckCircle, Package, DollarSign } from "lucide-react";
import { getEmbalagemQty } from "@/utils/vtexUtils";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    const [itemDiscount, setItemDiscount] = useState<number>(0);
    const [isAdding, setIsAdding] = useState(false);
    const [policyMatrix, setPolicyMatrix] = useState<Record<number, any[]>>({});
    const [policyMatrixQty, setPolicyMatrixQty] = useState<Record<string, number | null>>({});

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

    // Reseta/inicializa manualPrice quando o produto selecionado mudar
    useEffect(() => {
        if (selected) {
            setQuantity(1);
            setItemDiscount(0);
        } else {
            setQuantity(1);
            setItemDiscount(0);
        }
    }, [selected]);

    const fetchEffectivePriceForPolicy = async (skuId: number, qtyUnits: number, policyId: string) => {
        const args: any = { sku_ids: [skuId], quantities: [qtyUnits], trade_policy_id: policyId };
        const { data, error } = await (supabase as any).rpc("get_vtex_effective_prices", args);
        if (error) throw error;
        const row = (data ?? [])[0] as EffectivePriceRow | undefined;
        return row;
    };

    const fetchEffectivePriceAuto = async (skuId: number, qtyUnits: number) => {
        const results = await Promise.all(
            POLICY_LABELS.map((policy) => fetchEffectivePriceForPolicy(skuId, qtyUnits, policy.id))
        );
        for (let i = 0; i < results.length; i += 1) {
            const row = results[i];
            if (row?.effective_price && row.effective_price > 0) {
                return { row, policyId: POLICY_LABELS[i].id };
            }
        }
        return { row: results[0], policyId: POLICY_LABELS[0].id };
    };

    const loadPolicyMatrix = async (skuId: number) => {
        try {
            const { data } = await (supabase as any).rpc("get_vtex_prices_matrix", { sku_ids: [skuId] });
            const map: Record<number, any[]> = {};
            for (const row of (data ?? [])) {
                map[Number(row.vtex_sku_id)] = (row.prices ?? []) as any[];
            }
            setPolicyMatrix(map);
        } catch {
            setPolicyMatrix({});
        }
    };

    const loadPolicyMatrixQty = async (skuId: number) => {
        const qty = getEmbalagemQty(selected?.embalagem, selected?.product_name, selected?.sku_name);
        if (!qty) {
            setPolicyMatrixQty({});
            return;
        }
        const policies = POLICY_LABELS.map((p) => p.id);
        const map: Record<string, number | null> = {};
        await Promise.all(
            policies.map(async (policyId) => {
                const { data } = await (supabase as any).rpc("get_vtex_effective_prices", {
                    sku_ids: [skuId],
                    quantities: [qty],
                    trade_policy_id: policyId,
                });
                const row = (data ?? [])[0] as { effective_price?: number | null } | undefined;
                map[policyId] = row?.effective_price ?? null;
            })
        );
        setPolicyMatrixQty(map);
    };

    useEffect(() => {
        if (!selected?.vtex_sku_id) return;
        loadPolicyMatrix(selected.vtex_sku_id);
        loadPolicyMatrixQty(selected.vtex_sku_id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.vtex_sku_id]);

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

            const embalagemQty = getEmbalagemQty(selected.embalagem, selected.product_name, selected.sku_name) ?? 1;
            const qtyUnits = Math.max(1, quantity * embalagemQty);
            const picked =
                policyMode === "fixed"
                    ? { row: await fetchEffectivePriceForPolicy(skuId, qtyUnits, String(tradePolicyId || "1")), policyId: String(tradePolicyId || "1") }
                    : await fetchEffectivePriceAuto(skuId, qtyUnits);

            const packagingPrice = (picked.row?.effective_price ?? 0) * embalagemQty;
            const finalPackagingPrice = packagingPrice * (1 - itemDiscount / 100);

            if (finalPackagingPrice <= 0) {
                toast({
                    title: "Preço inválido",
                    description: `O preço deve ser maior que zero.`,
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
                // para margem/validações: usar custo por embalagem quando disponível
                baseCost: (picked.row?.cost_price ?? (picked.row?.effective_price || 0)) * embalagemQty,
                description: selected.sku_name ?? undefined,
            };

            const quoteItem = PricingService.createQuoteItemWithUnitPrice(
                product,
                quantity,
                destinationUF,
                finalPackagingPrice,
                selectedCustomer
            );
            (quoteItem as any).vtexTradePolicyId = picked.policyId;
            (quoteItem as any).vtexEmbalagemQty = embalagemQty;

            // Registrar o desconto manual se houver
            if (itemDiscount > 0) {
                quoteItem.discounts = [
                    ...(quoteItem.discounts || []),
                    {
                        type: 'MANUAL',
                        description: 'Ajuste comercial',
                        percentage: itemDiscount,
                        amount: packagingPrice * (itemDiscount / 100),
                        priority: 1,
                    }
                ];
            }

            onAddProduct(quoteItem);
            toast({
                title: "Produto VTEX adicionado",
                description: `${product.name} (${formatCurrency(finalPackagingPrice)}) foi adicionado à cotação.`,
                action: <CheckCircle className="h-4 w-4 text-green-600" />,
            });

            setSelected(null);
            setQuantity(1);
            setItemDiscount(0);
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
                        className="font-medium"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Produto (VTEX)
                    </Button>
                </DialogTrigger>

                <DialogContent className="max-w-[1200px] w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0 border-none shadow-2xl">
                    <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-xl font-bold">Catálogo VTEX</DialogTitle>
                                <p className="text-sm text-muted-foreground mt-1">Política Comercial: <span className="font-semibold text-primary">Principal (1)</span></p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                className="pl-10 h-11 text-base shadow-sm border-muted-foreground/20 focus-visible:ring-primary/30"
                                placeholder="Buscar por nome, SKU, EAN ou referência..."
                            />
                        </div>

                        {err && (
                            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
                                {err}
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px_300px] gap-6 flex-1 overflow-hidden">
                            {/* Column 1: Search Results */}
                            <Card className="flex flex-col overflow-hidden border-muted/60 shadow-sm">
                                <CardHeader className="py-3 px-4 border-b bg-muted/10">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Resultados da Busca</CardTitle>
                                        <Badge variant="outline" className="text-[10px]">{rows.length} itens</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 overflow-auto">
                                    {loading ? (
                                        <div className="p-4 space-y-3">
                                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                                <Skeleton key={i} className="h-16 w-full rounded-lg" />
                                            ))}
                                        </div>
                                    ) : rows.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full py-12 text-center text-muted-foreground">
                                            <Package className="h-12 w-12 mb-4 opacity-20" />
                                            <p className="text-base">Nenhum produto encontrado</p>
                                            <p className="text-xs max-w-[200px] mt-1">Tente ajustar os termos da sua busca</p>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader className="bg-muted/5 sticky top-0 z-10">
                                                <TableRow>
                                                    <TableHead className="w-[80px] text-xs uppercase font-bold">SKU</TableHead>
                                                    <TableHead className="text-xs uppercase font-bold">Produto</TableHead>
                                                    <TableHead className="text-right w-[100px] text-xs uppercase font-bold">Preço (Emb.)</TableHead>
                                                    <TableHead className="text-right w-[80px] text-xs uppercase font-bold">Estoque</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {rows.map((r) => (
                                                    <TableRow
                                                        key={r.vtex_sku_id}
                                                        className={`cursor-pointer transition-colors hover:bg-primary/5 ${selected?.vtex_sku_id === r.vtex_sku_id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                                                        onClick={() => setSelected(r)}
                                                    >
                                                        <TableCell className="font-mono text-xs align-middle">
                                                            {r.vtex_sku_id}
                                                        </TableCell>
                                                        <TableCell className="align-middle">
                                                            <div className="font-semibold text-sm line-clamp-1">
                                                                {r.product_name ?? r.sku_name ?? "-"}
                                                            </div>
                                                            {r.sku_name && r.sku_name !== r.product_name && (
                                                                <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                                                    {r.sku_name}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-sm text-primary align-middle">
                                                            {(() => {
                                                                const qty = getEmbalagemQty(r.embalagem, r.product_name, r.sku_name) ?? 1;
                                                                return typeof r.selling_price === "number" ? formatCurrency(r.selling_price * qty) : "-";
                                                            })()}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs align-middle">
                                                            {typeof r.available_quantity === "number"
                                                                ? r.available_quantity.toFixed(0)
                                                                : "-"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Column 2: Product Details */}
                            <Card className="flex flex-col border-muted/60 shadow-sm">
                                <CardHeader className="py-3 px-4 border-b bg-muted/10">
                                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Detalhes do Produto</CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 space-y-5">
                                    {selected ? (
                                        <>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Identificação</Label>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">SKU {selected.vtex_sku_id}</span>
                                                    {selected.ref_id && <span className="text-xs text-muted-foreground">Ref: {selected.ref_id}</span>}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Nome / SKU Name</Label>
                                                <div className="text-sm font-bold leading-snug">{selected.product_name ?? "-"}</div>
                                                <div className="text-[11px] text-muted-foreground italic leading-tight">{selected.sku_name ?? ""}</div>
                                            </div>

                                            <div className="flex gap-1.5 flex-wrap">
                                                {selected.ean && <Badge variant="secondary" className="text-[10px] font-normal px-2">EAN: {selected.ean}</Badge>}
                                                {selected.embalagem && <Badge variant="secondary" className="text-[10px] font-normal px-2 bg-blue-50 text-blue-700 border-blue-100">{selected.embalagem}</Badge>}
                                                {selected.gramatura && <Badge variant="secondary" className="text-[10px] font-normal px-2">{selected.gramatura}</Badge>}
                                            </div>

                                            <div className="space-y-2 pt-4 border-t">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Preço Original (VTEX)</Label>
                                                {(() => {
                                                    const qty = getEmbalagemQty(selected.embalagem, selected.product_name, selected.sku_name);
                                                    if (typeof selected.selling_price !== "number") return <div className="text-2xl font-black text-primary">-</div>;
                                                    const total = selected.selling_price * (qty ?? 1);
                                                    return (
                                                        <div className="space-y-0.5">
                                                            <div className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(total)}</div>
                                                            {qty && qty > 1 && (
                                                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                    <Package className="h-3 w-3" />
                                                                    Pack com {qty} unidades
                                                                </div>
                                                            )}
                                                            <div className="text-[9px] text-muted-foreground mt-1 bg-muted px-2 py-0.5 rounded-full inline-block">
                                                                Origem: <span className="font-mono uppercase">{selected.price_source ?? "computed"}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            <div className="space-y-1.5 pt-4 border-t">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Disponibilidade</Label>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">Estoque Atual:</span>
                                                    <span className={`text-sm font-bold ${selected.available_quantity && selected.available_quantity > 0 ? "text-green-600" : "text-destructive"}`}>
                                                        {typeof selected.available_quantity === "number" ? selected.available_quantity.toFixed(0) : "N/I"} un.
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                                            <Package className="h-10 w-10 mb-3 opacity-10" />
                                            <p className="text-xs text-muted-foreground">Clique em um produto à esquerda para visualizar todos os detalhes técnicos e preços.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Column 3: Add to Quote Form */}
                            <Card className="flex flex-col border-primary/20 shadow-lg ring-1 ring-primary/5">
                                <CardHeader className="py-3 px-4 border-b bg-primary/5 text-primary">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        <CardTitle className="text-sm font-bold uppercase tracking-wider">Adicionar na Cotação</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 flex-1 flex flex-col">
                                    {!selected ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                            <div className="bg-muted p-4 rounded-full mb-4">
                                                <Plus className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <p className="text-xs font-medium">Selecione um produto para configurar a inclusão</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-5 flex-1 flex flex-col">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Desconto Item (%)</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    step="0.1"
                                                    value={itemDiscount}
                                                    onChange={(e) => setItemDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                                    className="h-10 font-bold border-muted-foreground/30 focus-visible:ring-primary/20"
                                                />
                                            </div>

                                            <div className="space-y-1.5 bg-muted/20 p-4 rounded-xl border border-muted-foreground/10">
                                                <Label className="text-[10px] uppercase font-bold text-primary tracking-tight">Preço Base VTEX (Embalagem)</Label>
                                                <div className="relative">
                                                    <div className="h-12 flex items-center px-4 text-lg font-black bg-muted/30 border border-primary/10 rounded-md">
                                                        {(() => {
                                                            const embalagemQty = getEmbalagemQty(selected.embalagem, selected.product_name, selected.sku_name) ?? 1;
                                                            return formatCurrency((selected.selling_price || 0) * embalagemQty);
                                                        })()}
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground leading-tight px-1">
                                                    O preço base é derivado do catálogo VTEX e não pode ser editado manualmente.
                                                </p>
                                            </div>

                                            <div className="mt-auto space-y-4 pt-4 border-t">
                                                <div className="flex justify-between items-center px-1">
                                                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-widest">Total do Item</span>
                                                    <span className="text-xl font-black text-primary">
                                                        {(() => {
                                                            const embalagemQty = getEmbalagemQty(selected.embalagem, selected.product_name, selected.sku_name) ?? 1;
                                                            const base = (selected.selling_price || 0) * embalagemQty;
                                                            return formatCurrency(base * (1 - itemDiscount / 100) * quantity);
                                                        })()}
                                                    </span>
                                                </div>

                                                <Button
                                                    onClick={handleAdd}
                                                    disabled={!selected || isAdding}
                                                    className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-[0.98]"
                                                >
                                                    {isAdding ? (
                                                        <div className="flex items-center gap-2">
                                                            <Skeleton className="h-4 w-4 rounded-full bg-white/20 animate-pulse" />
                                                            <span>Processando...</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <Plus className="h-5 w-5" />
                                                            <span>ADICIONAR NA COTAÇÃO</span>
                                                        </div>
                                                    )}
                                                </Button>

                                                <div className="text-[9px] text-center text-muted-foreground px-4 leading-normal">
                                                    Ao adicionar, usaremos o cálculo de margem e impostos baseado no destino:
                                                    <span className="font-bold text-primary ml-1">{destinationUF}</span>.
                                                </div>
                                            </div>
                                        </div >
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
