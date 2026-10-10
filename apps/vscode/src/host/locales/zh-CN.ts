import type { en } from './en.js';

/** 简体中文宿主原生界面文案。 */
export const zhCN: { [Key in keyof typeof en]: string } = {
  panelTitle: 'Spine 资源预览',
  scanTitle: '扫描 Spine 资源',
  scanStarting: '正在扫描 {target}…',
  filesIndexed: '已枚举 {count} 个文件',
  cancelled: '扫描已取消，可以刷新重试。',
  scanFailed: '扫描失败：{reason}',
  preparing: '正在准备资源索引…',
  initial: '右键资源文件或文件夹，或选择本地资源。',
  localUriOnly: '请选择本地资源或 VS Code 远程文件 URI',
  sameFilesystem: '一次导入的文件必须位于同一文件系统',
  selectedFiles: '{count} 个文件与文件夹',
  chooseFiles: '导入 Spine 资源',
  resourceFilter: 'Spine 资源',
  chooseFolder: '导入资源文件夹',
  error: 'Spine 资源预览：{reason}',
};
