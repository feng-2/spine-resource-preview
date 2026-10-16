import { describe, expect, it } from 'vitest';
import type { SpineResource } from '@spine-preview/core';
import {
  buildResourceTree,
  resourceAncestors,
  type ResourceTreeNode,
} from '../src/resource-tree.js';

function resource(path: string, id = path): SpineResource {
  return {
    id,
    name: path,
    version: '4.2',
    exportVersion: '4.2.43',
    format: 'json',
    skeleton: { id, path, size: 1 },
    atlas: { id: `${id}.atlas`, path: `${path}.atlas`, size: 1 },
    pages: [],
    animations: [],
  };
}

function collect(nodes: readonly ResourceTreeNode[]): ResourceTreeNode[] {
  return nodes.flatMap((node) => [node, ...collect(node.children)]);
}

describe('resource explorer tree', () => {
  it('keeps the import root and compacts only uninterrupted folder chains', () => {
    const [root] = buildResourceTree([resource('assets/hero/export/json/hero.json')]);
    expect(root).toMatchObject({ kind: 'scope', label: 'assets', relativePath: '.' });
    expect(root!.children[0]).toMatchObject({
      id: 'folder:assets/hero/export/json',
      name: 'json',
      label: 'hero/export/json',
      path: 'assets/hero/export/json',
      relativePath: 'hero/export/json',
    });
    expect(root!.children[0]!.children[0]).toMatchObject({
      name: 'hero.json',
      path: 'assets/hero/export/json/hero.json',
      relativePath: 'hero/export/json/hero.json',
    });
  });

  it('retains branches and folders containing resources, sorting folders before files', () => {
    const [root] = buildResourceTree([
      resource('assets/export/z.json'),
      resource('assets/export/child/b.json'),
      resource('assets/export/a.json'),
      resource('assets/other/c.json'),
    ]);
    expect(root!.children.map((node) => node.label)).toEqual(['export', 'other']);
    expect(root!.children[0]!.children.map((node) => node.label)).toEqual([
      'child',
      'a.json',
      'z.json',
    ]);
    expect(root!.children[0]!.path).toBe('assets/export');
  });

  it('preserves separate roots, flat imports and duplicate filenames with unique source identities', () => {
    const nodes = buildResourceTree([
      resource('b/export/hero.json'),
      resource('a/export/hero.json'),
      resource('flat.json'),
      resource('flat.json', 'flat.json#1'),
    ]);
    expect(nodes.map((node) => node.label)).toEqual(['a', 'b', 'flat.json', 'flat.json']);
    expect(nodes[0]!.children[0]!.relativePath).toBe('export');
    expect(nodes.slice(2).map((node) => node.id)).toEqual([
      'resource:flat.json',
      'resource:flat.json#1',
    ]);
    expect(nodes[2]!.relativePath).toBe('flat.json');
  });

  it('normalizes imported separators while preserving original names and extension casing', () => {
    const nodes = collect(buildResourceTree([resource('资源\\角色\\Hero.JSON')]));
    expect(nodes.at(-1)).toMatchObject({
      name: 'Hero.JSON',
      path: '资源/角色/Hero.JSON',
      relativePath: '角色/Hero.JSON',
    });
  });

  it('expands only the selected resource ancestors using stable compacted node identities', () => {
    const resources = [
      resource('assets/a/b/hero.json'),
      resource('assets/c/d/villain.json'),
    ];
    const tree = buildResourceTree(resources);
    expect(resourceAncestors(tree, resources[0]!.id)).toEqual([
      'folder:assets',
      'folder:assets/a/b',
    ]);
    expect(resourceAncestors(tree, resources[1]!.id)).toEqual([
      'folder:assets',
      'folder:assets/c/d',
    ]);
    expect(resourceAncestors(tree, undefined)).toEqual([]);
    expect(resourceAncestors(tree, 'missing')).toEqual([]);
    expect(buildResourceTree([...resources].reverse())).toEqual(tree);
  });
});
