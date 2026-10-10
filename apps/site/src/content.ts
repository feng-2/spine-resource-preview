/** 宣传页英文内容为默认语言与词条契约。 */
export const en = {
  title: 'Spine Resource Preview — Your Spine assets. In motion.',
  description:
    'A local Spine animation viewer for the web and VS Code. Browse exports and play animations with version-matched official runtimes.',
  skip: 'Skip to content',
  navFeatures: 'Features',
  navWorkflow: 'How it works',
  navVersions: 'Compatibility',
  language: 'Website language',
  open: 'Open viewer',
  source: 'View on GitHub',
  eyebrow: 'A LOCAL SPINE ANIMATION VIEWER',
  headline: 'Your Spine assets.',
  headlineAccent: 'In motion.',
  intro:
    'From a folder of exports to the animation you need. Browse resources, switch actions, and inspect your work with the matching official runtime.',
  support: 'Spine 3.7 · 3.8 · 4.0 · 4.1 · 4.2 · 4.3',
  privacy: 'Local resource processing. No file uploads.',
  platform: 'For the web & VS Code',
  viewerLabel: 'THE VIEWER',
  viewerFormat: 'Spine 4.2 · JSON · run',
  screenshotAlt:
    'Spine Resource Preview with eight imported resources, eleven animations, and the Spineboy run animation playing in the canvas.',
  screenshotCaption: 'A real workspace. Resources on the left, your animation in focus.',
  screenshotCredit: 'Official Spineboy artwork © Esoteric Software.',
  assetLicense: 'Asset license',
  forLabel: 'MADE FOR YOUR EXPORT WORKFLOW',
  audience: 'Artists. Animators. Game developers.',
  featuresEyebrow: 'LESS SETUP. MORE PREVIEW.',
  featuresTitle: 'Everything you need\nto inspect an export.',
  featuresIntro:
    'A focused workspace for the moment between exporting an animation and putting it in your game.',
  runtimeTitle: 'The right runtime, automatically.',
  runtimeBody:
    'The export version chooses its matching official spine-ts runtime. Version details stay visible, and unsupported data gets a clear diagnostic.',
  localTitle: 'Your files stay local.',
  localBody:
    'Choose files or drop a folder into the web app. Resources are processed on your device, with runtimes bundled into the application.',
  animationTitle: 'Find the action you need.',
  animationBody:
    'Browse animations, pause, replay, loop, and change the speed. Zoom into details or fit the character to the canvas.',
  workflowEyebrow: 'FROM FOLDER TO FIRST FRAME',
  workflowTitle: 'Open. Choose. Play.',
  workflowIntro:
    'No preview scene to build. Bring a complete resource set and start exploring.',
  stepOne: 'Bring your export',
  stepOneBody:
    'Select a folder, or import .json / .skel, .atlas, and every atlas page image together.',
  stepTwo: 'Pick a resource',
  stepTwoBody:
    'Browse the complete resources discovered in your folder. Missing dependencies appear in diagnostics.',
  stepThree: 'See it in motion',
  stepThreeBody:
    'Choose an animation to start playback. Inspect at actual size or fit larger resources to the canvas.',
  extensionLabel: 'ALSO IN YOUR EDITOR',
  extensionTitle: 'Keep the preview beside your project.',
  extensionBody:
    'The VS Code extension uses the same viewer. Right-click a folder to scan it recursively, or a skeleton file to open that resource and browse its directory.',
  extensionStatus: 'VS Code extension · Available as a source build',
  extensionLink: 'Build & install instructions',
  versionsEyebrow: 'EXPLICIT COMPATIBILITY',
  versionsTitle: 'Six versions.\nOne preview workspace.',
  versionsIntro:
    'Separate official runtimes for each supported major/minor version. JSON and binary exports share the same interface.',
  version: 'SPINE VERSION',
  json: 'JSON',
  binary: '.SKEL',
  supported: 'Supported',
  jsonOnly: 'JSON only',
  binaryNote:
    '3.7 binary is not supported. Some historical 3.8 binaries require a compatible re-export. 4.3 beta compatibility depends on the official runtime.',
  details: 'Full compatibility details',
  faqEyebrow: 'GOOD TO KNOW',
  faqTitle: 'A few details before you open it.',
  questionFiles: 'What files do I need?',
  answerFiles:
    'A JSON or supported binary skeleton, its atlas, and all images named in that atlas. Keep relative folders intact so dependencies can be matched correctly.',
  questionUpload: 'Are my resources uploaded?',
  answerUpload:
    'No. Imported files are read and rendered locally. The web viewer runs in your browser and does not send your resources to a server.',
  questionLanguage: 'Can I change the interface language?',
  answerLanguage:
    'Yes. The viewer supports English, Simplified and Traditional Chinese, Japanese, Korean, German, French, Spanish, Brazilian Portuguese, and Russian. Its language selector is independent of this website.',
  questionLicense: 'How is this project licensed?',
  answerLicense:
    'Project-authored code is MIT. Official Spine runtimes and example artwork retain their upstream licenses, including the applicable Spine Editor license conditions.',
  finalTitle: 'Your next export,\nready to inspect.',
  finalIntro: 'Open the viewer and bring your first resource folder.',
  footerTagline: 'A local workspace for Spine animation resources.',
  documentation: 'Documentation',
  projectLicense: 'MIT license',
  thirdParty: 'Third-party notices',
  affiliation:
    'Independently maintained. Not affiliated with or endorsed by Esoteric Software.',
} as const;

