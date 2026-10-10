import type { en } from './en.js';

/** 德语宿主原生界面文案。 */
export const de: { [Key in keyof typeof en]: string } = {
  panelTitle: 'Spine-Ressourcenvorschau',
  scanTitle: 'Spine-Ressourcen suchen',
  scanStarting: '{target} wird durchsucht…',
  filesIndexed: '{count} Dateien erfasst',
  cancelled: 'Suche abgebrochen. Aktualisiere, um es erneut zu versuchen.',
  scanFailed: 'Suche fehlgeschlagen: {reason}',
  preparing: 'Vorschau wird vorbereitet…',
  initial:
    'Klicke mit der rechten Maustaste auf eine Ressourcendatei oder einen Ordner oder wähle lokale Ressourcen.',
  localUriOnly: 'Wähle lokale Ressourcendateien oder VS Code-Remote-Datei-URIs.',
  sameFilesystem: 'Die Dateien eines Imports müssen zum selben Dateisystem gehören.',
  selectedFiles: '{count} Dateien und Ordner',
  chooseFiles: 'Spine-Ressourcen importieren',
  resourceFilter: 'Spine-Ressourcen',
  chooseFolder: 'Ressourcenordner importieren',
  error: 'Spine-Ressourcenvorschau: {reason}',
  resourcesTitle: 'Ressourcen',
  animationsTitle: 'Animationen',
  refreshTitle: 'Ressourcen aktualisieren',
  workspaceTitle: 'Zum Arbeitsbereich zurückkehren',
  treeScanning: 'Ressourcen werden gesucht…',
  treeEmpty:
    'Keine Spine-Ressourcen gefunden. Klicken Sie mit der rechten Maustaste auf einen Ordner, um Ressourcen anzuzeigen.',
  animationsSelect: 'Wählen Sie eine Ressource, um ihre Animationen anzuzeigen.',
  animationsEmpty: 'Diese Ressource enthält keine Animationen.',
  diagnosticsTitle: 'Ressourcendiagnosen',
  resourceCount: '{count} Ressourcen',
  resourceDiagnostic: 'Ressourcendiagnose: {code}',
  diagnosticAtlasMissing: 'Der passende Atlas fehlt.',
  diagnosticPageMissing: 'Ein vom Atlas referenziertes Seitenbild fehlt.',
  diagnosticDependencyAmbiguous:
    'Mehrere Dateien passen zu einer Abhängigkeit. Importieren Sie einen Ordner mit unveränderter Verzeichnisstruktur.',
  diagnosticBinary37Unsupported:
    'Spine-3.7-Binärdateien werden nicht unterstützt. Verwenden Sie einen 3.7-JSON-Export.',
  diagnosticVersionPrerelease:
    'Diese Ressource wurde mit einer Betaversion exportiert. Die passende Laufzeit prüft die Daten.',
  diagnosticPreferredAmbiguous:
    'Die ausgewählte Datei gehört zu mehreren Skeletten. Wählen Sie eine Ressource aus der Liste.',
  diagnosticPreferredUnassociated:
    'Die ausgewählte Datei gehört zu keiner vollständigen Spine-Ressource.',
};
