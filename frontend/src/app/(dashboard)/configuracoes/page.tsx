import { ResourcePage } from '@/components/modules/resource-page';

export default function ConfiguracoesPage() {
  return (
    <ResourcePage
      title="Configuracoes"
      description="Integracoes externas e parametros operacionais."
      endpoint="/integrations"
      createLabel="Nova Integracao"
      emptyTitle="Nenhuma integracao configurada"
      emptyDescription="Configure Google Drive, HTTP APIs, Meta, IXC, Telegram e outros conectores."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Tipo', path: 'type', type: 'badge' },
        { label: 'Ativa', path: 'isActive', type: 'boolean' },
        { label: 'Ultima sincronizacao', path: 'lastSyncAt' },
      ]}
      fields={[
        { name: 'name', label: 'Nome', required: true },
        {
          name: 'type',
          label: 'Tipo',
          type: 'select',
          required: true,
          defaultValue: 'HTTP',
          options: [
            { label: 'HTTP generico', value: 'HTTP' },
            { label: 'IXC Provedor', value: 'IXC' },
            { label: 'Telegram Bot', value: 'TELEGRAM' },
            { label: 'Webhook receptor', value: 'WEBHOOK' },
            { label: 'Google Drive', value: 'GOOGLE_DRIVE' },
            { label: 'WhatsApp/Meta', value: 'WHATSAPP' },
          ],
        },
        {
          name: 'config',
          label: 'Configuracao JSON',
          type: 'json',
          defaultValue: {
            baseUrl: '',
            headers: {},
            bearerToken: '',
            username: '',
            password: '',
            timeout: 10000,
          },
        },
        { name: 'isActive', label: 'Ativa', type: 'boolean', defaultValue: true },
      ]}
    />
  );
}
