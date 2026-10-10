import type { en } from './en.js';

/** 巴西葡萄牙语宿主原生界面文案。 */
export const ptBR: { [Key in keyof typeof en]: string } = {
  panelTitle: 'Prévia de recursos Spine',
  scanTitle: 'Buscar recursos Spine',
  scanStarting: 'Buscando em {target}…',
  filesIndexed: '{count} arquivos indexados',
  cancelled: 'Busca cancelada. Atualize para tentar novamente.',
  scanFailed: 'Falha na busca: {reason}',
  preparing: 'Preparando a prévia…',
  initial:
    'Clique com o botão direito em um arquivo ou pasta de recursos, ou escolha recursos locais.',
  localUriOnly: 'Escolha arquivos locais ou URIs de arquivos remotos do VS Code.',
  sameFilesystem:
    'Os arquivos de uma importação devem pertencer ao mesmo sistema de arquivos.',
  selectedFiles: '{count} arquivos e pastas',
  chooseFiles: 'Importar recursos Spine',
  resourceFilter: 'Recursos Spine',
  chooseFolder: 'Importar pasta de recursos',
  error: 'Prévia de recursos Spine: {reason}',
  resourcesTitle: 'Recursos',
  animationsTitle: 'Animações',
  refreshTitle: 'Atualizar recursos',
  workspaceTitle: 'Voltar ao espaço de trabalho',
  treeScanning: 'Buscando recursos…',
  treeEmpty:
    'Nenhum recurso Spine encontrado. Clique com o botão direito em uma pasta para visualizar seus recursos.',
  animationsSelect: 'Selecione um recurso para ver suas animações.',
  animationsEmpty: 'Este recurso não contém animações.',
  diagnosticsTitle: 'Diagnósticos de recursos',
  resourceCount: '{count} recursos',
  resourceDiagnostic: 'Diagnóstico do recurso: {code}',
  diagnosticAtlasMissing: 'O atlas correspondente está ausente.',
  diagnosticPageMissing: 'Uma imagem de página referenciada pelo atlas está ausente.',
  diagnosticDependencyAmbiguous:
    'Vários arquivos correspondem a uma dependência. Importe uma pasta preservando sua estrutura.',
  diagnosticBinary37Unsupported:
    'O formato binário do Spine 3.7 não é compatível. Use uma exportação JSON 3.7.',
  diagnosticVersionPrerelease:
    'Este recurso foi exportado com uma versão beta. O runtime correspondente validará os dados.',
  diagnosticPreferredAmbiguous:
    'O arquivo selecionado pertence a vários esqueletos. Selecione um recurso na lista.',
  diagnosticPreferredUnassociated:
    'O arquivo selecionado não está associado a um recurso Spine completo.',
};
