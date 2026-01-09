
import {
  ChevronUp,
  Calculator,
  History,
  User2,
  Plus,
  Activity,
  CheckCircle,
  Users,
  Package,
  Settings,
  // === ÍCONES COMENTADOS (MÓDULOS FORA DO ESCOPO) ===
  // Home,
  // FileText,
  // BarChart3,
  // DollarSign,
  // Table,
  // Zap,
  // TrendingUp,
  // Plug,
  // Search,
  // Receipt,
  // Boxes,
  // List,
  // ArrowDown,
  // ArrowUp,
  // === FIM ÍCONES COMENTADOS ===
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  // SidebarMenuSub,
  // SidebarMenuSubItem,
  // SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NavLink } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"

// === MÓDULO PRINCIPAL (FORA DO ESCOPO ATUAL - COTAÇÕES) ===
// const mainItems = [
//   {
//     title: "Dashboard Principal",
//     url: "/dashboard",
//     icon: Home,
//   },
// ]
// === FIM MÓDULO PRINCIPAL ===

// Módulo de Cotações (ATIVO)
const cpqItems = [
  {
    title: "Dashboard",
    url: "/cpq/dashboard",
    icon: Activity,
  },
  {
    title: "Nova Cotação",
    url: "/cpq/nova-cotacao",
    icon: Plus,
  },
  {
    title: "Histórico",
    url: "/cpq/historico",
    icon: History,
  },
  {
    title: "Aprovações",
    url: "/cpq/aprovacoes",
    icon: CheckCircle,
  },
  {
    title: "Configurações",
    url: "/cpq/configuracoes",
    icon: Settings,
  },
]

// Módulo de Cadastros (ATIVO)
const cadastrosItems = [
  {
    title: "Clientes",
    url: "/cadastros/clientes",
    icon: Users,
  },
  {
    title: "Produtos",
    url: "/cadastros/produtos",
    icon: Package,
  },
]

// === MÓDULO DE PRECIFICAÇÃO (FORA DO ESCOPO ATUAL) ===
// const pricingItems = [
//   {
//     title: "Dashboard Pricing",
//     url: "/pricing/dashboard",
//     icon: BarChart3,
//   },
//   {
//     title: "Tabelas de Preço",
//     url: "/pricing/tables",
//     icon: Table,
//   },
//   {
//     title: "Aprovações",
//     url: "/pricing/approvals",
//     icon: CheckCircle,
//   },
//   {
//     title: "Regras",
//     url: "/pricing/rules",
//     icon: Zap,
//   },
//   {
//     title: "Analytics",
//     url: "/pricing/analytics",
//     icon: TrendingUp,
//   },
//   {
//     title: "Pesquisa de Mercado",
//     url: "/pricing/market-research",
//     icon: Search,
//   },
//   {
//     title: "Impostos",
//     url: "/pricing/taxes",
//     icon: Receipt,
//   },
// ]
// === FIM MÓDULO DE PRECIFICAÇÃO ===

// === MÓDULO DE ESTOQUE (FORA DO ESCOPO ATUAL) ===
// const estoqueItems = [
//   {
//     title: "Dashboard Estoque",
//     url: "/estoque/dashboard",
//     icon: Boxes,
//   },
//   {
//     title: "Produtos",
//     url: "/estoque/produtos",
//     icon: Package,
//   },
//   {
//     title: "Movimentações",
//     url: "/estoque/movimentacoes",  
//     icon: List,
//   },
//   {
//     title: "Entrada",
//     url: "/estoque/entrada",
//     icon: ArrowDown,
//   },
//   {
//     title: "Saída",
//     url: "/estoque/saida",
//     icon: ArrowUp,
//   },
// ]
// === FIM MÓDULO DE ESTOQUE ===

// === MÓDULO DE CONFIGURAÇÕES (FORA DO ESCOPO ATUAL) ===
// const configItems = [
//   {
//     title: "Integrações",
//     url: "/cpq/integracoes",
//     icon: Plug,
//   },
// ]
// === FIM MÓDULO DE CONFIGURAÇÕES ===

export function AppSidebar() {
  const { user, logout } = useAuthStore()

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/cpq/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Calculator className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Sistema Pardis</span>
                  <span className="truncate text-xs">Módulo de Cotações</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* === MÓDULO PRINCIPAL (FORA DO ESCOPO ATUAL) ===
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        === FIM MÓDULO PRINCIPAL === */}
        
        <SidebarGroup>
          <SidebarGroupLabel>Cotações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cpqItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Módulo de Cadastros (ATIVO) */}
        <SidebarGroup>
          <SidebarGroupLabel>Cadastros</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cadastrosItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* === MÓDULO DE PRECIFICAÇÃO (FORA DO ESCOPO ATUAL) ===
        <SidebarGroup>
          <SidebarGroupLabel>Precificação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pricingItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        === FIM MÓDULO DE PRECIFICAÇÃO === */}

        {/* === MÓDULO DE ESTOQUE (FORA DO ESCOPO ATUAL) ===
        <SidebarGroup>
          <SidebarGroupLabel>Estoque</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {estoqueItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        === FIM MÓDULO DE ESTOQUE === */}

        {/* === MÓDULO DE CONFIGURAÇÕES (FORA DO ESCOPO ATUAL) ===
        <SidebarGroup>
          <SidebarGroupLabel>Configurações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Settings />
                  <span>Configurações</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {configItems.map((item) => (
                    <SidebarMenuSubItem key={item.title}>
                      <SidebarMenuSubButton asChild>
                        <NavLink to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        === FIM MÓDULO DE CONFIGURAÇÕES === */}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <User2 className="size-4" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name || 'Usuário'}</span>
                    <span className="truncate text-xs">{user?.email || 'user@example.com'}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={logout}>
                  <User2 className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
