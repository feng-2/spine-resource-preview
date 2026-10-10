/** zh-TW 宣传页完整语言包。 */
import type { SiteMessages } from './types.js';

export const zhTW: SiteMessages = {
  title: 'Spine Resource Preview — 讓 Spine 資源動起來',
  description:
    '適用於 Web 與 VS Code 的本機 Spine 動畫預覽工具。依匯出版本使用官方執行階段，瀏覽資源並播放動畫。',
  skip: '跳至內容',
  mainNavigation: '主導覽',
  resourceNavigation: '相關資源',
  navFeatures: '功能',
  navWorkflow: '使用方式',
  navVersions: '相容範圍',
  navExtension: 'VS Code',
  getExtension: '取得 VS Code 擴充功能',
  language: '網站語言',
  open: '開啟預覽工具',
  source: '查看 GitHub 原始碼',
  eyebrow: '本機 SPINE 動畫預覽工具',
  headline: '你的 Spine 資源，',
  headlineAccent: '現在動起來。',
  intro:
    '從一份匯出目錄，找到你需要的動畫。瀏覽資源、切換動作，使用對應版本的官方執行階段檢查每次匯出。',
  support: 'Spine 3.7 · 3.8 · 4.0 · 4.1 · 4.2 · 4.3',
  privacy: '資源在本機處理，無需上傳。',
  platform: '適用於 Web 與 VS Code',
  viewerLabel: '預覽工作區',
  viewerFormat: 'Spine 4.2 · JSON · run',
  screenshotAlt:
    'Spine Resource Preview 英文介面：已匯入八個資源、列出十一個動畫，畫布正在播放 Spineboy 的 run 動畫。',
  screenshotCaption: '實際執行介面。左側瀏覽資源，畫布專注展示動畫。',
  screenshotCredit: '官方 Spineboy 美術著作權屬於 Esoteric Software。',
  assetLicense: '素材授權',
  forLabel: '為資源匯出與檢查而設計',
  audience: '美術、動畫師、遊戲開發者。',
  featuresEyebrow: '開啟資源，開始檢查',
  featuresTitle: '檢查一次匯出，\n需要的功能都在這裡。',
  featuresIntro: '在匯出動畫與整合遊戲之間，提供專注的資源預覽工作區。',
  runtimeTitle: '自動選擇對應官方執行階段。',
  runtimeBody:
    '讀取資源匯出版本，使用對應的官方 spine-ts 執行階段。版本資訊始終可見，不支援的資料會提供明確診斷。',
  localTitle: '檔案在本機處理。',
  localBody:
    '選擇資源檔案，或將資料夾拖入 Web 工具。資源在你的裝置上處理，執行階段已隨應用程式打包。',
  animationTitle: '找到你需要的動作。',
  animationBody:
    '瀏覽動畫、暫停、重播、循環及調整播放速度。放大檢查細節，或讓角色符合畫布大小。',
  workflowEyebrow: '從目錄到第一個畫面',
  workflowTitle: '開啟、選擇、播放。',
  workflowIntro: '無需建立遊戲預覽場景，準備完整資源即可開始。',
  stepOne: '匯入資源',
  stepOneBody: '選擇資料夾，或同時匯入 .json / .skel、.atlas 與所有圖集頁圖片。',
  stepTwo: '選擇資源',
  stepTwoBody: '瀏覽目錄中找到的完整資源。缺少的相依檔案會顯示在診斷中。',
  stepThree: '播放動畫',
  stepThreeBody: '選擇動作開始播放。以實際大小檢查，或將較大的資源縮放至符合畫布。',
  extensionLabel: 'VS CODE 擴充功能',
  extensionTitle: '在專案檔案旁邊查看動畫。',
  extensionBody:
    '開啟 Spine 側邊欄，自動探索工作區資源。在 VS Code 原生清單中選擇資源和動畫，右側編輯器畫布隨時展示播放效果。',
  extensionStatus: '已在 Visual Studio Marketplace 上架',
  extensionPending: '商店狀態未確認 · 可透過 VSIX 安裝',
  extensionLink: '使用與 VSIX 安裝說明',
  extensionInstall: '在 VS Code 中安裝',
  extensionMarketplace: '查看商店頁面',
  extensionRequirements: 'VS Code {version}+',
  extensionVersion: '版本 {version}',
  extensionIdLabel: '擴充功能識別碼',
  extensionExplorer: 'SPINE 側邊欄使用流程',
  extensionFolderTitle: '整個專案，自動探索資源。',
  extensionFolderBody:
    '點選活動列的 Spine 圖示，遞迴掃描所有工作區資料夾。資源和動畫顯示在原生側邊欄，選擇資源後才開啟預覽畫布。',
  extensionFileTitle: '聚焦一份匯出，隨時返回整個專案。',
  extensionFileBody:
    '在資料夾或骨架檔案上按右鍵，可縮小清單範圍；點選「資源」工具列的「返回工作區」，即可恢復全部專案資料夾。',
  extensionLiveTitle: '匯出有變化，清單自動更新。',
  extensionLiveBody:
    '新增、修改或刪除資源會自動更新清單。其他資源的變化不會中斷播放；目前資源變更時重新載入，並保留仍存在的選定動作。',
  extensionReturnTitle: '切回整個專案',
  extensionReturnBody:
    '透過右鍵查看檔案或資料夾後，將滑鼠移至「資源」標題列，點選「返回工作區」。也可在命令選擇區執行同名命令。',
  extensionPreviewAlt:
    'VS Code 中的 Spine Resource Preview：左側為原生資源目錄樹和動畫清單，右側編輯器畫布正在播放 Spineboy 的 run 動畫。',
  extensionPreviewCaption:
    '左側原生側邊欄瀏覽資源和動畫，右側編輯器畫布專注展示播放效果。',
  extensionPlaybackTitle: '相同的控制功能，就在編輯器中。',
  extensionPlaybackBody:
    '切換資源與動畫、暫停、重播、循環、調整速度，透過縮放和平移檢查畫布。',
  extensionWorkflowOne: '開啟專案，點選活動列的 Spine 圖示。',
  extensionWorkflowTwo: '在「資源」清單選擇匯出，開啟編輯器預覽。',
  extensionWorkflowThree: '在「動畫」清單點選動作名稱開始播放。',
  extensionOffline: '執行階段隨擴充功能打包，本機讀取資源，無需開發伺服器。',
  questionExtension: '如何在 VS Code 中使用？',
  answerExtension:
    '安裝擴充功能並開啟專案後，點選活動列的 Spine 圖示，在「資源」選擇匯出，再到「動畫」選擇動作。匯出變化會自動更新；在資料夾或骨架上按右鍵可聚焦清單，「返回工作區」可恢復整個專案。',
  versionsEyebrow: '明確的相容範圍',
  versionsTitle: '六個版本，\n同一個預覽工作區。',
  versionsIntro:
    '每個支援的主、次版本都有獨立官方執行階段，JSON 與二進位匯出使用相同介面。',
  version: 'SPINE 版本',
  json: 'JSON',
  binary: '.SKEL',
  supported: '支援',
  jsonOnly: '僅 JSON',
  binaryNote:
    '不支援 3.7 二進位。部分歷史 3.8 二進位需要重新匯出相容格式。4.3 beta 相容性取決於官方執行階段。',
  details: '查看完整相容說明',
  faqEyebrow: '使用前瞭解',
  faqTitle: '開始預覽前的幾個問題。',
  questionFiles: '需要準備哪些檔案？',
  answerFiles:
    'JSON 或支援版本的二進位骨架、對應 atlas，以及 atlas 列出的所有圖片。保留相對目錄結構，以便正確匹配相依檔案。',
  questionUpload: '我的資源會被上傳嗎？',
  answerUpload:
    '不會。匯入檔案在本機讀取和繪製，Web 工具在瀏覽器中執行，不會將資源傳送到伺服器。',
  questionLanguage: '可以切換介面語言嗎？',
  answerLanguage:
    '可以。網站與預覽工具支援相同的十種語言。請使用頁首語言選單；兩者各自儲存語言偏好，首次預設為英文。',
  questionLicense: '專案使用什麼授權條款？',
  answerLicense:
    '專案自有程式碼採用 MIT。官方 Spine 執行階段和範例美術遵循其原始授權條款，包括適用的 Spine Editor 授權條件。',
  finalTitle: '下一份匯出，\n現在就能查看。',
  finalIntro: '開啟預覽工具，匯入你的第一個資源資料夾。',
  footerTagline: '專注 Spine 動畫資源的本機預覽工作區。',
  documentation: '使用文件',
  projectLicense: 'MIT 授權條款',
  thirdParty: '第三方聲明',
  affiliation: '本專案獨立維護，與 Esoteric Software 沒有隸屬或背書關係。',
};
