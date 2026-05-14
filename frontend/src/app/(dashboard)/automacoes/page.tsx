import { ResourcePage } from '@/components/modules/resource-page';

export default function AutomacoesPage() {
  return (
    <ResourcePage
      title="Automacoes"
      description="Fluxos, regras e acoes automaticas por evento."
      endpoint="/automations"
      createLabel="Nova Automacao"
      emptyTitle="Nenhuma automacao ativa"
      emptyDescription="Crie automacoes para mensagens, filas, webhooks e variaveis."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Gatilho', path: 'trigger', type: 'badge' },
        { label: 'Execucoes', path: 'runCount' },
        { label: 'Ativa', path: 'isActive', type: 'boolean' },
      ]}
      fields={[
        { name: 'name', label: 'Nome', required: true },
        { name: 'description', label: 'Descricao', type: 'textarea' },
        {
          name: 'trigger',
          label: 'Gatilho',
          type: 'select',
          required: true,
          defaultValue: 'MESSAGE_RECEIVED',
          options: [
            { label: 'Mensagem recebida', value: 'MESSAGE_RECEIVED' },
            { label: 'Conversa aberta', value: 'CONVERSATION_OPENED' },
            { label: 'Conversa encerrada', value: 'CONVERSATION_CLOSED' },
            { label: 'Palavra-chave', value: 'KEYWORD_MATCH' },
            { label: 'Webhook', value: 'WEBHOOK' },
            { label: 'Contato criado', value: 'CONTACT_CREATED' },
            { label: 'Entrada na fila', value: 'QUEUE_JOIN' },
            { label: 'Timeout de espera', value: 'WAIT_TIMEOUT' },
          ],
        },
        { name: 'triggerConfig', label: 'Configuracao do gatilho JSON', type: 'json', defaultValue: {} },
        { name: 'conditions', label: 'Condicoes JSON', type: 'json', defaultValue: [] },
        {
          name: 'actions',
          label: 'Acoes JSON',
          type: 'json',
          required: true,
          defaultValue: [{ type: 'SEND_MESSAGE', config: { text: 'Ola, {{primeiro_nome}}' } }],
        },
        { name: 'isActive', label: 'Ativa', type: 'boolean', defaultValue: true },
      ]}
    />
  );
}
