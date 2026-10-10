import { NewTabLink } from './NewTabLink.js';
import type { en } from '../content.js';

/** 插件介绍区的语言内容与文档入口。 */
interface ExtensionSectionProps {
  /** 与英文契约对应的全部宣传文案。 */
  text: { [Key in keyof typeof en]: string };
  /** 当前语言的 VSIX 安装说明地址。 */
  docsHref: string;
}

/** 独立展示编辑器工作流、发布状态和安装方式，不把示意图当作实机截图。 */
export function ExtensionSection({ text: t, docsHref }: ExtensionSectionProps) {
  const metadata = __EXTENSION__;
  const features = [
    [t.extensionFolderTitle, t.extensionFolderBody],
    [t.extensionFileTitle, t.extensionFileBody],
    [t.extensionPlaybackTitle, t.extensionPlaybackBody],
  ];
  return (
    <section
      id="vscode"
      className="extension-section section wrap"
      aria-labelledby="extension-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t.extensionLabel}</span>
          <h2 id="extension-title">{t.extensionTitle}</h2>
        </div>
        <p>{t.extensionBody}</p>
      </div>
      <div className="extension-layout">
        <div className="extension-copy">
          <div className="extension-metadata">
            <span>{t.extensionVersion.replace('{version}', metadata.version)}</span>
            <span>
              {t.extensionRequirements.replace('{version}', metadata.minimumVSCode)}
            </span>
          </div>
          <ul className="extension-features">
            {features.map(([title, body], index) => (
              <li key={title}>
                <span className="extension-feature-number">0{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="extension-release-status">
            <span
              className={metadata.published ? 'release-dot published' : 'release-dot'}
              aria-hidden="true"
            />
            {metadata.published ? t.extensionStatus : t.extensionPending}
          </p>
          <div className="extension-actions">
            {metadata.published && (
              <>
                <a
                  className="button button-dark"
                  href={`vscode:extension/${metadata.id}`}
                >
                  {t.extensionInstall}
                  <span aria-hidden="true">↗</span>
                </a>
                <NewTabLink className="text-link" href={metadata.marketplaceUrl}>
                  {t.extensionMarketplace}
                  <span aria-hidden="true">↗</span>
                </NewTabLink>
              </>
            )}
            <NewTabLink
              className={metadata.published ? 'text-link' : 'button button-dark'}
              href={docsHref}
            >
              {t.extensionLink}
              <span aria-hidden="true">↗</span>
            </NewTabLink>
          </div>
        </div>
        <div className="extension-workflow-card">
          <div className="extension-card-label">
            <span>{t.extensionExplorer}</span>
            <span aria-hidden="true">&lt;/&gt;</span>
          </div>
          <div
            className="explorer-illustration"
            role="img"
            aria-label={t.extensionIllustration}
          >
            <div className="explorer-line">
              ⌄ <span>game-project</span>
            </div>
            <div className="explorer-line level-one">
              ⌄ <span>assets</span>
            </div>
            <div className="explorer-line level-two">
              ⌄ <span>spine</span>
            </div>
            <div className="explorer-line level-three selected-folder">
              ⌄ <span>hero</span>
              <span className="folder-target">↗</span>
            </div>
            <div className="explorer-line level-four">
              <span className="file-symbol json">{`{ }`}</span>
              <span>hero.json</span>
            </div>
            <div className="explorer-line level-four">
              <span className="file-symbol atlas">≡</span>
              <span>hero.atlas</span>
            </div>
            <div className="explorer-line level-four">
              <span className="file-symbol image">▧</span>
              <span>page.png</span>
            </div>
            <div className="explorer-menu">
              <span className="menu-play" aria-hidden="true">
                ▷
              </span>
              <span>{t.extensionContextCommand}</span>
              <span aria-hidden="true">↗</span>
            </div>
          </div>
          <ol className="editor-workflow-steps">
            <li>{t.extensionWorkflowOne}</li>
            <li>{t.extensionWorkflowTwo}</li>
            <li>{t.extensionWorkflowThree}</li>
          </ol>
          <div className="extension-id">
            <span>{t.extensionIdLabel}</span>
            <code>{metadata.id}</code>
          </div>
          <p className="extension-offline">{t.extensionOffline}</p>
        </div>
      </div>
    </section>
  );
}
