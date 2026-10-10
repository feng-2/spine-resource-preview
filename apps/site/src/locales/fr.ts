/** fr 宣传页完整语言包。 */
import type { SiteMessages } from './types.js';

export const fr: SiteMessages = {
  title: 'Spine Resource Preview — Vos ressources Spine prennent vie.',
  description:
    'Un visualiseur local d’animations Spine pour le Web et VS Code. Parcourez vos exports et jouez leurs animations avec les runtimes officiels adaptés à leur version.',
  skip: 'Aller au contenu',
  mainNavigation: 'Navigation principale',
  resourceNavigation: 'Ressources utiles',
  navFeatures: 'Fonctionnalités',
  navWorkflow: 'Mode d’emploi',
  navVersions: 'Compatibilité',
  navExtension: 'VS Code',
  getExtension: 'Obtenir l’extension VS Code',
  language: 'Langue du site',
  open: 'Ouvrir le visualiseur',
  source: 'Voir le code sur GitHub',
  eyebrow: 'VISUALISEUR LOCAL D’ANIMATIONS SPINE',
  headline: 'Vos ressources Spine.',
  headlineAccent: 'En mouvement.',
  intro:
    'D’un dossier d’exports à l’animation recherchée. Parcourez vos ressources, changez d’animation et vérifiez vos exports avec le runtime officiel adapté.',
  support: 'Spine 3.7 · 3.8 · 4.0 · 4.1 · 4.2 · 4.3',
  privacy: 'Traitement local. Aucun fichier envoyé.',
  platform: 'Pour le Web et VS Code',
  viewerLabel: 'LE VISUALISEUR',
  viewerFormat: 'Spine 4.2 · JSON · run',
  screenshotAlt:
    'Interface anglaise de Spine Resource Preview avec huit ressources importées, onze animations et l’animation run de Spineboy dans la zone de prévisualisation.',
  screenshotCaption:
    'L’application en action : vos ressources à gauche, l’animation au centre.',
  screenshotCredit: 'Illustrations officielles de Spineboy © Esoteric Software.',
  assetLicense: 'Licence des illustrations',
  forLabel: 'POUR VÉRIFIER VOS EXPORTS',
  audience: 'Artistes, animateurs et développeurs de jeux.',
  featuresEyebrow: 'MOINS DE PRÉPARATION. PLUS DE PRÉVISUALISATION.',
  featuresTitle: 'Tout le nécessaire\npour vérifier un export.',
  featuresIntro:
    'Un espace dédié à la vérification, entre l’export de l’animation et son intégration dans votre jeu.',
  runtimeTitle: 'Le bon runtime, automatiquement.',
  runtimeBody:
    'La version de l’export détermine le runtime officiel spine-ts utilisé. Les versions restent visibles ; les données non prises en charge donnent lieu à un diagnostic clair.',
  localTitle: 'Vos fichiers restent locaux.',
  localBody:
    'Sélectionnez des fichiers ou déposez un dossier dans l’application Web. Les ressources sont traitées sur votre appareil et les runtimes sont inclus dans l’application.',
  animationTitle: 'Trouvez l’animation recherchée.',
  animationBody:
    'Parcourez les animations, mettez en pause, relancez, bouclez et réglez la vitesse. Zoomez sur les détails ou ajustez le personnage à la zone de prévisualisation.',
  workflowEyebrow: 'DU DOSSIER À LA PREMIÈRE IMAGE',
  workflowTitle: 'Ouvrir. Choisir. Jouer.',
  workflowIntro:
    'Pas de scène de prévisualisation à créer. Préparez un export complet et commencez à l’explorer.',
  stepOne: 'Importer votre export',
  stepOneBody:
    'Sélectionnez un dossier, ou importez ensemble .json / .skel, .atlas et toutes les images des pages de l’atlas.',
  stepTwo: 'Choisir une ressource',
  stepTwoBody:
    'Parcourez les ressources complètes trouvées dans votre dossier. Les dépendances manquantes apparaissent dans les diagnostics.',
  stepThree: 'Voir l’animation',
  stepThreeBody:
    'Choisissez une animation pour la jouer. Vérifiez à taille réelle ou ajustez les ressources plus grandes à la zone de prévisualisation.',
  extensionLabel: 'L’EXTENSION VS CODE',
  extensionTitle: 'Prévisualisez à côté de votre projet.',
  extensionBody:
    'Ouvrez la barre latérale Spine pour découvrir les ressources de votre espace de travail. Choisissez ressources et animations dans les listes natives de VS Code, avec une prévisualisation séparée dans l’éditeur.',
  extensionStatus: 'Disponible sur Visual Studio Marketplace',
  extensionPending: 'Publication Marketplace non confirmée · Installation via VSIX',
  extensionLink: 'Guide d’utilisation et d’installation VSIX',
  extensionInstall: 'Installer dans VS Code',
  extensionMarketplace: 'Voir sur Marketplace',
  extensionRequirements: 'VS Code {version}+',
  extensionVersion: 'Version {version}',
  extensionIdLabel: 'IDENTIFIANT DE L’EXTENSION',
  extensionExplorer: 'UTILISER LA BARRE LATÉRALE SPINE',
  extensionFolderTitle: 'Votre espace de travail, exploré automatiquement.',
  extensionFolderBody:
    'Cliquez sur l’icône Spine de la barre d’activité pour analyser récursivement tous les dossiers ouverts. Ressources et animations s’affichent dans la barre latérale ; choisir une ressource ouvre sa prévisualisation.',
  extensionFileTitle: 'Ciblez un export. Revenez à tout le projet.',
  extensionFileBody:
    'Un clic droit sur un dossier ou un squelette restreint la liste. « Revenir à l’espace de travail » dans la barre d’outils Ressources rétablit tous les dossiers du projet.',
  extensionLiveTitle: 'Vos nouveaux exports, prêts à être vérifiés.',
  extensionLiveBody:
    'Les ajouts, modifications et suppressions mettent la liste à jour automatiquement. Les autres ressources n’interrompent pas la lecture. Si l’export sélectionné change, il est rechargé en conservant l’animation choisie lorsqu’elle existe encore.',
  extensionReturnTitle: 'Revenir à tout le projet',
  extensionReturnBody:
    'Après une sélection dans l’Explorateur, survolez l’en-tête Ressources et cliquez sur « Revenir à l’espace de travail ». La commande est aussi disponible dans la palette de commandes.',
  extensionPreviewAlt:
    'Spine Resource Preview dans VS Code, avec l’arborescence native des ressources et la liste des animations à gauche, et Spineboy jouant run dans l’éditeur à droite.',
  extensionPreviewCaption:
    'Ressources et animations dans la barre latérale native. La prévisualisation dans l’éditeur reste consacrée à la lecture.',
  extensionPlaybackTitle: 'Les mêmes commandes, dans votre éditeur.',
  extensionPlaybackBody:
    'Changez de ressource et d’animation, mettez en pause, relancez, bouclez et réglez la vitesse. Inspectez la zone de prévisualisation avec le zoom et le déplacement.',
  extensionWorkflowOne:
    'Ouvrez votre projet et cliquez sur l’icône Spine de la barre d’activité.',
  extensionWorkflowTwo:
    'Sélectionnez un export dans Ressources pour ouvrir sa prévisualisation.',
  extensionWorkflowThree: 'Cliquez sur une action dans Animations pour la jouer.',
  extensionOffline:
    'Runtimes inclus. Ressources locales. Aucun serveur de développement.',
  questionExtension: 'Comment l’utiliser dans VS Code ?',
  answerExtension:
    'Installez l’extension, ouvrez votre projet et cliquez sur Spine dans la barre d’activité. Choisissez une ressource, puis une animation. Les exports modifiés sont détectés automatiquement. Un clic droit dans l’Explorateur restreint la liste ; « Revenir à l’espace de travail » rétablit tout le projet.',
  versionsEyebrow: 'UNE COMPATIBILITÉ EXPLICITE',
  versionsTitle: 'Six versions.\nUn seul espace de prévisualisation.',
  versionsIntro:
    'Un runtime officiel distinct pour chaque version majeure et mineure prise en charge. Exports JSON et binaires partagent la même interface.',
  version: 'VERSION SPINE',
  json: 'JSON',
  binary: '.SKEL',
  supported: 'Pris en charge',
  jsonOnly: 'JSON uniquement',
  binaryNote:
    'Le binaire 3.7 n’est pas pris en charge. Certains anciens exports binaires 3.8 nécessitent un nouvel export compatible. La compatibilité des bêtas 4.3 dépend du runtime officiel.',
  details: 'Détails de compatibilité',
  faqEyebrow: 'BON À SAVOIR',
  faqTitle: 'Quelques réponses avant de commencer.',
  questionFiles: 'Quels fichiers faut-il préparer ?',
  answerFiles:
    'Un squelette JSON ou binaire pris en charge, son atlas et toutes les images référencées par cet atlas. Conservez la structure relative des dossiers pour résoudre correctement les dépendances.',
  questionUpload: 'Mes ressources sont-elles envoyées sur un serveur ?',
  answerUpload:
    'Non. Les fichiers importés sont lus et affichés localement. Le visualiseur Web fonctionne dans votre navigateur et n’envoie pas vos ressources à un serveur.',
  questionLanguage: 'Puis-je changer la langue de l’interface ?',
  answerLanguage:
    'Oui. Le site et le visualiseur proposent les mêmes dix langues. Utilisez le menu de langue en haut de la page. Chaque interface conserve son propre choix ; l’anglais est la langue par défaut.',
  questionLicense: 'Quelle est la licence du projet ?',
  answerLicense:
    'Le code propre au projet est sous licence MIT. Les runtimes officiels Spine et les illustrations d’exemple conservent leurs licences d’origine, y compris les conditions applicables de Spine Editor.',
  finalTitle: 'Votre prochain export,\nprêt à être vérifié.',
  finalIntro: 'Ouvrez le visualiseur et importez votre premier dossier de ressources.',
  footerTagline: 'Un espace local pour les ressources d’animation Spine.',
  documentation: 'Documentation',
  projectLicense: 'Licence MIT',
  thirdParty: 'Mentions des tiers',
  affiliation:
    'Projet maintenu indépendamment. Sans affiliation ni approbation d’Esoteric Software.',
};
