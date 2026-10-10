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
  resourcesTitle: 'Recursos',
  animationsTitle: 'Animaciones',
  refreshTitle: 'Actualizar recursos',
  workspaceTitle: 'Volver al espacio de trabajo',
  treeScanning: 'Buscando recursos…',
  treeEmpty:
    'No se encontraron recursos Spine. Haga clic derecho en una carpeta para ver sus recursos.',
  animationsSelect: 'Seleccione un recurso para ver sus animaciones.',
  animationsEmpty: 'Este recurso no contiene animaciones.',
  diagnosticsTitle: 'Diagnósticos de recursos',
  resourceCount: '{count} recursos',
  resourceDiagnostic: 'Diagnóstico del recurso: {code}',
  diagnosticAtlasMissing: 'Falta el atlas correspondiente.',
  diagnosticPageMissing: 'Falta una imagen de página del atlas.',
  diagnosticDependencyAmbiguous:
    'Varios archivos coinciden con una dependencia. Importe una carpeta conservando su estructura.',
  diagnosticBinary37Unsupported:
    'El formato binario de Spine 3.7 no está admitido. Use una exportación JSON 3.7.',
  diagnosticVersionPrerelease:
    'Este recurso se exportó con una versión beta. El runtime correspondiente validará los datos.',
  diagnosticPreferredAmbiguous:
    'El archivo seleccionado pertenece a varios esqueletos. Seleccione un recurso de la lista.',
  diagnosticPreferredUnassociated:
    'El archivo seleccionado no está asociado con un recurso Spine completo.',
};
