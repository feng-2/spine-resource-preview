import type { en } from './en.js';

/** 繁體中文宿主原生界面文案。 */
export const zhTW: { [Key in keyof typeof en]: string } = {
  panelTitle: 'Spine 資源預覽',
  scanTitle: '掃描 Spine 資源',
  scanStarting: '正在掃描 {target}…',
  filesIndexed: '已列出 {count} 個檔案',
  cancelled: '掃描已取消，可重新整理後再試。',
  scanFailed: '掃描失敗：{reason}',
  preparing: '正在準備預覽…',
  initial: '以右鍵點選資源檔案或資料夾，或選擇本機資源。',
  localUriOnly: '請選擇本機資源檔案或 VS Code 遠端檔案 URI。',
  sameFilesystem: '一次匯入的檔案必須位於同一個檔案系統。',
  selectedFiles: '{count} 個檔案與資料夾',
  chooseFiles: '匯入 Spine 資源',
  resourceFilter: 'Spine 資源',
  chooseFolder: '匯入資源資料夾',
  error: 'Spine 資源預覽：{reason}',
};
