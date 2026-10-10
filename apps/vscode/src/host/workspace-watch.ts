import * as vscode from 'vscode';
import { posix } from 'node:path';
import { DEFAULT_EXCLUDED_DIRECTORIES } from '@spine-preview/core';
import { isSpineResourceFilePath } from './scanner.js';

/** 当前资源发现范围；依赖允许位于来源根下的子目录。 */
export interface WatchScope {
  root: vscode.Uri;
  recursive: boolean;
  directories?: readonly vscode.Uri[];
  recursiveDirectories?: readonly vscode.Uri[];
}

const ignoredDirectories = new Set([...DEFAULT_EXCLUDED_DIRECTORIES, '.pnpm', '.turbo']);

/** 将文件系统突发事件合并为一次刷新，范围切换后丢弃旧监听和待发送事件。 */
export class ScopeWatcher implements vscode.Disposable {
  private readonly subscriptions: vscode.Disposable[] = [];
  private readonly pending = new Map<string, vscode.Uri>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private disposed = false;

  constructor(
    private readonly onChange: (uris: readonly vscode.Uri[]) => void,
    private readonly delayMs = 400,
  ) {}

  /** 不依赖预览页创建监听；非递归导入也监听根下的页面图片及 atlas 依赖。 */
  setScopes(scopes: readonly WatchScope[]): void {
    if (this.disposed) return;
    this.reset();
    const generation = this.generation;
    const roots = new Map(scopes.map((scope) => [scope.root.toString(), scope.root]));
    for (const root of roots.values()) {
      const enqueue = (uri: vscode.Uri, structural: boolean): void => {
        if (this.disposed || generation !== this.generation) return;
        if (uri.scheme !== root.scheme || uri.authority !== root.authority) return;
        const relative = posix.relative(root.path, uri.path);
        if (relative.startsWith('../') || relative === '..' || posix.isAbsolute(relative))
          return;
        if (relative.split('/').some((part) => ignoredDirectories.has(part))) return;
        // 创建和删除也可能代表整个目录，不能只按扩展名判断。
        if (!structural && !isSpineResourceFilePath(uri.path)) return;
        this.pending.set(uri.toString(), uri);
        if (this.timer !== undefined) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.timer = undefined;
          if (this.disposed || generation !== this.generation) return;
          const changed = [...this.pending.values()];
          this.pending.clear();
          if (changed.length) this.onChange(changed);
        }, this.delayMs);
      };
      const register = (pattern: vscode.RelativePattern, onlyRoot = false): void => {
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        const structural = (uri: vscode.Uri): void => {
          if (!onlyRoot || uri.toString() === root.toString()) enqueue(uri, true);
        };
        this.subscriptions.push(
          watcher,
          watcher.onDidCreate(structural),
          watcher.onDidDelete(structural),
        );
        if (!onlyRoot)
          this.subscriptions.push(watcher.onDidChange((uri) => enqueue(uri, false)));
      };
      register(new vscode.RelativePattern(root, '**/*'));
      // 递归 glob 不保证报告来源根本身；只监听父目录中的这个根以捕获删除和重建。
      const parentPath = posix.dirname(root.path);
      if (parentPath !== root.path)
        register(
          new vscode.RelativePattern(
            root.with({ path: parentPath }),
            posix
              .basename(root.path)
              .replace(/[[\]{}?*]/g, (character) => `[${character}]`),
          ),
          true,
        );
    }
  }

  /** 扩展退出时取消定时任务，释放所有文件系统监听。 */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
  }

  private reset(): void {
    this.generation += 1;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.pending.clear();
    for (const subscription of this.subscriptions.splice(0)) subscription.dispose();
  }
}
