/** ja 宣传页完整语言包。 */
import type { SiteMessages } from './types.js';

export const ja: SiteMessages = {
  title: 'Spine Resource Preview — Spine アセットを、動きで確認。',
  description:
    'Web と VS Code で使えるローカル Spine アニメーションビューア。エクスポートのバージョンに対応した公式ランタイムで、アセットを閲覧・再生できます。',
  skip: '本文へ移動',
  mainNavigation: 'メインナビゲーション',
  resourceNavigation: '関連リソース',
  navFeatures: '機能',
  navWorkflow: '使い方',
  navVersions: '互換性',
  navExtension: 'VS Code',
  getExtension: 'VS Code 拡張機能を入手',
  language: 'サイトの言語',
  open: 'ビューアを開く',
  source: 'GitHub でソースを見る',
  eyebrow: 'ローカル SPINE アニメーションビューア',
  headline: 'Spine アセットを、',
  headlineAccent: '動きで確認。',
  intro:
    'エクスポートしたフォルダーから、必要なアニメーションへ。アセットを閲覧し、動作を切り替え、対応する公式ランタイムでエクスポート結果を確認できます。',
  support: 'Spine 3.7 · 3.8 · 4.0 · 4.1 · 4.2 · 4.3',
  privacy: 'リソースはローカルで処理。アップロード不要。',
  platform: 'Web と VS Code に対応',
  viewerLabel: 'ビューア',
  viewerFormat: 'Spine 4.2 · JSON · run',
  screenshotAlt:
    '公式 Spine 4.2 サンプルを読み込んだ Spine Resource Preview の英語画面。8 個のリソースと 11 個のアニメーションが表示され、Spineboy の run がキャンバスで再生されています。',
  screenshotCaption: '実際の動作画面。左でアセットを選び、キャンバスで動きを確認。',
  screenshotCredit: '公式 Spineboy アートワーク © Esoteric Software。',
  assetLicense: '素材ライセンス',
  forLabel: 'エクスポートの確認作業に',
  audience: 'アーティスト、アニメーター、ゲーム開発者へ。',
  featuresEyebrow: '準備を減らして、すぐにプレビュー',
  featuresTitle: 'エクスポートの確認に\n必要な機能をひとつに。',
  featuresIntro:
    'アニメーションをエクスポートしてからゲームに組み込むまでの間に、確認作業に集中できる環境を提供します。',
  runtimeTitle: '対応するランタイムを自動選択。',
  runtimeBody:
    'エクスポートのバージョンに応じて公式 spine-ts ランタイムを選びます。バージョン情報を表示し、非対応データには明確な診断を示します。',
  localTitle: 'ファイルはローカルのまま。',
  localBody:
    'ファイルを選ぶか、フォルダーを Web アプリにドロップするだけ。リソースは端末内で処理され、ランタイムはアプリに同梱されています。',
  animationTitle: '必要な動作を見つける。',
  animationBody:
    'アニメーションの選択、一時停止、リプレイ、ループ、速度変更に対応。拡大して詳細を確認したり、キャラクターをキャンバスに合わせたりできます。',
  workflowEyebrow: 'フォルダーから最初のフレームへ',
  workflowTitle: '開く。選ぶ。再生する。',
  workflowIntro:
    'プレビュー用のゲームシーンは不要。必要なファイルをそろえれば、すぐに確認できます。',
  stepOne: 'エクスポートを読み込む',
  stepOneBody:
    'フォルダーを選ぶか、.json / .skel、.atlas、すべてのアトラスページ画像をまとめて読み込みます。',
  stepTwo: 'リソースを選ぶ',
  stepTwoBody:
    'フォルダーから検出された完全なリソースを閲覧します。依存ファイルの不足は診断に表示されます。',
  stepThree: '動きを確認する',
  stepThreeBody:
    'アニメーションを選んで再生。実寸で確認するか、大きなリソースをキャンバスに合わせます。',
  extensionLabel: 'VS CODE 拡張機能',
  extensionTitle: 'プロジェクトの横で、アニメーションを確認。',
  extensionBody:
    'Spine サイドバーを開くとワークスペース内のリソースを検出します。VS Code 標準の一覧でリソースと動作を選び、隣のエディターキャンバスで再生できます。',
  extensionStatus: 'Visual Studio Marketplace で公開中',
  extensionPending: 'Marketplace の公開状況は未確認 · VSIX からインストール可能',
  extensionLink: '使い方と VSIX インストールガイド',
  extensionInstall: 'VS Code にインストール',
  extensionMarketplace: 'Marketplace で見る',
  extensionRequirements: 'VS Code {version}+',
  extensionVersion: 'バージョン {version}',
  extensionIdLabel: '拡張機能 ID',
  extensionExplorer: 'SPINE サイドバーの使い方',
  extensionFolderTitle: 'ワークスペースのリソースを自動検出。',
  extensionFolderBody:
    'アクティビティバーの Spine アイコンをクリックすると、開いているすべてのフォルダーを再帰的に検索します。標準サイドバーに一覧が表示され、リソース選択時にキャンバスが開きます。',
  extensionFileTitle: 'ひとつのエクスポートに集中。プロジェクト全体にも戻れる。',
  extensionFileBody:
    'フォルダーやスケルトンを右クリックして対象を絞り込みます。「リソース」のツールバーで「ワークスペースに戻る」を選ぶと、プロジェクト全体を再表示できます。',
  extensionLiveTitle: '新しいエクスポートをすぐに確認。',
  extensionLiveBody:
    '追加・変更・削除を検知して一覧を自動更新します。別のリソースの変更では再生を中断しません。選択中のリソースが変わると再読み込みし、存在する場合は選択中の動作を維持します。',
  extensionReturnTitle: 'プロジェクト全体に戻る',
  extensionReturnBody:
    'エクスプローラーで対象を選んだ後は、「リソース」の見出しにマウスを置き、「ワークスペースに戻る」をクリックします。コマンドパレットからも実行できます。',
  extensionPreviewAlt:
    'VS Code の Spine Resource Preview。左の標準サイドバーにリソースのディレクトリツリーとアニメーション一覧があり、右のキャンバスで Spineboy の run を再生しています。',
  extensionPreviewCaption:
    '標準サイドバーでリソースと動作を選び、エディターのキャンバスで再生を確認。',
  extensionPlaybackTitle: 'いつもの再生操作を、エディター内で。',
  extensionPlaybackBody:
    'リソース・動作の切り替え、一時停止、リプレイ、ループ、速度調整に対応。ズームとパンでキャンバスを確認できます。',
  extensionWorkflowOne:
    'プロジェクトを開き、アクティビティバーの Spine アイコンをクリック。',
  extensionWorkflowTwo:
    '「リソース」でエクスポートを選び、エディターのプレビューを開く。',
  extensionWorkflowThree: '「アニメーション」で動作名をクリックして再生。',
  extensionOffline: 'ランタイムを同梱。ローカルファイルを使用。開発サーバー不要。',
  questionExtension: 'VS Code ではどう使いますか？',
  answerExtension:
    '拡張機能をインストールしてプロジェクトを開き、アクティビティバーの Spine をクリックします。「リソース」でファイルを選び、「アニメーション」で動作を選んでください。変更は自動検知されます。右クリックで対象を絞り込み、「ワークスペースに戻る」で全体を復元できます。',
  versionsEyebrow: '明確な互換性',
  versionsTitle: '6 つのバージョン。\nひとつのプレビュー環境。',
  versionsIntro:
    '対応するメジャー・マイナーバージョンごとに独立した公式ランタイムを使用。JSON とバイナリを同じ画面で扱えます。',
  version: 'SPINE バージョン',
  json: 'JSON',
  binary: '.SKEL',
  supported: '対応',
  jsonOnly: 'JSON のみ',
  binaryNote:
    '3.7 バイナリには非対応です。一部の古い 3.8 バイナリは互換形式での再エクスポートが必要です。4.3 ベータ版の互換性は公式ランタイムに依存します。',
  details: '互換性の詳細',
  faqEyebrow: '使う前に知っておきたいこと',
  faqTitle: 'プレビューを始める前に。',
  questionFiles: 'どのファイルが必要ですか？',
  answerFiles:
    'JSON または対応形式のバイナリスケルトン、対応する atlas、atlas が参照するすべての画像です。依存ファイルを正しく解決するため、相対的なフォルダー構造を維持してください。',
  questionUpload: 'リソースはアップロードされますか？',
  answerUpload:
    'いいえ。読み込んだファイルはローカルで読み取り・描画されます。Web ビューアはブラウザー内で動作し、リソースをサーバーに送信しません。',
  questionLanguage: '表示言語を変更できますか？',
  answerLanguage:
    'はい。サイトとビューアは同じ 10 言語に対応しています。ヘッダーの言語メニューから選択できます。言語設定はそれぞれ独立して保存され、初期表示は英語です。',
  questionLicense: 'プロジェクトのライセンスは？',
  answerLicense:
    'プロジェクト独自のコードは MIT ライセンスです。公式 Spine ランタイムとサンプル素材には、適用される Spine Editor の条件を含む元のライセンスが引き続き適用されます。',
  finalTitle: '次のエクスポートを、\nすぐに確認。',
  finalIntro: 'ビューアを開き、最初のリソースフォルダーを読み込みましょう。',
  footerTagline: 'Spine アニメーションを確認するローカル環境。',
  documentation: 'ドキュメント',
  projectLicense: 'MIT ライセンス',
  thirdParty: '第三者の権利表記',
  affiliation:
    '独立して保守されています。Esoteric Software との提携・推奨関係はありません。',
};
