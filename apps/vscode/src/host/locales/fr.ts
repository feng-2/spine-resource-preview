import type { en } from './en.js';

/** 法语宿主原生界面文案。 */
export const fr: { [Key in keyof typeof en]: string } = {
  panelTitle: 'Aperçu des ressources Spine',
  scanTitle: 'Recherche des ressources Spine',
  scanStarting: 'Recherche dans {target}…',
  filesIndexed: '{count} fichiers indexés',
  cancelled: 'Recherche annulée. Actualisez pour réessayer.',
  scanFailed: 'Échec de la recherche : {reason}',
  preparing: 'Préparation de l’aperçu…',
  initial:
    'Faites un clic droit sur un fichier ou dossier de ressources, ou choisissez des ressources locales.',
  localUriOnly: 'Choisissez des fichiers locaux ou des URI de fichiers distants VS Code.',
  sameFilesystem:
    'Les fichiers d’une même importation doivent appartenir au même système de fichiers.',
  selectedFiles: '{count} fichiers et dossiers',
  chooseFiles: 'Importer des ressources Spine',
  resourceFilter: 'Ressources Spine',
  chooseFolder: 'Importer un dossier de ressources',
  error: 'Aperçu des ressources Spine : {reason}',
};
