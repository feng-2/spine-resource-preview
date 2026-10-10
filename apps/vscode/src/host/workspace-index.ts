import type { Uri } from 'vscode';
import { discoverResources, type DiscoveryResult } from '@spine-preview/core';
import {
  checkCancelled,
  scanProvider,
  type HostProvider,
  type ScannerServices,
} from './scanner.js';

/** 工作区根或临时导入范围；身份不随扫描刷新改变。 */
export interface IndexScope {
  /** 用于保持目录树展开状态的稳定范围身份。 */
  id: string;
  /** 侧栏中展示的工作区或临时目录名称。 */
  label: string;
  /** 资源依赖不得越过的 URI 根目录。 */
  root: Uri;
  /** 是否递归枚举此范围中的骨骼。 */
  recursive: boolean;
  /** 多文件入口枚举的明确目录集合。 */
  directories?: readonly Uri[];
  /** 混合文件和目录入口中需要递归的明确目录。 */
  recursiveDirectories?: readonly Uri[];
  /** 文件入口需要自动选择的骨骼、图集或图片 URI 身份。 */
  preferredFileId?: string;
}

/** 同一工作区根的独立授权来源与完整资源、未完成依赖诊断。 */
export interface IndexedGroup {
  /** 保留分组的稳定身份和发现范围。 */
  scope: IndexScope;
  /** 依赖解析后更新的文件授权表。 */
  provider: HostProvider;
  /** 可用资源与缺失 atlas、图片等诊断；后续变更时重新发现。 */
  result: DiscoveryResult;
}

/** 失败来源不保留上次文件授权，使已删除范围能够清空当前预览并等待重试。 */
function unavailableProvider(root: Uri): HostProvider {
  const unavailable = async (): Promise<never> => {
    throw new Error('当前来源不可用，请刷新后重试');
  };
  return {
    root,
    files: [],
    allFiles: () => [],
    get: () => undefined,
    readBytes: unavailable,
    readText: unavailable,
    imageUrl: unavailable,
    resolve: async () => undefined,
  };
}

/** 在创建 Webview 前建立资源索引，隔离多根目录的同名依赖。 */
export class WorkspaceIndex {
  constructor(private readonly services: ScannerServices) {}

  /** 每次重建明确范围的索引，取消时不返回任何部分结果。 */
  async scan(
    scopes: readonly IndexScope[],
    signal?: AbortSignal,
  ): Promise<readonly IndexedGroup[]> {
    checkCancelled(signal);
    const groups: IndexedGroup[] = [];
    for (const scope of scopes) {
      checkCancelled(signal);
      try {
        const provider = await scanProvider(this.services, {
          ...scope,
          ...(signal ? { signal } : {}),
        });
        // 非递归与混合范围已由 scanner 限制，不能再次按根目录过滤明确子目录。
        const result = await discoverResources(provider, {
          ...(signal ? { signal } : {}),
          ...(scope.preferredFileId ? { preferredFileId: scope.preferredFileId } : {}),
        });
        checkCancelled(signal);
        groups.push({ scope, provider, result });
      } catch (error) {
        checkCancelled(signal);
        if (error instanceof Error && error.name === 'AbortError') throw error;
        // 单个工作区根读取失败不阻止其他根，并显式撤销此范围中的旧资源。
        groups.push({
          scope,
          provider: unavailableProvider(scope.root),
          result: {
            resources: [],
            diagnostics: [
              {
                code: 'SCAN_FAILED',
                stage: 'discovery',
                path: scope.root.toString(),
                message: `无法扫描「${scope.label}」：${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          },
        });
      }
    }
    checkCancelled(signal);
    return groups;
  }
}
