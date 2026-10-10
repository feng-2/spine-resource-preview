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
};
