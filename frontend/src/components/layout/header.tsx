'use client';

import { useState } from 'react';
import { Bell, Search, Moon, Sun, LogOut, Settings, User, Phone } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const statusOptions = [
  { value: 'ONLINE', label: 'Online', color: 'bg-green-500' },
  { value: 'BUSY', label: 'Ocupado', color: 'bg-yellow-500' },
  { value: 'AWAY', label: 'Ausente', color: 'bg-orange-500' },
  { value: 'OFFLINE', label: 'Offline', color: 'bg-gray-400' },
];

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, logout, updateStatus } = useAuthStore();
  const router = useRouter();

  const currentStatus = statusOptions.find(s => s.value === user?.status) || statusOptions[0];

  return (
    <header className="h-14 border-b bg-card px-4 flex items-center gap-4 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas, contatos..."
            className="pl-9 h-8 bg-muted/50 border-0 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Discador rápido */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden md:flex gap-1.5"
          onClick={() => router.push('/telefonia')}
        >
          <Phone className="w-4 h-4" />
          <span className="text-xs">Discador</span>
        </Button>

        {/* Status selector */}
        <Select
          value={user?.status}
          onValueChange={(val) => updateStatus(val)}
        >
          <SelectTrigger className="h-8 w-auto gap-1.5 border-0 bg-transparent px-2 text-xs">
            <div className={cn('w-2 h-2 rounded-full shrink-0', currentStatus.color)} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', opt.color)} />
                  {opt.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 px-2">
              <Avatar className="w-7 h-7">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-xs">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:block max-w-[120px] truncate">
                {user?.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/perfil')}>
              <User className="w-4 h-4 mr-2" /> Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/configuracoes')}>
              <Settings className="w-4 h-4 mr-2" /> Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => { logout(); router.push('/login'); }}
            >
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
