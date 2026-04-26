import { ResourcePage } from '@/components/modules/resource-page';

export default function ContatosPage() {
  return (
    <ResourcePage
      title="Contatos"
      description="Base de clientes e histórico de relacionamento."
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
    />
  );
}
