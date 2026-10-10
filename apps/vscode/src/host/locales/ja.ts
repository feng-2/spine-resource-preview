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
  resourcesTitle: 'リソース',
  animationsTitle: 'アニメーション',
  refreshTitle: 'リソースを更新',
  workspaceTitle: 'ワークスペースに戻る',
  treeScanning: 'リソースをスキャン中…',
  treeEmpty:
    'Spine リソースが見つかりません。フォルダーを右クリックしてプレビューしてください。',
  animationsSelect: 'リソースを選択してアニメーションを表示します。',
  animationsEmpty: 'このリソースにはアニメーションがありません。',
  diagnosticsTitle: 'リソースの診断',
  resourceCount: '{count} 件のリソース',
  resourceDiagnostic: 'リソースの診断：{code}',
  diagnosticAtlasMissing: '対応する atlas が見つかりません。',
  diagnosticPageMissing: 'atlas が参照するページ画像が見つかりません。',
  diagnosticDependencyAmbiguous:
    '依存ファイルに複数の候補があります。ディレクトリ構造を保持したフォルダーを読み込んでください。',
  diagnosticBinary37Unsupported:
    'Spine 3.7 のバイナリは未対応です。3.7 JSON エクスポートを使用してください。',
  diagnosticVersionPrerelease:
    'ベータ版でエクスポートされています。対応するランタイムがデータを検証します。',
  diagnosticPreferredAmbiguous:
    '選択したファイルは複数のスケルトンに関連します。一覧からリソースを選択してください。',
  diagnosticPreferredUnassociated:
    '選択したファイルは完全な Spine リソースに関連していません。',
};
