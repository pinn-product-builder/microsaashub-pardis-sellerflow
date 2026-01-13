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
  Upload,
  Shield,
  UserCog,
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
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { PermissionGate } from "@/components/auth/PermissionGate"

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
    title: "Importação CSV",
    url: "/cpq/importacao",
    icon: Upload,
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

// Módulo de Administração
const adminItems = [
  {
    title: "Usuários",
    url: "/admin/usuarios",
    icon: UserCog,
  },
  {
    title: "Grupos",
    url: "/admin/grupos",
    icon: Shield,
  },
]

export function AppSidebar() {
  const navigate = useNavigate()
  const { profile, user, logout, role, isLoading } = useAuth()

  const displayName = profile?.full_name || user?.email || (isLoading ? 'Carregando...' : 'Usuário')
  const displayEmail = user?.email || (isLoading ? '' : 'Sem email')

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

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

        {/* Módulo de Administração - Apenas para admins */}
        <PermissionGate permission="users.manage">
          <SidebarGroup>
            <SidebarGroupLabel>Gestão de Usuários</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
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
        </PermissionGate>
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
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs">{displayEmail}</span>
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
                <DropdownMenuItem onClick={handleLogout}>
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
