import { ResourcePage } from '@/components/modules/resource-page';

export default function FluxosPage() {
  return (
    <ResourcePage
      title="Fluxos de Comunicacao"
      description="Fluxos para mensagens, condicoes, menus, webhooks e transferencias."
      endpoint="/flows"
      createLabel="Novo Fluxo"
      emptyTitle="Nenhum fluxo cadastrado"
      emptyDescription="Crie fluxos para automatizar triagem, captura de dados e transferencias."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Canal', path: 'channel', type: 'badge' },
        { label: 'Status', path: 'status', type: 'badge' },
        { label: 'Versao', path: 'version' },
        { label: 'Blocos', path: '_count.nodes' },
      ]}
      fields={[
        { name: 'name', label: 'Nome', required: true },
        { name: 'description', label: 'Descricao', type: 'textarea' },
        {
          name: 'channel',
          label: 'Canal',
          type: 'select',
          defaultValue: 'WHATSAPP',
          options: [
            { label: 'WhatsApp', value: 'WHATSAPP' },
            { label: 'Telegram', value: 'TELEGRAM' },
            { label: 'Webchat', value: 'WEBCHAT' },
            { label: 'SMS', value: 'SMS' },
            { label: 'Email', value: 'EMAIL' },
            { label: 'Voz', value: 'VOICE' },
          ],
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          defaultValue: 'DRAFT',
          options: [
            { label: 'Rascunho', value: 'DRAFT' },
            { label: 'Ativo', value: 'ACTIVE' },
            { label: 'Inativo', value: 'INACTIVE' },
          ],
        },
        { name: 'version', label: 'Versao', type: 'number', defaultValue: 1 },
        { name: 'nodes', label: 'Blocos JSON', type: 'json', defaultValue: [] },
        { name: 'connections', label: 'Conexoes JSON', type: 'json', defaultValue: [] },
        { name: 'isActive', label: 'Ativo', type: 'boolean', defaultValue: true },
      ]}
    />
  );
}
