
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QuotesTable } from '@/components/cpq/tables/QuotesTable';
import { QuoteFilters } from '@/components/cpq/tables/QuoteFilters';
import { useQuotes } from '@/hooks/useQuotes';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function Historico() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: quotes = [], isLoading } = useQuotes();

  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote) => {
      // Search filter
      const customerName = (quote as any).customers?.company_name || '';
      const matchesSearch = searchTerm === '' || 
        quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customerName.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const quoteDate = new Date(quote.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            matchesDate = quoteDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = quoteDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = quoteDate >= monthAgo;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [quotes, searchTerm, statusFilter, dateFilter]);

  const stats = useMemo(() => {
    const total = quotes.length;
    const draft = quotes.filter(q => q.status === 'draft').length;
    const calculated = quotes.filter(q => q.status === 'calculated').length;
    const approved = quotes.filter(q => q.status === 'approved').length;
    const sent = quotes.filter(q => q.status === 'sent').length;
    const pendingApproval = quotes.filter(q => q.status === 'pending_approval').length;

    return { total, draft, calculated, approved, sent, pendingApproval };
  }, [quotes]);

  // Transform quotes to match the expected format for QuotesTable
  const tableQuotes = useMemo(() => {
    return filteredQuotes.map(quote => ({
      id: quote.id,
      number: quote.quote_number,
      customer: {
        id: quote.customer_id,
        companyName: (quote as any).customers?.company_name || 'Cliente',
        cnpj: (quote as any).customers?.cnpj || '',
        uf: (quote as any).customers?.uf || '',
        city: (quote as any).customers?.city || '',
        creditLimit: 0,
        paymentTerms: []
      },
      destinationUF: (quote as any).customers?.uf || '',
      items: [],
      subtotal: quote.subtotal || 0,
      totalTaxes: 0,
      totalFreight: 0,
      discount: quote.total_discount || 0,
      total: quote.total_offered || 0,
      status: quote.status as any,
      paymentConditions: '',
      validUntil: new Date(quote.valid_until),
      createdAt: new Date(quote.created_at),
      updatedAt: new Date(quote.updated_at),
      createdBy: quote.created_by,
      marginPercent: quote.total_margin_percent || 0
    }));
  }, [filteredQuotes]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Histórico de Cotações</h1>
          <p className="text-muted-foreground">
            Gerencie todas as cotações criadas
          </p>
        </div>
        <Button asChild>
          <Link to="/cpq/nova-cotacao">
            <Plus className="h-4 w-4 mr-2" />
            Nova Cotação
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">{stats.total}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rascunhos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">{stats.draft}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Calculadas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">{stats.calculated}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pend. Aprovação
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-amber-600">{stats.pendingApproval}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aprovadas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enviadas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-purple-600">{stats.sent}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cotações</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número ou cliente..."
                  className="pl-10 w-80"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {(statusFilter !== 'all' || dateFilter !== 'all') && (
                  <Badge variant="secondary" className="ml-2">
                    {[statusFilter !== 'all', dateFilter !== 'all'].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showFilters && (
            <div className="mb-6">
              <QuoteFilters
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                dateFilter={dateFilter}
                onDateChange={setDateFilter}
              />
            </div>
          )}
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <QuotesTable quotes={tableQuotes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
