import { ResourcePage } from '@/components/modules/resource-page';

export default function ContatosPage() {
  return (
    <ResourcePage
      title="Contatos"
      description="Base de clientes e historico de relacionamento."
      endpoint="/contacts"
      createLabel="Novo Contato"
      emptyTitle="Nenhum contato cadastrado"
      emptyDescription="Importe ou cadastre contatos para iniciar atendimentos."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Telefone', path: 'phone' },
        { label: 'Email', path: 'email' },
        { label: 'Bloqueado', path: 'isBlocked', type: 'boolean' },
      ]}
      fields={[
        { name: 'name', label: 'Nome', required: true },
        { name: 'phone', label: 'Telefone' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'document', label: 'CPF/CNPJ' },
        { name: 'company', label: 'Empresa' },
        { name: 'leadSource', label: 'Origem' },
        { name: 'notes', label: 'Observacoes', type: 'textarea' },
        { name: 'isBlocked', label: 'Bloqueado', type: 'boolean', defaultValue: false },
      ]}
    />
  );
}
