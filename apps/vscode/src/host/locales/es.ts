import type { en } from './en.js';

/** 西班牙语宿主原生界面文案。 */
export const es: { [Key in keyof typeof en]: string } = {
  panelTitle: 'Vista previa de recursos Spine',
  scanTitle: 'Buscar recursos Spine',
  scanStarting: 'Buscando en {target}…',
  filesIndexed: '{count} archivos indexados',
  cancelled: 'Búsqueda cancelada. Actualiza para intentarlo de nuevo.',
  scanFailed: 'Error de búsqueda: {reason}',
  preparing: 'Preparando la vista previa…',
  initial:
    'Haz clic derecho en un archivo o carpeta de recursos, o elige recursos locales.',
  localUriOnly: 'Elige archivos locales o URI de archivos remotos de VS Code.',
  sameFilesystem:
    'Los archivos de una importación deben pertenecer al mismo sistema de archivos.',
  selectedFiles: '{count} archivos y carpetas',
  chooseFiles: 'Importar recursos Spine',
  resourceFilter: 'Recursos Spine',
  chooseFolder: 'Importar carpeta de recursos',
  error: 'Vista previa de recursos Spine: {reason}',
};
