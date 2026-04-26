'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, MessageSquare, Phone, Users, BarChart3,
  Settings, Bot, FileText, Layers, Tag, Headphones, Building2,
  Wifi, ChevronLeft, ChevronRight, Zap, HardDrive, RadioTower, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/sidebar-store';
import { useAuthStore } from '@/store/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

type NavItemConfig = {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: string;
  roles?: string[];
};

type NavGroupConfig = {
  label: string;
  roles?: string[];
  items: NavItemConfig[];
};

const navGroups: NavGroupConfig[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/atendimento', icon: MessageSquare, label: 'Atendimento', badge: 'live' },
      { href: '/whatsapp', icon: Wifi, label: 'WhatsApp' },
      { href: '/telefonia', icon: Phone, label: 'Telefonia' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/contatos', icon: Users, label: 'Contatos' },
      { href: '/filas', icon: Layers, label: 'Filas' },
      { href: '/fluxos', icon: Zap, label: 'Fluxos' },
      { href: '/automacoes', icon: Bot, label: 'Automações' },
      { href: '/templates', icon: FileText, label: 'Templates' },
      { href: '/drive', icon: HardDrive, label: 'Google Drive' },
    ],
  },
  {
    label: 'Análise',
    items: [
      { href: '/relatorios', icon: BarChart3, label: 'Relatórios' },
    ],
  },
  {
    label: 'Configurações',
    roles: ['ADMIN', 'SUPERVISOR'],
    items: [
      { href: '/admin/usuarios', icon: Users, label: 'Usuários', roles: ['ADMIN', 'SUPERVISOR'] },
      { href: '/admin/setores', icon: Building2, label: 'Setores', roles: ['ADMIN'] },
      { href: '/admin/etiquetas', icon: Tag, label: 'Etiquetas', roles: ['ADMIN'] },
      { href: '/admin/numeros-digitais', icon: RadioTower, label: 'Números Digitais', roles: ['ADMIN'] },
      { href: '/admin/pabx', icon: Phone, label: 'PABX Admin', roles: ['ADMIN', 'TELEPHONY_OPERATOR'] },
      { href: '/configuracoes', icon: Settings, label: 'Configurações', roles: ['ADMIN'] },
    ],
  },
];

function NavItem({
  item,
  collapsed,
  active,
}: {
  item: NavItemConfig;
  collapsed: boolean;
  active: boolean;
}) {
  const link = (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        'hover:bg-accent hover:text-accent-foreground',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground',
        collapsed && 'justify-center px-2',
      )}
    >
      <item.icon className={cn('shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge === 'live' && (
        <Badge variant="default" className="ml-auto text-[10px] py-0 h-4 bg-green-500 hover:bg-green-500">
          AO VIVO
        </Badge>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarStore();
  const { user } = useAuthStore();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col h-screen border-r bg-card transition-all duration-200 ease-in-out shrink-0',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex items-center border-b h-14 px-4 shrink-0',
            collapsed ? 'justify-center' : 'gap-3',
          )}
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <Headphones className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-base truncate">OmniSuite</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          <div className="space-y-5 px-2">
            {navGroups.map((group) => {
              const visibleItems = group.items.filter((item) => {
                if (!item.roles) return true;
                return item.roles.includes(user?.role || '');
              });

              if (!visibleItems.length) return null;

              return (
                <div key={group.label}>
                  {!collapsed && (
                    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 mb-1">
                      {group.label}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => (
                      <NavItem
                        key={item.href}
                        item={item}
                        collapsed={collapsed}
                        active={
                          item.href === '/dashboard'
                            ? pathname === '/dashboard'
                            : pathname.startsWith(item.href)
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* User profile */}
        <div className="border-t p-3 shrink-0">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center cursor-pointer">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="text-xs">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{user?.name}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-xs">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate capitalize">
                  {user?.role?.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Collapse button */}
        <button
          onClick={toggle}
          className="absolute -right-3 top-20 w-6 h-6 bg-card border rounded-full flex items-center justify-center hover:bg-accent transition-colors z-10"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </aside>
    </TooltipProvider>
  );
}
