import { createRoot } from 'react-dom/client';
import { LOGO_URL, SpineViewer } from '@spine-preview/viewer';
import '@spine-preview/viewer/style.css';
import './base.css';
import { BrowserSource } from './source.js';

const host = document.getElementById('root');
if (!host) throw new Error('预览工具缺少挂载节点');
const source = new BrowserSource();
const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/png';
favicon.href = LOGO_URL;
document.head.append(favicon);
const root = createRoot(host);
root.render(<SpineViewer source={source} />);
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    root.unmount();
    source.dispose();
    favicon.remove();
  });
}