/** 中文宣传内容，不改变示例截图、原始文件名和产品品牌。 */
export const zhCN: { [Key in keyof typeof en]: string } = {
  title: 'Spine Resource Preview — 让 Spine 资源动起来',
  description:
    '面向 Web 与 VS Code 的本地 Spine 动画预览工具。按导出版本使用官方运行时，浏览资源并播放动画。',
  skip: '跳到正文',
  navFeatures: '功能',
  navWorkflow: '使用方式',
  navVersions: '兼容范围',
  language: '网站语言',
  open: '打开预览工具',
  source: '查看 GitHub 源码',
  eyebrow: '本地 SPINE 动画预览工具',
  headline: '你的 Spine 资源，',
  headlineAccent: '现在动起来。',
  intro:
    '从一份导出目录，找到你需要的动画。浏览资源、切换动作，使用匹配版本的官方运行时检查每一次导出。',
  support: 'Spine 3.7 · 3.8 · 4.0 · 4.1 · 4.2 · 4.3',
  privacy: '资源在本地处理，无需上传。',
  platform: '适用于 Web 与 VS Code',
  viewerLabel: '预览工作区',
  viewerFormat: 'Spine 4.2 · JSON · run',
  screenshotAlt:
    'Spine Resource Preview 英文界面：已导入八个资源、列出十一个动画，画布中正在播放 Spineboy 的 run 动画。',
  screenshotCaption: '真实运行界面。左侧浏览资源，画布专注展示动画。',
  screenshotCredit: '官方 Spineboy 美术版权归 Esoteric Software。',
  assetLicense: '素材许可',
  forLabel: '为资源导出与检查而设计',
  audience: '美术、动画师、游戏开发者。',
  featuresEyebrow: '打开资源，开始检查',
  featuresTitle: '检查一次导出，\n需要的功能都在这里。',
  featuresIntro: '在导出动画与接入游戏之间，提供一个专注的资源预览工作区。',
  runtimeTitle: '自动选择对应官方运行时。',
  runtimeBody:
    '读取资源导出版本，使用匹配的官方 spine-ts 运行时。版本信息始终可见，不支持的数据会给出明确诊断。',
  localTitle: '文件在本地处理。',
  localBody:
    '选择资源文件，或直接将文件夹拖入 Web 工具。资源在你的设备上处理，运行时已经随应用打包。',
  animationTitle: '找到你需要的动作。',
  animationBody:
    '浏览动画、暂停、重播、循环和调整播放速度。放大检查细节，或让角色适应画布。',
  workflowEyebrow: '从目录到第一帧',
  workflowTitle: '打开，选择，播放。',
  workflowIntro: '无需搭建游戏预览场景，准备完整资源即可开始。',
  stepOne: '导入资源',
  stepOneBody: '选择文件夹，或同时导入 .json / .skel、.atlas 和全部页图片。',
  stepTwo: '选择资源',
  stepTwoBody: '浏览目录中发现的完整资源。缺失的依赖会显示在诊断中。',
  stepThree: '播放动画',
  stepThreeBody: '选择动作开始播放。按实际大小检查，或将较大的资源适应画布。',
  extensionLabel: '也能在编辑器中使用',
  extensionTitle: '在项目文件旁边查看动画。',
  extensionBody:
    'VS Code 插件使用同一套界面。右键目录递归发现资源；右键骨骼文件可直接选中它，并浏览所在目录的资源。',
  extensionStatus: 'VS Code 插件 · 可从源码构建安装',
  extensionLink: '构建与安装说明',
  versionsEyebrow: '明确的兼容边界',
  versionsTitle: '六个版本，\n同一个预览工作区。',
  versionsIntro:
    '每个支持的主、次版本都有独立官方运行时，JSON 与二进制导出使用同一套界面。',
  version: 'SPINE 版本',
  json: 'JSON',
  binary: '.SKEL',
  supported: '支持',
  jsonOnly: '仅 JSON',
  binaryNote:
    '不支持 3.7 二进制。部分历史 3.8 二进制需要重新导出兼容格式。4.3 beta 的兼容性由官方运行时决定。',
  details: '查看完整兼容说明',
  faqEyebrow: '使用前了解',
  faqTitle: '开始预览前的几个问题。',
  questionFiles: '需要准备哪些文件？',
  answerFiles:
    'JSON 或支持版本的二进制骨骼、对应 atlas，以及 atlas 中列出的全部图片。保留相对目录结构，以便正确匹配依赖。',
  questionUpload: '我的资源会被上传吗？',
  answerUpload:
    '不会。导入文件在本地读取和渲染，Web 工具运行在浏览器中，不会把你的资源发送到服务器。',
  questionLanguage: '可以切换界面语言吗？',
  answerLanguage:
    '可以。预览工具支持英语、简繁中文、日语、韩语、德语、法语、西班牙语、巴西葡萄牙语和俄语。工具内的语言选择与本网站独立。',
  questionLicense: '项目使用什么许可证？',
  answerLicense:
    '项目自有代码使用 MIT。官方 Spine 运行时和示例美术遵循其上游许可证，包括适用的 Spine Editor 授权条件。',
  finalTitle: '下一份导出，\n现在就能查看。',
  finalIntro: '打开预览工具，导入你的第一个资源目录。',
  footerTagline: '专注 Spine 动画资源的本地预览工作区。',
  documentation: '使用文档',
  projectLicense: 'MIT 许可证',
  thirdParty: '第三方说明',
  affiliation: '本项目独立维护，与 Esoteric Software 没有隶属或背书关系。',
};
