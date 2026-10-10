import type { DiscoveryResult, ResourceFile } from './types.js';

/** 扩展宿主向 Webview 发送的可序列化协议。 */
export type HostMessage =
  | {
      /** 扫描结果快照。 */
      type: 'snapshot';
      /** 新扫描代际。 */
      revision: number;
      /** 当前目标名称。 */
      label: string;
      /** 可访问的文件元数据。 */
      files: readonly ResourceFile[];
      /** 已发现的资源和诊断。 */
      result: DiscoveryResult;
    }
  | {
      /** 按需读取回复。 */
      type: 'read-result';
      /** 请求身份。 */
      requestId: string;
      /** UTF-8 文本。 */
      text?: string;
      /** 二进制字节列表。 */
      bytes?: number[];
      /** 读取错误说明。 */
      error?: string;
    }
  | {
      /** 扫描或宿主错误。 */
      type: 'status';
      /** 扫描代际。 */
      revision: number;
      /** 是否正在扫描。 */
      loading: boolean;
      /** 用户说明。 */
      message: string;
    };

/** Webview 向扩展宿主发送的请求。 */
export type WebviewMessage =
  | {
      /** 面板操作。 */
      type: 'ready' | 'refresh' | 'choose-files' | 'choose-folder';
    }
  | {
      /** 按需读取文件。 */
      type: 'read';
      /** 请求身份。 */
      requestId: string;
      /** 文件描述中的稳定身份。 */
      fileId: string;
      /** 读取格式。 */
      format: 'text' | 'bytes';
    }
  | {
      /** 编辑器 URI 拖放。 */
      type: 'drop';
      /** 拖入文件或目录 URI。 */
      uris: string[];
    };
