/** pt-BR 宣传页完整语言包。 */
import type { SiteMessages } from './types.js';

export const ptBR: SiteMessages = {
  title: 'Spine Resource Preview — Seus recursos Spine, em movimento.',
  description:
    'Um visualizador local de animações Spine para a web e o VS Code. Explore exportações e reproduza animações com os runtimes oficiais correspondentes a cada versão.',
  skip: 'Ir para o conteúdo',
  mainNavigation: 'Navegação principal',
  resourceNavigation: 'Recursos relacionados',
  navFeatures: 'Funcionalidades',
  navWorkflow: 'Como funciona',
  navVersions: 'Compatibilidade',
  navExtension: 'VS Code',
  getExtension: 'Obter extensão do VS Code',
  language: 'Idioma do site',
  open: 'Abrir visualizador',
  source: 'Ver código no GitHub',
  eyebrow: 'VISUALIZADOR LOCAL DE ANIMAÇÕES SPINE',
  headline: 'Seus recursos Spine.',
  headlineAccent: 'Em movimento.',
  intro:
    'Da pasta exportada à animação que você procura. Explore recursos, troque de ação e confira suas exportações com o runtime oficial adequado.',
  support: 'Spine 3.7 · 3.8 · 4.0 · 4.1 · 4.2 · 4.3',
  privacy: 'Processamento local. Sem envio de arquivos.',
  platform: 'Para a web e o VS Code',
  viewerLabel: 'O VISUALIZADOR',
  viewerFormat: 'Spine 4.2 · JSON · run',
  screenshotAlt:
    'Interface em inglês do Spine Resource Preview com oito recursos importados, onze animações e Spineboy reproduzindo a animação run na área de prévia.',
  screenshotCaption:
    'O aplicativo em uso: recursos à esquerda, sua animação em destaque.',
  screenshotCredit: 'Arte oficial de Spineboy © Esoteric Software.',
  assetLicense: 'Licença das imagens',
  forLabel: 'PARA SEU FLUXO DE EXPORTAÇÃO',
  audience: 'Artistas, animadores e desenvolvedores de jogos.',
  featuresEyebrow: 'MENOS PREPARAÇÃO. MAIS PRÉVIA.',
  featuresTitle: 'Tudo o que você precisa\npara conferir uma exportação.',
  featuresIntro:
    'Um espaço dedicado à etapa entre exportar uma animação e integrá-la ao seu jogo.',
  runtimeTitle: 'O runtime certo, automaticamente.',
  runtimeBody:
    'A versão de exportação define o runtime oficial spine-ts utilizado. Os detalhes de versão ficam visíveis e os dados não compatíveis recebem um diagnóstico claro.',
  localTitle: 'Seus arquivos continuam locais.',
  localBody:
    'Escolha arquivos ou arraste uma pasta para o aplicativo web. Os recursos são processados no seu dispositivo e os runtimes estão incluídos no aplicativo.',
  animationTitle: 'Encontre a ação de que precisa.',
  animationBody:
    'Explore animações, pause, reinicie, ative a repetição e ajuste a velocidade. Amplie os detalhes ou ajuste o personagem à área de prévia.',
  workflowEyebrow: 'DA PASTA AO PRIMEIRO QUADRO',
  workflowTitle: 'Abrir. Escolher. Reproduzir.',
  workflowIntro:
    'Sem criar uma cena de prévia. Prepare o conjunto completo de arquivos e comece a explorar.',
  stepOne: 'Importe sua exportação',
  stepOneBody:
    'Escolha uma pasta ou importe juntos .json / .skel, .atlas e todas as imagens das páginas do atlas.',
  stepTwo: 'Escolha um recurso',
  stepTwoBody:
    'Explore os recursos completos encontrados na pasta. As dependências ausentes aparecem nos diagnósticos.',
  stepThree: 'Veja em movimento',
  stepThreeBody:
    'Escolha uma animação para reproduzir. Confira no tamanho real ou ajuste os recursos maiores à área de prévia.',
  extensionLabel: 'A EXTENSÃO DO VS CODE',
  extensionTitle: 'A prévia ao lado do seu projeto.',
  extensionBody:
    'Abra a barra lateral Spine para descobrir recursos do espaço de trabalho. Escolha recursos e animações nas listas nativas do VS Code, com uma área de prévia separada no editor.',
  extensionStatus: 'Disponível no Visual Studio Marketplace',
  extensionPending: 'Publicação no Marketplace não confirmada · Instale via VSIX',
  extensionLink: 'Guia de uso e instalação VSIX',
  extensionInstall: 'Instalar no VS Code',
  extensionMarketplace: 'Ver no Marketplace',
  extensionRequirements: 'VS Code {version}+',
  extensionVersion: 'Versão {version}',
  extensionIdLabel: 'ID DA EXTENSÃO',
  extensionExplorer: 'FLUXO DA BARRA LATERAL SPINE',
  extensionFolderTitle: 'Seu espaço de trabalho, explorado automaticamente.',
  extensionFolderBody:
    'Clique no ícone Spine da barra de atividades para buscar recursivamente em todas as pastas abertas. Os recursos e as animações aparecem na barra lateral; selecionar um recurso abre a prévia.',
  extensionFileTitle: 'Foque em uma exportação. Volte ao projeto inteiro.',
  extensionFileBody:
    'Clique com o botão direito em uma pasta ou esqueleto para restringir a lista. Use “Voltar ao espaço de trabalho” na barra de Recursos para restaurar todas as pastas do projeto.',
  extensionLiveTitle: 'Novas exportações prontas para conferir.',
  extensionLiveBody:
    'Adições, alterações e exclusões atualizam a lista automaticamente. Mudanças em outros recursos não interrompem a reprodução. O recurso selecionado é recarregado quando muda e mantém a ação escolhida se ela ainda existir.',
  extensionReturnTitle: 'Voltar ao projeto inteiro',
  extensionReturnBody:
    'Após selecionar no Explorador, passe o mouse sobre o título Recursos e clique em “Voltar ao espaço de trabalho”. O comando também está disponível na paleta de comandos.',
  extensionPreviewAlt:
    'Spine Resource Preview no VS Code com a árvore nativa de recursos e a lista de animações à esquerda, e Spineboy reproduzindo run no editor à direita.',
  extensionPreviewCaption:
    'Recursos e animações na barra lateral nativa. A área de prévia do editor fica dedicada à reprodução.',
  extensionPlaybackTitle: 'Os mesmos controles, dentro do editor.',
  extensionPlaybackBody:
    'Troque de recurso e animação, pause, reinicie, ative a repetição e ajuste a velocidade. Inspecione a área de prévia usando zoom e deslocamento.',
  extensionWorkflowOne: 'Abra o projeto e clique no ícone Spine da barra de atividades.',
  extensionWorkflowTwo:
    'Escolha uma exportação em Recursos para abrir a prévia no editor.',
  extensionWorkflowThree: 'Clique em uma ação de Animações para reproduzi-la.',
  extensionOffline:
    'Runtimes incluídos. Recursos locais. Sem servidor de desenvolvimento.',
  questionExtension: 'Como usar no VS Code?',
  answerExtension:
    'Instale a extensão, abra o projeto e clique em Spine na barra de atividades. Escolha um recurso e depois uma animação. Alterações nas exportações são detectadas automaticamente. O menu do Explorador restringe a lista; “Voltar ao espaço de trabalho” restaura o projeto inteiro.',
  versionsEyebrow: 'COMPATIBILIDADE EXPLÍCITA',
  versionsTitle: 'Seis versões.\nUm espaço de prévia.',
  versionsIntro:
    'Um runtime oficial independente para cada versão principal e secundária compatível. Exportações JSON e binárias usam a mesma interface.',
  version: 'VERSÃO DO SPINE',
  json: 'JSON',
  binary: '.SKEL',
  supported: 'Compatível',
  jsonOnly: 'Somente JSON',
  binaryNote:
    'O formato binário 3.7 não é compatível. Alguns binários antigos de 3.8 precisam ser exportados novamente em um formato compatível. A compatibilidade das versões beta 4.3 depende do runtime oficial.',
  details: 'Detalhes de compatibilidade',
  faqEyebrow: 'ANTES DE COMEÇAR',
  faqTitle: 'Algumas respostas antes de abrir o visualizador.',
  questionFiles: 'Quais arquivos preciso preparar?',
  answerFiles:
    'Um esqueleto JSON ou binário compatível, o atlas correspondente e todas as imagens citadas nele. Preserve a estrutura relativa das pastas para resolver as dependências corretamente.',
  questionUpload: 'Meus recursos são enviados para um servidor?',
  answerUpload:
    'Não. Os arquivos importados são lidos e renderizados localmente. O visualizador web funciona no navegador e não envia seus recursos para um servidor.',
  questionLanguage: 'Posso mudar o idioma da interface?',
  answerLanguage:
    'Sim. O site e o visualizador oferecem os mesmos dez idiomas. Escolha pelo menu de idioma no cabeçalho. Cada interface salva sua preferência separadamente; o padrão é inglês.',
  questionLicense: 'Qual é a licença do projeto?',
  answerLicense:
    'O código próprio do projeto usa a licença MIT. Os runtimes oficiais do Spine e as imagens dos exemplos mantêm suas licenças originais, incluindo as condições aplicáveis do Spine Editor.',
  finalTitle: 'Sua próxima exportação,\npronta para conferir.',
  finalIntro: 'Abra o visualizador e importe sua primeira pasta de recursos.',
  footerTagline: 'Um espaço local para recursos de animação Spine.',
  documentation: 'Documentação',
  projectLicense: 'Licença MIT',
  thirdParty: 'Avisos de terceiros',
  affiliation:
    'Mantido de forma independente. Sem vínculo ou endosso da Esoteric Software.',
};
