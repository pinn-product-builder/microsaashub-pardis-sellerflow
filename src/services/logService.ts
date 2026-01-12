// Serviço centralizado de logs para debugging e monitoramento

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
  userId?: string;
  sessionId?: string;
}

class LogServiceClass {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private sessionId: string;
  private currentUserId?: string;

  constructor() {
    this.sessionId = crypto.randomUUID();
  }

  setUserId(userId: string | undefined) {
    this.currentUserId = userId;
  }

  private log(level: LogLevel, module: string, message: string, data?: unknown): LogEntry {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level,
      module,
      message,
      data,
      userId: this.currentUserId,
      sessionId: this.sessionId,
    };
    
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    
    // Console output com cores
    const colors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: 'color: #888',
      [LogLevel.INFO]: 'color: #2196F3',
      [LogLevel.WARN]: 'color: #FF9800',
      [LogLevel.ERROR]: 'color: #F44336; font-weight: bold'
    };
    
    const timestamp = entry.timestamp.toLocaleTimeString('pt-BR');
    console.log(`%c[${timestamp}] [${level}] [${module}]`, colors[level], message, data || '');
    
    return entry;
  }

  debug(module: string, message: string, data?: unknown): LogEntry {
    return this.log(LogLevel.DEBUG, module, message, data);
  }

  info(module: string, message: string, data?: unknown): LogEntry {
    return this.log(LogLevel.INFO, module, message, data);
  }

  warn(module: string, message: string, data?: unknown): LogEntry {
    return this.log(LogLevel.WARN, module, message, data);
  }

  error(module: string, message: string, data?: unknown): LogEntry {
    return this.log(LogLevel.ERROR, module, message, data);
  }

  getLogs(filter?: { module?: string; level?: LogLevel; limit?: number; search?: string }): LogEntry[] {
    let filtered = [...this.logs];
    
    if (filter?.module) {
      filtered = filtered.filter(l => l.module.toLowerCase().includes(filter.module!.toLowerCase()));
    }
    if (filter?.level) {
      filtered = filtered.filter(l => l.level === filter.level);
    }
    if (filter?.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(l => 
        l.message.toLowerCase().includes(searchLower) ||
        (l.data && JSON.stringify(l.data).toLowerCase().includes(searchLower))
      );
    }
    
    return filtered.slice(0, filter?.limit || 100);
  }

  getAllLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
    this.info('LogService', 'Logs limpos');
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  getModules(): string[] {
    const modules = new Set(this.logs.map(l => l.module));
    return Array.from(modules).sort();
  }

  getStats(): { total: number; byLevel: Record<LogLevel, number>; byModule: Record<string, number> } {
    const byLevel = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
    };
    const byModule: Record<string, number> = {};

    this.logs.forEach(log => {
      byLevel[log.level]++;
      byModule[log.module] = (byModule[log.module] || 0) + 1;
    });

    return {
      total: this.logs.length,
      byLevel,
      byModule,
    };
  }
}

// Singleton instance
export const LogService = new LogServiceClass();
