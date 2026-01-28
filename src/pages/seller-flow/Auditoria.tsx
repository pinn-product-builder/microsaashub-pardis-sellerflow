import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Activity, Download, Eye, MoreHorizontal, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type QuoteEvent = {
  id: string;
  quote_id: string;
  event_type: string;
  message: string | null;
  from_status: string | null;
  to_status: string | null;
  created_at: string;
  created_by: string | null;
  quote?: { id: string; quote_number: number | null };
};
type ProfileLite = { user_id: string; full_name: string; email: string };

const EVENT_LABELS: Record<string, string> = {
  created: "Criou",
  edited: "Editou",
  validated: "Validou",
  approval_requested: "Solicitou aprovação",
  approved: "Aprovou",
  sent: "Enviou",
  failed: "Falhou",
  status_change: "Status",
  approval: "Aprovação",
};

const EVENT_STYLES: Record<string, string> = {
  created: "bg-blue-100 text-blue-800 border-blue-200",
  edited: "bg-slate-100 text-slate-800 border-slate-200",
  validated: "bg-emerald-100 text-emerald-800 border-emerald-200",
  approval_requested: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  sent: "bg-indigo-100 text-indigo-800 border-indigo-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  status_change: "bg-gray-100 text-gray-800 border-gray-200",
  approval: "bg-purple-100 text-purple-800 border-purple-200",
};

const STATUS_LABELS: Record<string, string> = {
  approved: "Aprovado",
  calculated: "Calculado",
  draft: "Rascunho",
  pending_approval: "Pendente de aprovação",
  rejected: "Reprovado",
};

function formatEventLabel(ev: QuoteEvent) {
  return EVENT_LABELS[ev.event_type] ?? ev.event_type;
}

function eventBadgeClass(ev: QuoteEvent) {
  return EVENT_STYLES[ev.event_type] ?? "bg-gray-100 text-gray-800 border-gray-200";
}

function formatStatusLabel(status?: string | null) {
  if (!status) return "";
  return STATUS_LABELS[status] ?? status;
}

