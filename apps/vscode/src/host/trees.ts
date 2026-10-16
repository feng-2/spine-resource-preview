import * as vscode from 'vscode';
import type { Diagnostic, SpineResource } from '@spine-preview/core';
import { getLocalizedDiagnostic, getLocalizedMessage, type HostTextKey } from './i18n.js';
import type { IndexedGroup } from './workspace-index.js';

/** 原生资源树节点以稳定 ID 保留目录展开状态。 */
interface ResourceNode {
  id: string;
  label: string;
  kind: 'scope' | 'folder' | 'resource' | 'diagnostics' | 'diagnostic';
  parent?: ResourceNode;
  children: ResourceNode[];
  resource?: SpineResource;
  diagnostic?: Diagnostic;
  root?: vscode.Uri;
  /** 文件系统定位与相对扫描范围的路径，供原生复制菜单使用。 */
  uri?: vscode.Uri;
  relativePath?: string;
  /** 合并目录保留末端实际相对路径，用于悬浮定位。 */
  folderPath?: string;
  resourceCount?: number;
}

/** 动画节点仅接受当前资源实际存在的动画名。 */
interface AnimationNode {
  id: string;
  name: string;
}

const resourceCommand = 'spinePreview.selectResource';
const animationCommand = 'spinePreview.selectAnimation';
const text = (key: HostTextKey, values?: Readonly<Record<string, string | number>>) =>
  getLocalizedMessage(vscode.env.language, key, values);

/** 仅合并没有直接资源、且只有一个子目录的链；工作区根和分支保持独立。 */
function compactFolders(node: ResourceNode): void {
  while (
    node.kind === 'folder' &&
    node.children.length === 1 &&
    node.children[0]!.kind === 'folder'
  ) {
    const child = node.children[0]!;
    node.label += `/${child.label}`;
    // 末端路径不因上层链长变化而改变，有利于保持展开状态。
    node.id = child.id;
    if (child.folderPath !== undefined) node.folderPath = child.folderPath;
    if (child.uri !== undefined) node.uri = child.uri;
    if (child.relativePath !== undefined) node.relativePath = child.relativePath;
    node.children = child.children;
    for (const descendant of node.children) descendant.parent = node;
  }
  node.children.forEach(compactFolders);
}

/** 为工作区与临时扫描范围提供原生资源和动画列表。 */
export class SpineTrees implements vscode.Disposable {
  private readonly resourceEvents = new vscode.EventEmitter<ResourceNode | undefined>();
  private readonly animationEvents = new vscode.EventEmitter<AnimationNode | undefined>();
  private readonly resourceView: vscode.TreeView<ResourceNode>;
  private readonly animationView: vscode.TreeView<AnimationNode>;
  private readonly subscriptions: vscode.Disposable[] = [];
  private roots: ResourceNode[] = [];
  private readonly resourceNodes = new Map<string, ResourceNode>();
  private readonly copyNodes = new Map<string, ResourceNode>();
  private animationNodes: AnimationNode[] = [];
  private selectedId: string | undefined;
  private selectedAnimation: string | undefined;
  private loading = false;
  private disposed = false;

