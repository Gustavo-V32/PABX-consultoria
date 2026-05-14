import { ResourcePage } from '@/components/modules/resource-page';

export default function WhatsAppPage() {
  return (
    <ResourcePage
      title="WhatsApp"
      description="Cadastro de numeros WhatsApp Business conectados a Meta Cloud API."
      endpoint="/whatsapp/numbers"
      createLabel="Adicionar Numero"
      emptyTitle="Nenhum numero configurado"
      emptyDescription="Adicione um numero WhatsApp Business para receber e enviar mensagens."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Numero', path: 'phoneNumber' },
        { label: 'Phone Number ID', path: 'phoneNumberId' },
        { label: 'Status', path: 'status', type: 'badge' },
        { label: 'Qualidade', path: 'qualityRating' },
      ]}
      fields={[
        { name: 'name', label: 'Nome', required: true },
        { name: 'phoneNumber', label: 'Numero', required: true },
        { name: 'phoneNumberId', label: 'Phone Number ID', required: true },
        { name: 'wabaId', label: 'WABA ID', required: true },
        { name: 'accessToken', label: 'Access Token', type: 'password', required: true },
      ]}
    />
  );
}
