import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Download, RefreshCw, Search, AlertCircle, Info, AlertTriangle, Bug } from 'lucide-react';
import { LogService, LogLevel, LogEntry } from '@/services/logService';

export function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const modules = useMemo(() => LogService.getModules(), [logs]);
  const stats = useMemo(() => LogService.getStats(), [logs]);

  useEffect(() => {
    const fetchLogs = () => {
      const filter: { module?: string; level?: LogLevel; search?: string } = {};
      if (levelFilter !== 'ALL') filter.level = levelFilter;
      if (moduleFilter !== 'ALL') filter.module = moduleFilter;
      if (search) filter.search = search;
      setLogs(LogService.getLogs(filter));
    };

    fetchLogs();
    
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 1000);
      return () => clearInterval(interval);
    }
  }, [search, levelFilter, moduleFilter, autoRefresh]);

  const handleClear = () => {
    LogService.clearLogs();
    setLogs([]);
  };

  const handleExport = () => {
    const data = LogService.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG: return <Bug className="h-4 w-4" />;
      case LogLevel.INFO: return <Info className="h-4 w-4" />;
      case LogLevel.WARN: return <AlertTriangle className="h-4 w-4" />;
      case LogLevel.ERROR: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: LogLevel): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case LogLevel.DEBUG: return 'secondary';
      case LogLevel.INFO: return 'default';
      case LogLevel.WARN: return 'outline';
      case LogLevel.ERROR: return 'destructive';
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total de Logs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">{stats.byLevel[LogLevel.ERROR]}</div>
            <p className="text-xs text-muted-foreground">Erros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">{stats.byLevel[LogLevel.WARN]}</div>
            <p className="text-xs text-muted-foreground">Avisos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">{stats.byLevel[LogLevel.INFO]}</div>
            <p className="text-xs text-muted-foreground">Info</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Logs do Sistema</span>
            <div className="flex gap-2">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Monitore eventos, erros e atividades do sistema em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nos logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LogLevel | 'ALL')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os níveis</SelectItem>
                <SelectItem value={LogLevel.ERROR}>Erro</SelectItem>
                <SelectItem value={LogLevel.WARN}>Aviso</SelectItem>
                <SelectItem value={LogLevel.INFO}>Info</SelectItem>
                <SelectItem value={LogLevel.DEBUG}>Debug</SelectItem>
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os módulos</SelectItem>
                {modules.map(module => (
                  <SelectItem key={module} value={module}>{module}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Log List */}
          <ScrollArea className="h-[500px] rounded-md border">
            <div className="p-4 space-y-2">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum log encontrado
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getLevelColor(log.level)} className="text-xs">
                          {log.level}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {log.module}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.timestamp.toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{log.message}</p>
                      {log.data && (
                        <pre className="mt-2 text-xs bg-background p-2 rounded overflow-x-auto">
                          {typeof log.data === 'object' 
                            ? JSON.stringify(log.data, null, 2) 
                            : String(log.data)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
