import type { SpineResource } from '@spine-preview/core';
import { createTranslator, type Locale } from '../i18n.js';

/** 保留原始名称和路径的独立资源列表。 */
interface ResourceListProps {
  /** 当前界面语言。 */
  locale: Locale;
  /** 全部可用资源，不预加载图片。 */
  resources: readonly SpineResource[];
  /** 当前资源身份。 */
  selectedId: string | undefined;
  /** 是否正在扫描。 */
  loading: boolean;
  /** 通知工作台切换或重试资源。 */
  onSelect(id: string): void;
}

/** 保留原始名称和路径的独立资源列表。 */
export function ResourceList({
  locale,
  resources,
  selectedId,
  loading,
  onSelect,
}: ResourceListProps) {
  const t = createTranslator(locale);
  return (
    <section className="list-section resource-section">
      <div className="section-heading">
        <h2>{t('resources')}</h2>
        <span>{resources.length}</span>
      </div>
      <div className="resource-list">
        {resources.length ? (
          resources.map((resource) => (
            <button
              className={`resource-button${selectedId === resource.id ? ' selected' : ''}`}
              key={resource.id}
              title={resource.skeleton.path}
              aria-pressed={selectedId === resource.id}
              onClick={() => onSelect(resource.id)}
            >
              <strong>{resource.name}</strong>
              <span>
                {t('resourceSummary', {
                  version: resource.exportVersion,
                  format: t(resource.format === 'json' ? 'formatJson' : 'formatBinary'),
                  count: resource.pages.length,
                })}
              </span>
            </button>
          ))
        ) : (
          <p className="muted empty-list">{t(loading ? 'scanning' : 'resourceEmpty')}</p>
        )}
      </div>
    </section>
  );
}