export default function Auditoria() {
  const [searchTerm, setSearchTerm] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const { role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: auditData, isLoading } = useQuery({
    queryKey: ["audit", "vtex_quote_events"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vtex_quote_events")
        .select("id, quote_id, event_type, message, from_status, to_status, created_at, created_by, quote:vtex_quotes(id, quote_number)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const events = (data ?? []) as QuoteEvent[];
      const userIds = Array.from(new Set(events.map((ev) => ev.created_by).filter(Boolean))) as string[];
      if (!userIds.length) {
        return { events, profiles: new Map<string, ProfileLite>() };
      }
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      const map = new Map<string, ProfileLite>();
      (profiles ?? []).forEach((p: ProfileLite) => map.set(p.user_id, p));
      return { events, profiles: map };
    },
  });

  const events = auditData?.events ?? [];
  const profiles = auditData?.profiles ?? new Map<string, ProfileLite>();

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return events;
    return events.filter((ev) => {
      const quoteNumber = ev.quote?.quote_number ? String(ev.quote.quote_number) : "";
      const message = ev.message ?? "";
      const userName = ev.created_by ? profiles.get(ev.created_by)?.full_name ?? "" : "";
      const userEmail = ev.created_by ? profiles.get(ev.created_by)?.email ?? "" : "";
      return (
        ev.event_type.toLowerCase().includes(term) ||
        message.toLowerCase().includes(term) ||
        quoteNumber.toLowerCase().includes(term) ||
        userName.toLowerCase().includes(term) ||
        userEmail.toLowerCase().includes(term)
      );
    });
  }, [events, profiles, searchTerm]);

  const filteredByType = useMemo(() => {
    if (eventFilter === "all") return filtered;
    return filtered.filter((ev) => ev.event_type === eventFilter);
  }, [filtered, eventFilter]);

  const filteredByStatus = useMemo(() => {
    if (statusFilter === "all") return filteredByType;
    return filteredByType.filter((ev) => ev.from_status === statusFilter || ev.to_status === statusFilter);
  }, [filteredByType, statusFilter]);

  const filteredByUser = useMemo(() => {
    if (userFilter === "all") return filteredByStatus;
    return filteredByStatus.filter((ev) => ev.created_by === userFilter);
  }, [filteredByStatus, userFilter]);

  const eventTypes = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) set.add(ev.event_type);
    return Array.from(set).sort();
  }, [events]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      if (ev.from_status) set.add(ev.from_status);
      if (ev.to_status) set.add(ev.to_status);
    }
    return Array.from(set).sort();
  }, [events]);

  const userOptions = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) if (ev.created_by) set.add(ev.created_by);
    return Array.from(set).sort();
  }, [events]);

  const totalPages = Math.max(1, Math.ceil(filteredByUser.length / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredByUser.slice(start, start + pageSize);
  }, [filteredByUser, page, pageSize]);

  const handleExport = () => {
    const rows = filteredByUser.map((ev) => {
      const quoteNumber = ev.quote?.quote_number ? `#${ev.quote.quote_number}` : ev.quote_id;
      const user = ev.created_by ? profiles.get(ev.created_by) : null;
      return {
        created_at: new Date(ev.created_at).toISOString(),
        quote_number: quoteNumber,
        event_type: ev.event_type,
        message: ev.message ?? "",
        from_status: ev.from_status ?? "",
        to_status: ev.to_status ?? "",
        created_by: user?.full_name ?? user?.email ?? ev.created_by ?? "",
      };
    });
    const header = ["created_at", "quote_number", "event_type", "message", "from_status", "to_status", "created_by"];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        header.map((k) => `"${String((r as any)[k] ?? "").replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-cotacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!authLoading && role !== "admin") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Auditoria</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              A auditoria é um recurso restrito a administradores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Auditoria</h1>
          <p className="text-muted-foreground">
            Histórico mínimo de ações por cotação (criou, editou, validou, aprovou, enviou, falhou).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Eventos recentes
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por evento, mensagem ou nº da cotação..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={eventFilter} onValueChange={(v) => {
                setEventFilter(v);
                setPage(1);
              }}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Todos os eventos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os eventos</SelectItem>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {EVENT_LABELS[type] ?? type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={userFilter} onValueChange={(v) => {
                setUserFilter(v);
                setPage(1);
              }}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {userOptions.map((userId) => {
                    const user = profiles.get(userId);
                    const label = user?.full_name || user?.email || userId;
                    return (
                      <SelectItem key={userId} value={userId}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredByUser.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-6 gap-4 text-xs font-semibold text-muted-foreground px-3">
                <span>Evento</span>
                <span>Cotação</span>
                <span>Usuário</span>
                <span>Status</span>
                <span className="text-right">Data/Hora</span>
                <span className="text-right">Ações</span>
              </div>
              {paged.map((ev) => (
                <div key={ev.id} className="grid grid-cols-6 gap-4 items-center rounded border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`border ${eventBadgeClass(ev)}`}>
                      {formatEventLabel(ev)}
                    </Badge>
                    <span className="truncate">{ev.message ?? "Sem mensagem"}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {ev.quote?.quote_number ? `#${ev.quote.quote_number}` : ev.quote_id}
                  </span>
                  <span className="text-muted-foreground truncate">
                    {ev.created_by ? (profiles.get(ev.created_by)?.full_name || profiles.get(ev.created_by)?.email || ev.created_by) : "Sistema"}
                  </span>
                  <span className="text-muted-foreground truncate">
                    {ev.from_status || ev.to_status
                      ? `${formatStatusLabel(ev.from_status)}${ev.from_status ? " → " : ""}${formatStatusLabel(ev.to_status)}`
                      : "-"}
                  </span>
                  <span className="text-xs text-muted-foreground text-right">
                    {new Date(ev.created_at).toLocaleString("pt-BR")}
                  </span>
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            navigate(`/seller-flow/cotacao/${ev.quote_id}`);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Abrir cotação
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
                <span>
                  Página {page} de {totalPages} • {filteredByUser.length} eventos
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
