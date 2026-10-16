import type { SpineResource } from '@spine-preview/core';

/** The full imported path remains available even when folder labels are compacted. */
export interface ResourceTreeNode {
  id: string;
  name: string;
  label: string;
  path: string;
  relativePath: string;
  kind: 'scope' | 'folder' | 'resource';
  children: ResourceTreeNode[];
  resource?: SpineResource;
}

/** Match the native explorer: roots stay separate; only single-folder chains compact. */
export function buildResourceTree(
  resources: readonly SpineResource[],
): ResourceTreeNode[] {
  const roots: ResourceTreeNode[] = [];
  const folders = new Map<string, ResourceTreeNode>();
  for (const resource of resources) {
    const parts = resource.skeleton.path.replaceAll('\\', '/').split('/').filter(Boolean);
    const filename = parts.pop() ?? resource.name;
    const root = parts[0];
    let children = roots;
    let path = '';
    for (const [index, name] of parts.entries()) {
      path = path ? `${path}/${name}` : name;
      let folder = folders.get(path);
      if (!folder) {
        folder = {
          id: `folder:${path}`,
          name,
          label: name,
          path,
          relativePath: index ? path.slice(root!.length + 1) : '.',
          kind: index ? 'folder' : 'scope',
          children: [],
        };
        folders.set(path, folder);
        children.push(folder);
      }
      children = folder.children;
    }
    const resourcePath = path ? `${path}/${filename}` : filename;
    children.push({
      id: `resource:${resource.id}`,
      name: filename,
      label: filename,
      path: resourcePath,
      relativePath: root ? resourcePath.slice(root.length + 1) : filename,
      kind: 'resource',
      children: [],
      resource,
    });
  }
  const compactAndSort = (nodes: ResourceTreeNode[]): void => {
    for (const node of nodes) {
      while (
        node.kind === 'folder' &&
        node.children.length === 1 &&
        node.children[0]!.kind === 'folder'
      ) {
        const child = node.children[0]!;
        node.label += `/${child.label}`;
        node.id = child.id;
        node.name = child.name;
        node.path = child.path;
        node.relativePath = child.relativePath;
        node.children = child.children;
      }
      compactAndSort(node.children);
    }
    nodes.sort((a, b) => {
      const order = (node: ResourceTreeNode) => (node.kind === 'resource' ? 1 : 0);
      return order(a) - order(b) || a.label.localeCompare(b.label);
    });
  };
  compactAndSort(roots);
  return roots;
}

/** Expand the selected resource's ancestors without expanding unrelated branches. */
export function resourceAncestors(
  nodes: readonly ResourceTreeNode[],
  resourceId: string | undefined,
): string[] {
  if (resourceId === undefined) return [];
  for (const node of nodes) {
    if (node.resource?.id === resourceId) return [];
    const descendants = resourceAncestors(node.children, resourceId);
    if (
      descendants.length ||
      node.children.some((child) => child.resource?.id === resourceId)
    )
      return [node.id, ...descendants];
  }
  return [];
}
