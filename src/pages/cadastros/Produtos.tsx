import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Package } from "lucide-react";
import { useVtexPolicyStore } from "@/stores/vtexPolicyStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

const POLICY_LABELS = [
  { id: "1", label: "Principal" },
  { id: "2", label: "B2C" },
  { id: "mgpbrclustera", label: "MGP BR Cluster A" },
  { id: "mgpmgclustera", label: "MGP MG Cluster A" },
];

function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ProdutosVtex() {
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 350);

  const [onlyActive, setOnlyActive] = useState(true);
  const [showAllPolicies, setShowAllPolicies] = useState(true);
  const [policyMatrix, setPolicyMatrix] = useState<Record<number, any[]>>({});
  const [openSkuPolicies, setOpenSkuPolicies] = useState<number | null>(null);

  const { mode, tradePolicyId, setMode, setTradePolicyId, policies, loadPolicies } = useVtexPolicyStore();

  const [pageSize] = useState(30);
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const getEmbalagemQtyFromText = (text?: string | null) => {
    if (!text) return null;
    const direct = text.match(/(?:caixa|cx)\s*(\d+)/i);
    if (direct?.[1]) {
      const qty = Number.parseInt(direct[1], 10);
      return Number.isFinite(qty) && qty > 0 ? qty : null;
    }
    const unidades = text.match(/(\d+)\s*(?:unidades?|unid\.?|un\.?)\b/i);
    if (unidades?.[1]) {
      const qty = Number.parseInt(unidades[1], 10);
      return Number.isFinite(qty) && qty > 0 ? qty : null;
    }
    return null;
  };

  const getEmbalagemQty = (embalagem?: string | null, ...fallbacks: Array<string | null | undefined>) => {
    const base = getEmbalagemQtyFromText(embalagem);
    if (base) return base;
    for (const text of fallbacks) {
      const qty = getEmbalagemQtyFromText(text);
      if (qty) return qty;
    }
    return null;
  };

  const getPolicyEffective = (skuId: number, policyId: string) => {
    const rows = policyMatrix[skuId] ?? [];
    const row = rows.find((p: any) => String(p.tradePolicyId) === policyId);
    return typeof row?.effectivePrice === "number" ? row.effectivePrice : null;
  };

  const off = useMemo(() => (page - 1) * pageSize, [page, pageSize]);
  const hasNext = rows.length === pageSize;
  const openSkuRow = useMemo(
    () => (openSkuPolicies ? rows.find((r) => r.vtex_sku_id === openSkuPolicies) ?? null : null),
    [openSkuPolicies, rows]
  );
  const openSkuQty = useMemo(
    () => getEmbalagemQty(openSkuRow?.embalagem, openSkuRow?.product_name, openSkuRow?.sku_name),
    [openSkuRow]
  );

  const runSearch = async (query: string, resetPage = false) => {
    try {
      setErr(null);
      setLoading(true);

      const nextPage = resetPage ? 1 : page;
      const nextOff = (nextPage - 1) * pageSize;

      // Fonte correta para o front:
      // - Busca/ranking/paginação: RPC `search_catalog` (usa `mv_vtex_catalog` + preço efetivo policy 1)
      // - Preço: `selling_price` (efetivo) + `price_source` + `price_available`
      const rpcName = mode === "fixed" ? "search_catalog_policy" : "search_catalog_any_policy";
      const rpcArgs: any = {
        q: query ?? "",
        lim: pageSize,
        off: nextOff,
        only_active: onlyActive,
      };
      if (mode === "fixed") {
        rpcArgs.trade_policy_id = String(tradePolicyId || "1");
      }

      const { data, error } = await (supabase as any).rpc(rpcName, rpcArgs);

      if (error) throw error;

      setRows((data ?? []) as CatalogRow[]);
      // Carrega matriz de preços (todas as policies) para os SKUs retornados
      if (showAllPolicies) {
        const skuIds = (data ?? []).map((r: any) => Number(r.vtex_sku_id)).filter((n: number) => Number.isFinite(n));
        const { data: matrix } = await (supabase as any).rpc("get_vtex_prices_matrix", { sku_ids: skuIds });
        const map: Record<number, any[]> = {};
        for (const row of (matrix ?? [])) {
          map[Number(row.vtex_sku_id)] = (row.prices ?? []) as any[];
        }
        setPolicyMatrix(map);
      } else {
        setPolicyMatrix({});
      }
      if (resetPage) setPage(1);
    } catch (e: any) {
      setRows([]);
      setErr(e?.message ?? "Falha ao buscar no catálogo");
    } finally {
      setLoading(false);
    }
  };

  // Busca automática (simples e usual)
  useEffect(() => {
    runSearch((debouncedQ || "").trim(), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, onlyActive, showAllPolicies, mode, tradePolicyId]);

  useEffect(() => {
    // carrega policies para o dropdown quando necessário
    if (mode === "fixed") loadPolicies();
  }, [mode, loadPolicies]);

  // Paginação: refaz consulta mudando offset
  useEffect(() => {
    runSearch((debouncedQ || "").trim(), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Produtos (VTEX)
          </h1>
          <p className="text-muted-foreground">
            Busca rápida por nome, SKU, EAN, Ref, embalagem e gramatura
          </p>
        </div>

        <Button variant="outline" onClick={() => runSearch((q || "").trim(), true)} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10"
                placeholder="Ex: cole 20g | 10.4141 | 789... | curativo | embalagem 100 tiras"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">Somente ativos</div>
              <Switch checked={onlyActive} onCheckedChange={setOnlyActive} />
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">Policy</div>
              <div className="flex items-center gap-3">
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                >
                  <option value="auto">Automático</option>
                  <option value="fixed">Fixar policy</option>
                </select>
                {mode === "fixed" && (
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[220px]"
                    value={tradePolicyId}
                    onChange={(e) => setTradePolicyId(e.target.value)}
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    {policies
                      .map((p) => p.trade_policy_id)
                      .filter((p) => p !== "1" && p !== "2")
                      .slice(0, 80)
                      .map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                  </select>
                )}
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">Mostrar todas</div>
                  <Switch checked={showAllPolicies} onCheckedChange={setShowAllPolicies} />
                </div>
              </div>
            </div>
          </div>

          {err && (
            <div className="mt-4 text-sm text-red-600">
              {err}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Resultados</span>
            <div className="text-sm text-muted-foreground">
              Página {page}
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum item encontrado</p>
              <p className="text-sm">Tente outro termo de busca</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>SKU Nome</TableHead>
                      <TableHead>EAN</TableHead>
                      <TableHead>Ref</TableHead>
                      <TableHead>Embalagem</TableHead>
                      <TableHead>Gramatura</TableHead>
                      <TableHead className="text-right">
                        Preço ({mode === "fixed" ? `policy ${tradePolicyId}` : "auto"})
                      </TableHead>
                      <TableHead className="text-right">Preço Embalagem</TableHead>
                      <TableHead>Policies (efetivo)</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Policies</TableHead>
                      <TableHead className="text-right">Disp.</TableHead>
                      <TableHead className="text-center">Em estoque</TableHead>
                      <TableHead className="text-center">Ativo</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.vtex_sku_id}>
                        <TableCell className="font-mono text-sm">{r.vtex_sku_id}</TableCell>
                        <TableCell className="font-medium">{r.product_name ?? "-"}</TableCell>
                        <TableCell>{r.sku_name ?? "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{r.ean ?? "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{r.ref_id ?? "-"}</TableCell>
                        <TableCell>{r.embalagem ?? "-"}</TableCell>
                        <TableCell>{r.gramatura ?? "-"}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {typeof r.selling_price === "number" ? formatCurrency(r.selling_price) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {(() => {
                            const qty = getEmbalagemQty(r.embalagem);
                            if (!qty || typeof r.selling_price !== "number") return "-";
                            return formatCurrency(r.selling_price * qty);
                          })()}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="space-y-1">
                            {POLICY_LABELS.map((p) => {
                              const effective = getPolicyEffective(r.vtex_sku_id, p.id);
                              const qty = getEmbalagemQty(r.embalagem, r.product_name, r.sku_name);
                              const total =
                                qty && typeof effective === "number" ? formatCurrency(effective * qty) : null;
                              return (
                                <div key={p.id} className="flex items-center justify-between gap-2">
                                  <span className="text-muted-foreground">{p.label}</span>
                                  <span className="font-mono text-right">
                                    {typeof effective === "number" ? formatCurrency(effective) : "-"}
                                    {total ? (
                                      <div className="text-[10px] text-muted-foreground">
                                        emb {qty}: {total}
                                      </div>
                                    ) : null}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.price_available === false ? (
                            <Badge variant="destructive">sem preço</Badge>
                          ) : (
                            <Badge variant="outline">{r.price_source ?? "-"}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {showAllPolicies ? (
                            <div className="flex items-center gap-2">
                              {mode !== "fixed" && r.trade_policy_id ? (
                                <Badge variant="secondary" className="font-mono">{r.trade_policy_id}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setOpenSkuPolicies(r.vtex_sku_id)}
                                disabled={!policyMatrix[r.vtex_sku_id]?.length}
                              >
                                Detalhes ({policyMatrix[r.vtex_sku_id]?.length ?? 0})
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {typeof r.available_quantity === "number" ? r.available_quantity : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.in_stock ? (
                            <Badge className="bg-green-500">Sim</Badge>
                          ) : (
                            <Badge variant="secondary">Não</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.is_active ? <Badge className="bg-green-500">Sim</Badge> : <Badge variant="secondary">Não</Badge>}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {typeof r.score === "number" ? r.score.toFixed(3) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Dialog open={openSkuPolicies !== null} onOpenChange={(v) => setOpenSkuPolicies(v ? openSkuPolicies : null)}>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Preços por policy — SKU {openSkuPolicies ?? ""}</DialogTitle>
                  </DialogHeader>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Policy</TableHead>
                          <TableHead className="text-right">Efetivo</TableHead>
                          <TableHead className="text-right">
                            Efetivo (emb{openSkuQty ? ` x${openSkuQty}` : ""})
                          </TableHead>
                          <TableHead>Fonte</TableHead>
                          <TableHead className="text-right">Selling</TableHead>
                          <TableHead className="text-right">Fixed</TableHead>
                          <TableHead className="text-right">List</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(openSkuPolicies ? (policyMatrix[openSkuPolicies] ?? []) : []).map((p: any) => (
                          <TableRow key={String(p.tradePolicyId)}>
                            <TableCell className="font-mono text-xs">{p.tradePolicyId}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {typeof p.effectivePrice === "number"
                                ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.effectivePrice)
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {openSkuQty && typeof p.effectivePrice === "number"
                                ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.effectivePrice * openSkuQty)
                                : "-"}
                            </TableCell>
                            <TableCell className="text-xs">{p.priceSource ?? "-"}</TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {typeof p.sellingPrice === "number" ? p.sellingPrice : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {typeof p.fixedValue === "number" ? p.fixedValue : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {typeof p.listPrice === "number" ? p.listPrice : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {typeof p.costPrice === "number" ? p.costPrice : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {rows.length} itens
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
