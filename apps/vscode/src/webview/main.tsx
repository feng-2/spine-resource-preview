import { createRoot } from 'react-dom/client';
import { SpineViewer } from '@spine-preview/viewer';
import '@spine-preview/viewer/style.css';
import './shell.css';
import { EditorSource } from './source.js';
import type { WebviewApi } from './source.js';

declare global {
  /** VS Code 在隔离 Webview 中注入的单次消息入口。 */
  function acquireVsCodeApi(): WebviewApi;
}

const host = document.getElementById('root');
if (!host) throw new Error('Webview 缺少 React 挂载点');
const source = new EditorSource(acquireVsCodeApi());
const root = createRoot(host);
const receive = (event: MessageEvent<unknown>): void => source.receive(event.data);
window.addEventListener('message', receive);
root.render(<SpineViewer source={source} />);
source.ready();
// 不注册额外的动画时钟；关闭时由共用 viewer 回收 runtime session。
window.addEventListener(
  'pagehide',
  () => {
    window.removeEventListener('message', receive);
    root.unmount();
    source.dispose();
  },
  { once: true },
);
