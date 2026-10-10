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
};
