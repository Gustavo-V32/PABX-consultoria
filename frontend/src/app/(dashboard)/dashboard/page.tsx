'use client';

import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare, Phone, Users, CheckCircle, Clock,
  TrendingUp, Activity, Wifi, FileText, UserPlus,
  PhoneMissed, PhoneCall, BarChart2, Headphones,
} from 'lucide-react';
import { api } from '@/lib/api';
import { StatCard } from '@/components/dashboard/stat-card';
import { ConversationsTrendChart } from '@/components/dashboard/conversations-trend-chart';
import { CallsTrendChart } from '@/components/dashboard/calls-trend-chart';
import { AgentPerformanceTable } from '@/components/dashboard/agent-performance-table';
import { QueueStatusCards } from '@/components/dashboard/queue-status-cards';
import { ChannelPieChart } from '@/components/dashboard/channel-pie-chart';
import { LiveAgentsPanel } from '@/components/dashboard/live-agents-panel';

export default function DashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => api.get('/dashboard/overview').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data: conversationsTrend } = useQuery({
    queryKey: ['dashboard', 'conversations-trend'],
    queryFn: () => api.get('/dashboard/conversations-trend?days=7').then(r => r.data.data),
    refetchInterval: 60000,
  });

  const { data: callsTrend } = useQuery({
    queryKey: ['dashboard', 'calls-trend'],
    queryFn: () => api.get('/dashboard/calls-trend?days=7').then(r => r.data.data),
    refetchInterval: 60000,
  });

  const { data: agentPerf } = useQuery({
    queryKey: ['dashboard', 'agents'],
    queryFn: () => api.get('/dashboard/agent-performance').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data: queueStats } = useQuery({
    queryKey: ['dashboard', 'queues'],
    queryFn: () => api.get('/dashboard/queue-stats').then(r => r.data.data),
    refetchInterval: 15000,
  });

  const stats = overview;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Visão geral do atendimento em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Atualizado em tempo real
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <StatCard
          title="Em Aberto"
          value={stats?.conversations?.open ?? '—'}
          icon={MessageSquare}
          color="blue"
          loading={isLoading}
          className="col-span-2"
        />
        <StatCard
          title="Aguardando"
          value={stats?.conversations?.waiting ?? '—'}
          icon={Clock}
          color="yellow"
          loading={isLoading}
          className="col-span-2"
          trend={stats?.conversations?.waiting > 5 ? 'up' : undefined}
        />
        <StatCard
          title="Resolvidos Hoje"
          value={stats?.conversations?.resolvedToday ?? '—'}
          icon={CheckCircle}
          color="green"
          loading={isLoading}
          className="col-span-2"
        />
        <StatCard
          title="Mensagens Hoje"
          value={stats?.messages?.today ?? '—'}
          icon={TrendingUp}
          color="purple"
          loading={isLoading}
          className="col-span-2"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Agentes Online"
          value={`${stats?.agents?.online ?? 0}/${stats?.agents?.total ?? 0}`}
          icon={Users}
          color="green"
          loading={isLoading}
          small
        />
        <StatCard
          title="Números Ativos"
          value={stats?.whatsapp?.activeNumbers ?? '—'}
          icon={Wifi}
          color="whatsapp"
          loading={isLoading}
          small
        />
        <StatCard
          title="Templates Ativos"
          value={stats?.whatsapp?.activeTemplates ?? '—'}
          icon={FileText}
          color="purple"
          loading={isLoading}
          small
        />
        <StatCard
          title="Novos Contatos"
          value={stats?.contacts?.newToday ?? '—'}
          icon={UserPlus}
          color="blue"
          loading={isLoading}
          small
        />
        <StatCard
          title="Chamadas Hoje"
          value={stats?.calls?.today ?? '—'}
          icon={PhoneCall}
          color="green"
          loading={isLoading}
          small
        />
        <StatCard
          title="Chamadas Perdidas"
          value={stats?.calls?.missed ?? '—'}
          icon={PhoneMissed}
          color="red"
          loading={isLoading}
          small
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ConversationsTrendChart data={conversationsTrend || []} />
        </div>
        <div>
          <ChannelPieChart data={stats?.channels || []} loading={isLoading} />
        </div>
      </div>

      {/* Calls + Agents row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CallsTrendChart data={callsTrend || []} />
        <LiveAgentsPanel agents={agentPerf || []} />
      </div>

      {/* Queues + Agent Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <AgentPerformanceTable agents={agentPerf || []} />
        </div>
        <div className="lg:col-span-2">
          <QueueStatusCards queues={queueStats || []} />
        </div>
      </div>
    </div>
  );
}
