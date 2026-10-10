/** es 宣传页完整语言包。 */
import type { SiteMessages } from './types.js';

export const es: SiteMessages = {
  title: 'Spine Resource Preview — Tus recursos Spine, en movimiento.',
  description:
    'Un visor local de animaciones Spine para la web y VS Code. Explora tus exportaciones y reproduce animaciones con los runtimes oficiales correspondientes a cada versión.',
  skip: 'Ir al contenido',
  mainNavigation: 'Navegación principal',
  resourceNavigation: 'Recursos relacionados',
  navFeatures: 'Funciones',
  navWorkflow: 'Cómo funciona',
  navVersions: 'Compatibilidad',
  navExtension: 'VS Code',
  getExtension: 'Obtener la extensión de VS Code',
  language: 'Idioma del sitio',
  open: 'Abrir el visor',
  source: 'Ver código en GitHub',
  eyebrow: 'VISOR LOCAL DE ANIMACIONES SPINE',
  headline: 'Tus recursos Spine.',
  headlineAccent: 'En movimiento.',
  intro:
    'De una carpeta exportada a la animación que necesitas. Explora recursos, cambia de acción y comprueba tus exportaciones con el runtime oficial adecuado.',
  support: 'Spine 3.7 · 3.8 · 4.0 · 4.1 · 4.2 · 4.3',
  privacy: 'Procesamiento local. Sin subir archivos.',
  platform: 'Para la web y VS Code',
  viewerLabel: 'EL VISOR',
  viewerFormat: 'Spine 4.2 · JSON · run',
  screenshotAlt:
    'Interfaz en inglés de Spine Resource Preview con ocho recursos importados, once animaciones y Spineboy reproduciendo la animación run en el lienzo.',
  screenshotCaption:
    'La aplicación en uso: recursos a la izquierda, animación en el centro.',
  screenshotCredit: 'Arte oficial de Spineboy © Esoteric Software.',
  assetLicense: 'Licencia del material',
  forLabel: 'PARA TU FLUJO DE EXPORTACIÓN',
  audience: 'Artistas, animadores y desarrolladores de juegos.',
  featuresEyebrow: 'MENOS PREPARACIÓN. MÁS PREVISUALIZACIÓN.',
  featuresTitle: 'Todo lo necesario\npara revisar una exportación.',
  featuresIntro:
    'Un espacio dedicado al paso entre exportar una animación e integrarla en tu juego.',
  runtimeTitle: 'El runtime adecuado, automáticamente.',
  runtimeBody:
    'La versión de exportación determina el runtime oficial spine-ts. Los detalles de versión permanecen visibles y los datos no compatibles reciben un diagnóstico claro.',
  localTitle: 'Tus archivos permanecen locales.',
  localBody:
    'Selecciona archivos o arrastra una carpeta a la aplicación web. Los recursos se procesan en tu dispositivo y los runtimes están incluidos en la aplicación.',
  animationTitle: 'Encuentra la acción que necesitas.',
  animationBody:
    'Explora animaciones, pausa, reinicia, activa el bucle y cambia la velocidad. Amplía los detalles o ajusta el personaje al lienzo.',
  workflowEyebrow: 'DE LA CARPETA AL PRIMER FOTOGRAMA',
  workflowTitle: 'Abrir. Elegir. Reproducir.',
  workflowIntro:
    'Sin crear una escena de prueba. Prepara un conjunto completo de recursos y empieza a explorar.',
  stepOne: 'Importa tu exportación',
  stepOneBody:
    'Selecciona una carpeta o importa juntos .json / .skel, .atlas y todas las imágenes de las páginas del atlas.',
  stepTwo: 'Elige un recurso',
  stepTwoBody:
    'Explora los recursos completos encontrados en tu carpeta. Las dependencias que faltan aparecen en los diagnósticos.',
  stepThree: 'Míralo en movimiento',
  stepThreeBody:
    'Elige una animación para reproducirla. Revisa a tamaño real o ajusta los recursos grandes al lienzo.',
  extensionLabel: 'LA EXTENSIÓN DE VS CODE',
  extensionTitle: 'La vista previa junto a tu proyecto.',
  extensionBody:
    'Abre la barra lateral Spine para descubrir recursos del espacio de trabajo. Explora recursos y animaciones en las listas nativas de VS Code, con un lienzo separado en el editor.',
  extensionStatus: 'Disponible en Visual Studio Marketplace',
  extensionPending:
    'Publicación en Marketplace sin confirmar · Instalación mediante VSIX',
  extensionLink: 'Guía de uso e instalación VSIX',
  extensionInstall: 'Instalar en VS Code',
  extensionMarketplace: 'Ver en Marketplace',
  extensionRequirements: 'VS Code {version}+',
  extensionVersion: 'Versión {version}',
  extensionIdLabel: 'ID DE LA EXTENSIÓN',
  extensionExplorer: 'FLUJO DE LA BARRA LATERAL SPINE',
  extensionFolderTitle: 'Tu espacio de trabajo, descubierto automáticamente.',
  extensionFolderBody:
    'Haz clic en el icono Spine de la barra de actividad para analizar recursivamente todas las carpetas abiertas. Los recursos y las animaciones aparecen en la barra lateral; seleccionar un recurso abre el lienzo.',
  extensionFileTitle: 'Céntrate en una exportación. Vuelve a todo el proyecto.',
  extensionFileBody:
    'Haz clic derecho en una carpeta o esqueleto para reducir la lista. «Volver al espacio de trabajo» en la barra de Recursos restaura todas las carpetas del proyecto.',
  extensionLiveTitle: 'Nuevas exportaciones listas para revisar.',
  extensionLiveBody:
    'Las altas, modificaciones y eliminaciones actualizan la lista automáticamente. Los cambios en otros recursos no interrumpen la reproducción. El recurso seleccionado se vuelve a cargar si cambia y conserva la acción elegida cuando aún existe.',
  extensionReturnTitle: 'Volver a todo el proyecto',
  extensionReturnBody:
    'Tras seleccionar en el Explorador, coloca el ratón sobre el encabezado Recursos y pulsa «Volver al espacio de trabajo». También puedes ejecutar el comando desde la paleta de comandos.',
  extensionPreviewAlt:
    'Spine Resource Preview en VS Code, con el árbol nativo de recursos y la lista de animaciones a la izquierda y Spineboy reproduciendo run en el lienzo del editor a la derecha.',
  extensionPreviewCaption:
    'Recursos y animaciones en la barra lateral nativa. El lienzo del editor se dedica a la reproducción.',
  extensionPlaybackTitle: 'Los mismos controles, dentro de tu editor.',
  extensionPlaybackBody:
    'Cambia de recurso y animación, pausa, reinicia, activa el bucle y ajusta la velocidad. Inspecciona el lienzo ampliándolo y desplazándolo.',
  extensionWorkflowOne:
    'Abre tu proyecto y haz clic en el icono Spine de la barra de actividad.',
  extensionWorkflowTwo:
    'Elige una exportación en Recursos para abrir su vista previa en el editor.',
  extensionWorkflowThree: 'Haz clic en una acción de Animaciones para reproducirla.',
  extensionOffline: 'Runtimes incluidos. Recursos locales. Sin servidor de desarrollo.',
  questionExtension: '¿Cómo se usa en VS Code?',
  answerExtension:
    'Instala la extensión, abre tu proyecto y pulsa Spine en la barra de actividad. Selecciona un recurso y después una animación. Las exportaciones se actualizan automáticamente. Un clic derecho en el Explorador reduce la lista; «Volver al espacio de trabajo» restaura todo el proyecto.',
  versionsEyebrow: 'COMPATIBILIDAD EXPLÍCITA',
  versionsTitle: 'Seis versiones.\nUn espacio de previsualización.',
  versionsIntro:
    'Un runtime oficial independiente para cada versión principal y secundaria compatible. Las exportaciones JSON y binarias comparten la misma interfaz.',
  version: 'VERSIÓN DE SPINE',
  json: 'JSON',
  binary: '.SKEL',
  supported: 'Compatible',
  jsonOnly: 'Solo JSON',
  binaryNote:
    'El formato binario 3.7 no es compatible. Algunos binarios antiguos de 3.8 requieren volver a exportar en un formato compatible. La compatibilidad con las betas de 4.3 depende del runtime oficial.',
  details: 'Detalles de compatibilidad',
  faqEyebrow: 'ANTES DE EMPEZAR',
  faqTitle: 'Algunas respuestas antes de abrir el visor.',
  questionFiles: '¿Qué archivos necesito?',
  answerFiles:
    'Un esqueleto JSON o binario compatible, su atlas y todas las imágenes indicadas en él. Conserva la estructura relativa de carpetas para resolver correctamente las dependencias.',
  questionUpload: '¿Se suben mis recursos?',
  answerUpload:
    'No. Los archivos importados se leen y renderizan localmente. El visor web funciona en tu navegador y no envía tus recursos a un servidor.',
  questionLanguage: '¿Puedo cambiar el idioma de la interfaz?',
  answerLanguage:
    'Sí. El sitio y el visor ofrecen los mismos diez idiomas. Elígelos en el menú de idioma de la cabecera. Cada interfaz guarda su preferencia de forma independiente; el idioma predeterminado es el inglés.',
  questionLicense: '¿Qué licencia tiene el proyecto?',
  answerLicense:
    'El código propio del proyecto utiliza MIT. Los runtimes oficiales de Spine y el arte de los ejemplos conservan sus licencias originales, incluidas las condiciones aplicables de Spine Editor.',
  finalTitle: 'Tu próxima exportación,\nlista para revisar.',
  finalIntro: 'Abre el visor e importa tu primera carpeta de recursos.',
  footerTagline: 'Un espacio local para recursos de animación Spine.',
  documentation: 'Documentación',
  projectLicense: 'Licencia MIT',
  thirdParty: 'Avisos de terceros',
  affiliation:
    'Proyecto mantenido de forma independiente. Sin afiliación ni respaldo de Esoteric Software.',
};
