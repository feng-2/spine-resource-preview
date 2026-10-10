import { useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { LOGO_URL } from '@spine-preview/viewer/assets';
import previewImage from '../../../assets/screenshots/preview-en.jpg';
import { en, zhCN } from './content.js';
import './style.css';

/** 宣传页仅提供英中语言，预览工具保留自己的十种语言设置。 */
type SiteLocale = 'en' | 'zh-CN';
const storageKey = 'spine-resource-preview.site.locale';
const viewerHref = import.meta.env.DEV ? 'http://127.0.0.1:5180/' : './app/';
const repositoryHref = __REPOSITORY_URL__;

/** 禁用本地存储时仍能使用默认英文，不自动猜测系统语言。 */
function initialLocale(): SiteLocale {
  try {
    return localStorage.getItem(storageKey) === 'zh-CN' ? 'zh-CN' : 'en';
  } catch {
    return 'en';
  }
}

/** 共用箭头图标，文字提供链接的完整可访问名称。 */
function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 功能图标使用原生 SVG，不请求外部图标或字体服务。 */
function FeatureIcon({ kind }: { kind: 'runtime' | 'local' | 'animation' }) {
  const paths = {
    runtime: 'M8 3H4v18h4M16 3h4v18h-4M10 8l4 4-4 4',
    local: 'M6 10V7a6 6 0 0 1 12 0v3M4 10h16v11H4zM12 14v3',
    animation: 'M4 4h16v16H4zM10 8l6 4-6 4V8z',
  };
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
      <path
        d={paths[kind]}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 开启工具的主操作在各处使用同一路径，兼容 GitHub Pages 子目录。 */
function OpenLink({ children }: { children: ReactNode }) {
  return (
    <a className="button button-dark" href={viewerHref}>
      {children}
      <Arrow />
    </a>
  );
}

/** 产品宣传页，展示真实功能并将用户引导到本地资源预览工具。 */
function Site() {
  const [locale, setLocale] = useState<SiteLocale>(initialLocale);
  const t = locale === 'zh-CN' ? zhCN : en;
  const docsHref = locale === 'zh-CN' ? './README.zh-CN.md' : './README.md';
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t.description);
    try {
      localStorage.setItem(storageKey, locale);
    } catch {
      /* 存储失败不能影响语言切换。 */
    }
  }, [locale, t]);
  const features = [
    { kind: 'runtime' as const, title: t.runtimeTitle, body: t.runtimeBody },
    { kind: 'local' as const, title: t.localTitle, body: t.localBody },
    { kind: 'animation' as const, title: t.animationTitle, body: t.animationBody },
  ];
  const steps = [
    [t.stepOne, t.stepOneBody],
    [t.stepTwo, t.stepTwoBody],
    [t.stepThree, t.stepThreeBody],
  ];
  const questions = [
    [t.questionFiles, t.answerFiles],
    [t.questionUpload, t.answerUpload],
    [t.questionLanguage, t.answerLanguage],
    [t.questionLicense, t.answerLicense],
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <header className="site-header wrap">
        <a className="brand" href="#" aria-label="Spine Resource Preview">
          <img src={LOGO_URL} alt="" width="36" height="36" />
          <span>
            Spine Resource<span className="brand-second">Preview</span>
          </span>
        </a>
        <nav aria-label={locale === 'en' ? 'Main navigation' : '主导航'}>
          <a href="#features">{t.navFeatures}</a>
          <a href="#workflow">{t.navWorkflow}</a>
          <a href="#versions">{t.navVersions}</a>
        </nav>
        <div className="header-actions">
          <select
            aria-label={t.language}
            value={locale}
            onChange={(event) =>
              setLocale(event.currentTarget.value === 'zh-CN' ? 'zh-CN' : 'en')
            }
          >
            <option value="en">EN</option>
            <option value="zh-CN">中文</option>
          </select>
          <a className="header-open" href={viewerHref}>
            {t.open}
            <Arrow diagonal />
          </a>
        </div>
      </header>
      <main id="main">
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="eyebrow">
            <span className="status-dot" />
            {t.eyebrow}
          </div>
          <div className="hero-copy">
            <h1 id="hero-title">
              {t.headline}
              <br />
              <span>{t.headlineAccent}</span>
            </h1>
            <div className="hero-intro">
              <p>{t.intro}</p>
              <div className="hero-buttons">
                <OpenLink>{t.open}</OpenLink>
                {repositoryHref && (
                  <a className="text-link" href={repositoryHref}>
                    {t.source}
                    <Arrow diagonal />
                  </a>
                )}
              </div>
              <p className="privacy">
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.7" />
                </svg>
                {t.privacy}
              </p>
            </div>
          </div>
          <div className="hero-meta">
            <span>{t.support}</span>
            <span>
              {t.platform}
              <span className="tiny-arrow">↙</span>
            </span>
          </div>
          <figure className="preview-figure">
            <div className="preview-frame">
              <div className="preview-top">
                <span className="window-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>{t.viewerLabel}</span>
                <span className="preview-format">{t.viewerFormat}</span>
              </div>
              <a href={viewerHref} aria-label={t.open}>
                <img
                  src={previewImage}
                  width="1280"
                  height="720"
                  alt={t.screenshotAlt}
                  fetchPriority="high"
                />
              </a>
            </div>
            <figcaption>
              <span>{t.screenshotCaption}</span>
              <span>
                {t.screenshotCredit}{' '}
                <a href="./licenses/example-assets/LICENSE">{t.assetLicense}</a>
              </span>
            </figcaption>
          </figure>
        </section>
        <section className="audience wrap">
          <span className="eyebrow">{t.forLabel}</span>
          <p>{t.audience}</p>
          <span className="audience-mark" aria-hidden="true">
            ↗
          </span>
        </section>
        <section
          id="features"
          className="features section wrap"
          aria-labelledby="features-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t.featuresEyebrow}</span>
              <h2 id="features-title">{t.featuresTitle}</h2>
            </div>
            <p>{t.featuresIntro}</p>
          </div>
          <div className="feature-grid">
            {features.map((feature, index) => (
              <article key={feature.kind} className="feature-card">
                <div className="feature-top">
                  <FeatureIcon kind={feature.kind} />
                  <span>0{index + 1}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>
        <section
          id="workflow"
          className="workflow section wrap"
          aria-labelledby="workflow-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t.workflowEyebrow}</span>
              <h2 id="workflow-title">{t.workflowTitle}</h2>
            </div>
            <p>{t.workflowIntro}</p>
          </div>
          <ol className="steps">
            {steps.map(([title, body], index) => (
              <li key={title}>
                <span className="step-number">0{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
                <span className="step-arrow" aria-hidden="true">
                  ↗
                </span>
              </li>
            ))}
          </ol>
          <aside className="extension">
            <div className="editor-icon" aria-hidden="true">
              &lt;/&gt;
            </div>
            <div>
              <span className="eyebrow">{t.extensionLabel}</span>
              <h3>{t.extensionTitle}</h3>
              <p>{t.extensionBody}</p>
              <span className="extension-status">{t.extensionStatus}</span>
            </div>
            <a
              className="text-link"
              href={repositoryHref ? `${repositoryHref}#vs-code-extension` : docsHref}
            >
              {t.extensionLink}
              <Arrow diagonal />
            </a>
          </aside>
        </section>
        <section
          id="versions"
          className="versions-section"
          aria-labelledby="versions-title"
        >
          <div className="versions-inner wrap">
            <div className="versions-copy">
              <span className="eyebrow">{t.versionsEyebrow}</span>
              <h2 id="versions-title">{t.versionsTitle}</h2>
              <p>{t.versionsIntro}</p>
              <a
                className="text-link"
                href={repositoryHref ? `${repositoryHref}#compatibility` : docsHref}
              >
                {t.details}
                <Arrow diagonal />
              </a>
              <div className="version-art" aria-hidden="true">
                <span>3.7</span>
                <span>3.8</span>
                <span>4.0</span>
                <span>4.1</span>
                <span>4.2</span>
                <span>4.3</span>
              </div>
            </div>
            <div className="version-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t.version}</th>
                    <th scope="col">{t.json}</th>
                    <th scope="col">{t.binary}</th>
                  </tr>
                </thead>
                <tbody>
                  {['3.7', '3.8', '4.0', '4.1', '4.2', '4.3'].map((version) => (
                    <tr key={version}>
                      <th scope="row">{version}</th>
                      <td>
                        <span aria-label={t.supported}>✓</span>
                      </td>
                      <td>
                        {version === '3.7' ? (
                          <span className="json-only">{t.jsonOnly}</span>
                        ) : (
                          <span aria-label={t.supported}>✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="version-note">{t.binaryNote}</p>
            </div>
          </div>
        </section>
        <section className="faq section wrap" aria-labelledby="faq-title">
          <div>
            <span className="eyebrow">{t.faqEyebrow}</span>
            <h2 id="faq-title">{t.faqTitle}</h2>
          </div>
          <div className="faq-items">
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="final-cta wrap">
          <div>
            <span className="eyebrow">SPINE RESOURCE PREVIEW</span>
            <h2>{t.finalTitle}</h2>
            <p>{t.finalIntro}</p>
          </div>
          <OpenLink>{t.open}</OpenLink>
          <span className="cta-orbit" aria-hidden="true">
            ↗
          </span>
        </section>
      </main>
      <footer className="site-footer wrap">
        <div className="footer-top">
          <div>
            <a className="brand" href="#">
              <img src={LOGO_URL} width="32" height="32" alt="" />
              <span>Spine Resource Preview</span>
            </a>
            <p>{t.footerTagline}</p>
          </div>
          <nav aria-label={locale === 'en' ? 'Resources' : '相关资源'}>
            {repositoryHref && <a href={repositoryHref}>GitHub</a>}
            <a href={docsHref}>{t.documentation}</a>
            <a href="./licenses/LICENSE">{t.projectLicense}</a>
            <a href="./licenses/NOTICE.md">{t.thirdParty}</a>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Spine Resource Preview contributors</span>
          <span>{t.affiliation}</span>
        </div>
      </footer>
    </>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('宣传页缺少挂载节点。');
const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/png';
favicon.href = LOGO_URL;
document.head.append(favicon);
createRoot(root).render(<Site />);
