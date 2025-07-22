
import {
  ChevronUp,
  Home,
  Calculator,
  FileText,
  History,
  BarChart3,
  DollarSign,
  Table,
  CheckCircle,
  Zap,
  TrendingUp,
  User2,
  Settings,
  Plus,
  Activity,
  Plug,
  Search,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NavLink } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"

// Menu principal
const mainItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
]

// Módulo de Cotações (removido Integrações)
const cpqItems = [
  {
    title: "Painel Cotação",
    url: "/cpq",
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
]

// Módulo de Precificação (adicionada Pesquisa de Mercado)
const pricingItems = [
  {
    title: "Painel Precificação",
    url: "/pricing/dashboard",
    icon: BarChart3,
  },
  {
    title: "Tabelas de Preço",
    url: "/pricing/tables",
    icon: Table,
  },
  {
    title: "Aprovações",
    url: "/pricing/approvals",
    icon: CheckCircle,
  },
  {
    title: "Regras",
    url: "/pricing/rules",
    icon: Zap,
  },
  {
    title: "Analytics",
    url: "/pricing/analytics",
    icon: TrendingUp,
  },
  {
    title: "Pesquisa de Mercado",
    url: "/pricing/market-research",
    icon: Search,
  },
]

// Módulo de Configurações
const configItems = [
  {
    title: "Integrações",
    url: "/cpq/integracoes",
    icon: Plug,
  },
  {
    title: "Sistema",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const { user, logout } = useAuthStore()

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Calculator className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Sistema Pardis</span>
                  <span className="truncate text-xs">Cotações & Precificação</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
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
                    <span className="truncate font-semibold">{user?.name}</span>
                    <span className="truncate text-xs">{user?.email}</span>
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
