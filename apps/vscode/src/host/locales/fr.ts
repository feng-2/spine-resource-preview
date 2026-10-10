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
  resourcesTitle: 'Ressources',
  animationsTitle: 'Animations',
  refreshTitle: 'Actualiser les ressources',
  workspaceTitle: 'Revenir à l’espace de travail',
  treeScanning: 'Recherche des ressources…',
  treeEmpty:
    'Aucune ressource Spine trouvée. Faites un clic droit sur un dossier pour afficher ses ressources.',
  animationsSelect: 'Sélectionnez une ressource pour voir ses animations.',
  animationsEmpty: 'Cette ressource ne contient aucune animation.',
  diagnosticsTitle: 'Diagnostics des ressources',
  resourceCount: '{count} ressources',
  resourceDiagnostic: 'Diagnostic de la ressource : {code}',
  diagnosticAtlasMissing: 'L’atlas correspondant est manquant.',
  diagnosticPageMissing: 'Une image de page référencée par l’atlas est manquante.',
  diagnosticDependencyAmbiguous:
    'Plusieurs fichiers correspondent à une dépendance. Importez un dossier en conservant sa structure.',
  diagnosticBinary37Unsupported:
    'Le format binaire de Spine 3.7 n’est pas pris en charge. Utilisez un export JSON 3.7.',
  diagnosticVersionPrerelease:
    'Cette ressource a été exportée avec une version bêta. Le runtime correspondant validera les données.',
  diagnosticPreferredAmbiguous:
    'Le fichier sélectionné appartient à plusieurs squelettes. Sélectionnez une ressource dans la liste.',
  diagnosticPreferredUnassociated:
    'Le fichier sélectionné n’est associé à aucune ressource Spine complète.',
};
