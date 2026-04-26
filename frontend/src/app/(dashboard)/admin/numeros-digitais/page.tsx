import { ResourcePage } from '@/components/modules/resource-page';

export default function NumerosDigitaisPage() {
  return (
    <ResourcePage
      title="Números Digitais"
      description="Cadastro técnico de números SIP, portas, codecs e status de registro."
      endpoint="/digital-numbers"
      createLabel="Novo Número"
      emptyTitle="Nenhum número digital cadastrado"
      emptyDescription="Cadastre números SIP para rotas de entrada e saída do PABX."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Operadora', path: 'operator' },
        { label: 'Servidor SIP', path: 'sipServer' },
        { label: 'Domínio', path: 'domain' },
        { label: 'Status', path: 'status', type: 'badge' },
      ]}
    />
  );
}
