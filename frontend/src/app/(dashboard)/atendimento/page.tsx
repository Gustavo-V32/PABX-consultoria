'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, MessageSquare, Clock, CheckCircle,
  Phone, MoreVertical, Send, Paperclip, Smile, X,
  UserPlus, Tag, ArrowRight, RefreshCw, ChevronDown,
  Wifi, User, Building2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatRelativeTime, formatPhone, truncate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useSocketStore } from '@/store/socket-store';
import { useAuthStore } from '@/store/auth-store';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  WAITING: { label: 'Aguardando', color: 'bg-yellow-500' },
  IN_PROGRESS: { label: 'Em atendimento', color: 'bg-blue-500' },
  PENDING: { label: 'Pendente', color: 'bg-orange-500' },
  RESOLVED: { label: 'Resolvido', color: 'bg-green-500' },
  CLOSED: { label: 'Encerrado', color: 'bg-gray-400' },
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  WHATSAPP: <Wifi className="w-3 h-3 text-[#25D366]" />,
  INTERNAL_CHAT: <MessageSquare className="w-3 h-3 text-blue-500" />,
  VOICE: <Phone className="w-3 h-3 text-purple-500" />,
};

export default function AtendimentoPage() {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('IN_PROGRESS,WAITING');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { socket, joinConversation, leaveConversation } = useSocketStore();

  const { data: convsData, isLoading: convsLoading } = useQuery({
    queryKey: ['conversations', statusFilter, searchQuery],
    queryFn: () =>
      api
        .get('/conversations', {
          params: {
            status: statusFilter,
            search: searchQuery || undefined,
            limit: 50,
          },
        })
        .then(r => r.data.data),
    refetchInterval: 15000,
  });

  const { data: messagesData } = useQuery({
    queryKey: ['messages', selectedConvId],
    queryFn: () =>
      selectedConvId
        ? api.get(`/messages/conversation/${selectedConvId}?limit=100`).then(r => r.data.data)
        : null,
    enabled: !!selectedConvId,
    refetchInterval: 5000,
  });

  const selectedConv = convsData?.find((c: any) => c.id === selectedConvId);
  const messages = messagesData?.data || [];

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/messages/conversation/${selectedConvId}`, { content }),
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['messages', selectedConvId] });
    },
  });

  const resolveConvMutation = useMutation({
    mutationFn: (id: string) => api.post(`/conversations/${id}/resolve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConvId(null);
    },
  });

  const closeConvMutation = useMutation({
    mutationFn: (id: string) => api.post(`/conversations/${id}/close`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConvId(null);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket || !selectedConvId) return;
    joinConversation(selectedConvId);

    const handleNewMessage = (data: any) => {
      if (data.conversation?.id === selectedConvId) {
        qc.invalidateQueries({ queryKey: ['messages', selectedConvId] });
        qc.invalidateQueries({ queryKey: ['conversations'] });
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:sent', handleNewMessage);

    return () => {
      leaveConversation(selectedConvId);
      socket.off('message:new', handleNewMessage);
      socket.off('message:sent', handleNewMessage);
    };
  }, [socket, selectedConvId, qc, joinConversation, leaveConversation]);

  const handleSend = () => {
    if (!message.trim() || !selectedConvId) return;
    sendMessageMutation.mutate(message.trim());
  };

  const conversations = convsData || [];

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-80 shrink-0 border-r flex flex-col">
        {/* Header */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Atendimento</h2>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-8 h-7 text-xs"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WAITING,IN_PROGRESS">Todos ativos</SelectItem>
              <SelectItem value="WAITING">Aguardando</SelectItem>
              <SelectItem value="IN_PROGRESS">Em atendimento</SelectItem>
              <SelectItem value="RESOLVED">Resolvidos</SelectItem>
              <SelectItem value="CLOSED">Encerrados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          {convsLoading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Carregando...</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Nenhuma conversa</p>
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map((conv: any) => {
                const st = STATUS_LABELS[conv.status] || STATUS_LABELS.WAITING;
                const lastMsg = conv.messages?.[0];
                const isSelected = conv.id === selectedConvId;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={cn(
                      'w-full text-left px-3 py-3 hover:bg-muted/50 transition-colors',
                      isSelected && 'bg-muted',
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <Avatar className="w-9 h-9 shrink-0">
                        <AvatarImage src={conv.contact?.avatar} />
                        <AvatarFallback className="text-xs">
                          {conv.contact?.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="text-xs font-medium truncate">{conv.contact?.name}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {conv.lastMessageAt ? formatRelativeTime(conv.lastMessageAt) : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          {CHANNEL_ICONS[conv.channel]}
                          <p className="text-[11px] text-muted-foreground truncate">
                            {lastMsg
                              ? truncate(lastMsg.content || `[${lastMsg.type}]`, 35)
                              : 'Sem mensagens'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={cn('w-1.5 h-1.5 rounded-full', st.color)} />
                          <span className="text-[10px] text-muted-foreground">{st.label}</span>
                          {conv.queue && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {conv.queue.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat area */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="h-14 border-b px-4 flex items-center gap-3 shrink-0">
            <Avatar className="w-9 h-9">
              <AvatarImage src={selectedConv.contact?.avatar} />
              <AvatarFallback>{selectedConv.contact?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{selectedConv.contact?.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatPhone(selectedConv.contact?.phone || '')}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <UserPlus className="w-3 h-3" />
                Atribuir
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 text-green-600 border-green-600/30 hover:bg-green-50 dark:hover:bg-green-950"
                onClick={() => resolveConvMutation.mutate(selectedConv.id)}
                disabled={resolveConvMutation.isPending}
              >
                <CheckCircle className="w-3 h-3" />
                Resolver
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Tag className="w-4 h-4 mr-2" /> Adicionar etiqueta
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ArrowRight className="w-4 h-4 mr-2" /> Transferir
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => closeConvMutation.mutate(selectedConv.id)}
                  >
                    <X className="w-4 h-4 mr-2" /> Encerrar conversa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg: any) => {
                const isOut = msg.direction === 'OUTBOUND';
                return (
                  <div
                    key={msg.id}
                    className={cn('flex gap-2 message-animate', isOut && 'flex-row-reverse')}
                  >
                    {!isOut && (
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarFallback className="text-[10px]">
                          {selectedConv.contact?.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        'max-w-[70%] rounded-2xl px-3 py-2 text-sm',
                        isOut
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted rounded-tl-sm',
                      )}
                    >
                      {msg.type === 'IMAGE' && msg.mediaUrl ? (
                        <img src={msg.mediaUrl} className="rounded-lg max-w-full mb-1" alt="imagem" />
                      ) : null}
                      {msg.content && <p className="leading-relaxed">{msg.content}</p>}
                      <p className={cn('text-[10px] mt-0.5', isOut ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                        {msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        {isOut && (
                          <span className="ml-1">
                            {msg.status === 'READ' ? '✓✓' : msg.status === 'DELIVERED' ? '✓✓' : '✓'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message input */}
          <div className="border-t p-3 shrink-0">
            <div className="flex items-end gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                <Paperclip className="w-4 h-4" />
              </Button>
              <div className="flex-1 relative">
                <Input
                  placeholder="Digite sua mensagem..."
                  className="pr-10 min-h-[36px]"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                >
                  <Smile className="w-4 h-4" />
                </Button>
              </div>
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleSend}
                disabled={!message.trim() || sendMessageMutation.isPending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-medium">Selecione uma conversa</p>
            <p className="text-sm text-muted-foreground">
              Escolha uma conversa na lista para começar o atendimento
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