  /** 创建列表及其独立选择命令；打开侧栏时由调用者启动工作区扫描。 */
  constructor(
    context: vscode.ExtensionContext,
    onSelectResource: (id: string) => void,
    onSelectAnimation: (name: string) => void,
    onVisible: () => void,
  ) {
    this.resourceView = vscode.window.createTreeView('spinePreview.resources', {
      treeDataProvider: {
        onDidChangeTreeData: this.resourceEvents.event,
        getTreeItem: (node) => this.resourceItem(node),
        getChildren: (node) => node?.children ?? this.roots,
        getParent: (node) => node.parent,
      },
      showCollapseAll: true,
    });
    this.animationView = vscode.window.createTreeView('spinePreview.animations', {
      treeDataProvider: {
        onDidChangeTreeData: this.animationEvents.event,
        getTreeItem: (node) => this.animationItem(node),
        getChildren: (node) => (node ? [] : this.animationNodes),
      },
    });
    this.subscriptions.push(
      this.resourceView,
      this.animationView,
      this.resourceEvents,
      this.animationEvents,
      vscode.commands.registerCommand(resourceCommand, (id: unknown) => {
        if (typeof id === 'string' && this.resourceNodes.has(id)) onSelectResource(id);
      }),
      vscode.commands.registerCommand(animationCommand, (name: unknown) => {
        if (
          typeof name === 'string' &&
          this.animationNodes.some((node) => node.name === name)
        )
          onSelectAnimation(name);
      }),
      ...(['copyName', 'copyPath', 'copyRelativePath'] as const).map((action) =>
        vscode.commands.registerCommand(`spinePreview.${action}`, (value: unknown) => {
          if (action === 'copyName') {
            const animation = this.animationNodes.find((entry) => entry === value);
            if (animation) return vscode.env.clipboard.writeText(animation.name);
          }
          const node = this.currentCopyNode(value);
          if (!node?.uri) return;
          const content =
            action === 'copyPath'
              ? node.uri.fsPath
              : action === 'copyRelativePath'
                ? (node.relativePath ?? '.')
                : node.uri.path.replace(/\/$/u, '').split('/').pop() || node.label;
          return vscode.env.clipboard.writeText(content);
        }),
      ),
      vscode.commands.registerCommand(
        'spinePreview.copyAnimationName',
        (value: unknown) => {
          const node = this.animationNodes.find((entry) => entry === value);
          if (node) return vscode.env.clipboard.writeText(node.name);
        },
      ),
      this.resourceView.onDidChangeVisibility(({ visible }) => {
        if (visible) onVisible();
      }),
      this.animationView.onDidChangeVisibility(({ visible }) => {
        if (visible) onVisible();
      }),
    );
    context.subscriptions.push(this);
    this.updateMessages();
    // 延后初始可见通知，避免调用者尚未完成实例赋值。
    void Promise.resolve().then(() => {
      if (!this.disposed && (this.resourceView.visible || this.animationView.visible))
        onVisible();
    });
  }

  /** 替换索引结果；资源与目录的 ID 不随刷新改变。 */
  setGroups(groups: readonly IndexedGroup[]): void {
    if (this.disposed) return;
    this.resourceNodes.clear();
    this.copyNodes.clear();
    this.roots = groups.map((group) => {
      const root: ResourceNode = {
        id: `scope:${group.scope.id}`,
        label: group.scope.label,
        kind: 'scope',
        children: [],
        root: group.scope.root,
        uri: group.scope.root,
        relativePath: '.',
        resourceCount: group.result.resources.length,
      };
      this.copyNodes.set(root.id, root);
      const folders = new Map<string, ResourceNode>();
      for (const resource of group.result.resources) {
        const parts = resource.skeleton.path.replaceAll('\\', '/').split('/');
        const filename = parts.pop()!;
        let parent = root;
        let folderPath = '';
        for (const part of parts) {
          folderPath += `/${part}`;
          let folder = folders.get(folderPath);
          if (!folder) {
            folder = {
              id: `${root.id}:folder:${folderPath}`,
              label: part,
              kind: 'folder',
              folderPath: folderPath.slice(1),
              uri: vscode.Uri.joinPath(group.scope.root, folderPath.slice(1)),
              relativePath: folderPath.slice(1),
              children: [],
              parent,
            };
            folders.set(folderPath, folder);
            parent.children.push(folder);
          }
          parent = folder;
        }
        const node: ResourceNode = {
          // 嵌套的多根工作区可能包含同一 URI，树节点身份还需包含范围。
          id: `${root.id}:resource:${resource.id}`,
          label: filename,
          kind: 'resource',
          children: [],
          parent,
          resource,
          uri: vscode.Uri.parse(resource.skeleton.id),
          relativePath: resource.skeleton.path,
        };
        parent.children.push(node);
        this.resourceNodes.set(resource.id, node);
        this.copyNodes.set(node.id, node);
      }
      if (group.result.diagnostics.length) {
        const diagnostics: ResourceNode = {
          id: `${root.id}:diagnostics`,
          label: text('diagnosticsTitle'),
          kind: 'diagnostics',
          children: [],
          parent: root,
        };
        const occurrences = new Map<string, number>();
        diagnostics.children = group.result.diagnostics.map((diagnostic) => {
          const key = `${diagnostic.path ?? ''}:${diagnostic.code}`;
          const occurrence = occurrences.get(key) ?? 0;
          occurrences.set(key, occurrence + 1);
          return {
            id: `${diagnostics.id}:${key}:${occurrence}`,
            label: diagnostic.path?.split('/').pop() ?? diagnostic.code,
            kind: 'diagnostic',
            children: [],
            parent: diagnostics,
            diagnostic,
          };
        });
        root.children.push(diagnostics);
      }
      const sortChildren = (node: ResourceNode): void => {
        node.children.sort((a, b) => {
          const order = (child: ResourceNode) =>
            child.kind === 'folder' ? 0 : child.kind === 'diagnostics' ? 2 : 1;
          return order(a) - order(b) || a.label.localeCompare(b.label);
        });
        node.children.forEach(sortChildren);
      };
      compactFolders(root);
      const registerFolders = (node: ResourceNode): void => {
        if (node.kind === 'folder') this.copyNodes.set(node.id, node);
        node.children.forEach(registerFolders);
      };
      registerFolders(root);
      sortChildren(root);
      return root;
    });
    this.resourceEvents.fire(undefined);
    this.updateMessages();
  }

