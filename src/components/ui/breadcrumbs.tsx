import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface BreadcrumbsProps {
  className?: string;
}

const routeNames: Record<string, string> = {
  dashboard: 'Dashboard',
  'seller-flow': 'Seller Flow',
  cpq: 'Seller Flow',
  'nova-cotacao': 'Nova Cotação',
  historico: 'Histórico',
  integracoes: 'Integrações',
  testes: 'Testes',
  pricing: 'Precificação',
  rules: 'Regras',
  tables: 'Tabelas',
  approvals: 'Aprovações',
  aprovacoes: 'Aprovações',
  analytics: 'Analytics',
  'market-research': 'Pesquisa de Mercado',
  taxes: 'Impostos',
  estoque: 'Estoque',
  produtos: 'Produtos',
  movimentacoes: 'Movimentações',
  entrada: 'Entrada',
  saida: 'Saída',
  configuracoes: 'Configurações',
  documentacao: 'Documentação',
  importacao: 'Importação',
  cadastros: 'Cadastros',
  clientes: 'Clientes',
  admin: 'Administração',
  usuarios: 'Usuários',
  grupos: 'Grupos',
};

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) {
    return null;
  }

  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const name = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === pathSegments.length - 1;

    return { path, name, isLast };
  });

  return (
    <Breadcrumb className={cn("mb-6", className)}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/seller-flow/dashboard" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span className="sr-only">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {breadcrumbItems.map((item, index) => (
          <div key={item.path} className="flex items-center">
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.path}>{item.name}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
