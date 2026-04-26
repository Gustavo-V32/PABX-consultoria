'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Phone, PhoneCall, PhoneMissed, PhoneOff, Clock,
  Mic, MicOff, PhoneIncoming, Volume2, VolumeX,
  Users, Plus, Settings, Activity, Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDuration, formatPhone, formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

const CALL_STATUS_STYLES: Record<string, { label: string; color: string; icon: any }> = {
  RINGING: { label: 'Chamando', color: 'text-yellow-500', icon: PhoneIncoming },
  IN_PROGRESS: { label: 'Em andamento', color: 'text-green-500', icon: PhoneCall },
  ON_HOLD: { label: 'Em espera', color: 'text-orange-500', icon: Clock },
  COMPLETED: { label: 'Finalizada', color: 'text-muted-foreground', icon: Phone },
  MISSED: { label: 'Perdida', color: 'text-red-500', icon: PhoneMissed },
};

function DialPad({ onDial }: { onDial: (number: string) => void }) {
  const [digits, setDigits] = useState('');

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ];

  const handleKey = (k: string) => setDigits(d => d + k);
  const handleDelete = () => setDigits(d => d.slice(0, -1));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Discador
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          value={digits}
          onChange={e => setDigits(e.target.value)}
          placeholder="Digite o número..."
          className="text-center text-lg font-mono tracking-widest h-12"
        />

        <div className="grid grid-cols-3 gap-2">
          {keys.flat().map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className="keypad-btn border rounded-xl hover:bg-muted transition-colors h-12"
            >
              <span className="text-lg font-medium">{key}</span>
              {key === '2' && <span className="text-[9px] text-muted-foreground">ABC</span>}
              {key === '3' && <span className="text-[9px] text-muted-foreground">DEF</span>}
              {key === '4' && <span className="text-[9px] text-muted-foreground">GHI</span>}
              {key === '5' && <span className="text-[9px] text-muted-foreground">JKL</span>}
              {key === '6' && <span className="text-[9px] text-muted-foreground">MNO</span>}
              {key === '7' && <span className="text-[9px] text-muted-foreground">PQRS</span>}
              {key === '8' && <span className="text-[9px] text-muted-foreground">TUV</span>}
              {key === '9' && <span className="text-[9px] text-muted-foreground">WXYZ</span>}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
            disabled={!digits}
            onClick={() => {
              if (digits) {
                onDial(digits);
                setDigits('');
              }
            }}
          >
            <Phone className="w-4 h-4 mr-2" />
            Ligar
          </Button>
          <Button variant="outline" className="w-10 p-0" onClick={handleDelete}>
            ⌫
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveCallCard({ call }: { call: any }) {
  const [muted, setMuted] = useState(false);
  const [onHold, setOnHold] = useState(false);
  const st = CALL_STATUS_STYLES[call.status] || CALL_STATUS_STYLES.RINGING;

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <st.icon className={cn('w-5 h-5', st.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {call.callerIdName || call.callerIdNum || 'Desconhecido'}
            </p>
            <p className="text-xs text-muted-foreground">{call.callerIdNum}</p>
          </div>
          <Badge variant="outline" className={cn('text-xs', st.color)}>
            {st.label}
          </Badge>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button
            variant={muted ? 'destructive' : 'outline'}
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => setMuted(!muted)}
          >
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>

          <Button
            variant={onHold ? 'secondary' : 'outline'}
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => setOnHold(!onHold)}
          >
            <Clock className="w-4 h-4" />
          </Button>

          <Button
            className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600"
            onClick={() => api.post(`/telephony/hangup/${encodeURIComponent(call.channel)}`)}
          >
            <PhoneOff className="w-5 h-5" />
          </Button>

          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
            <Volume2 className="w-4 h-4" />
          </Button>

          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
            <Users className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TelefoniaPage() {
  const { data: activeCalls = [] } = useQuery({
    queryKey: ['telephony', 'active'],
    queryFn: () => api.get('/telephony/active-calls').then(r => r.data.data || []),
    refetchInterval: 5000,
  });

  const { data: callHistory = [] } = useQuery({
    queryKey: ['telephony', 'history'],
    queryFn: () => api.get('/telephony/calls?limit=50').then(r => r.data.data || []),
    refetchInterval: 30000,
  });

  const { data: extensions = [] } = useQuery({
    queryKey: ['telephony', 'extensions'],
    queryFn: () => api.get('/telephony/extensions').then(r => r.data.data || []),
  });

  const { data: telephonyStatus } = useQuery({
    queryKey: ['telephony', 'status'],
    queryFn: () => api.get('/telephony/status').then(r => r.data.data),
    refetchInterval: 10000,
  });

  const dialMutation = useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) =>
      api.post('/telephony/originate', { from, to }),
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Telefonia PABX</h1>
          <p className="text-muted-foreground text-sm">
            Gerenciamento de chamadas e ramais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center gap-1.5 text-xs px-3 py-1 rounded-full',
            telephonyStatus?.connected
              ? 'bg-green-500/10 text-green-500'
              : 'bg-red-500/10 text-red-500',
          )}>
            <div className={cn(
              'w-1.5 h-1.5 rounded-full',
              telephonyStatus?.connected ? 'bg-green-500' : 'bg-red-500',
            )} />
            {telephonyStatus?.connected ? 'Asterisk Conectado' : 'Asterisk Offline'}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Chamadas Ativas', value: activeCalls.filter((c: any) => c.status === 'IN_PROGRESS').length, color: 'text-green-500', icon: PhoneCall },
          { label: 'Chamadas Tocando', value: activeCalls.filter((c: any) => c.status === 'RINGING').length, color: 'text-yellow-500', icon: PhoneIncoming },
          { label: 'Em Espera', value: activeCalls.filter((c: any) => c.status === 'ON_HOLD').length, color: 'text-orange-500', icon: Clock },
          { label: 'Ramais Online', value: extensions.filter((e: any) => e.user?.status === 'ONLINE').length, color: 'text-blue-500', icon: Users },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2 rounded-lg bg-current/10', stat.color)}>
                <stat.icon className={cn('w-4 h-4', stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Dialpad + Active calls */}
        <div className="space-y-4">
          <DialPad onDial={(number) => dialMutation.mutate({ from: '1000', to: number })} />

          {activeCalls.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Chamadas Ativas ({activeCalls.length})</h3>
              {activeCalls.map((call: any) => (
                <ActiveCallCard key={call.id} call={call} />
              ))}
            </div>
          )}
        </div>

        {/* Right: Tabs with history, extensions */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="history">
            <TabsList className="w-full">
              <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
              <TabsTrigger value="extensions" className="flex-1">Ramais</TabsTrigger>
              <TabsTrigger value="queues" className="flex-1">Filas</TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="mt-3">
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <div className="divide-y">
                      {callHistory.map((call: any) => {
                        const st = CALL_STATUS_STYLES[call.status];
                        const StatusIcon = st?.icon || Phone;
                        return (
                          <div key={call.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                            <div className={cn('p-2 rounded-full', call.status === 'MISSED' ? 'bg-red-500/10' : 'bg-green-500/10')}>
                              <StatusIcon className={cn('w-3.5 h-3.5', st?.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {call.callerIdName || call.callerIdNum || call.destinationNum}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {call.direction === 'INBOUND' ? 'Entrada' : 'Saída'} ·{' '}
                                {formatRelativeTime(call.startTime)}
                              </p>
                            </div>
                            {call.duration && (
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(call.duration)}
                              </span>
                            )}
                            <Badge variant="outline" className={cn('text-xs', st?.color)}>
                              {st?.label}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="extensions" className="mt-3">
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <div className="divide-y">
                      {extensions.map((ext: any) => (
                        <div key={ext.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">{ext.number}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{ext.name} <span className="text-muted-foreground">({ext.number})</span></p>
                            {ext.user && <p className="text-xs text-muted-foreground">{ext.user.name}</p>}
                          </div>
                          <div className={cn(
                            'flex items-center gap-1 text-xs',
                            ext.user?.status === 'ONLINE' ? 'text-green-500' : 'text-muted-foreground',
                          )}>
                            <div className={cn('w-1.5 h-1.5 rounded-full', ext.user?.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-400')} />
                            {ext.user?.status === 'ONLINE' ? 'Online' : 'Offline'}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-50"
                            onClick={() => dialMutation.mutate({ from: '2100', to: ext.number })}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="queues" className="mt-3">
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground text-center">
                  Status das filas Asterisk em tempo real
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