  /** 扫描期间保留现有树，仅更新进度提示。 */
  setLoading(loading: boolean): void {
    if (this.disposed) return;
    this.loading = loading;
    this.updateMessages();
  }

  /** 同步浏览器解析出的动画列表与当前选中状态。 */
  setSelection(
    id: string | undefined,
    animations: readonly string[],
    animation?: string,
  ): void {
    if (this.disposed) return;
    const resourceChanged = id !== this.selectedId;
    this.selectedId = id;
    this.selectedAnimation = animation;
    this.animationNodes = [...new Set(animations)].map((name) => ({
      id: `animation:${id ?? ''}:${name}`,
      name,
    }));
    this.animationEvents.fire(undefined);
    this.updateMessages();
    const node = id ? this.resourceNodes.get(id) : undefined;
    if (resourceChanged && node)
      void this.resourceView.reveal(node, { select: true, focus: false }).then(
        () => {},
        () => {},
      );
  }

  /** 销毁 TreeView、事件及其选择命令。 */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.subscriptions.splice(0).forEach((subscription) => subscription.dispose());
    this.resourceNodes.clear();
    this.copyNodes.clear();
    this.roots = [];
    this.animationNodes = [];
  }

  private currentCopyNode(value: unknown): ResourceNode | undefined {
    if (!value || typeof value !== 'object' || !('id' in value)) return undefined;
    const node = typeof value.id === 'string' ? this.copyNodes.get(value.id) : undefined;
    return node === value ? node : undefined;
  }

  private updateMessages(): void {
    const resourceMessage = this.loading
      ? text('treeScanning')
      : this.resourceNodes.size === 0
        ? text('treeEmpty')
        : undefined;
    const animationMessage = !this.selectedId
      ? text('animationsSelect')
      : this.animationNodes.length === 0
        ? text('animationsEmpty')
        : undefined;
    // 空字符串经由 TreeView setter 清除旧提示，不能 delete 原生访问器。
    this.resourceView.message = resourceMessage ?? '';
    this.animationView.message = animationMessage ?? '';
  }

  private resourceItem(node: ResourceNode): vscode.TreeItem {
    const expandable = node.kind !== 'resource' && node.kind !== 'diagnostic';
    const item = new vscode.TreeItem(
      node.label,
      expandable
        ? node.kind === 'scope'
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );
    item.id = node.id;
    item.contextValue = `spinePreview.${node.kind}`;
    if (node.resource) {
      item.description = `${node.resource.version} · ${node.resource.format === 'json' ? 'JSON' : 'SKEL'}`;
      item.tooltip = node.resource.skeleton.path;
      item.iconPath = new vscode.ThemeIcon('symbol-event');
      item.command = {
        command: resourceCommand,
        title: text('panelTitle'),
        arguments: [node.resource.id],
      };
    } else if (node.diagnostic) {
      item.description = node.diagnostic.code;
      item.tooltip = getLocalizedDiagnostic(vscode.env.language, node.diagnostic);
      item.iconPath = new vscode.ThemeIcon(
        node.diagnostic.code === 'VERSION_PRERELEASE' ? 'info' : 'warning',
      );
    } else if (node.kind === 'diagnostics') {
      item.description = String(node.children.length);
      item.iconPath = new vscode.ThemeIcon('warning');
    } else {
      item.iconPath = new vscode.ThemeIcon(
        node.kind === 'scope' ? 'root-folder' : 'folder',
      );
      if (node.root) {
        item.description = text('resourceCount', { count: node.resourceCount ?? 0 });
        item.tooltip = node.root.fsPath;
      } else if (node.folderPath) item.tooltip = node.folderPath;
    }
    return item;
  }

  private animationItem(node: AnimationNode): vscode.TreeItem {
    const item = new vscode.TreeItem(node.name, vscode.TreeItemCollapsibleState.None);
    item.id = node.id;
    item.contextValue = 'spinePreview.animation';
    item.iconPath = new vscode.ThemeIcon(
      node.name === this.selectedAnimation ? 'debug-start' : 'symbol-method',
    );
    item.command = {
      command: animationCommand,
      title: text('animationsTitle'),
      arguments: [node.name],
    };
    return item;
  }
}
