import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { SpineResource } from '@spine-preview/core';
import { copyText } from '../clipboard.js';
import { createTranslator, type Locale } from '../i18n.js';
import {
  buildResourceTree,
  resourceAncestors,
  type ResourceTreeNode,
} from '../resource-tree.js';
import { ListContextMenu } from './ListContextMenu.js';
import './resource-tree.css';

interface ResourceListProps {
  locale: Locale;
  resources: readonly SpineResource[];
  selectedId: string | undefined;
  loading: boolean;
  onSelect(id: string): void;
}

interface ContextMenu {
  node: ResourceTreeNode;
  x: number;
  y: number;
  trigger: HTMLButtonElement;
}

/** A compact, keyboard-accessible explorer shared with the native tree's presentation. */
export const ResourceList = memo(function ResourceList({
  locale,
  resources,
  selectedId,
  loading,
  onSelect,
}: ResourceListProps) {
  const t = createTranslator(locale);
  const tree = useMemo(() => buildResourceTree(resources), [resources]);
  const [expanded, setExpanded] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [menu, setMenu] = useState<ContextMenu | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const treeRef = useRef<HTMLDivElement>(null);
  const isExpanded = (node: ResourceTreeNode) =>
    expanded.get(node.id) ?? node.kind === 'scope';

  useEffect(() => {
    const ancestors = resourceAncestors(tree, selectedId);
    setExpanded((previous) => {
      const next = new Map(previous);
      for (const id of ancestors) next.set(id, true);
      return next;
    });
    setMenu(null);
    setCopyFailed(false);
  }, [tree, selectedId]);

  function toggle(node: ResourceTreeNode, value = !isExpanded(node)) {
    setExpanded((previous) => new Map(previous).set(node.id, value));
  }

  function treeKeyDown(event: KeyboardEvent<HTMLButtonElement>, node: ResourceTreeNode) {
    const rows = [
      ...(treeRef.current?.querySelectorAll<HTMLButtonElement>('[role="treeitem"]') ??
        []),
    ];
    const index = rows.indexOf(event.currentTarget);
    let target: HTMLButtonElement | undefined;
    switch (event.key) {
      case 'ArrowDown':
        target = rows[index + 1];
        break;
      case 'ArrowUp':
        target = rows[index - 1];
        break;
      case 'Home':
        target = rows[0];
        break;
      case 'End':
        target = rows.at(-1);
        break;
      case 'ArrowRight':
        if (node.kind !== 'resource') {
          if (isExpanded(node)) target = rows[index + 1];
          else toggle(node, true);
        }
        break;
      case 'ArrowLeft':
        if (node.kind !== 'resource' && isExpanded(node)) toggle(node, false);
        else {
          const level = Number(event.currentTarget.getAttribute('aria-level'));
          target = rows
            .slice(0, index)
            .reverse()
            .find((row) => Number(row.getAttribute('aria-level')) < level);
        }
        break;
      case 'ContextMenu':
      case 'F10': {
        if (event.key === 'F10' && !event.shiftKey) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        setMenu({
          node,
          x: bounds.left + 18,
          y: bounds.bottom,
          trigger: event.currentTarget,
        });
        break;
      }
      default:
        return;
    }
    event.preventDefault();
    target?.focus();
  }

  function renderNodes(nodes: readonly ResourceTreeNode[], depth = 0) {
    return nodes.map((node) => {
      const folder = node.kind !== 'resource';
      const open = folder && isExpanded(node);
      const selected = selectedId !== undefined && node.resource?.id === selectedId;
      return (
        <div role="none" key={node.id}>
          <button
            type="button"
            role="treeitem"
            aria-level={depth + 1}
            aria-expanded={folder ? open : undefined}
            aria-selected={selected}
            className={`resource-tree-row${selected ? ' selected' : ''}${menu?.node.id === node.id ? ' context-active' : ''}`}
            style={{ paddingLeft: 5 + depth * 16 }}
            title={node.path}
            onClick={() => (folder ? toggle(node) : onSelect(node.resource!.id))}
            onKeyDown={(event) => treeKeyDown(event, node)}
            onContextMenu={(event) => {
              event.preventDefault();
              event.currentTarget.focus();
              setCopyFailed(false);
              setMenu({
                node,
                x: event.clientX,
                y: event.clientY,
                trigger: event.currentTarget,
              });
            }}
          >
            <span
              className={`resource-tree-chevron${open ? ' expanded' : ''}`}
              aria-hidden="true"
            >
              {folder ? '›' : ''}
            </span>
            <svg
              className={`resource-tree-icon ${folder ? 'folder' : 'skeleton'}`}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              {folder ? (
                <path
                  d="M1.5 4a1 1 0 0 1 1-1H6l1.5 1.5h6a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              ) : (
                <path
                  d="m9 1.5-6 7H7L6 14.5l7-8H9l1-5Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              )}
            </svg>
            <span className="resource-tree-name">{node.label}</span>
            {node.resource && (
              <span className="resource-tree-description">
                {node.resource.version} ·{' '}
                {node.resource.format === 'json' ? 'JSON' : 'SKEL'}
              </span>
            )}
          </button>
          {open && <div role="group">{renderNodes(node.children, depth + 1)}</div>}
        </div>
      );
    });
  }

  async function copy(value: string) {
    if (!menu) return;
    const trigger = menu.trigger;
    try {
      await copyText(value);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
    setMenu(null);
    trigger.focus({ preventScroll: true });
  }

  return (
    <section className="list-section resource-section">
      <div className="section-heading">
        <h2>{t('resources')}</h2>
        <span>{resources.length}</span>
      </div>
      {resources.length ? (
        <div
          className="resource-list resource-tree"
          role="tree"
          aria-label={t('resources')}
          ref={treeRef}
        >
          {renderNodes(tree)}
        </div>
      ) : (
        <p className="muted empty-list">{t(loading ? 'scanning' : 'resourceEmpty')}</p>
      )}
      {copyFailed && (
        <p className="resource-copy-error" role="alert">
          {t('copyFailed')}
        </p>
      )}
      {menu && (
        <ListContextMenu
          label={menu.node.label}
          x={menu.x}
          y={menu.y}
          trigger={menu.trigger}
          onClose={() => setMenu(null)}
          items={[
            { label: t('copyName'), onSelect: () => void copy(menu.node.name) },
            { label: t('copyPath'), onSelect: () => void copy(menu.node.path) },
            {
              label: t('copyRelativePath'),
              onSelect: () => void copy(menu.node.relativePath),
            },
          ]}
        />
      )}
    </section>
  );
});
