import type { en } from './en.js';

/** 日语宿主原生界面文案。 */
export const ja: { [Key in keyof typeof en]: string } = {
  panelTitle: 'Spine リソースプレビュー',
  scanTitle: 'Spine リソースをスキャン',
  scanStarting: '{target} をスキャン中…',
  filesIndexed: '{count} 件のファイルを登録済み',
  cancelled: 'スキャンがキャンセルされました。更新して再試行してください。',
  scanFailed: 'スキャンに失敗しました: {reason}',
  preparing: 'プレビューを準備中…',
  initial:
    'リソースファイルやフォルダーを右クリックするか、ローカルリソースを選択してください。',
  localUriOnly:
    'ローカルファイルまたは VS Code リモートファイルの URI を選択してください。',
  sameFilesystem: '一度に読み込むファイルは同じファイルシステムに属する必要があります。',
  selectedFiles: '{count} 件のファイルとフォルダー',
  chooseFiles: 'Spine リソースを読み込む',
  resourceFilter: 'Spine リソース',
  chooseFolder: 'リソースフォルダーを読み込む',
  error: 'Spine リソースプレビュー: {reason}',
};
