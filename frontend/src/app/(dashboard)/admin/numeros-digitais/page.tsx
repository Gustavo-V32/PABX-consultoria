import { ResourcePage } from '@/components/modules/resource-page';

export default function NumerosDigitaisPage() {
  return (
    <ResourcePage
      title="Numeros Digitais"
      description="Cadastro tecnico de numeros SIP, portas, codecs e status de registro."
      endpoint="/digital-numbers"
      createLabel="Novo Numero"
      emptyTitle="Nenhum numero digital cadastrado"
      emptyDescription="Cadastre numeros SIP para rotas de entrada e saida do PABX."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Operadora', path: 'operator' },
        { label: 'Servidor SIP', path: 'sipServer' },
        { label: 'Dominio', path: 'domain' },
        { label: 'Status da conexao', path: 'status', type: 'connection-status' },
      ]}
      fields={[
        { name: 'name', label: 'Nome', required: true },
        { name: 'operator', label: 'Operadora' },
        { name: 'sipServer', label: 'Servidor SIP' },
        { name: 'username', label: 'Usuario SIP' },
        { name: 'secret', label: 'Senha SIP', type: 'password' },
        { name: 'domain', label: 'Dominio' },
        { name: 'ip', label: 'IP permitido' },
        { name: 'sipPort', label: 'Porta SIP', type: 'number', defaultValue: 5060 },
        { name: 'tlsPort', label: 'Porta TLS', type: 'number', defaultValue: 5061 },
        { name: 'amiPort', label: 'Porta AMI', type: 'number', defaultValue: 5038 },
        { name: 'rtpPortStart', label: 'RTP inicio', type: 'number', defaultValue: 10000 },
        { name: 'rtpPortEnd', label: 'RTP fim', type: 'number', defaultValue: 10200 },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          defaultValue: 'UNREGISTERED',
          options: [
            { label: 'Registrado', value: 'REGISTERED' },
            { label: 'Nao registrado', value: 'UNREGISTERED' },
            { label: 'Inalcancavel', value: 'UNREACHABLE' },
            { label: 'Teste', value: 'TESTING' },
            { label: 'Desabilitado', value: 'DISABLED' },
          ],
        },
        { name: 'notes', label: 'Observacoes', type: 'textarea' },
      ]}
    />
  );
}
