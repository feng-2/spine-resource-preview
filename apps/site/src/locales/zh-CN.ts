/** 简体中文宣传文案。 */
import type { SiteMessages } from './types.js';

export const zhCN: SiteMessages = {
  title: 'Spine Resource Preview — 让 Spine 资源动起来',
  description:
    '面向 Web 与 VS Code 的本地 Spine 动画预览工具。按导出版本使用官方运行时，浏览资源并播放动画。',
  skip: '跳到正文',
  mainNavigation: '主导航',
  resourceNavigation: '相关资源',
  navFeatures: '功能',
  navWorkflow: '使用方式',
  navVersions: '兼容范围',
  navExtension: 'VS Code',
  getExtension: '获取 VS Code 插件',
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
  extensionLabel: 'VS CODE 插件',
  extensionTitle: '在项目文件旁边查看动画。',
  extensionBody:
    '打开 Spine 侧栏，自动发现工作区中的资源。在 VS Code 原生列表中选择资源和动画，右侧编辑器画布随时展示播放效果。',
  extensionStatus: '已在 Visual Studio Marketplace 上架',
  extensionPending: '商店状态未确认 · 可通过 VSIX 安装',
  extensionLink: '使用与 VSIX 安装说明',
  extensionInstall: '在 VS Code 中安装',
  extensionMarketplace: '查看商店页面',
  extensionRequirements: 'VS Code {version}+',
  extensionVersion: '版本 {version}',
  extensionIdLabel: '插件标识',
  extensionExplorer: 'SPINE 侧栏使用流程',
  extensionFolderTitle: '整个项目，自动发现资源。',
  extensionFolderBody:
    '点击活动栏中的 Spine 图标，递归扫描所有工作区目录。资源和动画显示在原生侧栏，点击资源后才打开预览画布。',
  extensionFileTitle: '聚焦一份导出，随时返回整个项目。',
  extensionFileBody:
    '右键目录或骨骼文件可缩小列表范围；点击“资源”标题栏的“返回工作区”，即可恢复全部项目目录。',
  extensionLiveTitle: '导出有变化，列表自动更新。',
  extensionLiveBody:
    '新增、修改和删除资源会自动更新列表。其它资源的变化不会打断播放；当前资源变化时重新加载，并保留仍然有效的选中动作。',
  extensionReturnTitle: '切回整个项目',
  extensionReturnBody:
    '右键查看某个文件或目录后，将鼠标移到“资源”标题栏，点击“返回工作区”。也可以在命令面板中执行同名命令。',
  extensionPreviewAlt:
    'VS Code 中的 Spine Resource Preview：左侧为原生资源目录树和动画列表，右侧编辑器画布正在播放 Spineboy 的 run 动画。',
  extensionPreviewCaption: '左侧原生侧栏浏览资源和动画，右侧编辑器画布专注展示播放效果。',
  extensionPlaybackTitle: '同一套控件，就在编辑器内。',
  extensionPlaybackBody:
    '切换资源与动画、暂停、重播、循环、调整速度，通过缩放和平移检查画布。',
  extensionWorkflowOne: '打开项目，点击活动栏中的 Spine 图标。',
  extensionWorkflowTwo: '在“资源”列表中选择导出，打开编辑器预览。',
  extensionWorkflowThree: '在“动画”列表中点击动作名称开始播放。',
  extensionOffline: '运行时随插件打包，本地读取资源，无需开发服务器。',
  questionExtension: '如何在 VS Code 中使用？',
  answerExtension:
    '安装插件并打开项目后，点击活动栏中的 Spine 图标，在“资源”中选择导出，再在“动画”中选择动作。导出变化会自动更新；右键目录或骨骼可聚焦列表，“返回工作区”可恢复整个项目。',
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
    '可以。网站和预览工具支持相同的十种语言。请使用顶部语言菜单；两者分别保存语言偏好，首次默认展示英文。',
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
