import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { L2LBadge } from "@/components/seller-flow/display/L2LBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Brazilian states for filter
const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

type VtexClient = {
  id: string;
  md_id?: string;
  company_name: string;
  trade_name: string | null;
  cnpj: string;
  uf: string | null;
  city: string | null;
  is_lab_to_lab: boolean;
  is_active: boolean;
  credit_limit: number;
  price_table_type: "MG" | "BR" | string | null;
  last_sync_at: string | null;
};

type ClientStats = {
  total: number;
  active: number;
  l2l: number;
  states: number;
};

function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ClientesVtex() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 350);
  const [ufFilter, setUfFilter] = useState<string>("all");
  const [l2lFilter, setL2lFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const [customers, setCustomers] = useState<VtexClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [stats, setStats] = useState<ClientStats>({ total: 0, active: 0, l2l: 0, states: 0 });

  const [editingCustomer, setEditingCustomer] = useState<VtexClient | null>(null);
  const [editValues, setEditValues] = useState<Partial<VtexClient>>({});
  const [saving, setSaving] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setLoadError(null);
      const { data, error } = await supabase
        .from("vw_vtex_clients_stats")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      const row = (data ?? {}) as any;
      setStats({
        total: Number(row.total ?? 0),
        active: Number(row.active ?? 0),
        l2l: Number(row.l2l ?? 0),
        states: Number(row.states ?? 0),
      });
    } catch (e) {
      const msg = (e as any)?.message ?? String(e);
      console.error("Erro ao carregar stats de clientes:", e);
      setLoadError(msg);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      setLoadError(null);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let q = supabase
        .from("vtex_clients")
        .select("*", { count: "exact" })
        .order("company_name", { ascending: true });

      const term = (debouncedSearch || "").trim();
      if (term) {
        // Busca server-side para não limitar em 1000 no browser
        const safe = term.replace(/,/g, " ").replace(/\s+/g, " ").trim();
        q = q.or(`company_name.ilike.%${safe}%,trade_name.ilike.%${safe}%,cnpj.ilike.%${safe}%`);
      }

      if (ufFilter !== "all") q = q.eq("uf", ufFilter);
      if (l2lFilter === "yes") q = q.eq("is_lab_to_lab", true);
      if (l2lFilter === "no") q = q.eq("is_lab_to_lab", false);

      const { data, error, count } = await q.range(from, to);

      if (error) throw error;
      // vtex_clients usa md_id como PK; o UI espera "id"
      const normalized = (data ?? []).map((c: any) => ({
        ...c,
        id: c.id ?? c.md_id,
      }));
      setCustomers(normalized as VtexClient[]);
      setTotalCount(Number(count ?? 0));
    } catch (e) {
      const msg = (e as any)?.message ?? String(e);
      console.error("Erro ao carregar clientes (VTEX):", e);
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedSearch, ufFilter, l2lFilter]);

  useEffect(() => {
    fetchStats();
    fetchClients();
  }, [fetchClients, fetchStats]);

  // Quando filtros/busca mudarem, volta pra página 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, ufFilter, l2lFilter]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);

  const formatCNPJ = (cnpj: string) =>
    (cnpj || "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

  const hasNext = useMemo(() => {
    return page * pageSize < (totalCount || 0);
  }, [page, pageSize, totalCount]);

  const handleStartEdit = (customer: VtexClient) => {
    setEditingCustomer(customer);
    setEditValues({
      is_lab_to_lab: customer.is_lab_to_lab,
      is_active: customer.is_active,
      credit_limit: customer.credit_limit,
      price_table_type: customer.price_table_type ?? "BR",
    });
  };

  const handleCancelEdit = () => {
    setEditingCustomer(null);
    setEditValues({});
  };

  const updateClient = async (id: string, updates: Partial<VtexClient>) => {
    // PK real é md_id
    const { error } = await supabase.from("vtex_clients").update(updates).eq("md_id", id);
    if (error) throw error;
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;
    setSaving(true);
    try {
      await updateClient(editingCustomer.id, editValues);

      // refresh local state
      setCustomers((prev) =>
        prev.map((c) => (c.id === editingCustomer.id ? ({ ...c, ...editValues } as VtexClient) : c))
      );
      // stats podem mudar (ativo/L2L etc)
      fetchStats();

      handleCancelEdit();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleL2L = async (customer: VtexClient) => {
    const next = !customer.is_lab_to_lab;

    // otimista
    setCustomers((prev) => prev.map((c) => (c.id === customer.id ? { ...c, is_lab_to_lab: next } : c)));

    try {
      await updateClient(customer.id, { is_lab_to_lab: next });
      fetchStats();
    } catch (e) {
      // rollback
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, is_lab_to_lab: !next } : c))
      );
      throw e;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Cadastro de Clientes (VTEX)
          </h1>
          <p className="text-muted-foreground">Gerencie os clientes sincronizados do sistema</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            fetchStats();
            fetchClients();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {loadError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-sm text-red-800">
              <strong>Erro ao carregar clientes:</strong> {loadError}
              <div className="mt-2 text-xs text-red-700">
                Se a mensagem citar <code>permission denied</code>/401, falta permissão no Supabase Cloud para ler <code>vtex_clients</code>.
                Se não for permissão, provavelmente o sync de clientes ainda não foi executado no Cloud.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
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
            <Badge variant="secondary" className="text-xs">
              L2L
            </Badge>
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

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                    {STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
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
                    setSearchTerm("");
                    setUfFilter("all");
                    setL2lFilter("all");
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lista de Clientes ({totalCount || stats.total || 0})</span>
            <div className="text-sm text-muted-foreground">
              Página {page}
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
          ) : customers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum cliente encontrado</p>
              <p className="text-sm">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <>
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
                    {customers.map((c) => (
                      <TableRow key={c.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{c.company_name}</div>
                          {c.trade_name && (
                            <div className="text-sm text-muted-foreground">{c.trade_name}</div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-sm">{formatCNPJ(c.cnpj)}</TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline">{(c.uf ?? "-").toUpperCase()}</Badge>
                          <span className="text-sm text-muted-foreground">{c.city ?? "-"}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div
                          className="cursor-pointer inline-block"
                          onClick={() => handleToggleL2L(c)}
                          title="Clique para alternar"
                        >
                          <L2LBadge isLabToLab={c.is_lab_to_lab} showLabel={false} size="sm" />
                        </div>
                      </TableCell>

                      <TableCell className="text-right">{formatCurrency(c.credit_limit ?? 0)}</TableCell>

                      <TableCell>
                        <Badge variant={c.price_table_type === "MG" ? "default" : "secondary"}>
                          {c.price_table_type ?? "-"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge variant={c.is_active ? "default" : "destructive"}>
                          {c.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleStartEdit(c)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {customers.length} de {totalCount || stats.total || 0}
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

      {/* Edit Dialog */}
      <Dialog open={!!editingCustomer} onOpenChange={handleCancelEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>{editingCustomer?.company_name}</DialogDescription>
          </DialogHeader>

          {editingCustomer && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Lab-to-Lab (L2L)</label>
                <Switch
                  checked={editValues.is_lab_to_lab ?? false}
                  onCheckedChange={(checked) => setEditValues((p) => ({ ...p, is_lab_to_lab: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Cliente Ativo</label>
                <Switch
                  checked={editValues.is_active ?? true}
                  onCheckedChange={(checked) => setEditValues((p) => ({ ...p, is_active: checked }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Limite de Crédito</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editValues.credit_limit ?? 0}
                  onChange={(e) =>
                    setEditValues((p) => ({ ...p, credit_limit: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tabela de Preço</label>
                <Select
                  value={(editValues.price_table_type ?? "BR") as string}
                  onValueChange={(value) => setEditValues((p) => ({ ...p, price_table_type: value }))}
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
                  Última sincronização:{" "}
                  {format(new Date(editingCustomer.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
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
