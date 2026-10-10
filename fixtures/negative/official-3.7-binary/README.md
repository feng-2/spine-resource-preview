# 官方 3.7 二进制负例

`spineboy.skel` 是官方完整 Spine `3.7.90` 导出，来自固定提交 `9639bcc81722d7178fd9d1cdc1a3d55a4c91f989` 的 `examples/spineboy/export/spineboy-pro.skel`，通过网络下载，未修改字节。

将本目录单独导入时，预期得到 `BINARY_37_UNSUPPORTED`，提示使用同版本 JSON，不应进入图片加载或渲染阶段。负例故意放在 `fixtures/official` 外，整体导入正样本集合不会混入它。

原始许可证位于本目录 `LICENSE`。官方下载 URL、文件哈希与复现记录位于 `fixtures/official/download-manifest.json`。在项目根目录运行 `node scripts/fetch-fixtures.mjs --check` 会同时验证该负例被正确拒绝。
