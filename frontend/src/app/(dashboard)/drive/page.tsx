import { ResourcePage } from '@/components/modules/resource-page';

export default function DrivePage() {
  return (
    <ResourcePage
      title="Google Drive"
      description="Arquivos vinculados a clientes, atendimentos e anexos operacionais."
      endpoint="/drive/files"
      createLabel="Registrar Arquivo"
      emptyTitle="Nenhum arquivo vinculado"
      emptyDescription="Conecte o Google Drive e vincule arquivos aos contatos e atendimentos."
      columns={[
        { label: 'Nome', path: 'name' },
        { label: 'Tipo', path: 'mimeType', type: 'badge' },
        { label: 'Cliente', path: 'contact.name' },
        { label: 'Pasta', path: 'folderPath' },
        { label: 'Link', path: 'webViewLink' },
      ]}
    />
  );
}
